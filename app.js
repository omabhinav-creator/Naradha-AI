// =========================================================================
// 1. STATE CONFIGURATIONS & INTERFACE REGISTRY
// =========================================================================
let screenStream = null;
let miniModeActive = false;
let isRecording = false;
let lastUserLang = 'en-IN';
let userSelectedLanguage = localStorage.getItem('naradha_language') || 'en';
let bestFriendMode = localStorage.getItem('naradha_best_friend_mode') === 'true' || false;
let voiceResponsesEnabled = localStorage.getItem('naradha_voice_enabled') !== 'false';
let screenSyncActive = false;

// CLIENT-SIDE API KEYS
const GEMINI_KEY = "AQ.Ab8RN6LC3RD1Dr_0CYBgiBnnRS8_X4hMF5tJan5RZdsiFWBSQA";
const GROQ_KEY = "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"; 

const syncBtn = document.getElementById('sync-btn');
const captureBtn = document.getElementById('capture-btn'); // Repurposed for Floating Helper
const queryInput = document.getElementById('user-query');
const videoElement = document.getElementById('screen-video');
const placeholder = document.getElementById('placeholder-text');
const statusText = document.getElementById('status');
const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send-btn');
const aiResponseContainer = document.getElementById('ai-response');
const toggleMiniBtn = document.getElementById('toggle-mini-btn');
const appViewport = document.getElementById('app-viewport');
const launchTabBtn = document.getElementById('launch-tab-btn');

// View Layout Selectors
const navChat = document.getElementById('nav-chat');
const navDocs = document.getElementById('nav-docs');
const navMedia = document.getElementById('nav-media');
const navTeam = document.getElementById('nav-team');
const navSettings = document.getElementById('nav-settings');

const dashboardHeader = document.getElementById('dashboard-header');
const dashboardView = document.getElementById('dashboard-view');
const docsView = document.getElementById('docs-view');
const mediaView = document.getElementById('media-view');
const teamView = document.getElementById('team-view');
const settingsPanel = document.getElementById('settings-panel');
const chatInputSection = document.querySelector('.chat-input');

// ===== Simple Login Modal Handling =====
const loginModal = document.getElementById('login-modal');
const googleLoginBtn = document.getElementById('google-login-btn');
const guestLoginBtn = document.getElementById('login-guest-btn');

// =========================================================================
// USERNAME & ACCOUNT STATE MANAGEMENT
// =========================================================================
function setUser(user) {
    const userName = (user && user.name && String(user.name).trim()) ? String(user.name).trim() : 'Guest';
    const userLang = (user && user.language) ? user.language : 'en';

    const normalized = { 
        name: userName, 
        provider: user.provider || 'guest', 
        language: userLang 
    };

    localStorage.setItem('naradha_user', JSON.stringify(normalized));
    localStorage.setItem('naradha_language', normalized.language);
    userSelectedLanguage = normalized.language;

    hideLoginModal();
    updateUIUserName(userName);
}


function updateUIUserName(name) {
    // Finds the topbar <h1> even if id="user-greeting-title" is missing in index.html
    const greetingTitle = document.getElementById('user-greeting-title') || document.querySelector('#dashboard-header h1');
    const sidebarName = document.getElementById('sidebar-account-name');
    const accountName = document.getElementById('account-name');

    if (greetingTitle) greetingTitle.innerText = `Hello, ${name}`;
    if (sidebarName) sidebarName.innerText = name;
    if (accountName) accountName.innerText = name;
}
function populateSettingsAccount() {
    const raw = localStorage.getItem('naradha_user');
    if (!raw) {
        updateUIUserName('Guest');
        return;
    }
    try {
        const user = JSON.parse(raw);
        if (user && user.name) {
            updateUIUserName(user.name);
        } else {
            updateUIUserName('Guest');
        }
    } catch(e) {
        updateUIUserName('Guest');
    }
}

function showLoginModal() { if (loginModal) loginModal.style.display = 'flex'; }
function hideLoginModal() { if (loginModal) loginModal.style.display = 'none'; }

// Setup login buttons and initialization on page load
// This handles: checking for existing user, setting up login buttons, and initializing settings
document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('language-select');
    const existing = localStorage.getItem('naradha_user');
    const savedLanguage = localStorage.getItem('naradha_language') || 'en';
    userSelectedLanguage = savedLanguage;
    
    // Setup login buttons
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Get the selected language from dropdown
            const selectedLanguage = languageSelect ? languageSelect.value : 'en';
            // Simulate Google sign-in and ask for a display name from the user
            let displayName = null;
            while (true) {
                displayName = window.prompt('Enter a display name to use in Naradha AI (e.g., "Shashi Vardhan"):');
                if (displayName === null) {
                    // user cancelled
                    return;
                }
                displayName = String(displayName).trim();
                if (displayName.length === 0) {
                    alert('Display name is required. Please enter a name or cancel.');
                    continue;
                }
                break;
            }
            setUser({ name: displayName, provider: 'google', email: '', language: selectedLanguage });
        });
    }
    
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLanguage = languageSelect ? languageSelect.value : 'en';
            setUser({ name: 'Guest', provider: 'guest', email: '', language: selectedLanguage });
        });
    }
    
    // Check for existing user
    if (existing) {
        try {
            const parsed = JSON.parse(existing);
            const titleEl = document.querySelector('#dashboard-header h1');
            if (titleEl) titleEl.innerText = `Hello, ${parsed.name}`;
            hideLoginModal();
        } catch (e) {
            // fallback
            const titleEl = document.querySelector('#dashboard-header h1');
            if (titleEl) titleEl.innerText = `Hello, ${existing}`;
            hideLoginModal();
        }
    } else {
        showLoginModal();
    }
    populateSettingsAccount();
    initializeSettingsPanel();
});

