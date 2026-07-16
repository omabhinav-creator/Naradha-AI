let mediaRecorder;
let audioChunks = [];

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'start-recording') {
        try {
            // Requesting explicit high-quality mono audio channel
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 16000, // Ideal sample rate for Gnani STT
                    echoCancellation: true
                } 
            });
            
            // Fallback checking to ensure baseline container support
            let options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/webm' };
            }

            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    chrome.runtime.sendMessage({ type: 'audio-data', data: reader.result });
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000); // Slices data every 1 second to ensure chunks aren't empty
        } catch (err) {
            console.error("Failed to start mic recording inside helper:", err.name, err.message);
            chrome.runtime.sendMessage({ type: 'audio-error', error: err.message });
        }
    } else if (message.type === 'stop-recording') {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }
});