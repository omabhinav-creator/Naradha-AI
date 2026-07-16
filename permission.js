async function requestMic() {
    try {
        // Request mic from the foreground tab where Chrome ALLOWS prompts
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        // Automatically close this temporary window once allowed!
        window.close();
    } catch (err) {
        console.error("Permission denied:", err);
        document.body.innerHTML = "<h2 style='color:red;'>Permission Denied</h2><p>Please click the camera/mic icon in the address bar and set it to 'Allow'.</p>";
    }
}
requestMic();