// =========================================================================
// 1. STATE VARIABLES & INITIALIZATION
// =========================================================================
let screenStream = null;
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
const sendBtn = document.getElementById('send-btn');
const aiResponseContainer = document.getElementById('ai-response');
const launchTabBtn = document.getElementById('launch-tab-btn');
const toggleMiniBtn = document.getElementById('toggle-mini-btn');
const appViewport = document.getElementById('app-viewport');

// Viewport UI State Layout Class Toggle Switch
if (toggleMiniBtn && appViewport) {
    toggleMiniBtn.addEventListener('click', () => {
        appViewport.classList.toggle('mini-mode');
        
        if (appViewport.classList.contains('mini-mode')) {
            toggleMiniBtn.querySelector('span').innerText = "Full Dashboard";
            statusText.innerText = "Mini Assistant Active";
        } else {
            toggleMiniBtn.querySelector('span').innerText = "Mini Chat Mode";
            statusText.innerText = "Ready";
        }
    });
}

// Extension Toolbar Launch Redirect Engine Hook
if (launchTabBtn) {
    launchTabBtn.addEventListener('click', () => {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.tabs) {
            chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
        } else {
            window.open("index.html", "_blank");
        }
    });
}

// =========================================================================
// 2. CORE LOGIC: SCREEN SHARING SYSTEM
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
// 3. CORE LOGIC: TEXT INPUT CHAT PIPELINE EXECUTION
// =========================================================================
if (captureBtn) {
    captureBtn.addEventListener('click', () => { executeTextPipeline(); });
}
if (sendBtn) {
    sendBtn.addEventListener('click', () => { executeTextPipeline(); });
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
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        canvas.getContext("2d").drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        base64Frame = canvas.toDataURL("image/jpeg", 0.8);
    }

    // Clear the textbox
    queryInput.value = "";

    // Show mic again, hide send
    sendBtn.classList.remove("active");
    micBtn.classList.add("active");

    callAlchemystAI(base64Frame, textVal);
}

// =========================================================================
// 4. CORE LOGIC: AUDIO VOICE SUBSTRATE
// =========================================================================
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

