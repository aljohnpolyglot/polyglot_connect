// src/js/services/gemini_tts_service.ts
import type { 
    AIApiConstants
    // Import Connector, GeminiChatItem if they were truly needed by other potential methods
} from '../types/global.d.ts';

console.log("gemini_tts_service.ts: Script execution STARTED (TS Version).");

// Interface for the module this file will create on window
// This should align with GeminiTtsService in global.d.ts
export interface GeminiTtsServiceModule {
    getTTSAudio: (
        textToSpeak: string,
        languageCode: string, // Made non-optional as per JS logic
        geminiVoiceName?: string, // Optional, with fallback
        stylePrompt?: string | null
    ) => Promise<{ audioBase64: string; mimeType: string } | null>;
}

// Placeholder on window
window.geminiTtsService = {} as GeminiTtsServiceModule;

function initializeActualGeminiTtsService(): void {
    console.log("gemini_tts_service.ts: initializeActualGeminiTtsService called.");

    const _geminiInternalApiCaller = (window as any)._geminiInternalApiCaller as (
        payload: any,
        modelIdentifier: string,
        requestType?: string
    ) => Promise<any>;
    
    const aiConstants = window.aiApiConstants as AIApiConstants | undefined;

    if (!_geminiInternalApiCaller || !aiConstants?.GEMINI_MODELS?.TTS_GENERATE_CONTENT) {
        console.error("Gemini TTS Service (TS): CRITICAL - Core API utilities (_geminiInternalApiCaller or aiApiConstants with GEMINI_MODELS.TTS_GENERATE_CONTENT) not found. Service non-functional.");
        
        const dummyMethods: GeminiTtsServiceModule = {
            getTTSAudio: async () => {
                const errorMsg = "Gemini TTS Service not initialized (core deps missing).";
                console.error(errorMsg);
                // To satisfy Promise<{ audioBase64: string; mimeType: string } | null>
                // we should throw an error or return null. Throwing is clearer for a failed service.
                throw new Error(errorMsg); 
            }
        };
        Object.assign(window.geminiTtsService!, dummyMethods);
        document.dispatchEvent(new CustomEvent('geminiTtsServiceReady'));
        console.warn("gemini_tts_service.ts: 'geminiTtsServiceReady' dispatched (INITIALIZATION FAILED - core deps).");
        return;
    }
    console.log("Gemini TTS Service (TS): Core API utilities and constants found.");

    const { GEMINI_MODELS } = aiConstants; // Destructure after check

    window.geminiTtsService = ((): GeminiTtsServiceModule => {
        'use strict';

        async function getTTSAudio(
            textToSpeak: string,
            languageCode: string,
            geminiVoiceName?: string, // Made optional here to match interface
            stylePrompt: string | null = null
        ): Promise<{ audioBase64: string; mimeType: string } | null> {
            
            if (!textToSpeak || typeof textToSpeak !== 'string' || textToSpeak.trim() === "") {
                console.error("GeminiTTS (TS): Text to speak is required and cannot be empty.");
                throw new Error("Text to speak is required for TTS.");
            }
            if (!languageCode || typeof languageCode !== 'string' || languageCode.trim() === "") {
                console.error("GeminiTTS (TS): Language code is required.");
                throw new Error("Language code is required for TTS.");
            }
            
            const effectiveVoiceName = geminiVoiceName || "Puck"; // Default if not provided

            let textContentForPayload = textToSpeak;
            if (stylePrompt && typeof stylePrompt === 'string' && stylePrompt.trim() !== "") {
                textContentForPayload = `${stylePrompt.trim()} ${textToSpeak}`;
                // console.log(`GeminiTTS (TS): Applying style prompt: "${stylePrompt.trim()}"`);
            }

            // Payload for TTS using generateContent with a model that supports audio output.
            // The exact structure for requesting audio output via generateContent can be subtle
            // and model-dependent. This structure aims for compatibility with models
            // that allow specifying audio output modality.
            const payload = {
                contents: [{
                    role: "user", 
                    parts: [{ text: textContentForPayload }]
                }],
                generationConfig: { // Ensure this matches what the chosen TTS_GENERATE_CONTENT model expects
                    // Candidate count might not be relevant for TTS, but temperature can be.
                    // temperature: 0.7, // Optional: adjust for expressiveness
                    // TopK, TopP might also apply to some TTS-capable generative models.
                },
                // This part is critical if the model uses tools/config to specify output
                // For some newer models, you might specify output modality here or via tools.
                // This example assumes the model specified by GEMINI_MODELS.TTS_GENERATE_CONTENT
                // is a generative model that can output audio, and uiUpdater needs the mimeType.
                // The `_geminiInternalApiCaller` with `requestType: "generateContentAudio"`
                // expects the response to have `candidates[0].content.parts[0].inline_data`.
                // The request payload thus needs to make the model generate such a part.
                // Often, for TTS, a simpler payload directly targeting a TTS model or endpoint is used.
                // If GEMINI_MODELS.TTS_GENERATE_CONTENT is like "textembedding-gecko" it would be something like:
                // payload = {
                //   "text_input": { "text": textContentForPayload },
                //   "voice_config": { "voice_name": effectiveVoiceName, "language_code": languageCode },
                //   "audio_config": { "audio_encoding": "MP3_BASE64" } // Or LINEAR16 for PCM
                // }
                // And the requestType would be "synthesizeSpeech" or a specific TTS model path.
                // Given your `_geminiInternalApiCaller` handles "generateContentAudio",
                // let's assume the payload for that aims to get an audio part in the response.
                // This might require specifying `response_mime_type` or similar in `generationConfig`
                // or the model implicitly knows to return audio.
                // For "gemini-1.5-flash-latest" to produce audio, it might need a tool or specific config.
                // The example from Google docs for generateContent for TTS might look different.
                // Let's simplify the payload for now, assuming the model understands the intent
                // when called with "generateContentAudio". The safety settings are applied by the caller.
            };
            
            const modelToUse = GEMINI_MODELS.TTS_GENERATE_CONTENT;
            if (!modelToUse) {
                console.error("GeminiTTS (TS): GEMINI_MODELS.TTS_GENERATE_CONTENT is not defined.");
                throw new Error("TTS model configuration missing.");
            }
            // console.log(`GeminiTTS (TS): Requesting TTS. Voice: '${effectiveVoiceName}', Lang: '${languageCode}', Model: '${modelToUse}'. Payload:`, JSON.stringify(payload));
            
            try {
                const ttsResponse = await _geminiInternalApiCaller(payload, modelToUse, "generateContentAudio");

                if (ttsResponse && ttsResponse.audioBase64 && ttsResponse.mimeType) {
                    // console.log(`GeminiTTS (TS): Successfully received audio. MimeType: ${ttsResponse.mimeType}`);
                    return { audioBase64: ttsResponse.audioBase64, mimeType: ttsResponse.mimeType };
                } else {
                    console.error("GeminiTTS (TS): API call succeeded but response did not contain expected audio data.", ttsResponse);
                    throw new Error("TTS generation failed to return valid audio data.");
                }
            } catch (error: any) {
                console.error(`GeminiTTS.getTTSAudio Error (Model: ${modelToUse}, Lang: ${languageCode}, Voice: ${effectiveVoiceName}):`, error.message);
                const enhancedError = new Error(`TTS generation failed for language '${languageCode}': ${error.message}`) as any;
                if (error.status) enhancedError.status = error.status;
                if (error.providerDetails) enhancedError.providerDetails = error.providerDetails;
                if (error.isApiKeyError !== undefined) enhancedError.isApiKeyError = error.isApiKeyError;
                throw enhancedError;
            }
        }

        console.log("gemini_tts_service.ts: IIFE (TS Version) finished.");
        return {
            getTTSAudio
        };
    })(); // End of IIFE

    if (window.geminiTtsService && typeof window.geminiTtsService.getTTSAudio === 'function') {
        console.log("gemini_tts_service.ts: SUCCESSFULLY assigned and method verified.");
        document.dispatchEvent(new CustomEvent('geminiTtsServiceReady'));
        console.log("gemini_tts_service.ts: 'geminiTtsServiceReady' event dispatched.");
    } else {
        console.error("gemini_tts_service.ts: CRITICAL ERROR - window.geminiTtsService not correctly formed.");
        document.dispatchEvent(new CustomEvent('geminiTtsServiceReady'));
        console.warn("gemini_tts_service.ts: 'geminiTtsServiceReady' dispatched (INITIALIZATION FAILED).");
    }

} // End of initializeActualGeminiTtsService