// Populate settings panel with account info and wire logout
function populateSettingsAccount() {
    const raw = localStorage.getItem('naradha_user');
    const nameEl = document.getElementById('account-name');
    const provEl = document.getElementById('account-provider');
    const sidebarNameEl = document.getElementById('sidebar-account-name');
    const logoutBtnEl = document.getElementById('logout-btn');
    if (!raw) {
        if (nameEl) nameEl.innerText = 'Not signed in';
        if (provEl) provEl.innerText = '';
        if (logoutBtnEl) logoutBtnEl.style.display = 'none';
        if (sidebarNameEl) sidebarNameEl.innerText = 'Guest';
        return;
    }
    try {
        const user = JSON.parse(raw);
        if (nameEl) nameEl.innerText = user.name || 'Guest';
        if (provEl) provEl.innerText = user.provider ? `via ${user.provider}` : '';
        if (sidebarNameEl) sidebarNameEl.innerText = user.name || 'Guest';
        if (logoutBtnEl) {
            logoutBtnEl.style.display = 'inline-block';
            logoutBtnEl.onclick = () => {
                localStorage.removeItem('naradha_user');
                if (nameEl) nameEl.innerText = 'Not signed in';
                if (provEl) provEl.innerText = '';
                showLoginModal();
            };
        }
    } catch (e) {
        if (nameEl) nameEl.innerText = raw;
        if (provEl) provEl.innerText = '';
        if (sidebarNameEl) sidebarNameEl.innerText = raw;
    }
}

function switchView(viewName) {
    dashboardHeader.style.display = 'none';
    dashboardView.style.display = 'none';
    docsView.style.display = 'none';
    mediaView.style.display = 'none';
    teamView.style.display = 'none';
    settingsPanel.style.display = 'none';
    chatInputSection.style.display = 'none';
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    if (viewName === 'chat') {
        dashboardHeader.style.display = 'flex';
        dashboardView.style.display = 'block';
        chatInputSection.style.display = 'flex';
        if(navChat) navChat.classList.add('active');
    } else if (viewName === 'docs') {
        docsView.style.display = 'block';
        if(navDocs) navDocs.classList.add('active');
    } else if (viewName === 'media') {
        mediaView.style.display = 'block';
        if(navMedia) navMedia.classList.add('active');
    } else if (viewName === 'team') {
        teamView.style.display = 'block';
        if(navTeam) navTeam.classList.add('active');
    } else if (viewName === 'settings') {
        settingsPanel.style.display = 'block';
        if(navSettings) navSettings.classList.add('active');
    }
}

if(navChat) navChat.addEventListener('click', () => switchView('chat'));
if(navDocs) navDocs.addEventListener('click', () => switchView('docs'));
if(navMedia) navMedia.addEventListener('click', () => switchView('media'));
if(navTeam) navTeam.addEventListener('click', () => switchView('team'));
if(navSettings) navSettings.addEventListener('click', () => switchView('settings'));

// =========================================================================
// INITIALIZE SETTINGS PANEL (Language, Best Friend Mode, Voice)
// =========================================================================
function initializeSettingsPanel() {
    const settingsLanguageSelect = document.getElementById('settings-language-select');
    const bestFriendToggle = document.getElementById('best-friend-mode-toggle');
    const voiceToggle = document.getElementById('voice-responses-toggle');

    if (settingsLanguageSelect) {
        settingsLanguageSelect.value = userSelectedLanguage;
        settingsLanguageSelect.addEventListener('change', (e) => {
            userSelectedLanguage = e.target.value;
            localStorage.setItem('naradha_language', userSelectedLanguage);
        });
    }

    if (bestFriendToggle) {
        bestFriendToggle.checked = bestFriendMode;
        bestFriendToggle.addEventListener('change', (e) => {
            bestFriendMode = e.target.checked;
            localStorage.setItem('naradha_best_friend_mode', bestFriendMode);
        });
    }

    if (voiceToggle) {
        voiceToggle.checked = voiceResponsesEnabled;
        voiceToggle.addEventListener('change', (e) => {
            voiceResponsesEnabled = e.target.checked;
            localStorage.setItem('naradha_voice_enabled', voiceResponsesEnabled);
        });
    }
}

// BREAKOUT LAUNCH WINDOW
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
// 2. MINI MODE INTERFACE COMPRESSION
// =========================================================================
if (toggleMiniBtn) {
    toggleMiniBtn.addEventListener('click', () => {
        miniModeActive = !miniModeActive;
        const chatGrid = document.getElementById('main-chat-grid');
        const sidePanel = document.getElementById('screen-analysis-panel');
        const sidebarText = document.querySelectorAll('.sidebar-text');
        const sidebar = document.getElementById('app-sidebar');
        const cosmicHero = document.getElementById('cosmic-hero-screen');

        if (miniModeActive) {
            if(chatGrid) chatGrid.style.gridTemplateColumns = "1fr"; 
            if(sidePanel) sidePanel.style.display = "none"; 
            if (cosmicHero) cosmicHero.style.display = "none"; 
            if(sidebar) sidebar.style.width = "60px"; 
            sidebarText.forEach(t => t.style.display = "none");
            toggleMiniBtn.querySelector('span').innerText = "";
            statusText.innerText = "Mini Assistant View Active";
        } else {
            if(chatGrid) chatGrid.style.gridTemplateColumns = "1fr 1fr";
            if(sidePanel) sidePanel.style.display = "block";
            if (cosmicHero) cosmicHero.style.display = "block";
            if(sidebar) sidebar.style.width = "260px";
            sidebarText.forEach(t => t.style.display = "inline");
            toggleMiniBtn.querySelector('span').innerText = "Mini Chat Mode";
            statusText.innerText = "Ready";
        }
    });
}

