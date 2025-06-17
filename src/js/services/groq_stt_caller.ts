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
        
        // --- ENHANCED DEBUGGING GUARD CLAUSE ---
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            const errorMsg = `Groq STT Caller (TS): ABORT. API key is missing, not a string, or empty. Received: ${apiKey}`;
            console.error(errorMsg);
            throw new Error(errorMsg); // Stop execution immediately
        }
        if (apiKey.startsWith('gsk_YOUR_') || apiKey.includes('YOUR_API_KEY')) {
             const errorMsg = `Groq STT Caller (TS): ABORT. API key appears to be a placeholder value.`;
             console.error(errorMsg);
             throw new Error(errorMsg);
        }
        // For debugging, let's log a redacted version of the key to confirm it's being loaded.
        console.log(`Groq STT Caller (TS): Attempting to use API key starting with "${apiKey.substring(0, 7)}...".`);
        // --- END OF ENHANCED GUARD CLAUSE ---
    
    
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

        const languageNameToCodeMap: { [key: string]: string } = {
            // Add more mappings as needed based on your app's languages
            "arabic": "ar", "dutch": "nl", "english": "en", "finnish": "fi",
            "french": "fr", "german": "de", "hindi": "hi", "indonesian": "id",
            "italian": "it", "japanese": "ja", "korean": "ko", "mandarin chinese": "zh",
            "norwegian": "no", "polish": "pl", "portuguese (brazil)": "pt",
            "portuguese (portugal)": "pt", "russian": "ru", "spanish": "es",
            "swedish": "sv", "tagalog": "tl", "thai": "th", "turkish": "tr", "vietnamese": "vi"
        };
        
        if (languageHint && typeof languageHint === 'string') {
            const hintLower = languageHint.toLowerCase().split('-')[0]; // e.g., "french", "en"
            let finalLangCode: string | undefined = undefined;
        
            // Check if the hint is already a valid code
            if (GROQ_SUPPORTED_LANGUAGES.includes(hintLower)) {
                finalLangCode = hintLower;
            }
            // Otherwise, check if it's a name we can map
            else if (languageNameToCodeMap[hintLower]) {
                finalLangCode = languageNameToCodeMap[hintLower];
            }
        
            if (finalLangCode) {
                console.log(`Groq STT Caller (TS): Applying valid language hint "${finalLangCode}" (from original: "${languageHint}").`);
                formData.append('language', finalLangCode);
            } else {
                // This warning is now more accurate.
                console.warn(`Groq STT Caller (TS): Could not map language hint "${languageHint}" to a valid ISO-639-1 code. Allowing Groq to auto-detect.`);
            }
        }

    // --- START OF REPLACEMENT ---
    try {
        // 1. Define the worker URL as the new endpoint
        const workerEndpointURL = "https://square-bush-5dbc.mogatas-princealjohn-05082003.workers.dev/";

        console.log(`Groq STT Caller (TS): Routing STT request through Cloudflare Worker: ${workerEndpointURL}`);

        // 2. Make the fetch call to the worker URL
        const response = await fetch(workerEndpointURL, {
            method: 'POST',
            headers: {
                // DO NOT add 'Authorization'. The worker handles it.
                // DO NOT add 'Content-Type' for FormData. The browser sets it correctly with the boundary.
                
                // ADD the custom header to tell the worker which Groq endpoint to use.
                'X-Target-Endpoint': 'audio/transcriptions'
            },
            body: formData,
        });

        // The rest of the response handling logic is the same
        const responseData = await response.json();

        if (!response.ok) {
            const errorDetails = responseData.error || responseData || { message: `API request failed with status ${response.status}` };
            const errorMessage = typeof errorDetails.message === 'string' ? errorDetails.message : JSON.stringify(errorDetails);
            console.error(`Groq STT API Error (via Worker) (TS - Model: ${modelIdentifier}, Status: ${response.status}):`, errorMessage, errorDetails);
            throw new Error(`Groq STT API Error (via Worker): ${response.status} - ${errorMessage}`);
        }

        if (responseData.text !== undefined && typeof responseData.text === 'string') {
            console.log(`Groq STT Caller (TS): Successfully received transcription from worker.`);
            return responseData.text;
        } else {
            console.error(`Groq STT API Error (via Worker) (TS): No 'text' field in response. Response:`, responseData);
            throw new Error("Invalid response structure from Groq STT API (via Worker).");
        }
    } catch (error: any) {
        console.error(`Error in _groqSttApiCaller (TS - Model: ${modelIdentifier}):`, error.message, error);
        throw error;
    }
    // --- END OF REPLACEMENT ---
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