// src/js/services/ai_text_generation_service.ts
import type {
    Connector,
    GeminiChatItem,
    AIApiConstants,
    // We'll need to define an interface for _openaiCompatibleApiCaller if it's a structured module
    // For now, we'll cast it to a function type based on usage.
} from '../types/global.d.ts';

console.log("ai_text_generation_service.ts: Script execution STARTED (TS Version).");

// Define the module's public interface, aligning with GeminiTextGenerationService in global.d.ts
// and including any OpenAI/Together specific methods if this module handles them directly.
export interface AiTextGenerationServiceModule {
    generateTextMessage: (
        userText: string,
        connector: Connector,
        existingGeminiHistory: GeminiChatItem[],
        preferredProvider?: string,
        expectJson?: boolean, // Added to align with potential facade usage
        context?: 'group-chat' | 'one-on-one' // <<< ADD IT HERE        
    ) => Promise<string | null | object>; // Allow object if expectJson

    generateTextFromImageAndTextOpenAI?: ( // This method seems specific to OpenAI/Together
        base64ImageString: string,
        mimeType: string,
        connector: Connector,
        existingConversationHistory: GeminiChatItem[], // Assuming OpenAI can take Gemini history or it's converted
        userTextQuery?: string, // Changed from optionalUserText for clarity
        provider?: string
    ) => Promise<string | null>;

    generateTextForGeminiCallModal: ( // Specific to Gemini
        userText: string,
        connector: Connector,
        modalCallHistory: GeminiChatItem[]
    ) => Promise<string | null>;
}

