(function() {
    'use strict';

    // Private key rotation logic
    let currentKeyIndex = 0;
    
    function getNextGeminiKey() {
        const keys = window.GEMINI_API_KEYS || [window.GEMINI_API_KEY];
        if (!keys || !keys.length) {
            throw new Error("No valid Gemini API keys found");
        }
        const key = keys[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        return key;
    }

    window._geminiInternalApiCaller = async function callGeminiAPI(
        payload,
        modelIdentifier,
        endpoint
    ) {
        try {
            const apiKey = getNextGeminiKey();
            if (!apiKey || apiKey.includes('YOUR_')) {
                throw new Error("Invalid Gemini API key configuration");
            }

            const baseUrl = "https://generativelanguage.googleapis.com/v1beta";
            const apiUrl = `${baseUrl}/models/${modelIdentifier}${endpoint}?key=${apiKey}`;

            // ...rest of your existing fetch and response handling code...
        } catch (error) {
            console.error(`Error in _geminiInternalApiCaller (${modelIdentifier}):`, error.message);
            throw error;
        }
    };

    console.log("services/gemini_internal_api_caller.js loaded (with key rotation).");
})();