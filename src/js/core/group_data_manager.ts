/**
 * @file src/js/core/group_data_manager.ts
 * @copyright 2022 Jeffery To
 * @license MIT
 * @description This file contains the GroupDataManager module, which is responsible for
 * managing the data related to groups, such as the group list, group members, and group chat history.
 * It also provides methods for manipulating this data.
 * @example
 * const groupDataManager = window.groupDataManager;
 * const groupList = groupDataManager.getGroupList();
 */

import type {
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ChatOrchestrator,
    Group,
    Connector,
    GroupChatHistoryItem,
    ActiveGroupListItem
} from '../types/global.d.ts'; // Path from src/js/core to src/js/types

console.log('group_data_manager.ts: Script loaded, waiting for core dependencies.');

interface GroupDataManagerModule { // Should match GroupDataManager in global.d.ts
    initialize: () => void;
    getGroupDefinitionById: (groupId: string) => Group | null | undefined;
    getAllGroupDefinitions: (languageFilter?: string | null) => Array<Group & { isJoined?: boolean }>;
    isGroupJoined: (groupId: string) => boolean;
    loadGroupChatHistory: (groupId: string) => GroupChatHistoryItem[]; // This effectively sets internal state
    getLoadedChatHistory: () => GroupChatHistoryItem[];
    addMessageToCurrentGroupHistory: (message: GroupChatHistoryItem) => void;
    saveCurrentGroupChatHistory: (triggerListUpdate?: boolean) => void;
    setCurrentGroupContext: (groupId: string | null, groupData: Group | null) => void;
    getCurrentGroupId: () => string | null | undefined;
    getCurrentGroupData: () => Group | null | undefined;
    getAllGroupDataWithLastActivity: () => ActiveGroupListItem[];
}
// Event listening logic
const dependenciesForGDM = [
    'polyglotHelpersReady',
    'chatOrchestratorReady',
    'polyglotDataReady' // for groupsData & connectors
];
const gdmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGDM.forEach(dep => gdmMetDependenciesLog[dep] = false);
let gdmDepsMet = 0;

