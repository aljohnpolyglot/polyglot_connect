// src/js/services/ai_service.ts
import type {
    AIApiConstants,
    Connector,
    GeminiChatItem,
    TranscriptTurn,
    RecapData,
    GeminiTtsService,
    GeminiTextGenerationService,
    GeminiMultimodalService,
    AiRecapService,
    PolyglotHelpersOnWindow
} from '../types/global.d.ts';

console.log("ai_service.ts: Script execution STARTED (TS Facade).");

export interface AiServiceModule {
    generateTextMessage: ( 
        promptOrText: string,
        connector: Connector, 
        history: GeminiChatItem[] | null | undefined, 
        preferredProvider?: string,
        expectJson?: boolean ,
        context?: 'group-chat' | 'one-on-one' // <<< ADD THIS NEW PARAMETER
    ) => Promise<string | null | object>;
      
    generateTextFromImageAndText: ( 
        base64Data: string,
        mimeType: string, 
        connector: Connector, 
        history: GeminiChatItem[] | null | undefined, 
        prompt?: string, 
        preferredProvider?: string
    ) => Promise<string | null | object>;

    getTTSAudio: ( 
        textToSpeak: string, 
        languageCode?: string, 
        voiceName?: string, 
        stylePrompt?: string | null
    ) => Promise<{ audioBase64: string; mimeType: string } | null >;
    
    generateTextForCallModal?: ( 
        userText: string, 
        connector: Connector, 
        modalCallHistory: GeminiChatItem[] | null | undefined
    ) => Promise<string | null>;
    
    generateSessionRecap: ( 
        fullCallTranscript: TranscriptTurn[], 
        connector: Connector, 
        preferredProvider?: string
    ) => Promise<RecapData>; 

    transcribeAudioToText?: ( 
        base64Audio: string,
        mimeType: string,
        langHint?: string,
        preferredProvider?: string
    ) => Promise<string | null>;

    cleanAndReconstructTranscriptLLM: (
        rawTranscript: TranscriptTurn[],
        connector: Connector,
        userName?: string
    ) => Promise<string>;
}

interface AiServiceDeps {
    aiTextGenerationService?: GeminiTextGenerationService;
    geminiTtsService?: GeminiTtsService;
    geminiMultimodalService?: GeminiMultimodalService;
    aiRecapService?: AiRecapService;
    geminiRecapService?: AiRecapService; 
    _geminiInternalApiCaller?: (payload: any, modelIdentifier: string, requestType?: string) => Promise<any>;
    _openaiCompatibleApiCaller?: (messages: any[], model: string, provider: string, apiKey: string, options: any) => Promise<string | null | ReadableStream>; // Added ReadableStream for completeness
    _groqSttApiCaller?: (audioBlob: Blob, model: string, apiKey: string, langHint?: string) => Promise<string>;
    _aiApiConstants?: AIApiConstants;
    polyglotHelpers?: PolyglotHelpersOnWindow;
}

window.aiService = {} as AiServiceModule; // Placeholder