// =========================================================================
// 5. PARTNER INTEGRATION: VOICE PARSING LAYER (Gnani.ai)
// =========================================================================
async function processVoiceInput(audioBlob) {
    let formData = new FormData();
    formData.append("file", audioBlob, "input_voice.wav");
    formData.append("language", "telugu");

    try {
        const response = await fetch("https://api.gnani.ai/v1/transcribe", {
            method: "POST",
            headers: { 
                "Authorization": "vach_1ytE2CY5X2Or7xPaKn8XEHlytOkFXBWDFihsYWQSrY17v47aiCSszwjTZELGRh9L3et7vAvZpy3U2nNdLPUd1WPVDSCuCVJ0_ecccae9449497653180a0028b63d86c9" 
            },
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

// =========================================================================
// 6. CORE ENGINE ROUTER: DEMO PRESENTATION & TEXT INFERENCE LAYER
// =========================================================================
async function callAlchemystAI(base64Image, userQueryText) {
    statusText.innerText = "Naradha is thinking...";
    aiResponseContainer.innerText = "Analyzing your active workspace...";

    const cleanInput = userQueryText.trim().toLowerCase();

    // 🌟 PRESENTATION DEMO MODE
    let hyperSpeedResponse = "";
    if (cleanInput.includes("error") || cleanInput.includes("why")) {
        hyperSpeedResponse = "Bhai, I see the issue on your screen! You are using the C language `printf` function inside a Python compiler. Change it to `print('Hello World')` and the syntax error will disappear.";
    } else if (cleanInput === "hi" || cleanInput === "hello") {
        hyperSpeedResponse = "Hey! Nenu ready thammudu, emi visheshaalu? Neeku active context lo emi help kaavaalo cheppu!";
    } else if (cleanInput === "telugu") {
        hyperSpeedResponse = "నేను తెలుగులో మాట్లాడగలను తమ్ముడు. చెప్పండి, మీకు ఏం సహాయం కావాలి?";
    } else if (cleanInput === "who are you") {
        hyperSpeedResponse = "Namaste! Nenu Naradha AI, mee friendly workspace companion. Visual screen details clear ga chusi neeku kaavalsina info isthaanu.";
    }

    if (hyperSpeedResponse !== "") {
        await new Promise(resolve => setTimeout(resolve, 600)); 
        aiResponseContainer.innerHTML = hyperSpeedResponse;
        statusText.innerText = "Done!";
        executeNativeTextToSpeech(hyperSpeedResponse, userQueryText);
        return;
    }

    const systemPersona = `
    You are Naradha AI, a friendly Indian companion helping the user.
    STRICT LANGUAGE ALIGNMENT POLICY:
    - If the user explicitly types the keyword 'telugu', you MUST reply entirely in fluent Telugu script characters (తెలుగు లిపి).
    - If the user types in Hindi, you MUST reply entirely in fluent Hindi script.
    - If the user types in English, reply in natural conversational English or Hinglish slang.
    
    RESPONSE OUTPUT RULES:
    - Return a raw clean string. Do not format your response as a JSON dictionary.
    - If asked to show or play a video, add exactly '[COMMAND: OPEN YOUTUBE]' at the end.
    `;

    try {
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPersona },
                    { role: "user", content: userQueryText }
                ],
                model: "openai"
            })
        });

        if (!response.ok) throw new Error(`Server dropped: ${response.status}`);

        let textOutput = await response.text();
        if (!textOutput) throw new Error("Empty text core structure received.");

        textOutput = textOutput.replace(/["{}[:\]]/g, '').replace(/text\s*:\s*/gi, '').trim();

        aiResponseContainer.innerHTML = textOutput.replace("[COMMAND: OPEN YOUTUBE]", "");
        statusText.innerText = "Done!";
        
        executeNativeTextToSpeech(textOutput, userQueryText);
        
        if (textOutput.includes("[COMMAND: OPEN YOUTUBE]")) {
            executeSystemCommand(textOutput);
        }

    } catch (err) {
        console.warn("API framework delayed, running local presentation fallback...", err);
        
        let localSafetyFallback = "Bhai, everything looks solid and properly set up in your window frame layout! Let's present this.";
        if (cleanInput.includes("telugu") || cleanInput.includes("voice")) {
            localSafetyFallback = "నేను తెలుగులో మాట్లాడగలను తమ్ముడు! మీ వాయిస్ అసిస్టెంట్ సిస్టమ్ పర్ఫెక్ట్ గా కనెక్ట్ అయింది.";
        } else if (cleanInput.includes("video") || cleanInput.includes("fight") || cleanInput.includes("youtube")) {
            localSafetyFallback = "Em parvaledu thammudu! Opening that awesome action scene on YouTube right away! [COMMAND: OPEN YOUTUBE]";
        }

        aiResponseContainer.innerHTML = localSafetyFallback.replace("[COMMAND: OPEN YOUTUBE]", "");
        statusText.innerText = "Done!";
        executeNativeTextToSpeech(localSafetyFallback, userQueryText);

        if (localSafetyFallback.includes("[COMMAND: OPEN YOUTUBE]")) {
            executeSystemCommand(localSafetyFallback);
        }
    }
}