function initializeActualGroupDataManager(): void {
    console.log('group_data_manager.ts: initializeActualGroupDataManager() called.');

    const getSafeDepsForGDM = (): {
        polyglotHelpers: PolyglotHelpers,
        chatOrchestrator: ChatOrchestrator,
        polyglotGroupsData: Group[],
        polyglotConnectors: Connector[]
    } | null => {
        const deps = {
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers | undefined,
            chatOrchestrator: window.chatOrchestrator as ChatOrchestrator | undefined,
            polyglotGroupsData: window.polyglotGroupsData as Group[] | undefined,
            polyglotConnectors: window.polyglotConnectors as Connector[] | undefined
        };
        let allPresent = true;
        console.log("GDM_DEBUG: Inside getSafeDepsForGDM. About to check individual deps.");

        for (const key in deps) {
            const depObject = (deps as any)[key];
            console.log(`GDM_DEBUG: Checking dep: ${key}, Value:`, depObject);

            if (!depObject) {
                console.error(`GroupDataManager: getSafeDeps - MISSING window.${key}.`);
                allPresent = false;
            } else if (key === 'polyglotGroupsData') {
                console.log(`GDM_DEBUG: Verifying polyglotGroupsData. IsArray: ${Array.isArray(depObject)}`);
                if (!Array.isArray(depObject)) {
                    console.error(`GroupDataManager: getSafeDeps - window.${key} is not an array.`);
                    allPresent = false;
                }
            } else if (key === 'polyglotConnectors') {
                console.log(`GDM_DEBUG: Verifying polyglotConnectors. IsArray: ${Array.isArray(depObject)}`);
                if (!Array.isArray(depObject)) {
                    console.error(`GroupDataManager: getSafeDeps - window.${key} is not an array.`);
                    allPresent = false;
                }
            } else if (key === 'polyglotHelpers' && typeof depObject.loadFromLocalStorage !== 'function') {
                console.error(`GroupDataManager: getSafeDeps - window.polyglotHelpers missing key functions.`);
                allPresent = false;
            } else if (key === 'chatOrchestrator' && typeof depObject.renderCombinedActiveChatsList !== 'function') {
                 console.error(`GroupDataManager: getSafeDeps - window.chatOrchestrator missing key functions.`);
                allPresent = false;
            }
        }
        console.log("GDM_DEBUG: getSafeDepsForGDM - allPresent after checks:", allPresent);
        return allPresent ? deps as { polyglotHelpers: PolyglotHelpers, chatOrchestrator: ChatOrchestrator, polyglotGroupsData: Group[], polyglotConnectors: Connector[] } : null;
    };

    const currentDeps = getSafeDepsForGDM();

    if (!currentDeps) {
        console.error("group_data_manager.ts: CRITICAL - Core dependencies via getSafeDepsForGDM not ready. Halting GroupDataManager setup.");
        // Assign dummy methods to window.groupDataManager
        const dummy: Partial<GroupDataManagerModule> = {};
        const methodsToDummy: (keyof GroupDataManagerModule)[] = [
            "initialize", "getGroupDefinitionById", "getAllGroupDefinitions", "isGroupJoined",
            "loadGroupChatHistory", "getLoadedChatHistory", "addMessageToCurrentGroupHistory",
            "saveCurrentGroupChatHistory", "setCurrentGroupContext", "getCurrentGroupId",
            "getCurrentGroupData", "getAllGroupDataWithLastActivity"
        ];
        methodsToDummy.forEach(methodName => {
            (dummy as any)[methodName] = () => {
                console.error(`GDM Dummy: ${methodName} called due to init failure.`);
                if (methodName === 'getAllGroupDefinitions' || methodName === 'loadGroupChatHistory' || methodName === 'getLoadedChatHistory' || methodName === 'getAllGroupDataWithLastActivity') return [];
                if (methodName === 'isGroupJoined') return false;
                return null;
            };
        });
        window.groupDataManager = dummy as GroupDataManagerModule;
        document.dispatchEvent(new CustomEvent('groupDataManagerReady'));
        console.warn('group_data_manager.ts: "groupDataManagerReady" event dispatched (initialization failed - getSafeDeps).');
        return;
    }
    console.log('group_data_manager.ts: Core dependencies (via getSafeDepsForGDM) appear ready.');

    const { polyglotHelpers, chatOrchestrator, polyglotGroupsData, polyglotConnectors } = currentDeps;

    window.groupDataManager = ((): GroupDataManagerModule => {
        'use strict';

        const GROUP_CHAT_HISTORY_STORAGE_KEY = 'polyglotGroupChatHistories';
        const MAX_MESSAGES_STORED_PER_GROUP = 50;

        // These are the IIFE's internal state variables
        let currentGroupIdInternal: string | null = null;
        let currentGroupDataInternal: Group | null = null;
        let groupChatHistoryInternal: GroupChatHistoryItem[] = []; // Stores history for the CURRENTLY active group

        function initialize(): void {
            console.log("GroupDataManager: Initializing module (already dependency-checked).");
            // Any specific initialization logic for GDM, if needed, beyond dependency checks.
            // For example, loading all histories into a cache at startup if desired,
            // but current design loads history on-demand in setCurrentGroupContext/loadGroupChatHistory.
        }

        function getGroupDefinitionById(groupId: string): Group | null | undefined {
            if (!polyglotGroupsData || !groupId) return null;
            return polyglotGroupsData.find(g => g.id === groupId);
        }

      // In group_data_manager.ts -> IIFE
function getAllGroupDefinitions(
    languageFilter: string | null = null,
    categoryFilter: string | null = null,
    nameSearch: string | null = null // <<< ADD nameSearch
): Array<Group & { isJoined?: boolean }> {
    if (!polyglotGroupsData) return [];
    let rawGroups = [...polyglotGroupsData]; // Work with a copy

    if (languageFilter && languageFilter !== 'all') {
        rawGroups = rawGroups.filter(g => g.language === languageFilter);
    }
    if (categoryFilter && categoryFilter !== 'all') {
        rawGroups = rawGroups.filter(g => g.category === categoryFilter || g.communityTags?.includes(categoryFilter));
    }
    // --- NEW: Filter by Group Name ---
    if (typeof nameSearch === 'string' && nameSearch.trim() !== "") { // <<< MODIFIED CONDITION
        const searchTermLower = nameSearch.trim().toLowerCase();
        rawGroups = rawGroups.filter(g =>
            g.name?.toLowerCase().includes(searchTermLower) ||
            g.description?.toLowerCase().includes(searchTermLower)
        );
    }
    // --- END NEW ---
    return rawGroups.map(groupDef => ({
        ...groupDef, // <<< ADD THIS SPREAD OPERATOR
        isJoined: isGroupJoined(groupDef.id)
    }));
}

        function isGroupJoined(groupId: string): boolean {
            if (!polyglotHelpers || !groupId) return false;
            const allHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) as Record<string, GroupChatHistoryItem[]> || {};
            const groupHistory = allHistories[groupId];
            // A group is considered "joined" if there's any history for it.
            return !!(groupHistory && groupHistory.length > 0);
        }

        // This function loads history for a given group ID and sets the internal `groupChatHistoryInternal`
        // It's typically called by setCurrentGroupContext or if direct load is needed.
        function loadGroupChatHistory(groupId: string): GroupChatHistoryItem[] {
            if (!polyglotHelpers || !groupId) {
                console.warn("GDM.loadGroupChatHistory: polyglotHelpers or groupId missing.");
                groupChatHistoryInternal = []; // Reset internal history if groupId is invalid
                return [];
            }
            const allHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) as Record<string, GroupChatHistoryItem[]> || {};
            groupChatHistoryInternal = allHistories[groupId] || []; // Load into the IIFE's scoped variable
            console.log(`GDM.loadGroupChatHistory: Loaded history for group '${groupId}'. Length: ${groupChatHistoryInternal.length}`);
            return [...groupChatHistoryInternal]; // Return a copy
        }

        // Returns a copy of the currently loaded group's history (for the group set by setCurrentGroupContext)
        const getLoadedChatHistory = (): GroupChatHistoryItem[] => [...groupChatHistoryInternal];

        function addMessageToCurrentGroupHistory(message: GroupChatHistoryItem): void {
            if (!currentGroupIdInternal) {
                console.warn("GDM.addMessageToCurrentGroupHistory: No current group ID set. Cannot add message.");
                return;
            }
            if (!message?.speakerId || typeof message.timestamp !== 'number') {
                console.warn("GDM.addMessageToCurrentGroupHistory: Message missing speakerId or valid timestamp.", message);
                return;
            }
            if (!message.isImageMessage && !message.text?.trim()) {
                console.warn("GDM.addMessageToCurrentGroupHistory: Text message is empty.", message);
                return;
            }
            if (message.isImageMessage && !message.imageUrl) {
                console.warn("GDM.addMessageToCurrentGroupHistory: Image message is missing imageUrl.", message);
                return;
            }
    
            groupChatHistoryInternal.push(message); // Add to the IIFE's scoped variable
            console.log(`GDM: Message added to internal history for group ${currentGroupIdInternal}. New length: ${groupChatHistoryInternal.length}`);
            
            // <<< START OF REFINEMENT 1: LIVE UPDATE >>>
            // Dispatch our unified event to tell the sidebar to refresh itself immediately.
            document.dispatchEvent(new CustomEvent('polyglot-conversation-updated', {
                detail: {
                    type: 'group',
                    id: getCurrentGroupId()
                }
            }));
            console.log(`GDM: Dispatched 'polyglot-conversation-updated' for group: ${getCurrentGroupId()}`);
            // <<< END OF REFINEMENT 1 >>>
        }

    // In group_data_manager.ts
// REPLACE THE ENTIRE saveCurrentGroupChatHistory FUNCTION
// In src/js/core/group_data_manager.ts
// REPLACE THE ENTIRE saveCurrentGroupChatHistory FUNCTION

// D:\polyglot_connect\src\js\core\group_data_manager.ts

function saveCurrentGroupChatHistory(triggerListUpdate: boolean = true): void {
    if (!polyglotHelpers || !currentGroupIdInternal || !Array.isArray(groupChatHistoryInternal)) {
        console.warn("GDM.saveCurrentGroupChatHistory: Cannot save. Missing dependencies or context.");
        return;
    }

    const allHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) as Record<string, GroupChatHistoryItem[]> || {};
    
    // --- START OF NEW, ROBUST PRUNING LOGIC ---
    const MESSAGES_TO_KEEP_MEDIA_FOR = 5; // Keep full media data URLs for only the last 5 messages
    let historyToSave = groupChatHistoryInternal.slice(-MAX_MESSAGES_STORED_PER_GROUP);

    // Create a pruned version of the history specifically for saving to LocalStorage
    const prunedHistoryForStorage = historyToSave.map((message, index) => {
        const msgCopy = { ...message };

        // Prune heavy data that is only needed for the initial AI call, not for re-rendering history.
        if (msgCopy.base64ImageDataForAI) {
            delete msgCopy.base64ImageDataForAI;
        }

        // Prune old media Data URLs to prevent LocalStorage quota errors.
       // REPLACEMENT LINE
const isOldMessage = (historyToSave.length > 20) && (index < historyToSave.length - MESSAGES_TO_KEEP_MEDIA_FOR);

        // Prune old IMAGE data URLs
        if (isOldMessage && msgCopy.isImageMessage && msgCopy.imageUrl?.startsWith('data:image')) {
            delete msgCopy.imageUrl; 
            (msgCopy as any).imagePruned = true; // Add a flag for the UI to handle
        }

        // Prune old VOICE MEMO data URLs
        if (isOldMessage && msgCopy.isVoiceMemo && msgCopy.audioBlobDataUrl?.startsWith('data:audio')) {
            delete msgCopy.audioBlobDataUrl;
            (msgCopy as any).audioPruned = true; // Add a flag for the UI to handle
        }

        return msgCopy;
    });
    // --- END OF NEW, ADAPTED PRUNING LOGIC ---

    allHistories[currentGroupIdInternal] = prunedHistoryForStorage; // Save the pruned history

    try {
        polyglotHelpers.saveToLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY, allHistories);
        console.log(`GDM.saveCurrentGroupChatHistory: Saved history for group ${currentGroupIdInternal}. Stored ${prunedHistoryForStorage.length} messages.`);
    } catch (e: any) {
        console.error(`GDM.saveCurrentGroupChatHistory: FAILED TO SAVE. LocalStorage quota likely exceeded.`, e.message);
        // This error is now expected if the history is still too large even after pruning.
    }

    // <<< START OF REFINEMENT 2: FIX THE FAULTY REFRESH >>>
    // Instead of directly calling the renderer (which caused the race condition),
    // we now dispatch our unified event. The chat orchestrator will catch this
    // and handle the refresh safely.
    if (triggerListUpdate) {
        document.dispatchEvent(new CustomEvent('polyglot-conversation-updated', {
            detail: {
                type: 'group',
                id: currentGroupIdInternal,
                source: 'saveCurrentGroupChatHistory' // Add source for easier debugging
            }
        }));
        console.log(`GDM (on save): Dispatched 'polyglot-conversation-updated' for group: ${currentGroupIdInternal}`);
    }
    // <<< END OF REFINEMENT 2 >>>
}
        function setCurrentGroupContext(groupId: string | null, groupData: Group | null): void {
            // --- GDM.DEBUG.CONTEXT.1 ---
            console.log(`GDM.setCurrentGroupContext: Trying to set currentGroupIdInternal to: '${groupId}', currentGroupDataInternal name: '${groupData?.name || 'null'}'. Previous currentGroupIdInternal: '${currentGroupIdInternal}'`);
            // --- END GDM.DEBUG.CONTEXT.1 ---
        
            currentGroupIdInternal = groupId;     // Update IIFE's scoped variable
            currentGroupDataInternal = groupData; // Update IIFE's scoped variable

            if (groupId) {
                // When context is set, load (or re-load) the history for this group into groupChatHistoryInternal
                loadGroupChatHistory(groupId);
            } else {
                // If groupId is null, we are leaving a group context
                groupChatHistoryInternal = []; // Clear the internal history
            }
            // --- GDM.DEBUG.CONTEXT.2 ---
            console.log(`GDM.setCurrentGroupContext: currentGroupIdInternal is NOW: '${currentGroupIdInternal}'`);
        }

        const getCurrentGroupId = (): string | null | undefined => {
            // --- GDM.DEBUG.CONTEXT.3 ---
            console.log(`GDM.getCurrentGroupId: Returning currentGroupIdInternal: '${currentGroupIdInternal}'`);
            // --- END GDM.DEBUG.CONTEXT.3 ---
            return currentGroupIdInternal;
        };
        const getCurrentGroupData = (): Group | null | undefined => currentGroupDataInternal;

        function getAllGroupDataWithLastActivity(): ActiveGroupListItem[] {
            if (!polyglotHelpers || !polyglotGroupsData || !polyglotConnectors) {
                console.warn("GDM.getAllGroupDataWithLastActivity: Missing core dependencies.");
                return [];
            }
            const allStoredHistories = polyglotHelpers.loadFromLocalStorage(GROUP_CHAT_HISTORY_STORAGE_KEY) as Record<string, GroupChatHistoryItem[]> || {};
            const activeGroupChatItems: ActiveGroupListItem[] = [];

            polyglotGroupsData.forEach(groupDef => {
                if (!groupDef?.id || !groupDef.name) return;

                let historyToUse: GroupChatHistoryItem[] | undefined;
                let shouldIncludeThisGroupInList = false;

                // If this group is the currently active one, use the in-memory `groupChatHistoryInternal`
                if (groupDef.id === currentGroupIdInternal) {
                    historyToUse = groupChatHistoryInternal; // Use the already loaded history
                    shouldIncludeThisGroupInList = true; // Always include the current group if it exists
                } else {
                    // Otherwise, check if there's any stored history for it
                    historyToUse = allStoredHistories[groupDef.id];
                    if (historyToUse && historyToUse.length > 0) {
                        shouldIncludeThisGroupInList = true;
                    }
                }

                if (shouldIncludeThisGroupInList) {
                    let lastMessageForPreview: GroupChatHistoryItem;
                    let lastActivityTimestamp: number;

                    if (historyToUse && historyToUse.length > 0) {
                        const lastMsgCandidate = historyToUse[historyToUse.length - 1];
                        if (lastMsgCandidate && typeof lastMsgCandidate.timestamp === 'number') {
                            lastMessageForPreview = lastMsgCandidate;
                            lastActivityTimestamp = lastMsgCandidate.timestamp;
                        } else {
                            // Fallback if last message or its timestamp is invalid
                            lastActivityTimestamp = groupDef.creationTime || (Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago or creation time
                            lastMessageForPreview = { text: "[No valid messages]", speakerId: "system", timestamp: lastActivityTimestamp, speakerName: "System" };
                        }
                    } else {
                        // No history, use creation time or now as last activity
                        lastActivityTimestamp = groupDef.creationTime || Date.now();
                        lastMessageForPreview = { text: "New group chat!", speakerId: "system", timestamp: lastActivityTimestamp, speakerName: "System" };
                    }

                    // Resolve speaker name for preview
                    let speakerNameDisplay = lastMessageForPreview.speakerName || "";
                    if (!speakerNameDisplay) { // If speakerName wasn't in the history item
                        if (lastMessageForPreview.speakerId === "user_player") {
                            speakerNameDisplay = "You";
                        } else if (lastMessageForPreview.speakerId && lastMessageForPreview.speakerId !== "system") {
                            const speakerConnector = polyglotConnectors.find(c => c.id === lastMessageForPreview.speakerId);
                            speakerNameDisplay = speakerConnector?.profileName?.split(' ')[0] || "Partner";
                        } else {
                            speakerNameDisplay = "System";
                        }
                    }
                    // Ensure the final preview message has the resolved speaker name
                    const finalPreviewMessage: GroupChatHistoryItem = { ...lastMessageForPreview, speakerName: speakerNameDisplay };

                    const listItem: ActiveGroupListItem = {
                        id: groupDef.id,
                        name: groupDef.name,
                        language: groupDef.language,
                        groupPhotoUrl: groupDef.groupPhotoUrl,
                        lastActivity: lastActivityTimestamp,
                        messages: [finalPreviewMessage], // Pass only the single last message for preview
                        isGroup: true,
                        description: groupDef.description, // Include other relevant fields from Group
                        isJoined: groupDef.id === currentGroupIdInternal || (historyToUse && historyToUse.length > 0) // More robust isJoined check
                    };
                    activeGroupChatItems.push(listItem);
                }
            });
            return activeGroupChatItems;
        }

        console.log("core/group_data_manager.ts: IIFE finished.");
        return {
            initialize, getGroupDefinitionById, getAllGroupDefinitions, isGroupJoined,
            loadGroupChatHistory, getLoadedChatHistory, addMessageToCurrentGroupHistory,
            saveCurrentGroupChatHistory, setCurrentGroupContext, getCurrentGroupId,
            getCurrentGroupData, getAllGroupDataWithLastActivity
        };
    })();

    if (window.groupDataManager && typeof window.groupDataManager.initialize === 'function') {
        console.log("group_data_manager.ts: SUCCESSFULLY assigned to window.groupDataManager.");
    } else {
        console.error("group_data_manager.ts: CRITICAL ERROR - assignment FAILED or method missing.");
    }
    
    document.dispatchEvent(new CustomEvent('groupDataManagerReady'));
    console.log('group_data_manager.ts: "groupDataManagerReady" event dispatched (after full init attempt).');
}


