(function() {
    'use strict';

    window._groqSttApiCaller = async function callGroqSttAPI(
        audioBlob,
        modelIdentifier,
        apiKey, // Now required parameter
        languageHint
    ) {
        if (!apiKey || apiKey.includes('YOUR_') || apiKey.includes('gsk_YOUR_')) {
            throw new Error("Invalid Groq STT API key provided");
        }

        const endpointURL = "https://api.groq.com/openai/v1/audio/transcriptions";
        const formData = new FormData();

        // ...existing filename and FormData setup...

        try {
            const response = await fetch(endpointURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            // ...rest of your existing response handling code...
        } catch (error) {
            console.error(`Error in _groqSttApiCaller:`, error.message);
            throw error;
        }
    };

    console.log("services/groq_stt_api_caller.js loaded (explicit key passing).");
})();