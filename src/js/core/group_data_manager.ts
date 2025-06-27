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
    ActiveGroupListItem,
    MessageDocument // <<< ADD THIS IMPORT
} from '../types/global.d.ts'; // Path from src/js/core to src/js/types
import {
    collection, doc, serverTimestamp, addDoc, updateDoc, Timestamp, getDoc // Added updateDoc
} from "firebase/firestore";
import { auth, db } from '../firebase-config'; // Assuming this path is 
import { onAuthStateChanged } from "firebase/auth"; // <<< ADD THIS IMPORT FOR AUTH

console.log('group_data_manager.ts: Script loaded, waiting for core dependencies.');
// D:\polyglot_connect\src\js\core\group_data_manager.ts (top of file)
interface GroupDataManagerModule {
    
    
    initialize: () => Promise<void>; // <<< MUST return Promise<void>
    getGroupDefinitionById: (groupId: string) => Group | null | undefined;
    getAllGroupDefinitions: (languageFilter?: string | null, categoryFilter?: string | null, nameSearch?: string | null) => Array<Group & { isJoined?: boolean }>;
    isGroupJoined: (groupId: string) => boolean; // Remains localStorage-based as per your code
    
    // Firestore method for adding messages
    addMessageToFirestoreGroupChat: (
        groupId: string,
        messageData: { 
            appMessageId: string; 
            senderId: string;     
            senderName: string;   
            text: string | null;
            imageUrl?: string; // For visual images
            content_url?: string; // <<< ADD THIS
            type: 'text' | 'image' | 'voice_memo' | 'system_event';
            reactions?: { [key: string]: string[] }; // Ensure this is here if used
        }
    ) => Promise<string | null>;

    addMessageToGroup: (
        groupId: string,
        senderId: string,
        text: string | null,
        type: GroupChatHistoryItem['type'],
        options: {
            appMessageId: string;
            timestamp: Date;
            senderName: string;
            imageUrl?: string | null;
            content_url?: string | null; // <<< ENSURE THIS IS PRESENT
            imageSemanticDescription?: string | null;
        }
    ) => Promise<string | null>;

    // LocalStorage-based methods (for local cache or simple history)
    loadGroupChatHistory: (groupId: string) => GroupChatHistoryItem[]; 
    getLoadedChatHistory: () => GroupChatHistoryItem[];
    // REMOVE: addMessageToCurrentGroupHistory: (message: GroupChatHistoryItem, options?: { triggerListUpdate?: boolean }) => void;
    saveCurrentGroupChatHistory: (triggerListUpdate?: boolean) => void; // <<< ENSURE THIS IS HERE

    setCurrentGroupContext: (groupId: string | null, groupData: Group | null) => void;
    getCurrentGroupId: () => string | null | undefined;
    getCurrentGroupData: () => Group | null | undefined;
    getAllGroupDataWithLastActivity: () => ActiveGroupListItem[];
    _updateUserJoinedGroupState?: (groupId: string, isJoining: boolean) => void; // <<< ENSURE THIS IS HERE
    addMessageToInternalCacheOnly: (message: GroupChatHistoryItem) => void;
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
            "loadGroupChatHistory", "getLoadedChatHistory", "addMessageToFirestoreGroupChat",
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

        // === DEFINE ALL IIFE-SCOPED STATE VARIABLES HERE, AT THE TOP ===
        const GROUP_CHAT_HISTORY_STORAGE_KEY = 'polyglotGroupChatHistories';
        const MAX_MESSAGES_STORED_PER_GROUP = 50;

        let currentGroupIdInternal: string | null = null;
        let currentGroupDataInternal: Group | null = null;
        let groupChatHistoryInternal: GroupChatHistoryItem[] = [];

        // These were missing from the top of your IIFE in the file you sent:
        let allPublicGroupsCache: { [groupId: string]: Group } = {}; // For /groups collection if you were using Firestore for defs
        let userJoinedGroupIdsSet: Set<string> = new Set(); // <<< CORRECTLY RENAMED HERE
        let isFullyInitializedPromise: Promise<void> | null = null;
        let authStateUnsubscribe: (() => void) | null = null; // To manage the specific listener for initialization
        // === END STATE VARIABLE DEFINITIONS ===

        // Now define _updateUserJoinedGroupState, it can see the variables above
        const _updateUserJoinedGroupState = (groupId: string, isJoining: boolean): void => {
            if (isJoining) {
                userJoinedGroupIdsSet.add(groupId); // Use the new Set variable
            } else {
                userJoinedGroupIdsSet.delete(groupId); // Use the new Set variable
            }
            // Optional: Update allPublicGroupsCache if you're using it
            // if (allPublicGroupsCache && allPublicGroupsCache[groupId]) {
            //     allPublicGroupsCache[groupId].isJoined = isJoining;
            // }
            console.log(`GDM: User's joined state for group ${groupId} updated in memory to: ${isJoining}. Current joined IDs:`, Array.from(userJoinedGroupIdsSet));
    
            document.dispatchEvent(new CustomEvent('polyglot-joined-groups-updated'));
            document.dispatchEvent(new CustomEvent('polyglot-groups-list-updated'));
        };
        
