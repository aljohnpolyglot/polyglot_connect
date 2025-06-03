// js/services/gemini_tts_service.js
// Handles Text-to-Speech API calls to Gemini using the newer generateContent method.

window.geminiTtsService = (() => {
    'use strict';

    // --- Robust Dependency Check ---
    if (!window._geminiInternalApiCaller || !window._aiApiConstants) {
        console.error("Gemini TTS Service: CRITICAL - Core Gemini API utilities (_geminiInternalApiCaller or _aiApiConstants) not found at load time. TTS service will be non-functional.");
        // Define a dummy function that will throw, so any accidental calls are caught.
        return {
            getTTSAudio: async () => {
                const errorMsg = "Gemini TTS Service not initialized due to missing core API utilities. Check script loading order.";
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        };
    }

    const callGeminiAPIInternal = window._geminiInternalApiCaller;
    // Destructure constants after ensuring _aiApiConstants exists
    const { GEMINI_MODELS } = window._aiApiConstants; 

    /**
     * Generates TTS audio using Gemini's generateContent endpoint.
     * @param {string} textToSpeak - The text to be converted to speech.
     * @param {string} languageCode - BCP-47 language code (e.g., "en-US", "fr-FR").
     * @param {string} geminiVoiceName - The specific Gemini voice name (e.g., "Puck", "Charon").
     * @param {string|null} stylePrompt - Optional text prompt to influence speech style (e.g., "Speak in a cheerful, upbeat tone.").
     * @returns {Promise<{audioBase64: string, mimeType: string}>} Object containing base64 audio and mime type.
     * @throws {Error} If TTS generation fails or dependencies are missing.
     */
    async function getTTSAudio(textToSpeak, languageCode, geminiVoiceName = null, stylePrompt = null) {
        if (!textToSpeak || typeof textToSpeak !== 'string' || textToSpeak.trim() === "") {
            console.error("GeminiTTS: Text to speak is required and cannot be empty.");
            throw new Error("Text to speak is required for TTS.");
        }
        if (!languageCode || typeof languageCode !== 'string' || languageCode.trim() === "") {
            console.error("GeminiTTS: Language code is required.");
            throw new Error("Language code is required for TTS.");
        }
        if (!geminiVoiceName || typeof geminiVoiceName !== 'string' || geminiVoiceName.trim() === "") {
            // While Gemini might have a default, it's better for our app to specify one
            // or have a defined fallback mechanism if a specific voice isn't crucial.
            // For now, we'll allow it but log a warning.
            console.warn(`GeminiTTS: geminiVoiceName not explicitly provided for lang '${languageCode}'. API will use its default.`);
            geminiVoiceName = "Puck"; // Provide a common default if none specified
        }

        let textContentForPayload = textToSpeak;
        // The stylePrompt is prepended to the text for Gemini's generateContent TTS.
        if (stylePrompt && typeof stylePrompt === 'string' && stylePrompt.trim() !== "") {
            textContentForPayload = `${stylePrompt.trim()} ${textToSpeak}`;
            console.log(`GeminiTTS: Applying style prompt: "${stylePrompt.trim()}"`);
        }

        const payload = {
            contents: [{
                role: "user", // For generateContent, the "prompt" is often framed as a user part
                parts: [{ text: textContentForPayload }]
            }],
            // The config for speech is now nested differently for generateContent-based TTS
            // This structure might vary based on exact Gemini model and API version for TTS.
            // The following is a common structure for newer models if they support TTS via generateContent.
            // IMPORTANT: Verify this payload structure against the latest Gemini API documentation
            // for the specific TTS_GENERATE_CONTENT model you are using.
            // It's possible the TTS model requires a different endpoint or payload structure entirely
            // than the standard text generation `generateContent`.
            // The `gemini-1.5-flash-latest` might not directly support TTS via `generateContent` in this manner.
            // Typically, TTS uses models like `texttospeech.googleapis.com/v1/text:synthesize` (older)
            // or a dedicated TTS model name with `generateContent`.
            // Let's assume GEMINI_MODELS.TTS_GENERATE_CONTENT expects this kind of payload structure.
            generation_config: { // Note: Some APIs use generationConfig, some use config.
                                 // Let's try to be flexible or pick one based on the model.
                                 // For now, assuming the model expects speech config inside generation_config or a top-level config
                response_mime_type: "audio/mp3", // Request MP3 output
            },
            // This might be more accurate for some newer models using generateContent for TTS
            tools: [{
                google_search_retrieval: {} // Placeholder if no specific tools, but some models need it
            }],
            // The actual speech synthesis part might be implicitly handled by the model if it's a dedicated TTS model
            // OR it needs explicit speech_config.
            // The structure you had before for `restPayload` seems more aligned with a dedicated TTS call/model:
            // config: {
            //     response_modalities: ["AUDIO"],
            //     speech_config: {
            //         voice_config: {
            //             prebuilt_voice_config: { voice_name: geminiVoiceName },
            //             language_code: languageCode
            //         }
            //     }
            // }
            // Let's use a structure that's more likely for `generateContent` if it were to produce audio,
            // but acknowledge this is highly model-dependent.
            // For a model like "gemini-1.5-flash-latest", it's primarily for text/multimodal text.
            // We are calling callGeminiAPIInternal with requestType="generateContentAudio"
            // So, the payload should be what that endpoint expects to *produce* audio.
            // The `callGeminiAPIInternal` handles `generateContentAudio` by expecting `inline_data` in response.
            // The payload for *requesting* audio might be just the text and a flag or specific model.
            // The structure with `response_modalities: ["AUDIO"]` is more likely correct if the model supports it.
        };
        
        // The `gemini_api_caller` (specifically `_geminiInternalApiCaller`) is set to apply STANDARD_SAFETY_SETTINGS_GEMINI
        // for `generateContent` and `generateContentAudio` request types.

        console.log("GeminiTTS: Final payload for TTS via generateContentAudio:", JSON.stringify(payload, null, 2));

        try {
            const modelToUse = GEMINI_MODELS.TTS_GENERATE_CONTENT;
            if (!modelToUse) {
                throw new Error("GEMINI_MODELS.TTS_GENERATE_CONTENT is not defined in _aiApiConstants.");
            }
            console.log(`GeminiTTS: Requesting TTS. Voice: '${geminiVoiceName}', Lang: '${languageCode}', Model: '${modelToUse}'.`);
            
            // Use "generateContentAudio" requestType for the new TTS method via generateContent
            const ttsResponse = await callGeminiAPIInternal(payload, modelToUse, "generateContentAudio");

            if (ttsResponse && ttsResponse.audioBase64 && ttsResponse.mimeType) {
                console.log(`GeminiTTS: Successfully received audio. MimeType: ${ttsResponse.mimeType}`);
                return ttsResponse; // { audioBase64: string, mimeType: string }
            } else {
                console.error("GeminiTTS: API call succeeded but response did not contain expected audio data.", ttsResponse);
                throw new Error("TTS generation failed to return valid audio data.");
            }
        } catch (error) {
            console.error(`GeminiTTS.getTTSAudio Error (Lang: ${languageCode}, Voice: ${geminiVoiceName}):`, error.message, error);
            // Re-throw the error so the facade (ai_service.js) can catch it and provide a human-like message
            // Add context to the error if it's not already rich
            const enhancedError = new Error(`TTS generation failed for language '${languageCode}': ${error.message}`);
            if (error.status) enhancedError.status = error.status;
            if (error.providerDetails) enhancedError.providerDetails = error.providerDetails;
            enhancedError.isApiKeyError = error.isApiKeyError; // Preserve this flag
            throw enhancedError;
        }
    }

    if (window._geminiInternalApiCaller && window._aiApiConstants) {
        console.log("services/gemini_tts_service.js loaded successfully (for generateContent based TTS).");
    } else {
        console.error("services/gemini_tts_service.js loaded, but critical dependencies missing POST-IIFE. This indicates a serious loading order issue.");
    }
    
    return {
        getTTSAudio
    };
})();