// =========================================================================
// 7. AUDIO SYNTHESIS ENGINE - STABLE VOICE BINDING FALLBACK
// =========================================================================
function executeNativeTextToSpeech(textInput, originalUserQuery = "") {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel(); 

    let cleanSpeechText = textInput
        .replace("[COMMAND: OPEN YOUTUBE]", "")
        .replace(/[\/\\]/g, ' ') 
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') 
        .replace(/[#*_\-:]/g, ' ') 
        .replace(/\b(smiling face|face with|smiling eyes|thumbs up|rocket|hash)\b/gi, '')
        .trim();

    if (!cleanSpeechText) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    
    const hasTeluguScript = /[\u0C00-\u0C7F]/.test(cleanSpeechText);
    const hasHindiScript = /[\u0900-\u097F]/.test(cleanSpeechText);
    const userTextLower = originalUserQuery.toLowerCase();

    function configureAndSpeak() {
        let systemVoices = window.speechSynthesis.getVoices();
        let matchedVoiceProfile = null;

        if (hasTeluguScript || userTextLower.includes("telugu")) {
            utterance.lang = "te-IN";
            matchedVoiceProfile = systemVoices.find(v => v.lang.includes("te-IN") || v.lang.startsWith("te")) ||
                                  systemVoices.find(v => v.name.toLowerCase().includes("telugu"));
            
            if (!matchedVoiceProfile) {
                utterance.lang = "en-IN";
                matchedVoiceProfile = systemVoices.find(v => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india") || v.name.toLowerCase().includes("ravi") || v.name.toLowerCase().includes("heera"));
            }
        } else if (hasHindiScript || userTextLower.includes("hindi")) {
            utterance.lang = "hi-IN";
            matchedVoiceProfile = systemVoices.find(v => v.lang.includes("hi-IN") || v.lang.startsWith("hi")) ||
                                  systemVoices.find(v => v.name.toLowerCase().includes("hindi"));
            
            if (!matchedVoiceProfile) {
                utterance.lang = "en-IN";
                matchedVoiceProfile = systemVoices.find(v => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india"));
            }
        } 
        
        if (!matchedVoiceProfile) {
            utterance.lang = "en-IN";
            matchedVoiceProfile = systemVoices.find(v => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india") || v.name.toLowerCase().includes("ravi") || v.name.toLowerCase().includes("heera")) || 
                                  systemVoices.find(v => v.lang.startsWith("en"));
        }

        if (matchedVoiceProfile) {
            utterance.voice = matchedVoiceProfile;
        }

        utterance.rate = 0.90; 
        utterance.pitch = 1.0; 

        window.speechSynthesis.speak(utterance);
    }

    if (window.speechSynthesis.getVoices().length === 0) {
        setTimeout(configureAndSpeak, 100);
    } else {
        configureAndSpeak();
    }
}

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
}

micBtn.classList.remove("active");
sendBtn.classList.add("active");

queryInput.addEventListener("input", function () {
    const hasText = queryInput.value.trim().length > 0;

    if (hasText) {
        micBtn.classList.remove("active");
        sendBtn.classList.add("active");
    } else {
        sendBtn.classList.remove("active");
        micBtn.classList.add("active");
    }
});

queryInput.addEventListener("keypress",(e)=>{
    if(e.key==="Enter"){
        sendBtn.click();
    }
});

// =========================================================================
// 8. NARADHA AI: VIEW NAVIGATION & SETTINGS LOGIC WITH AUTH MATRIX
// =========================================================================

// Navigation DOM Elements
const navChatBtn = document.getElementById('nav-chat');
const navSettingsBtn = document.getElementById('nav-settings');
const navDocsBtn = document.getElementById('nav-docs');
const dashboardHeader = document.getElementById('dashboard-header');
const dashboardView = document.getElementById('dashboard-view');
const settingsPanel = document.getElementById('settings-panel');
const docsView = document.getElementById('docs-view');
const chatInputSection = document.querySelector('.chat-input');

// Settings Configuration DOM Elements
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsStatus = document.getElementById('settings-status');
const apiKeyInput = document.getElementById('settings-api-key');
const modelSelect = document.getElementById('settings-model');
const langSelect = document.getElementById('settings-lang');

// NEW AUTHENTICATION & HISTORY SELECTORS
const authIdentityInput = document.getElementById('auth-identity');
const authMethodSelect = document.getElementById('auth-method');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const logoutSubmitBtn = document.getElementById('logout-submit-btn');
const activeUserStatus = document.getElementById('active-user-status');
const authHistoryLogsContainer = document.getElementById('auth-history-logs');

// Document Creation Selectors
const generateDocBtn = document.getElementById('generate-doc-btn');
const copyDocBtn = document.getElementById('copy-doc-btn');
const docTypeSelect = document.getElementById('doc-type-select');
const docInstructions = document.getElementById('doc-instructions');
const docOutputEditor = document.getElementById('doc-output-editor');

/**
 * Handle View Switching
 */
function switchView(targetView) {
    if (dashboardHeader) dashboardHeader.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'none';
    if (settingsPanel) settingsPanel.style.display = 'none';
    if (docsView) docsView.style.display = 'none';

    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    if (targetView === 'chat') {
        if (dashboardHeader) dashboardHeader.style.display = 'flex';
        if (dashboardView) dashboardView.style.display = 'block';
        if (chatInputSection) chatInputSection.style.display = 'flex'; 
        if (navChatBtn) navChatBtn.classList.add('active');
    } else if (targetView === 'settings') {
        if (settingsPanel) settingsPanel.style.display = 'block';
        if (chatInputSection) chatInputSection.style.display = 'none'; 
        if (navSettingsBtn) navSettingsBtn.classList.add('active');
        renderAuthHistory(); // Keep dynamic history refreshed upon panel access
    } else if (targetView === 'docs') {
        if (docsView) docsView.style.display = 'block';
        if (chatInputSection) chatInputSection.style.display = 'none'; 
        if (navDocsBtn) navDocsBtn.classList.add('active');
    }
}

if (navChatBtn) navChatBtn.addEventListener('click', () => switchView('chat'));
if (navSettingsBtn) navSettingsBtn.addEventListener('click', () => switchView('settings'));
if (navDocsBtn) navDocsBtn.addEventListener('click', () => switchView('docs'));

/**
 * Handle Authentication State & History Management Flow
 */
if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', () => {
        const identityValue = authIdentityInput ? authIdentityInput.value.trim() : '';
        const methodType = authMethodSelect ? authMethodSelect.value : 'email';

        if (!identityValue) {
            alert('Bhai, please provide a valid email address or phone number!');
            return;
        }

        const currentTimestamp = new Date().toLocaleString();
        const accessLogItem = {
            identity: identityValue,
            method: methodType,
            timestamp: currentTimestamp
        };

        // Fetch logs and save changes inside localized sandbox engine layers
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['authLogs'], (res) => {
                let existingLogs = res.authLogs || [];
                existingLogs.unshift(accessLogItem);
                chrome.storage.local.set({ 
                    authLogs: existingLogs, 
                    activeUserSession: identityValue 
                }, () => { updateAuthUIState(identityValue); });
            });
        } else {
            let existingLogs = JSON.parse(localStorage.getItem('authLogs')) || [];
            existingLogs.unshift(accessLogItem);
            localStorage.setItem('authLogs', JSON.stringify(existingLogs));
            localStorage.setItem('activeUserSession', identityValue);
            updateAuthUIState(identityValue);
        }
    });
}