// =========================================================================
// 3. DISPLAY SYNC STREAM CAPTURE SYSTEM
// =========================================================================
if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
        try {
            const screenSyncView = document.getElementById('screen-sync-view');
            const mainChatGrid = document.getElementById('main-chat-grid');
            
            if (!screenSyncActive) {
                statusText.innerText = "Syncing display frame layer...";
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                if (videoElement) {
                    videoElement.srcObject = screenStream;
                    videoElement.style.display = 'block';
                }
                if(placeholder) placeholder.style.display = 'none';
                statusText.innerText = "Context Online!";
                if(captureBtn) captureBtn.disabled = false;
                syncBtn.disabled = false;
                syncBtn.style.opacity = "0.5";
                
                // Show screen sync view, hide main chat grid
                if (screenSyncView) screenSyncView.style.display = 'grid';
                if (mainChatGrid) mainChatGrid.style.display = 'none';
                screenSyncActive = true;
            } else {
                // Stop screen sharing
                if (screenStream) {
                    screenStream.getTracks().forEach(track => track.stop());
                    screenStream = null;
                }
                if (videoElement) {
                    videoElement.srcObject = null;
                    videoElement.style.display = 'none';
                }
                if(placeholder) placeholder.style.display = 'block';
                statusText.innerText = "Ready";
                syncBtn.disabled = false;
                syncBtn.style.opacity = "1";
                
                // Show main chat grid, hide screen sync view
                if (screenSyncView) screenSyncView.style.display = 'none';
                if (mainChatGrid) mainChatGrid.style.display = 'grid';
                screenSyncActive = false;
            }
        } catch (e) {
            statusText.innerText = "Stream sync rejected.";
        }
    });
}

// =========================================================================
// 4. MULTILINGUAL PROFANITY FILTER
// =========================================================================
const profanityFilter = {
    telugu: ['lanje', 'lanja', 'dengu', 'dengutha', 'puku', 'puuuku', 'sulli', 'gudda', 'gullodu', 'dimmak'],
    hindi: ['bulli', 'badakow', 'gandmasti', 'besharam', 'harami', 'besharami', 'chutiya'],
    english: ['fuck', 'shit', 'damn', 'crap', 'hell', 'ass', 'bitch', 'bastard'],
};

function filterProfanity(text) {
    let filtered = text;
    
    // Filter Telugu profanity
    profanityFilter.telugu.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filtered = filtered.replace(regex, '***');
    });
    
    // Filter Hindi profanity
    profanityFilter.hindi.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filtered = filtered.replace(regex, '***');
    });
    
    // Filter English profanity
    profanityFilter.english.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filtered = filtered.replace(regex, '***');
    });
    
    return filtered;
}

// =========================================================================
// 5. CODE & MATH FORMATTING HELPER
// =========================================================================
function formatCodeAndMath(text) {
    // Handle mathematical symbols (e.g., 2 power 5 -> 2^5)
    text = text.replace(/(\d+)\s+power\s+(\d+)/gi, '$1^$2');
    text = text.replace(/(\d+)\s+squared/gi, '$1²');
    text = text.replace(/(\d+)\s+cubed/gi, '$1³');
    
    // Format code blocks with proper indentation
    text = text.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const lines = code.trim().split('\n');
        const formatted = lines.map(line => `<span class="code-line">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join('<br>');
        return `<div class="code-block" style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; border-left: 3px solid #2563eb; font-family: 'Courier New', monospace; overflow-x: auto;">${formatted}</div>`;
    });
    
    return text;
}

// =========================================================================
// 5. ON-DEMAND SCREEN RECOGNITION INFRASTRUCTURE (MAIN CHAT)
// =========================================================================
if(sendBtn) sendBtn.addEventListener('click', () => executeTextPipeline());
if(queryInput) queryInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); executeTextPipeline(); } });

function executeTextPipeline() {
    const textVal = queryInput.value.trim();
    if (!textVal) return;

    // Detect user input script to pick TTS language preference
    if (/\p{Script=Devanagari}/u.test(textVal)) {
        lastUserLang = 'hi-IN';
    } else if (/[\u0C00-\u0C7F]/.test(textVal)) {
        lastUserLang = 'te-IN';
    } else {
        lastUserLang = 'en-IN';
    }
    queryInput.value = "";

    // RESET BUTTON BACK TO MIC AFTER SENDING
    if (micBtn && sendBtn) {
        micBtn.style.setProperty('display', 'flex', 'important');
        sendBtn.style.setProperty('display', 'none', 'important');
    }

    // Determine which container to use
    const responseContainer = screenSyncActive ? document.getElementById('ai-response') : document.getElementById('ai-response-chat');
    const statusElement = screenSyncActive ? document.getElementById('status') : document.getElementById('status-chat');
    
    if (statusElement) statusElement.innerText = "Snapping active workspace frame...";
    let b64FrameStr = "";

    if (screenStream && videoElement && videoElement.videoWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        canvas.getContext("2d").drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        b64FrameStr = canvas.toDataURL("image/jpeg", 0.3).split(",")[1];
    }

    if (responseContainer) {
        responseContainer.innerHTML += `
            <div class="chat-msg-row">
                <div class="user-bubble"><strong>You:</strong> ${textVal}</div>
            </div>`;
        responseContainer.scrollTop = responseContainer.scrollHeight;
    }
    queryInput.value = "";

    dispatchCoreAIQuery(b64FrameStr, textVal, responseContainer, statusElement);
}

function getLanguageName(langCode) {
    const languages = {
        'en': 'English',
        'te': 'pure Telugu script (తెలుగు లిపి)',
        'te-roman': 'Telglish (Telugu words using ONLY English/Roman letters)',
        'hi': 'pure Hindi script (हिन्दी)',
        'hi-roman': 'Hinglish (Hindi words using ONLY English/Roman letters)'
    };
    return languages[langCode] || 'English';
}

