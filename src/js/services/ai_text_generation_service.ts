// src/js/services/ai_text_generation_service.
import type {
    Connector,
    GeminiChatItem,
    AIApiConstants,
    // We'll need to define an interface for _openaiCompatibleApiCaller if it's a structured module
    // For now, we'll cast it to a function type based on usage.
} from '../types/global.d.ts';

// =========================================================================
// === BRUTE FORCE ENV CHECK: This runs the moment the file is loaded. ===
// =========================================================================
console.log('%c[ENV CHECK] Reading Together AI keys directly from import.meta.env...', 'background: #ffc107; color: black; font-weight: bold;');
console.log('VITE_TOGETHER_API_KEY_FRANZ:', import.meta.env.VITE_TOGETHER_API_KEY_FRANZ);
console.log('VITE_TOGETHER_API_KEY_NASH:', import.meta.env.VITE_TOGETHER_API_KEY_NASH);
console.log('If these logs show "undefined", the dev server MUST be restarted.');
// =========================================================================

console.log("ai_text_generation_service.ts: Script execution STARTED (TS Version).");

// Define the module's public interface, aligning with GeminiTextGenerationService in global.d.ts
// and including any OpenAI/Together specific methods if this module handles them directly.
export interface AiTextGenerationServiceModule {
    generateTextMessage: (
        userText: string,
        connector: Connector, 
        existingGeminiHistory: GeminiChatItem[],
        preferredProvider?: string,
        expectJson?: boolean,
        context?: 'group-chat' | 'one-on-one',
        abortSignal?: AbortSignal, // <<< ADDED 
        options?: { isTranslation?: boolean; [key: string]: any } // <<< ADD THIS
    ) => Promise<string | null | object>;

