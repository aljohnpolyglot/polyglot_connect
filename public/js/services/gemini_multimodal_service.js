// js/services/gemini_multimodal_service.js
// Handles Gemini API calls involving multiple modalities (e.g., audio input, image input).

window.geminiMultimodalService = (() => {
    'use strict';

    // CORRECTED DEPENDENCY CHECK: Use _aiApiConstants
    if (!window._geminiInternalApiCaller || !window._aiApiConstants) {
        console.error("Gemini Multimodal Service: Core API utilities (_geminiInternalApiCaller or _aiApiConstants) not found.");
        const errorFn = async (errorMessage = "Multimodal Service not initialized due to missing core utilities.") => {
            console.error("Gemini Multimodal Service Call Failed:", errorMessage);
            throw new Error(errorMessage);
        };
        return {
            generateTextFromAudioForCallModal: () => errorFn("generateTextFromAudioForCallModal called on uninitialized service."),
            generateTextFromImageAndText: () => errorFn("generateTextFromImageAndText called on uninitialized service."),
            transcribeAudioToText: () => errorFn("transcribeAudioToText called on uninitialized service.")
        };
    }

    const callGeminiAPIInternal = window._geminiInternalApiCaller;
    // Use the constants from _aiApiConstants
    const { GEMINI_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI } = window._aiApiConstants;

    async function transcribeAudioToText(base64AudioString, mimeType, languageHint = "en-US") {
        // console.log(`geminiMultimodalService: transcribeAudioToText called. Lang hint: ${languageHint}, MimeType: ${mimeType}`);
        if (!base64AudioString) {
            console.error("geminiMultimodalService.transcribeAudioToText: Audio data missing.");
            throw new Error("Audio data missing for transcription.");
        }

        // This prompt structure is more aligned with typical multimodal requests for Gemini
        const contents = [{
            role: "user",
            parts: [
                { text: `Please transcribe the following audio. The primary language spoken is likely ${languageHint}.` },
                { inlineData: { mimeType: mimeType, data: base64AudioString } }
            ]
        }];

        const payload = {
            contents: contents,
            safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI // Use Gemini-specific safety settings
        };
        // console.log("geminiMultimodalService.transcribeAudioToText: Payload:", JSON.stringify(payload).substring(0, 300) + "...");

        try {
            // Use the specific multimodal model if different, otherwise GEMINI_MODELS.TEXT can often handle it
            const transcription = await callGeminiAPIInternal(payload, GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT, "generateContent");
            // console.log("geminiMultimodalService: Transcription API call successful. Result:", transcription);
            if (typeof transcription !== 'string') {
                console.warn("geminiMultimodalService: Transcription result was not a string:", transcription);
                return ""; // Return empty string for non-string results
            }
            return transcription;
        } catch (error) {
            console.error(`geminiMultimodalService.transcribeAudioToText Error:`, error.message, error);
            throw error;
        }
    }

    async function generateTextFromAudioForCallModal(base64AudioString, mimeType, connector, modalCallHistory) {
        // console.log("geminiMultimodalService: generateTextFromAudioForCallModal called.");
        if (!connector) throw new Error("Connector info missing for audio call modal.");
        if (!base64AudioString) throw new Error("Audio data missing for audio call modal.");

        // This function is specific to the Live API context, where text is generated from audio.
        // The system prompt and history structure are tailored for Gemini's generateContent for this.
        let lastConnectorText = modalCallHistory.filter(t => t.sender === 'connector' && typeof t.text === 'string' && t.text.trim() !== "").pop()?.text || 'This is the start of our conversation.';
        const systemPrompt = `You are ${connector.profileName}... (Your existing system prompt for this scenario)... process the user's audio:`; // Keep your detailed prompt

        let contents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: `Okay, I am ${connector.profileName}. I'm listening and will respond in ${connector.language}.` }] }
        ];
        const MAX_TEXT_HISTORY_WITH_MODAL_AUDIO = 3;
        const recentTextTurns = modalCallHistory.filter(t => typeof t.text === 'string').slice(-(MAX_TEXT_HISTORY_WITH_MODAL_AUDIO * 2));
        recentTextTurns.forEach(turn => {
            contents.push({ role: turn.sender.startsWith('user') ? 'user' : 'model', parts: [{ text: turn.text }] });
        });
        contents.push({ role: "user", parts: [{ inlineData: { mimeType: mimeType, data: base64AudioString } }] }); // Audio part

        const payload = { contents: contents, safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI };
        // console.log("geminiMultimodalService.generateTextFromAudioForCallModal: Payload:", JSON.stringify(payload).substring(0, 300) + "...");

        try {
            // Using MULTIMODAL model here which is usually the same as TEXT for this kind of combined input with Gemini 1.5 Flash
            const response = await callGeminiAPIInternal(payload, GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT, "generateContent");
            // console.log("geminiMultimodalService: Audio processing (for call modal) successful. Response:", response);
            return response;
        } catch (error) {
            console.error(`geminiMultimodalService.generateTextFromAudioForCallModal Error for ${connector.profileName}:`, error);
            return `(Audio Processing Error during call: ${error.message.substring(0, 30)}...)`;
        }
    }

    async function generateTextFromImageAndText(base64ImageString, mimeType, connector, existingGeminiHistory, optionalUserText) {
        // console.log("geminiMultimodalService: generateTextFromImageAndText called.");
        if (!connector) throw new Error("Connector info missing for image chat.");
        if (!base64ImageString) throw new Error("Image data missing for image chat.");

        const userQueryText = optionalUserText || `The user sent this image. Please describe it or ask a relevant question about it in ${connector.language}.`;

        // Gemini 'contents' format
        let currentHistoryForThisCall = [...existingGeminiHistory]; // existingGeminiHistory is already in Gemini format
        const userImagePromptParts = [
            { text: userQueryText },
            { inlineData: { mimeType: mimeType, data: base64ImageString } }
        ];
        currentHistoryForThisCall.push({ role: "user", parts: userImagePromptParts });

        const payload = {
            contents: currentHistoryForThisCall,
            safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI
        };
        // console.log("geminiMultimodalService.generateTextFromImageAndText: Payload:", JSON.stringify(payload).substring(0, 300) + "...");

        try {
            const response = await callGeminiAPIInternal(payload, GEMINI_MODELS.MULTIMODAL, "generateContent");
            // console.log("geminiMultimodalService: Image processing successful. Response:", response);
            return response;
        } catch (error) {
            console.error(`geminiMultimodalService.generateTextFromImageAndText Error for ${connector.profileName}:`, error);
            return `(I had trouble with the image: ${error.message.substring(0, 30)}...)`;
        }
    }

    console.log("services/gemini_multimodal_service.js loaded (dependency check updated).");
    return {
        generateTextFromAudioForCallModal,
        generateTextFromImageAndText,
        transcribeAudioToText
    };
})();