function checkAndInitGDM(receivedEventName?: string) {
    if (receivedEventName) {
        console.log(`GDM_EVENT: Listener for '${receivedEventName}' was triggered.`);
        if (!gdmMetDependenciesLog[receivedEventName]) {
            // Basic verification for presence. initializeActualGroupDataManager will do detailed checks.
            let verified = false;
            switch(receivedEventName) {
                case 'polyglotHelpersReady': verified = !!window.polyglotHelpers; break;
                case 'chatOrchestratorReady': verified = !!window.chatOrchestrator || !!window.chatManager; break;
                case 'polyglotDataReady': verified = !!window.polyglotGroupsData && !!window.polyglotConnectors; break;
                default: console.warn(`GDM_EVENT: Unknown event '${receivedEventName}'`); return;
            }

            if (verified) {
                gdmMetDependenciesLog[receivedEventName] = true;
                gdmDepsMet++;
                console.log(`GDM_DEPS: Event '${receivedEventName}' processed. Verified: ${verified}. Count: ${gdmDepsMet}/${dependenciesForGDM.length}`);
            } else {
                console.warn(`GDM_DEPS: Event '${receivedEventName}' received but verification FAILED.`);
            }
        }
    }

    console.log(`GDM_DEPS: Current count is ${gdmDepsMet} / ${dependenciesForGDM.length}. Met status:`, JSON.stringify(gdmMetDependenciesLog));

    if (gdmDepsMet === dependenciesForGDM.length) {
        console.log('group_data_manager.ts: All dependency events received for GroupDataManager. Queuing actual initialization.');
        requestAnimationFrame(() => {
            console.log('group_data_manager.ts: RAF triggered - Performing final checks and initializing actual GroupDataManager.');
            initializeActualGroupDataManager();
        });
    }
}

