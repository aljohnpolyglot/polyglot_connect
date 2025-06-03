// js/services/ai_service.js (Facade)
window.aiService = (() => {
    'use strict';

    // --- Robust Dependency Checks ---
    const dependencies = {
        aiTextGenerationService: window.aiTextGenerationService,
        geminiTtsService: window.geminiTtsService,
        geminiMultimodalService: window.geminiMultimodalService,
        aiRecapService: window.aiRecapService,           // For Groq/Together recaps
        geminiRecapService: window.geminiRecapService,     // For Gemini recaps
        _groqSttApiCaller: window._groqSttApiCaller,         // For direct Groq STT
        _aiApiConstants: window._aiApiConstants
    };

    let allDepsMet = true;
    for (const depName in dependencies) {
        if (!dependencies[depName]) {
            console.error(`AI Service Facade: CRITICAL DEPENDENCY MISSING - ${depName}. Some AI functionalities will fail or return default errors.`);
            allDepsMet = false;
        }
    }

    // If critical constants are missing, the service is severely crippled.
    if (!dependencies._aiApiConstants || !dependencies._aiApiConstants.PROVIDERS || !dependencies._aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES) {
        console.error("AI Service Facade: _aiApiConstants or its essential properties (PROVIDERS, HUMAN_LIKE_ERROR_MESSAGES) are missing. Facade will provide default error messages.");
        allDepsMet = false; // Further emphasize the critical nature
        // Ensure a fallback for getRandomHumanError if constants are missing
        window._aiApiConstants = window._aiApiConstants || {}; // Ensure object exists
        window._aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES = window._aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || ["(A technical difficulty occurred. Please try again.)"];
        window._aiApiConstants.PROVIDERS = window._aiApiConstants.PROVIDERS || { GROQ: 'groq', TOGETHER: 'together', GEMINI: 'gemini' }; // Basic fallback
    }
    
    const { PROVIDERS, GROQ_MODELS, GEMINI_MODELS, HUMAN_LIKE_ERROR_MESSAGES } = dependencies._aiApiConstants;
    
    function getRandomHumanError() {
        return HUMAN_LIKE_ERROR_MESSAGES[Math.floor(Math.random() * HUMAN_LIKE_ERROR_MESSAGES.length)];
    }

    // Default recap structure for errors, using the function from ai_constants if available
    const defaultRecapStructure = (providerNameForError = "Service") => ({
        conversationSummary: `Debrief generation failed with ${providerNameForError}. ${getRandomHumanError()}`,
        keyTopicsDiscussed: ["N/A"], newVocabularyAndPhrases: [], goodUsageHighlights: [],
        areasForImprovement: [], suggestedPracticeActivities: [],
        overallEncouragement: "Please try again when the connection is more stable."
    });


    // --- Service Methods ---
    const service = {
        generateTextMessage: async (userText, connector, existingGeminiHistory, preferredProvider = PROVIDERS.GROQ) => {
            if (!dependencies.aiTextGenerationService) return getRandomHumanError();
            try {
                // aiTextGenerationService.generateTextMessage is designed to handle fallbacks and its own errors,
                // re-throwing only if all its internal attempts fail.
                return await dependencies.aiTextGenerationService.generateTextMessage(
                    userText, connector, existingGeminiHistory, preferredProvider
                );
            } catch (e) { // Catch final error re-thrown by aiTextGenerationService
                console.error("AI Facade: generateTextMessage ultimately failed after all provider fallbacks.", e.message);
                return getRandomHumanError();
            }
        },

        generateTextForGeminiCallModal: async (userText, connector, modalCallHistory) => {
            if (!dependencies.aiTextGenerationService) return getRandomHumanError();
            // This specific function in aiTextGenerationService is Gemini-only and handles its errors.
            try {
                return await dependencies.aiTextGenerationService.generateTextForGeminiCallModal(
                    userText, connector, modalCallHistory
                );
            } catch (e) {
                console.error("AI Facade: generateTextForGeminiCallModal failed.", e.message);
                return getRandomHumanError();
            }
        },

        generateTextFromImageAndText: async (base64ImageString, mimeType, connector, conversationHistory, optionalUserText, preferredProvider = PROVIDERS.TOGETHER) => {
            console.log(`AI Facade: generateTextFromImageAndText initiated. Preferred: ${preferredProvider}, Connector: ${connector?.id}`);
            if (!dependencies.aiTextGenerationService && !dependencies.geminiMultimodalService) {
                console.error("AI Facade: No image processing services available.");
                return getRandomHumanError();
            }

            try {
                // Prefer TogetherAI for vision if available via aiTextGenerationService
                if (preferredProvider === PROVIDERS.TOGETHER && dependencies.aiTextGenerationService?.generateTextFromImageAndTextOpenAI) {
                    // The history conversion should ideally happen closer to the call, or ensure it's always OpenAI format
                    // For now, assuming generateTextFromImageAndTextOpenAI can handle or gets converted history
                    console.log("AI Facade: Attempting image processing with Together AI via text gen service.");
                    return await dependencies.aiTextGenerationService.generateTextFromImageAndTextOpenAI(
                        base64ImageString, mimeType, connector, conversationHistory, optionalUserText, PROVIDERS.TOGETHER
                    );
                }
                
                // Fallback to Gemini multimodal service if TogetherAI not preferred or its function unavailable
                if (dependencies.geminiMultimodalService?.generateTextFromImageAndText) {
                    console.log("AI Facade: Attempting image processing with Gemini (multimodal) as primary or fallback.");
                    // Ensure history is in Gemini format if it came from an OpenAI-centric flow
                    const geminiHistory = Array.isArray(conversationHistory) ? conversationHistory : []; // Simplistic, may need conversion
                    return await dependencies.geminiMultimodalService.generateTextFromImageAndText(
                        base64ImageString, mimeType, connector, geminiHistory, optionalUserText
                    );
                }
                throw new Error("No suitable image processing service available in facade.");
            } catch (error) {
                console.error(`AI Facade: All image processing attempts failed. Error: ${error.message}`);
                return getRandomHumanError();
            }
        },

        generateSessionRecap: async (fullCallTranscript, connector, preferredProvider = PROVIDERS.GROQ) => {
            console.log(`AI Facade: generateSessionRecap initiated. Preferred: ${preferredProvider}, Connector: ${connector?.id}`);
            if (!dependencies.aiRecapService && !dependencies.geminiRecapService) {
                console.error("AI Facade: No recap services available.");
                return defaultRecapStructure("Recap Service Unavailable");
            }

            try {
                // Try Groq/Together via aiRecapService first if preferred
                if ((preferredProvider === PROVIDERS.GROQ || preferredProvider === PROVIDERS.TOGETHER) && 
                    dependencies.aiRecapService?.generateSessionRecap) {
                    return await dependencies.aiRecapService.generateSessionRecap(fullCallTranscript, connector, preferredProvider);
                }
                
                // Fallback to Gemini recap service, or if Gemini is preferred
                if (dependencies.geminiRecapService?.generateSessionRecap) {
                    console.log("AI Facade: Attempting recap with Gemini as primary or fallback.");
                    return await dependencies.geminiRecapService.generateSessionRecap(fullCallTranscript, connector);
                }
                
                // Should not happen if at least one recap service was checked as available initially
                throw new Error("Recap service function not found despite initial check.");
            } catch (error) {
                console.error(`AI Facade: Recap generation failed after all attempts. Error: ${error.message}`);
                return defaultRecapStructure(`Recap generation (Provider: ${preferredProvider})`);
            }
        },

        transcribeAudioToText: async (audioBlob, langHint, preferredProvider = PROVIDERS.GROQ) => {
            console.log(`AI Facade: transcribeAudioToText initiated. Preferred: ${preferredProvider}, Lang: ${langHint}`);
             if (!dependencies._groqSttApiCaller && !dependencies.geminiMultimodalService) {
                console.error("AI Facade: No STT services available.");
                throw new Error(`Sorry, I couldn't process the audio right now. ${getRandomHumanError()}`);
            }

            try {
                // Try Groq STT first if preferred and available
                if (preferredProvider === PROVIDERS.GROQ && dependencies._groqSttApiCaller) {
                    if (!window.GROQ_API_KEY || window.GROQ_API_KEY.includes("YOUR_")) {
                        console.warn("Groq API key not configured for STT. Attempting fallback if available.");
                        // Fall through to try Gemini if Groq key is bad
                    } else {
                        console.log("AI Facade: Attempting STT with Groq Whisper.");
                        return await dependencies._groqSttApiCaller(
                            audioBlob, GROQ_MODELS.STT, window.GROQ_API_KEY, langHint
                        );
                    }
                }
                
                // Fallback to Gemini STT, or if Gemini is preferred
                if (dependencies.geminiMultimodalService?.transcribeAudioToText) {
                    console.log("AI Facade: Attempting STT with Gemini.");
                    // _geminiInternalApiCaller handles its own key checks.
                    // Convert Blob to base64 for Gemini multimodal service
                    const base64Audio = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = (err) => reject(new Error("FileReader error for STT: " + err));
                        reader.readAsDataURL(audioBlob);
                    });
                    return await dependencies.geminiMultimodalService.transcribeAudioToText(
                        base64Audio, audioBlob.type, langHint
                    );
                }
                throw new Error("All STT services are unavailable or failed.");
            } catch (error) {
                console.error(`AI Facade: STT ultimately failed. Error: ${error.message}`);
                throw new Error(`Sorry, I couldn't understand that. ${getRandomHumanError()}`); // Re-throw with human message
            }
        },

        getTTSAudio: async (textToSpeak, languageCode, geminiVoiceName, stylePrompt = null) => {
            // Assuming TTS is primarily Gemini for now.
            if (!dependencies.geminiTtsService?.getTTSAudio) {
                console.error("AI Facade: Gemini TTS service (geminiTtsService) is unavailable.");
                throw new Error(`Speech service is currently unavailable. ${getRandomHumanError()}`);
            }
            try {
                return await dependencies.geminiTtsService.getTTSAudio(textToSpeak, languageCode, geminiVoiceName, stylePrompt);
            } catch (error) {
                 console.error(`AI Facade: TTS (Gemini) call failed. Error: ${error.message}`);
                 // The error from geminiTtsService might already be human-like if it catches its own.
                 // Otherwise, wrap it.
                 throw new Error(`I'm having a bit of trouble speaking at the moment. ${getRandomHumanError()}`);
            }
        }
    };

    if (allDepsMet) {
        console.log("services/ai_service.js (Facade) loaded successfully with all core dependencies.");
    } else {
        console.error("services/ai_service.js (Facade) loaded, but one or more CRITICAL dependencies are missing. Functionality will be impaired.");
    }
    return service;
})();