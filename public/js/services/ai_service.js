// js/services/ai_service.js (Facade)
window.aiService = (() => {
    'use strict';

    // Dependency checks
    if (!window.aiTextGenerationService) console.error("AI Facade: aiTextGenerationService not loaded!");
    if (!window.geminiTtsService) console.error("AI Facade: geminiTtsService not loaded!");
    if (!window.geminiMultimodalService) console.error("AI Facade: geminiMultimodalService not loaded!");
    if (!window.aiRecapService) console.error("AI Facade: aiRecapService not loaded!"); // For Groq/Together
    if (!window.geminiRecapService) console.error("AI Facade: geminiRecapService not loaded!"); // For Gemini recaps

    const { PROVIDERS } = window._aiApiConstants || { PROVIDERS: {} };

    const defaultRecapError = (errorMessage = "Error generating session debrief.") => ({
        conversationSummary: errorMessage,
        keyTopicsDiscussed: ["N/A"],
        newVocabularyAndPhrases: [],
        goodUsageHighlights: [],
        areasForImprovement: [],
        suggestedPracticeActivities: [],
        overallEncouragement: "An error occurred, but keep practicing!"
    });

    const service = {
        generateTextMessage: async (userText, connector, existingGeminiHistory, preferredProvider = PROVIDERS.GROQ) => {
            if (window.aiTextGenerationService?.generateTextMessage) {
                try {
                    return await window.aiTextGenerationService.generateTextMessage(
                        userText, 
                        connector, 
                        existingGeminiHistory, 
                        preferredProvider
                    );
                } catch (e) {
                    console.error("AI Facade: All text generation attempts ultimately failed.", e.message);
                    return `(Apologies, I'm having trouble connecting right now. Please try again in a moment!)`;
                }
            }
            console.error("AI Facade: aiTextGenerationService is unavailable.");
            return `(Text generation service is critically down.)`;
        },

        generateTextForGeminiCallModal: async (userText, connector, modalCallHistory) => {
            if (window.aiTextGenerationService?.generateTextForGeminiCallModal) {
                return await window.aiTextGenerationService.generateTextForGeminiCallModal(
                    userText, 
                    connector, 
                    modalCallHistory
                );
            }
            console.error("AI Facade: generateTextForGeminiCallModal unavailable.");
            return `(Text input during call failed.)`;
        },

        generateTextFromImageAndText: async (base64ImageString, mimeType, connector, existingGeminiHistory, optionalUserText, preferredProvider = PROVIDERS.TOGETHER) => {
            console.log(`AI Facade: generateTextFromImageAndText. Preferred: ${preferredProvider}`);
            try {
                if (preferredProvider === PROVIDERS.TOGETHER && window.aiTextGenerationService?.generateTextFromImageAndTextOpenAI) {
                    console.log("AI Facade: Attempting image processing with Together AI.");
                    return await window.aiTextGenerationService.generateTextFromImageAndTextOpenAI(
                        base64ImageString, 
                        mimeType, 
                        connector, 
                        existingGeminiHistory, 
                        optionalUserText,
                        PROVIDERS.TOGETHER, 
                        window.TOGETHER_API_KEY
                    );
                }
                // Fallback to Gemini
                if (window.geminiMultimodalService?.generateTextFromImageAndText) {
                    console.log("AI Facade: Attempting image processing with Gemini (multimodal) as primary or fallback.");
                    return await window.geminiMultimodalService.generateTextFromImageAndText(
                        base64ImageString, 
                        mimeType, 
                        connector, 
                        existingGeminiHistory, 
                        optionalUserText
                    );
                }
                throw new Error("All image processing services for text generation are unavailable.");
            } catch (error) {
                console.error(`AI Facade: All image processing attempts failed. Error: ${error.message}`);
                return `(Sorry, I'm having trouble with that image. Error: ${error.message.substring(0,30)}...)`;
            }
        },

        generateSessionRecap: async (fullCallTranscript, connector, preferredProvider = PROVIDERS.GROQ) => {
            console.log(`AI Facade: generateSessionRecap. Preferred: ${preferredProvider}`);
            try {
                // Try Groq/Together through aiRecapService first
                if ((preferredProvider === PROVIDERS.GROQ || preferredProvider === PROVIDERS.TOGETHER) && 
                    window.aiRecapService?.generateSessionRecap) {
                    return await window.aiRecapService.generateSessionRecap(
                        fullCallTranscript, 
                        connector, 
                        preferredProvider
                    );
                }
                // Try Gemini as fallback or if preferred
                if (window.geminiRecapService?.generateSessionRecap) {
                    console.log("AI Facade: Attempting recap with Gemini as primary or fallback.");
                    return await window.geminiRecapService.generateSessionRecap(
                        fullCallTranscript, 
                        connector
                    );
                }
                throw new Error("All recap services are unavailable.");
            } catch (error) {
                console.error(`AI Facade: All recap generation attempts failed. Error: ${error.message}`);
                return defaultRecapError(`Recap generation error: ${error.message.substring(0,50)}...`);
            }
        },

        transcribeAudioToText: async (audioBlob, langHint, preferredProvider = PROVIDERS.GROQ) => {
            console.log(`AI Facade: transcribeAudioToText. Preferred: ${preferredProvider}`);
            try {
                if (preferredProvider === PROVIDERS.GROQ && window._groqSttApiCaller) {
                    console.log("AI Facade: Attempting STT with Groq Whisper.");
                    return await window._groqSttApiCaller(
                        audioBlob, 
                        window._aiApiConstants.GROQ_MODELS.STT, 
                        window.GROQ_API_KEY, 
                        langHint
                    );
                }
                // Fallback to Gemini
                if (window.geminiMultimodalService?.transcribeAudioToText) {
                    console.log("AI Facade: Attempting STT with Gemini as fallback or primary.");
                    const base64Audio = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(audioBlob);
                    });
                    return await window.geminiMultimodalService.transcribeAudioToText(
                        base64Audio, 
                        audioBlob.type, 
                        langHint
                    );
                }
                throw new Error("All STT services unavailable.");
            } catch (error) {
                console.error(`AI Facade: STT failed. Error: ${error.message}`);
                throw error;
            }
        },

        getTTSAudio: async (textToSpeak, languageCode, geminiVoiceName, stylePrompt = null) => {
            if (window.geminiTtsService?.getTTSAudio) {
                return await window.geminiTtsService.getTTSAudio(
                    textToSpeak,
                    languageCode,
                    geminiVoiceName,
                    stylePrompt
                );
            }
            throw new Error("TTS service (Gemini) unavailable.");
        }
    };

    console.log("services/ai_service.js (Facade) loaded with fallback logic.");
    return service;
})();