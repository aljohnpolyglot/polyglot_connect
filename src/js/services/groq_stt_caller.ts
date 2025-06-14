// src/js/services/groq_stt_caller.ts

console.log("groq_stt_caller.ts: Script execution STARTED (TS Version).");

// Define the function signature for the window object
export type GroqSttApiCallerFn = (
    audioBlob: Blob,
    modelIdentifier: string,
    apiKey: string,
    languageHint?: string // BCP-47 code e.g., "en-US", "fr-FR"
) => Promise<string | null>; // Returns transcribed text or null on error

// --- Start of IIFE ---
(() => {
    'use strict';

    const GROQ_SUPPORTED_LANGUAGES: string[] = [ // ISO 639-1 codes
        "af", "ar", "hy", "az", "be", "bs", "bg", "ca", "zh", "hr", "cs", "da", "nl",
        "en", "et", "fi", "fr", "gl", "de", "el", "he", "hi", "hu", "is", "id", "it",
        "ja", "kk", "ko", "lv", "lt", "mk", "ms", "mr", "mi", "ne", "no", "fa", "pl",
        "pt", "ro", "ru", "sr", "sk", "sl", "es", "sw", "sv", "tl", "ta", "th", "tr",
        "uk", "ur", "vi", "cy"
    ];

    (window as any)._groqSttApiCaller = async function callGroqSttAPI(
        audioBlob: Blob,
        modelIdentifier: string,
        apiKey: string,
        languageHint?: string 
    ): Promise<string | null> {
        
        if (!apiKey || typeof apiKey !== 'string' || apiKey.startsWith('YOUR_') || apiKey.startsWith('gsk_YOUR_') || apiKey.trim() === '') {
            const errorMsg = `Groq STT Caller (TS): Invalid or missing API key.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        if (!(audioBlob instanceof Blob) || audioBlob.size === 0) {
            console.error("Groq STT Caller (TS): audioBlob is not a valid Blob object or is empty.");
            throw new Error("Invalid or empty audio data for Groq STT.");
        }
        if (!modelIdentifier || typeof modelIdentifier !== 'string' || modelIdentifier.trim() === '') {
            console.error("Groq STT Caller (TS): Invalid or missing modelIdentifier.");
            throw new Error("Invalid or missing modelIdentifier for Groq STT.");
        }

        const endpointURL = "https://api.groq.com/openai/v1/audio/transcriptions";
        const formData = new FormData();

        let filename = "recording.webm"; // Default filename
        const typeParts = audioBlob.type.split('/');
        if (typeParts.length === 2) {
            let extension = typeParts[1].split(';')[0].toLowerCase(); 
            const supportedExtensions = ["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"];
            if (supportedExtensions.includes(extension)) {
                filename = `audio.${extension}`;
            } else if (typeParts[1].includes('opus')) {
                filename = "audio.opus";
            } // Add more specific mappings if needed
        }
        // console.log(`Groq STT Caller (TS): Using filename "${filename}" for blob type "${audioBlob.type}"`);
        formData.append('file', audioBlob, filename);
        formData.append('model', modelIdentifier); // e.g., "whisper-large-v3"
        formData.append('response_format', 'json'); // Request JSON to get 'text' field

        if (languageHint && typeof languageHint === 'string') {
            const simpleLangCode = languageHint.split('-')[0].toLowerCase(); // Extract base lang like 'en' from 'en-US'
            if (GROQ_SUPPORTED_LANGUAGES.includes(simpleLangCode)) {
                formData.append('language', simpleLangCode);
                // console.log(`Groq STT Caller (TS): Using language hint "${simpleLangCode}" (from original: ${languageHint})`);
            } else {
                console.warn(`Groq STT Caller (TS): Language hint "${languageHint}" (parsed as "${simpleLangCode}") not in supported list. Allowing auto-detection.`);
            }
        }

        try {
            const response = await fetch(endpointURL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                body: formData,
            });

            const responseData = await response.json();

            if (!response.ok) {
                const errorDetails = responseData.error || responseData || { message: `API request failed with status ${response.status}` };
                const errorMessage = typeof errorDetails.message === 'string' ? errorDetails.message : JSON.stringify(errorDetails);
                console.error(`Groq STT API Error (TS - Model: ${modelIdentifier}, Status: ${response.status}):`, errorMessage, errorDetails);
                throw new Error(`Groq STT API Error: ${response.status} - ${errorMessage}`);
            }

            if (responseData.text !== undefined && typeof responseData.text === 'string') {
                return responseData.text;
            } else {
                console.error(`Groq STT API Error (TS): No 'text' field in response or not a string. Response:`, responseData);
                throw new Error("Invalid response structure from Groq STT API (missing or invalid text field).");
            }
        } catch (error: any) {
            console.error(`Error in _groqSttApiCaller (TS - Model: ${modelIdentifier}):`, error.message, error);
            // Re-throw to be caught by the calling service (e.g., ai_service.ts)
            // The facade can then return a human-friendly error.
            throw error;
        }
    };

    if (typeof (window as any)._groqSttApiCaller === 'function') {
        console.log("groq_stt_caller.ts: _groqSttApiCaller assigned to window and seems functional.");
        document.dispatchEvent(new CustomEvent('groqSttApiCallerReady'));
        console.log("groq_stt_caller.ts: 'groqSttApiCallerReady' event dispatched.");
    } else {
        console.error("groq_stt_caller.ts: FAILED to assign _groqSttApiCaller to window or it's not a function.");
    }

})(); // End of IIFE

console.log("groq_stt_caller.ts: Script execution FINISHED (TS Version).");