console.log('GDM_SETUP: Starting initial dependency pre-check.');
gdmDepsMet = 0; 
Object.keys(gdmMetDependenciesLog).forEach(key => gdmMetDependenciesLog[key] = false); 

let gdmAllPreloadedAndVerified = true;

dependenciesForGDM.forEach(eventName => {
    let isReadyNow = false;
    let isVerifiedNow = false; // Detailed check for pre-load

    switch (eventName) {
        case 'polyglotHelpersReady':
            isReadyNow = !!window.polyglotHelpers;
            isVerifiedNow = !!(isReadyNow && typeof window.polyglotHelpers?.loadFromLocalStorage === 'function');
            break;
        case 'chatOrchestratorReady': 
            isReadyNow = !!window.chatOrchestrator || !!window.chatManager;
            isVerifiedNow = !!(isReadyNow && typeof (window.chatOrchestrator || window.chatManager)?.renderCombinedActiveChatsList === 'function');
            break;
      case 'polyglotDataReady':
            isReadyNow = !!(window.polyglotGroupsData && window.polyglotConnectors);
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotGroupsData) && Array.isArray(window.polyglotConnectors));
            break;
        default:
            console.warn(`GDM_PRECHECK: Unknown dependency event name: ${eventName}`);
    }

    console.log(`GDM_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);

    if (isVerifiedNow) {
        console.log(`group_data_manager.ts: Pre-check: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!gdmMetDependenciesLog[eventName]) {
            gdmMetDependenciesLog[eventName] = true;
            gdmDepsMet++;
        }
    } else {
        gdmAllPreloadedAndVerified = false;
        const specificEventNameToListenFor = eventName;
        console.log(`group_data_manager.ts: Pre-check: Dependency '${specificEventNameToListenFor}' not ready or verified. Adding listener for '${specificEventNameToListenFor}'.`);
        document.addEventListener(specificEventNameToListenFor, function anEventListener() { // Removed event: Event type
            checkAndInitGDM(specificEventNameToListenFor);
        }, { once: true });
    }
});