async function dispatchCoreAIQuery(b64Image, query, container, statusElement) {
    if (statusElement) statusElement.innerText = "Naradha is typing...";

    const targetLanguage = getLanguageName(userSelectedLanguage);

    let identityPrompt = `
You are Naradha AI, an intelligent workspace companion created and founded by Om Abhinav, Shashi Vardhan, and Balaji.

IDENTITY & FOUNDER RULES:
1. If anyone asks "Who created you?", "Who built you?", "Who are your founders?", or "Who made you?", you MUST explicitly answer that you were created and built by Om Abhinav, Shashi Vardhan, and Balaji.
2. Never mention OpenAI, Google, Meta, Anthropic, or ChatGPT as your creator. You are Naradha AI, developed by Team AI-SAGA by Om Abhinav, Shashi Vardhan, and Balaji.

CRITICAL LANGUAGE SCRIPT RULE:
- Primary language mode: ${targetLanguage}
${userSelectedLanguage === 'te-roman' ? 'CRITICAL: You MUST write Telugu words using ONLY English/Roman alphabet letters (Telglish). NEVER use Telugu characters (తెలుగు లిపి) under any circumstances! Example: "Namasthay Om Abhinav! Ela unnavu?"' : ''}
${userSelectedLanguage === 'hi-roman' ? 'CRITICAL: You MUST write Hindi words using ONLY English/Roman alphabet letters (Hinglish). NEVER use Devanagari script (हिन्दी) under any circumstances! Example: "Namaste! Aap kaise ho?"' : ''}
${userSelectedLanguage === 'te' ? 'CRITICAL: You MUST write strictly in pure Telugu script (తెలుగు లిపి).' : ''}
${userSelectedLanguage === 'hi' ? 'CRITICAL: You MUST write strictly in pure Hindi script (हिन्दी).' : ''}

STRICT BREVITY & RESPONSE RULES:
1. Keep replies SHORT, SIMPLE, and DIRECT.
2. If user asks for code, provide ONLY ONE minimal, clean code block. Do NOT generate multiple projects, long explanations, or unnecessary extra examples unless asked.

SPECIAL FEATURE - BHAGAVAD GITA MOTIVATION:
- If the user mentions "motivate", "motivation", or shares a stressful/difficult situation asking for advice:
  1. Share one highly relevant Bhagavad Gita Sloka (Sanskrit with Roman transliteration).
  2. Explain its meaning briefly in ${targetLanguage}.
  3. Offer a short, practical word of encouragement based on the sloka.

PERSONALITY MODE:
${bestFriendMode ? "MODE: BEST FRIEND. Talk like a supportive best friend with casual warmth, encouragement, and light humor." : "MODE: ASSISTANT. Be concise, direct, and professional."}

ABSOLUTELY NO PROFANITY:
- NEVER use any offensive, vulgar, or inappropriate language in any language.
- Replace any accidentally generated bad words with ***.`;

    if (b64Image) {
        let payload = { 
            contents: [{ 
                parts: [
                    { text: `${identityPrompt}\n\nAnalyze this active window workspace frame context and answer the user question: ${query}` }, 
                    { image: { mimeType: "image/jpeg", data: b64Image } }
                ] 
            }] 
        };
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
            const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            renderResponse(data.candidates[0].content.parts[0].text, container, statusElement);
        } catch (e) {
            dispatchGroqFallback(query, container, identityPrompt, statusElement);
        }
    } else {
        dispatchGroqFallback(query, container, identityPrompt, statusElement);
    }
}
async function dispatchGroqFallback(query, container, identityPrompt, statusElement) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", 
                messages: [{ role: "system", content: identityPrompt }, { role: "user", content: query }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        renderResponse(data.choices[0].message.content, container, statusElement);
    } catch(err) {
        try {
            const res = await fetch("https://text.pollinations.ai/", { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ messages: [{ role: "system", content: identityPrompt }, { role: "user", content: query }] }) 
            });
            const text = await res.text();
            renderResponse(text, container, statusElement);
        } catch(finalErr) {
            renderResponse("Network error encountered. Please try again.", container, statusElement);
        }
    }
}

function renderResponse(aiReply, container, statusElement) {
    // Filter profanity from AI response
    let filteredReply = filterProfanity(aiReply);
    
    // Format code blocks and mathematical expressions
    let formattedReply = formatCodeAndMath(filteredReply);
    
    if (container) {
        container.innerHTML += `
            <div class="chat-msg-row">
                <div class="ai-bubble">
                    <strong>Naradha AI:</strong><br>${formattedReply.replace(/\n/g, '<br>')}
                </div>
            </div>`;
        container.scrollTop = container.scrollHeight;
    }
    
    if (statusElement) statusElement.innerText = "Done!";
    
    // Only speak if voice responses are enabled
    if (voiceResponsesEnabled) {
        executeNativeTTS(filteredReply);
    }
}

