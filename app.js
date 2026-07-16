// =========================================================================
// 1. SCREEN CAPTURE & FRAMING LOGIC
// =========================================================================
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

<<<<<<< Updated upstream
// 1. Capture the desktop screen stream
=======
// Request desktop screen stream
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
// 2. Capture Image Frame via Button Chat Input
=======
// Capture frame and send with manual text input query
>>>>>>> Stashed changes
captureBtn.addEventListener('click', () => {
    if (!screenStream) return;

    statusText.innerText = "Scanning active screen frame...";
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
<<<<<<< Updated upstream
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
=======
    
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
>>>>>>> Stashed changes
    const base64Image = canvas.toDataURL('image/jpeg', 0.7); 
    
    statusText.innerText = "Frame captured successfully!";
<<<<<<< Updated upstream
    const queryText = queryInput.value || "Bhai, what is on my screen?";
    
    // Pass visual state and input text directly to Alchemyst AI
    callAlchemystAI(base64Image, queryText);
});
=======
    
    const queryText = queryInput.value || "Bhai, what is on my screen?";
    
    // Pass captured canvas and the written query to Alchemyst AI
    callAlchemystAI(base64Image, queryText);
});


// =========================================================================
// 2. MICROPHONE CAPTURE LOGIC (Via Offscreen Helper)
// =========================================================================
const micBtn = document.getElementById('mic-btn');
let isRecording = false;
>>>>>>> Stashed changes

// 3. Audio Recording Handler Loop
micBtn.addEventListener('click', async () => {
    if (isRecording) {
        isRecording = false;
        micBtn.innerText = "🎤";
        chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop-recording' });
        return;
    }

    try {
<<<<<<< Updated upstream
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
// Add Enter key listener to the text input field
queryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevents page reload
        captureBtn.click();     // Automatically clicks the Analyze button
=======
        statusText.innerText = "Listening...";
        isRecording = true;
        micBtn.innerText = "🛑";

        const hasDocument = await chrome.offscreen.hasDocument();
        if (!hasDocument) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: [chrome.offscreen.Reason.USER_MEDIA],
                justification: 'Recording microphone for voice transcription.'
            });
        }

        chrome.runtime.sendMessage({ target: 'offscreen', type: 'start-recording' });

    } catch (err) {
        console.error("Could not spin up offscreen mic:", err);
        statusText.innerText = "Mic launch failed!";
        isRecording = false;
        micBtn.innerText = "🎤";
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'audio-data') {
        statusText.innerText = "Processing Voice...";

        fetch(message.data)
            .then(res => res.blob())
            .then(audioBlob => {
                processVoiceQuery(audioBlob);
            });
    }
});


// =========================================================================
// 3. API INTEGRATIONS (Gnani.ai & Alchemyst AI)
// =========================================================================

// Step A: Convert voice to text using Gnani.ai STT
async function processVoiceQuery(audioBlob) {
    let formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    formData.append("language", "telugu"); // Multi-dialect support configuration

    try {
        // Gnani.ai Speech-to-Text call
        const res = await fetch("https://api.gnani.ai/v1/transcribe", {
            method: "POST",
            headers: { 
                "Authorization": "vach_1ytE2CY5X2Or7xPaKn8XEHlytOkFXBWDFihsYWQSrY17v47aiCSszwjTZELGRh9L3et7vAvZpy3U2nNdLPUd1WPVDSCuCVJ0_ecccae9449497653180a0028b63d86c9" 
            },
            body: formData
        });
        const data = await res.json();
        const textQuery = data.transcript || "Bhai, what is on my screen?"; 

        // Grab current screen frame context
        let base64Image = "";
        if (screenStream && videoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth || 640; 
            canvas.height = videoElement.videoHeight || 480;
            canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            base64Image = canvas.toDataURL('image/jpeg', 0.7);
        }

        // Forward transcribed voice text + canvas context to Alchemyst AI
        callAlchemystAI(base64Image, textQuery);
    } catch (err) {
        console.error("Voice translation pipeline failed:", err);
        statusText.innerText = "Voice translation failed.";
    }
}

// Step B: Send multimodal context to Alchemyst AI
async function callAlchemystAI(base64Image, userTextQuery) {
    const aiResponseContainer = document.getElementById('ai-response');
    statusText.innerText = "Naradha is thinking...";
    aiResponseContainer.innerText = "Analyzing screen & query...";

    const systemBanterPrompt = `
    You are Naradha AI, a witty local buddy. Speak in localized Hinglish/Telugish slang. 
    If the user asks to play a video, end the response with "[COMMAND: OPEN YOUTUBE]".
    `;

    try {
        const response = await fetch("https://getalchemystai.com/api/v1/chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer YOUR_ALCHEMYST_API_KEY" // Add your actual Alchemyst API Key here
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

        // Render response visually, leaving out the control tag
        aiResponseContainer.innerHTML = responseText.replace("[COMMAND: OPEN YOUTUBE]", "");
        statusText.innerText = "Done!";
        
        // Check and trigger YouTube navigation command
        executeSystemCommand(responseText);
    } catch (err) {
        console.error("Alchemyst AI connection failed:", err);
        aiResponseContainer.innerText = "Error calling AI: " + err.message;
        statusText.innerText = "Failed.";
    }
}


// =========================================================================
// 4. AUTOMATION ENGINE (System Command Executor)
// =========================================================================
function executeSystemCommand(responseHtml) {
    if (responseHtml.includes("[COMMAND: OPEN YOUTUBE]")) {
        statusText.innerText = "Opening YouTube...";
        
        const searchQuery = "salaar fight scene";
        const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        
        if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: targetUrl });
        } else {
            window.open(targetUrl, '_blank'); // Standard browser testing fallback
        }
>>>>>>> Stashed changes
    }
});
