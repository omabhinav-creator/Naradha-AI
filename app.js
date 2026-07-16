let screenStream = null;
let mediaRecorder;
let audioChunks = [];

// DOM Elements
const syncBtn = document.getElementById('sync-btn');
const captureBtn = document.getElementById('capture-btn');
const queryInput = document.getElementById('user-query');
const videoElement = document.getElementById('screen-video');
const placeholder = document.getElementById('placeholder-text');
const statusText = document.getElementById('status');
const micBtn = document.getElementById('mic-btn');
const aiResponseContainer = document.getElementById('ai-response');

// 1. Capture the desktop screen stream
syncBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Requesting screen access...";
        
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false
        });

        videoElement.srcObject = screenStream;
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
        
        statusText.innerText = "Screen Connected!";
        captureBtn.disabled = false;
        queryInput.disabled = false;
        syncBtn.disabled = true;

    } catch (err) {
        console.error("Error capturing screen stream: ", err);
        statusText.innerText = "Failed to connect screen.";
    }
});

// 2. Capture Image Frame via Button Chat Input
captureBtn.addEventListener('click', () => {
    if (!screenStream) return;

    statusText.innerText = "Scanning active screen frame...";
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.7); 
    console.log("Captured image Base64 format ready!");
    
    statusText.innerText = "Frame captured successfully!";
    const queryText = queryInput.value || "Bhai, what is on my screen?";
    
    // Pass visual state and input text directly to Alchemyst AI
    callAlchemystAI(base64Image, queryText);
});

// 3. Audio Recording Handler Loop
micBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        micBtn.innerText = "🎤";
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => { audioChunks.push(event.data); };
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            statusText.innerText = "Processing Voice...";
            processVoiceQuery(audioBlob);
        };

        mediaRecorder.start();
        micBtn.innerText = "🛑";
        statusText.innerText = "Listening...";
    } catch (err) {
        console.error("Mic access denied", err);
        statusText.innerText = "Mic access denied.";
    }
});

// 4. Voice Processing Pipeline via Gnani.ai STT REST API
async function processVoiceQuery(audioBlob) {
    let formData = new FormData();
    formData.append("audio_file", audioBlob, "audio.wav"); 
    formData.append("language_code", "te-IN,hi-IN,en-IN"); 
    formData.append("format", "transcribe"); 

    try {
        statusText.innerText = "Transcribing voice dialect...";
        const gnaniRes = await fetch("https://api.vachana.ai/stt/v3", {
            method: "POST",
            headers: { "X-API-Key-ID": "vach_1ytE2CY5X2Or7xPaKn8XEHlytOkFXBWDFihsYWQSrY17v47aiCSszwjTZELGRh9L3et7vAvZpy3U2nNdLPUd1WPVDSCuCVJ0_ecccae9449497653180a0028b63d86c9" }, 
            body: formData
        });
        const gnaniData = await gnaniRes.json();
        const textQuery = gnaniData.transcript || "Bhai, what is on my screen?";

        // Capture screen state frame simultaneously
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth; 
        canvas.height = videoElement.videoHeight;
        canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.7);

        // Run final Alchemyst multimodal logic
        callAlchemystAI(base64Image, textQuery);
    } catch (err) {
        console.error("Pipeline breakdown:", err);
        statusText.innerText = "Voice processing failed.";
    }
}

// 5. Brain Orchestration Engine via Alchemyst AI
async function callAlchemystAI(base64Image, userTextQuery) {
    statusText.innerText = "Naradha is thinking...";
    aiResponseContainer.innerText = "Reading context updates...";

    const systemBanterPrompt = `
    You are Naradha AI, a witty local buddy. Speak in localized Hinglish/Telugish slang. 
    Be conversational, helpful, and clear.
    If the user explicitly asks to play, find, or open a video, end the entire response text string with exactly "[COMMAND: OPEN YOUTUBE]".
    `;

    try {
        const response = await fetch("https://getalchemystai.com/api/v1/chat", { 
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer sk-50R04-LFUXL-K1RFO-CU7BB" 
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemBanterPrompt },
                    { role: "user", content: `Query: ${userTextQuery}. Screen Context Base64: ${base64Image}` }
                ]
            })
        });
        const data = await response.json();
        const responseText = data.choices[0].message.content;

        // Strip execution command parameters out of public chat window render
        aiResponseContainer.innerHTML = responseText.replace("[COMMAND: OPEN YOUTUBE]", "");
        statusText.innerText = "Done!";
        
        // Call automation router hook
        executeSystemCommand(responseText);
    } catch (err) {
        aiResponseContainer.innerText = "Error calling Alchemyst AI: " + err.message;
        statusText.innerText = "Error.";
    }
}

// 6. Native Chrome Tab Automation Command Execution
function executeSystemCommand(responseHtml) {
    if (responseHtml.includes("[COMMAND: OPEN YOUTUBE]")) {
        statusText.innerText = "Opening YouTube...";
        chrome.tabs.create({ url: "https://www.youtube.com/results?search_query=salaar+fight+scene" });
    }
}