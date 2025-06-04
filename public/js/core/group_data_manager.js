// js/core/group_data_manager.js
// Manages group data: definitions, history storage/retrieval, joining status.

window.groupDataManager = (() => {
    'use strict';

    const getDeps = () => ({
        polyglotHelpers: window.polyglotHelpers,
        chatOrchestrator: window.chatOrchestrator // For triggering list updates when history saves
    });

    const GROUP_CHAT_HISTORY_STORAGE_KEY = 'polyglotGroupChatHistories';
    const MAX_MESSAGES_STORED_PER_GROUP = 50;

    let currentGroupIdInternal = null;    // ID of the currently active group in the main view
    let currentGroupDataInternal = null;  // Full groupDef object of the active group
    let groupChatHistoryInternal = [];    // In-memory message array for the active group

    function initialize() {
        console.log("GroupDataManager: Initializing module.");
    }

    function getGroupDefinitionById(groupId) {
        if (!window.polyglotGroupsData || !groupId) {
            // console.warn("GroupDataManager: getGroupDefinitionById - Group definitions or groupId missing.");
            return null;
        }
        return window.polyglotGroupsData.find(g => g.id === groupId) || null;
    }

    function getAllGroupDefinitions(languageFilter = null) {
        if (!window.polyglotGroupsData) {
            console.warn("GroupDataManager: getAllGroupDefinitions - Group definitions (window.polyglotGroupsData) missing.");
            return [];
        }
        let rawGroups = window.polyglotGroupsData;
        if (languageFilter && languageFilter !== 'all') {
            rawGroups = rawGroups.filter(g => g.language === languageFilter);
        }
        // console.log("GroupDataManager: getAllGroupDefinitions - Mapping isGroupJoined status.");
        return rawGroups.map(groupDef => {
            const joined = isGroupJoined(groupDef.id); // isGroupJoined checks for persisted history > 0
            // console.log(`GroupDataManager: getAllGroupDefinitions - Group: ${groupDef.name}, isJoined (has history > 0): ${joined}`);
            return { ...groupDef, isJoined: joined };
        });
    }

    function isGroupJoined(groupId) {
        const { polyglotHelpers } = getDeps();
        if (!polyglotHelpers || !groupId) return false;
        const allHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) || {};
        const groupHistory = allHistories[groupId];
        const joined = !!(groupHistory && groupHistory.length > 0);
        // console.log(`GroupDataManager: isGroupJoined check for ${groupId}? History in storage: ${!!groupHistory}, Length > 0: ${groupHistory ? groupHistory.length > 0 : 'N/A'}. Result: ${joined}`);
        return joined;
    }

    function loadGroupChatHistory(groupId) {
        const { polyglotHelpers } = getDeps();
        if (!polyglotHelpers || !groupId) {
            console.error("GroupDataManager: loadGroupChatHistory - Cannot load history, missing polyglotHelpers or groupId.");
            groupChatHistoryInternal = [];
            return [];
        }
        const allHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) || {};
        groupChatHistoryInternal = allHistories[groupId] || [];
        console.log(`GroupDataManager: loadGroupChatHistory - History loaded into memory for group ${groupId}. Count: ${groupChatHistoryInternal.length}.`);
        return [...groupChatHistoryInternal];
    }

    function getLoadedChatHistory() {
        return [...groupChatHistoryInternal];
    }

    function addMessageToCurrentGroupHistory(message) {
        if (!currentGroupIdInternal) {
            console.warn("GroupDataManager: addMessageToCurrentGroupHistory - Cannot add message, currentGroupIdInternal is null.");
            return;
        }
        if (!message || typeof message.text !== 'string' || !message.speakerId || typeof message.timestamp !== 'number') {
            console.warn("GroupDataManager: addMessageToCurrentGroupHistory - Attempted to add invalid message to history (missing text, speakerId, or timestamp):", message);
            return;
        }
        groupChatHistoryInternal.push(message);
        // console.log(`GroupDataManager: Message from ${message.speakerId} added to IN-MEMORY history for ${currentGroupIdInternal}. New length: ${groupChatHistoryInternal.length}`);
    }

    function saveCurrentGroupChatHistory(triggerListUpdate = true) {
        const { polyglotHelpers, chatOrchestrator } = getDeps();
        if (!polyglotHelpers || !currentGroupIdInternal) {
            console.warn("GroupDataManager: saveCurrentGroupChatHistory - Cannot save, missing helpers or currentGroupIdInternal is null.");
            return;
        }
        if (!Array.isArray(groupChatHistoryInternal)) {
            console.error("GroupDataManager: saveCurrentGroupChatHistory - groupChatHistoryInternal is not an array. Cannot save.");
            return;
        }

        const allHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) || {};
        const historyToSave = groupChatHistoryInternal.slice(-MAX_MESSAGES_STORED_PER_GROUP);
        allHistories[currentGroupIdInternal] = historyToSave;
        polyglotHelpers.saveToLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY, allHistories);

        const lastMsgTs = historyToSave.length > 0 ? historyToSave[historyToSave.length - 1].timestamp : 'N/A';
        console.log(`GroupDataManager: SAVED history to localStorage for group ${currentGroupIdInternal}. Count: ${historyToSave.length} (of ${groupChatHistoryInternal.length} in memory). Last msg ts: ${lastMsgTs}. Trigger update: ${triggerListUpdate}`);

        if (triggerListUpdate && chatOrchestrator?.renderCombinedActiveChatsList) {
            console.log("GroupDataManager: Triggering renderCombinedActiveChatsList from saveCurrentGroupChatHistory.");
            chatOrchestrator.renderCombinedActiveChatsList();
        }
    }

    function setCurrentGroupContext(groupId, groupData) {
        console.log(`GroupDataManager: setCurrentGroupContext - Old internal ID: ${currentGroupIdInternal}, New ID: ${groupId}`);
        currentGroupIdInternal = groupId;
        currentGroupDataInternal = groupData;
        if (groupId) {
            loadGroupChatHistory(groupId); // Loads from storage into groupChatHistoryInternal
        } else {
            groupChatHistoryInternal = [];
            console.log("GroupDataManager: Current group context cleared (ID set to null, in-memory history cleared).");
        }
    }

    function getCurrentGroupId() {
        return currentGroupIdInternal;
    }

    function getCurrentGroupData() {
        return currentGroupDataInternal;
    }

   function getAllGroupDataWithLastActivity() {
        const { polyglotHelpers } = getDeps(); // Ensure polyglotHelpers is available if used in logging
        const functionName = "getAllGroupDataWithLastActivity"; // For clearer logs
        // console.log(`GDM (${functionName}): START. Current Active Group ID (internal): ${currentGroupIdInternal}`);

        if (!polyglotHelpers || !window.polyglotGroupsData) {
            console.warn(`GDM (${functionName}): polyglotHelpers or window.polyglotGroupsData missing.`);
            return [];
        }

        const allStoredHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) || {};
        const activeGroupChats = [];

        window.polyglotGroupsData.forEach(groupDef => {
            if (!groupDef || !groupDef.id) { // Skip invalid group definitions
                console.warn(`GDM (${functionName}): Skipping invalid groupDef:`, groupDef);
                return;
            }

            let historyToUseForListItem;
            let lastActivityForListItem;
            let lastMessageForListItem;
            let shouldIncludeThisGroup = false;
            // let sourceForLog = ""; // Optional for debugging

            if (groupDef.id === currentGroupIdInternal) {
                historyToUseForListItem = groupChatHistoryInternal; // Use live in-memory history
                shouldIncludeThisGroup = true;
                // sourceForLog = "LIVE/IN-MEMORY";
            } else {
                historyToUseForListItem = allStoredHistories[groupDef.id];
                if (historyToUseForListItem && historyToUseForListItem.length > 0) {
                    shouldIncludeThisGroup = true;
                }
                // sourceForLog = "STORED/LOCALSTORAGE";
            }

            // console.log(`GDM (${functionName}): Processing group ${groupDef.id} ('${groupDef.name}'). Source: ${sourceForLog}. History length: ${historyToUseForListItem?.length || 0}. ShouldInclude: ${shouldIncludeThisGroup}`);

            if (shouldIncludeThisGroup) {
                if (historyToUseForListItem && historyToUseForListItem.length > 0) {
                    lastMessageForListItem = historyToUseForListItem[historyToUseForListItem.length - 1];
                    if (!lastMessageForListItem || typeof lastMessageForListItem.timestamp !== 'number') {
                        lastActivityForListItem = groupDef.creationTime || (Date.now() - 7 * 24 * 60 * 60 * 1000); // Fallback
                        lastMessageForListItem = { text: "[Error in last message data]", speakerId: "system", speakerName: "", timestamp: lastActivityForListItem };
                    } else {
                        lastActivityForListItem = lastMessageForListItem.timestamp;
                    }
                } else {
                    // Active group but no messages yet (e.g., just joined)
                    lastActivityForListItem = Date.now();
                    lastMessageForListItem = { text: "Just joined!", speakerId: "system", speakerName: "", timestamp: lastActivityForListItem };
                }

                let speakerNamePreview = "";
                if (lastMessageForListItem.speakerId === "user_player") {
                    speakerNamePreview = "You";
                } else if (lastMessageForListItem.speakerId && lastMessageForListItem.speakerId !== "system") {
                    const speakerConnector = window.polyglotConnectors?.find(c => c.id === lastMessageForListItem.speakerId);
                    speakerNamePreview = speakerConnector?.profileName?.split(' ')[0] || lastMessageForListItem.speakerName?.split(' ')[0] || "Partner";
                }

                const groupItemForSidebar = {
                    id: groupDef.id,
                    name: groupDef.name,
                    language: groupDef.language,         // Already included
                    groupPhotoUrl: groupDef.groupPhotoUrl, // <<< --- ADD THIS LINE ---
                    description: groupDef.description,   // Keep for potential future use
                    // You might not need full members or isJoined for the active chat list item,
                    // but include them if your listRenderer or click handlers expect them.
                    // members: groupDef.members,
                    // isJoined: isGroupJoined(groupDef.id), // isGroupJoined might be re-calculated if needed
                    lastActivity: lastActivityForListItem,
                    messages: [{ // Simplified message for preview
                        text: lastMessageForListItem.text || "",
                        speakerId: lastMessageForListItem.speakerId || "system",
                        speakerName: speakerNamePreview, // Use the determined preview name
                        timestamp: lastMessageForListItem.timestamp || lastActivityForListItem
                    }],
                    isGroup: true
                };
                activeGroupChats.push(groupItemForSidebar);
            }
        });
        // console.log(`GDM (${functionName}): END. Returning ${activeGroupChats.length} groups for sidebar.`);
        return activeGroupChats;
    }

    console.log("core/group_data_manager.js loaded, with more specific sidebar inclusion logic.");
    return {
        initialize,
        getGroupDefinitionById,
        getAllGroupDefinitions,
        isGroupJoined,
        loadGroupChatHistory,
        getLoadedChatHistory,
        addMessageToCurrentGroupHistory,
        saveCurrentGroupChatHistory,
        setCurrentGroupContext,
        getCurrentGroupId,
        getCurrentGroupData,
        getAllGroupDataWithLastActivity
    };
})();