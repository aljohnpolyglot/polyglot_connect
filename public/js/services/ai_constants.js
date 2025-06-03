// js/services/ai_constants.js
(function() {
    'use strict';

    // Ensure this object is created on window if it doesn't exist
    if (!window._aiApiConstants) {
        window._aiApiConstants = {};
    }

    Object.assign(window._aiApiConstants, {
        PROVIDERS: {
            GEMINI: 'gemini',
            GROQ: 'groq',
            TOGETHER: 'together'
        },
        GEMINI_MODELS: {
            TEXT: "gemini-1.5-flash-latest",
            MULTIMODAL: "gemini-1.5-flash-latest", // Often same for text & basic multimodal
            RECAP: "gemini-1.5-flash-latest",    // Can be tuned or a more powerful model
            TTS_GENERATE_CONTENT: "gemini-1.5-flash-latest", // If using generateContent for TTS
            // For older TTS via :synthesizeSpeech endpoint, the model is often just "text-to-speech"
        },
        GROQ_MODELS: {
            TEXT_CHAT: "llama3-8b-8192",
            RECAP: "llama3-70b-8192", // More capable model for structured JSON recap
            STT: "whisper-large-v3" // Speech-to-Text model
        },
        TOGETHER_MODELS: {
            TEXT_CHAT: "meta-llama/Llama-3.1-8B-Instruct-Turbo", // Check TogetherAI for current best/available
            RECAP: "meta-llama/Llama-3.1-70B-Instruct-Turbo",  // Check TogetherAI
            VISION: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo" // Check TogetherAI vision model
        },
        // Standard safety settings for Gemini API calls
        STANDARD_SAFETY_SETTINGS_GEMINI: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
        // Human-like error messages for when AI services have temporary issues
        // These are generic English. Translation would happen closer to the UI.
        HUMAN_LIKE_ERROR_MESSAGES: [
            "Apologies, my connection seems a little unstable right now. Could you try sending that again in a moment?",
            "Oh dear, I think I missed what you said. My internet might be playing tricks on me. What was that?",
            "Hold on, my thoughts got a bit jumbled there. Can you repeat your last message, please?",
            "Hmm, I'm having a little trouble hearing you clearly right now. Maybe try that once more?",
            "Just a second, things are a bit fuzzy on my end. Could you say that again?",
            "Oops! It seems like I'm a bit distracted. What were we talking about?",
            "My mind wandered for a second there! What did you say?",
            "The line seems a bit crackly, I didn't quite catch that.",
            "I'm having a moment, could you rephrase that for me?",
            "It seems I'm having a bit of trouble processing that right now. Let's try again in a few seconds.",
            "My apologies, I'm not quite myself at the moment. Could you give that another go?"
        ],
        // API call retry parameters
        API_RETRY_CONFIG: {
            maxRetries: 2, // Max retries per provider before trying next provider
            initialDelayMs: 500, // Initial delay before first retry
            maxDelayMs: 3000    // Max delay for subsequent retries (exponential backoff might cap here)
        }
    });

    console.log("services/ai_constants.js loaded with human-like error messages and retry config.");
})();