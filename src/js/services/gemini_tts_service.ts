// src/js/services/gemini_tts_service.ts
import type { 
    AIApiConstants
} from '../types/global.d.ts';

console.log("gemini_tts_service.ts: Script execution STARTED (TS Version).");

export interface GeminiTtsServiceModule {
    getTTSAudio: (
        textToSpeak: string,
        languageCode: string, 
        geminiVoiceName?: string, 
        stylePrompt?: string | null
    ) => Promise<{ audioBase64: string; mimeType: string } | null>;
}

window.geminiTtsService = {} as GeminiTtsServiceModule;

function initializeActualGeminiTtsService(): void {
    console.log("gemini_tts_service.ts: initializeActualGeminiTtsService called (Dedicated TTS Model Update).");

    const _geminiInternalApiCaller = (window as any)._geminiInternalApiCaller as (
        payload: any,
        modelIdentifier: string,
        requestType?: string
    ) => Promise<any>;
    
    const aiConstants = window.aiApiConstants as AIApiConstants | undefined;
    const GEMINI_MODELS_from_constants = aiConstants?.GEMINI_MODELS;

    if (!_geminiInternalApiCaller) {
        console.error("Gemini TTS Service (TS): CRITICAL - _geminiInternalApiCaller utility not found on window.");
        // ... (dummy methods assignment and event dispatch)
        const dummyMethods: GeminiTtsServiceModule = { getTTSAudio: async () => { console.error("Gemini TTS (Dummy): _geminiInternalApiCaller missing."); return null; } };
        Object.assign(window.geminiTtsService!, dummyMethods);
        document.dispatchEvent(new CustomEvent('geminiTtsServiceReady'));
        console.warn("gemini_tts_service.ts: 'geminiTtsServiceReady' dispatched (INIT FAILED - _geminiInternalApiCaller missing).");
        return;
    }

    if (!GEMINI_MODELS_from_constants || !GEMINI_MODELS_from_constants.TTS_MODEL) {
        console.error("Gemini TTS Service (TS): CRITICAL - GEMINI_MODELS.TTS_MODEL from aiApiConstants not found.");
        // ... (dummy methods assignment and event dispatch)
        const dummyMethods: GeminiTtsServiceModule = { getTTSAudio: async () => { console.error("Gemini TTS (Dummy): TTS_MODEL identifier missing."); return null; } };
        Object.assign(window.geminiTtsService!, dummyMethods);
        document.dispatchEvent(new CustomEvent('geminiTtsServiceReady'));
        console.warn("gemini_tts_service.ts: 'geminiTtsServiceReady' dispatched (INIT FAILED - TTS_MODEL missing).");
        return;
    }

    window.geminiTtsService = ((): GeminiTtsServiceModule => {
        'use strict';
        
        async function getTTSAudio(
            textToSpeak: string,
            languageCode: string, 
            geminiVoiceNameFromPersona?: string, 
            stylePrompt: string | null = null 
        ): Promise<{ audioBase64: string; mimeType: string } | null> {

            if (!textToSpeak || !languageCode) {
                console.error("GeminiTTS: Text to speak and language code are required.");
                return null;
            }

            const modelToUse = GEMINI_MODELS_from_constants.TTS_MODEL!; 

            let actualTextToSpeak = textToSpeak;
            if (stylePrompt && stylePrompt.trim()) {
                // The blog post example doesn't show style prompts.
                // For now, let's assume the model handles naturalness from the text itself,
                // or that style prompts aren't directly supported in this payload structure.
                // If they are, the 'text' field might need to include it.
                // For simplicity and to match the blog, we'll just use textToSpeak.
                // If style prompts are essential, we'd need to see how the API expects them.
                console.warn("[GeminiTTS] Style prompts are not explicitly used in the current payload structure based on the reference example. Sending raw text.");
            }
            
            // Use the voice name passed from the persona data (e.g., connector.liveApiVoiceName)
            // or fall back to a default like "Puck" if none is provided.
            const selectedVoiceName = geminiVoiceNameFromPersona || 'Puck'; 
            let languageCodeForApi = languageCode; // Default to the text's actual language
            console.log(`[GeminiTTS] Requesting TTS. Model: '${modelToUse}', Lang (for context): '${languageCode}', Voice: '${selectedVoiceName}', Text: "${actualTextToSpeak.substring(0, 50)}..."`);

            // --- REPLACEMENT BLOCK START (Payload based on Google Apps Script example) ---
            const payloadForTTS = {
                contents: [{ 
                    role: "user", 
                    parts: [{ text: actualTextToSpeak }] 
                }],
                generationConfig: {
                    responseModalities: ["AUDIO"], 
                    speechConfig: {
                        // Add the languageCode here to guide pronunciation
                        languageCode: languageCode, // This `languageCode` param of getTTSAudio is now the one for the API
                        voiceConfig: { 
                            prebuiltVoiceConfig: { 
                                voiceName: selectedVoiceName
                            } 
                        }
                    }
                    // If the API supports responseMimeType within generationConfig for TTS, it could be an alternative
                    // to responseModalities. For now, following the blog's `responseModalities`.
                    // responseMimeType: "audio/mp3", 
                }
            };
            // --- REPLACEMENT BLOCK END ---
    
            try {
                const ttsApiResponse = await _geminiInternalApiCaller(payloadForTTS, modelToUse, "generateContent");
                
                // --- REPLACEMENT ---
                // Let's assume _geminiInternalApiCaller returns an object where the Gemini API's direct response
                // (the object containing 'candidates', 'promptFeedback' etc.) is either the ttsApiResponse itself
                // OR it's nested under a standard key like 'response' OR 'data'.
                // We'll try to be more robust.

                // First, log what ttsApiResponse actually is to be sure.
                console.log("[GeminiTTS DEBUG] Raw response from _geminiInternalApiCaller:", JSON.stringify(ttsApiResponse, null, 2));

                // Attempt to get the core Gemini response object.
                // Common patterns:
                // 1. It's directly ttsApiResponse.
                // 2. It's ttsApiResponse.response (as previously assumed).
                // 3. It's ttsApiResponse.data (common with some fetch wrappers).

                let geminiActualResponse = ttsApiResponse; // Default: assume direct response

                if (ttsApiResponse && typeof ttsApiResponse === 'object') {
                    if ('response' in ttsApiResponse && ttsApiResponse.response && typeof ttsApiResponse.response === 'object') {
                        // If there's a specific 'response' key holding the Gemini object (as previously assumed by the code)
                        geminiActualResponse = ttsApiResponse.response;
                        console.log("[GeminiTTS DEBUG] Using ttsApiResponse.response as geminiActualResponse.");
                    } else if ('data' in ttsApiResponse && ttsApiResponse.data && typeof ttsApiResponse.data === 'object' && 'candidates' in ttsApiResponse.data) {
                        // If it's nested under 'data' and 'data' looks like a Gemini response
                        geminiActualResponse = ttsApiResponse.data;
                        console.log("[GeminiTTS DEBUG] Using ttsApiResponse.data as geminiActualResponse.");
                    } else if ('candidates' in ttsApiResponse) {
                        // If ttsApiResponse itself has 'candidates', it's likely the direct Gemini response
                        geminiActualResponse = ttsApiResponse;
                        console.log("[GeminiTTS DEBUG] Using ttsApiResponse directly as geminiActualResponse (has 'candidates').");
                    } else {
                        // If none of the above, but it's an object, log a warning and proceed with ttsApiResponse
                        // This might happen if _geminiInternalApiCaller returns something unexpected but still an object.
                        console.warn("[GeminiTTS DEBUG] _geminiInternalApiCaller response structure unclear, but it's an object. Proceeding with ttsApiResponse directly. Candidates might be missing.");
                    }
                } else {
                    // If ttsApiResponse is not an object (e.g., it's the empty string "" we saw in the logs)
                    console.error("[GeminiTTS DEBUG] _geminiInternalApiCaller returned a non-object (e.g., empty string). This is likely the source of 'Full response: \"\"'. Response:", ttsApiResponse);
                    // In this case, geminiActualResponse will remain ttsApiResponse (e.g., "") and the checks below will fail as intended.
                }
                // --- END OF REPLACEMENT ---

                if (geminiActualResponse && geminiActualResponse.isEmptyResponse === true) {
                    console.error(`GeminiTTS: Gemini API returned an empty body for the TTS request. Message from caller: ${geminiActualResponse.message}`);
                    return null; // Explicitly return null if Gemini sent an empty body
                }
                if (geminiActualResponse && // Ensure geminiActualResponse is not null/undefined/empty string
                    typeof geminiActualResponse === 'object' && // Ensure it's an object before diving in
                    geminiActualResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data &&
                    geminiActualResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType) { 
                    
                    const audioData = geminiActualResponse.candidates[0].content.parts[0].inlineData;
                    console.log(`GeminiTTS: Successfully received audio. MimeType from API: ${audioData.mimeType}`);
                    return { audioBase64: audioData.data, mimeType: audioData.mimeType };
                }
                
                // Enhanced error logging for this specific scenario
                let errorMessage = "GeminiTTS: API call ok but response didn't contain expected inlineData audio structure.";
                if (geminiActualResponse && typeof geminiActualResponse === 'object') { // Only try to access these if it's an object
                    if (geminiActualResponse.promptFeedback?.blockReason) {
                        errorMessage += ` Possible block reason: ${geminiActualResponse.promptFeedback.blockReason}.`;
                        if(geminiActualResponse.promptFeedback.safetyRatings) {
                            errorMessage += ` Safety Ratings: ${JSON.stringify(geminiActualResponse.promptFeedback.safetyRatings)}`;
                        }
                    }
                    if (geminiActualResponse.candidates && geminiActualResponse.candidates.length > 0) {
                        if (geminiActualResponse.candidates[0].finishReason && geminiActualResponse.candidates[0].finishReason !== "STOP") {
                             errorMessage += ` Candidate finishReason: ${geminiActualResponse.candidates[0].finishReason}.`;
                        }
                        if (geminiActualResponse.candidates[0].content?.parts?.[0] && !geminiActualResponse.candidates[0].content.parts[0].inlineData) {
                            errorMessage += " 'inlineData' field was missing from parts[0].";
                            console.log("[GeminiTTS DEBUG] Part 0 received:", JSON.stringify(geminiActualResponse.candidates[0].content.parts[0]));
                        }
                    } else if (geminiActualResponse.candidates && geminiActualResponse.candidates.length === 0) {
                        errorMessage += " 'candidates' array was empty.";
                    } else if (!geminiActualResponse.candidates) {
                        errorMessage += " 'candidates' field was missing from the response object."
                    }
                } else {
                     errorMessage += ` The effective response object was not structured as expected or was empty. Effective Response: ${JSON.stringify(geminiActualResponse)}`;
                }
                console.error(errorMessage);
                return null;
            } catch (error: any) {
                console.error(`GeminiTTS.getTTSAudio Error (Model: ${modelToUse}, Lang: ${languageCode}, Voice: ${selectedVoiceName}):`, error.message, error);
                return null;
            }
        } // End of getTTSAudio

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
        console.warn("gemini_tts_service.ts: 'geminiTtsServiceReady' dispatched (INITIALIZATION FAILED - structure error).");
    }

} // End of initializeActualGeminiTtsService

// ... (dependency checking logic remains the same)
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
                verified = !!(window.aiApiConstants && window.aiApiConstants.GEMINI_MODELS && window.aiApiConstants.GEMINI_MODELS.TTS_MODEL);
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
    if (eventName === 'aiApiConstantsReady' && window.aiApiConstants?.GEMINI_MODELS?.TTS_MODEL) isVerified = true;

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