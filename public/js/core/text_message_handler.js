// js/core/text_message_handler.js
// Handles sending text and image messages in 1-on-1 chats.

window.textMessageHandler = (() => {
    'use strict';

    const getDeps = () => ({
        uiUpdater: window.uiUpdater,
        aiService: window.aiService, // Changed from geminiService
        conversationManager: window.conversationManager,
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        chatOrchestrator: window.chatOrchestrator,
        aiApiConstants: window._aiApiConstants // Added for PROVIDERS constants
    });

    async function sendEmbeddedTextMessage(textFromInput, currentEmbeddedChatTargetId) {
        const { uiUpdater, aiService, polyglotHelpers, conversationManager, chatOrchestrator, aiApiConstants } = getDeps();
        const text = textFromInput?.trim();

        if (!text || !currentEmbeddedChatTargetId) {
            console.error("TextMessageHandler:sendEmbeddedTextMessage - Missing text or targetId.");
            return;
        }

        const { conversation: convo } = conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
        if (!convo || !convo.connector) {
            console.error("TextMessageHandler: Invalid conversation for embedded chat. Target ID:", currentEmbeddedChatTargetId);
            return;
        }

        uiUpdater.appendToEmbeddedChatLog(text, 'user');
        conversationManager.addMessageToConversation(currentEmbeddedChatTargetId, 'user', text, 'text');

        uiUpdater.clearEmbeddedChatInput();
        uiUpdater.toggleEmbeddedSendButton(false);
        const thinkingMsg = uiUpdater.appendToEmbeddedChatLog(
            `${polyglotHelpers.sanitizeTextForDisplay(convo.connector.profileName.split(' ')[0])} is typing...`,
            'connector-thinking'
        );

        try {
            const aiResponse = await aiService.generateTextMessage(
                text,
                convo.connector,
                convo.geminiHistory,
                aiApiConstants.PROVIDERS.GROQ // Specify Groq as provider
            );
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToEmbeddedChatLog(aiResponse, 'connector');
            conversationManager.addModelResponseMessage(currentEmbeddedChatTargetId, aiResponse, convo.geminiHistory);
        } catch (e) {
            console.error("TextMessageHandler:sendEmbeddedTextMessage Error:", e);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToEmbeddedChatLog(`Error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true });
        } finally {
            uiUpdater.toggleEmbeddedSendButton(true);
            if (chatOrchestrator) chatOrchestrator.notifyNewActivityInConversation(currentEmbeddedChatTargetId);
        }
    }

    async function handleEmbeddedImageUpload(event, currentEmbeddedChatTargetId) {
        const { uiUpdater, aiService, domElements, polyglotHelpers, conversationManager, chatOrchestrator, aiApiConstants } = getDeps();
        const file = event.target.files[0];

        if (!file || !currentEmbeddedChatTargetId) {
            console.warn("TextMessageHandler:handleEmbeddedImageUpload - No file or targetId.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        const { conversation: convo } = conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
        if (!convo || !convo.connector) {
            console.error("TextMessageHandler:handleEmbeddedImageUpload - Invalid conversation for target ID:", currentEmbeddedChatTargetId);
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            alert("Image too large (max 4MB).");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64DataForApi = reader.result.split(',')[1];
            const dataUrlForDisplay = reader.result;

            uiUpdater.appendToEmbeddedChatLog("", 'user', { imageUrl: dataUrlForDisplay });
            const imageMessageText = "[User sent an image]";
            conversationManager.addMessageToConversation(
                currentEmbeddedChatTargetId, 'user', imageMessageText, 'image', Date.now(),
                { content_url: dataUrlForDisplay, imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }] }
            );

            uiUpdater.toggleEmbeddedSendButton(false);
            const thinkingMsg = uiUpdater.appendToEmbeddedChatLog(`${polyglotHelpers.sanitizeTextForDisplay(convo.connector.profileName.split(' ')[0])} is looking...`, 'connector-thinking');

            try {
                const promptForImageDesc = `The user has sent this image. Please comment on it or ask a relevant question in ${convo.connector.language}.`;
                const aiResponseText = await aiService.generateTextFromImageAndText(
                    base64DataForApi,
                    file.type,
                    convo.connector,
                    convo.geminiHistory,
                    promptForImageDesc,
                    aiApiConstants.PROVIDERS.TOGETHER // Use Together AI for vision
                );

                if (thinkingMsg?.remove) thinkingMsg.remove();
                uiUpdater.appendToEmbeddedChatLog(aiResponseText, 'connector');
                conversationManager.addModelResponseMessage(currentEmbeddedChatTargetId, aiResponseText, convo.geminiHistory);
            } catch (e) {
                console.error("TextMessageHandler:handleEmbeddedImageUpload - Error getting AI response:", e);
                if (thinkingMsg?.remove) thinkingMsg.remove();
                uiUpdater.appendToEmbeddedChatLog(`Image processing error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true });
            } finally {
                uiUpdater.toggleEmbeddedSendButton(true);
                if (chatOrchestrator) chatOrchestrator.notifyNewActivityInConversation(currentEmbeddedChatTargetId);
                if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            }
        };
        reader.onerror = (error) => {
            console.error("textMessageHandler: FileReader error (embedded):", error);
            alert("Error reading image file.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
        };
        reader.readAsDataURL(file);
    }

    async function handleModalImageUpload(event, currentModalMessageTarget) {
        const { uiUpdater, aiService, domElements, polyglotHelpers, conversationManager, chatOrchestrator, aiApiConstants } = getDeps();
        const file = event.target.files[0];
        const targetId = currentModalMessageTarget?.id;

        if (!file || !targetId) { /* ... */ return; }
        const { conversation: convo } = conversationManager.ensureConversationRecord(targetId, currentModalMessageTarget);
        if (!convo || !convo.connector) { /* ... */ return; }
        if (file.size > 4 * 1024 * 1024) { /* ... */ return; }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64DataForApi = reader.result.split(',')[1];
            const dataUrlForDisplay = reader.result;
            uiUpdater.appendToMessageLogModal("", 'user', { imageUrl: dataUrlForDisplay });
            const imageMessageText = "[User sent an image]";
            conversationManager.addMessageToConversation(
                targetId, 'user', imageMessageText, 'image', Date.now(),
                { content_url: dataUrlForDisplay, imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }] }
            );

            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = true;
            const thinkingMsg = uiUpdater.appendToMessageLogModal(`${polyglotHelpers.sanitizeTextForDisplay(convo.connector.profileName.split(' ')[0])} is looking...`, 'connector-thinking');

            try {
                const promptForImageDesc = `The user has sent this image. Please comment on it or ask a relevant question in ${convo.connector.language}.`;
                const aiResponseText = await aiService.generateTextFromImageAndText(
                    base64DataForApi,
                    file.type,
                    convo.connector,
                    convo.geminiHistory,
                    promptForImageDesc,
                    aiApiConstants.PROVIDERS.TOGETHER // Use Together AI for vision
                );
                if (thinkingMsg?.remove) thinkingMsg.remove();
                uiUpdater.appendToMessageLogModal(aiResponseText, 'connector');
                conversationManager.addModelResponseMessage(targetId, aiResponseText, convo.geminiHistory);
            } catch (e) {
                console.error("TextMessageHandler:handleModalImageUpload - Error getting AI response:", e);
                if (thinkingMsg?.remove) thinkingMsg.remove();
                uiUpdater.appendToMessageLogModal(`Image processing error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true });
            } finally {
                if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
                if (chatOrchestrator) chatOrchestrator.notifyNewActivityInConversation(targetId);
                if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
            }
        };
        reader.onerror = (error) => { /* ... */ };
        reader.readAsDataURL(file);
    }

    async function sendModalTextMessage(textFromInput, currentModalMessageTarget) {
        const { uiUpdater, aiService, polyglotHelpers, domElements, conversationManager, chatOrchestrator, aiApiConstants } = getDeps();
        const text = textFromInput?.trim();

        if (!text || !currentModalMessageTarget?.id) {
            console.error("TextMessageHandler:sendModalTextMessage - Missing text or valid currentModalMessageTarget.");
            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
            return;
        }

        const { conversation: convo } = conversationManager.ensureConversationRecord(currentModalMessageTarget.id, currentModalMessageTarget);
        if (!convo || !convo.connector) {
            console.error("TextMessageHandler:sendModalTextMessage - Invalid conversation for target ID:", currentModalMessageTarget.id);
            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
            return;
        }

        uiUpdater.appendToMessageLogModal(text, 'user');
        conversationManager.addMessageToConversation(currentModalMessageTarget.id, 'user', text, 'text');

        if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = true;
        uiUpdater.resetMessageModalInput();

        const thinkingMsg = uiUpdater.appendToMessageLogModal(
            `${polyglotHelpers.sanitizeTextForDisplay(convo.connector.profileName.split(' ')[0])} is typing...`,
            'connector-thinking'
        );

        try {
            const aiResponse = await aiService.generateTextMessage(
                text,
                convo.connector,
                convo.geminiHistory,
                aiApiConstants.PROVIDERS.GROQ // Specify Groq as provider
            );
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToMessageLogModal(aiResponse, 'connector');
            conversationManager.addModelResponseMessage(currentModalMessageTarget.id, aiResponse, convo.geminiHistory);
        } catch (e) {
            console.error("TextMessageHandler:sendModalTextMessage Error:", e);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToMessageLogModal(`Error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true });
        } finally {
            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
            if (chatOrchestrator) chatOrchestrator.notifyNewActivityInConversation(currentModalMessageTarget.id);
        }
    }

    console.log("js/core/text_message_handler.js updated to use aiService for text messages.");
    return {
        sendEmbeddedTextMessage,
        handleEmbeddedImageUpload,
        sendModalTextMessage,
        handleModalImageUpload
    };
})();