        async function initializeJoinedGroupsCache(currentUser: import("firebase/auth").User | null): Promise<void> {
            // This function's internal logic from your provided code is largely okay,
            // as it uses the `currentUser` parameter.
            // Ensure it correctly clears or populates `userJoinedGroupIdsSet`.
            if (!currentUser || !window.polyglotGroupsData) {
                console.log("GDM.initializeJoinedGroupsCache: No current user or no global group definitions. Clearing local joined cache.");
                userJoinedGroupIdsSet.clear();
                // No dispatch here, let initialize handle it after awaiting this
                return;
            }
        
            console.log(`GDM.initializeJoinedGroupsCache: Fetching user's (${currentUser.uid}) group memberships from Firestore...`);
            const newJoinedIds = new Set<string>();
            const groupDefs = window.polyglotGroupsData;
        
            // Create a promise for each group membership check
            const membershipCheckPromises = groupDefs.map(groupDef => {
                const memberRef = doc(db, "groups", groupDef.id, "members", currentUser.uid);
                return getDoc(memberRef).then((docSnap) => {
                    if (docSnap.exists()) {
                        newJoinedIds.add(groupDef.id);
                    }
                }).catch((err: any) => {
                    // Log warning but don't let one failed check stop all others
                    console.warn(`GDM.initializeJoinedGroupsCache: Error checking membership for group ${groupDef.id}:`, err.message);
                });
            });
        
            try {
                await Promise.all(membershipCheckPromises);
                userJoinedGroupIdsSet = newJoinedIds; // Atomically update the set
                console.log("GDM.initializeJoinedGroupsCache: Successfully populated joined groups from Firestore. Count:", userJoinedGroupIdsSet.size, "IDs:", Array.from(userJoinedGroupIdsSet));
            } catch (error: any) {
                // This catch might be less likely if individual checks handle their errors,
                // but good for overall safety.
                console.error("GDM.initializeJoinedGroupsCache: Error during Promise.all for group memberships:", error);
                userJoinedGroupIdsSet.clear(); // Clear if the process failed significantly
            }
            // No dispatch here either
        }
        async function initialize(): Promise<void> {
            if (isFullyInitializedPromise) {
                // console.log("GDM: Initialization promise already exists. Returning it."); // Less verbose
                return isFullyInitializedPromise;
            }
        
            console.log("GDM: Initializing module (async)... Creating new initialization promise.");
            isFullyInitializedPromise = new Promise<void>((resolve, reject) => {
                // Ensure auth is available
                if (!auth) {
                    console.error("GDM.initialize: Firebase auth is not available at the time of GDM initialization call.");
                    return reject(new Error("GDM: Firebase auth not available."));
                }
        
                // Detach any previous listener that might have been set up by a faulty previous init
                if (authStateUnsubscribe) {
                    authStateUnsubscribe();
                    authStateUnsubscribe = null;
                }
                
                authStateUnsubscribe = onAuthStateChanged(auth, async (user) => {
                    // This specific onAuthStateChanged listener is only for the *initial*
                    // GDM setup. It should unsubscribe itself after it has determined
                    // the initial user state and populated the cache.
                    if (authStateUnsubscribe) {
                        authStateUnsubscribe(); // Unsubscribe after the first call
                        authStateUnsubscribe = null;
                    }
        
                    console.log(`GDM.initialize (onAuthStateChanged callback): Auth state determined. User: ${user ? user.uid : 'null'}`);
                    try {
                        await initializeJoinedGroupsCache(user); // Pass the definitive user
                        console.log("GDM.initialize: Joined groups cache populated based on initial auth state.");
                        
                        // Dispatch events AFTER the cache is populated
                        document.dispatchEvent(new CustomEvent('polyglot-joined-groups-updated'));
                        document.dispatchEvent(new CustomEvent('polyglot-groups-list-updated'));
                        
                        resolve(); // Resolve the main GDM initialization promise
                    } catch (cacheError) {
                        console.error("GDM.initialize: Error populating cache after auth state determined:", cacheError);
                        // Still dispatch events so UI can react to potentially empty/error state
                        document.dispatchEvent(new CustomEvent('polyglot-joined-groups-updated'));
                        document.dispatchEvent(new CustomEvent('polyglot-groups-list-updated'));
                        reject(cacheError); // Reject the main GDM promise
                    }
                }, (authError) => {
                    console.error("GDM.initialize: Critical error in onAuthStateChanged listener:", authError);
                    if (authStateUnsubscribe) {
                        authStateUnsubscribe(); // Clean up listener on error too
                        authStateUnsubscribe = null;
                    }
                    reject(authError); // Reject the main GDM promise
                });
            });
        
            return isFullyInitializedPromise;
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
    if (!groupId) return false;
    return userJoinedGroupIdsSet.has(groupId); // Check the in-memory set
}

