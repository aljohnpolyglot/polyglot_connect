// src/js/services/ai_constants.ts
import type { AIApiConstants } from "../types/global.d.ts";

console.log("ai_constants.ts: Script execution STARTED (TS Version).");
export const LIVE_API_SETUP_TIMEOUT_MS = 15000;
(() => {
    'use strict';

    const constantsObject: AIApiConstants = {
        PROVIDERS: {
            GEMINI: 'gemini',
            GROQ: 'groq',
            OPENROUTER: 'openrouter', // <<< ENSURE THIS LINE EXISTS AND IS SPELLED CORRECTLY
            TOGETHER: 'together'
        },
        GEMINI_MODELS: {
            TEXT: "gemini-1.5-flash-latest",
            MULTIMODAL: "gemini-1.5-flash-latest",
            RECAP: "gemini-1.5-flash-latest",    
            TTS_GENERATE_CONTENT: "gemini-1.5-flash-latest", // Or specific TTS model if using generateContent
            // MODEL_TTS_SYNTHESIZE: "text-to-speech", // This was in your gemini_core_api.js, keep if needed
        },
        GROQ_MODELS: {
            TEXT_CHAT: "llama3-8b-8192", //group chat
            ONE_ON_ONE_CHAT: "llama-3.1-8b-instant", // <<< NEW: For detailed 1-on-1 chats
            RECAP: "llama3-70b-8192", 
            STT: "whisper-large-v3" 
        },
           // <<< NEW OPENROUTER MODEL CONFIGURATION >>>
        OPENROUTER_MODELS: {
            // Powerful and intelligent, a great second attempt after Groq
            TEXT_CHAT: "nousresearch/nous-hermes-2-mixtral-8x7b-dpo", // <<< THE NEW, CHEAPER, SMARTER MODEL
            // Top-tier model for high-quality summaries
            RECAP: "google/gemini-1.5-pro",
            // Excellent and reliable vision model
            VISION: "openai/gpt-4o"
        },
        TOGETHER_MODELS: {
            TEXT_CHAT: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", // <<< CORRECTED (Capital 'M')
            RECAP: "meta-llama/Llama-3.1-70B-Instruct-Turbo",  
            VISION: "meta-llama/Llama-4-Scout-17B-16E-Instruct" // <<< NEW RECOMMENDED MODEL
        },
        STANDARD_SAFETY_SETTINGS_GEMINI: [ // Renamed from STANDARD_SAFETY_SETTINGS for clarity if it was Gemini specific
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
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
      // src/js/services/ai_constants.ts

// REPLACE WITH THIS (remove trailing comma if it's the last item):
API_RETRY_CONFIG: {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 3000
}, 
MIN_TRANSCRIPT_TURNS_FOR_RECAP: 4, // <<< ADD THIS LINE (adjust value as needed, 4 means at least 2 user + 2 AI turns)
LIVE_API_SETUP_TIMEOUT_MS: LIVE_API_SETUP_TIMEOUT_MS 
};

    // Assign to window._aiApiConstants first if legacy scripts use it
    if (!(window as any)._aiApiConstants) {
        (window as any)._aiApiConstants = {};
    }
    Object.assign((window as any)._aiApiConstants, constantsObject);
    console.log("ai_constants.ts: Populated window._aiApiConstants.");

    (window as any).aiApiConstants = (window as any)._aiApiConstants;
    console.log("ai_constants.ts: Aliased window._aiApiConstants to window.aiApiConstants.");
    
    if (window.aiApiConstants && typeof window.aiApiConstants.PROVIDERS === 'object') { 
        document.dispatchEvent(new CustomEvent('aiApiConstantsReady'));
        console.log("ai_constants.ts: 'aiApiConstantsReady' event DISPATCHED.");
    } else {
        console.error("ai_constants.ts: FAILED to assign window.aiApiConstants correctly or PROVIDERS missing. 'aiApiConstantsReady' NOT dispatched.");
    }

})();

console.log("ai_constants.ts: Script execution FINISHED (TS Version).");