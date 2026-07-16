let mediaRecorder;
let audioChunks = [];

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'start-recording') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    chrome.runtime.sendMessage({
                        type: 'audio-data',
                        data: reader.result
                    });
                };
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Failed to start mic recording inside helper:", err);
        }
    } else if (message.type === 'stop-recording') {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
});