        // This function loads history for a given group ID and sets the internal `groupChatHistoryInternal`
        // It's typically called by setCurrentGroupContext or if direct load is needed.
        function loadGroupChatHistory(groupId: string): GroupChatHistoryItem[] {
            const user = auth.currentUser;
            if (!polyglotHelpers || !groupId || !user) {
                console.warn(`GDM.loadGroupChatHistory: Cannot load history. Helpers, groupId, or user missing. User: ${!!user}`);
                groupChatHistoryInternal = [];
                return [];
            }
            
            // <<< THE FIX: Use a user-specific key >>>
            const userSpecificStorageKey = `${GROUP_CHAT_HISTORY_STORAGE_KEY}_${user.uid}`;
            
            const allUserHistories = polyglotHelpers.loadFromLocalStorage(userSpecificStorageKey) as Record<string, GroupChatHistoryItem[]> || {};
            groupChatHistoryInternal = allUserHistories[groupId] || [];
            
            console.log(`GDM.loadGroupChatHistory: Loaded history for group '${groupId}' for user '${user.uid}'. Length: ${groupChatHistoryInternal.length}`);
            return [...groupChatHistoryInternal];
        }

        // Returns a copy of the currently loaded group's history (for the group set by setCurrentGroupContext)
        const getLoadedChatHistory = (): GroupChatHistoryItem[] => [...groupChatHistoryInternal];