// =========================================================================
// 5.5 SPEECH RECOGNITION (MICROPHONE INPUT)
// =========================================================================
if (micBtn) {
    let recognition = null;
    micBtn.addEventListener('click', () => {
        if (!('webkitSpeechRecognition' in window)) return;
        
        if (isRecording) {
            recognition.stop();
            return;
        }

        recognition = new webkitSpeechRecognition();
        
        // Set recognition language based on user selection
        let speechLang = 'en-IN';
        switch(userSelectedLanguage) {
            case 'te':
                speechLang = 'te-IN';
                break;
            case 'te-roman':
                speechLang = 'en-IN'; // Romanized Telugu uses English recognition
                break;
            case 'hi':
                speechLang = 'hi-IN';
                break;
            case 'hi-roman':
                speechLang = 'en-IN'; // Romanized Hindi uses English recognition
                break;
            default:
                speechLang = 'en-IN';
        }
        
        recognition.lang = speechLang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => { 
            isRecording = true; 
            const statusEl = screenSyncActive ? document.getElementById('status') : document.getElementById('status-chat');
            if (statusEl) statusEl.innerText = "Listening..."; 
            micBtn.innerText = "🛑"; 
        };
        
        recognition.onresult = (e) => {
            let interimTranscript = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    queryInput.value = e.results[i][0].transcript;
                } else {
                    interimTranscript += e.results[i][0].transcript;
                }
            }
            if(interimTranscript || queryInput.value) {
                queryInput.value = interimTranscript || queryInput.value;
            }
        };

        recognition.onend = () => { 
            isRecording = false; 
            micBtn.innerText = "🎤"; 
            executeTextPipeline(); 
        };
        
        recognition.onerror = (e) => {
            isRecording = false;
            micBtn.innerText = "🎤";
            const statusEl = screenSyncActive ? document.getElementById('status') : document.getElementById('status-chat');
            if (statusEl) statusEl.innerText = "Speech recognition error";
        };
        
        recognition.start();
    });
}

function stopAllSpeech() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume(); // Unlocks browser speech queue
    }
}

function executeNativeTTS(text) {
    if (!voiceResponsesEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.resume();
    window.speechSynthesis.cancel(); // Clear queue

    // Clean text: Strip code blocks, emojis, and symbols so TTS reads clean prose
    let cleanText = text
        .replace(/```[\s\S]*?```/g, ' Code example provided on screen. ') // Skip code execution
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[#*_\-:`]/g, ' ')
        .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Map language phonetics
    let targetLangCode = 'en-IN';
    if (userSelectedLanguage === 'te' || userSelectedLanguage === 'te-roman') {
        targetLangCode = 'te-IN';
    } else if (userSelectedLanguage === 'hi' || userSelectedLanguage === 'hi-roman') {
        targetLangCode = 'hi-IN';
    }

    utterance.lang = targetLangCode;
    utterance.rate = 0.95;

    // Set native voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        const matched = voices.find(v => v.lang.includes(targetLangCode) || v.lang.startsWith(targetLangCode.split('-')[0]));
        if (matched) utterance.voice = matched;
    }

    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 50);
}
// =========================================================================
// 6. FILE UPLOAD HANDLING (PDF & Images)
// =========================================================================
let uploadedFileData = null;

const fileUploadBtn = document.getElementById('file-upload-btn');
const fileInput = document.getElementById('file-input');

if (fileUploadBtn && fileInput) {
    fileUploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        
        if (!isImage && !isPdf) {
            alert('Please select a valid PDF or image file');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            uploadedFileData = {
                name: file.name,
                type: file.type,
                data: event.target.result
            };
            
            // Auto-append file name to query for context
            const fileName = file.name.split('.')[0];
            queryInput.value = `Analyze and explain the content of: ${fileName}`;
            queryInput.focus();
        };
        
        reader.readAsDataURL(file);
    });
}
    
// =========================================================================
// 7. IMAGE GENERATION
// =========================================================================
// =========================================================================
// 7. IMAGE GENERATION (UPDATED WITH ISOLATED SUBJECT PROMPTING)
// =========================================================================
const imgPromptInput = document.getElementById('image-prompt-input');
const generateImgBtn = document.getElementById('generate-image-btn');
const imgOutputContainer = document.getElementById('image-output-container');

// Blocklist of inappropriate keywords
const nsfwBlocklist = [
    'nude', 'naked', 'nsfw', 'porn', 'sex', 'boobs', 'breast', 'vagina', 'penis', 
    'undressed', 'erotic', 'topless', 'bikini', 'bikinis', 'strip', 'lingerie', 'explicit'
];

if (generateImgBtn) {
    generateImgBtn.addEventListener('click', () => {
        const textPrompt = imgPromptInput.value.trim();
        if (!textPrompt) return;

        // Moderate prompt for bad/sexual content
        const containsNSFW = nsfwBlocklist.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(textPrompt.toLowerCase());
        });

        if (containsNSFW) {
            imgOutputContainer.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500;">
                    ⚠️ Request Blocked: The image prompt contains inappropriate or explicit content.
                </div>`;
            return;
        }

        imgOutputContainer.innerHTML = `<span style="color:#3b82f6;">Rendering clean canvas layer asset...</span>`;

        // NEW METHOD: Added "single subject" modifier to stop generating extra figures/children
        const cleanPrompt = encodeURIComponent(`${textPrompt.toLowerCase()}, single subject, cinematic lighting, sharp focus, highly detailed, 8k resolution`);
        const randomSeed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&model=flux&seed=${randomSeed}&nologo=true`;

        imgOutputContainer.innerHTML = `
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid #333; display:inline-block; text-align:center;">
                <img src="${imageUrl}" style="width:100%; max-width:400px; border-radius:8px; border:1px solid #2563eb;" alt="Generated Asset" />
                <br><a href="${imageUrl}" target="_blank" download="Naradha_AI_Asset.jpg" style="display:inline-block; margin-top:10px; background:#22c55e; color:#fff; text-decoration:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">📥 Download Rendered Image</a>
            </div>`;
    });
}
/*const imgPromptInput = document.getElementById('image-prompt-input');
const generateImgBtn = document.getElementById('generate-image-btn');
const imgOutputContainer = document.getElementById('image-output-container');

// Blocklist of inappropriate keywords
const nsfwBlocklist = [
    'nude', 'naked', 'nsfw', 'porn', 'sex', 'boobs', 'breast', 'vagina', 'penis', 
    'undressed', 'erotic', 'topless', 'bikini', 'bikinis', 'strip', 'lingerie', 'explicit'
];

if (generateImgBtn) {
    generateImgBtn.addEventListener('click', () => {
        const textPrompt = imgPromptInput.value.trim().toLowerCase();
        if (!textPrompt) return;

        // Check if prompt contains any blocked term
        const containsNSFW = nsfwBlocklist.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(textPrompt);
        });

        if (containsNSFW) {
            imgOutputContainer.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500;">
                    ⚠️ Request Blocked: The image prompt contains inappropriate or explicit content. Naradha AI maintains strict safety guidelines.
                </div>`;
            return;
        }

        imgOutputContainer.innerHTML = `<span style="color:#3b82f6;">Rendering safe canvas layer asset...</span>`;
        
        // Append safety tags to the prompt URL
        const safePrompt = encodeURIComponent(textPrompt + ", family friendly, clean, appropriate");
        const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=1024&nologo=true`;

        imgOutputContainer.innerHTML = `
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid #333; display:inline-block; text-align:center;">
                <img src="${imageUrl}" style="width:100%; max-width:400px; border-radius:8px; border:1px solid #2563eb;" alt="Generated Asset" />
                <br><a href="${imageUrl}" target="_blank" download="Naradha_AI_Asset.jpg" style="display:inline-block; margin-top:10px; background:#22c55e; color:#fff; text-decoration:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">📥 Download Rendered Image</a>
            </div>`;
    });
}*/