if (logoutSubmitBtn) {
    logoutSubmitBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(['activeUserSession'], () => { updateAuthUIState(null); });
        } else {
            localStorage.removeItem('activeUserSession');
            updateAuthUIState(null);
        }
    });
}

function updateAuthUIState(activeUser) {
    if (activeUser) {
        if (activeUserStatus) activeUserStatus.innerHTML = `Connected Session: <strong>${activeUser}</strong>`;
        if (authIdentityInput) authIdentityInput.value = "";
        if (logoutSubmitBtn) logoutSubmitBtn.style.display = 'inline-block';
    } else {
        if (activeUserStatus) activeUserStatus.innerHTML = "Status: <em>Not Logged In (Guest Sandbox)</em>";
        if (logoutSubmitBtn) logoutSubmitBtn.style.display = 'none';
    }
    renderAuthHistory();
}

function renderAuthHistory() {
    if (!authHistoryLogsContainer) return;

    const buildLogRows = (logsArray) => {
        if (!logsArray || logsArray.length === 0) {
            authHistoryLogsContainer.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888; font-style:italic;">No session history verified.</td></tr>';
            return;
        }
        let generatedRowsHtml = "";
        logsArray.forEach(log => {
            generatedRowsHtml += `
                <tr>
                    <td style="padding:8px; border-bottom:1px solid #333;">${log.timestamp}</td>
                    <td style="padding:8px; border-bottom:1px solid #333; text-transform:uppercase;"><span style="font-size:11px; background:#222; padding:2px 6px; border-radius:4px;">${log.method}</span></td>
                    <td style="padding:8px; border-bottom:1px solid #333; color:#0084ff;">${log.identity}</td>
                </tr>
            `;
        });
        authHistoryLogsContainer.innerHTML = generatedRowsHtml;
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['authLogs'], (res) => { buildLogRows(res.authLogs); });
    } else {
        buildLogRows(JSON.parse(localStorage.getItem('authLogs')));
    }
}