     // In src/js/core/group_data_manager.ts
// In src/js/core/group_data_manager.ts

// The old signature was `(message, triggerListUpdate?)`
// The new signature accepts an options object. This is the fix.
// In src/js/core/group_data_manager.ts
// In src/js/core/group_data_manager.ts
// In src/js/core/group_data_manager.ts// In src/js/core/group_data_manager.ts

// The old, incorrect signature was: (message: GroupChatHistoryItem, triggerListUpdate?: boolean)
// The new, CORRECT signature is: (message: GroupChatHistoryItem, options?: { triggerListUpdate?: boolean })


// Inside the IIFE in group_data_manager.ts
async function addMessageToGroup(
    groupId: string,
    senderId: string,
    text: string | null,
    type: GroupChatHistoryItem['type'],
    options: {
        appMessageId: string;
        timestamp: Date; // Keep as Date for Firestore serverTimestamp
        senderName: string;
        imageUrl?: string | null;
        content_url?: string | null; // <<< ENSURE THIS IS HANDLED
        imageSemanticDescription?: string | null; // <<< ENSURE THIS IS HANDLED
    }
): Promise<string | null> {
    const currentUserForWrite = auth.currentUser;
    if (!currentUserForWrite) {
        console.error(`GDM.addMessageToGroup: User NOT AUTHENTICATED. Cannot add message to group ${groupId}. AppID: ${options.appMessageId}`);
        return null;
    }

    if (!groupId || !senderId) {
        console.error("GDM.addMessageToGroup: Cannot add group message, missing groupId or senderId.");
        return null;
    }

    const messagesColRef = collection(db, "groups", groupId, "messages");
    const groupDocRef = doc(db, "groups", groupId);

    const newMessageDoc: MessageDocument = {
        messageId: options.appMessageId, // Use the passed app-level UUID
        senderId: senderId,
        senderName: options.senderName,
        text: text || null,
        type: type || 'text',
        timestamp: serverTimestamp() as Timestamp, // Use serverTimestamp for Firestore
        reactions: {}, // Default empty reactions
        // Conditionally add fields if they exist in options
        ...(options.imageUrl && { imageUrl: options.imageUrl }),
        ...(options.content_url && { content_url: options.content_url }), // <<< CORRECTLY ADDED
        ...(options.imageSemanticDescription && { imageSemanticDescription: options.imageSemanticDescription }), // <<< CORRECTLY ADDED
    };

    try {
        const docRef = await addDoc(messagesColRef, newMessageDoc);
        console.log(`GDM.addMessageToGroup: Message added to group ${groupId}, Firestore Doc ID: ${docRef.id}. AppID: ${options.appMessageId}, Type: ${type}`);

        // Update the group's lastActivity and lastMessage
        await updateDoc(groupDocRef, {
            lastActivity: serverTimestamp(),
            lastMessage: {
                text: text ? text.substring(0, 50) : (options.imageUrl ? "[image]" : (options.content_url ? "[voice memo]" : `[${type}]`)),
                senderId: senderId,
                senderName: options.senderName,
                timestamp: serverTimestamp(), // Use serverTimestamp here too
                type: type,
                ...(options.content_url && { content_url: options.content_url }) // Add content_url to lastMessage if it's a voice memo
            }
        });
        return docRef.id; // Return Firestore document ID
    } catch (error: any) {
        console.error(`GDM.addMessageToGroup: Error adding message to group ${groupId}:`, error.message, newMessageDoc);
        return null;
    }
}


async function addMessageToFirestoreGroupChat(
    groupId: string,
    messageData: {
        appMessageId: string;
        senderId: string;
        senderName: string;
        text: string | null;
        imageUrl?: string;
        content_url?: string; // <<< FOR AI VOICE MEMOS
        imageSemanticDescription?: string; // <<< FOR AI IMAGE COMMENTARY
        type: 'text' | 'image' | 'voice_memo' | 'system_event';
        reactions?: { [key: string]: string[] };
    }
): Promise<string | null> {
    const currentUserForWrite = auth.currentUser;
    console.log(`[DEBUG_GDM_AUTH_CHECK] addMessageToFirestoreGroupChat for group ${groupId}. AppID: ${messageData.appMessageId}. Current auth UID: ${currentUserForWrite?.uid || 'NULL/UNDEFINED'}`);
    if (!currentUserForWrite) {
        console.error(`[DEBUG_GDM_AUTH_FAIL] GDM: User NOT AUTHENTICATED at the time of trying to add message to group ${groupId}. AppID: ${messageData.appMessageId}. Message Type: ${messageData.type}, SenderID in payload: ${messageData.senderId}`);
        try { throw new Error("Auth check failed marker in GDM addMessageToFirestoreGroupChat"); } catch (e: any) { console.error("[DEBUG_GDM_AUTH_FAIL] Stack trace for auth failure:", e.stack); }
        return null;
    }

    if (!groupId || !messageData.senderId) {
        console.error("GDM_Firestore: Cannot add group message, missing groupId or senderId in messageData.");
        return null;
    }

    const messagesColRef = collection(db, "groups", groupId, "messages");
    const groupDocRef = doc(db, "groups", groupId);

    const newMessageDoc: MessageDocument = {
        messageId: messageData.appMessageId,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        text: messageData.text || null,
        type: messageData.type,
        timestamp: serverTimestamp() as Timestamp,
        reactions: messageData.reactions || {},
        ...(messageData.imageUrl && { imageUrl: messageData.imageUrl }),
        ...(messageData.content_url && { content_url: messageData.content_url }), // <<< HANDLED
        ...(messageData.imageSemanticDescription && { imageSemanticDescription: messageData.imageSemanticDescription }) // <<< HANDLED
    };

    try {
        const docRef = await addDoc(messagesColRef, newMessageDoc);
        console.log(`GDM_Firestore: AI Message added to group ${groupId}, Firestore Doc ID: ${docRef.id}. AppID: ${messageData.appMessageId}, Type: ${messageData.type}`);

        await updateDoc(groupDocRef, {
            lastActivity: serverTimestamp(),
            lastMessage: {
                text: messageData.text ? messageData.text.substring(0, 50) : (messageData.imageUrl ? "[image]" : (messageData.content_url ? "[voice memo]" : `[${messageData.type}]`)),
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                timestamp: serverTimestamp(),
                type: messageData.type,
                ...(messageData.content_url && { content_url: messageData.content_url })
            }
        });
        return docRef.id;
    } catch (error: any) {
        console.error(`GDM_Firestore: Error adding message to group ${groupId}:`, error.message);
        console.error(`GDM_Firestore_FAIL_DETAILS: Failed for AppID: ${messageData.appMessageId}, Sender: ${messageData.senderName} (${messageData.senderId}), Type: ${messageData.type}`);
        console.error("GDM_Firestore_FAIL_PAYLOAD:", JSON.stringify(newMessageDoc));
        if (error.code) console.error("GDM_Firestore_FAIL_CODE:", error.code);
        if (error.details) console.error("GDM_Firestore_FAIL_DETAILS_RAW:", error.details);
        return null;
    }
}