function initializeActualAiService(): void {
    console.log("ai_service.ts: initializeActualAiService called.");

    const getDeps = (): AiServiceDeps => ({
        aiTextGenerationService: window.aiTextGenerationService, // <<< CORRECTED FROM window.geminiTextGenerationService
        geminiTtsService: window.geminiTtsService,
        geminiMultimodalService: window.geminiMultimodalService,
        aiRecapService: window.aiRecapService,
        geminiRecapService: window.geminiRecapService,
        _geminiInternalApiCaller: (window as any)._geminiInternalApiCaller,
        _openaiCompatibleApiCaller: (window as any).openaiCompatibleApiCaller,
        _groqSttApiCaller: (window as any)._groqSttApiCaller,
        _aiApiConstants: window.aiApiConstants,
        polyglotHelpers: window.polyglotHelpers
    });

    const initialGlobalConstants = window.aiApiConstants;
    if (!initialGlobalConstants?.PROVIDERS || 
        !initialGlobalConstants.HUMAN_LIKE_ERROR_MESSAGES || 
        !initialGlobalConstants.GEMINI_MODELS || // Essential for LLM cleaning
        !initialGlobalConstants.STANDARD_SAFETY_SETTINGS_GEMINI) { // Essential for LLM cleaning
        console.error("AI Service Facade (TS): CRITICAL - window.aiApiConstants or its essential properties are missing. Facade will use dummy methods.");
        
        const getRandomHumanErrorDummy = () => "(Service Error: Essential constants missing for AI Service)";
        const defaultRecapStructureDummy = (): RecapData => ({
            conversationSummary: getRandomHumanErrorDummy(), keyTopicsDiscussed: ["Error"],
            newVocabularyAndPhrases: [], goodUsageHighlights: [], areasForImprovement: [],
            suggestedPracticeActivities: [], overallEncouragement: "Error.",
            sessionId: "error-dummy-" + Date.now(), date: new Date().toLocaleDateString(), duration: "N/A", startTimeISO: null
        });

        const dummyService: AiServiceModule = {
            generateTextMessage: async () => getRandomHumanErrorDummy(),
            generateTextFromImageAndText: async () => getRandomHumanErrorDummy(),
            getTTSAudio: async () => { console.error("Dummy getTTSAudio called due to missing constants."); return null; },
            generateTextForCallModal: async () => getRandomHumanErrorDummy(),
            generateSessionRecap: async () => defaultRecapStructureDummy(),
            transcribeAudioToText: async () => { console.error("Dummy transcribeAudioToText called."); return null; },
            cleanAndReconstructTranscriptLLM: async () => { console.error("Dummy cleanAndReconstructTranscriptLLM called."); return "Error: Transcript cleaning service unavailable due to missing constants."; }
        };
        window.aiService = dummyService; // Assign the fully typed dummy
        document.dispatchEvent(new CustomEvent('aiServiceReady'));
        console.warn("ai_service.ts: 'aiServiceReady' dispatched (DUMMY SERVICE DUE TO MISSING CRITICAL CONSTANTS).");
        return; 
    }

    if (!(window as any)._geminiInternalApiCaller) {
         console.warn("AI Service Facade (TS): _geminiInternalApiCaller is missing. LLM-based transcript cleaning and some Gemini calls will be limited to fallbacks.");
    }
    if (!(window as any).openaiCompatibleApiCaller) {
        console.warn("AI Service Facade (TS): openaiCompatibleApiCaller is missing. Groq/Together calls for recap may be limited to sub-service implementations.");
    }

    window.aiService = ((): AiServiceModule => {
        'use strict';

        const constants = window.aiApiConstants!; 

        const { 
            PROVIDERS: safeProviders, // Use aliases for consistency
            GEMINI_MODELS: safeGeminiModels, 
            GROQ_MODELS: safeGroqModels,
            TOGETHER_MODELS: safeTogetherModels,
            // >>> Define humanErrorMessages with a fallback here <<<
            HUMAN_LIKE_ERROR_MESSAGES: humanErrorMessages = ["(An unexpected AI error occurred.)"], 
            STANDARD_SAFETY_SETTINGS_GEMINI: standardSafetySettings = [],
           MIN_TRANSCRIPT_TURNS_FOR_RECAP // <<< Correctly destructured from aiApiConstantsMIN_TRANSCRIPT_TURNS_FOR_RECAP // <<< Correctly destructured from aiApiConstants
        } = constants;

        const localMinTurnsForRecap = MIN_TRANSCRIPT_TURNS_FOR_RECAP || 4; // <<< CORRECTED: Use the destructured value


        // Further ensure nested models have defaults if constants had the top level but not nested
        if (!safeGeminiModels.UTILITY && safeGeminiModels.TEXT) safeGeminiModels.UTILITY = safeGeminiModels.TEXT;
        if (!safeGroqModels.RECAP && safeGroqModels.TEXT_CHAT) safeGroqModels.RECAP = safeGroqModels.TEXT_CHAT;
        if (!safeTogetherModels.RECAP && safeTogetherModels.TEXT_CHAT) safeTogetherModels.RECAP = safeTogetherModels.TEXT_CHAT;
        if (!safeTogetherModels.VISION && safeTogetherModels.TEXT_CHAT) safeTogetherModels.VISION = "meta-llama/Llama-4-Scout-17B-16E-Instruct";


        function getRandomHumanError(): string {
            // Now humanErrorMessages is guaranteed to be an array
            if (humanErrorMessages.length === 0) return "(Error message unavailable)"; // Should not happen with fallback
            return humanErrorMessages[Math.floor(Math.random() * humanErrorMessages.length)];
        }

        const defaultRecapStructure = (providerNameForError: string = "Service"): RecapData => ({
            conversationSummary: `Debrief generation failed with ${providerNameForError}. ${getRandomHumanError()}`,
            keyTopicsDiscussed: ["N/A"], newVocabularyAndPhrases: [], goodUsageHighlights: [],
            areasForImprovement: [], suggestedPracticeActivities: [],
            overallEncouragement: "Please try again when the connection is more stable.",
            sessionId: "error-recap-" + Date.now(), date: new Date().toLocaleDateString(),
            duration: "N/A", startTimeISO: null
        });

      // REPLACE WITH THIS BLOCK
async function cleanAndReconstructTranscriptLLM_internal(
    rawTranscript: TranscriptTurn[],
    connector: Connector,
    userName: string = "User"
): Promise<string> {
    const functionName = "[AI_Facade][cleanAndReconstructTranscriptLLM]";
    console.log(`${functionName}: START. Cleaning ${rawTranscript?.length} transcript turns.`);

    const currentDeps = getDeps();
    const geminiCaller = currentDeps._geminiInternalApiCaller;
    const currentAiConstants = currentDeps._aiApiConstants;

    // --- ADDED LOGGING for dependency check ---
    if (!geminiCaller || !currentAiConstants?.GEMINI_MODELS?.UTILITY || !currentAiConstants?.STANDARD_SAFETY_SETTINGS_GEMINI) {
        console.warn(`${functionName}: Dependencies for LLM cleaning are missing. geminiCaller: ${!!geminiCaller}, UTILITY_MODEL: ${!!currentAiConstants?.GEMINI_MODELS?.UTILITY}.`);
        const { polyglotHelpers } = currentDeps;
        if (polyglotHelpers?.formatTranscriptForLLM) {
            console.log(`${functionName}: FALLBACK to basic 'polyglotHelpers.formatTranscriptForLLM'.`);
            return polyglotHelpers.formatTranscriptForLLM(rawTranscript, connector.profileName || "Partner", userName);
        }
        console.error(`${functionName}: CRITICAL FALLBACK. No LLM or polyglot helper available. Using raw mapping.`);
        return rawTranscript.map(t => `${t.sender}: ${t.text?.trim() || ""}`).join('\n');
    }

    if (!rawTranscript || rawTranscript.length === 0) {
        console.log(`${functionName}: No conversation turns to clean. Exiting.`);
        return "No conversation to clean.";
    }

    let preliminaryFormattedTranscript = "";
    rawTranscript.forEach(turn => {
        if (!turn || typeof turn.text !== 'string' || turn.text.trim() === "") return;
        let speakerLabel = userName;
        const personaName = connector.profileName || "Partner";
        if (['connector', 'model', 'connector-spoken-output', 'connector-greeting-intent', personaName].includes(turn.sender)) {
            speakerLabel = personaName;
        } else if (['user-audio-transcript', 'user-typed', 'user', userName].includes(turn.sender)) {
            speakerLabel = userName;
        } else if (['system-activity', 'system-message', 'system-call-event'].includes(turn.sender)) {
            speakerLabel = "System";
        } else {
            speakerLabel = `Unknown (${turn.sender})`;
        }
        let textContent = turn.text.trim().replace(/\((?:En|In)\s+[\w\s]+\)\s*:?/gi, '').trim().replace(/\s\s+/g, ' ');
        if (textContent) preliminaryFormattedTranscript += `${speakerLabel}: ${textContent}\n`;
    });

    if (!preliminaryFormattedTranscript.trim()) {
        console.log(`${functionName}: No meaningful content after initial formatting. Exiting.`);
        return "No meaningful content after initial formatting.";
    }

    const cleaningModel = currentAiConstants.GEMINI_MODELS.UTILITY;
    const promptForCleaning = `You are an expert text processor. Your task is to clean and reconstruct a raw voice call transcript. The transcript may contain fragmented words and incorrect spacing due to real-time transcription. The dialogue is between "${userName}" and "${connector.profileName}" (who primarily speaks ${connector.language}). Please rewrite the following raw transcript into a clean, coherent, and readable dialogue format. Combine fragmented words into whole words. Ensure correct spacing and punctuation. Maintain the original speaker turns and the language used by each speaker as much as possible. Do NOT add any commentary or explanation. ONLY output the cleaned dialogue. Raw Transcript: --- ${preliminaryFormattedTranscript.trim()} --- Cleaned Dialogue:`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: promptForCleaning }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 3000 },
        safetySettings: currentAiConstants.STANDARD_SAFETY_SETTINGS_GEMINI,
    };

    try {
        // --- ADDED LOGGING for the API call ---
        console.log(`${functionName}: ATTEMPTING call to Gemini LLM with model [${cleaningModel}].`);
        const cleanedTranscriptResponse = await geminiCaller(payload, cleaningModel, "generateContent");
        if (typeof cleanedTranscriptResponse === 'string' && cleanedTranscriptResponse.trim()) {
            console.log(`${functionName}: SUCCESS from Gemini LLM.`);
            return cleanedTranscriptResponse.trim();
        }
        throw new Error("LLM cleaning returned non-string or empty response.");
    } catch (error: any) {
        // --- ADDED LOGGING for the failure and fallback ---
        console.error(`${functionName}: ERROR during Gemini LLM call: ${error.message || error}.`);
        const { polyglotHelpers } = currentDeps;
        if (polyglotHelpers?.formatTranscriptForLLM) {
            console.log(`${functionName}: FALLBACK to basic 'polyglotHelpers.formatTranscriptForLLM'.`);
            return polyglotHelpers.formatTranscriptForLLM(rawTranscript, connector.profileName || "Partner", userName);
        }
        console.error(`${functionName}: CRITICAL FALLBACK. Returning preliminary formatted transcript as last resort.`);
        return preliminaryFormattedTranscript.trim();
    }
}

        function base64ToBlob(base64: string, mimeType: string = 'application/octet-stream'): Blob {
            try {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: mimeType });
            } catch (e: any) {
                console.error("base64ToBlob conversion error:", e.message);
                // Return a small, empty blob of a common type to prevent further errors if atob fails (e.g. invalid char)
                return new Blob([], {type: "application/octet-stream"}); 
            }
        }

        const service: AiServiceModule = {
            cleanAndReconstructTranscriptLLM: cleanAndReconstructTranscriptLLM_internal,
            
            generateTextMessage: async (
                promptOrText: string, 
                connector: Connector, 
                history: GeminiChatItem[] | null | undefined, 
                preferredProvider = safeProviders.GROQ,
                expectJson: boolean = false,
                context: 'group-chat' | 'one-on-one' = 'one-on-one' // <<< ADD IT HERE with a default
            ): Promise<string | null | object> => {
                const currentDeps = getDeps();
                const subService = currentDeps.aiTextGenerationService;
                if (!subService?.generateTextMessage) {
                    console.error("AI Facade (TS): aiTextGenerationService.generateTextMessage unavailable.");
                    return getRandomHumanError();
                }
                try {
                    return await subService.generateTextMessage(promptOrText, connector, history || [], preferredProvider, expectJson);
                } catch (e: any) { 
                    console.error("AI Facade (TS): generateTextMessage failed:", e.message);
                    return getRandomHumanError();
                }
            },

            generateTextForCallModal: async (userText, connector, modalCallHistory) => {
                const currentDeps = getDeps();
                const subService = currentDeps.aiTextGenerationService;
                if (!subService?.generateTextForCallModal) {
                    console.error("AI Facade (TS): aiTextGenerationService.generateTextForCallModal unavailable.");
                    return getRandomHumanError();
                }
                try {
                    return await subService.generateTextForCallModal(userText, connector, modalCallHistory || []);
                } catch (e: any) {
                    console.error("AI Facade (TS): generateTextForCallModal failed:", e.message);
                    return getRandomHumanError();
                }
            },

            generateTextFromImageAndText: async (base64Data, mimeType, connector, history, prompt, preferredProvider = safeProviders.TOGETHER ) => {
                console.log(`AI Facade (TS): generateTextFromImageAndText. Preferred: ${preferredProvider}. Attempting Together AI.`); // Modified log
                const currentDeps = getDeps();
                const mmService = currentDeps.geminiMultimodalService;
                // Cast to include the specific OpenAI method
                const openAiVisionService = currentDeps.aiTextGenerationService as (GeminiTextGenerationService & { generateTextFromImageAndTextOpenAI?: Function });


                console.log("AI Facade (TS) - TOGETHER CHECK: Inspecting currentDeps.aiTextGenerationService:");
                console.log(currentDeps.aiTextGenerationService); 
                if (currentDeps.aiTextGenerationService) {
                    console.log(`AI Facade (TS) - TOGETHER CHECK: Method 'generateTextFromImageAndTextOpenAI' on currentDeps.aiTextGenerationService is: ${typeof (currentDeps.aiTextGenerationService as any).generateTextFromImageAndTextOpenAI}`);
                }
                // >>> THIS IS THE CRITICAL DECISION POINT <<<
                try {
                    // Check if the Together AI path is viable
                    if (preferredProvider === safeProviders.TOGETHER && 
                        openAiVisionService?.generateTextFromImageAndTextOpenAI && // Is the method present on the service?
                        window.TOGETHER_API_KEY && !window.TOGETHER_API_KEY.includes("YOUR_") && // Is the API key configured?
                        currentDeps._aiApiConstants?.TOGETHER_MODELS?.VISION // Is the vision model ID configured?
                        ) {
                        console.log(`AI Facade (TS): Conditions met for Together AI vision. Calling openAiVisionService.generateTextFromImageAndTextOpenAI.`);
                        return await openAiVisionService.generateTextFromImageAndTextOpenAI(base64Data, mimeType, connector, history || [], prompt, safeProviders.TOGETHER);
                    }
                    
                    // If conditions for Together AI not met, log why and prepare for fallback
                    console.warn(`AI Facade (TS): Conditions for Together AI vision not met. 
                        Preferred: ${preferredProvider === safeProviders.TOGETHER}, 
                        Method Exists: ${!!openAiVisionService?.generateTextFromImageAndTextOpenAI},
                        API Key OK: ${!!(window.TOGETHER_API_KEY && !window.TOGETHER_API_KEY.includes("YOUR_"))},
                        Vision Model Configured: ${!!currentDeps._aiApiConstants?.TOGETHER_MODELS?.VISION}. 
                        Falling back.`);

                    // Fallback to Gemini
                    if (mmService?.generateTextFromImageAndText) {
                       console.log(`AI Facade (TS): Falling back to Gemini multimodal service for image to text.`);
                       return await mmService.generateTextFromImageAndText(base64Data, mimeType, connector, history || [], prompt);
                    }
                    
                    // If neither path is available
                    throw new Error("No suitable image processing service available (Neither Together AI conditions met nor Gemini fallback).");

                } catch (error: any) {
                    console.error(`AI Facade (TS): Image processing failed. Provider attempted: ${preferredProvider}. Error: ${error.message}`, error);
                    // If the error came from a specific provider call, it might have already fallen back,
                    // or we might attempt a final fallback here if the initial preferred provider failed.
                    if (preferredProvider === safeProviders.TOGETHER && mmService?.generateTextFromImageAndText) {
                        console.warn(`AI Facade (TS): Together AI vision failed. Attempting final fallback to Gemini multimodal.`);
                        try {
                            return await mmService.generateTextFromImageAndText(base64Data, mimeType, connector, history || [], prompt);
                        } catch (geminiError: any) {
                            console.error(`AI Facade (TS): Gemini multimodal fallback also failed after Together AI error. Gemini Error: ${geminiError.message}`);
                            return getRandomHumanError(); // Final error
                        }
                    }
                    return getRandomHumanError(); // General error if no fallback path taken
                }
            },
            
          // src/js/services/ai_service.ts

// <<< START OF REPLACEMENT FUNCTION >>>
generateSessionRecap: async (
    fullCallTranscript: TranscriptTurn[],
    connector: Connector,
    preferredProvider = safeProviders.GROQ
): Promise<RecapData> => {
    const functionName = "[AI_Facade][generateSessionRecap]";
    console.log(`${functionName}: START. Preferred: [${preferredProvider}], Transcript turns: ${fullCallTranscript?.length}`);
    const currentDeps = getDeps();

    // 1. --- LOGGING: Validate dependencies and input ---
    if (!currentDeps.aiRecapService?.generateSessionRecap || !currentDeps.geminiRecapService?.generateSessionRecap || !connector?.id) {
        console.error(`${functionName}: ABORT. Critical sub-service (aiRecapService, geminiRecapService) or connector data is missing.`);
        return defaultRecapStructure("Internal Service Configuration Error");
    }
    if (!fullCallTranscript || fullCallTranscript.length < localMinTurnsForRecap) {
        console.warn(`${functionName}: Transcript too short. Returning minimal structure.`);
        return {
            conversationSummary: "The conversation was too short to generate a detailed summary.",
            keyTopicsDiscussed: ["N/A - Short conversation"],
            newVocabularyAndPhrases: [], goodUsageHighlights: [], areasForImprovement: [],
            suggestedPracticeActivities: ["Continue practicing!"],
            overallEncouragement: "Keep up the great work! Try a longer chat next time for a more detailed debrief!",
            sessionId: `short-convo-${connector.id}-${Date.now()}`,
            connectorId: connector.id, connectorName: connector.profileName,
            date: new Date().toLocaleDateString(), duration: "N/A (short)", startTimeISO: null
        };
    }

     // 2. --- LOGGING: Clean the transcript ONCE ---
    let cleanedTranscriptText: string;
    try {
        console.log(`${functionName}: STEP 1 - Cleaning transcript using LLM.`);
        cleanedTranscriptText = await cleanAndReconstructTranscriptLLM_internal(fullCallTranscript, connector, "User");
        console.log(`${functionName}: STEP 1 - Transcript cleaning SUCCEEDED.`);
    } catch (cleanError: any) {
        console.warn(`${functionName}: STEP 1 - LLM Transcript cleaning FAILED: ${cleanError.message}. Using basic helper as fallback.`);
        cleanedTranscriptText = currentDeps.polyglotHelpers?.formatTranscriptForLLM(fullCallTranscript, connector.profileName || "Partner", "User") || "Transcript formatting failed.";
    }

    // 3. --- LOGGING: Define provider sequence and iterate with fallbacks ---
    const providerSequence = [...new Set([preferredProvider, safeProviders.GROQ, safeProviders.TOGETHER, safeProviders.GEMINI])];
    console.log(`${functionName}: STEP 2 - Starting recap generation with provider sequence:`, providerSequence);
    
    let recapResult: RecapData | null = null;
    let providerUsed: string | null = null;

    for (const provider of providerSequence) {
        console.log(`${functionName}: --> ATTEMPTING recap with provider: [${provider}]`);
        try {
            if (provider === safeProviders.GEMINI) {
                recapResult = await currentDeps.geminiRecapService.generateSessionRecap(cleanedTranscriptText, connector);
            } else { // Groq or Together
                recapResult = await currentDeps.aiRecapService.generateSessionRecap(cleanedTranscriptText, connector, provider);
            }

            if (recapResult && recapResult.conversationSummary && !recapResult.conversationSummary.includes("failed")) {
                providerUsed = provider;
                console.log(`${functionName}: <-- SUCCESS! Recap generated with [${providerUsed}].`);
                break; // Success, exit the loop
            }
            console.warn(`${functionName}: <-- FAILED. Provider [${provider}] returned a failed or malformed recap. Trying next provider.`);
            recapResult = null; // Reset for next attempt
        } catch (error: any) {
            console.error(`${functionName}: <-- ERROR. Provider [${provider}] threw an exception: ${error.message}. Trying next provider.`);
            recapResult = null; // Ensure reset on error
        }
    }

   // 4. --- LOGGING: Finalize and return the result ---
   if (recapResult && providerUsed) {
    console.log(`${functionName}: FINAL RESULT - Successfully returning recap from [${providerUsed}].`);
    return {
        ...defaultRecapStructure(providerUsed),
        ...recapResult,
        sessionId: `recap-${connector.id}-${Date.now()}`,
        connectorId: connector.id,
        connectorName: connector.profileName,
    };
} else {
    console.error(`${functionName}: FINAL RESULT - All recap provider attempts failed. Returning default error structure.`);
    return defaultRecapStructure("All Recap Services");
}
},
// <<< END OF REPLACEMENT FUNCTION >>>


        // REPLACE WITH THIS BLOCK
transcribeAudioToText: async (base64Audio, mimeType, langHint, preferredProvider = safeProviders.GROQ) => {
    const functionName = "[AI_Facade][transcribeAudioToText]";
    console.log(`${functionName}: START. Preferred provider: [${preferredProvider}]. Lang hint: ${langHint || 'none'}.`);

    const currentDeps = getDeps();
    const mmService = currentDeps.geminiMultimodalService;
    const groqCaller = currentDeps._groqSttApiCaller;
    const localConstants = currentDeps._aiApiConstants || constants;

    if (!groqCaller && !mmService?.transcribeAudioToText) {
        console.error(`${functionName}: ABORT. No STT services (Groq or Gemini) are available.`);
        return getRandomHumanError();
    }
    
    // --- MODIFIED LOGIC & LOGGING for clarity ---
    try {
        // 1. Attempt Preferred Provider: Groq
        if (preferredProvider === safeProviders.GROQ && groqCaller) {
            console.log(`${functionName}: Checking conditions for preferred provider [${safeProviders.GROQ}]...`);
            const groqApiKey = window.GROQ_API_KEY;
            const groqSttModel = localConstants.GROQ_MODELS?.STT;
            const isKeyConfigured = groqApiKey && !groqApiKey.includes("YOUR_");
            const isModelConfigured = !!groqSttModel;

            if (isKeyConfigured && isModelConfigured) {
                 // This inner try-catch handles the specific failure of the preferred provider
                try {
                    console.log(`${functionName}: Conditions MET. ATTEMPTING call to [Groq STT] with model [${groqSttModel}].`);
                    const audioBlob = base64ToBlob(base64Audio, mimeType);
                    if (audioBlob.size === 0) {
                        console.warn(`${functionName}: Groq call skipped; base64-to-blob conversion resulted in an empty blob.`);
                    } else {
                         return await groqCaller(audioBlob, groqSttModel, groqApiKey, langHint);
                    }
                } catch (groqError: any) {
                    console.error(`${functionName}: ERROR during [Groq STT] call: ${groqError.message}. Proceeding to fallback.`);
                }
            } else {
                console.warn(`${functionName}: Conditions NOT MET for [${safeProviders.GROQ}]. Key: ${isKeyConfigured}, Model: ${isModelConfigured}.`);
            }
        }

        // 2. Fallback Provider: Gemini
        console.log(`${functionName}: FALLBACK. Checking conditions for [${safeProviders.GEMINI}]...`);
        if (mmService?.transcribeAudioToText) {
            console.log(`${functionName}: Conditions MET. ATTEMPTING call to [Gemini STT].`);
            return await mmService.transcribeAudioToText(base64Audio, mimeType, langHint);
        }

        // 3. If no providers were successful or available
        throw new Error("No suitable STT service was available or all attempts failed.");

    } catch (error: any) {
        console.error(`${functionName}: FINAL ERROR. All STT attempts failed. Error: ${error.message}`);
        return getRandomHumanError();
    }
},

            getTTSAudio: async (textToSpeak, languageCode, voiceName, stylePrompt = null) => {
                const currentDeps = getDeps();
                const ttsService = currentDeps.geminiTtsService;
                if (!ttsService?.getTTSAudio) {
                    console.error("AI Facade (TS): Gemini TTS service unavailable.");
                    return null; 
                }
                try {
                    return await ttsService.getTTSAudio(textToSpeak, languageCode || "en-US", voiceName, stylePrompt);
                } catch (error: any) {
                    console.error(`AI Facade (TS): TTS (Gemini) call failed: ${error.message}`);
                    return null;
                }
            },
        };
        console.log("ai_service.ts: Facade IIFE (TS) finished, returning service object.");
        return service;
    })(); // END OF IIFE

    if (window.aiService && typeof window.aiService.generateTextMessage === 'function') {
        console.log("ai_service.ts: SUCCESSFULLY assigned and populated window.aiService.");
    } else {
        console.error("ai_service.ts: CRITICAL ERROR - window.aiService not correctly formed or key method missing.");
    }
    document.dispatchEvent(new CustomEvent('aiServiceReady'));
    console.log("ai_service.ts: 'aiServiceReady' event dispatched (status logged above).");

} // END OF initializeActualAiService