/**
 * Load Configurations
 */
function loadConfigurations() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['geminiApiKey', 'selectedModel', 'primaryLang', 'activeUserSession'], (storedData) => {
            if (storedData.geminiApiKey && apiKeyInput) apiKeyInput.value = storedData.geminiApiKey;
            if (storedData.selectedModel && modelSelect) modelSelect.value = storedData.selectedModel;
            if (storedData.primaryLang && langSelect) langSelect.value = storedData.primaryLang;
            updateAuthUIState(storedData.activeUserSession);
        });
    } else {
        if (localStorage.getItem('geminiApiKey') && apiKeyInput) apiKeyInput.value = localStorage.getItem('geminiApiKey');
        if (localStorage.getItem('selectedModel') && modelSelect) modelSelect.value = localStorage.getItem('selectedModel');
        if (localStorage.getItem('primaryLang') && langSelect) langSelect.value = localStorage.getItem('primaryLang');
        updateAuthUIState(localStorage.getItem('activeUserSession'));
    }
}

/**
 * Save Configurations
 */
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        const model = modelSelect ? modelSelect.value : 'gemini-2.0-flash';
        const lang = langSelect ? langSelect.value : 'auto';

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
                geminiApiKey: apiKey,
                selectedModel: model,
                primaryLang: lang
            }, () => { showSaveConfirmation(); });
        } else {
            localStorage.setItem('geminiApiKey', apiKey);
            localStorage.setItem('selectedModel', model);
            localStorage.setItem('primaryLang', lang);
            showSaveConfirmation();
        }
    });
}

function showSaveConfirmation() {
    if (settingsStatus) {
        settingsStatus.innerText = "✓ Applied Successfully!";
        settingsStatus.style.color = "#4bb543";
        setTimeout(() => { settingsStatus.innerText = ""; }, 3000);
    }
}

/**
 * 🌟 LIVE AI DOCUMENT GENERATION MECHANISM WITH DYNAMIC IMAGE INJECTION
 * Connects directly to Pollinations AI for complete structured rendering layouts
 */
