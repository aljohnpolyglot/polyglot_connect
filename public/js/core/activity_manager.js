// js/core/activity_manager.js
// Manages persona active status based on their schedules and simulated typing indicators.

window.activityManager = (() => {
    'use strict';

    // Early check for critical window objects this module immediately references
    // We can't do much if these are missing at load time, but we can prevent errors.
    if (!window.polyglotHelpers || !window.uiUpdater) {
        console.error("ActivityManager: CRITICAL - polyglotHelpers or uiUpdater not found at load time. ActivityManager will be non-functional.");
        // Return a dummy object with no-op functions
        const noOp = () => {};
        const noOpTrue = () => true; // For isConnectorActive, default to active
        return {
            isConnectorActive: noOpTrue,
            simulateAiTyping: noOp,
            clearAiTypingIndicator: noOp,
            getAiReplyDelay: () => 1500 // Default delay
        };
    }

    const { polyglotHelpers, uiUpdater } = window; // Safe to destructure now
    const TYPING_INDICATOR_BASE_TIMEOUT = 2000; // Max duration for a "is typing" if not cleared by new message
    let personaTypingTimeouts = {}; // Stores timeout IDs: { "connectorId_chatType": timeoutId }

    /**
     * Checks if a connector is currently active based on their defined sleep schedule.
     * Relies on polyglotHelpers.isConnectorCurrentlyActive.
     * @param {object} connector - The connector object.
     * @returns {boolean} True if active or if schedule/helper is missing, false otherwise.
     */
    function isConnectorActive(connector) {
        if (!polyglotHelpers.isConnectorCurrentlyActive) {
            console.warn("ActivityManager: polyglotHelpers.isConnectorCurrentlyActive function is missing. Defaulting to connector being active.");
            return true; // Default to active if the helper function isn't available
        }
        if (!connector) {
            // console.warn("ActivityManager.isConnectorActive: Connector object is null/undefined. Defaulting to active.");
            return true; // Default to active if connector object itself is problematic
        }
        return polyglotHelpers.isConnectorCurrentlyActive(connector);
    }

    /**
     * Simulates an AI typing indicator for a given connector and chat type.
     * @param {string} connectorId - The ID of the connector.
     * @param {string} chatType - 'embedded', 'modal_message', 'group', or 'voiceChat_modal'.
     * @param {string} [aiMessageText=""] - The anticipated AI message text (for delay calculation).
     */
    function simulateAiTyping(connectorId, chatType = 'embedded', aiMessageText = "") {
        const timeoutKey = `${connectorId}_${chatType}`;
        // Clear any existing typing indicator timeout for this specific context
        if (personaTypingTimeouts[timeoutKey]) {
            clearTimeout(personaTypingTimeouts[timeoutKey]);
            // console.debug(`ActivityManager: Cleared previous typing timeout for ${timeoutKey}`);
        }

        // Ensure dependencies are still valid (though checked at init, good for robustness)
        if (!uiUpdater || !polyglotHelpers) {
            console.warn(`ActivityManager.simulateAiTyping: Missing uiUpdater or polyglotHelpers for ${timeoutKey}.`);
            return;
        }
        
        const connectors = window.polyglotConnectors || [];
        const connector = connectors.find(c => c.id === connectorId);

        if (!connector) {
            console.warn(`ActivityManager.simulateAiTyping: Connector with ID '${connectorId}' not found. Cannot simulate typing.`);
            return;
        }

        const displayName = connector.profileName?.split(' ')[0] || connector.name || "Partner";
        const typingText = `${polyglotHelpers.sanitizeTextForDisplay(displayName)} is typing...`;
        let thinkingMsgElement = null; // To store the DOM element if one is created

        // console.debug(`ActivityManager: Simulating typing for ${displayName} in ${chatType}.`);

        // Update UI based on chat type
        if (chatType === 'embedded' && uiUpdater.appendToEmbeddedChatLog) {
            thinkingMsgElement = uiUpdater.appendToEmbeddedChatLog(typingText, 'connector-thinking');
        } else if (chatType === 'modal_message' && uiUpdater.appendToMessageLogModal) {
            thinkingMsgElement = uiUpdater.appendToMessageLogModal(typingText, 'connector-thinking');
        } else if (chatType === 'group' && uiUpdater.setGroupTypingIndicatorText) {
            // For groups, we might use a dedicated indicator bar rather than appending a message
            uiUpdater.setGroupTypingIndicatorText(typingText);
        } else if (chatType === 'voiceChat_modal' && uiUpdater.appendToVoiceChatLog) {
            thinkingMsgElement = uiUpdater.appendToVoiceChatLog(typingText, 'connector-thinking');
        } else {
            console.warn(`ActivityManager.simulateAiTyping: Unknown chatType '${chatType}' or missing UI update function for ${connectorId}.`);
            return; // No UI to update
        }

        // Calculate how long the "is typing" should display.
        // It's based on the AI's typical reply delay, but capped to avoid excessively long indicators.
        const baseDisplayDuration = getAiReplyDelay(connector, aiMessageText.length);
        // We want the typing indicator to show for a portion of this, then disappear *before* the actual message arrives.
        // Or, if it's a long thinking process, cap the indicator's visibility.
        const displayDuration = Math.min(baseDisplayDuration * 0.8, TYPING_INDICATOR_BASE_TIMEOUT + (connector.chatPersonality?.typingDelayMs || 1500) * 0.5);
        
        personaTypingTimeouts[timeoutKey] = setTimeout(() => {
            // console.debug(`ActivityManager: Typing timeout reached for ${timeoutKey}. Clearing indicator.`);
            clearAiTypingIndicator(connectorId, chatType, thinkingMsgElement);
        }, Math.max(500, displayDuration)); // Ensure it displays for at least a short period, and use calculated duration
    }

    /**
     * Clears an AI typing indicator for a given connector and chat type.
     * @param {string} connectorId - The ID of the connector.
     * @param {string} chatType - 'embedded', 'modal_message', 'group', or 'voiceChat_modal'.
     * @param {HTMLElement|null} [thinkingMsgElement=null] - The DOM element of the thinking message, if applicable.
     */
    function clearAiTypingIndicator(connectorId, chatType = 'embedded', thinkingMsgElement = null) {
        const timeoutKey = `${connectorId}_${chatType}`;
        if (personaTypingTimeouts[timeoutKey]) {
            clearTimeout(personaTypingTimeouts[timeoutKey]);
            delete personaTypingTimeouts[timeoutKey];
            // console.debug(`ActivityManager: Cleared and deleted timeout for ${timeoutKey}.`);
        }

        if (thinkingMsgElement && typeof thinkingMsgElement.remove === 'function') {
            // Check if element is still in the DOM before trying to remove, to avoid errors if already removed
            if (thinkingMsgElement.parentNode) {
                thinkingMsgElement.remove();
                // console.debug(`ActivityManager: Removed thinkingMsgElement for ${timeoutKey}.`);
            }
        } else if (chatType === 'group' && window.uiUpdater?.setGroupTypingIndicatorText) {
            // If it's a group chat, clear the dedicated typing indicator text
            window.uiUpdater.setGroupTypingIndicatorText('');
            // console.debug(`ActivityManager: Cleared group typing indicator text for ${timeoutKey}.`);
        } else if (thinkingMsgElement && !thinkingMsgElement.remove) {
            console.warn(`ActivityManager.clearAiTypingIndicator: thinkingMsgElement for ${timeoutKey} is not a removable DOM element.`);
        }
        // No specific clear needed for direct call status bar as it's usually overwritten by new status.
    }

    /**
     * Calculates a simulated AI reply delay based on persona settings and message length.
     * @param {object} connector - The connector object, expected to have `chatPersonality.typingDelayMs`.
     * @param {number} [messageLength=0] - The length of the message the AI is "responding" to.
     * @returns {number} The calculated delay in milliseconds.
     */
    function getAiReplyDelay(connector, messageLength = 0) {
        // Ensure dependencies are available
        if (!connector?.chatPersonality || !window.polyglotHelpers?.simulateTypingDelay) {
            // console.warn("ActivityManager.getAiReplyDelay: Missing connector.chatPersonality or polyglotHelpers.simulateTypingDelay. Returning default delay.");
            return 1500; // Default delay
        }
        return window.polyglotHelpers.simulateTypingDelay(
            connector.chatPersonality.typingDelayMs || 1500, // Use defined delay or default
            messageLength
        );
    }

    // Initial log to confirm loading
    if (window.polyglotHelpers && window.uiUpdater) {
        console.log("core/activity_manager.js loaded successfully with dependencies.");
    } else {
        // This case should have been caught by the top-level check, but as a fallback.
        console.error("core/activity_manager.js loaded, but essential dependencies (polyglotHelpers or uiUpdater) were STILL MISSING post-IIFE. This is a critical issue.");
    }

    return {
        isConnectorActive,
        simulateAiTyping,
        clearAiTypingIndicator,
        getAiReplyDelay
    };
})();