// Placeholder on window
window.aiTextGenerationService = {} as AiTextGenerationServiceModule;
function initializeActualAiTextGenerationService(): void {
    console.log("[AI_TEXT_GEN_SVC] #1 ENTRY: initializeActualAiTextGenerationService has been CALLED.");

    // Fetch critical dependencies from window
    const _geminiInternalApiCaller = (window as any)._geminiInternalApiCaller;
    const _openaiCompatibleApiCaller = (window as any).openaiCompatibleApiCaller; // No underscore, as per its definition file
    const aiConstants = window.aiApiConstants;

    // Detailed dependency logging
    console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: _geminiInternalApiCaller type: ${typeof _geminiInternalApiCaller}, exists: ${!!_geminiInternalApiCaller}`);
    console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: _openaiCompatibleApiCaller type: ${typeof _openaiCompatibleApiCaller}, exists: ${!!_openaiCompatibleApiCaller}`);
    console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: aiConstants exists: ${!!aiConstants}`);
    if (aiConstants) {
        console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: aiConstants.PROVIDERS exists: ${!!aiConstants.PROVIDERS}`);
        console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: aiConstants.GEMINI_MODELS exists: ${!!aiConstants.GEMINI_MODELS}`);
        console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: aiConstants.GROQ_MODELS exists: ${!!aiConstants.GROQ_MODELS}`);
        console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: aiConstants.TOGETHER_MODELS exists: ${!!aiConstants.TOGETHER_MODELS}`);
        console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: aiConstants.STANDARD_SAFETY_SETTINGS_GEMINI exists: ${!!aiConstants.STANDARD_SAFETY_SETTINGS_GEMINI}`);
        console.log(`[AI_TEXT_GEN_SVC] #2 DEPS_FETCHED: aiConstants.HUMAN_LIKE_ERROR_MESSAGES exists: ${!!aiConstants.HUMAN_LIKE_ERROR_MESSAGES}`);
    }

    // More robust dependency check
    if (typeof _geminiInternalApiCaller !== 'function' || 
        typeof _openaiCompatibleApiCaller !== 'function' || 
        !aiConstants || 
        !aiConstants.PROVIDERS || !aiConstants.GEMINI_MODELS || !aiConstants.GROQ_MODELS || 
        !aiConstants.TOGETHER_MODELS || !aiConstants.STANDARD_SAFETY_SETTINGS_GEMINI ||
        !aiConstants.HUMAN_LIKE_ERROR_MESSAGES) {
        
        console.error("[AI_TEXT_GEN_SVC] #3 CRITICAL_DEPS_FAIL: Critical dependencies missing or not functions. Service non-functional.");
        // Log which specific check might have failed
        if (typeof _geminiInternalApiCaller !== 'function') console.error("    Reason: _geminiInternalApiCaller is not a function.");
        if (typeof _openaiCompatibleApiCaller !== 'function') console.error("    Reason: _openaiCompatibleApiCaller is not a function.");
        if (!aiConstants) console.error("    Reason: aiConstants is missing.");
        else {
            if (!aiConstants.PROVIDERS) console.error("    Reason: aiConstants.PROVIDERS is missing.");
            if (!aiConstants.GEMINI_MODELS) console.error("    Reason: aiConstants.GEMINI_MODELS is missing.");
            // ... (add checks for other aiConstants properties if needed for detailed error)
        }
        
        const errorFn = async (): Promise<string> => {
            const errorMsg = (aiConstants?.HUMAN_LIKE_ERROR_MESSAGES?.[0]) || "(Text Generation Service not initialized due to missing dependencies.)";
            console.error("AI Text Generation Service (TS) called in error state (dummy method).");
            return errorMsg;
        };
        const dummyMethods: AiTextGenerationServiceModule = {
            generateTextMessage: errorFn,
            generateTextFromImageAndTextOpenAI: async () => { console.error("Dummy generateTextFromImageAndTextOpenAI called."); return null; },
            generateTextForGeminiCallModal: errorFn
        };
        Object.assign(window.aiTextGenerationService!, dummyMethods);
        document.dispatchEvent(new CustomEvent('aiTextGenerationServiceReady'));
        console.warn("ai_text_generation_service.ts: 'aiTextGenerationServiceReady' dispatched (INITIALIZATION FAILED - core deps).");
        return; // Early exit
    }
    console.log("[AI_TEXT_GEN_SVC] #4 CRITICAL_DEPS_PASS: All critical dependencies appear present and are of correct type.");

    const { PROVIDERS, GEMINI_MODELS, GROQ_MODELS, OPENROUTER_MODELS, TOGETHER_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI, HUMAN_LIKE_ERROR_MESSAGES } = aiConstants;

    console.log("[AI_TEXT_GEN_SVC] #5 BEFORE_IIFE: About to define serviceMethodsFromIIFE.");

    const serviceMethodsFromIIFE = ((): AiTextGenerationServiceModule => {
        'use strict';
        console.log("[AI_TEXT_GEN_SVC] #6 IIFE_START: IIFE is executing.");

        function getRandomHumanError(): string {
            if (!HUMAN_LIKE_ERROR_MESSAGES || HUMAN_LIKE_ERROR_MESSAGES.length === 0) {
                return "(I'm having a little trouble responding right now. Please try again!)";
            }
            return HUMAN_LIKE_ERROR_MESSAGES[Math.floor(Math.random() * HUMAN_LIKE_ERROR_MESSAGES.length)];
        }

        type OpenAIMessageContentPart = 
            | { type: "text"; text: string; }
            | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" }; };

        function convertGeminiHistoryToOpenAIMessages(
            geminiHistory: GeminiChatItem[] | null | undefined,
            systemPromptText: string | null = null
        ): Array<{ role: "system" | "user" | "assistant"; content: string | OpenAIMessageContentPart[] }> {
            const messages: Array<{ role: "system" | "user" | "assistant"; content: string | OpenAIMessageContentPart[] }> = [];
            if (systemPromptText && typeof systemPromptText === 'string' && systemPromptText.trim() !== '') {
                messages.push({ role: "system", content: systemPromptText });
            }
            if (Array.isArray(geminiHistory)) {
                geminiHistory.forEach(turn => {
                    if (turn.parts && turn.parts.length > 0) {
                        let combinedTextContent = "";
                        turn.parts.forEach(part => {
                            if ('text' in part && typeof part.text === 'string') {
                                combinedTextContent += part.text + " ";
                            }
                        });
                        const content = combinedTextContent.trim() || "[non-text content from history]";
                        if (turn.role === "user") messages.push({ role: "user", content: content });
                        else if (turn.role === "model") messages.push({ role: "assistant", content: content });
                    }
                });
            }
            return messages;
        }
        
        function prepareGeminiPayload(geminiHistory: GeminiChatItem[] | null | undefined, userText: string): { contents: GeminiChatItem[], generationConfig: any, safetySettings: any[] } {
            const history = Array.isArray(geminiHistory) ? [...geminiHistory] : [];
            history.push({ role: "user", parts: [{ text: userText }] });
            return { 
                contents: history, 
                generationConfig: { temperature: 0.75, topP: 0.95, topK: 40 },
                safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI
            };
        }

      // <<< REPLACE WITH THIS ENTIRE FUNCTION >>>
      async function generateTextMessage(
        userText: string,
        connector: Connector,
        existingGeminiHistory: GeminiChatItem[],
        preferredProvider: string = PROVIDERS.GROQ,
        expectJson: boolean = false
    ): Promise<string | null | object> {
        const functionName = "[AI_TextGenSvc][generateTextMessage]";
        console.groupCollapsed(`%c🚀 [Smart Dispatcher] New Request Started`, 'color: #8a2be2; font-weight: bold; font-size: 14px;');
        console.log(`Input Text: "${userText.substring(0, 100)}..."`);

        // --- 1. The Probabilistic Dispatch ---
        const dispatchRoll = Math.random();
        let primaryProvider: 'gemini' | 'groq';
        
        if (dispatchRoll < 0.70) { // 70% chance
            primaryProvider = 'gemini';
            console.log('%cDispatching to: GEMINI (70% probability)', 'color: #4285F4; font-weight: bold;');
        } else { // 30% chance
            primaryProvider = 'groq';
            console.log('%cDispatching to: GROQ (30% probability)', 'color: #00D09B; font-weight: bold;');
        }

        // --- 2. Create the Full Failover Sequence based on the dispatch ---
        const providerSequence = [];
        if (primaryProvider === 'gemini') {
            // Try Gemini up to 3 times before failing over
            providerSequence.push('gemini', 'gemini', 'gemini', PROVIDERS.GROQ, PROVIDERS.OPENROUTER, PROVIDERS.TOGETHER);
        } else {
            // Try Groq first, then failover to Gemini up to 3 times
            providerSequence.push(PROVIDERS.GROQ, 'gemini', 'gemini', 'gemini', PROVIDERS.OPENROUTER, PROVIDERS.TOGETHER);
        }
        console.log('%cFull Failover Plan:', 'color: #8a2be2; font-weight: bold;', providerSequence.join(' ➔ '));

        // --- 3. Prepare Payloads (this is done once) ---
        const sanitizedHistory = (existingGeminiHistory || []).map(turn => {
            const textParts = turn.parts.filter(part => 'text' in part && typeof part.text === 'string' && part.text.trim() !== "").map(part => ({ text: (part as { text: string }).text }));
            if (textParts.length === 0) return null;
            return { ...turn, parts: textParts };
        }).filter(turn => turn !== null) as GeminiChatItem[];
    
        let systemPrompt: string | null = null;
        if (sanitizedHistory.length > 0 && sanitizedHistory[0].role === 'user') {
            const firstPart = sanitizedHistory[0].parts[0];
            if ('text' in firstPart && typeof firstPart.text === 'string' && firstPart.text.toUpperCase().includes("CRITICAL INSTRUCTION")) {
                systemPrompt = firstPart.text;
            }
        }
        
        const openAIMessages = convertGeminiHistoryToOpenAIMessages(systemPrompt ? sanitizedHistory.slice(1) : sanitizedHistory, systemPrompt);
        openAIMessages.push({ role: "user", content: userText });
        const geminiPayload = prepareGeminiPayload(existingGeminiHistory, userText);

        // --- 4. Run the Carousel ---
        for (const provider of providerSequence) {
            console.log(`%c--> ATTEMPTING provider [${provider}]`, 'color: #007acc; font-weight: bold;');
            try {
                if (provider === 'gemini') {
                    const geminiModel = GEMINI_MODELS?.TEXT || "gemini-2.0-flash-live";
                    const response = await _geminiInternalApiCaller(geminiPayload, geminiModel, "generateContent");
                    console.log(`%c<-- SUCCESS from [${provider}].`, 'color: #28a745; font-weight: bold;');
                    if (provider === 'gemini') {
                        const geminiModel = GEMINI_MODELS?.TEXT || "gemini-2.0-flash-live";
                        // The caller now returns an object: { response: string, nickname: string }
                        const geminiResult = await _geminiInternalApiCaller(geminiPayload, geminiModel, "generateContent");
                        
                        console.log(`%c<-- SUCCESS from [gemini].`, 'color: #28a745; font-weight: bold;');
                        console.log(`%c...with the assist from: ${geminiResult.nickname}!`, 'color: #34A853;');
                        console.groupEnd();
                        return geminiResult.response; // Return only the text response to the caller
                    }
                    console.groupEnd();
                    return response;
                } else { // Groq, OpenRouter, or Together
                    let apiKey: string | undefined;
                    let model: string | undefined;
                    
                    if (provider === PROVIDERS.GROQ) {
                        model = GROQ_MODELS?.TEXT_CHAT;
                        apiKey = 'proxied-by-cloudflare-worker';
                    } else if (provider === PROVIDERS.OPENROUTER) {
                        apiKey = import.meta.env.VITE_OPEN_ROUTER_API_KEY;
                        model = OPENROUTER_MODELS?.TEXT_CHAT;
                    } else if (provider === PROVIDERS.TOGETHER) {
                        apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
                        model = TOGETHER_MODELS?.TEXT_CHAT;
                    }

                    if (!model) { throw new Error(`Model for provider [${provider}] not defined.`); }
                    
                    const response = await _openaiCompatibleApiCaller(openAIMessages, model, provider, apiKey, { temperature: 0.7, response_format: expectJson ? { type: "json_object" } : undefined });
                    console.log(`%c<-- SUCCESS from [${provider}].`, 'color: #28a745; font-weight: bold;');
                    console.groupEnd();
                    return response;
                }
            } catch (error: any) {
                console.warn(`%c<-- FAILED. Provider [${provider}] threw an error. Trying next...`, 'color: #dc3545;');
                console.log(`Error Details:`, error.message);
            }
        }
        
        console.error(`FINAL ERROR. All providers in the sequence failed.`);
        console.groupEnd();
        return getRandomHumanError();
    }

        async function generateTextFromImageAndTextOpenAI(
            base64ImageString: string, mimeType: string, connector: Connector,
            existingConversationHistory: GeminiChatItem[], userTextQuery: string = "What's in this image?",
            provider: string = PROVIDERS.TOGETHER 
        ): Promise<string | null> {
            console.log(`[AI_TEXT_GEN_SVC.OpenAI_Vision] CALLED FOR CONNECTOR: ${connector?.id} (${connector?.profileName})`);
            console.log(`[AI_TEXT_GEN_SVC.OpenAI_Vision] User Text Query (Prompt): ${userTextQuery}`);
            console.log(`[AI_TEXT_GEN_SVC.OpenAI_Vision] MimeType: ${mimeType}`);
            console.log(`[AI_TEXT_GEN_SVC.OpenAI_Vision] History Length Passed: ${existingConversationHistory?.length}`);
            let apiKeyToUse: string | undefined; let modelForVision: string | undefined;
            if (provider === PROVIDERS.TOGETHER) {
                apiKeyToUse = window.TOGETHER_API_KEY; modelForVision = TOGETHER_MODELS?.VISION;
            } else {
                console.error(`AI Text Gen (TS): Vision provider ${provider} not supported by this OpenAI-compatible path.`);
                return getRandomHumanError();
            }
            if (!apiKeyToUse || apiKeyToUse.includes("YOUR_")) return getRandomHumanError();
            if (!modelForVision) return getRandomHumanError();
            if (!connector) return getRandomHumanError();

            let systemPrompt = `You are ${connector.profileName || 'a helpful assistant'}. Respond naturally in ${connector.language || 'English'}.`;
            const openAIMessages = convertGeminiHistoryToOpenAIMessages(existingConversationHistory, systemPrompt); 
            const userContent: any[] = [{ type: "text", text: userTextQuery }];
            if (base64ImageString) {
                userContent.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64ImageString}` } });
            }
            openAIMessages.push({ role: "user", content: userContent });
            console.log(`[AI_TEXT_GEN_SVC.OpenAI_Vision] MESSAGES SENT TO OPENAI_COMPATIBLE_CALLER for ${connector?.id}:`, JSON.stringify(openAIMessages, null, 2));

            if (provider === PROVIDERS.TOGETHER) {
                console.log(`AI TextGen Service (generateTextFromImageAndTextOpenAI - TOGETHER): Provider: ${provider}, Model: ${modelForVision}, ...`);
            }
            try {
                if (provider === PROVIDERS.TOGETHER) {
                    apiKeyToUse = window.TOGETHER_API_KEY;
                    modelForVision = TOGETHER_MODELS?.VISION;
                } else {
                    throw new Error(`Provider [${provider}] is not supported for vision in this function.`);
                }
        
                if (!apiKeyToUse || apiKeyToUse.includes("YOUR_")) throw new Error("API key is missing or is a placeholder.");
                if (!modelForVision) throw new Error("Vision model ID is not configured in aiConstants.");
                if (!connector) throw new Error("Connector object is missing.");
                if (!base64ImageString) throw new Error("base64ImageString is missing.");
                
                console.log(`${Function}: Config check PASSED. Using model [${modelForVision}].`);
                
                // --- Payload preparation (as before) ---
                let systemPrompt = `You are ${connector.profileName || 'a helpful assistant'}. Respond naturally in ${connector.language || 'English'}.`;
                const openAIMessages = convertGeminiHistoryToOpenAIMessages(existingConversationHistory, systemPrompt);
                const userContent: OpenAIMessageContentPart[] = [{ type: "text", text: userTextQuery }];
                userContent.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64ImageString}` } });
                openAIMessages.push({ role: "user", content: userContent });
        
                // Optional: Log the full payload if debugging is difficult
                // console.log(`${functionName}: Payload being sent:`, JSON.stringify(openAIMessages, null, 2));
        
                // --- API Call with Clear Logging ---
                console.log(`${Function}: --> ATTEMPTING call to [${provider}] vision service.`);
                const response = await _openaiCompatibleApiCaller(openAIMessages, modelForVision, provider, apiKeyToUse, { temperature: 0.5, max_tokens: 512 });
                console.log(`${Function}: <-- SUCCESS from [${provider}].`);
                return response;
        
            } catch (error: any) {
                console.error(`${Function}: <-- FAILED. Error: ${error.message}`);
                return getRandomHumanError();
            }
        }
        
        async function generateTextForGeminiCallModal(
            userText: string, 
            connector: Connector, 
            modalCallHistory: GeminiChatItem[]
        ): Promise<string | null> {
            if (!connector?.language || !connector.profileName || !connector.modernTitle) {
                console.error("GTGS (TS): generateTextForCallModal - Connector info missing.");
                throw new Error("Connector info missing for generateTextForCallModal.");
            }
            if (typeof userText !== 'string' || userText.trim() === "") {
                console.error("GTGS (TS): generateTextForCallModal - User text missing or empty.");
                throw new Error("User text missing or empty for generateTextForCallModal.");
            }
        
            const systemPrompt = `You are ${connector.profileName}, a ${connector.modernTitle} from ${connector.city || 'their city'}. You are in a voice-enabled chat session with a user practicing ${connector.language}. The user has just TYPED the following text to you. Respond ONLY in ${connector.language}. Your response should be natural, conversational, and concise (1-3 sentences is ideal for a call). Maintain your persona as ${connector.profileName}. ABSOLUTELY DO NOT mention that you are an AI, a language model, or a computer program. If the user's typed text asks about your nature, deflect it or answer as a human would.`;
        
            let contents: GeminiChatItem[] = [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: `Okay, I am ${connector.profileName}. I'll respond to the user's typed message in ${connector.language}, keeping it brief and natural for our call.` }] }
            ];
        
            const MAX_MODAL_CALL_HISTORY_TURNS = 6;
            if (Array.isArray(modalCallHistory)) {
                const recentHistory = modalCallHistory.slice(-MAX_MODAL_CALL_HISTORY_TURNS * 2);
                recentHistory.forEach(turn => {
                    if (turn && turn.role && Array.isArray(turn.parts) && turn.parts.length > 0) {
                        const firstPart = turn.parts[0];
                        let textContent = "[interaction segment]";
                        if ('text' in firstPart && typeof firstPart.text === 'string') {
                            textContent = firstPart.text;
                        }
                        contents.push({ role: turn.role, parts: [{ text: textContent }] });
                    }
                });
            }
            contents.push({ role: "user", parts: [{ text: userText }] });
        
            // --- THIS IS THE FIX ---
            // Create the payload object using the 'contents' array we just built.
            const payload = {                                   // <<< CORRECTED
                contents: contents,                             // <<< CORRECTED
                safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI
            };
            
            const modelToUse = GEMINI_MODELS?.TEXT || "gemini-1.5-flash-latest";
        
            try {
                // Use the 'payload' variable we just defined.
                const response = await _geminiInternalApiCaller(payload, modelToUse, "generateContent"); // <<< CORRECTED
                return typeof response === 'string' ? response : null;
            } catch (error: any) {
                console.error(`GTGS (TS): generateTextForCallModal Error for ${connector.profileName}:`, error.message);
                return null;
            }
        }

        console.log("[AI_TEXT_GEN_SVC] #A IIFE_RETURN_CHECK: About to return from IIFE. Checking methods:");
        console.log(`  [IIFE_CHECK] typeof generateTextMessage: ${typeof generateTextMessage}`);
        console.log(`  [IIFE_CHECK] typeof generateTextFromImageAndTextOpenAI: ${typeof generateTextFromImageAndTextOpenAI}`);
        console.log(`  [IIFE_CHECK] typeof generateTextForGeminiCallModal: ${typeof generateTextForGeminiCallModal}`);
      
        return { 
           generateTextMessage,
           generateTextFromImageAndTextOpenAI,
           generateTextForGeminiCallModal
        };
    })(); // End of IIFE execution

    console.log("[AI_TEXT_GEN_SVC] #7 AFTER_IIFE_EXEC: IIFE has executed.");
    console.log("[AI_TEXT_GEN_SVC] #B DEBUG: Raw object returned by IIFE (serviceMethodsFromIIFE):");
    console.log(serviceMethodsFromIIFE);
    if (serviceMethodsFromIIFE) {
        console.log(`  [RAW_OBJ_CHECK] typeof serviceMethodsFromIIFE.generateTextMessage: ${typeof serviceMethodsFromIIFE.generateTextMessage}`);
        console.log(`  [RAW_OBJ_CHECK] typeof serviceMethodsFromIIFE.generateTextFromImageAndTextOpenAI: ${typeof serviceMethodsFromIIFE.generateTextFromImageAndTextOpenAI}`);
        console.log(`  [RAW_OBJ_CHECK] typeof serviceMethodsFromIIFE.generateTextForGeminiCallModal: ${typeof serviceMethodsFromIIFE.generateTextForGeminiCallModal}`);
    }

    if (serviceMethodsFromIIFE && 
        typeof serviceMethodsFromIIFE.generateTextMessage === 'function' && 
        typeof serviceMethodsFromIIFE.generateTextFromImageAndTextOpenAI === 'function' &&
        typeof serviceMethodsFromIIFE.generateTextForGeminiCallModal === 'function'
    ) {
        window.aiTextGenerationService = serviceMethodsFromIIFE; 
        console.log("[AI_TEXT_GEN_SVC] #C SUCCESS: Directly assigned IIFE result to window.aiTextGenerationService.");
        
        console.log("[AI_TEXT_GEN_SVC] #D DEBUG: window.aiTextGenerationService AFTER assignment:", window.aiTextGenerationService);
        if(window.aiTextGenerationService){ 
            console.log(`  [WIN_OBJ_CHECK] typeof window.aiTextGenerationService.generateTextMessage: ${typeof (window.aiTextGenerationService as any).generateTextMessage}`);
            console.log(`  [WIN_OBJ_CHECK] typeof window.aiTextGenerationService.generateTextFromImageAndTextOpenAI: ${typeof (window.aiTextGenerationService as any).generateTextFromImageAndTextOpenAI}`);
            console.log(`  [WIN_OBJ_CHECK] typeof window.aiTextGenerationService.generateTextForGeminiCallModal: ${typeof (window.aiTextGenerationService as any).generateTextForGeminiCallModal}`);
        }
        
        document.dispatchEvent(new CustomEvent('aiTextGenerationServiceReady'));
        console.log("ai_text_generation_service.ts: 'aiTextGenerationServiceReady' event dispatched (SUCCESS).");
    } else {
        console.error("[AI_TEXT_GEN_SVC] #E CRITICAL_ASSIGN_FAIL: IIFE did not return a valid service object OR a key method is missing/not a function from serviceMethodsFromIIFE.");
        console.error("  [ASSIGN_FAIL] serviceMethodsFromIIFE object was:", serviceMethodsFromIIFE);
        if(serviceMethodsFromIIFE){
            console.error(`    [ASSIGN_FAIL_TYPEOF] .generateTextMessage: ${typeof (serviceMethodsFromIIFE as any).generateTextMessage}`);
            console.error(`    [ASSIGN_FAIL_TYPEOF] .generateTextFromImageAndTextOpenAI: ${typeof (serviceMethodsFromIIFE as any).generateTextFromImageAndTextOpenAI}`);
            console.error(`    [ASSIGN_FAIL_TYPEOF] .generateTextForGeminiCallModal: ${typeof (serviceMethodsFromIIFE as any).generateTextForGeminiCallModal}`);
        }
        document.dispatchEvent(new CustomEvent('aiTextGenerationServiceReady'));
        console.warn("ai_text_generation_service.ts: 'aiTextGenerationServiceReady' dispatched (INITIALIZATION FAILED to attach all methods).");
    }
} // End of initializeActualAiTextGenerationService function
const dependenciesForATGS = ['geminiApiCallerLogicReady', 'aiApiConstantsReady', 'openaiCompatibleApiCallerReady'];
  const atgsMetDependenciesLog: { [key: string]: boolean } = {};
  dependenciesForATGS.forEach(dep => atgsMetDependenciesLog[dep] = false);
  let atgsDepsMetCount = 0;

  function checkAndInitATGS(receivedEventName?: string) {
      console.log(`[ATGS_DepCheck] checkAndInitATGS called. Event: ${receivedEventName || 'N/A (pre-check or direct call)'}. Current Met: ${atgsDepsMetCount}/${dependenciesForATGS.length}`);
      if (receivedEventName) {
          let verified = false;
          let detail = "Unknown";
          switch(receivedEventName) {
              case 'geminiApiCallerLogicReady':
                  verified = !!(window as any)._geminiInternalApiCaller; // Assuming it's _geminiInternalApiCaller
                  detail = `window._geminiInternalApiCaller: ${typeof (window as any)._geminiInternalApiCaller}`;
                  break;
              case 'aiApiConstantsReady':
                  verified = !!(window.aiApiConstants && window.aiApiConstants.GEMINI_MODELS);
                  detail = `window.aiApiConstants.GEMINI_MODELS: ${typeof window.aiApiConstants?.GEMINI_MODELS}`;
                  break;
              case 'openaiCompatibleApiCallerReady':
                  verified = !!(window as any).openaiCompatibleApiCaller; // Corrected: no underscore
                  detail = `window.openaiCompatibleApiCaller: ${typeof (window as any).openaiCompatibleApiCaller}`;
                  break;
              default: 
                  console.warn(`[ATGS_DepCheck] Unknown event in checkAndInitATGS: ${receivedEventName}`);
                  return;
          }
          console.log(`[ATGS_DepCheck] Event '${receivedEventName}' verification: ${verified}. Detail: ${detail}`);
          if (verified && !atgsMetDependenciesLog[receivedEventName]) {
              atgsMetDependenciesLog[receivedEventName] = true;
              atgsDepsMetCount++;
              console.log(`[ATGS_DepCheck] Event '${receivedEventName}' confirmed MET. Count: ${atgsDepsMetCount}/${dependenciesForATGS.length}`);
          } else if (!verified) {
              console.warn(`[ATGS_DepCheck] Event '${receivedEventName}' FAILED verification.`);
          } else {
              console.log(`[ATGS_DepCheck] Event '${receivedEventName}' already met or verified.`);
          }
      }

      if (atgsDepsMetCount === dependenciesForATGS.length) {
          console.log("[ATGS_DepCheck] All dependencies met! Attempting to call initializeActualAiTextGenerationService...");
          initializeActualAiTextGenerationService();
      } else {
          console.log(`[ATGS_DepCheck] Still waiting. Met: ${atgsDepsMetCount}, Needed: ${dependenciesForATGS.length}`);
      }
  }

  console.log("[ATGS_DepCheck] Starting initial pre-check for dependencies.");
  let atgsAllPreloadedOnInitialRun = true; // Renamed for clarity
  dependenciesForATGS.forEach(eventName => {
      let isVerifiedInPreCheck = false;
      let detail = "Unknown";
      switch(eventName) {
          case 'geminiApiCallerLogicReady':
              isVerifiedInPreCheck = !!(window as any)._geminiInternalApiCaller;
              detail = `window._geminiInternalApiCaller: ${typeof (window as any)._geminiInternalApiCaller}`;
              break;
          case 'aiApiConstantsReady':
              isVerifiedInPreCheck = !!(window.aiApiConstants && window.aiApiConstants.GEMINI_MODELS);
              detail = `window.aiApiConstants.GEMINI_MODELS: ${typeof window.aiApiConstants?.GEMINI_MODELS}`;
              break;
          case 'openaiCompatibleApiCallerReady':
              isVerifiedInPreCheck = !!(window as any).openaiCompatibleApiCaller; // Corrected
              detail = `window.openaiCompatibleApiCaller: ${typeof (window as any).openaiCompatibleApiCaller}`;
              break;
      }

      if (isVerifiedInPreCheck) {
          console.log(`[ATGS_DepCheck] Pre-check: Dependency '${eventName}' ALREADY MET. Detail: ${detail}`);
          if(!atgsMetDependenciesLog[eventName]) { 
              atgsMetDependenciesLog[eventName] = true; 
              atgsDepsMetCount++; 
          }
      } else {
          atgsAllPreloadedOnInitialRun = false;
          console.log(`[ATGS_DepCheck] Pre-check: Dependency '${eventName}' NOT MET. Detail: ${detail}. Adding listener.`);
          document.addEventListener(eventName, () => checkAndInitATGS(eventName), { once: true });
      }
  });

  console.log(`[ATGS_DepCheck] After pre-check loop. Initial Met count: ${atgsDepsMetCount}, All preloaded on initial run: ${atgsAllPreloadedOnInitialRun}`);

  if (atgsAllPreloadedOnInitialRun && atgsDepsMetCount === dependenciesForATGS.length) {
      console.log("[ATGS_DepCheck] All dependencies pre-verified during initial run! Calling initializeActualAiTextGenerationService.");
      initializeActualAiTextGenerationService();
  } else if (!atgsAllPreloadedOnInitialRun && atgsDepsMetCount < dependenciesForATGS.length) {
      console.log(`ai_text_generation_service.ts: Waiting for ${dependenciesForATGS.length - atgsDepsMetCount} core dependencies via events.`);
  } else if (atgsDepsMetCount === dependenciesForATGS.length && !atgsAllPreloadedOnInitialRun) {
       console.log("[ATGS_DepCheck] All dependencies met via a mix of pre-check and events. Calling initializeActualAiTextGenerationService (should have been called by event handler).");
       // initializeActualAiTextGenerationService(); // Already called by the event handler path
  }