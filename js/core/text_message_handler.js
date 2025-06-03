// js/core/text_message_handler.js
// Handles the logic for sending text and image messages in 1-on-1 chats,
// interacting with UI updaters, AI services, and conversation data management.

console.log("text_message_handler.js: Script execution STARTED.");
if (window.textMessageHandler) {
    console.warn("text_message_handler.js: window.textMessageHandler ALREADY DEFINED. This is unexpected.");
}

window.textMessageHandler = (() => {
    'use strict';
    console.log("text_message_handler.js: IIFE (module definition) STARTING.");

    const getSafeDeps = (functionName = "textMessageHandler internal") => { // Added functionName for context
        console.log(`text_message_handler.js: getSafeDeps() called from ${functionName}.`);
        const deps = {
            uiUpdater: window.uiUpdater,
            aiService: window.aiService,
            conversationManager: window.conversationManager,
            domElements: window.domElements,
            polyglotHelpers: window.polyglotHelpers,
            chatOrchestrator: window.chatOrchestrator,
            aiApiConstants: window._aiApiConstants
        };
        let allPresent = true;
        // Log status of each dependency
        console.log(`text_message_handler.js: getSafeDeps (${functionName}) - uiUpdater:`, !!deps.uiUpdater);
        console.log(`text_message_handler.js: getSafeDeps (${functionName}) - aiService:`, !!deps.aiService);
        console.log(`text_message_handler.js: getSafeDeps (${functionName}) - conversationManager:`, !!deps.conversationManager);
        console.log(`text_message_handler.js: getSafeDeps (${functionName}) - domElements:`, !!deps.domElements);
        console.log(`text_message_handler.js: getSafeDeps (${functionName}) - polyglotHelpers:`, !!deps.polyglotHelpers);
        console.log(`text_message_handler.js: getSafeDeps (${functionName}) - chatOrchestrator:`, !!deps.chatOrchestrator);
        console.log(`text_message_handler.js: getSafeDeps (${functionName}) - aiApiConstants:`, !!deps.aiApiConstants);

        for (const key in deps) {
            if (!deps[key]) {
                console.error(`TextMessageHandler: getSafeDeps (from ${functionName}) - CRITICAL DEPENDENCY MISSING - window.${key}.`);
                allPresent = false;
            }
        }
        if (allPresent) {
            console.log(`text_message_handler.js: getSafeDeps (${functionName}) - All direct dependencies appear present.`);
        } else {
            console.error(`text_message_handler.js: getSafeDeps (${functionName}) - One or more direct dependencies MISSING.`);
        }
        return allPresent ? deps : null;
    };

    async function sendEmbeddedTextMessage(textFromInput, currentEmbeddedChatTargetId) {
        const functionName = "sendEmbeddedTextMessage";
        console.log(`TextMessageHandler.${functionName}: START. TargetID:`, currentEmbeddedChatTargetId, "Input:", textFromInput ? textFromInput.substring(0, 30) + "..." : "N/A");
        const deps = getSafeDeps(functionName);
        if (!deps) {
            console.error(`TextMessageHandler.${functionName}: Critical dependencies missing. Aborting.`);
            return;
        }
        const { uiUpdater, aiService, polyglotHelpers, conversationManager, chatOrchestrator, aiApiConstants } = deps;

        const text = textFromInput?.trim();

        if (!text) {
            console.warn(`TextMessageHandler.${functionName}: Attempted to send empty message.`);
            return;
        }
        if (!currentEmbeddedChatTargetId) {
            console.error(`TextMessageHandler.${functionName}: Missing currentEmbeddedChatTargetId.`);
            return;
        }

        const { conversation: convo } = conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
        if (!convo || !convo.connector) {
            console.error(`TextMessageHandler.${functionName}: Invalid conversation or connector for embedded chat. Target ID: ${currentEmbeddedChatTargetId}`);
            return;
        }
        console.log(`TextMessageHandler.${functionName}: Conversation record ensured for`, currentEmbeddedChatTargetId);

        uiUpdater.appendToEmbeddedChatLog(text, 'user', { timestamp: Date.now() });
        conversationManager.addMessageToConversation(currentEmbeddedChatTargetId, 'user', text, 'text');
        console.log(`TextMessageHandler.${functionName}: User message added to UI and conversation history.`);

        uiUpdater.clearEmbeddedChatInput();
        uiUpdater.toggleEmbeddedSendButton(false);
        
        const thinkingMsgOptions = { 
            senderName: convo.connector.profileName.split(' ')[0],
            avatarUrl: convo.connector.avatarModern,
            isThinking: true 
        };
        const thinkingMsg = uiUpdater.appendToEmbeddedChatLog("", 'connector-thinking', thinkingMsgOptions);
        console.log(`TextMessageHandler.${functionName}: AI thinking indicator shown.`);

        try {
            console.log(`TextMessageHandler.${functionName}: Calling aiService.generateTextMessage...`);
            const aiResponse = await aiService.generateTextMessage(
                text,
                convo.connector,
                convo.geminiHistory,
                aiApiConstants.PROVIDERS.GROQ // Preferred provider, aiService handles fallback
            );
            console.log(`TextMessageHandler.${functionName}: AI response received:`, typeof aiResponse === 'string' ? aiResponse.substring(0,50) + "..." : "[Non-string response]");

            if (thinkingMsg?.remove) thinkingMsg.remove();

            const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponse);
            const isBlockedResponse = typeof aiResponse === 'string' && aiResponse.startsWith("(My response was blocked:");

            if (isHumanError || isBlockedResponse) {
                console.warn(`TextMessageHandler.${functionName}: Received human-like error or blocked response from aiService: "${aiResponse}"`);
                uiUpdater.appendToEmbeddedChatLog(aiResponse, 'connector-error', { isError: true, isSystemLikeMessage: isHumanError, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
            } else {
                uiUpdater.appendToEmbeddedChatLog(aiResponse, 'connector', { avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName, timestamp: Date.now() });
                conversationManager.addModelResponseMessage(currentEmbeddedChatTargetId, aiResponse);
                console.log(`TextMessageHandler.${functionName}: AI response added to UI and conversation history.`);
            }
        } catch (e) {
            console.error(`TextMessageHandler.${functionName}: Unexpected Error during AI response:`, e);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            const displayError = polyglotHelpers?.sanitizeTextForDisplay(e.message) || "An unexpected error occurred with AI response.";
            uiUpdater.appendToEmbeddedChatLog(displayError, 'connector-error', { isError: true, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
        } finally {
            uiUpdater.toggleEmbeddedSendButton(true);
            if (chatOrchestrator?.notifyNewActivityInConversation) {
                console.log(`TextMessageHandler.${functionName}: Notifying chatOrchestrator of new activity.`);
                chatOrchestrator.notifyNewActivityInConversation(currentEmbeddedChatTargetId);
            } else {
                console.warn(`TextMessageHandler.${functionName}: chatOrchestrator.notifyNewActivityInConversation is not available.`);
            }
            console.log(`TextMessageHandler.${functionName}: FINISHED.`);
        }
    }

    async function handleEmbeddedImageUpload(event, currentEmbeddedChatTargetId) {
        const functionName = "handleEmbeddedImageUpload";
        console.log(`TextMessageHandler.${functionName}: START. TargetID:`, currentEmbeddedChatTargetId);
        const deps = getSafeDeps(functionName);
        if (!deps) {
            console.error(`TextMessageHandler.${functionName}: Critical dependencies missing. Aborting.`);
            return;
        }
        const { uiUpdater, aiService, domElements, polyglotHelpers, conversationManager, chatOrchestrator, aiApiConstants } = deps;
        
        const file = event.target.files[0];
        console.log(`TextMessageHandler.${functionName}: File selected:`, file ? file.name : "No file");

        if (!file) {
            console.warn(`TextMessageHandler.${functionName}: No file selected.`);
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }
        if (!currentEmbeddedChatTargetId) {
            console.error(`TextMessageHandler.${functionName}: Missing currentEmbeddedChatTargetId.`);
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        const { conversation: convo } = conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
        if (!convo || !convo.connector) {
            console.error(`TextMessageHandler.${functionName}: Invalid conversation or connector. Target ID: ${currentEmbeddedChatTargetId}`);
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }
        console.log(`TextMessageHandler.${functionName}: Conversation record ensured.`);

        if (file.size > 4 * 1024 * 1024) { // 4MB limit
            alert("Image is too large (max 4MB). Please choose a smaller file.");
            console.warn(`TextMessageHandler.${functionName}: Image too large:`, file.size);
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            console.log(`TextMessageHandler.${functionName}: FileReader onloadend.`);
            const base64DataForApi = reader.result.split(',')[1];
            const dataUrlForDisplay = reader.result;

            uiUpdater.appendToEmbeddedChatLog("", 'user', { imageUrl: dataUrlForDisplay, timestamp: Date.now() });
            const imageMessagePlaceholderText = "[User sent an image]";
            conversationManager.addMessageToConversation(
                currentEmbeddedChatTargetId, 'user', imageMessagePlaceholderText, 'image', Date.now(),
                { 
                    content_url: dataUrlForDisplay,
                    imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }]
                }
            );
            console.log(`TextMessageHandler.${functionName}: User image message added to UI and history.`);

            uiUpdater.toggleEmbeddedSendButton(false);
            const thinkingMsgOptions = { 
                senderName: convo.connector.profileName.split(' ')[0],
                avatarUrl: convo.connector.avatarModern,
                isThinking: true 
            };
            const thinkingMsg = uiUpdater.appendToEmbeddedChatLog(`${thinkingMsgOptions.senderName} is looking at the image...`, 'connector-thinking', thinkingMsgOptions);
            console.log(`TextMessageHandler.${functionName}: AI thinking (image) indicator shown.`);

            try {
                const promptForImageInteraction = `The user has sent this image. Please comment on it or ask a relevant question about it in ${convo.connector.language}.`;
                console.log(`TextMessageHandler.${functionName}: Calling aiService.generateTextFromImageAndText with preferredProvider TOGETHER...`);
                const aiResponseText = await aiService.generateTextFromImageAndText(
                    base64DataForApi,
                    file.type,
                    convo.connector,
                    convo.geminiHistory, // Pass Gemini-formatted history
                    promptForImageInteraction,
                    aiApiConstants.PROVIDERS.TOGETHER // Preferred provider for vision
                );
                console.log(`TextMessageHandler.${functionName}: AI response to image received:`, typeof aiResponseText === 'string' ? aiResponseText.substring(0,50) + "..." : "[Non-string response]");

                if (thinkingMsg?.remove) thinkingMsg.remove();
                
                const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseText);
                 if (isHumanError) {
                    console.warn(`TextMessageHandler.${functionName}: Received human-like error from aiService: "${aiResponseText}"`);
                    uiUpdater.appendToEmbeddedChatLog(aiResponseText, 'connector-error', { isError: true, isSystemLikeMessage: true, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
                } else {
                    uiUpdater.appendToEmbeddedChatLog(aiResponseText, 'connector', { avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName, timestamp: Date.now() });
                    conversationManager.addModelResponseMessage(currentEmbeddedChatTargetId, aiResponseText);
                     console.log(`TextMessageHandler.${functionName}: AI response to image added to UI and history.`);
                }

            } catch (e) {
                console.error(`TextMessageHandler.${functionName}: Error getting AI response to image:`, e);
                if (thinkingMsg?.remove) thinkingMsg.remove();
                const displayError = polyglotHelpers?.sanitizeTextForDisplay(e.message) || "An error occurred processing the image with AI.";
                uiUpdater.appendToEmbeddedChatLog(`Sorry, I had trouble with that image. ${displayError}`, 'connector-error', { isError: true, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
            } finally {
                uiUpdater.toggleEmbeddedSendButton(true);
                if (chatOrchestrator?.notifyNewActivityInConversation) {
                    console.log(`TextMessageHandler.${functionName}: Notifying chatOrchestrator of new activity.`);
                    chatOrchestrator.notifyNewActivityInConversation(currentEmbeddedChatTargetId);
                } else {
                     console.warn(`TextMessageHandler.${functionName}: chatOrchestrator.notifyNewActivityInConversation not available.`);
                }
                if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
                console.log(`TextMessageHandler.${functionName}: FileReader onloadend FINISHED.`);
            }
        };
        reader.onerror = (error) => {
            console.error(`TextMessageHandler.${functionName}: FileReader error (embedded image):`, error);
            alert("Error reading image file. Please try again.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
        };
        reader.readAsDataURL(file);
        console.log(`TextMessageHandler.${functionName}: FINISHED (initiated FileReader).`);
    }

    async function sendModalTextMessage(textFromInput, currentModalMessageTargetConnector) {
        const functionName = "sendModalTextMessage";
        console.log(`TextMessageHandler.${functionName}: START. TargetConnectorID:`, currentModalMessageTargetConnector?.id, "Input:", textFromInput ? textFromInput.substring(0, 30) + "..." : "N/A");
        const deps = getSafeDeps(functionName);
        if (!deps) {
            console.error(`TextMessageHandler.${functionName}: Critical dependencies missing. Aborting.`);
            return;
        }
        const { uiUpdater, aiService, polyglotHelpers, domElements, conversationManager, chatOrchestrator, aiApiConstants } = deps;
        
        const text = textFromInput?.trim();

        if (!text) {
            console.warn(`TextMessageHandler.${functionName}: Attempted to send empty message.`);
            return;
        }
        if (!currentModalMessageTargetConnector || !currentModalMessageTargetConnector.id) {
            console.error(`TextMessageHandler.${functionName}: Missing or invalid currentModalMessageTargetConnector.`);
            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
            return;
        }
        const targetId = currentModalMessageTargetConnector.id;
        const { conversation: convo } = conversationManager.ensureConversationRecord(targetId, currentModalMessageTargetConnector);

        if (!convo || !convo.connector) {
            console.error(`TextMessageHandler.${functionName}: Invalid conversation or connector for modal chat. Target ID: ${targetId}`);
            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
            return;
        }
        console.log(`TextMessageHandler.${functionName}: Conversation record ensured for modal chat with`, targetId);

        uiUpdater.appendToMessageLogModal(text, 'user', { timestamp: Date.now() });
        conversationManager.addMessageToConversation(targetId, 'user', text, 'text');
        console.log(`TextMessageHandler.${functionName}: User message added to modal UI and history.`);

        if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = true;
        uiUpdater.resetMessageModalInput();

        const thinkingMsgOptions = { 
            senderName: convo.connector.profileName.split(' ')[0],
            avatarUrl: convo.connector.avatarModern,
            isThinking: true 
        };
        const thinkingMsg = uiUpdater.appendToMessageLogModal("", 'connector-thinking', thinkingMsgOptions);
        console.log(`TextMessageHandler.${functionName}: AI thinking indicator shown in modal.`);

        try {
            console.log(`TextMessageHandler.${functionName}: Calling aiService.generateTextMessage for modal...`);
            const aiResponse = await aiService.generateTextMessage(
                text,
                convo.connector,
                convo.geminiHistory,
                aiApiConstants.PROVIDERS.GROQ
            );
            console.log(`TextMessageHandler.${functionName}: AI response received for modal:`, typeof aiResponse === 'string' ? aiResponse.substring(0,50) + "..." : "[Non-string response]");

            if (thinkingMsg?.remove) thinkingMsg.remove();

            const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponse);
            const isBlockedResponse = typeof aiResponse === 'string' && aiResponse.startsWith("(My response was blocked:");

            if (isHumanError || isBlockedResponse) {
                 console.warn(`TextMessageHandler.${functionName}: Received human-like error or blocked response from aiService: "${aiResponse}"`);
                uiUpdater.appendToMessageLogModal(aiResponse, 'connector-error', { isError: true, isSystemLikeMessage: isHumanError, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
            } else {
                uiUpdater.appendToMessageLogModal(aiResponse, 'connector', { avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName, timestamp: Date.now() });
                conversationManager.addModelResponseMessage(targetId, aiResponse);
                console.log(`TextMessageHandler.${functionName}: AI response added to modal UI and history.`);
            }
        } catch (e) {
            console.error(`TextMessageHandler.${functionName}: Unexpected Error during AI response:`, e);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            const displayError = polyglotHelpers?.sanitizeTextForDisplay(e.message) || "An unexpected error occurred with AI response.";
            uiUpdater.appendToMessageLogModal(displayError, 'connector-error', { isError: true, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
        } finally {
            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
            if (chatOrchestrator?.notifyNewActivityInConversation) {
                console.log(`TextMessageHandler.${functionName}: Notifying chatOrchestrator of new activity.`);
                chatOrchestrator.notifyNewActivityInConversation(targetId);
            } else {
                 console.warn(`TextMessageHandler.${functionName}: chatOrchestrator.notifyNewActivityInConversation is not available.`);
            }
            console.log(`TextMessageHandler.${functionName}: FINISHED.`);
        }
    }

    async function handleModalImageUpload(event, currentModalMessageTargetConnector) {
        const functionName = "handleModalImageUpload";
        console.log(`TextMessageHandler.${functionName}: START. TargetConnectorID:`, currentModalMessageTargetConnector?.id);
        const deps = getSafeDeps(functionName);
        if (!deps) {
            console.error(`TextMessageHandler.${functionName}: Critical dependencies missing. Aborting.`);
            return;
        }
        const { uiUpdater, aiService, domElements, polyglotHelpers, conversationManager, chatOrchestrator, aiApiConstants } = deps;

        const file = event.target.files[0];
        console.log(`TextMessageHandler.${functionName}: File selected:`, file ? file.name : "No file");
        const targetId = currentModalMessageTargetConnector?.id;

        if (!file) {
            console.warn(`TextMessageHandler.${functionName}: No file selected.`);
            if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
            return;
        }
        if (!targetId) {
            console.error(`TextMessageHandler.${functionName}: Missing targetId from currentModalMessageTargetConnector.`);
            if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
            return;
        }

        const { conversation: convo } = conversationManager.ensureConversationRecord(targetId, currentModalMessageTargetConnector);
        if (!convo || !convo.connector) {
            console.error(`TextMessageHandler.${functionName}: Invalid conversation or connector. Target ID: ${targetId}`);
            if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
            return;
        }
        console.log(`TextMessageHandler.${functionName}: Conversation record ensured.`);

        if (file.size > 4 * 1024 * 1024) {
            alert("Image is too large (max 4MB).");
            console.warn(`TextMessageHandler.${functionName}: Image too large:`, file.size);
            if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            console.log(`TextMessageHandler.${functionName}: FileReader onloadend.`);
            const base64DataForApi = reader.result.split(',')[1];
            const dataUrlForDisplay = reader.result;

            uiUpdater.appendToMessageLogModal("", 'user', { imageUrl: dataUrlForDisplay, timestamp: Date.now() });
            const imageMessagePlaceholderText = "[User sent an image]";
            conversationManager.addMessageToConversation(
                targetId, 'user', imageMessagePlaceholderText, 'image', Date.now(),
                { 
                    content_url: dataUrlForDisplay,
                    imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }]
                }
            );
            console.log(`TextMessageHandler.${functionName}: User image message added to modal UI and history.`);

            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = true;
            const thinkingMsgOptions = { 
                senderName: convo.connector.profileName.split(' ')[0],
                avatarUrl: convo.connector.avatarModern,
                isThinking: true 
            };
            const thinkingMsg = uiUpdater.appendToMessageLogModal(`${thinkingMsgOptions.senderName} is looking at the image...`, 'connector-thinking', thinkingMsgOptions);
            console.log(`TextMessageHandler.${functionName}: AI thinking (image) indicator shown in modal.`);

            try {
                const promptForImageInteraction = `The user has sent this image in our chat. Please comment on it or ask a relevant question in ${convo.connector.language}.`;
                console.log(`TextMessageHandler.${functionName}: Calling aiService.generateTextFromImageAndText for modal with preferredProvider TOGETHER...`);
                const aiResponseText = await aiService.generateTextFromImageAndText(
                    base64DataForApi,
                    file.type,
                    convo.connector,
                    convo.geminiHistory, // Pass Gemini history
                    promptForImageInteraction,
                    aiApiConstants.PROVIDERS.TOGETHER // Prefer TogetherAI for vision
                );
                console.log(`TextMessageHandler.${functionName}: AI response to image received for modal:`, typeof aiResponseText === 'string' ? aiResponseText.substring(0,50) + "..." : "[Non-string response]");

                if (thinkingMsg?.remove) thinkingMsg.remove();

                const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseText);
                if (isHumanError) {
                    console.warn(`TextMessageHandler.${functionName}: Received human-like error from aiService: "${aiResponseText}"`);
                    uiUpdater.appendToMessageLogModal(aiResponseText, 'connector-error', { isError: true, isSystemLikeMessage: true, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
                } else {
                    uiUpdater.appendToMessageLogModal(aiResponseText, 'connector', { avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName, timestamp: Date.now() });
                    conversationManager.addModelResponseMessage(targetId, aiResponseText);
                    console.log(`TextMessageHandler.${functionName}: AI response to image added to modal UI and history.`);
                }
            } catch (e) {
                console.error(`TextMessageHandler.${functionName}: Error getting AI response to image:`, e);
                if (thinkingMsg?.remove) thinkingMsg.remove();
                 const displayError = polyglotHelpers?.sanitizeTextForDisplay(e.message) || "An error occurred processing the image with AI.";
                uiUpdater.appendToMessageLogModal(`Sorry, I had trouble with that image. ${displayError}`, 'connector-error', { isError: true, avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName });
            } finally {
                if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
                if (chatOrchestrator?.notifyNewActivityInConversation) {
                    console.log(`TextMessageHandler.${functionName}: Notifying chatOrchestrator of new activity.`);
                    chatOrchestrator.notifyNewActivityInConversation(targetId);
                } else {
                     console.warn(`TextMessageHandler.${functionName}: chatOrchestrator.notifyNewActivityInConversation not available.`);
                }
                if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
                console.log(`TextMessageHandler.${functionName}: FileReader onloadend FINISHED.`);
            }
        };
        reader.onerror = (error) => {
            console.error(`TextMessageHandler.${functionName}: FileReader error (modal image):`, error);
            alert("Error reading image file. Please try again.");
            if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
        };
        reader.readAsDataURL(file);
        console.log(`TextMessageHandler.${functionName}: FINISHED (initiated FileReader).`);
    }

    console.log("text_message_handler.js: About to perform initial getSafeDeps() for load message (IIFE internal).");
    const initialDepsCheckResult = getSafeDeps("IIFE initial check");
    if (initialDepsCheckResult) {
        console.log("text_message_handler.js: Loaded successfully and initial dependency check passed. chatOrchestrator availability at load:", !!initialDepsCheckResult.chatOrchestrator);
    } else {
        console.error("text_message_handler.js: Loaded, but CRITICAL DEPENDENCIES were missing during its own initial IIFE check. This is expected if chatOrchestrator loads after this script.");
    }

    console.log("text_message_handler.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        sendEmbeddedTextMessage,
        handleEmbeddedImageUpload,
        sendModalTextMessage,
        handleModalImageUpload
    };
})();

if (window.textMessageHandler && typeof window.textMessageHandler.sendEmbeddedTextMessage === 'function') {
    console.log("text_message_handler.js: SUCCESSFULLY assigned to window.textMessageHandler and core methods are present.");
} else {
    console.error("text_message_handler.js: CRITICAL ERROR - window.textMessageHandler IS UNDEFINED or core methods missing after IIFE execution.");
}
console.log("text_message_handler.js: Script execution FINISHED.");