// =========================================================================
// 7. DOCUMENT CREATION & EXPORT
// =========================================================================
// =========================================================================
// 7. DOCUMENT CREATION & EXPORT
// =========================================================================
const generateDocBtn = document.getElementById('generate-doc-btn');
const docInstructions = document.getElementById('doc-instructions');
const docOutputEditor = document.getElementById('doc-output-editor');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const copyDocBtn = document.getElementById('copy-doc-btn');
const downloadTxtBtn = document.getElementById('download-txt-btn');

if (generateDocBtn) {
    generateDocBtn.onclick = async () => {
        const userNotes = docInstructions.value.trim();
        if (!userNotes) return;
        docOutputEditor.innerHTML = "Compiling technical sandbox templates...";
        
        const contentPrompt = `You are an expert technical documentation draft writer. Write a comprehensive, extremely detailed, structured document profile layout about the exact topic: "${userNotes}". Group everything into clean semantic HTML sections with visible sub-headings (<h3>) and structured bullet formatting parameters. Return only raw web HTML layout code strings without backticks or markdown wrappers.`;

        try {
            // FIXED: Using Groq API instead of Pollinations to prevent 402 Payment Required errors
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${GROQ_KEY}`, 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: contentPrompt }]
                })
            });
            const data = await res.json();
            const outText = data.choices[0].message.content;
            docOutputEditor.innerHTML = outText.replace(/```html/gi, "").replace(/```/g, "");
        } catch (e) {
            docOutputEditor.innerHTML = `<h3>Generated Layout Profile</h3><p>${userNotes}</p>`;
        }
    };
}
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        iframe.contentWindow.document.write(`
            <html>
            <head>
                <title>Export Document</title>
                <style>
                    body { background-color: #0f101a !important; color: #ffffff !important; font-family:sans-serif; padding:40px; line-height:1.6; }
                    h1, h2, h3, h4 { color: #3b82f6 !important; }
                    hr { border-color: #222; }
                </style>
            </head>
            <body>
                ${docOutputEditor.innerHTML}
            </body>
            </html>
        `);
        iframe.contentWindow.document.close();
        
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
        }, 500);
    });
}

if (copyDocBtn) {
    copyDocBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(docOutputEditor.innerText || docOutputEditor.textContent);
        copyDocBtn.innerText = "✓ Copied!";
        setTimeout(() => { copyDocBtn.innerText = "📋 Copy Text"; }, 2000);
    });
}

if (downloadTxtBtn) {
    downloadTxtBtn.addEventListener('click', () => {
        const fileBlob = new Blob([docOutputEditor.innerText || docOutputEditor.textContent], { type: 'text/plain;charset=utf-8' });
        const textUrl = URL.createObjectURL(fileBlob);
        const anchorNode = document.createElement('a');
        anchorNode.href = textUrl;
        anchorNode.download = `Naradha_Document_Export.txt`;
        document.body.appendChild(anchorNode);
        anchorNode.click();
        document.body.removeChild(anchorNode);
        URL.revokeObjectURL(textUrl);
    });
}

// =========================================================================
// 8. TEAM CHAT ENGINE
// =========================================================================
const teamInput = document.getElementById('team-input');
const teamSendBtn = document.getElementById('team-send-btn');
const teamLog = document.getElementById('team-log');

if (teamSendBtn) {
    teamSendBtn.onclick = () => processGroupChatEngine();
}
if (teamInput) {
    teamInput.onkeydown = (e) => { 
        if (e.key === 'Enter') { 
            e.preventDefault(); 
            processGroupChatEngine(); 
        } 
    };
}

async function processGroupChatEngine() {
    const rawVal = teamInput.value.trim();
    if (!rawVal) return;

    let groupRegistry = localStorage.getItem('groupProfilesArray') || "Shashi Vardhan";
    let currentSender = groupRegistry.split(",")[0].trim();

    teamLog.innerHTML += `<div><strong style="color: #f59e0b;">${currentSender}:</strong> ${rawVal}</div>`;
    teamInput.value = "";
    teamLog.scrollTop = teamLog.scrollHeight;

    const rowId = "group-bot-" + Date.now();
    teamLog.innerHTML += `<div id="${rowId}"><strong style="color: #60a5fa;">Naradha Workspace Bot:</strong> <span style="color:#666; font-style:italic;">Processing response...</span></div>`;
    teamLog.scrollTop = teamLog.scrollHeight;

    try {
        const url = `https://api.groq.com/openai/v1/chat/completions`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: "You are Naradha AI, a workspace collaboration assistant. Provide a highly direct technical engineering fix to this team blocker in two clear sentences." },
                    { role: "user", content: rawVal }
                ]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const replyText = data.choices[0].message.content;

        document.getElementById(rowId).innerHTML = `<div><strong style="color: #60a5fa;">Naradha Workspace Bot:</strong> ${replyText.replace(/\n/g, '<br>')}</div>`;
        teamLog.scrollTop = teamLog.scrollHeight;
    } catch (e) {
        if(document.getElementById(rowId)) document.getElementById(rowId).remove();
    }
}

// =========================================================================
// 9. SETTINGS & EMOJIS
// =========================================================================
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsEmail = document.getElementById('settings-email');
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        localStorage.setItem('groupProfilesArray', settingsEmail.value);
        const statusEl = document.getElementById('settings-status');
        if(statusEl) statusEl.innerText = "✓ Group Sessions Sync Lock Applied!";
    });
}


