// js/services/groq_stt_caller.js
(function() {
    'use strict';

    // List of languages explicitly supported by Groq's Whisper API
    const GROQ_SUPPORTED_LANGUAGES = [
        "af", "ar", "hy", "az", "be", "bs", "bg", "ca", "zh", "hr", "cs", "da", "nl",
        "en", "et", "fi", "fr", "gl", "de", "el", "he", "hi", "hu", "is", "id", "it",
        "ja", "kk", "ko", "lv", "lt", "mk", "ms", "mr", "mi", "ne", "no", "fa", "pl",
        "pt", "ro", "ru", "sr", "sk", "sl", "es", "sw", "sv", "tl", "ta", "th", "tr",
        "uk", "ur", "vi", "cy"
    ];

    window._groqSttApiCaller = async function callGroqSttAPI(
        audioBlob, // Expecting a Blob object
        modelIdentifier,
        apiKey,
        languageHint // BCP-47 code (e.g., "fr-FR", "es-MX")
    ) {
        // Input validation
        if (!apiKey || apiKey.startsWith('YOUR_') || apiKey.startsWith('gsk_YOUR_')) {
            const errorMsg = `Groq STT Caller: Invalid or missing API key.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        if (!(audioBlob instanceof Blob)) {
            console.error("Groq STT Caller: audioBlob is not a Blob object.");
            throw new Error("Invalid audio data for Groq STT.");
        }

        const endpointURL = "https://api.groq.com/openai/v1/audio/transcriptions";
        const formData = new FormData();

        // Handle filename determination
        let filename = "recording.webm"; // Default
        const typeParts = audioBlob.type.split('/');
        if (typeParts.length === 2) {
            let extension = typeParts[1].split(';')[0]; // Get base extension
            // List of formats explicitly supported by Groq's Whisper API
            const supportedExtensions = ["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"];
            
            if (supportedExtensions.includes(extension)) {
                filename = `recording.${extension}`;
            } else if (typeParts[1].includes('opus')) {
                filename = "recording.opus";
            } else if (typeParts[1].includes('aac')) {
                filename = "recording.m4a";
            }
        }
        console.log(`Groq STT Caller: Using filename "${filename}" for blob type "${audioBlob.type}"`);
        formData.append('file', audioBlob, filename);

        // Handle language code conversion
        if (languageHint && typeof languageHint === 'string') {
            const simpleLangCode = languageHint.split('-')[0].toLowerCase();
            
            if (GROQ_SUPPORTED_LANGUAGES.includes(simpleLangCode)) {
                formData.append('language', simpleLangCode);
                console.log(`Groq STT Caller: Using language "${simpleLangCode}" (from ${languageHint})`);
            } else {
                console.warn(`Groq STT Caller: Language "${languageHint}" not supported. Allowing auto-detection.`);
                // Don't append language parameter - let Whisper auto-detect
            }
        }

        // Append required form data
        formData.append('model', modelIdentifier);
        formData.append('response_format', 'json'); // Get just the text

        // console.debug(`Calling Groq STT (${modelIdentifier}): ${endpointURL}`);

        try {
            const response = await fetch(endpointURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                    // Content-Type is set automatically by fetch for FormData
                },
                body: formData,
            });

            const responseData = await response.json();

            if (!response.ok) {
                const errorDetails = responseData.error || responseData || { message: `API request failed with status ${response.status}` };
                console.error(`Groq STT API Error (${modelIdentifier} - ${response.status}):`, errorDetails);
                throw new Error(errorDetails.message || `Groq STT API Error: ${response.status}`);
            }

            if (responseData.text !== undefined) {
                return responseData.text;
            } else {
                console.error(`Groq STT API Error: No 'text' field in response.`, responseData);
                throw new Error("Invalid response structure from Groq STT API (missing text).");
            }
        } catch (error) {
            console.error(`Error in _groqSttApiCaller (${modelIdentifier}):`, error.message, error.stack);
            throw error;
        }
    };
    console.log("services/groq_stt_caller.js loaded with comprehensive language support.");
})();