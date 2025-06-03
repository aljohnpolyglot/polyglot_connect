// js/services/gemini_service.js (Facade)
// This module acts as a public interface (facade) for all Gemini-related services.
// It delegates calls to specialized service modules.

window.geminiService = (() => {
    'use strict';

    // Check if the specialized service modules are loaded
    // These checks are important because this facade depends on them.
    if (!window.geminiTtsService || typeof window.geminiTtsService.getTTSAudio !== 'function') {
        console.error("Gemini Facade: geminiTtsService not available or missing getTTSAudio.");
    }
    if (!window.geminiTextGenerationService || typeof window.geminiTextGenerationService.generateTextMessage !== 'function') {
        console.error("Gemini Facade: geminiTextGenerationService not available or missing generateTextMessage.");
    }
    if (!window.geminiMultimodalService || typeof window.geminiMultimodalService.generateTextFromAudioForCallModal !== 'function') {
        console.error("Gemini Facade: geminiMultimodalService not available or missing generateTextFromAudioForCallModal.");
    }
    if (!window.geminiRecapService || typeof window.geminiRecapService.generateSessionRecap !== 'function') {
        console.error("Gemini Facade: geminiRecapService not available or missing generateSessionRecap.");
    }

    // The actual callGeminiAPIInternal is now in gemini_core_api.js and not directly exposed by this facade.

    const service = {
        getTTSAudio: async (textToSpeak, languageCode, geminiVoiceName) => {
            if (window.geminiTtsService?.getTTSAudio) {
                return window.geminiTtsService.getTTSAudio(textToSpeak, languageCode, geminiVoiceName);
            }
            console.error("Gemini Facade: TTS service unavailable for getTTSAudio.");
            throw new Error("TTS service unavailable.");
        },

        generateTextMessage: async (userText, connector, existingGeminiHistory) => {
            if (window.geminiTextGenerationService?.generateTextMessage) {
                return window.geminiTextGenerationService.generateTextMessage(userText, connector, existingGeminiHistory);
            }
            console.error("Gemini Facade: Text generation service unavailable for generateTextMessage.");
            return `(Text generation service error. Please try again.)`;
        },

        generateTextForCallModal: async (userText, connector, modalCallHistory) => {
            if (window.geminiTextGenerationService?.generateTextForCallModal) {
                return window.geminiTextGenerationService.generateTextForCallModal(userText, connector, modalCallHistory);
            }
            console.error("Gemini Facade: Text generation service unavailable for generateTextForCallModal.");
            return `(Call text input service error. Please try again.)`;
        },

        generateTextFromAudioForCallModal: async (base64AudioString, mimeType, connector, modalCallHistory) => {
            if (window.geminiMultimodalService?.generateTextFromAudioForCallModal) {
                return window.geminiMultimodalService.generateTextFromAudioForCallModal(base64AudioString, mimeType, connector, modalCallHistory);
            }
            console.error("Gemini Facade: Multimodal service unavailable for generateTextFromAudioForCallModal.");
            return `(Audio processing service error. Please try again.)`;
        },

        generateTextFromImageAndText: async (base64ImageString, mimeType, connector, existingGeminiHistory, optionalUserText) => {
            if (window.geminiMultimodalService?.generateTextFromImageAndText) {
                return window.geminiMultimodalService.generateTextFromImageAndText(base64ImageString, mimeType, connector, existingGeminiHistory, optionalUserText);
            }
            console.error("Gemini Facade: Multimodal service unavailable for generateTextFromImageAndText.");
            return `(Image processing service error. Please try again.)`;
        },

        generateSessionRecap: async (fullCallTranscript, connector) => {
            if (window.geminiRecapService?.generateSessionRecap) {
                return window.geminiRecapService.generateSessionRecap(fullCallTranscript, connector);
            }
            console.error("Gemini Facade: Recap service unavailable for generateSessionRecap.");
            return { topics: ["Recap service error."], vocabulary: [], focusAreas: [] };
        }
    };

    console.log("services/gemini_service.js (Facade) loaded. window.geminiService object defined.");
    return service;
})();