function toggleEmojiDropdown() {
    const panel = document.getElementById('emoji-dropdown-panel');
    if (panel) panel.classList.toggle('active');
}

function insertEmoji(emojiChar) {
    const inputEl = document.getElementById('user-query');
    if (inputEl) {
        inputEl.value += emojiChar;
        inputEl.focus();
    }
    toggleEmojiDropdown(); 
}

document.addEventListener('click', (event) => {
    const panel = document.getElementById('emoji-dropdown-panel');
    const emojiBtn = document.getElementById('emoji-btn');
    if (panel && panel.classList.contains('active')) {
        if (!panel.contains(event.target) && event.target !== emojiBtn) {
            panel.classList.remove('active');
        }
    }
});

// =========================================================================
// 10. NEW FLOATING SCREEN HELPER (MINI CHAT BOX)
// =========================================================================
let overlayBox = null;
let overlayDragging = false;
let overlayDragOffsetX = 0;
let overlayDragOffsetY = 0;

function createFloatingChatOverlay() {
    if (document.getElementById('naradha-floating-box')) return;
    
    const overlayHTML = `
    <div id="naradha-floating-box" style="position: fixed; bottom: 80px; right: 20px; width: 340px; height: 430px; background: #13141f; border: 2px solid #2563eb; border-radius: 14px; z-index: 2147483647; display: none; flex-direction: column; box-shadow: 0 18px 50px rgba(0,0,0,0.55); font-family: 'Poppins', sans-serif; overflow: hidden;">
        <div id="overlay-header" style="background: #0f172a; padding: 12px 14px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: move;">
            <span style="font-weight: 600; color: #fff; font-size: 14px;">💬 Naradha Mini Helper</span>
            <button id="close-overlay-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px; font-weight: bold;">✖</button>
        </div>
        <div id="overlay-chat-log" style="flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; background: rgba(15,23,42,0.96);">
            <div style="color:#94a3b8; font-size:12px;">Type your issue and press Enter to capture the screen behind this overlay.</div>
        </div>
        <div style="padding: 12px; border-top: 1px solid #334155; display: flex; gap: 8px; background: #0c1231;">
            <input type="text" id="overlay-input" placeholder="Describe the problem..." style="flex: 1; padding: 10px; background: #111827; border: 1px solid #334155; color: white; border-radius: 10px; outline: none; font-size: 13px;">
            <button id="overlay-send-btn" style="background: #2563eb; color: white; border: none; padding: 10px 14px; border-radius: 10px; cursor: pointer; font-weight: 600;">Send</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', overlayHTML);

    overlayBox = document.getElementById('naradha-floating-box');
    const closeBtn = document.getElementById('close-overlay-btn');
    const sendBtn = document.getElementById('overlay-send-btn');
    const inputEl = document.getElementById('overlay-input');
    const header = document.getElementById('overlay-header');

    closeBtn.onclick = () => overlayBox.style.display = 'none';
    sendBtn.onclick = () => dispatchOverlayQuery();
    inputEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); dispatchOverlayQuery(); } };

    header.addEventListener('mousedown', (e) => {
        overlayDragging = true;
        overlayDragOffsetX = e.clientX - overlayBox.offsetLeft;
        overlayDragOffsetY = e.clientY - overlayBox.offsetTop;
        overlayBox.style.right = 'auto';
        overlayBox.style.bottom = 'auto';
        overlayBox.style.top = `${overlayBox.offsetTop}px`;
        overlayBox.style.left = `${overlayBox.offsetLeft}px`;
    });

    document.addEventListener('mousemove', (e) => {
        if (!overlayDragging) return;
        overlayBox.style.left = `${e.clientX - overlayDragOffsetX}px`;
        overlayBox.style.top = `${e.clientY - overlayDragOffsetY}px`;
    });

    document.addEventListener('mouseup', () => { overlayDragging = false; });
}
createFloatingChatOverlay();

function toggleFloatingOverlay() {
    if (!overlayBox) createFloatingChatOverlay();
    overlayBox = document.getElementById('naradha-floating-box');
    if (!overlayBox) return;
    const opening = overlayBox.style.display !== 'flex';
    overlayBox.style.display = opening ? 'flex' : 'none';
    if (statusText) {
        statusText.innerText = opening ? 'Floating Helper opened' : 'Floating Helper closed';
    }
}

function openFloatingHelperOnActiveTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || tab.id == null) {
                toggleFloatingOverlay();
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' }, () => {
                if (!chrome.runtime.lastError) return;

                console.warn('Active tab overlay listener missing, injecting content script:', chrome.runtime.lastError.message);
                chrome.scripting.executeScript(
                    { target: { tabId: tab.id }, files: ['content.js'] },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.warn('Injection failed on active tab:', chrome.runtime.lastError.message);
                            return;
                        }
                        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' }, () => {
                            if (chrome.runtime.lastError) {
                                console.warn('Retry send failed on active tab:', chrome.runtime.lastError.message);
                            }
                        });
                    }
                );
            });
        });
    } else {
        toggleFloatingOverlay();
    }
}

// =========================================================================
// 10. NEW FLOATING SCREEN HELPER (MINI CHAT BOX TOGGLE)
// =========================================================================
if (captureBtn) {
    captureBtn.innerHTML = `💬 <span class="sidebar-text">Floating Helper</span>`;
    captureBtn.disabled = false;
    
    const newBtn = captureBtn.cloneNode(true);
    captureBtn.parentNode.replaceChild(newBtn, captureBtn);
    
    newBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'OPEN_FLOATING_HELPER' }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('OPEN_FLOATING_HELPER failed:', chrome.runtime.lastError.message);
                    toggleFloatingOverlay();
                }
            });
        } else {
            toggleFloatingOverlay();
        }
    });
}

async function dispatchOverlayQuery() {
    const inputEl = document.getElementById('overlay-input');
    const logEl = document.getElementById('overlay-chat-log');
    const text = inputEl.value.trim();
    if (!text) return;

    let b64FrameStr = '';
    if (!screenStream || !videoElement || videoElement.readyState < 2) {
        try {
            statusText.innerText = 'Requesting screen capture for problem analysis...';
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            if (videoElement) {
                videoElement.srcObject = screenStream;
                videoElement.style.display = 'none';
            }
        } catch (err) {
            logEl.innerHTML += `<div style="align-self:flex-end; background:#7c3aed; padding:10px; border-radius:10px; color:#fff;">Screen capture permission is required to send the screenshot.</div>`;
            logEl.scrollTop = logEl.scrollHeight;
            return;
        }
    }

    if (videoElement && videoElement.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        b64FrameStr = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
    }

    logEl.innerHTML += `<div style="align-self: flex-end; background: #1e293b; padding: 10px; border-radius: 10px; max-width: 85%; color: white; margin-bottom: 6px;">${text}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
    inputEl.value = '';

    dispatchCoreAIQuery(b64FrameStr, text, logEl);
}