// In ai_service.ts
const aiServiceDependencies = [
    'aiApiConstantsReady',
    'geminiTtsServiceReady',
    // 'geminiTextGenerationServiceReady', // OLD NAME
    'aiTextGenerationServiceReady',   // <<< CORRECTED/PREFERRED EVENT NAME
    'geminiMultimodalServiceReady',
    'aiRecapServiceReady', 
    'geminiApiCallerLogicReady', 
    'polyglotHelpersReady',
    'openaiCompatibleApiCallerReady'
    // Removed duplicate 'aiTextGenerationServiceReady' if it was there
];
const aisMetDependenciesLog: { [key: string]: boolean } = {};
aiServiceDependencies.forEach(dep => aisMetDependenciesLog[dep] = false);
let aisDepsMetCount = 0;

function checkAndInitAiService(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        let detail = "Verification not applicable or failed."; // Default detail

        switch(receivedEventName) {
            case 'aiApiConstantsReady': 
                verified = !!(window.aiApiConstants?.PROVIDERS && window.aiApiConstants.GEMINI_MODELS); 
                detail = `aiApiConstants.PROVIDERS: ${!!window.aiApiConstants?.PROVIDERS}, .GEMINI_MODELS: ${!!window.aiApiConstants?.GEMINI_MODELS}`;
                break;
            case 'geminiTtsServiceReady': 
                verified = !!(window.geminiTtsService?.getTTSAudio); 
                detail = `window.geminiTtsService.getTTSAudio type: ${typeof window.geminiTtsService?.getTTSAudio}`;
                break;
            case 'aiTextGenerationServiceReady': // <<< RENAMED & UPDATED CHECK
                verified = !!(window.aiTextGenerationService && 
                              typeof window.aiTextGenerationService.generateTextMessage === 'function' &&
                              typeof window.aiTextGenerationService.generateTextFromImageAndTextOpenAI === 'function');
                detail = `window.aiTextGenerationService methods: .generateTextMessage is ${typeof window.aiTextGenerationService?.generateTextMessage}, .generateTextFromImageAndTextOpenAI is ${typeof window.aiTextGenerationService?.generateTextFromImageAndTextOpenAI}`;
                break;
            case 'geminiMultimodalServiceReady': 
                verified = !!(window.geminiMultimodalService && 
                              (typeof window.geminiMultimodalService.transcribeAudioToText === 'function' || 
                               typeof window.geminiMultimodalService.generateTextFromImageAndText === 'function'));
                detail = `window.geminiMultimodalService: .transcribeAudioToText is ${typeof window.geminiMultimodalService?.transcribeAudioToText}, .generateTextFromImageAndText is ${typeof window.geminiMultimodalService?.generateTextFromImageAndText}`;
                break;
            case 'aiRecapServiceReady': 
                verified = !!(window.aiRecapService?.generateSessionRecap); 
                detail = `window.aiRecapService.generateSessionRecap type: ${typeof window.aiRecapService?.generateSessionRecap}`;
                break;
            // case 'geminiRecapServiceReady': // This was commented out in your dependency list, keep it commented or remove if not used
            //     verified = !!(window.geminiRecapService?.generateSessionRecap); 
            //     detail = `window.geminiRecapService.generateSessionRecap type: ${typeof window.geminiRecapService?.generateSessionRecap}`;
            //     break;
            case 'geminiApiCallerLogicReady': 
                verified = !!(window as any)._geminiInternalApiCaller; 
                detail = `window._geminiInternalApiCaller type: ${typeof (window as any)._geminiInternalApiCaller}`;
                break;
            case 'polyglotHelpersReady': 
                verified = !!window.polyglotHelpers?.formatTranscriptForLLM; 
                detail = `window.polyglotHelpers.formatTranscriptForLLM type: ${typeof window.polyglotHelpers?.formatTranscriptForLLM}`;
                break;
            case 'openaiCompatibleApiCallerReady': 
                verified = !!(window as any).openaiCompatibleApiCaller; 
                detail = `window.openaiCompatibleApiCaller type: ${typeof (window as any).openaiCompatibleApiCaller}`;
                break;
            default: 
                console.warn(`[AI_SVC_DEPS] AiService_EVENT (TS): Unknown event ${receivedEventName} in checkAndInitAiService.`); 
                return;
        }

        console.log(`[AI_SVC_DEPS] Event '${receivedEventName}' verification: ${verified}. Detail: ${detail}`);
        if (verified && !aisMetDependenciesLog[receivedEventName]) {
            aisMetDependenciesLog[receivedEventName] = true;
            aisDepsMetCount++;
            console.log(`[AI_SVC_DEPS] Event '${receivedEventName}' confirmed MET. Count: ${aisDepsMetCount}/${aiServiceDependencies.length}`);
        } else if (!verified) {
             console.warn(`[AI_SVC_DEPS] Event '${receivedEventName}' FAILED verification for AiService.`);
        }
    }

    if (aisDepsMetCount === aiServiceDependencies.length) {
        console.log('[AI_SVC_DEPS] AiService (TS): All dependencies for AiServiceFacade met. Initializing.');
        initializeActualAiService();
    } else {
        // console.log(`[AI_SVC_DEPS] AiService still waiting. Met: ${aisDepsMetCount}, Needed: ${aiServiceDependencies.length}`);
    }
}

