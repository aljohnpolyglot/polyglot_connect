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
        expectJson?: boolean,
        context?: 'group-chat' | 'one-on-one',
        abortSignal?: AbortSignal // <<< ADDED THIS
    ) => Promise<string | null | object>;
      
    generateTextFromImageAndText: ( 
        base64Data: string,
        mimeType: string, 
        connector: Connector, 
        history: GeminiChatItem[] | null | undefined, 
        prompt?: string, 
        preferredProvider?: string,
        abortSignal?: AbortSignal // <<< ADDED THIS
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
        console.groupCollapsed(`%c🧹 [Transcript Cleaner] S+ Request Started`, 'color: #6f42c1; font-weight: bold; font-size: 14px;');

        const currentDeps = getDeps();
        if (!rawTranscript || rawTranscript.length === 0) {
            console.log(`${functionName}: No conversation turns to clean.`);
            console.groupEnd();
            return "No conversation to clean.";
        }

        // --- 1. Basic Formatting (Done Once) ---
        let preliminaryFormattedTranscript = "";
        rawTranscript.forEach(turn => {
            // ... (This part of the code remains the same)
            if (!turn || typeof turn.text !== 'string' || turn.text.trim() === "") return;
            let speakerLabel = userName;
            const personaName = connector.profileName || "Partner";
            if (['connector', 'model', 'connector-spoken-output', 'connector-greeting-intent', personaName].includes(turn.sender)) {
                speakerLabel = personaName;
            } else if (['user-audio-transcript', 'user-typed', 'user', userName].includes(turn.sender)) {
                speakerLabel = userName;
            } else {
                speakerLabel = `Unknown (${turn.sender})`;
            }
            let textContent = turn.text.trim().replace(/\((?:En|In)\s+[\w\s]+\)\s*:?/gi, '').trim().replace(/\s\s+/g, ' ');
            if (textContent) preliminaryFormattedTranscript += `${speakerLabel}: ${textContent}\n`;
        });

        if (!preliminaryFormattedTranscript.trim()) {
            console.log(`${functionName}: No meaningful content after initial formatting.`);
            console.groupEnd();
            return "No meaningful content after initial formatting.";
        }

        // --- THIS IS THE CORRECTED PROMPT ---
      // --- THIS IS THE ENHANCED PROMPT TO FIX ORDERING ---
        // --- THIS IS THE ULTIMATE MULTI-LANGUAGE ENHANCED PROMPT ---
        const cleaningPrompt = `You are an expert dialogue editor. Your task is to reconstruct a raw, and potentially out-of-order, voice call transcript. The dialogue is between "${userName}" and "${connector.profileName}".

Your process MUST follow two critical steps:
1.  **Fix Content and Formatting:**
    *   The transcript contains fragmented words and incorrect spacing due to real-time transcription. You MUST combine these fragments into whole words.
    *   This applies to ALL languages. For example:
        *   **Tagalog:** "Ayo s n ama n" must become "Ayos naman". "kam ust a" must become "kamusta".
        *   **English:** "how are y ou" must become "how are you".
        *   **Spanish:** "Com o est as" must become "Como estas".
        *   **French:** "c 'est" must become "c'est". "je ne sais p as" must become "je ne sais pas".
    *   Ensure all punctuation is natural and readable.
    *   Maintain the original speaker turns and the language used.

2.  **Fix Conversational Order:**
    *   The transcript is a real-time log, so lines can be interleaved incorrectly. You MUST re-order the cleaned-up lines to create a logical, turn-by-turn conversational flow.
    *   **Example of Re-ordering:**
        *   Raw: "User: Hi", "AI: Hello there", "User: I'm good", "AI: how are you?"
        *   Corrected: "User: Hi", "AI: Hello there how are you?", "User: I'm good"

Your final output MUST be ONLY the cleaned, correctly formatted, and logically ordered dialogue. Do NOT add any commentary or explanation.

Raw Transcript to Process:
---
${preliminaryFormattedTranscript.trim()}
---

Cleaned and Re-ordered Dialogue:`;

        // --- 2. The S+ Tier Cleaning Carousel ----
        const cleanerProviderSequence = ['gemini', 'gemini', 'gemini', 'groq'];
        const hogwartsHouses = ['Gryffindor', 'Hufflepuff', 'Ravenclaw'];
        let geminiAttempt = 0;

        console.log('%cCleaner Provider Plan:', 'color: #6f42c1; font-weight: bold;', cleanerProviderSequence.join(' ➔ '));

        for (const provider of cleanerProviderSequence) {
            let attemptLog = `--> ATTEMPTING cleaner [${provider}]`;
            if (provider === 'gemini') {
                attemptLog += ` (House: ${hogwartsHouses[geminiAttempt] || 'Durmstrang'})`;
                geminiAttempt++;
            }
            console.log(`%c${attemptLog}`, 'color: #007acc; font-weight: bold;');

            try {
                let cleanedTranscript: string | null | object = null;

                if (provider === 'gemini' && currentDeps._geminiInternalApiCaller) {
                    const geminiModel = currentDeps._aiApiConstants?.GEMINI_MODELS.RECAP || "gemini-1.5-flash-latest";
                    const payload = {
                        contents: [{ role: "user", parts: [{ text: cleaningPrompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 3000 },
                        safetySettings: currentDeps._aiApiConstants?.STANDARD_SAFETY_SETTINGS_GEMINI,
                    };
                    cleanedTranscript = await currentDeps._geminiInternalApiCaller(payload, geminiModel, "generateContent");

                } else if (provider === 'groq' && currentDeps._openaiCompatibleApiCaller) {
                    const groqModel = currentDeps._aiApiConstants?.GROQ_MODELS.TEXT_CHAT || "llama3-8b-8192";
                    const messages = [{ role: "user" as const, content: cleaningPrompt }];
                    cleanedTranscript = await currentDeps._openaiCompatibleApiCaller(messages, groqModel, 'groq', 'proxied-by-cloudflare-worker', { temperature: 0.1 });
                }

                if (typeof cleanedTranscript === 'string' && cleanedTranscript.trim()) {
                    console.log(`%c<-- SUCCESS from cleaner [${provider}].`, 'color: #28a745; font-weight: bold;');
                    console.groupEnd();
                    return cleanedTranscript.trim();
                }
                throw new Error(`Cleaner [${provider}] returned empty or invalid response.`);

            } catch (error: any) {
                console.warn(`%c<-- FAILED. Cleaner [${provider}] threw an error. Trying next...`, 'color: #dc3545;');
                console.log(`Error Details:`, error.message);
            }
        }

        // --- 3. Final Fallback ---
        console.error(`${functionName}: FINAL FALLBACK. All cleaner attempts failed. Returning basic formatted transcript.`);
        console.groupEnd();
        const { polyglotHelpers } = currentDeps;
        if (polyglotHelpers?.formatTranscriptForLLM) {
            return polyglotHelpers.formatTranscriptForLLM(rawTranscript, connector.profileName || "Partner", userName);
        }
        return preliminaryFormattedTranscript.trim();
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
            
          // Replace with this in ai_service.ts
          generateTextMessage: async (
            promptOrText: string, 
            connector: Connector, 
            history: GeminiChatItem[] | null | undefined, 
            preferredProvider = safeProviders.GROQ,
            expectJson: boolean = false,
            context: 'group-chat' | 'one-on-one' = 'one-on-one',
            abortSignal?: AbortSignal // <<< ADDED
        ): Promise<string | null | object> => {
            const currentDeps = getDeps();
            const subService = currentDeps.aiTextGenerationService;
            if (!subService?.generateTextMessage) {
                console.error("AI Facade (TS): aiTextGenerationService.generateTextMessage unavailable.");
                return getRandomHumanError();
            }
            // Let AbortError bubble up to the caller (text_message_handler)
            return await subService.generateTextMessage(promptOrText, connector, history || [], preferredProvider, expectJson, context, abortSignal); // <<< PASS IT HERE
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

            generateTextFromImageAndText: async (base64Data, mimeType, connector, history, prompt, preferredProvider, abortSignal) => { // <<< ADD abortSignal
                const functionName = "[AI_Facade][ImageToText]";
                console.groupCollapsed(`%c🖼️ [Image Carousel] S+ Request Started`, 'color: #4caf50; font-weight: bold; font-size: 14px;');

                const currentDeps = getDeps();
                const mmService = currentDeps.geminiMultimodalService;
                const openAiVisionService = currentDeps.aiTextGenerationService;

                const imageProviderSequence = [
                    'together',
                    'gemini', // Try Gemini up to 3 times as a backup
                    'gemini',
                    'gemini'
                ];
                console.log('%cImage Provider Plan:', 'color: #4caf50; font-weight: bold;', imageProviderSequence.join(' ➔ '));

                for (const provider of imageProviderSequence) {
                    console.log(`%c--> ATTEMPTING provider [${provider}]`, 'color: #007acc; font-weight: bold;');
                    try {
                        let response: string | null | object = null;
                        
                        if (provider === 'together' && openAiVisionService?.generateTextFromImageAndTextOpenAI) {
                            response = await openAiVisionService.generateTextFromImageAndTextOpenAI(base64Data, mimeType, connector, history || [], prompt, 'together', abortSignal); // <<< PASS IT HERE
                        } else if (provider === 'gemini' && mmService?.generateTextFromImageAndText) {
                            response = await mmService.generateTextFromImageAndText(base64Data, mimeType, connector, history || [], prompt, undefined, abortSignal); // <<< PASS IT HERE
                        }

                        if (typeof response === 'string' && response.trim() !== "" && !response.includes("An unexpected AI error")) {
                            console.log(`%c<-- SUCCESS from [${provider}]. Stopping carousel.`, 'color: #28a745; font-weight: bold;');
                            console.groupEnd();
                            return response;
                        }
                        throw new Error(`Provider [${provider}] returned null or an error message.`);

                    } catch (error: any)
                    {
                        console.warn(`%c<-- FAILED. Provider [${provider}] threw an error. Trying next...`, 'color: #dc3545;');
                        console.log(`Error Details:`, error.message);
                    }
                }
                
                console.error(`${functionName}: FINAL ERROR. All image providers failed.`);
                console.groupEnd();
                return getRandomHumanError();
            },
            
          // src/js/services/ai_service.ts

// <<< START OF REPLACEMENT FUNCTION >>>
// in src/js/services/ai_service.
generateSessionRecap: async (
    fullCallTranscript: TranscriptTurn[],
    connector: Connector
): Promise<RecapData> => {
    const functionName = "[AI_Facade][generateSessionRecap]";
    console.groupCollapsed(`%c📝 [Smart Recap Router] Request Started`, 'color: #007bff; font-weight: bold; font-size: 14px;');

    const currentDeps = getDeps();
    const minTurns = localMinTurnsForRecap;

    // --- 1. Initial validation ---
    if (!currentDeps.aiRecapService?.generateSessionRecap || !currentDeps.geminiRecapService?.generateSessionRecap || !connector?.id) {
        console.error(`${functionName}: ABORT. Critical sub-service missing.`);
        console.groupEnd();
        return defaultRecapStructure("Internal Service Configuration Error");
    }
    if (!fullCallTranscript || fullCallTranscript.length < minTurns) {
        console.warn(`${functionName}: Transcript too short. Returning minimal structure.`);
        console.groupEnd();
        // This is the correct place to return your minimal structure for short calls
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

    // --- 2. Clean the transcript once ---
    let cleanedTranscriptText: string;
    try {
        console.log(`${functionName}: STEP 1 - Cleaning transcript...`);
        cleanedTranscriptText = await cleanAndReconstructTranscriptLLM_internal(fullCallTranscript, connector, "User");
        console.log(`%cCleaned Transcript Preview:`, 'color: #6c757d;', `"${cleanedTranscriptText.substring(0, 150)}..."`);
    } catch (cleanError: any) {
        console.warn(`${functionName}: LLM cleaning failed. Using basic formatter.`);
        cleanedTranscriptText = currentDeps.polyglotHelpers?.formatTranscriptForLLM(fullCallTranscript, connector.profileName || "Partner", "User") || "Transcript formatting failed.";
    }

    // --- 3. The CORRECT "Gemini x3 First" Provider Sequence ---
    let providerSequence: string[];
                const turnCount = fullCallTranscript.length;

                if (turnCount <= 10) { // If the conversation is short (<= 10 turns)
                    console.log(`%cROUTING: Short conversation (${turnCount} turns). Prioritizing Groq for speed.`, 'color: #00D09B; font-weight: bold;');
                    // Try Groq first, but have a full 3-key Gemini fleet as backup.
                    providerSequence = [safeProviders.GROQ, 'gemini', 'gemini', 'gemini', 'gemini'];
                } else { // For longer, more detailed conversations
                    console.log(`%cROUTING: Long conversation (${turnCount} turns). Prioritizing Gemini for quality.`, 'color: #4285F4; font-weight: bold;');
                    // Try the full Gemini fleet first, then failover to the other big models.
                    providerSequence = ['gemini', 'gemini', 'gemini', safeProviders.TOGETHER, safeProviders.GROQ];
                }
                
                console.log('%cFull Recap Provider Plan:', 'color: #007bff; font-weight: bold;', providerSequence.join(' ➔ '));
    
    // --- 4. Run the Carousel ---
    for (const provider of providerSequence) {
        console.log(`%c--> ATTEMPTING recap with [${provider}]`, 'color: #17a2b8; font-weight: bold;');
        try {
            let recapResult: RecapData | null = null;

            if (provider === 'gemini') {
                // This service now returns { recapData, nickname }
                const geminiResult = await currentDeps.geminiRecapService.generateSessionRecap(cleanedTranscriptText, connector);
                recapResult = geminiResult.recapData; // Assign the data to recapResult
                
                // Log the success with the nickname
                console.log(`%c...recap analysis by: ${geminiResult.nickname}!`, 'color: #34A853;');
            }
            
            
            else {
                recapResult = await currentDeps.aiRecapService.generateSessionRecap(cleanedTranscriptText, connector, provider);
            }

            if (recapResult && recapResult.conversationSummary) {
                console.log(`%c<-- SUCCESS! Recap generated with [${provider}].`, 'color: #28a745; font-weight: bold;');
                if (provider === 'gemini') {
                    const lastUsedKeyIndex = ((window as any).currentGeminiKeyIndex === 0) ? (window as any).GEMINI_API_KEYS.length - 1 : (window as any).currentGeminiKeyIndex - 1;
                    const successNickname = ((window as any).GEMINI_KEY_NICKNAMES || [])[lastUsedKeyIndex] || 'The Rookie';
                    console.log(`%c...recap analysis by: ${successNickname}!`, 'color: #34A853;');
                }
           
                console.groupEnd();
                // This is the correct place to return the final, complete object
                return {
                    ...defaultRecapStructure(provider),
                    ...recapResult,
                    sessionId: `recap-${connector.id}-${Date.now()}`,
                    connectorId: connector.id,
                    connectorName: connector.profileName,
                    date: new Date().toLocaleDateString()
                };
            }
            throw new Error(`Provider [${provider}] returned a null or invalid recap.`);

        } catch (error: any) {
            console.warn(`%c<-- FAILED. Provider [${provider}] threw an error. Trying next...`, 'color: #dc3545;');
            console.log(`Error Details:`, error.message);
        }
    }

    // --- 5. This part is only reached if ALL providers fail ---
    console.error(`${functionName}: FINAL ERROR. All recap provider attempts failed.`);
    console.groupEnd();
    return defaultRecapStructure("All Recap Services");
},
// <<< END OF REPLACEMENT FUNCTION >>>


        // REPLACE WITH THIS BLOCK

        transcribeAudioToText: async (base64Audio, mimeType, langHint) => {
            const functionName = "[AI_Facade][transcribeAudioToText]";
            console.groupCollapsed(`%c🎙️ [STT Carousel] S+ Request Started`, 'color: #fd7e14; font-weight: bold; font-size: 14px;');

            const currentDeps = getDeps();
            const mmService = currentDeps.geminiMultimodalService;
            const groqCaller = currentDeps._groqSttApiCaller;

            const sttProviderSequence = [
                'groq',
                'gemini', // Try Gemini up to 3 times as a backup
                'gemini',
                'gemini'
            ];
            console.log('%cSTT Provider Plan:', 'color: #fd7e14; font-weight: bold;', sttProviderSequence.join(' ➔ '));
            
            for (const provider of sttProviderSequence) {
                console.log(`%c--> ATTEMPTING provider [${provider}]`, 'color: #007acc; font-weight: bold;');
                try {
                    let transcript: string | null = null;

                    if (provider === 'groq' && groqCaller) {
                        const audioBlob = base64ToBlob(base64Audio, mimeType);
                        if (audioBlob.size > 0) {
                            // For Groq, the key is handled by the worker, so we pass a dummy.
                            transcript = await groqCaller(audioBlob, "whisper-large-v3", "dummy-key-for-worker", langHint);
                        } else {
                            throw new Error("Audio blob for Groq was empty.");
                        }
                    } else if (provider === 'gemini' && mmService?.transcribeAudioToText) {
                        transcript = await mmService.transcribeAudioToText(base64Audio, mimeType, langHint);
                    }

                    if (typeof transcript === 'string') { // Also accept empty string as a valid (but silent) transcript
                        console.log(`%c<-- SUCCESS from [${provider}]. Stopping carousel.`, 'color: #28a745; font-weight: bold;');
                        console.groupEnd();
                        return transcript;
                    }
                    throw new Error(`Provider [${provider}] returned null.`);

                } catch (error: any) {
                    console.warn(`%c<-- FAILED. Provider [${provider}] threw an error. Trying next...`, 'color: #dc3545;');
                    console.log(`Error Details:`, error.message);
                }
            }

            console.error(`${functionName}: FINAL ERROR. All STT providers failed.`);
            console.groupEnd();
            return getRandomHumanError();
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