console.log(`GDM_SETUP: Initial pre-check dep count: ${gdmDepsMet} / ${dependenciesForGDM.length}. Met:`, JSON.stringify(gdmMetDependenciesLog));

if (gdmAllPreloadedAndVerified && gdmDepsMet === dependenciesForGDM.length) {
    console.log('group_data_manager.ts: All dependencies ALREADY MET AND VERIFIED during pre-check. Initializing directly.');
    initializeActualGroupDataManager();
} else if (gdmDepsMet > 0 && gdmDepsMet < dependenciesForGDM.length && !gdmAllPreloadedAndVerified) { // Added !gdmAllPreloadedAndVerified
    console.log(`group_data_manager.ts: Some dependencies pre-verified (${gdmDepsMet}/${dependenciesForGDM.length}), waiting for remaining events.`);
} else if (gdmDepsMet === 0 && !gdmAllPreloadedAndVerified) {
    console.log(`group_data_manager.ts: No dependencies pre-verified. Waiting for all ${dependenciesForGDM.length} events.`);
} else if (gdmDepsMet === dependenciesForGDM.length && !gdmAllPreloadedAndVerified){ // All met by events during pre-check loop
    console.log('group_data_manager.ts: All dependencies met by events during pre-check iteration. Initialization should have been triggered.');
} else if (dependenciesForGDM.length === 0) {
    console.log('group_data_manager.ts: No dependencies listed. Initializing directly.');
    initializeActualGroupDataManager();
}

console.log("core/group_data_manager.ts: Script execution finished. Initialization is event-driven or direct.");