console.log('AiService_SETUP (TS): Starting pre-check for AiServiceFacade dependencies.');
aisDepsMetCount = 0; 
Object.keys(aisMetDependenciesLog).forEach(k => aisMetDependenciesLog[k] = false);
let aisAllPreloadedAndVerified = true;

aiServiceDependencies.forEach(eventName => {
    let isVerified = false;
    let detail = "Pre-check verification not applicable or failed."; // Default detail

    switch(eventName) {
        case 'aiApiConstantsReady': 
            isVerified = !!(window.aiApiConstants?.PROVIDERS && window.aiApiConstants.GEMINI_MODELS); 
            detail = `aiApiConstants.PROVIDERS: ${!!window.aiApiConstants?.PROVIDERS}, .GEMINI_MODELS: ${!!window.aiApiConstants?.GEMINI_MODELS}`;
            break;
        case 'geminiTtsServiceReady': 
            isVerified = !!(window.geminiTtsService?.getTTSAudio); 
            detail = `window.geminiTtsService.getTTSAudio type: ${typeof window.geminiTtsService?.getTTSAudio}`;
            break;
        case 'aiTextGenerationServiceReady': // <<< RENAMED & UPDATED CHECK
            isVerified = !!(window.aiTextGenerationService && 
                            typeof window.aiTextGenerationService.generateTextMessage === 'function' &&
                            typeof window.aiTextGenerationService.generateTextFromImageAndTextOpenAI === 'function');
            detail = `window.aiTextGenerationService methods: .generateTextMessage is ${typeof window.aiTextGenerationService?.generateTextMessage}, .generateTextFromImageAndTextOpenAI is ${typeof window.aiTextGenerationService?.generateTextFromImageAndTextOpenAI}`;
            break;
        case 'geminiMultimodalServiceReady': 
            isVerified = !!(window.geminiMultimodalService && 
                            (typeof window.geminiMultimodalService.transcribeAudioToText === 'function' || 
                             typeof window.geminiMultimodalService.generateTextFromImageAndText === 'function'));
            detail = `window.geminiMultimodalService: .transcribeAudioToText is ${typeof window.geminiMultimodalService?.transcribeAudioToText}, .generateTextFromImageAndText is ${typeof window.geminiMultimodalService?.generateTextFromImageAndText}`;
            break;
        case 'aiRecapServiceReady': 
            isVerified = !!(window.aiRecapService?.generateSessionRecap); 
            detail = `window.aiRecapService.generateSessionRecap type: ${typeof window.aiRecapService?.generateSessionRecap}`;
            break;
        // case 'geminiRecapServiceReady': // Keep commented if it was before
        //     isVerified = !!(window.geminiRecapService?.generateSessionRecap); 
        //     detail = `window.geminiRecapService.generateSessionRecap type: ${typeof window.geminiRecapService?.generateSessionRecap}`;
        //     break;
        case 'geminiApiCallerLogicReady': 
            isVerified = !!(window as any)._geminiInternalApiCaller; 
            detail = `window._geminiInternalApiCaller type: ${typeof (window as any)._geminiInternalApiCaller}`;
            break;
        case 'polyglotHelpersReady': 
            isVerified = !!window.polyglotHelpers?.formatTranscriptForLLM; 
            detail = `window.polyglotHelpers.formatTranscriptForLLM type: ${typeof window.polyglotHelpers?.formatTranscriptForLLM}`;
            break;
        case 'openaiCompatibleApiCallerReady': 
            isVerified = !!(window as any).openaiCompatibleApiCaller; 
            detail = `window.openaiCompatibleApiCaller type: ${typeof (window as any).openaiCompatibleApiCaller}`;
            break;
        default:
            console.warn(`[AI_SVC_DEPS] AiService_PRECHECK (TS): Unknown event name in dependency array: ${eventName}`);
            isVerified = false; // Ensure it's false for unknown deps
            break;
    }

    console.log(`[AI_SVC_DEPS] Pre-check: Dependency '${eventName}'. Verified: ${isVerified}. Detail: ${detail}`);
    if (isVerified) {
        // console.log(`[AI_SVC_DEPS] AiService_PRECHECK (TS): Dependency '${eventName}' ALREADY MET for AiServiceFacade.`); // Original log
        if(!aisMetDependenciesLog[eventName]) { 
            aisMetDependenciesLog[eventName] = true; 
            aisDepsMetCount++; 
        }
    } else {
        aisAllPreloadedAndVerified = false; // This variable name was from your provided code
        console.log(`[AI_SVC_DEPS] AiService_PRECHECK (TS): Dependency '${eventName}' not ready for AiServiceFacade. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitAiService(eventName), { once: true });
    }
});

if (aisAllPreloadedAndVerified && aisDepsMetCount === aiServiceDependencies.length) {
    console.log('AiService (TS): All dependencies for AiServiceFacade pre-verified. Initializing directly.');
    initializeActualAiService();
} else if (!aisAllPreloadedAndVerified) {
    console.log(`AiService (TS): Waiting for ${aiServiceDependencies.length - aisDepsMetCount} dependency event(s) for AiServiceFacade.`);
} else if (aiServiceDependencies.length === 0) { // Should not happen with current list
    initializeActualAiService();
}

console.log("ai_service.ts: Script execution FINISHED (TS Facade).");