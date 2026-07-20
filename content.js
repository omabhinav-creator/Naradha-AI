const overlayHTML = `
<div id="naradha-overlay" style="position: fixed; bottom: 20px; right: 20px; width: 350px; background: #0f172a; color: white; border: 1px solid #333; border-radius: 12px; z-index: 2147483647; display: none; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: sans-serif;">
    <div style="background: #1e293b; padding: 10px; border-top-left-radius: 12px; border-top-right-radius: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333;">
        <span style="font-weight: bold;">Naradha AI Lens</span>
        <button id="naradha-close" style="background: none; border: none; color: white; cursor: pointer; font-size:16px;">✖</button>
    </div>
    <div id="naradha-chat-log" style="height: 200px; overflow-y: auto; padding: 10px; font-size: 13px;"></div>
    <div style="padding: 10px; border-top: 1px solid #333; display: flex;">
        <input type="text" id="naradha-input" placeholder="Type here..." style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #333; background: #1e293b; color: white; outline: none;">
        <button id="naradha-send" style="margin-left: 8px; background: #2563eb; border: none; color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer;">Send</button>
    </div>
</div>
`;

let overlay = null;
let closeBtn = null;
let sendBtn = null;
let inputField = null;
let chatLog = null;

function initOverlayElements() {
    overlay = document.getElementById('naradha-overlay');
    closeBtn = document.getElementById('naradha-close');
    sendBtn = document.getElementById('naradha-send');
    inputField = document.getElementById('naradha-input');
    chatLog = document.getElementById('naradha-chat-log');

    if (!overlay || !closeBtn || !sendBtn || !inputField || !chatLog) return;

    closeBtn.onclick = () => setOverlayVisibility(false);
    sendBtn.onclick = () => handleSendClick();

    chrome.storage.local.get({ overlayVisible: false }, (data) => {
        if (data.overlayVisible) {
            setOverlayVisibility(true);
        }
    });
}

function initOverlay() {
    if (document.getElementById('naradha-overlay')) {
        initOverlayElements();
        return;
    }
    if (!document.body) {
        document.addEventListener('DOMContentLoaded', initOverlay, { once: true });
        return;
    }
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
    initOverlayElements();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOverlay);
} else {
    initOverlay();
}

// Direct Client Key configuration to completely replace the broken Python server loop
const EXT_GEMINI_KEY = "PASTE_YOUR_AIzaSy_KEY_HERE"; // <-- must start with AIzaSy, not AQ.

function setOverlayVisibility(visible) {
    if (!overlay) return;
    overlay.style.display = visible ? 'block' : 'none';
    chrome.storage.local.set({ overlayVisible: visible });
}

function toggleOverlay() {
    if (!overlay) initOverlay();
    if (!overlay) return;
    const visible = overlay.style.display === 'block';
    setOverlayVisibility(!visible);
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "TOGGLE_OVERLAY") {
        initOverlay();
        toggleOverlay();
    }
});