    generateTextFromImageAndTextOpenAI?: (
        base64ImageString: string,
        mimeType: string,
        connector: Connector,
        existingConversationHistory: GeminiChatItem[],
        userTextQuery?: string,
        provider?: string,
        abortSignal?: AbortSignal // <<< ADDED THIS
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
   // in ai_text_generation_service.ts

// =================== REPLACE THE ENTIRE generateTextMessage FUNCTION WITH THIS ===================
async function generateTextMessage(
    userText: string,
    connector: Connector, // As per your latest version
    existingGeminiHistory: GeminiChatItem[],
    preferredProvider?: string,
    expectJson: boolean = false, // Default to false if not provided
    context: 'group-chat' | 'one-on-one' = 'one-on-one', // Default context
    abortSignal?: AbortSignal,
    options?: { isTranslation?: boolean; [key: string]: any }
): Promise<string | null | object> {
    const functionName = "[AI_TextGenSvc][generateTextMessage]";
    console.groupCollapsed(`%c🚀 [Zone Defense Dispatcher] New Request Started`, 'color: #8a2be2; font-weight: bold; font-size: 14px;');
    console.log(`${functionName} Input Text: "${userText.substring(0, 100)}..."`);
    console.log(`${functionName} Connector ID: ${connector?.id}, Preferred Provider: ${preferredProvider}, Expect JSON: ${expectJson}, Context: ${context}, Is Translation: ${!!options?.isTranslation}`);

    // Ensure aiConstants are loaded and available
    const currentConstants = window.aiApiConstants;
    if (!currentConstants || !currentConstants.PROVIDERS || !currentConstants.GEMINI_MODELS || !currentConstants.GROQ_MODELS || !currentConstants.TOGETHER_MODELS || !currentConstants.OPENROUTER_MODELS) {
        console.error(`${functionName} CRITICAL: aiConstants or essential provider/model definitions are missing.`);
        console.groupEnd();
        return getRandomHumanError(); // Ensure getRandomHumanError is accessible
    }
    const { PROVIDERS, GEMINI_MODELS, GROQ_MODELS, TOGETHER_MODELS, OPENROUTER_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI } = currentConstants;

    // --- Prepare Payloads and Calculate Context Size ---
    const sanitizedHistory = (existingGeminiHistory || []).map(turn => {
        if (!turn || !turn.parts) return null; // Basic check
        const textParts = turn.parts.filter(part => 'text' in part && typeof part.text === 'string' && part.text.trim() !== "").map(part => ({ text: (part as { text: string }).text }));
        if (textParts.length === 0) return null;
        return { ...turn, parts: textParts };
    }).filter(turn => turn !== null) as GeminiChatItem[];

    let systemPrompt: string | null = null;
    if (sanitizedHistory.length > 0 && sanitizedHistory[0].role === 'user' && sanitizedHistory[0].parts.length > 0) {
        const firstPart = sanitizedHistory[0].parts[0];
        if ('text' in firstPart && typeof firstPart.text === 'string' && firstPart.text.toUpperCase().includes("CRITICAL INSTRUCTION")) {
            systemPrompt = firstPart.text;
        }
    }
    
    const openAIMessagesForNonGemini = convertGeminiHistoryToOpenAIMessages(systemPrompt ? sanitizedHistory.slice(1) : sanitizedHistory, systemPrompt);
    openAIMessagesForNonGemini.push({ role: "user", content: userText });
    
    // Pass sanitizedHistory to prepareGeminiPayload.
    // The prepareGeminiPayload function should handle adding the current userText to the history.
    const geminiPayloadForGemini = prepareGeminiPayload(sanitizedHistory, userText); 
    
    const estimatedTokenCount = JSON.stringify(openAIMessagesForNonGemini).length / 4;
    console.log(`${functionName} Estimated Request Size (for OpenAI-like payloads): ~${Math.round(estimatedTokenCount)} tokens.`);

    // --- THE ZONE DEFENSE LOGIC ---
    let providerSequence: string[];

    if (preferredProvider) {
        console.log(`%c${functionName} Dispatching to: PREFERRED [${preferredProvider.toUpperCase()}]`, 'color: #fd7e14; font-weight: bold;');
        // Ensure preferredProvider is valid before using it
        const validProviders = Object.values(PROVIDERS);
        if (validProviders.includes(preferredProvider)) {
            providerSequence = [preferredProvider, preferredProvider, preferredProvider, PROVIDERS.GEMINI, PROVIDERS.GEMINI, PROVIDERS.GROQ];
        } else {
            console.warn(`${functionName} Invalid preferredProvider: ${preferredProvider}. Falling back to default logic.`);
            // Fallback to default logic if preferredProvider is invalid
            preferredProvider = undefined; // Clear it to trigger default path
            // Re-evaluate providerSequence based on default logic (copied from below)
            if (estimatedTokenCount > 6000) {
                console.log(`%c${functionName} Dispatching (Fallback): LONG CONTEXT PLAY (Over 6k tokens)`, 'color: #9c27b0; font-weight: bold;');
                 providerSequence = (Math.random() < 0.50) ?
                    [PROVIDERS.TOGETHER, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.GEMINI, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.OPENROUTER] :
                    [PROVIDERS.GEMINI, PROVIDERS.GEMINI, PROVIDERS.TOGETHER, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.TOGETHER, PROVIDERS.OPENROUTER];
            } else {
                console.log(`%c${functionName} Dispatching (Fallback): STANDARD SPEED PLAY (Under 6k tokens)`, 'color: #00D09B; font-weight: bold;');
                providerSequence = [PROVIDERS.GROQ, PROVIDERS.GROQ, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.GROQ, PROVIDERS.TOGETHER, PROVIDERS.GEMINI];
            }
        }
    } else if (estimatedTokenCount > 6000) {
        console.log(`%c${functionName} Dispatching: LONG CONTEXT PLAY (Over 6k tokens)`, 'color: #9c27b0; font-weight: bold;');
        if (Math.random() < 0.50) {
            console.log('--> Play Call: PRESS-A (Together Lead)');
            providerSequence = [PROVIDERS.TOGETHER, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.GEMINI, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.OPENROUTER];
        } else {
            console.log('--> Play Call: PRESS-B (Gemini Lead)');
            providerSequence = [PROVIDERS.GEMINI, PROVIDERS.GEMINI, PROVIDERS.TOGETHER, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.TOGETHER, PROVIDERS.OPENROUTER];
        }
    } else {
        console.log(`%c${functionName} Dispatching: STANDARD SPEED PLAY (Under 6k tokens)`, 'color: #00D09B; font-weight: bold;');
        providerSequence = [PROVIDERS.GROQ, PROVIDERS.GROQ, PROVIDERS.TOGETHER, PROVIDERS.GEMINI, PROVIDERS.GROQ, PROVIDERS.TOGETHER, PROVIDERS.GEMINI];
    }
  
    console.log(`%c${functionName} Full Failover Plan:`, 'color: #8a2be2; font-weight: bold;', providerSequence.join(' ➔ '));

    // --- Run the Carousel ---
    for (const provider of providerSequence) {
        if (abortSignal?.aborted) {
            console.log(`%c${functionName} Aborted by user before trying [${provider}].`, 'color: #ff6347;');
            console.groupEnd();
            throw new Error("Operation aborted by user.");
        }
        console.log(`%c${functionName} --> ATTEMPTING provider [${provider}]`, 'color: #007acc; font-weight: bold;');
        try {
            let rawApiResponse: string | object | null = null; 

            if (provider === PROVIDERS.GEMINI) {
                const geminiModel = GEMINI_MODELS?.TEXT || "gemini-1.5-flash-latest";
                const geminiResult = await _geminiInternalApiCaller(geminiPayloadForGemini, geminiModel, "generateContent", abortSignal);
                console.log(`%c${functionName} ...with the assist from Gemini's: ${geminiResult.nickname}!`, 'color: #34A853;');
                rawApiResponse = geminiResult.response; 
            } else { // For Groq, Together, OpenRouter (OpenAI compatible)
                let apiKey: string | undefined;
                let model: string | undefined;
                let apiCallOptions: any = { temperature: 0.7 }; 
                if (expectJson) {
                    apiCallOptions.response_format = { type: "json_object" };
                }
                
                if (provider === PROVIDERS.GROQ) {
                    model = GROQ_MODELS?.TEXT_CHAT || "llama3-8b-8192"; // Fallback model for Groq
                    apiKey = 'proxied-by-cloudflare-worker'; 
                } else if (provider === PROVIDERS.OPENROUTER) {
                    apiKey = import.meta.env.VITE_OPEN_ROUTER_API_KEY;
                    model = OPENROUTER_MODELS?.TEXT_CHAT || "meta-llama/llama-3.1-8b-instruct:free"; // Fallback for OpenRouter
                } else if (provider === PROVIDERS.TOGETHER) {
                    const VITE_TOGETHER_AI_KEYS_CONFIG = [ // Renamed for clarity
                        { name: 'FRANZ',  key: import.meta.env.VITE_TOGETHER_API_KEY_FRANZ },
                        { name: 'NASH',   key: import.meta.env.VITE_TOGETHER_API_KEY_NASH },
                        { name: 'KAREEM', key: import.meta.env.VITE_TOGETHER_API_KEY_KAREEM },
                        { name: 'DURANT', key: import.meta.env.VITE_TOGETHER_API_KEY_DURANT },
                        { name: 'PIPPEN', key: import.meta.env.VITE_TOGETHER_API_KEY_PIPPEN },
                        { name: 'SPIDA',  key: import.meta.env.VITE_TOGETHER_API_KEY_SPIDA },
                        { name: 'HARDEN', key: import.meta.env.VITE_TOGETHER_API_KEY_HARDEN },
                        { name: 'DAME',   key: import.meta.env.VITE_TOGETHER_API_KEY_DAME },
                        { name: 'PARKER', key: import.meta.env.VITE_TOGETHER_API_KEY_PARKER },
                        { name: 'TRAE',   key: import.meta.env.VITE_TOGETHER_API_KEY_TRAE },
                        { name: 'HAKEEM', key: import.meta.env.VITE_TOGETHER_API_KEY_HAKEEM },
                    ];
                    const validTogetherKeys = VITE_TOGETHER_AI_KEYS_CONFIG.filter(k => k.key && !k.key.includes("YOUR_") && k.key.trim() !== "");

                    if (validTogetherKeys.length > 0) {
                        console.log(`%c${functionName} [Together AI Check] SUCCESS: Found ${validTogetherKeys.length} valid Together AI key(s). Provider is ready.`, 'color: #28a745; font-weight: bold;');
                        const selectedPlayer = validTogetherKeys[Math.floor(Math.random() * validTogetherKeys.length)];
                        apiKey = selectedPlayer.key;
                        apiCallOptions._nickname = selectedPlayer.name; // For logging in openaiCompatibleApiCaller
                    } else {
                        console.error(`%c${functionName} [Together AI Check] FAILED: No valid VITE_TOGETHER_API_KEY... keys found in .env file or all are placeholders.`, 'color: #dc3545; font-weight: bold;');
                        console.log(`${functionName} Ensure .env keys are set and the dev server was RESTARTED if they were recently changed.`);
                        throw new Error("No valid Together AI keys configured or available."); 
                    }
                    model = TOGETHER_MODELS?.TEXT_CHAT || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"; // Fallback for Together
                }

                if (!model) { throw new Error(`${functionName} Model for provider [${provider}] not defined or missing fallback.`); }
                if (!apiKey) { throw new Error(`${functionName} API key for provider [${provider}] not defined or missing.`); }
                
                rawApiResponse = await _openaiCompatibleApiCaller(openAIMessagesForNonGemini, model, provider, apiKey, apiCallOptions, abortSignal);
            }

            console.log(`${functionName} Raw API response from [${provider}]:`, typeof rawApiResponse === 'string' ? rawApiResponse.substring(0,200) + (rawApiResponse.length > 200 ? "..." : "") : rawApiResponse);

            if (!rawApiResponse && typeof rawApiResponse !== 'string') { // Handles null/undefined specifically. An empty string IS a valid response for non-JSON.
                throw new Error(`${functionName} Provider [${provider}] returned a null or undefined response.`);
            }
            // If rawApiResponse is an empty string "", it will be handled by the logic below.

            if (expectJson) {
                if (typeof rawApiResponse === 'object' && rawApiResponse !== null) { // Check for null explicitly
                    console.log(`%c${functionName} <-- SUCCESS from [${provider}] (expectJson: true, received object).`, 'color: #28a745; font-weight: bold;');
                    console.groupEnd();
                    return rawApiResponse;
                } else if (typeof rawApiResponse === 'string') {
                    if (rawApiResponse.trim() === "") { // Handle empty string when expecting JSON
                        throw new Error(`${functionName} Provider [${provider}] (expectJson: true) - Received an empty string response, cannot parse as JSON.`);
                    }
                    try {
                        const parsedJson = JSON.parse(rawApiResponse);
                        console.log(`%c${functionName} <-- SUCCESS from [${provider}] (expectJson: true, parsed string to object).`, 'color: #28a745; font-weight: bold;');
                        console.groupEnd();
                        return parsedJson;
                    } catch (e: any) {
                        throw new Error(`${functionName} Provider [${provider}] (expectJson: true) - Failed to parse response string as JSON. Error: ${e.message}. String was: ${rawApiResponse.substring(0,200)}...`);
                    }
                } else {
                    throw new Error(`${functionName} Provider [${provider}] (expectJson: true) - Received unexpected response type: ${typeof rawApiResponse}`);
                }
            } else { // Expecting string
                if (typeof rawApiResponse === 'string') {
                    // For non-JSON, an empty string can be a valid (though perhaps unhelpful) response.
                    // The original check `rawApiResponse.trim() !== ''` would throw for empty strings.
                    // Let's allow empty strings to pass here, the caller can decide if it's useful.
                    // If you want to treat empty strings as errors for text, re-add `&& rawApiResponse.trim() !== ''`
                    console.log(`%c${functionName} <-- SUCCESS from [${provider}] (expectJson: false, received string).`, 'color: #28a745; font-weight: bold;');
                    console.groupEnd();
                    return rawApiResponse; 
                } else if (typeof rawApiResponse === 'object' && rawApiResponse !== null && provider === PROVIDERS.GEMINI) {
                    const geminiObject = rawApiResponse as any; 
                    if (geminiObject?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const extractedText = geminiObject.candidates[0].content.parts[0].text;
                        console.log(`%c${functionName} <-- SUCCESS from [${provider}] (expectJson: false, extracted text from Gemini object). Text: "${extractedText.substring(0,100)}..."`, 'color: #28a745; font-weight: bold;');
                        console.groupEnd();
                        return extractedText;
                    } else if (geminiObject?.promptFeedback?.blockReason) {
                        const blockMessage = `(Blocked by Gemini: ${geminiObject.promptFeedback.blockReason})`;
                        console.warn(`${functionName} Provider [${provider}] response blocked. Reason: ${geminiObject.promptFeedback.blockReason}`);
                        throw new Error(blockMessage); // Throw to allow failover
                    } else {
                        console.warn(`${functionName} Provider [${provider}] (expectJson: false) - Gemini object received, but text could not be extracted. Object:`, geminiObject);
                        throw new Error(`${functionName} Provider [${provider}] (expectJson: false) - Gemini object received, but text could not be extracted.`);
                    }
                } else {
                     throw new Error(`${functionName} Provider [${provider}] (expectJson: false) - Expected string, but received type: ${typeof rawApiResponse}. Value: ${JSON.stringify(rawApiResponse)}`);
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log(`%c${functionName} <-- ABORTED by user. Request for [${provider}] cancelled.`, 'color: #ff6347;');
                console.groupEnd(); 
                throw error; 
            }
            console.warn(`%c${functionName} <-- FAILED. Provider [${provider}] threw an error. Trying next...`, 'color: #dc3545;');
            console.log(`${functionName} Error Details:`, error.message);
            // console.error(error.stack); // Uncomment for full stack trace during debugging
        }
    }
    
    console.error(`${functionName} FINAL ERROR. All providers in the sequence failed.`);
    console.groupEnd();
    return getRandomHumanError(); 
}
// ================================================================================================

async function generateTextFromImageAndTextOpenAI(
    base64ImageString: string,
    mimeType: string,
    connector: Connector | null,
    existingConversationHistory: GeminiChatItem[],
    userTextQuery?: string,
    provider: string = PROVIDERS.TOGETHER,
    abortSignal?: AbortSignal
): Promise<string | null> {
    const functionName = "[AI_TEXT_GEN_SVC.OpenAI_Vision]";
    console.log(`${functionName} CALLED FOR CONNECTOR: ${connector?.id} (${connector?.profileName})`);

    // --- DEPENDENCY & INPUT VALIDATION ---
    const _openaiCompatibleApiCaller = (window as any).openaiCompatibleApiCaller;
    if (!_openaiCompatibleApiCaller) {
        console.error(`${functionName} CRITICAL: _openaiCompatibleApiCaller is not available on window.`);
        return getRandomHumanError();
    }
    if (!connector) {
        console.error(`${functionName} CRITICAL: Connector object is missing.`);
        return getRandomHumanError();
    }
    if (!base64ImageString) {
        console.error(`${functionName} CRITICAL: base64ImageString is missing.`);
        return getRandomHumanError();
    }

    // --- PROMPT & PAYLOAD PREPARATION ---
    // FIX: Prioritize the incoming prompt, with a safe fallback.
    const finalUserPrompt = userTextQuery || "What do you think of this image?";
    console.log(`${functionName} Using Final Prompt: "${finalUserPrompt}"`);
    console.log(`${functionName} MimeType: ${mimeType}`);

    let apiKeyToUse: string | undefined;
    let modelForVision: string | undefined;
    let apiCallOptions: any = { temperature: 0.5, max_tokens: 512 };

    // --- PROVIDER-SPECIFIC SETUP ---
    if (provider === PROVIDERS.TOGETHER) {
        // FIX: Explicitly type the array to prevent 'never' type error.
        const VITE_TOGETHER_AI_KEYS: { name: string; key: string | undefined }[] = [
            { name: 'FRANZ',  key: import.meta.env.VITE_TOGETHER_API_KEY_FRANZ },
            { name: 'NASH',   key: import.meta.env.VITE_TOGETHER_API_KEY_NASH },
            { name: 'KAREEM', key: import.meta.env.VITE_TOGETHER_API_KEY_KAREEM },
            // Add all other keys here...
        ].filter(k => k.key); // Filter out any that are undefined

        if (VITE_TOGETHER_AI_KEYS.length === 0) {
            console.error(`${functionName} FAILED: No valid VITE_TOGETHER_API_KEY... keys found in .env file.`);
            return getRandomHumanError();
        }

        const selectedPlayer = VITE_TOGETHER_AI_KEYS[Math.floor(Math.random() * VITE_TOGETHER_AI_KEYS.length)];
        apiKeyToUse = selectedPlayer.key;
        apiCallOptions._nickname = selectedPlayer.name; // Pass nickname for logging in the caller
        modelForVision = TOGETHER_MODELS?.VISION;
        apiCallOptions.temperature = 0.2; // Adjust temperature for Together
        console.warn(`${functionName} PROVIDER IS TOGETHER. Player: ${selectedPlayer.name}. Temp: ${apiCallOptions.temperature}.`);

    } else {
        console.error(`${functionName} Vision provider [${provider}] not supported by this OpenAI-compatible path.`);
        return getRandomHumanError();
    }

    if (!modelForVision) {
        console.error(`${functionName} Vision model for provider [${provider}] not defined in aiConstants.`);
        return getRandomHumanError();
    }
    if (!apiKeyToUse || apiKeyToUse.includes("YOUR_")) {
         console.error(`${functionName} API key for provider [${provider}] is missing or is a placeholder.`);
        return getRandomHumanError();
    }
    
    // --- PAYLOAD ASSEMBLY ---
    const systemPrompt = `You are ${connector.profileName}. Respond naturally in ${connector.language}.`;
    const openAIMessages = convertGeminiHistoryToOpenAIMessages(existingConversationHistory, systemPrompt);
    
    // Define the type for the parts array to be more specific
    const userMessageContentParts: ({ type: "text"; text: string; } | { type: "image_url"; image_url: { url: string; }; })[] = [
        { type: "text", text: finalUserPrompt }
    ];

    if (base64ImageString) {
        // --- THIS IS THE FIX ---
        let finalImageUrl = base64ImageString;
    
        // Check if the Base64 string ALREADY includes the Data URL prefix.
        if (!finalImageUrl.startsWith('data:')) {
            // If it doesn't, add it. This makes the function robust.
            finalImageUrl = `data:${mimeType};base64,${finalImageUrl}`;
        }
        // Now, `finalImageUrl` is guaranteed to be a correctly formatted Data URL.
    
        userMessageContentParts.push({ 
            type: "image_url", 
            image_url: { url: finalImageUrl } 
        });
    }
    
    openAIMessages.push({ role: "user", content: userMessageContentParts });

    // --- DETAILED DEBUG LOGGING ---
    console.log(`${functionName}_DEBUG] PROVIDER: ${provider}`);
    console.log(`${functionName}_DEBUG] MODEL_FOR_VISION: ${modelForVision}`);
    console.log(`${functionName}_DEBUG] API_KEY_USED (first 5 chars): ${apiKeyToUse?.substring(0,5)}...`);
    console.log(`${functionName}_DEBUG] OPTIONS passed to caller:`, JSON.stringify(apiCallOptions, null, 2));
    console.log(`${functionName}_DEBUG] PAYLOAD being sent to _openaiCompatibleApiCaller:`);
    try {
        console.log(JSON.stringify(openAIMessages, (key, value) => {
            if (key === 'image_url' && typeof value === 'object' && value?.url?.startsWith('data:image')) {
                return { ...value, url: value.url.substring(0, 80) + '...[TRUNCATED]' };
            }
            return value;
        }, 2));
    } catch (e) {
        console.error(`${functionName}_DEBUG] Error stringifying payload:`, e);
    }
    
    // --- API CALL ---
    try {
        console.log(`%c${functionName}: --> ATTEMPTING call to [${provider}] vision service.`, 'color: #17a2b8');
        const response = await _openaiCompatibleApiCaller(openAIMessages, modelForVision, provider, apiKeyToUse, apiCallOptions, abortSignal);
        
        // Add a check here. If the response itself is an error string, treat it as a failure.
        if (typeof response === 'string' && HUMAN_LIKE_ERROR_MESSAGES.includes(response)) {
             console.warn(`${functionName}: <-- API returned a fallback error string. Treating as failure.`);
             throw new Error("API returned a known error message.");
        }

        console.log(`%c${functionName}: <-- SUCCESS from [${provider}].`, 'color: #28a745');
        return response;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log(`%c<-- ABORTED by user. Vision request for [${provider}] was cancelled.`, 'color: #ff6347;');
            throw error; 
        }
        console.error(`${functionName}: <-- FAILED. Error: ${error.message}`);
        // FIX: Re-throw the original error to trigger the failover in the calling service.
        throw error;
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