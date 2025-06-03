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
        const { polyglotHelpers } = getDeps();
        console.log(`GDM_getAllActivity: START. Current Active Group ID (internal): ${currentGroupIdInternal}`);

        if (!polyglotHelpers || !window.polyglotGroupsData) {
            console.warn("GDM_getAllActivity: polyglotHelpers or window.polyglotGroupsData missing.");
            return [];
        }

        const allStoredHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) || {};
        const activeGroupChats = [];

        window.polyglotGroupsData.forEach(groupDef => {
            let historyToUseForListItem;
            let lastActivityForListItem;
            let lastMessageForListItem;
            let shouldIncludeThisGroup = false;
            let sourceForLog = "";

            if (groupDef.id === currentGroupIdInternal) {
                historyToUseForListItem = groupChatHistoryInternal;
                shouldIncludeThisGroup = true; // Always include the currently active group in the sidebar
                sourceForLog = "LIVE/IN-MEMORY";
            } else {
                historyToUseForListItem = allStoredHistories[groupDef.id];
                if (historyToUseForListItem && historyToUseForListItem.length > 0) {
                    shouldIncludeThisGroup = true; // Include inactive groups only if they have persisted messages
                }
                sourceForLog = "STORED/LOCALSTORAGE";
            }

            console.log(`GDM_getAllActivity: Processing group ${groupDef.id} ('${groupDef.name}'). Source: ${sourceForLog}. History candidate length: ${historyToUseForListItem?.length || 0}. ShouldInclude: ${shouldIncludeThisGroup}`);

            if (shouldIncludeThisGroup) {
                if (historyToUseForListItem && historyToUseForListItem.length > 0) {
                    lastMessageForListItem = historyToUseForListItem[historyToUseForListItem.length - 1];
                    if (!lastMessageForListItem || typeof lastMessageForListItem.timestamp !== 'number') {
                        console.warn(`GDM_getAllActivity: Group ${groupDef.id} - Last message invalid or no timestamp. Using fallback. Message:`, lastMessageForListItem);
                        lastActivityForListItem = groupDef.creationTime || (Date.now() - 604800000); // 1 week ago as fallback
                        lastMessageForListItem = { text: "[Error in last message]", speakerId: "system", speakerName: "", timestamp: lastActivityForListItem };
                    } else {
                        lastActivityForListItem = lastMessageForListItem.timestamp;
                    }
                } else {
                    // This case handles the currently active group (currentGroupIdInternal === groupDef.id)
                    // when its in-memory history (groupChatHistoryInternal) is empty (e.g., just joined).
                    console.log(`GDM_getAllActivity: Group ${groupDef.id} is active (or just joined) but its current history is empty. Using placeholder.`);
                    lastActivityForListItem = Date.now(); // Show as "just now"
                    lastMessageForListItem = { text: "Joining group...", speakerId: "system", speakerName: "", timestamp: lastActivityForListItem };
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
                    language: groupDef.language,
                    description: groupDef.description,
                    lastActivity: lastActivityForListItem,
                    messages: [{
                        text: lastMessageForListItem.text || "",
                        speakerId: lastMessageForListItem.speakerId || "system",
                        speakerName: speakerNamePreview,
                        timestamp: lastMessageForListItem.timestamp || lastActivityForListItem
                    }],
                    isGroup: true
                };

                // Detailed validation logging
                console.log(`GDM_getAllActivity: PRE-PUSH for Group ${groupDef.name}:`, {
                    id: groupItemForSidebar.id,
                    name: groupItemForSidebar.name,
                    lastActivity: {
                        raw: groupItemForSidebar.lastActivity,
                        formatted: new Date(groupItemForSidebar.lastActivity).toISOString(),
                        relative: polyglotHelpers.formatRelativeTimestamp(groupItemForSidebar.lastActivity)
                    },
                    message: {
                        text: groupItemForSidebar.messages[0].text,
                        speakerId: groupItemForSidebar.messages[0].speakerId,
                        speakerName: groupItemForSidebar.messages[0].speakerName,
                        timestamp: new Date(groupItemForSidebar.messages[0].timestamp).toISOString()
                    }
                });

                activeGroupChats.push(groupItemForSidebar);
            }
        });
        console.log("GDM_getAllActivity: END. Returning groups for sidebar:", activeGroupChats.map(g=> ({name: g.name, lastActivityRel: polyglotHelpers ? polyglotHelpers.formatRelativeTimestamp(g.lastActivity) : g.lastActivity })));
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