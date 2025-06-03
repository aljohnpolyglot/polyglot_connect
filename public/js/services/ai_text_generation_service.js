// js/services/ai_text_generation_service.js
window.aiTextGenerationService = (() => {
    'use strict';
    console.log("ai_text_generation_service.js: Script execution STARTED.");

    const criticalDeps = {
        _geminiInternalApiCaller: window._geminiInternalApiCaller,
        _openaiCompatibleApiCaller: window._openaiCompatibleApiCaller,
        _aiApiConstants: window._aiApiConstants
    };

    if (Object.values(criticalDeps).some(dep => !dep)) {
        console.error("AI Text Generation Service: Critical dependencies missing. Service will be non-functional.");
        const errorFn = async (userText = "", connector = {}, history = []) => {
            const errorMsg = window._aiApiConstants?.HUMAN_LIKE_ERROR_MESSAGES?.[0] || "(Text generation service not initialized. Please try again.)";
            console.error("AI Text Generation Service called in error state (missing dependencies).");
            return errorMsg;
        };
        return {
            generateTextMessage: errorFn,
            generateTextFromImageAndTextOpenAI: errorFn,
            generateTextForGeminiCallModal: errorFn
        };
    }
    console.log("ai_text_generation_service.js: All critical dependencies appear present.");

    const callGeminiAPIInternal = criticalDeps._geminiInternalApiCaller;
    const callOpenAICompatibleAPI = criticalDeps._openaiCompatibleApiCaller;
    const { PROVIDERS, GEMINI_MODELS, GROQ_MODELS, TOGETHER_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI, HUMAN_LIKE_ERROR_MESSAGES } = criticalDeps._aiApiConstants;

    function getRandomHumanError() {
        // ... (same as before)
        if (!HUMAN_LIKE_ERROR_MESSAGES || HUMAN_LIKE_ERROR_MESSAGES.length === 0) {
            return "(I'm having a little trouble responding right now. Please try again!)";
        }
        return HUMAN_LIKE_ERROR_MESSAGES[Math.floor(Math.random() * HUMAN_LIKE_ERROR_MESSAGES.length)];
    }

    function convertGeminiHistoryToOpenAIMessages(geminiHistory, systemPromptText = null) {
        // ... (same as before) ...
        const messages = [];
        if (systemPromptText && typeof systemPromptText === 'string' && systemPromptText.trim() !== '') {
            messages.push({ role: "system", content: systemPromptText });
        }

        if (Array.isArray(geminiHistory)) {
            // ... (rest of conversion logic) ...
        }
        return messages;
    }

    function prepareGeminiPayload(geminiHistory, userText) {
        // ... (same as before) ...
        const history = Array.isArray(geminiHistory) ? [...geminiHistory] : [];
        history.push({ role: "user", parts: [{ text: userText }] });
        return { contents: history, generationConfig: { temperature: 0.7 } };
    }

    async function generateTextMessage(userText, connector, existingGeminiHistory, preferredProvider = PROVIDERS.GROQ) {
        console.log("AI Text Gen Service: generateTextMessage - START. Preferred:", preferredProvider, "Connector:", connector?.id);
        // ... (rest of generateTextMessage logic is likely okay if text chat works, but ensure logs are present) ...
        const currentHistory = Array.isArray(existingGeminiHistory) ? [...existingGeminiHistory] : [];
        let systemPromptForOpenAI = null;
        if (currentHistory.length > 0 && currentHistory[0].role === 'user' && 
            currentHistory[0].parts[0]?.text?.toUpperCase().includes("CRITICAL INSTRUCTION")) {
            systemPromptForOpenAI = currentHistory[0].parts[0].text;
        }
        const openAIMessages = convertGeminiHistoryToOpenAIMessages(
            systemPromptForOpenAI ? currentHistory.slice(1) : currentHistory, systemPromptForOpenAI
        );
        openAIMessages.push({ role: "user", content: userText });
        const geminiPayload = prepareGeminiPayload(currentHistory, userText);
        const providerSequence = [preferredProvider, PROVIDERS.GROQ, PROVIDERS.TOGETHER, PROVIDERS.GEMINI]
            .filter((value, index, self) => self.indexOf(value) === index);

        for (let i = 0; i < providerSequence.length; i++) {
            const provider = providerSequence[i];
            let apiKey, model;
            console.log(`AI Text Gen Service: Attempting text with ${provider} (Attempt ${i + 1}/${providerSequence.length}) for '${connector.id}'.`);
            try {
                if (provider === PROVIDERS.GROQ) { /* ... */ return await callOpenAICompatibleAPI(openAIMessages, GROQ_MODELS.TEXT_CHAT, provider, window.GROQ_API_KEY, { temperature: 0.7 }); }
                else if (provider === PROVIDERS.TOGETHER) { /* ... */  return await callOpenAICompatibleAPI(openAIMessages, TOGETHER_MODELS.TEXT_CHAT, provider, window.TOGETHER_API_KEY, { temperature: 0.7 }); }
                else if (provider === PROVIDERS.GEMINI) { /* ... */ return await callGeminiAPIInternal(geminiPayload, GEMINI_MODELS.TEXT, "generateContent"); }
                // ... error handling ...
            } catch (error) {
                console.warn(`AI Text Gen Service: Provider ${provider} failed for text. Error: ${error.message}`);
                if (i === providerSequence.length - 1) { throw error; }
            }
        }
        console.error("AI Text Gen Service: All providers failed for text generation.");
        return getRandomHumanError();
    }

    async function generateTextFromImageAndTextOpenAI(base64ImageString, mimeType, connector, existingConversationHistory, userTextQuery, provider = PROVIDERS.TOGETHER) {
        console.log("AI Text Gen Service: generateTextFromImageAndTextOpenAI - START. Provider:", provider, "Connector:", connector?.id);
        
        let apiKeyToUse;
        let modelForVision;

        if (provider === PROVIDERS.TOGETHER) {
            apiKeyToUse = window.TOGETHER_API_KEY;
            modelForVision = TOGETHER_MODELS.VISION; // Use the constant
            console.log("AI Text Gen Service: Using TogetherAI for vision. Model from constant:", modelForVision);
        } else {
            console.error(`AI Text Gen Service: generateTextFromImageAndTextOpenAI - Unsupported provider for vision: ${provider}. Defaulting to error.`);
            return getRandomHumanError(); // Or throw new Error
        }

        if (!apiKeyToUse || apiKeyToUse.includes("YOUR_") || apiKeyToUse.trim() === '') {
            console.error(`AI Text Gen Service: API key for ${provider} (Vision) is invalid or not configured.`);
            return getRandomHumanError();
        }
        if (!modelForVision) {
            console.error(`AI Text Gen Service: Vision model identifier for ${provider} is not defined in constants (TOGETHER_MODELS.VISION).`);
            return getRandomHumanError();
        }

        if (!connector) { console.error("AI Text Gen Service (Image): Connector info missing."); return getRandomHumanError(); }
        if (!base64ImageString) { console.error("AI Text Gen Service (Image): Base64 image string missing."); return getRandomHumanError(); }
        if (!userTextQuery) { console.error("AI Text Gen Service (Image): User text query missing."); return getRandomHumanError(); }

        let systemPrompt = `You are ${connector.profileName || 'a helpful assistant'}. The user has provided an image and some text. Respond naturally in ${connector.language || 'English'}.`;
        const openAIMessages = convertGeminiHistoryToOpenAIMessages(existingConversationHistory, systemPrompt); 
        
        openAIMessages.push({
            role: "user",
            content: [
                { type: "text", text: userTextQuery },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64ImageString}` } }
            ]
        });
        
        console.log(`AI Text Gen Service: Attempting image-text with ${provider} (Model: ${modelForVision}) for connector ${connector.id}. Payload messages count: ${openAIMessages.length}`);
        try {
            const response = await callOpenAICompatibleAPI(openAIMessages, modelForVision, provider, apiKeyToUse, { temperature: 0.5, max_tokens: 512 });
            console.log("AI Text Gen Service: generateTextFromImageAndTextOpenAI - Response received:", typeof response === 'string' ? response.substring(0, 50) + "..." : "[Non-string response]");
            return response;
        } catch (error) {
            console.error(`AI Text Gen Service: Image-text with ${provider} (Model: ${modelForVision}) failed. Error: ${error.message}`, error);
            // Check if the error is a 404 for model not found, which might indicate the constant is wrong for the key
            if (error.status === 404 && error.message?.includes("Unable to access model")) {
                console.error(`AI Text Gen Service: The model '${modelForVision}' might be incorrect for your ${provider} API key or region. Please verify on the provider's website.`);
            }
            return getRandomHumanError(); // Return a generic error for now, ai_service.js will handle fallback
        }
    }
    
    async function generateTextForGeminiCallModal(userText, connector, modalCallHistory) {
        console.log("AI Text Gen Service: generateTextForGeminiCallModal - START. Connector:", connector?.id);
        // ... (rest of generateTextForGeminiCallModal logic is likely okay if text chat works, but ensure logs are present) ...
        if (!connector || !connector.language || !connector.profileName) { /* ... */ return getRandomHumanError(); }
        if (userText === undefined || userText === null) { /* ... */ return getRandomHumanError(); }
        try {
            // ... (payload construction) ...
            const geminiPayload = { /* ... */ };
            console.log("AI Text Gen Service: Calling Gemini for Call Modal text.");
            return await callGeminiAPIInternal(geminiPayload, GEMINI_MODELS.TEXT, "generateContent");
        } catch (error) {
            console.error(`AI Text Gen Service: Gemini Call Modal text failed for '${connector.profileName}'. Error: ${error.message}`);
            return getRandomHumanError();
        }
    }

    console.log("services/ai_text_generation_service.js loaded with enhanced multi-provider fallback, API key checks, and human-like error handling.");
    return {
        generateTextMessage,
        generateTextFromImageAndTextOpenAI,
        generateTextForGeminiCallModal
    };
})();