const dependenciesForGTtsS = ['geminiApiCallerLogicReady', 'aiApiConstantsReady'];
const gTtsSMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGTtsS.forEach(dep => gTtsSMetDependenciesLog[dep] = false);
let gTtsSDepsMetCount = 0;

function checkAndInitGTtsS(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'geminiApiCallerLogicReady':
                verified = !!(window as any)._geminiInternalApiCaller;
                break;
            case 'aiApiConstantsReady':
                verified = !!(window.aiApiConstants && window.aiApiConstants.GEMINI_MODELS);
                break;
            default: return;
        }
        if (verified && !gTtsSMetDependenciesLog[receivedEventName]) {
            gTtsSMetDependenciesLog[receivedEventName] = true;
            gTtsSDepsMetCount++;
        }
    }
    if (gTtsSDepsMetCount === dependenciesForGTtsS.length) {
        initializeActualGeminiTtsService();
    }
}

let gTtsSAllPreloaded = true;
dependenciesForGTtsS.forEach(eventName => {
    let isVerified = false;
    if (eventName === 'geminiApiCallerLogicReady' && (window as any)._geminiInternalApiCaller) isVerified = true;
    if (eventName === 'aiApiConstantsReady' && window.aiApiConstants?.GEMINI_MODELS) isVerified = true;

    if (isVerified) {
        if(!gTtsSMetDependenciesLog[eventName]) { gTtsSMetDependenciesLog[eventName] = true; gTtsSDepsMetCount++; }
    } else {
        gTtsSAllPreloaded = false;
        document.addEventListener(eventName, () => checkAndInitGTtsS(eventName), { once: true });
    }
});

if (gTtsSAllPreloaded && gTtsSDepsMetCount === dependenciesForGTtsS.length) {
    initializeActualGeminiTtsService();
} else if (!gTtsSAllPreloaded) {
    console.log(`gemini_tts_service.ts: Waiting for ${dependenciesForGTtsS.length - gTtsSDepsMetCount} core dependencies.`);
}

console.log("gemini_tts_service.ts: Script execution FINISHED (TS Version).");