function logoutUser() {
    localStorage.removeItem('naradha_user');
    const titleEl = document.querySelector('#dashboard-header h1');
    if (titleEl) titleEl.innerText = `Hello, I'm Naradha AI`;
    populateSettingsAccount();
    showLoginModal();
}

// Wire stop-voice buttons if present
document.addEventListener('DOMContentLoaded', () => {
    // Stop voice button for screen sync view
    // Stop voice button for screen sync view
    const stopBtn = document.getElementById('stop-voice-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (window.currentAudio) {
                window.currentAudio.pause();
                window.currentAudio = null;
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.pause();
                window.speechSynthesis.cancel();
            }
            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.innerText = 'Voice stopped';
        });
    }

    // Stop voice button for chat view
    const stopBtnChat = document.getElementById('stop-voice-btn-chat');
    if (stopBtnChat) {
        stopBtnChat.addEventListener('click', () => {
            if (window.currentAudio) {
                window.currentAudio.pause();
                window.currentAudio = null;
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.pause();
                window.speechSynthesis.cancel();
            }
            const statusEl = document.getElementById('status-chat');
            if (statusEl) statusEl.innerText = 'Voice stopped';
        });
    }
    

    // Ensure logout button references logoutUser (in case populateSettings didn't attach)
    const logoutBtnEl = document.getElementById('logout-btn');
    if (logoutBtnEl) {
        logoutBtnEl.addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });
    }
    // Mobile menu wiring only on small screens
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileClose = document.getElementById('mobile-menu-close');
    const mobileFullscreenBtn = document.getElementById('mobile-fullscreen-btn');
    function toggleFullscreen() {
        const docEl = document.documentElement;
        if (!document.fullscreenElement) {
            const requestFullScreen = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
            if (requestFullScreen) requestFullScreen.call(docEl);
        } else {
            const exitFullScreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exitFullScreen) exitFullScreen.call(document);
        }
    }
    function initMobileMenu() {
        if (!mobileBtn || !mobileMenu) return;
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.add('open');
            mobileMenu.setAttribute('aria-hidden', 'false');
        });
        if (mobileClose) {
            mobileClose.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                mobileMenu.setAttribute('aria-hidden', 'true');
            });
        }
        if (mobileFullscreenBtn) {
            mobileFullscreenBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleFullscreen();
                if (mobileMenu) { mobileMenu.classList.remove('open'); mobileMenu.setAttribute('aria-hidden','true'); }
            });
        }
        document.querySelectorAll('.mobile-menu-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = btn.getAttribute('data-view');
                if (view) switchView(view);
                if (mobileMenu) { mobileMenu.classList.remove('open'); mobileMenu.setAttribute('aria-hidden','true'); }
            });
        });
    }

    function teardownMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.remove('open');
        mobileMenu.setAttribute('aria-hidden','true');
    }

    if (window.innerWidth <= 800) initMobileMenu(); else teardownMobileMenu();
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 800) initMobileMenu(); else teardownMobileMenu();
    });
});
// =========================================================================
// WHATSAPP-STYLE MIC / SEND BUTTON TOGGLE
// =========================================================================
// WHATSAPP-STYLE MIC / SEND BUTTON TOGGLE
if (queryInput && micBtn && sendBtn) {
    const updateButtonVisibility = () => {
        const hasText = queryInput.value.trim().length > 0;
        if (hasText) {
            micBtn.style.setProperty('display', 'none', 'important');
            sendBtn.style.setProperty('display', 'flex', 'important');
        } else {
            micBtn.style.setProperty('display', 'flex', 'important');
            sendBtn.style.setProperty('display', 'none', 'important');
        }
    };

    queryInput.addEventListener('input', updateButtonVisibility);
    
    // Run immediately on page load to hide send button by default
    updateButtonVisibility();
}