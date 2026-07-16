let screenStream = null;
let isRecording = false;
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

// 1. Desktop Screen Sync
syncBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Connecting Screen Sync...";
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: "monitor" },
            audio: false
        });
        videoElement.srcObject = screenStream;
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
        statusText.innerText = "Screen Active & Shared!";
        captureBtn.disabled = false;
        syncBtn.disabled = true;
    } catch (err) {
        console.error("Screen capture failed:", err);
        statusText.innerText = "Screen sync connection failed.";
    }
});

// 2. Clear out manual text query processing via button click
captureBtn.addEventListener('click', () => {
    processTextQuery();
});

// Listen for Enter key events inside the input area
queryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        processTextQuery();
    }
});

function processTextQuery() {
    const queryText = queryInput.value.trim();
    if (!queryText) return;
    
    statusText.innerText = "Scanning visible context...";
    let base64Image = "";
    
    if (screenStream && videoElement) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL('image/jpeg', 0.8);
    }
    
    callAlchemystAI(base64Image, queryText);
}

// 3. Microphone Input Triggers (Direct Popup Pipeline)
micBtn.addEventListener('click', async () => {
    if (isRecording) {
        isRecording = false;
        micBtn.innerText = "🎤";
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
        return;
    }

    try {
        statusText.innerText = "Listening closely...";
        isRecording = true;
        micBtn.innerText = "🛑";
        audioChunks = [];

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Force standard high-fidelity audio options
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            statusText.innerText = "Transcribing multi-dialect audio...";
            processVoiceQuery(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
    } catch (err) {
        console.error("Microphone hardware block:", err);
        statusText.innerText = "Mic access blocked.";
        isRecording = false;
        micBtn.innerText = "🎤";
    }
});

// 4. Voice Processing Pipeline via Gnani.ai STT API
async function processVoiceQuery(audioBlob) {
    let formData = new FormData();
    // Pass binary audio explicitly named as a wav wrapper file structure
    formData.append("file", audioBlob, "speech.wav");
    formData.append("language", "telugu"); 

    try {
        const res = await fetch("https://api.gnani.ai/v1/transcribe", {
            method: "POST",
            headers: { 
                "Authorization": "YOUR_GNANI_API_KEY" // Add your new Gnani key from your video dashboard screen
            },
            body: formData
        });
        const data = await res.json();
        const textQuery = data.transcript || "Bhai, look at my screen context.";
        
        let base64Image = "";
        if (screenStream && videoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth || 1280;
            canvas.height = videoElement.videoHeight || 720;
            canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            base64Image = canvas.toDataURL('image/jpeg', 0.8);
        }

        callAlchemystAI(base64Image, textQuery);
    } catch (err) {
        console.error("Gnani transmission failed:", err);
        statusText.innerText = "Voice translation system offline.";
    }
}

// 5. Shared Context Processing via Alchemyst AI
async function callAlchemystAI(base64Image, userTextQuery) {
    statusText.innerText = "Naradha is parsing...";
    aiResponseContainer.innerText = "Compiling interface analysis...";

    const systemPersonaPrompt = `
    You are Naradha AI, a witty local companion. Speak in casual Hinglish/Telugish slang. 
    Keep it friendly, highly accurate, and engaging. 
    If the user asks to look up or run a video, append exactly "[COMMAND: OPEN YOUTUBE]" to the text.
    `;

    try {
        const response = await fetch("https://getalchemystai.com/api/v1/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer YOUR_ALCHEMYST_API_KEY" // Add Naradha AI Alchemyst key from your video setup
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPersonaPrompt },
                    { role: "user", content: `Query: ${userTextQuery}. Active Workspace Base64 Image: ${base64Image}` }
                ]
            })
        });

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        // Render clean structural markdown onto panel log display
        aiResponseContainer.innerHTML = responseText.replace("[COMMAND: OPEN YOUTUBE]", "");
        statusText.innerText = "Done!";
        
        // Execute dynamic text-to-speech option so you can hear Naradha speak
        speakNaradhaText(responseText.replace("[COMMAND: OPEN YOUTUBE]", ""));

        executeSystemCommand(responseText);
    } catch (err) {
        console.error("Alchemyst parsing layout error:", err);
        aiResponseContainer.innerText = "Analysis streaming broke.";
        statusText.innerText = "System error.";
    }
}

// 6. Text-to-Speech Substrate Engine (So you HEAR Naradha AI speak)
function speakNaradhaText(textToSpeak) {
    if ('speechSynthesis' in window) {
        // Cancel any active audio playback streams running in memory layers
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Automatically check device language profiles to find localized Indian accents
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(voice => voice.lang.includes("IN") || voice.name.includes("India"));
        if (indianVoice) utterance.voice = indianVoice;
        
        utterance.rate = 1.0; 
        window.speechSynthesis.speak(utterance);
    }
}

// 7. System Command Tab Automations
function executeSystemCommand(responseHtml) {
    if (responseHtml.includes("[COMMAND: OPEN YOUTUBE]")) {
        statusText.innerText = "Opening YouTube...";
        const targetUrl = "https://www.youtube.com/results?search_query=salaar+fight+scene";
        
        if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: targetUrl });
        } else {
            window.open(targetUrl, '_blank');
        }
    }
}let screenStream = null;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

