// js/services/ai_text_generation_service.js
window.aiTextGenerationService = (() => {
    'use strict';

    // Check dependencies and API keys
    if (!window._geminiInternalApiCaller || !window._openaiCompatibleApiCaller || !window._aiApiConstants) {
        console.error("AI Text Generation Service: Core API callers or constants not found.");
        const errorFn = async () => { throw new Error("Text Generation Service not properly initialized."); };
        return {
            generateTextMessage: errorFn,
            generateTextFromImageAndTextOpenAI: errorFn,
            generateTextForGeminiCallModal: errorFn
        };
    }

    const callGeminiAPIInternal = window._geminiInternalApiCaller;
    const callOpenAICompatibleAPI = window._openaiCompatibleApiCaller;
    const { PROVIDERS, GEMINI_MODELS, GROQ_MODELS, TOGETHER_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI } = window._aiApiConstants;

    // Helper function for converting history formats for OpenAI compatible APIs
    function convertGeminiHistoryToOpenAIMessages(geminiHistory, systemPromptText = null) {
        const messages = [];
        if (systemPromptText) {
            // Ensure system prompt is the very first message if provided
            messages.push({ role: "system", content: systemPromptText });
        }

        // Add actual history, ensuring user/assistant alternation if possible
        // and handling cases where history might not start with a system/user prompt
        let lastRole = systemPromptText ? "system" : null;

        for (const turn of geminiHistory) {
            let currentRole = turn.role;
            if (currentRole === "model") {
                currentRole = "assistant";
            }
            // Avoid consecutive messages from the same role for OpenAI if it's not 'system'
            if (currentRole === lastRole && currentRole !== "system") {
                // Append to last message content or skip/modify logic here
                // For simplicity, let's assume history is already well-formed or we just map roles
            }
            
            messages.push({
                role: currentRole,
                content: turn.parts[0]?.text || ""
            });
            lastRole = currentRole;
        }
        return messages;
    }

    // Helper function to prepare Gemini payload from history
    function prepareGeminiPayload(geminiHistory, userText) {
        // Ensure geminiHistory is an array
        const history = Array.isArray(geminiHistory) ? [...geminiHistory] : [];
        
        // Add the current user text as the last turn
        history.push({ role: "user", parts: [{ text: userText }] });

        return {
            contents: history,
            safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI,
            generationConfig: {
                temperature: 0.7,
                // maxOutputTokens: 1024, // Optional: if you want to set it here
            }
        };
    }


    // Main text generation with fallbacks
    async function generateTextMessage(userText, connector, existingGeminiHistory, provider = PROVIDERS.GROQ) {
        let currentProvider = provider;
        let attempts = 0;
        const maxAttempts = 3; // Max attempts for all providers combined

        // Ensure existingGeminiHistory is an array, even if initially null or undefined
        const currentHistory = Array.isArray(existingGeminiHistory) ? [...existingGeminiHistory] : [];
        
        // Prepare a simple system prompt if not explicitly handled in history conversion
        // This depends on how your connector.systemPrompt or other prompts are structured.
        // For this generic function, let's assume history starts with user/model turns.
        // Or, if connector has a system_prompt, it could be used.
        // For now, we'll rely on convertGeminiHistoryToOpenAIMessages to handle history as is.


        while (attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`Attempting text generation with ${currentProvider}, attempt ${attempts}`);
                if (currentProvider === PROVIDERS.GROQ) {
                    if (!window.GROQ_API_KEY || window.GROQ_API_KEY.includes("YOUR_")) throw new Error("Groq API key not configured or is placeholder");
                    // Add current userText to history for OpenAI-compatible payload
                    const messagesForOpenAI = convertGeminiHistoryToOpenAIMessages(currentHistory);
                    messagesForOpenAI.push({ role: "user", content: userText });

                    return await callOpenAICompatibleAPI(
                        messagesForOpenAI,
                        GROQ_MODELS.TEXT_CHAT,
                        PROVIDERS.GROQ,
                        window.GROQ_API_KEY,
                        { temperature: 0.7 }
                    );
                } else if (currentProvider === PROVIDERS.TOGETHER) {
                    if (!window.TOGETHER_API_KEY || window.TOGETHER_API_KEY.includes("YOUR_")) throw new Error("Together AI key not configured or is placeholder");
                    // Add current userText to history for OpenAI-compatible payload
                    const messagesForOpenAI = convertGeminiHistoryToOpenAIMessages(currentHistory);
                    messagesForOpenAI.push({ role: "user", content: userText });
                    
                    return await callOpenAICompatibleAPI(
                        messagesForOpenAI,
                        TOGETHER_MODELS.TEXT_CHAT,
                        PROVIDERS.TOGETHER,
                        window.TOGETHER_API_KEY,
                        { temperature: 0.7 }
                    );
                } else if (currentProvider === PROVIDERS.GEMINI) {
                    // Gemini caller handles its own keys internally via window.GEMINI_API_KEY
                    // We need to construct the geminiPayload here using currentHistory and userText
                    const geminiPayload = prepareGeminiPayload(currentHistory, userText); // <-- DEFINE geminiPayload

                    return await callGeminiAPIInternal(geminiPayload, GEMINI_MODELS.TEXT, "generateContent");
                }
            } catch (error) {
                console.warn(`Provider ${currentProvider} failed on text generation. Attempt ${attempts}. Error:`, error.message, error.stack ? error.stack.substring(0,300) : '');
                
                if (currentProvider === PROVIDERS.GROQ) {
                    currentProvider = PROVIDERS.TOGETHER;
                } else if (currentProvider === PROVIDERS.TOGETHER) {
                    currentProvider = PROVIDERS.GEMINI;
                } else if (currentProvider === PROVIDERS.GEMINI) { // Was Gemini, last attempt for this provider
                    // If Gemini was the last in the fallback chain and it fails, we break or throw.
                    if (attempts >= maxAttempts) { // Check against total attempts for all providers
                        console.error("All providers failed for text generation. Last error with Gemini:", error);
                        throw error; // Re-throw the last error to be caught by the caller
                    }
                    // If there are more attempts allowed overall, but Gemini was the last provider in sequence,
                    // this loop will exit. The calling function should handle this.
                    // For now, let's just break and let the outer message handle it.
                    break; 
                }
            }
        }
        // This message is returned if all attempts across all providers fail or if the loop completes without a return.
        console.error("Text generation failed after all attempts or due to unhandled provider sequence.");
        return `(I'm currently unable to generate a response. Please try again shortly.)`;
    }

    // Image and text processing function
    async function generateTextFromImageAndTextOpenAI(
        base64ImageString,
        mimeType,
        connector, // Assuming connector might have system prompt or context
        existingGeminiHistory, // This should be the conversation history
        textPrompt, // The specific user text prompt accompanying the image
        provider = PROVIDERS.TOGETHER
    ) {
        if (!window.TOGETHER_API_KEY || window.TOGETHER_API_KEY.includes("YOUR_")) throw new Error("Together AI key not configured or is placeholder for image processing.");
        if (!connector) throw new Error("Connector info missing for image processing.");
        if (!base64ImageString) throw new Error("Base64 image string missing for image processing.");
        if (!textPrompt) throw new Error("Text prompt missing for image processing.");

        // Use a system prompt from the connector if available, or a generic one
        const systemPrompt = connector.system_prompt || `You are a helpful assistant. The user has provided an image and some text.`;
        
        const messages = convertGeminiHistoryToOpenAIMessages(
            existingGeminiHistory,
            systemPrompt // Pass the system prompt here
        );
        
        messages.push({
            role: "user",
            content: [
                { type: "text", text: textPrompt },
                {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64ImageString}` }
                }
            ]
        });

        return await callOpenAICompatibleAPI(
            messages,
            TOGETHER_MODELS.VISION, // Ensure this model is correct for Together AI's vision capabilities
            provider, // Should be PROVIDERS.TOGETHER
            window.TOGETHER_API_KEY,
            { temperature: 0.5, max_tokens: 512 }
        );
    }

    // --- Gemini-Specific Text Generation for Call Modal ---
    async function generateTextForGeminiCallModal(userText, connector, modalCallHistory) {
        if (!connector || !connector.language || !connector.profileName) {
            throw new Error("Connector info (language, profileName) missing for generateTextForCallModal.");
        }
        if (userText === undefined || userText === null) throw new Error("User text missing for generateTextForCallModal.");

        const systemPrompt = `You are ${connector.profileName}, a ${connector.modernTitle || 'language partner'} from ${connector.city}. You are in a voice call with a user practicing ${connector.language}. The user has just TYPED the following text to you. Respond ONLY in ${connector.language}, keeping it brief and natural for a call. Maintain your persona. DO NOT mention being an AI.`;

        // Build contents for Gemini API
        const contents = [];
        
        // Start with the system prompt (as a user turn, then model ack, is a common pattern for Gemini)
        contents.push({ role: "user", parts: [{ text: systemPrompt }] });
        contents.push({ role: "model", parts: [{ text: `Okay, I understand. I am ${connector.profileName}. I will respond to the user's typed message in ${connector.language}, keeping it brief and natural for a call, maintaining my persona, and without mentioning I am an AI.` }] });

        // Add recent modalCallHistory
        // Ensure modalCallHistory is an array before slicing
        const historyToAdd = Array.isArray(modalCallHistory) ? modalCallHistory.slice(-10) : [];
        historyToAdd.forEach(turn => {
            contents.push({
                role: turn.sender && turn.sender.toLowerCase().startsWith('user') ? 'user' : 'model',
                parts: [{ text: typeof turn.text === 'string' ? turn.text : "[interaction segment]" }]
            });
        });
        
        // Add the current user text
        contents.push({ role: "user", parts: [{ text: userText }] });

        const geminiPayload = { // Correctly named payload for Gemini
            contents: contents,
            safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI,
            generationConfig: { temperature: 0.7 }
        };

        try {
            console.log(`aiTextGenerationService: Requesting text for Gemini Call Modal for connector '${connector.id}'`);
            return await callGeminiAPIInternal(geminiPayload, GEMINI_MODELS.TEXT, "generateContent");
        } catch (error) {
            console.error(`aiTextGenerationService.generateTextForCallModal Error for ${connector.profileName}:`, error.message, error.stack ? error.stack.substring(0,300) : '');
            return `(Text input error during call: ${error.message.substring(0, 30)}...)`;
        }
    }

    console.log("services/ai_text_generation_service.js loaded (with API key handling and geminiPayload fix).");
    return {
        generateTextMessage,
        generateTextFromImageAndTextOpenAI,
        generateTextForGeminiCallModal
    };
})();