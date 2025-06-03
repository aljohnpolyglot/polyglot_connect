// js/services/gemini_text_generation_service.js
// Handles text generation for general chat and call modal typed input.

window.geminiTextGenerationService = (() => {
    'use strict';

    if (!window._geminiInternalApiCaller || !window._geminiApiConstants) {
        console.error("Gemini Text Generation Service: Core API utilities not found.");
        return {
            generateTextMessage: async () => { throw new Error("Text Generation Service not initialized."); },
            generateTextForCallModal: async () => { throw new Error("Text Generation Service not initialized."); }
        };
    }

    const callGeminiAPIInternal = window._geminiInternalApiCaller;
    const { MODEL_TEXT_RESPONSE, STANDARD_SAFETY_SETTINGS } = window._geminiApiConstants;

    async function generateTextMessage(userText, connector, existingGeminiHistory) {
        if (!connector) {
            console.error("geminiTextGenerationService.generateTextMessage: Connector info missing.");
            throw new Error("Connector info missing for generateTextMessage.");
        }
        if (!userText && userText !== "") {
            console.error("geminiTextGenerationService.generateTextMessage: User text is missing.");
            throw new Error("User text is missing for generateTextMessage.");
        }

        let currentHistory = [...existingGeminiHistory];
        currentHistory.push({ role: "user", parts: [{ text: userText }] });

        const payload = {
            contents: currentHistory,
            safetySettings: STANDARD_SAFETY_SETTINGS,
            generationConfig: { temperature: 0.75, topP: 0.95, topK: 40 }
        };

        try {
            console.log(`geminiTextGenerationService: Requesting text message for connector '${connector.id}'`);
            return await callGeminiAPIInternal(payload, MODEL_TEXT_RESPONSE, "generateContent");
        } catch (error) {
            console.error(`geminiTextGenerationService.generateTextMessage Error for ${connector.profileName || connector.name}:`, error.message);
            return `(I'm having a little trouble responding right now. Let's try that again, or pick a new topic?) Error: ${error.message.substring(0, 50)}`;
        }
    }

    async function generateTextForCallModal(userText, connector, modalCallHistory) {
        if (!connector || !connector.language || !connector.profileName || !connector.modernTitle) {
            console.error("geminiTextGenerationService.generateTextForCallModal: Connector info (language, profileName, modernTitle) missing.");
            throw new Error("Connector info missing for generateTextForCallModal.");
        }
        if (!userText) {
            console.error("geminiTextGenerationService.generateTextForCallModal: User text missing.");
            throw new Error("User text missing for generateTextForCallModal.");
        }

        const systemPrompt = `You are ${connector.profileName}, a ${connector.modernTitle} from ${connector.city}. You are in a voice-enabled chat session with a user practicing ${connector.language}. ` +
                             `The user has just TYPED the following text to you. ` +
                             `Respond ONLY in ${connector.language}. Your response should be natural, conversational, and concise (1-3 sentences is ideal for a call). ` +
                             `Maintain your persona as ${connector.profileName}. ` +
                             `ABSOLUTELY DO NOT mention that you are an AI, a language model, or a computer program. ` +
                             `If the user's typed text asks about your nature, deflect it or answer as a human would.`;

        let contents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: `Okay, I am ${connector.profileName}. I'll respond to the user's typed message in ${connector.language}, keeping it brief and natural for our call.` }] }
        ];

        const MAX_MODAL_CALL_HISTORY_TURNS = 6;
        const recentHistory = modalCallHistory.slice(-MAX_MODAL_CALL_HISTORY_TURNS * 2);
        recentHistory.forEach(turn => {
            const role = turn.sender.startsWith('user') ? 'user' : 'model';
            const textContent = typeof turn.text === 'string' ? turn.text : "[previous audio/interaction segment]";
            contents.push({ role: role, parts: [{ text: textContent }] });
        });
        contents.push({ role: "user", parts: [{ text: userText }] });

        const payload = {
            contents: contents,
            safetySettings: STANDARD_SAFETY_SETTINGS
        };

        try {
            console.log(`geminiTextGenerationService: Requesting text for call modal for connector '${connector.id}'`);
            return await callGeminiAPIInternal(payload, MODEL_TEXT_RESPONSE, "generateContent");
        } catch (error) {
            console.error(`geminiTextGenerationService.generateTextForCallModal Error for ${connector.profileName}:`, error.message);
            return `(Text Input Error during call: ${error.message.substring(0, 30)}...)`;
        }
    }

    console.log("services/gemini_text_generation_service.js loaded.");
    return {
        generateTextMessage,
        generateTextForCallModal
    };
})();