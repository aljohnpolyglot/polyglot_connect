// js/core/group_ui_handler.js
// Handles UI interactions and updates for group chat.

window.groupUiHandler = (() => {
    'use strict';

    const getDeps = () => ({
        domElements: window.domElements,
        uiUpdater: window.uiUpdater,
        chatUiManager: window.chatUiManager,
        listRenderer: window.listRenderer,
        viewManager: window.viewManager,
        groupDataManager: window.groupDataManager
    });

    function initialize() {
        console.log("GroupUiHandler: Initializing...");
    }

    function displayAvailableGroups(languageFilter = null, joinGroupCallback) {
        const { listRenderer, viewManager, groupDataManager } = getDeps();
        console.log(`GroupUiHandler: displayAvailableGroups - Filter: ${languageFilter}`);

        if (!groupDataManager) {
            console.error("GroupUiHandler: groupDataManager is missing!");
            return;
        }
        const augmentedGroups = groupDataManager.getAllGroupDefinitions(languageFilter);
        console.log(`GroupUiHandler: displayAvailableGroups - Augmented groups count: ${augmentedGroups.length}`);

        if (!listRenderer) {
            console.warn("GroupUiHandler: listRenderer missing for displayAvailableGroups.");
            return;
        }
        listRenderer.renderAvailableGroupsList(augmentedGroups, joinGroupCallback);
        viewManager?.updateEmptyListMessages();
    }

    function showGroupChatView(groupData, groupMembers, groupHistory) {
        const { chatUiManager, uiUpdater, domElements } = getDeps();
        if (!chatUiManager || !uiUpdater || !domElements || !groupData || !groupMembers) {
            console.error("GroupUiHandler: Missing dependencies for showGroupChatView.", { chatUiManager, uiUpdater, domElements, groupData, groupMembers });
            return;
        }
        console.log(`GroupUiHandler: showGroupChatView - Showing for group: "${groupData.name}". Members: ${groupMembers.length}`);
        
        // chatUiManager handles hiding group list and showing group chat container
        chatUiManager.showGroupChatView(groupData.name, groupMembers); // This also calls uiUpdater.updateGroupChatHeader

        if (domElements.groupChatLogDiv) {
            console.log("GroupUiHandler: Clearing groupChatLogDiv.");
            domElements.groupChatLogDiv.innerHTML = ''; // Clear existing messages
        } else {
            console.warn("GroupUiHandler: domElements.groupChatLogDiv not found for clearing.");
        }

        if (groupHistory && groupHistory.length > 0) {
            console.log(`GroupUiHandler: Repopulating ${groupHistory.length} messages from history.`);
            groupHistory.forEach((msg, index) => {
                const speaker = groupMembers.find(m => m.id === msg.speakerId) ||
                               (msg.speakerId === "user_player" ? { profileName: "You" } : { profileName: msg.speakerName || "Bot" });
                // console.log(`GroupUiHandler: Appending history message ${index + 1}: "${msg.text.substring(0,20)}..." by ${speaker.profileName}`);
                uiUpdater.appendToGroupChatLog(msg.text, speaker.profileName, msg.speakerId === "user_player", msg.speakerId);
            });
        } else {
            console.log("GroupUiHandler: No group history to populate.");
        }
         if (domElements.groupChatInput) domElements.groupChatInput.focus();
    }

    function hideGroupChatViewAndShowList() {
        const { chatUiManager } = getDeps();
        console.log("GroupUiHandler: hideGroupChatViewAndShowList - Hiding group chat, showing list.");
        chatUiManager?.hideGroupChatView();
    }

    function updateGroupTypingIndicator(text) {
        const { domElements } = getDeps();
        const indicatorElement = domElements?.groupTypingIndicator;
        const chatLogElement = domElements?.groupChatLog;

        if (!indicatorElement) {
            console.warn("GroupUiHandler: updateGroupTypingIndicator - #group-typing-indicator element NOT FOUND.");
            return;
        }
        if (!chatLogElement) {
            console.warn("GroupUiHandler: updateGroupTypingIndicator - #group-chat-log element NOT FOUND (for class toggle).");
            // Can still update indicator text if chatLogElement is missing, but scroll-padding won't work.
        }

        const trimmedText = text ? String(text).trim() : ""; // Ensure text is a string and trim

        console.log(`GroupUiHandler: updateGroupTypingIndicator - Received text: "${text}", Trimmed: "${trimmedText}"`);

        if (trimmedText !== "") {
            indicatorElement.textContent = trimmedText;
            indicatorElement.classList.add('active');
            if (chatLogElement) chatLogElement.classList.add('typing-indicator-active');
            console.log(`GroupUiHandler: Typing indicator SET to: "${trimmedText}". Indicator class: ${indicatorElement.className}. Log class: ${chatLogElement?.className}`);
        } else {
            indicatorElement.textContent = '';
            indicatorElement.classList.remove('active');
            if (chatLogElement) chatLogElement.classList.remove('typing-indicator-active');
            console.log(`GroupUiHandler: Typing indicator CLEARED. Indicator class: ${indicatorElement.className}. Log class: ${chatLogElement?.className}`);
        }
    }

    function clearGroupInput() {
        const { domElements } = getDeps();
        if (domElements?.groupChatInput) {
            domElements.groupChatInput.value = '';
            console.log("GroupUiHandler: Cleared group chat input.");
        } else {
            console.warn("GroupUiHandler: groupChatInput element not found for clearing.");
        }
    }

    function appendMessageToGroupLog(text, senderName, isUser, speakerId) {
        const { uiUpdater } = getDeps();
        if (uiUpdater?.appendToGroupChatLog) {
            // console.log(`GroupUiHandler: appendMessageToGroupLog - Text: "${text.substring(0,20)}...", Sender: ${senderName}, isUser: ${isUser}, SpeakerID: ${speakerId}`);
            uiUpdater.appendToGroupChatLog(text, senderName, isUser, speakerId);
        } else {
            console.error("GroupUiHandler: uiUpdater.appendToGroupChatLog is not available!");
        }
    }

    function clearGroupChatLog() {
        const { domElements } = getDeps();
        if (domElements?.groupChatLogDiv) {
            domElements.groupChatLogDiv.innerHTML = '';
            console.log("GroupUiHandler: Cleared group chat log (groupChatLogDiv).");
        } else {
            console.warn("GroupUiHandler: groupChatLogDiv not found for clearing.");
        }
    }

    console.log("core/group_ui_handler.js loaded with debugging console logs.");
    return {
        initialize,
        displayAvailableGroups,
        showGroupChatView,
        hideGroupChatViewAndShowList,
        updateGroupTypingIndicator,
        clearGroupInput,
        appendMessageToGroupLog,
        clearGroupChatLog
    };
})();