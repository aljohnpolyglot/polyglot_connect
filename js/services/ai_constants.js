// js/services/ai_constants.js
(function() {
    'use strict';

    window._aiApiConstants = {
        PROVIDERS: {
            GEMINI: 'gemini',
            GROQ: 'groq',
            TOGETHER: 'together'
        },
        GEMINI_MODELS: {
            TEXT: "gemini-1.5-flash-latest",
            MULTIMODAL: "gemini-1.5-flash-latest",
            TTS_GENERATE_CONTENT: "gemini-1.5-flash-latest",
        },
        GROQ_MODELS: {
            TEXT_CHAT: "llama3-8b-8192",
            RECAP: "llama3-70b-8192",
            STT: "whisper-large-v3"
        },
        TOGETHER_MODELS: {
            TEXT_CHAT: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
            RECAP: "meta-llama/Llama-3.1-70B-Instruct-Turbo",
            VISION: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo"
        },
        STANDARD_SAFETY_SETTINGS_GEMINI: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ]
    };
    console.log("services/ai_constants.js loaded.");
})();