// Base UI Selectors
const syncBtn = document.getElementById('sync-btn');
const captureBtn = document.getElementById('capture-btn');
const queryInput = document.getElementById('user-query');
const videoElement = document.getElementById('screen-video');
const placeholder = document.getElementById('placeholder-text');
const statusText = document.getElementById('status');
const micBtn = document.getElementById('mic-btn');
const aiResponseContainer = document.getElementById('ai-response');

// 1. Core Logic: Screen Sharing System
if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
        try {
            statusText.innerText = "Initializing Screen Capture...";
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "monitor" },
                audio: false
            });
            if (videoElement) {
                videoElement.srcObject = screenStream;
                videoElement.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            statusText.innerText = "Screen Context Connected!";
            if (captureBtn) captureBtn.disabled = false;
            syncBtn.disabled = true;
        } catch (err) {
            console.error("Screen initialization crashed:", err);
            statusText.innerText = "Failed to connect screen stream.";
        }
    });
}

// 2. Core Logic: Text Input Chat Execution
if (captureBtn) {
    captureBtn.addEventListener('click', () => { executeTextPipeline(); });
}
if (queryInput) {
    queryInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            executeTextPipeline();
        }
    });
}

function executeTextPipeline() {
    const textVal = queryInput.value.trim();
    if (!textVal) return;
    
    statusText.innerText = "Scanning active visual frame...";
    let base64Frame = "";
    
    if (screenStream && videoElement) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        base64Frame = canvas.toDataURL('image/jpeg', 0.8);
    }
    
    callAlchemystAI(base64Frame, textVal);
}

// 3. Core Logic: Audio Voice Substrate
if (micBtn) {
    micBtn.addEventListener('click', async () => {
        if (isRecording) {
            isRecording = false;
            micBtn.innerText = "🎤";
            if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
            return;
        }

        try {
            statusText.innerText = "Naradha is listening...";
            isRecording = true;
            micBtn.innerText = "🛑";
            audioChunks = [];

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const voiceBlob = new Blob(audioChunks, { type: 'audio/webm' });
                statusText.innerText = "Processing voice translation...";
                processVoiceInput(voiceBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Mic stream blocked:", err);
            statusText.innerText = "Mic connection blocked.";
            isRecording = false;
            micBtn.innerText = "🎤";
        }
    });
}

// 4. Partner Integration: Voice Parsing Layer (Gnani.ai)
async function processVoiceInput(audioBlob) {
    let formData = new FormData();
    formData.append("file", audioBlob, "input_voice.wav");
    formData.append("language", "telugu");

    try {
        const response = await fetch("https://api.gnani.ai/v1/transcribe", {
            method: "POST",
            headers: { "Authorization": "YOUR_GNANI_API_KEY" },
            body: formData
        });
        const data = await response.json();
        const outputQueryText = data.transcript || "Bhai, interpret my display window.";
        
        let visualSnapshot = "";
        if (screenStream && videoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth || 1280;
            canvas.height = videoElement.videoHeight || 720;
            canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            visualSnapshot = canvas.toDataURL('image/jpeg', 0.8);
        }

        callAlchemystAI(visualSnapshot, outputQueryText);
    } catch (err) {
        console.error("Gnani transcription runtime failure:", err);
        statusText.innerText = "Voice translation error.";
    }
}

// 5. Partner Integration: Multimodal Analysis & Chat Engine (Alchemyst AI)
async function callAlchemystAI(base64Image, userQueryText) {
    statusText.innerText = "Naradha is thinking...";
    aiResponseContainer.innerText = "Analyzing your active workspace...";

    const systemPersona = `
    You are Naradha AI, a friendly Indian companion helping the user with their screen. 
    Respond using natural Hinglish or Telugish colloquial slang phrases. 
    If the user requests to search or show a video scene, add exactly '[COMMAND: OPEN YOUTUBE]' at the end.
    `;

    try {
        const response = await fetch("https://getalchemystai.com/api/v1/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer YOUR_ALCHEMYST_API_KEY"
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPersona },
                    { role: "user", content: `Query Text: ${userQueryText}. Visual Context String: ${base64Image}` }
                ]
            })
        });

        const resData = await response.json();
        const clearTextOutput = resData.choices[0].message.content;

        // Render response inside the insight component dashboard log
        aiResponseContainer.innerHTML = clearTextOutput.replace("[COMMAND: OPEN YOUTUBE]", "");
        statusText.innerText = "Done!";
        
        // Execute dynamic text-to-speech engine loop so Naradha talks back
        executeNativeTextToSpeech(clearTextOutput.replace("[COMMAND: OPEN YOUTUBE]", ""));
        
        // Run desktop link tab navigation rules if command flag exists
        if (clearTextOutput.includes("[COMMAND: OPEN YOUTUBE]")) {
            window.open("https://www.youtube.com/results?search_query=salaar+fight+scene", "_blank");
        }
    } catch (err) {
        console.error("Alchemyst completion runtime failure:", err);
        aiResponseContainer.innerText = "Could not populate AI resolution frame.";
        statusText.innerText = "System connection issue.";
    }
}

// 6. Audio Synthesis Output (Hear Naradha AI Speak)
function executeNativeTextToSpeech(textString) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const vocalUtterance = new SpeechSynthesisUtterance(textString);
        const voiceTracks = window.speechSynthesis.getVoices();
        const nativeAccent = voiceTracks.find(v => v.lang.includes("IN") || v.name.includes("India"));
        if (nativeAccent) vocalUtterance.voice = nativeAccent;
        window.speechSynthesis.speak(vocalUtterance);
    }
}