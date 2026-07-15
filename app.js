let screenStream = null;

const syncBtn = document.getElementById('sync-btn');
const captureBtn = document.getElementById('capture-btn');
const queryInput = document.getElementById('user-query');
const videoElement = document.getElementById('screen-video');
const placeholder = document.getElementById('placeholder-text');
const statusText = document.getElementById('status');

// 1. Capture the desktop screen
syncBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Requesting screen access...";
        
        // Triggers the native browser selector
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false
        });

        // Show the video element and link the stream
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

// 2. Take a fast image frame snapshot on command
captureBtn.addEventListener('click', () => {
    if (!screenStream) return;

    statusText.innerText = "Scanning active screen frame...";
    
    // Create a virtual canvas to draw the frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw the current video frame onto the canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to Base64 image
    const base64Image = canvas.toDataURL('image/jpeg', 0.7); 
    console.log("Captured image Base64 format ready!");
    
    statusText.innerText = "Frame captured successfully!";
    
    // Get the user's slang question from input
    const queryText = queryInput.value || "Bhai, what is on my screen?";
    
    // Pass everything to Member 3's backend processing endpoint
    sendDataToAI(base64Image, queryText);
});
// 3. Connect to the API Pipeline (Placeholder for Day 2 integration)
async function sendDataToAI(base64ImageClean, userTextQuery) {
    const aiResponseContainer = document.getElementById('ai-response');
    const statusText = document.getElementById('status');
    
    statusText.innerText = "Naradha AI is processing...";
    aiResponseContainer.innerText = "Interpreting screenshot...";

    // Remove base64 metadata prefix for clean payload transfer
    const rawBase64 = base64ImageClean.split(',')[1];

    try {
        console.log("Sending payload package to model endpoint...");
        
        // This simulates our Day 2 API call to our partner model
        setTimeout(() => {
            aiResponseContainer.innerHTML = `
                <p style="color: #4dadff;"><strong>[System Status: Mock Day 1 Output]</strong></p>
                <p><strong>Context Captured:</strong> Frame converted to Base64 (Length: ${rawBase64.length} characters).</p>
                <p><strong>Your Dialect Query:</strong> "${userTextQuery}"</p>
                <p style="margin-top: 10px;"><em>Tomorrow, we will connect Gnani's speech engine and Alchemyst AI's memory layers here to render real responses.</em></p>
            `;
            statusText.innerText = "Completed!";
        }, 1500);

    } catch (error) {
        aiResponseContainer.innerText = "Failed to connect to model: " + error.message;
        statusText.innerText = "Failed.";
    }
}