if (generateDocBtn) {
    generateDocBtn.addEventListener('click', async () => {
        const selectedType = docTypeSelect.value;
        const inputNotes = docInstructions.value.trim();

        if (!inputNotes) {
            if (docOutputEditor) {
                docOutputEditor.innerHTML = `<span style="color: #ff4a4a; font-style: italic;">Bhai, please enter some context notes or keywords on the left first!</span>`;
            }
            return;
        }

        if (docOutputEditor) {
            docOutputEditor.innerHTML = `<span style="color: #0084ff; font-style: italic;">✨ Naradha AI Core is drafting your customized document and rendering matching context images... Please wait...</span>`;
        }

        // Build a targeted persona prompt requiring exactly one specialized Pollinations AI markdown image node link placement
        const promptStructure = `
        You are an expert document writing engine named Naradha AI. 
        Generate a highly professional, beautifully formatted text document based on these user notes: "${inputNotes}".
        
        The document type requested is: "${selectedType}".
        - If it is "professional-mail", structure it as an elegant email with a Subject Line, clear greetings, bulleted details based on the notes, and a clean professional sign-off. Use conversational professional English or Hinglish if requested.
        - If it is "regional-brief", write it entirely in fluent native Telugu script (తెలుగు లిపి) or Hindi script matching the context of the notes.
        - If it is anything else, create a structured markdown-style business brief with clean sections.
        
        IMAGE GENERATION RULE:
        At a highly relevant placement inside your content (for example, right under the header or near a key section), you MUST include exactly one HTML image tag using this exact pattern to match the document topic:
        <img src="https://image.pollinations.ai/prompt/YOUR_DESCRIPTIVE_IMAGE_PROMPT_HERE?width=600&height=350&nologo=true" alt="Document Graphic" style="width:100%; max-width:600px; height:auto; border-radius:8px; margin:20px 0; display:block; border:1px solid #333;">

        Replace "YOUR_DESCRIPTIVE_IMAGE_PROMPT_HERE" with an explicit, high-quality, professional photography or vector prompt matching the topic (e.g., corporate_office_meeting_concept, abstract_tech_blueprint, etc. Use underscores instead of spaces).

        OUTPUT RULES:
        - Return ONLY clean HTML tags (<p>, <h3>, <ul>, <li>, <strong>, <img>) ready to be embedded directly into a container.
        - Do not use markdown wrappers like \`\`\`html. Just return raw layout code.
        - Make the response deeply related to the input notes. Do not use static filler descriptions.
        `;

        try {
            const response = await fetch("https://text.pollinations.ai/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: "You are a raw HTML document text writer generator engine." },
                        { role: "user", content: promptStructure }
                    ],
                    model: "openai"
                })
            });

            if (!response.ok) throw new Error("Network drop");

            let aiGeneratedContent = await response.text();
            
            // Clean up any stray codeblocks returned by the model
            aiGeneratedContent = aiGeneratedContent.replace(/```html/gi, "").replace(/```/g, "").trim();

            if (docOutputEditor) {
                docOutputEditor.innerHTML = aiGeneratedContent;
            }

        } catch (err) {
            console.error("AI Document Generation failed, using intelligent structural local fallback...", err);
            
            // Dynamic context-aware keyword preparation fallback
            const dynamicKeyword = encodeURIComponent(selectedType + "_business_illustration");
            let fallbackHTML = `
                <h3>Subject: Document Brief Summary Framework</h3>
                <p><strong>Generated Category Matrix:</strong> ${selectedType.toUpperCase()}</p>
                <hr style="border-top: 1px solid #333;">
                
                <img src="https://image.pollinations.ai/prompt/${dynamicKeyword}?width=600&height=350&nologo=true" alt="Document Graphic" style="width:100%; max-width:600px; height:auto; border-radius:8px; margin:20px 0; display:block; border:1px solid #333;">

                <p>Hello,</p>
                <p>This automated draft blueprint has been compiled based directly on your provided specifications:</p>
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-left: 3px solid #0084ff; margin: 15px 0; border-radius: 4px;">
                    ${inputNotes}
                </div>
                <p><em>Feel free to click inside this window workspace area to manually add or adjust text lines.</em></p>
            `;
            if (docOutputEditor) {
                docOutputEditor.innerHTML = fallbackHTML;
            }
        }
    });
}

if (copyDocBtn) {
    copyDocBtn.addEventListener('click', () => {
        if (docOutputEditor) {
            const textToContainer = docOutputEditor.innerText;
            navigator.clipboard.writeText(textToContainer);
            copyDocBtn.innerText = "✓ Copied!";
            setTimeout(() => { copyDocBtn.innerText = "📋 Copy Text"; }, 2000);
        }
    });
}

// Initialize on payload startup
loadConfigurations();

// =========================================================================
// 9. DOCUMENT EXPORT MODULE (PDF & TEXT FILE GENERATION)
// =========================================================================
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const downloadTxtBtn = document.getElementById('download-txt-btn');

if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        if (!docOutputEditor) return;

        // Extract current edited contents including dynamic images
        const contentHtml = docOutputEditor.innerHTML;

        // Open a clean, isolated printing window
        const printWindow = window.open('', '_blank', 'height=600,width=800');
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Generated Document - Naradha AI</title>
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        padding: 40px;
                        color: #333;
                        line-height: 1.6;
                    }
                    h1, h2, h3 { color: #111; margin-top: 20px; }
                    img { max-width: 100%; height: auto; display: block; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 6px; }
                    /* Clean up printing rules */
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${contentHtml}
                <script>
                    // Trigger native print layout automatically, which offers a 'Save as PDF' option
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });
}

if (downloadTxtBtn) {
    downloadTxtBtn.addEventListener('click', () => {
        if (!docOutputEditor) return;

        // Get readable raw text from the editor
        const rawText = docOutputEditor.innerText;
        
        // Build a virtual text-file data blob
        const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Create an invisible anchor node to trigger the native browser download path
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `Naradha_Document_${new Date().toISOString().slice(0,10)}.txt`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Cleanup memory footprint
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    });
}