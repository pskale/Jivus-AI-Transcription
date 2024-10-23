let recordButton = document.getElementById('recordButton');
let stopButton = document.getElementById('stopButton');
let transcriptionDisplay = document.getElementById('transcription');
let progressBar = document.getElementById('progress-bar');
let progressContainer = document.getElementById('progress-container');

let mediaRecorder;
let audioChunks = [];
let progressInterval; // To handle progress bar interval

// Start recording when the button is clicked
recordButton.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = []; // Clear chunks
        clearInterval(progressInterval); // Stop progress bar update
        resetProgressBar(); // Reset progress bar when recording stops
        sendToDeepgram(audioBlob);
    };

    mediaRecorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;
    startProgressBar(); // Start progress bar animation
});

// Stop recording
stopButton.addEventListener('click', () => {
    mediaRecorder.stop();
    recordButton.disabled = false;
    stopButton.disabled = true;
});

// Send audio to Deepgram for transcription
async function sendToDeepgram(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
            'Authorization': 'Token <Deepgram API key>', // Replace with your Deepgram API key (remove < >)
        },
        body: audioBlob
    });

    const result = await response.json();
    displayTranscription(result)
    const transcriptionText = result.results.channels[0].alternatives[0].transcript;
    // displayTranscription(transcriptionText);

    // Save the transcript to Airtable
    if (transcriptionText) {
        await saveTranscriptToAirtable(transcriptionText);
    }
}

// Display transcription on the webpage
function displayTranscription(transcriptionResult) {
    const transcriptionText = transcriptionResult.results.channels[0].alternatives[0].transcript;
    transcriptionDisplay.innerText = transcriptionText ? transcriptionText : "No transcription available.";
}

// Start progress bar animation
function startProgressBar() {
    progressContainer.style.display = 'block'; // Show the progress bar
    progressBar.style.width = '0%'; // Reset width

    let width = 0;
    progressInterval = setInterval(() => {
        if (width >= 100) {
            width = 0; // Loop if it reaches 100%
        } else {
            width += 1; // Increase width by 1% every 100ms
        }
        progressBar.style.width = width + '%';
    }, 100); // Adjust the speed as needed
}

// Reset progress bar
function resetProgressBar() {
    clearInterval(progressInterval); // Stop any ongoing interval
    progressBar.style.width = '0%'; // Reset the bar width to 0%
    progressContainer.style.display = 'none'; // Hide the progress bar
}



const airtableApiKey = 'Airtable API Key'; // Replace with your Airtable API Key
const airtableBaseId = 'Airtable Base ID'; // Replace with your Airtable Base ID
const airtableTableName = 'Transcripts'; // Your Airtable table name

// Function to save transcript to Airtable
async function saveTranscriptToAirtable(transcript) {
    const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}`;
    const data = {
        fields: {
            Transcript: transcript,
            Timestamp: new Date().toLocaleString(),   //.toISOString()
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (response.ok) {
        const result = await response.json();
        console.log('Saved to Airtable:', result);
    } else {
        console.error('Error saving to Airtable:', response.status, response.statusText);
    }
}







// Call the function to fetch saved transcripts when the page loads
document.addEventListener('DOMContentLoaded', () => {
    getTranscriptsFromAirtable();
});

// Function to retrieve transcripts from Airtable
async function getTranscriptsFromAirtable() {
    const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?sort[0][field]=Timestamp&sort[0][direction]=desc`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
        },
    });

    if (response.ok) {
        const result = await response.json();
        displayTranscripts(result.records);
    } else {
        console.error('Error fetching from Airtable:', response.status, response.statusText);
    }
}

// Function to display retrieved transcripts
function displayTranscripts(records) {
    const transcriptsContainer = document.getElementById('transcripts-container');
    transcriptsContainer.innerHTML = ''; // Clear current content

    records.forEach(record => {
        const transcript = record.fields.Transcript;
        const timestamp = record.fields.Timestamp;
        const transcriptElement = document.createElement('div');
        transcriptElement.classList.add('transcript-item', 'bg-gray-100', 'p-4', 'rounded-lg', 'mb-4', 'shadow-md');

        transcriptElement.innerHTML = `
            <p class="text-lg text-gray-700">${transcript}</p>
            <p class="text-sm text-gray-500 mt-2">Saved on: ${timestamp}</p>  
        `;

        transcriptsContainer.appendChild(transcriptElement);
    });
}

