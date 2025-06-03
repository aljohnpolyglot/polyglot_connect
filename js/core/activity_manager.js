// js/core/activity_manager.js
// Manages persona active status based on their schedules and simulated typing.

window.activityManager = (() => {
    const { polyglotHelpers, uiUpdater } = window; // Direct reference, assume loaded
    const TYPING_INDICATOR_BASE_TIMEOUT = 2000;
    let personaTypingTimeouts = {};

    function isConnectorActive(connector) {
        if (!polyglotHelpers?.isConnectorCurrentlyActive) return true;
        return polyglotHelpers.isConnectorCurrentlyActive(connector);
    }

    function simulateAiTyping(connectorId, chatType = 'embedded', aiMessageText = "") {
        const timeoutKey = `${connectorId}_${chatType}`;
        if (personaTypingTimeouts[timeoutKey]) clearTimeout(personaTypingTimeouts[timeoutKey]);

        const connector = (window.polyglotConnectors || []).find(c => c.id === connectorId);
        if (!connector || !uiUpdater || !polyglotHelpers) return;

        const typingText = `${polyglotHelpers.sanitizeTextForDisplay(connector.profileName?.split(' ')[0] || connector.name)} is typing...`;
        let thinkingMsgElement = null;

        if (chatType === 'embedded' && uiUpdater.appendToEmbeddedChatLog) {
            thinkingMsgElement = uiUpdater.appendToEmbeddedChatLog(typingText, 'connector-thinking');
        } else if (chatType === 'modal_message' && uiUpdater.appendToMessageLogModal) {
            thinkingMsgElement = uiUpdater.appendToMessageLogModal(typingText, 'connector-thinking');
        } else if (chatType === 'group' && uiUpdater.setGroupTypingIndicatorText) {
            uiUpdater.setGroupTypingIndicatorText(typingText);
        } else if (chatType === 'voiceChat_modal' && uiUpdater.appendToVoiceChatLog) { // Added for voice chat modal
            thinkingMsgElement = uiUpdater.appendToVoiceChatLog(typingText, 'connector-thinking');
        }


        const displayDuration = getAiReplyDelay(connector, aiMessageText.length) * 0.8;
        personaTypingTimeouts[timeoutKey] = setTimeout(() => {
            clearAiTypingIndicator(connectorId, chatType, thinkingMsgElement);
        }, Math.min(displayDuration, TYPING_INDICATOR_BASE_TIMEOUT + 1500)); // Cap display time
    }

    function clearAiTypingIndicator(connectorId, chatType = 'embedded', thinkingMsgElement = null) {
        const timeoutKey = `${connectorId}_${chatType}`;
        if (personaTypingTimeouts[timeoutKey]) {
            clearTimeout(personaTypingTimeouts[timeoutKey]);
            delete personaTypingTimeouts[timeoutKey];
        }

        if (thinkingMsgElement && thinkingMsgElement.parentNode) {
            thinkingMsgElement.remove();
        } else if (chatType === 'group' && uiUpdater?.setGroupTypingIndicatorText) {
            uiUpdater.setGroupTypingIndicatorText('');
        }
        // No specific clear needed for direct call status bar as it's overwritten
    }

    function getAiReplyDelay(connector, messageLength = 0) {
        if (!connector?.chatPersonality || !polyglotHelpers) return 1500;
        return polyglotHelpers.simulateTypingDelay(
            connector.chatPersonality.typingDelayMs || 1500,
            messageLength
        );
    }
    console.log("core/activity_manager.js loaded.");
    return {
        isConnectorActive,
        simulateAiTyping,
        clearAiTypingIndicator,
        getAiReplyDelay
    };
})();