async function handleSendClick() {
    if (!inputField || !chatLog || !overlay) return;
    const query = inputField.value.trim();
    if (!query) return;

    chatLog.innerHTML += `<div style="text-align: right; color: #94a3b8; margin-bottom: 5px;"><strong>You:</strong> ${query}</div>`;
    inputField.value = "";
    chatLog.innerHTML += `<div id="naradha-lens-loading" style="color: #38bdf8; margin-bottom: 10px; font-style: italic;">Capturing your current screen...</div>`;
    chatLog.scrollTop = chatLog.scrollHeight;

    const originalDisplay = overlay.style.display;
    overlay.style.display = 'none';

    // Try fast screen-share capture (user selects tab/window). If unavailable or cancelled, fall back to background capture.
    let response = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const video = document.createElement('video');
            video.style.position = 'fixed'; video.style.left = '-9999px';
            document.body.appendChild(video);
            video.srcObject = stream;
            await new Promise((res) => { video.onloadedmetadata = res; });
            await video.play();

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // cleanup
            try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
            try { video.pause(); video.srcObject = null; video.remove(); } catch (e) {}

            response = { imgSrc: dataUrl };
        } catch (err) {
            console.warn('content: getDisplayMedia failed or cancelled', err && err.name);
            response = null;
        }
    }

    if (!response) {
        response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "CAPTURE_TAB" }, (res) => resolve(res));
        });
    }

    overlay.style.display = originalDisplay;
    console.log('content: CAPTURE_TAB response', response && (response.error ? response.error : (response.imgSrc ? `imgSrc length=${response.imgSrc.length}` : 'no img')));
    const loadingEl = document.getElementById('naradha-lens-loading');
    if (loadingEl) loadingEl.remove();

    if (!response || response.error) {
        chatLog.innerHTML += `<div style="color: #f87171; margin-bottom: 10px;">Screenshot failed: ${response?.error || 'unknown error'}. Please make sure the tab is active and reload the extension.</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
        return;
    }

        const identityPrompt = "You are Naradha AI, a highly intelligent Indian workspace companion. Your name is Naradha AI. You are NOT ChatGPT. If the user types in English, reply in English. If the user types in Telglish (e.g. 'ee error enti', 'ela unnav'), reply in clean Telglish using English characters. If the user types in Hinglish, reply in Hinglish. If the user types in pure Telugu characters (తెలుగు లిپی), reply in pure Telugu characters. Analyze the screenshot attached to locate programming errors or bugs and provide short solutions.";

        if (response.imgSrc) {
            chatLog.innerHTML += `<div style="margin-bottom: 12px; display:flex; justify-content:flex-end;"><div style="max-width: 240px; border: 1px solid #334155; border-radius: 14px; overflow: hidden; background: #0f172a;"><a href="${response.imgSrc}" target="_blank" rel="noopener noreferrer"><img src="${response.imgSrc}" style="width:100%; display:block; cursor:zoom-in;" alt="Captured screen"></a><div style="padding: 8px; color: #cbd5e1; font-size: 12px; text-align: center;">Captured screen preview (click to open)</div></div></div>`;
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        let pureB64 = response.imgSrc || '';
        if (pureB64.includes(",")) pureB64 = pureB64.split(",")[1];

        let payload = {
            contents: [{
                parts: [
                    { text: `${identityPrompt}\n\nUser Question: ${query}` },
                    { inline_data: { mime_type: "image/jpeg", data: pureB64 } }
                ]
            }]
        };

        try {
            // gemini-1.5-flash has been fully retired (404s). Use the auto-updating alias instead.
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${EXT_GEMINI_KEY}`;
            const apiRes = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await apiRes.json();
            if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';

            chatLog.innerHTML += `<div style="margin-bottom: 10px; border-left: 2px solid #2563eb; padding-left: 5px; color: #e2e8f0;"><strong>Naradha AI:</strong><br>${replyText.replace(/\n/g, '<br>')}</div>`;
        } catch (e) {
            console.error('Naradha: Gemini call failed', e);
            chatLog.innerHTML += `<div style="color:#fbbf24; font-size:11px; margin-bottom:4px;">(Gemini failed: ${e.message}. Trying backup...)</div>`;
            try {
                const fallbackRes = await fetch("https://text.pollinations.ai/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [
                            { role: "system", content: identityPrompt + " [Fallback Image Route]" },
                            { role: "user", content: [
                                { type: "text", text: `Screen Analysis: ${query}` },
                                { type: "image_url", image_url: { url: response.imgSrc } }
                            ] }
                        ]
                    })
                });
                const text = await fallbackRes.text();
                chatLog.innerHTML += `<div style="margin-bottom: 10px; border-left: 2px solid #eab308; padding-left: 5px; color: #e2e8f0;"><strong>Naradha AI:</strong><br>${text.replace(/\n/g, '<br>')}</div>`;
            } catch (err) {
                chatLog.innerHTML += `<div style="color: #ef4444; margin-bottom:10px;">Naradha AI gateway is currently waking up. Try again.</div>`;
            }
        }
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    