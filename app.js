let screenStream = null;
let isRecording = false;

// Base UI Selectors
const syncBtn = document.getElementById('sync-btn');
const captureBtn = document.getElementById('capture-btn');
const queryInput = document.getElementById('user-query');
const videoElement = document.getElementById('screen-video');
const placeholder = document.getElementById('placeholder-text');
const statusText = document.getElementById('status');
const micBtn = document.getElementById('mic-btn');
const aiResponseContainer = document.getElementById('ai-response');

// =========================================================================
// 1. Core Logic: Screen Sharing System
// =========================================================================
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

// =========================================================================
// 2. Core Logic: Text Input Chat Execution
// =========================================================================
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

// =========================================================================
// 3. Core Logic: Audio Voice Offscreen Routing & Permission Bypass
// =========================================================================
if (micBtn) {
    micBtn.addEventListener('click', async () => {
        if (isRecording) {
            isRecording = false;
            micBtn.innerText = "🎤";
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop-recording' });
            return;
        }

        try {
            // Safe Chrome API check: See if permission is already granted
            const permissionStatus = await navigator.permissions.query({ name: "microphone" });

            if (permissionStatus.state !== "granted") {
                statusText.innerText = "Opening permission helper...";
                // Direct Chrome to open permission.html in a tab to ask for the mic safely
                chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
                return;
            }

            statusText.innerText = "Listening...";
            isRecording = true;
            micBtn.innerText = "🛑";

            // Initialize background helper tab for actual background recording
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
            console.error("Mic process failed:", err);
            statusText.innerText = "Mic connection blocked.";
            isRecording = false;
            micBtn.innerText = "🎤";
        }
    });
}

// Message Listener to catch audio files returned from your background offscreen helper
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'audio-data') {
        statusText.innerText = "Processing voice translation...";

        fetch(message.data)
            .then(res => res.blob())
            .then(audioBlob => {
                processVoiceInput(audioBlob);
            })
            .catch(err => {
                console.error("Audio retrieval error:", err);
                statusText.innerText = "Audio data parsing failed.";
            });
    }
});

// =========================================================================
// 4. Partner Integration: Voice Parsing Layer (Gnani.ai REST Spec v3)
// =========================================================================
async function processVoiceInput(audioBlob) {
    let formData = new FormData();
    
    // Gnani REST API v3 payload configuration
    formData.append("audio_file", audioBlob, "speech.wav");
    formData.append("language_code", "en-IN");          // Captures Indian accent/English-mix natively
    formData.append("preferred_language", "en-IN");      // Fallback language profile
    formData.append("format", "transcribe");             // Triggers high-accuracy transcription mode
    formData.append("itn_native_numerals", "true");      // Resolves numeric references clearly

    try {
        const response = await fetch("https://api.vachana.ai/stt/v3", {
            method: "POST",
            headers: { 
                "X-API-Key-ID": "vach_1ytE2CY5X2Or7xPaKn8XEHlytOkFXBWDFihsYWQSrY17v47aiCSszwjTZELGRh9L3et7vAvZpy3U2nNdLPUd1WPVDSCuCVJ0_ecccae9449497653180a0028b63d86c9" 
            },
            body: formData
        });
        
        const data = await response.json();
        
        // Gnani API v3 returns transcription inside the 'transcript' key
        const outputQueryText = data.transcript || "";
        
        if (!outputQueryText.trim()) {
            statusText.innerText = "No voice detected. Speak closer to the mic!";
            return;
        }

        // Display transcribed text inside input box and response logs instantly
        if (queryInput) {
            queryInput.value = outputQueryText; 
        }
        if (aiResponseContainer) {
            aiResponseContainer.innerText = `You asked: "${outputQueryText}"\n\nAnalyzing screen frame...`;
        }

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
// =========================================================================
// 5. Partner Integration: Multimodal Analysis & Dynamic YouTube Opener
// =========================================================================
async function callAlchemystAI(base64Image, userQueryText) {
    statusText.innerText = "Naradha is thinking...";

    const systemPersona = `You are Naradha AI, a friendly Indian companion helping the user with their screen. Respond using natural Hinglish or Telugish colloquial slang phrases. If the user requests to search, play, or show a video, add exactly '[COMMAND: OPEN YOUTUBE]' at the end of your message.`;

    const cleanImage = base64Image.startsWith("data:image") ? base64Image : "";

    try {
        const response = await fetch("https://api.getalchemystai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer sk-50R04-LFUXL-K1RFO-CU7BB"
            },
            body: JSON.stringify({
                model: "alchemyst-voice-v1",
                messages: [
                    { role: "system", content: systemPersona },
                    { role: "user", content: `Query Text: ${userQueryText}. Visual Context: ${cleanImage ? "Attached" : "None"}` }
                ]
            })
        });

        // Catch HTML router pages gracefully before running json parsing
        if (!response.ok) {
            const errText = await response.text();
            console.error("Server returned an error page:", errText);
            aiResponseContainer.innerText = `Server error status: ${response.status}`;
            return;
        }

        const resData = await response.json();
        if (!resData.choices || !resData.choices[0]) {
            aiResponseContainer.innerText = "Empty response frame from Alchemyst.";
            return;
        }

        const clearTextOutput = resData.choices[0].message.content;

        aiResponseContainer.innerHTML = `<strong>You:</strong> ${userQueryText}<br><br><strong>Naradha:</strong> ${clearTextOutput.replace("[COMMAND: OPEN YOUTUBE]", "")}`;
        statusText.innerText = "Done!";
        
        executeNativeTextToSpeech(clearTextOutput.replace("[COMMAND: OPEN YOUTUBE]", ""));
        
        // --- DYNAMIC YOUTUBE OPENER ROUTE ---
        if (clearTextOutput.includes("[COMMAND: OPEN YOUTUBE]")) {
            const cleanedQuery = encodeURIComponent(userQueryText.replace(/open|youtube|play|show/gi, "").trim());
            const searchTarget = cleanedQuery ? cleanedQuery : "salaar+fight+scene"; 
            const targetUrl = `https://www.youtube.com/results?search_query=${searchTarget}`;
            
            if (typeof chrome !== "undefined" && chrome.tabs) {
                chrome.tabs.create({ url: targetUrl });
            } else {
                window.open(targetUrl, "_blank");
            }
        }
    } catch (err) {
        console.error("Alchemyst completion runtime failure:", err);
        aiResponseContainer.innerText = "Could not populate AI resolution frame.";
        statusText.innerText = "System connection issue.";
    }
}

// =========================================================================
// 6. Audio Synthesis Output (Hear Naradha AI Speak)
// =========================================================================
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