    // In group_data_manager.ts
// REPLACE THE ENTIRE saveCurrentGroupChatHistory FUNCTION
// In src/js/core/group_data_manager.ts
// REPLACE THE ENTIRE saveCurrentGroupChatHistory FUNCTION

// D:\polyglot_connect\src\js\core\group_data_manager.ts
function saveCurrentGroupChatHistory(triggerListUpdate: boolean = true): void {
    const user = auth.currentUser;
    if (!polyglotHelpers || !currentGroupIdInternal || !Array.isArray(groupChatHistoryInternal) || !user) {
        console.warn(`GDM.saveCurrentGroupChatHistory: Cannot save. Deps, context, or user missing. User: ${!!user}`);
        return;
    }

    const userSpecificStorageKey = `${GROUP_CHAT_HISTORY_STORAGE_KEY}_${user.uid}`;
    const allUserHistories = polyglotHelpers.loadFromLocalStorage(userSpecificStorageKey) as Record<string, GroupChatHistoryItem[]> || {};
    
    let historyToSave = groupChatHistoryInternal.slice(-MAX_MESSAGES_STORED_PER_GROUP);

    // <<<--- RESTORED PRUNING LOGIC --- START --->>>
    const MESSAGES_TO_KEEP_MEDIA_FOR = 5;
    const prunedHistoryForStorage = historyToSave.map((message, index) => {
        const msgCopy = { ...message };
        // Don't save large base64 data to localStorage
        if (msgCopy.base64ImageDataForAI) {
            delete msgCopy.base64ImageDataForAI;
        }
        
        // Prune old image/audio data URLs to save space
        const isOldMessage = (historyToSave.length > 20) && (index < historyToSave.length - MESSAGES_TO_KEEP_MEDIA_FOR);
        if (isOldMessage && msgCopy.isImageMessage && msgCopy.imageUrl?.startsWith('data:image')) {
            delete msgCopy.imageUrl; 
            (msgCopy as any).imagePruned = true;
        }
        if (isOldMessage && msgCopy.isVoiceMemo && msgCopy.audioBlobDataUrl?.startsWith('data:audio')) {
            delete msgCopy.audioBlobDataUrl;
            (msgCopy as any).audioPruned = true;
        }
        return msgCopy;
    });
    // <<<--- RESTORED PRUNING LOGIC ---  END  --->>>

    allUserHistories[currentGroupIdInternal] = prunedHistoryForStorage;

    try {
        polyglotHelpers.saveToLocalStorage(userSpecificStorageKey, allUserHistories);
        console.log(`GDM.saveCurrentGroupChatHistory: Saved history for group ${currentGroupIdInternal} for user ${user.uid}. Stored ${prunedHistoryForStorage.length} messages.`);
    } catch (e: any) {
        console.error(`GDM.saveCurrentGroupChatHistory: FAILED TO SAVE for user ${user.uid}.`, e.message);
    }

    if (triggerListUpdate) {
        document.dispatchEvent(new CustomEvent('polyglot-conversation-updated', {
            detail: { type: 'group', id: currentGroupIdInternal, source: 'saveCurrentGroupChatHistory' }
        }));
    }
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




      // In group_data_manager.ts, inside the IIFE

function getAllGroupDataWithLastActivity(): ActiveGroupListItem[] {
    if (!polyglotHelpers || !polyglotGroupsData || !polyglotConnectors) {
        console.warn("GDM.getAllGroupDataWithLastActivity: Missing core dependencies.");
        return [];
    }

    const user = auth.currentUser;
    // If there's no user, we can't get any personalized history.
    const userSpecificStorageKey = user ? `${GROUP_CHAT_HISTORY_STORAGE_KEY}_${user.uid}` : null;
    const allStoredHistories = userSpecificStorageKey ? polyglotHelpers.loadFromLocalStorage(userSpecificStorageKey) as Record<string, GroupChatHistoryItem[]> || {} : {};
    const activeGroupChatItems: ActiveGroupListItem[] = [];

    // Ensure polyglotGroupsData contains the lastMessage field from Firestore if GDM is loading full group docs.
    // If polyglotGroupsData only contains basic definitions, this new logic won't have the Firestore lastMessage.
    // This assumes window.polyglotGroupsData is an array of Group objects, where Group type includes:
    // interface Group {
    //   // ... other properties
    //   lastMessage?: { text: string; senderId: string; senderName: string; timestamp: Timestamp | number; type: string; };
    // }

    console.log("[GDM_Sidebar_Debug] getAllGroupDataWithLastActivity called. Processing polyglotGroupsData count:", polyglotGroupsData.length);

    polyglotGroupsData.forEach(groupDef => {
        if (!groupDef?.id || !groupDef.name) {
            console.warn("[GDM_Sidebar_Debug] Skipping groupDef due to missing id or name:", groupDef);
            return;
        }

        // A group should be included in the "Active Chats" (sidebar) list if:
        // 1. It's the *currently selected* group (currentGroupIdInternal).
        // 2. Or, it has some persisted history in LocalStorage (allStoredHistories).
        // 3. Or, (NEW) it's a group the user is joined to (via userJoinedGroupIdsSet) even if LS history is momentarily empty
        //    (e.g., after joining, before first message syncs to LS, but Firestore lastMessage might exist).

        const isCurrentlyViewed = groupDef.id === currentGroupIdInternal;
        const hasPersistedHistory = !!(allStoredHistories[groupDef.id] && allStoredHistories[groupDef.id].length > 0);
        const isJoinedInMemory = userJoinedGroupIdsSet.has(groupDef.id); // Use the reliable set

        // Include if joined, or if it's the one being viewed, or has history.
        // Prioritize joined status for inclusion.
        if (!isJoinedInMemory && !isCurrentlyViewed && !hasPersistedHistory) {
             // console.log(`[GDM_Sidebar_Debug] Group ${groupDef.id} skipped: Not joined, not current, no LS history.`);
            return;
        }
        
        console.log(`[GDM_Sidebar_Debug] Processing group: ${groupDef.name} (ID: ${groupDef.id}). IsCurrent: ${isCurrentlyViewed}, HasLS: ${hasPersistedHistory}, IsJoined: ${isJoinedInMemory}`);


        let lastMessageForPreview: Partial<GroupChatHistoryItem> = {}; // Use Partial for flexibility
        let lastActivityTimestamp: number = 0;
        let sourceOfPreview = "None";

        // --- Priority 1: Firestore's lastMessage field from the group document itself ---
        // This requires groupDef to be populated with this field.
        if (groupDef.lastMessage && groupDef.lastMessage.text && groupDef.lastMessage.timestamp) {
            const fsTimestamp = groupDef.lastMessage.timestamp;
            lastActivityTimestamp = (typeof fsTimestamp === 'number') ? fsTimestamp : (fsTimestamp as Timestamp)?.toMillis?.() || 0;

            if (lastActivityTimestamp > 0) {
                lastMessageForPreview = {
                    text: groupDef.lastMessage.text,
                    speakerId: groupDef.lastMessage.senderId,
                    speakerName: groupDef.lastMessage.senderName,
                    timestamp: lastActivityTimestamp,
                    type: groupDef.lastMessage.type as GroupChatHistoryItem['type'] || 'text',
                };
                // Conditionally add audioBlobDataUrl if it's a voice memo and content_url exists
                if (groupDef.lastMessage.type === 'voice_memo' && (groupDef.lastMessage as any).content_url) {
                    lastMessageForPreview.audioBlobDataUrl = (groupDef.lastMessage as any).content_url;
                }
                sourceOfPreview = "Firestore groupDef.lastMessage";
            }
        }
        
        console.log(`[GDM_Sidebar_Debug] Group ${groupDef.id} - After Firestore check: Preview text: '${lastMessageForPreview.text}', Timestamp: ${lastActivityTimestamp}, Source: ${sourceOfPreview}`);

        // --- Priority 2: In-memory cache (groupChatHistoryInternal) if it's the current group ---
        // Only use this if its timestamp is newer than Firestore's or if Firestore's was missing.
        if (isCurrentlyViewed && groupChatHistoryInternal.length > 0) {
            const lastInternalCacheMsg = groupChatHistoryInternal[groupChatHistoryInternal.length - 1];
            if (lastInternalCacheMsg && typeof lastInternalCacheMsg.timestamp === 'number' && lastInternalCacheMsg.timestamp > lastActivityTimestamp) {
                lastMessageForPreview = lastInternalCacheMsg;
                lastActivityTimestamp = lastInternalCacheMsg.timestamp;
                sourceOfPreview = "Internal Cache (current group)";
            }
        }
        
        console.log(`[GDM_Sidebar_Debug] Group ${groupDef.id} - After Internal Cache check: Preview text: '${lastMessageForPreview.text}', Timestamp: ${lastActivityTimestamp}, Source: ${sourceOfPreview}`);

        // --- Priority 3: LocalStorage cache ---
        // Only use this if its timestamp is newer or others were missing.
        const lsHistory = allStoredHistories[groupDef.id];
        if (lsHistory && lsHistory.length > 0) {
            const lastLsMsg = lsHistory[lsHistory.length - 1];
            if (lastLsMsg && typeof lastLsMsg.timestamp === 'number' && lastLsMsg.timestamp > lastActivityTimestamp) {
                lastMessageForPreview = lastLsMsg;
                lastActivityTimestamp = lastLsMsg.timestamp;
                sourceOfPreview = "LocalStorage";
            }
        }
        
        console.log(`[GDM_Sidebar_Debug] Group ${groupDef.id} - After LocalStorage check: Preview text: '${lastMessageForPreview.text}', Timestamp: ${lastActivityTimestamp}, Source: ${sourceOfPreview}`);

        // --- Fallback if no messages found anywhere ---
        if (!lastMessageForPreview.text) {
            lastActivityTimestamp = groupDef.creationTime || Date.now(); // Or a very old date
            lastMessageForPreview = {
                text: "No messages yet.", // Default text
                speakerId: "system",
                speakerName: "System",
                timestamp: lastActivityTimestamp,
                type: 'system_event'
            };
            sourceOfPreview = "Fallback - No messages";
             console.log(`[GDM_Sidebar_Debug] Group ${groupDef.id} - Using Fallback. Preview text: '${lastMessageForPreview.text}', Timestamp: ${lastActivityTimestamp}`);
        }
        
        // Ensure speakerName is reasonable for the preview
        let speakerNameDisplay = lastMessageForPreview.speakerName || "";
        const user = auth.currentUser; // Get current user for "You:" prefix

        if (!speakerNameDisplay || speakerNameDisplay.toLowerCase() === "user_player" || speakerNameDisplay.toLowerCase() === "user_self_001" || (user && lastMessageForPreview.speakerId === user.uid) ) {
            speakerNameDisplay = "You";
        } else if (lastMessageForPreview.speakerId && lastMessageForPreview.speakerId !== "system" && !speakerNameDisplay) {
            // If speakerName was missing but we have an ID, try to find it in polyglotConnectors
            const speakerConnector = polyglotConnectors.find(c => c.id === lastMessageForPreview.speakerId);
            speakerNameDisplay = speakerConnector?.profileName?.split(' ')[0] || "Bot"; // Default to "Bot" if not found
        } else if (!speakerNameDisplay) {
            speakerNameDisplay = "System"; // Ultimate fallback
        }

        // Prepend "You:" if the speaker was the current user, but not for system messages
        let previewText = lastMessageForPreview.text || "";
        if (user && lastMessageForPreview.speakerId === user.uid && lastMessageForPreview.speakerId !== "system") {
            // Only add "You: " if it's not already there (e.g. from optimistic update)
            if (!previewText.toLowerCase().startsWith("you:")) {
                 // previewText = `You: ${previewText}`; // This will be handled by list_renderer now
            }
        } else if (lastMessageForPreview.type === 'system_event' && !previewText.startsWith("[")) {
            previewText = `[${previewText}]`;
        }


        const finalPreviewMessage: Partial<GroupChatHistoryItem> = { // Use Partial here
            messageId: lastMessageForPreview.messageId || polyglotHelpers.generateUUID(),
            text: previewText,
            speakerId: lastMessageForPreview.speakerId || "system",
            speakerName: speakerNameDisplay,
            timestamp: lastActivityTimestamp,
            type: lastMessageForPreview.type || 'text',
            // Correctly map content_url (from Firestore's lastMessage) to audioBlobDataUrl for the preview item
            audioBlobDataUrl: lastMessageForPreview.type === 'voice_memo' ? (lastMessageForPreview as any).content_url || lastMessageForPreview.audioBlobDataUrl : undefined,
            imageUrl: lastMessageForPreview.type === 'image' ? lastMessageForPreview.imageUrl : undefined,
        };
        
        console.log(`[GDM_Sidebar_Debug] Group ${groupDef.id} - Final Preview Msg for GDM return: `, JSON.parse(JSON.stringify(finalPreviewMessage)));

        const listItem: ActiveGroupListItem = {
            id: groupDef.id,
            name: groupDef.name,
            language: groupDef.language,
            groupPhotoUrl: groupDef.groupPhotoUrl,
            lastActivity: lastActivityTimestamp,
            messages: [finalPreviewMessage as GroupChatHistoryItem], // Cast to full type for the array
            isGroup: true,
            description: groupDef.description,
            isJoined: isJoinedInMemory // Use the reliable in-memory joined status
        };
        activeGroupChatItems.push(listItem);
    });

    console.log("[GDM_Sidebar_Debug] getAllGroupDataWithLastActivity finished. Returning items count:", activeGroupChatItems.length);
    return activeGroupChatItems;
}


        // ***** START: ADD THIS NEW FUNCTION DEFINITION *****
        function addMessageToInternalCacheOnly(message: GroupChatHistoryItem): void {
            if (!currentGroupIdInternal) {
                // This can happen if a message comes from Firestore for a group that is no longer the active one.
                // In this case, we might not update the 'live' groupChatHistoryInternal,
                // but saveCurrentGroupChatHistory might still pick it up if it saves all histories.
                // For now, we only add to cache if it's the current group.
                // console.warn("GDM.addMessageToInternalCacheOnly: No current group ID set. Message for potential background group:", message.messageId, ". This message won't be added to the live internal cache.");
                return;
            }
            if (!message || !message.messageId) { 
                console.warn("GDM.addMessageToInternalCacheOnly: Invalid or incomplete message object provided.", message);
                return;
            }
        
            // Deduplication: Check if a message with the same appMessageId (message.messageId) 
            // AND the same firestoreDocId (if both are present) already exists.
            // If firestoreDocId is not yet on the cached message, but present on the new one, update.
            const existingMessageIndex = groupChatHistoryInternal.findIndex(m => m.messageId === message.messageId);
        
            if (existingMessageIndex !== -1) {
                const existingMessage = groupChatHistoryInternal[existingMessageIndex];
                // If the existing message doesn't have a firestoreDocId but the new one does,
                // it's likely an optimistic message being confirmed. Update it.
                if (!existingMessage.firestoreDocId && message.firestoreDocId) {
                    console.log(`GDM.addMessageToInternalCacheOnly: Updating optimistic message ${message.messageId} with Firestore ID ${message.firestoreDocId} and potentially other details.`);
                    groupChatHistoryInternal[existingMessageIndex] = { ...existingMessage, ...message }; // Merge, new message details take precedence
                } else if (existingMessage.firestoreDocId && message.firestoreDocId && existingMessage.firestoreDocId === message.firestoreDocId) {
                    // console.log(`GDM.addMessageToInternalCacheOnly: Message ${message.messageId} (Firestore ID: ${message.firestoreDocId}) already in cache. Skipping add, potentially updating.`);
                    // Optionally update if content can change (e.g. reactions)
                    // For simplicity, if IDs match, assume it's the same and could be updated.
                    groupChatHistoryInternal[existingMessageIndex] = { ...existingMessage, ...message };
                } else {
                    // This case means messageId matches, but firestoreDocId doesn't, or one is missing.
                    // This could be a complex edge case (e.g. re-sent message). For now, log and decide behavior.
                    // console.warn(`GDM.addMessageToInternalCacheOnly: Message ${message.messageId} found by appMessageId, but FirestoreDocId conflict or mismatch. Current cache will be preferred unless explicitly updated.`);
                }
                return; // Message handled (either updated or skipped)
            }
        
            // If not found by findIndex, it's a new message
            groupChatHistoryInternal.push(message);
            // console.log(`GDM.addMessageToInternalCacheOnly: Message ${message.messageId} added to internal cache for group ${currentGroupIdInternal}. New cache length: ${groupChatHistoryInternal.length}`);
        
            // Prune if necessary, similar to saveCurrentGroupChatHistory but only for internal memory
            if (groupChatHistoryInternal.length > MAX_MESSAGES_STORED_PER_GROUP) {
                groupChatHistoryInternal.shift(); // Remove the oldest
                // console.log(`GDM.addMessageToInternalCacheOnly: Pruned internal cache for group ${currentGroupIdInternal}. Length now ${groupChatHistoryInternal.length}`);
            }
        }

        console.log("core/group_data_manager.ts: IIFE finished.");
        return {
            initialize, getGroupDefinitionById, getAllGroupDefinitions, isGroupJoined,
            loadGroupChatHistory, getLoadedChatHistory,  _updateUserJoinedGroupState,  addMessageToFirestoreGroupChat,
            addMessageToGroup, // <<< ADD THIS
            saveCurrentGroupChatHistory, setCurrentGroupContext, getCurrentGroupId,
            getCurrentGroupData, getAllGroupDataWithLastActivity,
            addMessageToInternalCacheOnly
        };
    })();

    if (window.groupDataManager && typeof window.groupDataManager.initialize === 'function') {
        console.log("group_data_manager.ts: SUCCESSFULLY assigned to window.groupDataManager. Calling its initialize method now...");
        
        // The `initialize` method now returns a Promise.
        // The `groupDataManagerReady` event is dispatched AFTER this promise resolves.
        window.groupDataManager.initialize()
            .then(() => { // <--- THIS FIXES THE "Property 'then' does not exist on type 'void'" ERROR
                document.dispatchEvent(new CustomEvent('groupDataManagerReady'));
                console.log('group_data_manager.ts: "groupDataManagerReady" event dispatched AFTER async GDM init completed successfully.');
            })
            .catch((error: any) => { // <--- Explicitly type error, FIXES THE "Parameter 'error' implicitly has an 'any' type" ERROR
                console.error("group_data_manager.ts: Error during GDM initialization:", error);
                // Even if GDM init fails, dispatch ready so other modules don't hang,
                // but they will operate on a potentially non-functional GDM.
                document.dispatchEvent(new CustomEvent('groupDataManagerReady'));
                console.warn('group_data_manager.ts: "groupDataManagerReady" event dispatched (GDM async init FAILED).');
            });
    } else {
        console.error("group_data_manager.ts: CRITICAL ERROR - assignment FAILED or initialize method missing. Cannot call initialize.");
        // Dispatch dummy ready if assignment itself failed.
        document.dispatchEvent(new CustomEvent('groupDataManagerReady'));
        console.warn('group_data_manager.ts: "groupDataManagerReady" event dispatched (GDM assignment FAILED).');
    }
} // End of initializeActualGroupDataManager


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