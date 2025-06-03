// js/services/gemini_multimodal_service.js
// Handles Gemini API calls involving multiple modalities (e.g., audio input, image input).

window.geminiMultimodalService = (() => {
    'use strict';

    // --- Robust Dependency Check ---
    if (!window._geminiInternalApiCaller || !window._aiApiConstants) {
        console.error("Gemini Multimodal Service: CRITICAL - Core API utilities (_geminiInternalApiCaller or _aiApiConstants) not found at load time. Service will be non-functional.");
        // Define dummy functions that will throw, so any accidental calls are caught.
        const errorFn = async (errorMessagePrefix = "Multimodal Service") => {
            const errorMsg = `${errorMessagePrefix} not initialized due to missing core utilities. Please check script loading order and ensure ai_constants.js and gemini_api_caller.js (defining _geminiInternalApiCaller) are loaded first.`;
            console.error("Gemini Multimodal Service Call Failed:", errorMsg);
            throw new Error(errorMsg);
        };
        return {
            generateTextFromAudioForCallModal: () => errorFn("generateTextFromAudioForCallModal"),
            generateTextFromImageAndText: () => errorFn("generateTextFromImageAndText"),
            transcribeAudioToText: () => errorFn("transcribeAudioToText")
        };
    }

    const callGeminiAPIInternal = window._geminiInternalApiCaller;
    const { GEMINI_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI } = window._aiApiConstants; // Destructure after ensuring it exists

    async function transcribeAudioToText(base64AudioString, mimeType, languageHint = "en-US") {
        console.log(`GeminiMultimodalService: transcribeAudioToText called. Lang hint: ${languageHint}, MimeType: ${mimeType.substring(0,30)}`);
        if (!base64AudioString) {
            console.error("GeminiMultimodalService.transcribeAudioToText: Audio data (base64AudioString) is missing or empty.");
            throw new Error("Audio data missing for transcription.");
        }
        if (!mimeType) {
            console.error("GeminiMultimodalService.transcribeAudioToText: MimeType is missing.");
            throw new Error("MimeType missing for transcription.");
        }

        const contents = [{
            role: "user",
            parts: [
                { text: `Please transcribe the following audio. The primary language spoken is likely ${languageHint}. Focus on accurate transcription.` },
                { inlineData: { mimeType: mimeType, data: base64AudioString } }
            ]
        }];

        const payload = {
            contents: contents,
            // safetySettings are applied by _geminiInternalApiCaller
            generationConfig: {
                // Temperature might be lower for more factual transcription
                temperature: 0.2 
            } 
        };
        // console.debug("GeminiMultimodalService.transcribeAudioToText: Payload:", JSON.stringify(payload).substring(0, 300) + "...");

        try {
            const modelToUse = GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT; // Fallback if MULTIMODAL not defined
            console.log(`GeminiMultimodalService: Calling Gemini for STT with model ${modelToUse}.`);
            const transcription = await callGeminiAPIInternal(payload, modelToUse, "generateContent");
            
            if (typeof transcription !== 'string') {
                console.warn("GeminiMultimodalService: Transcription result was not a string:", transcription);
                // If it's an object indicating blocking, propagate that info if possible
                if (transcription && typeof transcription === 'object' && transcription.startsWith?.("(My response was blocked")) {
                    throw new Error(transcription); // Let facade handle this user-facing message
                }
                throw new Error("Transcription result from API was not in the expected text format.");
            }
            console.log("GeminiMultimodalService: Transcription successful. Length:", transcription.length);
            return transcription;
        } catch (error) {
            console.error(`GeminiMultimodalService.transcribeAudioToText Error:`, error.message, error);
            // Re-throw the error so the facade (ai_service.js) can catch it and provide a human-like message
            throw error; 
        }
    }

    async function generateTextFromAudioForCallModal(base64AudioString, mimeType, connector, modalCallHistory) {
        console.log(`GeminiMultimodalService: generateTextFromAudioForCallModal called for connector: ${connector?.id}`);
        if (!connector || !connector.profileName || !connector.language) {
            console.error("GeminiMultimodalService: Connector info (id, profileName, language) missing for audio call modal.");
            throw new Error("Connector information missing for generating text from audio.");
        }
        if (!base64AudioString) {
            console.error("GeminiMultimodalService: Audio data (base64AudioString) missing for audio call modal.");
            throw new Error("Audio data missing for audio call modal.");
        }

        // Construct a concise system prompt specific for this task
        // The full persona prompt is already in the `modalCallHistory` or `existingGeminiHistory`
        // This is more of an instruction for *this specific turn* involving audio.
        const turnInstruction = `You are ${connector.profileName}. The user has just spoken. Their audio has been transcribed (you will process it internally). Respond naturally in ${connector.language} based on what they said. Maintain your persona. This is a voice call, so avoid emojis and parenthetical remarks.`;
        
        let contents = [];
        // Add the system-like instruction for this turn
        contents.push({ role: "user", parts: [{ text: turnInstruction }] });
        contents.push({ role: "model", parts: [{ text: `Okay, I understand. I am ${connector.profileName}. I will listen to the user's audio and respond in ${connector.language}.` }] });


        // Add recent textual history if available
        const MAX_TEXT_HISTORY_FOR_AUDIO_CONTEXT = 4; // User turns + Model turns
        if (Array.isArray(modalCallHistory)) {
            modalCallHistory.slice(-MAX_TEXT_HISTORY_FOR_AUDIO_CONTEXT).forEach(turn => {
                if (turn && typeof turn.text === 'string') { // Only add text turns to this part of context
                    contents.push({ 
                        role: turn.sender?.toLowerCase().startsWith('user') ? 'user' : 'model', 
                        parts: [{ text: turn.text }] 
                    });
                }
            });
        }
        
        // Add the user's audio data
        contents.push({ role: "user", parts: [{ inlineData: { mimeType: mimeType, data: base64AudioString } }] });

        const payload = { 
            contents: contents,
            // safetySettings applied by _geminiInternalApiCaller
            generationConfig: { temperature: 0.7 }
        };
        // console.debug("GeminiMultimodalService.generateTextFromAudioForCallModal: Payload Preview:", JSON.stringify(payload.contents.slice(-3)).substring(0, 300) + "...");

        try {
            const modelToUse = GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT;
            console.log(`GeminiMultimodalService: Calling Gemini for call modal audio-to-text with model ${modelToUse}.`);
            const response = await callGeminiAPIInternal(payload, modelToUse, "generateContent");
            console.log("GeminiMultimodalService: Audio processing (for call modal) successful. Response preview:", typeof response === 'string' ? response.substring(0, 50) + "..." : response);
            if (typeof response !== 'string') {
                 throw new Error("Response from audio processing was not in expected text format.");
            }
            return response;
        } catch (error) {
            console.error(`GeminiMultimodalService.generateTextFromAudioForCallModal Error for ${connector.profileName}:`, error.message, error);
            throw error; // Re-throw for facade handling
        }
    }

    async function generateTextFromImageAndText(base64ImageString, mimeType, connector, existingGeminiHistory, optionalUserText) {
        console.log(`GeminiMultimodalService: generateTextFromImageAndText called for connector: ${connector?.id}`);
        if (!connector || !connector.profileName || !connector.language) {
            console.error("GeminiMultimodalService: Connector info (id, profileName, language) missing for image chat.");
            throw new Error("Connector information missing for image processing.");
        }
        if (!base64ImageString) {
            console.error("GeminiMultimodalService: Image data (base64ImageString) missing for image chat.");
            throw new Error("Image data missing for image processing.");
        }

        const userQueryText = optionalUserText || `The user sent this image. Please describe it or ask a relevant question about it in ${connector.language}.`;

        // Ensure existingGeminiHistory is an array. It should contain the full conversation context,
        // including the system prompt for the persona.
        let currentHistoryForThisCall = Array.isArray(existingGeminiHistory) ? [...existingGeminiHistory] : [];
        
        // Add the new user turn with text and image
        const userImagePromptParts = [];
        if (userQueryText.trim() !== "") { // Only add text part if there's actual text
            userImagePromptParts.push({ text: userQueryText });
        }
        userImagePromptParts.push({ inlineData: { mimeType: mimeType, data: base64ImageString } });
        
        currentHistoryForThisCall.push({ role: "user", parts: userImagePromptParts });

        const payload = {
            contents: currentHistoryForThisCall,
            // safetySettings applied by _geminiInternalApiCaller
            generationConfig: { temperature: 0.7 }
        };
        // console.debug("GeminiMultimodalService.generateTextFromImageAndText: Payload Preview:", JSON.stringify(payload.contents.slice(-1)).substring(0, 300) + "...");

        try {
            const modelToUse = GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT;
            console.log(`GeminiMultimodalService: Calling Gemini for image-to-text with model ${modelToUse}.`);
            const response = await callGeminiAPIInternal(payload, modelToUse, "generateContent");
            console.log("GeminiMultimodalService: Image processing successful. Response preview:", typeof response === 'string' ? response.substring(0, 50) + "..." : response);
             if (typeof response !== 'string') {
                 throw new Error("Response from image processing was not in expected text format.");
            }
            return response;
        } catch (error) {
            console.error(`GeminiMultimodalService.generateTextFromImageAndText Error for ${connector.profileName}:`, error.message, error);
            throw error; // Re-throw for facade handling
        }
    }

    if (window._geminiInternalApiCaller && window._aiApiConstants) { // Re-check after definitions
        console.log("services/gemini_multimodal_service.js loaded successfully with dependencies and error propagation.");
    } else {
         console.error("services/gemini_multimodal_service.js loaded but critical dependencies are STILL MISSING post-IIFE. This is a serious issue.");
    }

    return {
        generateTextFromAudioForCallModal,
        generateTextFromImageAndText,
        transcribeAudioToText
    };
})();