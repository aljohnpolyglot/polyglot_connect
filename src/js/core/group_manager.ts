// D:\polyglot_connect\src\js\core\group_manager.ts
// D:\polyglot_connect\src\js\core\group_manager.ts
import type {
    YourDomElements,
    TabManagerModule,
    ChatOrchestrator,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ChatUiManager,
    GroupDataManager,
    GroupUiHandler,
    GroupInteractionLogic,
    ActiveGroupListItem,
    Connector,
    Group,
    GroupChatHistoryItem,
    UiUpdater,
    MessageDocument
} from '../types/global.d.ts';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp   
    // Timestamp // Not directly used here but good to be aware of
} from "firebase/firestore";
import { auth, db } from '../firebase-config'; // Assuming this path

import { uploadImageToImgur } from '../services/imgur_service'; // <<< ADD THIS IMPORT
console.log('group_manager.ts: Script loaded, waiting for core dependencies.');

window.groupManager = {} as GroupManagerModule;
console.log('group_manager.ts: Structural placeholder for window.groupManager assigned.');
interface GroupManagerModule {
    initialize: () => void;
    loadAvailableGroups: (languageFilter?: string | null, categoryFilter?: string | null, nameSearch?: string | null, options?: { viewType: 'my-groups' | 'discover' }) => void;
    joinGroup: (groupOrGroupId: string | Group) => Promise<void>; // Matches async joinGroup
    leaveCurrentGroup: (triggerReload?: boolean, updateSidebar?: boolean) => void;
    handleUserMessageInGroup: (
        textFromInput?: string,
        options?: {
            skipUiAppend?: boolean;
            imageFile?: File | null;
            // captionText is removed as per new implementation logic
            messageId?: string;     // Added to match implementation's needs
            timestamp?: number;     // Added to match implementation's needs
        }
    ) => Promise<void>;
    userIsTyping: () => void; // Matches userIsTypingInGroupSignal (which is a shell)
    getCurrentGroupData: () => Group | null | undefined;
    getAllGroupDataWithLastActivity: () => ActiveGroupListItem[];
    isGroupJoined: (groupId: string) => boolean;
    getFullCurrentGroupMembers: () => Connector[];
    getMembersForGroup: (groupDef: Group) => Connector[]; // As per your "// ===== ADD THIS LINE ====="
}
const dependenciesForGroupManager = [
    'domElementsReady', 
    'tabManagerReady', 
    'chatOrchestratorReady', 
    'polyglotHelpersReady',
    'chatUiManagerPlaceholderReady',
    'groupDataManagerReady', 
    'groupUiHandlerReady',
    'groupInteractionLogicReady', 
    'polyglotDataReady'
];

const groupManagerMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGroupManager.forEach(dep => groupManagerMetDependenciesLog[dep] = false);
let groupManagerDepsMetCount = 0;

let unsubscribeFromGroupMessages: (() => void) | null = null;









function initializeActualGroupManager(): void {
    console.log('group_manager.ts: initializeActualGroupManager() for FULL method population called.');

    const finalChecks = {
        domElements: !!window.domElements,
        tabManager: !!(window.tabManager && typeof window.tabManager.switchToTab === 'function'),
        chatOrchestrator: !!(window.chatOrchestrator && typeof window.chatOrchestrator.initialize === 'function'),
        polyglotHelpers: !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function'),
        chatUiManager: !!(window.chatUiManager && typeof window.chatUiManager.showGroupChatView === 'function'),
        groupDataManager: !!(window.groupDataManager && typeof window.groupDataManager.initialize === 'function'),
        groupUiHandler: !!window.groupUiHandler,
        groupInteractionLogic: !!window.groupInteractionLogic,
        polyglotConnectors: !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors))
    };
    const allFinalChecksPassed = Object.values(finalChecks).every(Boolean);

    console.log(`GROUP_MANAGER_DEBUG: Inside initializeActualGroupManager - Final Functional Check Details:`, finalChecks);

    if (!allFinalChecksPassed) {
        console.error("group_manager.ts: CRITICAL - Some dependencies for full GroupManager setup FAILED finalChecks (see details above). `groupManagerReady` will NOT be dispatched.");
        const failed = Object.entries(finalChecks).filter(([,v]) => !v).map(([k]) => k);
        console.error("Failed finalChecks in GroupManager:", failed);
        // Assign dummy methods to window.groupManager if you want to prevent further errors
        // window.groupManager = { /* ... dummy methods ... */ } as GroupManagerModule;
        // document.dispatchEvent(new CustomEvent('groupManagerReady')); // Dispatch even on failure for dependent modules
        return;
    }
    console.log('group_manager.ts: All finalChecks passed. Proceeding to assign methods for `groupManagerReady` dispatch.');
    
    // START OF IIFE that defines the 'methods' object
    const methods = ((): GroupManagerModule => {
        'use strict';
        console.log("group_manager.ts: IIFE for actual methods STARTING.");

        const getDeps = () => ({
            domElements: window.domElements as YourDomElements,
            tabManager: window.tabManager as TabManagerModule,
            chatOrchestrator: window.chatOrchestrator as ChatOrchestrator,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers,
            chatUiManager: window.chatUiManager as ChatUiManager,
            groupDataManager: window.groupDataManager as GroupDataManager,
            groupUiHandler: window.groupUiHandler as GroupUiHandler,
            groupInteractionLogic: window.groupInteractionLogic as GroupInteractionLogic,
            polyglotConnectors: window.polyglotConnectors as Connector[],
            uiUpdater: window.uiUpdater as UiUpdater
        });

        let currentGroupTutorObject: Connector | null | undefined = null;
        let currentGroupMembersArray: Connector[] = [];
        let unsubscribeFromGroupMessages: (() => void) | null = null; // MOVED HERE
        let isUserTypingInGroup: boolean = false; // This seems unused, consider removing if true
        let userTypingTimeoutId: ReturnType<typeof setTimeout> | null = null; // This seems unused


        function initialize(): void {
            console.log("group_manager.ts: initialize() - START (FULL).");
            const { groupDataManager, groupUiHandler } = getDeps();
            groupDataManager?.initialize?.();
            groupUiHandler?.initialize?.();
            console.log("GroupManager (Facade): Initialized. Delegating to specialized managers.");
            console.log("group_manager.ts: initialize() - FINISHED (FULL).");
        }

        function getCurrentGroupData(): Group | null | undefined {
            const { groupDataManager } = getDeps();
            if (groupDataManager) {
                return groupDataManager.getCurrentGroupData();
            }
            return undefined; // Explicit return
        }
        function getFullCurrentGroupMembers(): Connector[] {
            return [...currentGroupMembersArray]; 
        }



     // =================== REPLACE THE loadAvailableGroups FUNCTION IN group_manager.ts ===================
  // In D:\polyglot_connect\src\js\core\group_manager.ts
// This function is inside the IIFE that defines methods for window.groupManager
async function loadAvailableGroups( // <<< MADE ASYNC
    languageFilter: string | null = null,
    categoryFilter: string | null = null,
    nameSearch: string | null = null,
    options: { viewType: 'my-groups' | 'discover' } = { viewType: 'my-groups' }
): Promise<void> { // <<< RETURN TYPE IS NOW Promise<void>
    console.log(`GM: loadAvailableGroups() - View: ${options.viewType}, Lang: ${languageFilter}, Cat: ${categoryFilter}, Name: ${nameSearch}`);
    
    const { groupUiHandler, groupDataManager, domElements, polyglotHelpers } = getDeps();

    if (!groupUiHandler || !groupDataManager || !domElements || !polyglotHelpers) {
        console.error("GM: Missing critical dependencies in loadAvailableGroups. Aborting.");
        if (domElements.groupsEmptyPlaceholder) {
            domElements.groupsEmptyPlaceholder.textContent = "Error loading groups. Please try again later.";
            domElements.groupsEmptyPlaceholder.style.display = 'block';
        }
        if (domElements.availableGroupsUl) domElements.availableGroupsUl.innerHTML = '';
        return;
    }

    // ***** START: RACE CONDITION FIX *****
    // Ensure GroupDataManager is fully initialized (i.e., its userJoinedGroupIdsSet is populated from Firestore)
    // before we rely on isGroupJoined.
    try {
        console.log("GM: loadAvailableGroups - Awaiting GDM initialization...");
        await groupDataManager.initialize(); // GDM.initialize() now returns a promise that resolves when ready
        console.log("GM: loadAvailableGroups - GDM initialization complete. userJoinedGroupIdsSet should be reliable.");
    } catch (error) {
        console.error("GM: loadAvailableGroups - Error during GDM initialization:", error);
        if (domElements.groupsEmptyPlaceholder) {
            domElements.groupsEmptyPlaceholder.textContent = "Could not load your group data. Please check connection and refresh.";
            domElements.groupsEmptyPlaceholder.style.display = 'block';
        }
        if (domElements.availableGroupsUl) domElements.availableGroupsUl.innerHTML = '';
        return;
    }
    // ***** END: RACE CONDITION FIX *****

    let allGroups = groupDataManager.getAllGroupDefinitions(languageFilter, categoryFilter, nameSearch);
    let groupsToDisplay: Array<Group & { isJoined?: boolean }>; // Type from GDM

    if (options.viewType === 'my-groups') {
        // Now, isGroupJoined() should be reliable as GDM is initialized.
        // getAllGroupDefinitions itself now adds the `isJoined` property correctly.
        groupsToDisplay = allGroups.filter(g => g.isJoined); 
        
        console.log(`%c[GM_DEBUG] In 'my-groups' view. Initial allGroups from GDM: ${allGroups.length}. After filtering for g.isJoined, groupsToDisplay: ${groupsToDisplay.length}.`, "color: white; background: purple;");
        
    } else { // 'discover' view
        groupsToDisplay = allGroups.filter(g => !g.isJoined);
        console.log(`%c[GM_DEBUG] In 'discover' view. Initial allGroups from GDM: ${allGroups.length}. After filtering for !g.isJoined, groupsToDisplay: ${groupsToDisplay.length}.`, "color: white; background: teal;");
    }

    // Call the UI handler to render the list
    groupUiHandler.displayAvailableGroups(groupsToDisplay, joinGroup); // joinGroup is a method in GM's scope
    
    // Update the empty placeholder message based on the results.
    const placeholderEl = domElements.groupsEmptyPlaceholder;
    if (placeholderEl) {
        const hasActiveFilters = !!languageFilter || !!categoryFilter || !!nameSearch;
        if (groupsToDisplay.length > 0) {
            placeholderEl.style.display = 'none';
        } else {
            placeholderEl.style.display = 'block';
            if (hasActiveFilters) {
                placeholderEl.textContent = 'No groups match your current filters.';
            } else {
                if (options.viewType === 'my-groups') {
                    placeholderEl.textContent = 'You have not joined any groups yet. Explore the Discover tab!';
                } else { // 'discover'
                    placeholderEl.textContent = 'No new groups to discover at the moment. Check back later!';
                }
            }
        }
    }
    
    console.log(`GM: loadAvailableGroups() - Finished. Displaying ${groupsToDisplay.length} groups for view '${options.viewType}'.`);
}
// =================================================================================================

        function getMembersForGroup(groupDef: Group): Connector[] {
            const { polyglotConnectors } = getDeps();
            if (!groupDef || !polyglotConnectors) return [];
    
            const host = polyglotConnectors.find(c => c.id === groupDef.tutorId);
            if (!host) {
                console.error(`GroupManager Helper: Host/Tutor with ID '${groupDef.tutorId}' not found for group '${groupDef.name}'.`);
                return [];
            }
    
            let members = [host];
            let potentialAdditionalMembers = [...polyglotConnectors].filter(p => p.id !== host!.id);
    
            const criteria = groupDef.memberSelectionCriteria;
            const groupLanguage = groupDef.language;
    
            if (criteria) {
                const targetLang = criteria.language || groupLanguage;
                if (targetLang) {
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.language === targetLang ||
                        p.nativeLanguages?.some(nl => nl.lang === targetLang) ||
                        p.practiceLanguages?.some(pl => pl.lang === targetLang) ||
                        (p.languageRoles && Object.keys(p.languageRoles).includes(targetLang))
                    );
                }
                if (criteria.role && targetLang) {
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.languageRoles?.[targetLang]?.includes(criteria.role!)
                    );
                } else if (criteria.role && !criteria.language) {
                     potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        Object.values(p.languageRoles || {}).some(rolesArray => rolesArray.includes(criteria.role!))
                    );
                }
                if (criteria.country) {
                    const allowedCountries = (Array.isArray(criteria.country) ? criteria.country : [criteria.country]).map(c => c.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.country && allowedCountries.includes(p.country.toLowerCase())
                    );
                }
                if (criteria.city) {
                    const allowedCities = (Array.isArray(criteria.city) ? criteria.city : [criteria.city]).map(c => c.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.city && allowedCities.includes(p.city.toLowerCase())
                    );
                }
                if (criteria.interestsInclude) {
                    const requiredInterests = (Array.isArray(criteria.interestsInclude) ? criteria.interestsInclude : [criteria.interestsInclude]).map(i => i.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.interests?.some(interest => requiredInterests.includes(interest.toLowerCase()))
                    );
                }
                if (criteria.interestsAll && criteria.interestsAll.length > 0) {
                    const requiredInterests = criteria.interestsAll.map(i => i.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        requiredInterests.every(reqInterest =>
                            p.interests?.some(pInterest => pInterest.toLowerCase() === reqInterest)
                        )
                    );
                }
                if (criteria.excludeIds && criteria.excludeIds.length > 0) {
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p => !criteria.excludeIds?.includes(p.id));
                }
            } else {
                console.warn(`GroupManager Helper: No memberSelectionCriteria for group '${groupDef.name}'. Falling back to selecting 'learner' role for group language '${groupLanguage}'.`);
                potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                    p.languageRoles?.[groupLanguage]?.includes("learner") &&
                    !p.languageRoles?.[groupLanguage]?.includes("tutor")
                );
            }
    
            const shuffledAdditionalMembers = potentialAdditionalMembers.sort(() => 0.5 - Math.random());
            const neededAdditionalCount = Math.max(0, groupDef.maxLearners || 0);
            const selectedAdditionalMembers = shuffledAdditionalMembers.slice(0, neededAdditionalCount);
            
            members.push(...selectedAdditionalMembers);
    
            if (selectedAdditionalMembers.length < neededAdditionalCount) {
                console.warn(`GroupManager Helper: Could only find ${selectedAdditionalMembers.length} of ${neededAdditionalCount} needed members for group '${groupDef.name}'.`);
            }
            return members;
        }

        async function joinGroup(groupOrGroupId: string | Group): Promise<void> {
            console.log("GROUP_MANAGER: joinGroup CALLED with:", typeof groupOrGroupId === 'string' ? groupOrGroupId : groupOrGroupId.id);
            const {
                groupDataManager,
                groupUiHandler,
                groupInteractionLogic,
                tabManager,
                chatOrchestrator,
                // uiUpdater, // Not directly used in this version, GUH handles UI
                polyglotHelpers // Needed for UUIDs if GIL doesn't generate them for AI messages
            } = getDeps(); // getDeps() must be defined within the SAME IIFE scope
        
            if (!groupDataManager || !groupUiHandler || !groupInteractionLogic || !tabManager || !chatOrchestrator || !polyglotHelpers) {
                console.error("GroupManager: joinGroup - Critical dependencies missing!");
                alert("Cannot join group: core components missing.");
                return;
            }
        
            const groupId = (typeof groupOrGroupId === 'object' && groupOrGroupId !== null) ? groupOrGroupId.id : groupOrGroupId;
            const groupDef = groupDataManager.getGroupDefinitionById(groupId);
        
            if (!groupDef || !groupDef.name || !groupDef.language) {
                console.error(`GroupManager: Group definition (or its name/language) not found for ID: '${groupId}'`);
                alert(`Error: Could not find details for group ID ${groupId}.`);
                return;
            }
        
            const user = auth.currentUser;
            if (!user) {
                console.error("GroupManager: No authenticated user to join group.");
                alert("You must be logged in to join a group.");
                return;
            }
        
            const currentActiveGroupId = groupDataManager.getCurrentGroupId();
            if (currentActiveGroupId && currentActiveGroupId !== groupId) {
                console.log(`GM.joinGroup: User is in group '${currentActiveGroupId}', attempting to join '${groupId}'. Leaving current group first.`);
                await leaveCurrentGroup(false, false); // leaveCurrentGroup must be defined in this IIFE
                console.log(`GM.joinGroup: Finished leaving group '${currentActiveGroupId}'. Now proceeding to join '${groupId}'.`);
            } else if (currentActiveGroupId && currentActiveGroupId === groupId) {
                console.log(`GM.joinGroup: User is already in group '${groupId}'. Activating chat view.`);
            }
        
            try {
                const memberRef = doc(db, "groups", groupId, "members", user.uid);
                await setDoc(memberRef, {
                    joinedAt: serverTimestamp(),
                    displayName: user.displayName || "Anonymous User", // Consistent default
                }, { merge: true });
                console.log(`GroupManager: User ${user.uid} successfully joined/updated in group ${groupId} in Firestore.`);
                groupDataManager._updateUserJoinedGroupState?.(groupId, true);
            } catch (error) {
                console.error(`GroupManager: Error joining group ${groupId} in Firestore:`, error);
                alert("Failed to join group. Please try again.");
                groupDataManager._updateUserJoinedGroupState?.(groupId, false); // Revert GDM state
                return;
            }
        
            // Set GDM context. This loads history from LocalStorage into GDM's internal cache initially.
            groupDataManager.setCurrentGroupContext(groupId, groupDef);
            localStorage.setItem('polyglotLastActiveGroupId', groupId);
        
            // Populate IIFE-scoped variables (currentGroupMembersArray, currentGroupTutorObject)
            // These variables should be declared at the top of your IIFE.
            currentGroupMembersArray = getMembersForGroup(groupDef); // getMembersForGroup must be in IIFE
            currentGroupTutorObject = currentGroupMembersArray.find(m => m.id === groupDef.tutorId);
        
            if (currentGroupMembersArray.length === 0 || !currentGroupTutorObject) {
                console.error(`GM.joinGroup: Critical error resolving members or tutor for group ${groupId}.`);
                alert("Error setting up group members. Cannot join.");
                return;
            }
        
            // Clean up any existing main message listener
            if (unsubscribeFromGroupMessages) { // unsubscribeFromGroupMessages is an IIFE-scoped variable
                console.log("GM.joinGroup: Cleaning up previous group message listener.");
                unsubscribeFromGroupMessages();
                unsubscribeFromGroupMessages = null;
            }
        
            const messagesQuery = query(collection(db, "groups", groupId, "messages"), orderBy("timestamp", "asc"));
            let initialSyncDoneForGIL = false; // Flag to ensure GIL starts after initial messages are processed into GDM
        
            console.log(`GM.joinGroup: Setting up MAIN Firestore listener for messages in group ${groupId}.`);
            unsubscribeFromGroupMessages = onSnapshot(messagesQuery, (snapshot) => { // Assigns to IIFE-scoped variable
                const {
                    groupUiHandler: currentGUH_Main,
                    groupDataManager: currentGDM_Main,
                    uiUpdater: currentUIU_Main, // For scrolling
                    domElements: currentDOM_Main, // For scrolling
                    // polyglotConnectors is needed if resolving speaker names for non-members (unlikely for group chat)
                    // For group members, currentGroupMembersArray (IIFE-scoped) should be used.
                } = getDeps();
        
                if (!currentGDM_Main || !currentGUH_Main) {
                    console.warn("GM (Main Listener): GDM or GUH not available in onSnapshot callback. Skipping message processing.");
                    return;
                }
        
                let newMessagesProcessedInThisSnapshot = false;
        
                snapshot.docChanges().forEach((change) => {
                    const msgData = change.doc.data() as MessageDocument; // Type assertion
                    const userAuth = auth.currentUser; // Get current user for owner check
        
                    if (!msgData.messageId) {
                        console.warn("GM (Main Listener): Received message from Firestore without app-level messageId. Skipping:", change.doc.id, msgData);
                        return;
                    }
        
                    // Optimistic update reconciliation for user's own messages
                    if (userAuth && msgData.senderId === userAuth.uid) {
                        const existingOptimisticMessage = document.querySelector(`.chat-message-wrapper[data-message-id="${msgData.messageId}"]:not([data-firestore-message-id])`);
                        if (existingOptimisticMessage) {
                            existingOptimisticMessage.setAttribute('data-firestore-message-id', change.doc.id);
                            console.log(`GM (Main Listener): Reconciled own optimistic message ${msgData.messageId} with Firestore doc ${change.doc.id}.`);
                        }
                        // For user's own messages, we typically don't re-append to UI if already handled optimistically.
                        // However, GDM cache *should* still be updated with the confirmed Firestore data if it wasn't perfectly synced.
                    }
        
                    // Resolve speakerName using IIFE-scoped currentGroupMembersArray
                    const speakerData = currentGroupMembersArray.find(member => member.id === msgData.senderId);
                    const resolvedSpeakerName = msgData.senderName || // Prefer senderName from Firestore if present
                                             (msgData.senderId === userAuth?.uid ? "You" :
                                             (speakerData?.profileName || "Bot")); // Fallback to Bot
        
                                             const historyItem: GroupChatHistoryItem = { 
                                                firestoreDocId: change.doc.id,
                                                messageId: msgData.messageId,
                                                speakerId: msgData.senderId,
                                                speakerName: resolvedSpeakerName,
                                                text: msgData.text,
                                                timestamp: (msgData.timestamp as Timestamp)?.toMillis() || Date.now(),
                                                imageUrl: msgData.imageUrl === null ? undefined : msgData.imageUrl, 
                                                type: msgData.type as GroupChatHistoryItem['type'], 
                                                reactions: msgData.reactions || {},
                                                audioBlobDataUrl: msgData.content_url === null ? undefined : msgData.content_url, // <<< ENSURE THIS FIX
                                            };
        
                    if (change.type === "added") {
                        newMessagesProcessedInThisSnapshot = true;
        
                        // SOLUTION FOR SIDEBAR & GDM CACHE (Issue 3)
                        if (currentGDM_Main.getCurrentGroupId() === groupId) {
                            currentGDM_Main.addMessageToInternalCacheOnly(historyItem);
                        }
        
                        // Append to UI
                        if (!(userAuth && msgData.senderId === userAuth.uid && document.querySelector(`.chat-message-wrapper[data-firestore-message-id="${change.doc.id}"]`))) {
                            currentGUH_Main.appendMessageToGroupLog(
                                historyItem.text || "",
                                historyItem.speakerName!,
                                false, 
                                historyItem.speakerId,
                                { 
                                    messageId: historyItem.messageId,
                                    id: historyItem.firestoreDocId,
                                    imageUrl: historyItem.imageUrl,
                                    timestamp: historyItem.timestamp,
                                    reactions: historyItem.reactions,
                                    firestoreDocId: historyItem.firestoreDocId,
                                    type: historyItem.type,
                                    // CRITICAL FOR VOICE MEMO PLAYBACK:
                                    isVoiceMemo: historyItem.type === 'voice_memo', 
                                    audioSrc: historyItem.audioBlobDataUrl === null ? undefined : historyItem.audioBlobDataUrl 
                                }
                            );
                        }
                    } else if (change.type === "modified") {
                        console.log(`GM (Main Listener): Message ${msgData.messageId} modified. FirestoreDocID: ${change.doc.id}. Data:`, msgData);
                        // TODO: Implement GDM cache update for modified messages
                        // TODO: Implement UI update for modified messages in groupUiHandler
                    }
                }); // End of snapshot.docChanges().forEach()
        
                // After processing all changes in this snapshot:
                if (newMessagesProcessedInThisSnapshot) {
                    // Check GDM and its method before calling
                    if (currentGDM_Main && typeof currentGDM_Main.saveCurrentGroupChatHistory === 'function') {
                        if (currentGDM_Main.getCurrentGroupId() === groupId) {
                            currentGDM_Main.saveCurrentGroupChatHistory(true); // Now safer
                        } else {
                            console.log(`GM (Main Listener): Group ${groupId} is no longer active. GDM cache updated in memory. Consider background save if needed.`);
                            // Optionally, if you still want to save for inactive groups:
                            // currentGDM_Main.saveCurrentGroupChatHistory(false); // Or true, depending on desired event dispatch
                        }
                    } else {
                        console.warn("GM (Listener): GDM or saveCurrentGroupChatHistory method not available for snapshot save.");
                    }

                    // Scroll chat to bottom if it's the active view
                    if (currentDOM_Main?.groupChatLogDiv && currentDOM_Main.groupChatInterfaceDiv && (currentDOM_Main.groupChatInterfaceDiv as HTMLElement).style.display !== 'none' && currentDOM_Main.groupChatInterfaceDiv.classList.contains('active')) { // THIS IS LIKELY WHERE LINE 513 IS
                        if (currentUIU_Main && typeof currentUIU_Main.scrollEmbeddedChatToBottom === 'function') {
                            currentUIU_Main.scrollEmbeddedChatToBottom(currentDOM_Main.groupChatLogDiv);
                        } else {
                            console.warn("GM (Listener): uiUpdater or scrollEmbeddedChatToBottom method not available for scrolling.");
                        }
                    }
                } // This closing brace is for 'if (newMessagesProcessedInThisSnapshot)'
        
                // SOLUTION FOR GRAND OPENING (Issue 2)
                // This ensures GIL starts *after* the very first batch of messages from Firestore
                // has been processed into GDM's cache by the above logic.
                if (!initialSyncDoneForGIL && snapshot.docChanges().length > 0) { // Check if any docs were processed
                    initialSyncDoneForGIL = true;
                    console.log(`GM.joinGroup (Main Listener): Initial Firestore snapshot processed for group ${groupId}. GDM cache should be up-to-date. Starting GIL.`);

                    // Ensure GDM's LocalStorage is also up-to-date with this initial sync
                    // Check GDM and its method before calling
                    if (currentGDM_Main && typeof currentGDM_Main.saveCurrentGroupChatHistory === 'function') {
                        if (currentGDM_Main.getCurrentGroupId() === groupId) {
                            currentGDM_Main.saveCurrentGroupChatHistory(false); // Now safer
                        }
                    } else {
                        console.warn("GM (Listener): GDM or saveCurrentGroupChatHistory method not available for initial silent save.");
                    }

                    if (groupInteractionLogic?.initialize && currentGroupTutorObject) {
                        groupInteractionLogic.initialize(currentGroupMembersArray, currentGroupTutorObject);
                        groupInteractionLogic.startConversationFlow(true);
                    } else {
                        console.error("GM.joinGroup: Failed to initialize/start GroupInteractionLogic after initial sync.");
                    }
                } else if (!initialSyncDoneForGIL && snapshot.docChanges().length === 0) {
                    initialSyncDoneForGIL = true;
                    console.log(`GM.joinGroup (Main Listener): Initial Firestore snapshot for group ${groupId} was empty. Starting GIL based on LocalStorage/GDM cache.`);

                    // Optionally, still attempt to save if GDM should clear/save an empty state
                    // if (currentGDM_Main && typeof currentGDM_Main.saveCurrentGroupChatHistory === 'function') {
                    //     if (currentGDM_Main.getCurrentGroupId() === groupId) {
                    //         // currentGDM_Main.saveCurrentGroupChatHistory(false); 
                    //     }
                    // }

                    if (groupInteractionLogic?.initialize && currentGroupTutorObject) {
                        groupInteractionLogic.initialize(currentGroupMembersArray, currentGroupTutorObject);
                        groupInteractionLogic.startConversationFlow(true);
                    } else {
                        console.error("GM.joinGroup: Failed to initialize/start GroupInteractionLogic for empty new group.");
                    }
                }
        
        
            }, (error: any) => { // Explicitly type error for the listener
                console.error(`GroupManager: Error listening to messages for group ${groupId}:`, error);
            });
            console.log(`GroupManager: Main persistent Firestore listener setup complete for group ${groupId}.`);
        
            // --- UI Update: Show Group Chat View ---
            // This should happen after context is set. GIL starts after initial message sync.
            // The history passed here will be from LocalStorage (via GDM.getLoadedChatHistory called by setCurrentGroupContext).
            // The Firestore listener will then populate/update the UI with live/fresher messages.
            const historyForNewGroupFromLS = groupDataManager.getLoadedChatHistory(); // GDM's cache state at this point
            console.log(`GM.joinGroup: Passing history (from LS via GDM) to showGroupChatView. Length: ${historyForNewGroupFromLS.length}. Group: ${groupDef.name}`);
            groupUiHandler.showGroupChatView(groupDef, currentGroupMembersArray, historyForNewGroupFromLS); // Uses IIFE-scoped currentGroupMembersArray
        
            tabManager.switchToTab('groups');
            window.sidebarPanelManager?.updatePanelForCurrentTab?.('groups'); // Optional chaining
            chatOrchestrator?.renderCombinedActiveChatsList?.(); // Update sidebar
        
            console.log(`group_manager.ts: joinGroup() - FINISHED full join/activation for group: ${groupId}`);
        
                

// In group_manager.ts, INSIDE the IIFE `const methods = ((): GroupManagerModule => { ... })();`

    function sendWelcomeMessagesToGroup(groupDef: Group, tutor: Connector, members: Connector[]): void {
        console.log("GM: sendWelcomeMessagesToGroup() - START for group:", groupDef?.name);
        const { groupUiHandler, groupDataManager, groupInteractionLogic, polyglotHelpers } = getDeps(); // <<< Added polyglotHelpers

        if (!groupDef || !tutor || !groupUiHandler?.appendMessageToGroupLog || !polyglotHelpers) { // Added polyglotHelpers check
            console.error("GM.sendWelcomeMessagesToGroup: Missing critical parameters or dependencies.");
            return;
        }

        const welcomePromptForUser = `Welcome to "${groupDef.name}"! I'm ${tutor.profileName || 'your host for this session'}, and we'll be chatting in ${groupDef.language}. Our general topic is: ${groupDef.tags?.[0] || 'conversation practice'}. To get us started, could you introduce yourself and let us know what you'd like to talk about or practice today?`;
        groupUiHandler.appendMessageToGroupLog(welcomePromptForUser, tutor.profileName!, false, tutor.id);
    
        
        const user = auth.currentUser; 
        if (currentGroupTutorObject && groupDef && groupDataManager.addMessageToFirestoreGroupChat) { 
            groupDataManager.addMessageToFirestoreGroupChat(groupDef.id, {
                appMessageId: polyglotHelpers.generateUUID(), // <<< NOW OK
                senderId: currentGroupTutorObject.id, 
                senderName: currentGroupTutorObject.profileName,
                text: welcomePromptForUser, 
                type: 'text'
            }).then(docId => {
                if (docId) console.log("GM: Tutor welcome message saved to Firestore.");
                else console.error("GM: Failed to save tutor welcome message to Firestore.");
            });
        }
    }
        if (groupInteractionLogic && typeof groupInteractionLogic.setAwaitingUserFirstIntroduction === 'function') {
            groupInteractionLogic.setAwaitingUserFirstIntroduction(true);
            console.log("GM: Told GroupInteractionLogic to await user's first introduction.");
        } else {
            console.warn("GM: groupInteractionLogic.setAwaitingUserFirstIntroduction() not available. AI intros might not wait for user.");
        }
        
        console.log("GM: sendWelcomeMessagesToGroup() - FINISHED. Tutor welcome sent, awaiting user intro via GIL.");
    }

      // <<< REPLACE THE FUNCTION WITH THIS EMPTY VERSION >>>
function userIsTypingInGroupSignal(): void {
    // This function's original purpose was to notify the AI when the user was typing
    // to prevent interruptions. Our new "Conversation Block" and long cooldown system
    // makes this feature obsolete. We are leaving the function here as a shell
    // to prevent errors from the event listeners that still call it, but it does nothing.
    
    // const { groupInteractionLogic } = getDeps(); // No longer needed
    // groupInteractionLogic?.setUserTypingStatus(true); // This was the error
}

async function handleUserVoiceMemoInGroup(
    transcript: string,
    audioSupabaseUrl: string,
    options: {
        messageId?: string; // App-level UUID from voice_memo_handler
        timestamp?: number;
    } = {}
): Promise<void> {
    const functionName = "GroupManager.handleUserVoiceMemoInGroup";
    const { groupUiHandler, groupDataManager, groupInteractionLogic, polyglotHelpers } = getDeps();
    const currentUser = auth.currentUser;

    if (!currentUser || !groupUiHandler || !groupDataManager || !groupInteractionLogic || !polyglotHelpers) {
        console.error(`${functionName}: Critical dependencies missing.`);
        return;
    }
    const currentGroupData = groupDataManager.getCurrentGroupData();
    if (!currentGroupData) {
        console.error(`${functionName}: No current group data.`);
        return;
    }

    console.log(`${functionName}: Processing user voice memo. Transcript: "${transcript.substring(0,30)}...", URL: ${audioSupabaseUrl}`);

    const optimisticAppMessageId = options.messageId || polyglotHelpers.generateUUID();
    const optimisticTimestamp = options.timestamp || Date.now();

    // 1. Optimistic UI Append for user's voice memo
    groupUiHandler.appendMessageToGroupLog(
        transcript,
        currentUser.displayName || "You",
        true, // isUser
        currentUser.uid,
        {
            messageId: optimisticAppMessageId,
            timestamp: optimisticTimestamp,
            isVoiceMemo: true,
            audioSrc: audioSupabaseUrl, // Pass Supabase URL for playback
            type: 'voice_memo'
        }
    );

    // 2. Save user's voice memo to Firestore
    const userMessageFirestoreId = await groupDataManager.addMessageToGroup(
        currentGroupData.id,
        currentUser.uid,
        transcript,
        'voice_memo',
        {
            appMessageId: optimisticAppMessageId,
            timestamp: new Date(optimisticTimestamp), // Firestore expects Date for serverTimestamp
            senderName: currentUser.displayName || "User",
            content_url: audioSupabaseUrl // Save Supabase URL
        }
    );

    if (!userMessageFirestoreId) {
        console.error(`${functionName}: Failed to save user's voice memo to Firestore. Aborting AI response.`);
        // Optionally update UI of optimistic message to show save error
        return;
    }
    console.log(`${functionName}: User voice memo saved to Firestore. DocID: ${userMessageFirestoreId}, AppID: ${optimisticAppMessageId}`);

    // 3. Trigger Group Interaction Logic for AI responses (passing the transcript)
    const aiResponsePayload = await groupInteractionLogic.handleUserMessage(
        transcript, // Pass transcript as the text input to GIL
        {} // No image options here
    );

    // 4. Save AI responses to Firestore
    if (aiResponsePayload && aiResponsePayload.aiMessagesToPersist && aiResponsePayload.aiMessagesToPersist.length > 0) {
        for (const aiMsg of aiResponsePayload.aiMessagesToPersist) {
            await groupDataManager.addMessageToFirestoreGroupChat( // Use the more direct Firestore method
                currentGroupData.id,
                {
                    appMessageId: aiMsg.messageId,
                    senderId: aiMsg.speakerId,
                    senderName: aiMsg.speakerName,
                    text: aiMsg.text,
                    type: aiMsg.type, // Will be 'text' from GIL for this flow
                    // No content_url or imageUrl for AI's text response to a voice memo
                }
            );
        }
        console.log(`${functionName}: Saved ${aiResponsePayload.aiMessagesToPersist.length} AI responses to Firestore.`);
    }
    // GIL's playScene handles AI UI updates.
}




async function leaveCurrentGroup(triggerReload: boolean = true, updateSidebar: boolean = true): Promise<void> { // Add Promise<void>
    console.error("!!!!!!!!!!!!!!!!! leaveCurrentGroup CALLED !!!!!!!!!!!!!!!!!"); // Make it loud
    console.trace("Call stack for leaveCurrentGroup"); // This will show who called it
    const { groupInteractionLogic, groupUiHandler, groupDataManager, tabManager, chatOrchestrator } = getDeps();
    const currentGroupId = groupDataManager.getCurrentGroupId();
    const user = auth.currentUser;

    console.log(`GM.leaveCurrentGroup: CALLED. Current Group ID: '${currentGroupId}'.`);

    if (groupInteractionLogic) groupInteractionLogic.stopConversationFlow?.();

    if (unsubscribeFromGroupMessages) {
        unsubscribeFromGroupMessages();
        unsubscribeFromGroupMessages = null;
        console.log("GroupManager: Unsubscribed from group messages listener.");
    }


 // --- FOCUS DEBUG HERE ---
 if (currentGroupId && user) {
    console.log(`GM.leaveCurrentGroup: ---->>> ENTERING BLOCK TO DELETE FROM FIRESTORE for group ${currentGroupId}`);
    const memberRef = doc(db, "groups", currentGroupId, "members", user.uid);
    try {
        await deleteDoc(memberRef);
        console.log(`GM.leaveCurrentGroup: <<<<<<---- SUCCESS: User ${user.uid} DELETED from group ${currentGroupId} members in Firestore.`);
        groupDataManager._updateUserJoinedGroupState?.(currentGroupId, false);
    } catch (error) {
        console.error(`GM.leaveCurrentGroup: <<<<<<---- ERROR deleting user from group ${currentGroupId} members in Firestore:`, error);
    }

    if (groupDataManager && typeof groupDataManager.saveCurrentGroupChatHistory === 'function') {
        console.log("GM.leaveCurrentGroup: Saving current group chat history (likely for the group being left).");
        groupDataManager.saveCurrentGroupChatHistory(false); // Save history before context is cleared
    }
} else {
    console.log(`GM.leaveCurrentGroup: SKIPPING FIRESTORE DELETE block. currentGroupId: ${currentGroupId}, user: ${user?.uid}`);
}
if(groupUiHandler) {
    console.log("GM.leaveCurrentGroup: Hiding group chat view via GUH.");
    groupUiHandler.hideGroupChatViewAndShowList?.();
}

console.log("GM.leaveCurrentGroup: Resetting IIFE-scoped group state.");
resetGroupState(); // Resets GM's internal currentGroupTutorObject, currentGroupMembersArray etc.

if(groupDataManager) {
    console.log("GM.leaveCurrentGroup: Setting GDM current group context to null.");
    groupDataManager.setCurrentGroupContext(null, null);
}

if (groupInteractionLogic) {
    console.log("GM.leaveCurrentGroup: Resetting GIL.");
    groupInteractionLogic.reset?.();
}

if (tabManager) {
    console.log("GM.leaveCurrentGroup: Switching to 'groups' tab via TabManager.");
    tabManager.switchToTab('groups'); // This might trigger other logic (e.g. in shell_controller)
}

const sidebarPanelManager = window.sidebarPanelManager; // Get a fresh reference
if (sidebarPanelManager && typeof sidebarPanelManager.updatePanelForCurrentTab === 'function') {
    console.log("GM.leaveCurrentGroup: Updating sidebar panel for 'groups' tab.");
    sidebarPanelManager.updatePanelForCurrentTab('groups');
}
if (tabManager?.getCurrentActiveTab?.() === 'groups' && triggerReload) {
    console.log("GM.leaveCurrentGroup: Currently on 'groups' tab and triggerReload is true. Reloading available groups.");
    // Await this if it involves async operations that should complete before joinGroup proceeds fully
    await loadAvailableGroups(null,null,null, {viewType: 'my-groups'}); // Explicitly load 'my-groups'
} else {
    console.log(`GM.leaveCurrentGroup: Not reloading groups. Current tab: ${tabManager?.getCurrentActiveTab?.()}, triggerReload: ${triggerReload}`);
}

if(chatOrchestrator && typeof chatOrchestrator.renderCombinedActiveChatsList === 'function') {
    console.log("GM.leaveCurrentGroup: Requesting chat orchestrator to re-render combined active chats list.");
    chatOrchestrator.renderCombinedActiveChatsList?.();
}

console.log("group_manager.ts: leaveCurrentGroup() - FINISHED.");
}

        function resetGroupState(): void {
            console.log("group_manager.ts: resetGroupState() called.");
            const { groupUiHandler } = getDeps();
            currentGroupTutorObject = null;
            currentGroupMembersArray = [];
            isUserTypingInGroup = false;
            if (userTypingTimeoutId) clearTimeout(userTypingTimeoutId);
            userTypingTimeoutId = null; 
            groupUiHandler?.updateGroupTypingIndicator('');
            groupUiHandler?.clearGroupInput();
        }

     // D:\polyglot_connect\src\js\core\group_manager.ts

// ...

// REPLACE THE ENTIRE FUNCTION WITH THIS BLOCK
// In src/js/core/group_manager.ts
// Replace the entire handleUserMessageInGroup function with this one.
// In src/js/core/group_manager.ts
async function handleUserMessageInGroup(
    textFromInput?: string,
    options: {
        skipUiAppend?: boolean; // Less relevant now if GM always appends user message
        imageFile?: File | null;
        messageId?: string;
        timestamp?: number;
    } = {}
): Promise<void> {
    const functionName = "GroupManager.handleUserMessageInGroup";
    const { groupUiHandler, groupDataManager, groupInteractionLogic, polyglotHelpers } = getDeps();
    const currentUser = auth.currentUser;

    if (!currentUser || !groupUiHandler || !groupDataManager || !groupInteractionLogic || !polyglotHelpers) {
        console.error(`${functionName}: Critical dependencies missing.`);
        return;
    }
    const currentGroupData = groupDataManager.getCurrentGroupData();
    if (!currentGroupData) {
        console.error(`${functionName}: No current group data.`);
        return;
    }

    const userProvidedText = (textFromInput || "").trim(); // User's caption or text message
    const imageFile = options.imageFile;
    const optimisticAppMessageId = options.messageId || polyglotHelpers.generateUUID();
    const optimisticTimestamp = options.timestamp || Date.now();

    let userMessageFirestoreId: string | null = null;
    let gilOptionsForAi: any = {}; // Options to pass to GIL's handleUserMessage

    if (imageFile) { // User sent an image
        console.log(`${functionName}: User sent image "${imageFile.name}" with caption: "${userProvidedText}"`);

        const optimisticBlobUrl = URL.createObjectURL(imageFile);
        groupUiHandler.appendMessageToGroupLog(
            userProvidedText, currentUser.displayName || "You", true, currentUser.uid,
            { messageId: optimisticAppMessageId, timestamp: optimisticTimestamp, imageUrl: optimisticBlobUrl, type: 'image' }
        );

        let resolvedImgurUrl: string | null = null;
        try {
            resolvedImgurUrl = await uploadImageToImgur(imageFile);
            if (resolvedImgurUrl) console.log(`[GM_Imgur] User's image uploaded: ${resolvedImgurUrl}`);
            else console.warn(`[GM_Imgur] User's image Imgur upload returned null.`);
        } catch (err) {
            console.error(`[GM_Imgur] Imgur upload failed for user's image:`, err);
            // Optionally update UI for optimistic message: groupUiHandler.updateMessageStatus?.(...);
        }

        userMessageFirestoreId = await groupDataManager.addMessageToGroup(
            currentGroupData.id, currentUser.uid, userProvidedText, 'image',
            {
                appMessageId: optimisticAppMessageId,
                timestamp: new Date(optimisticTimestamp),
                senderName: currentUser.displayName || "User",
                imageUrl: resolvedImgurUrl // Save Imgur URL
                // No semantic description for user's own image message here; AI will provide it
            }
        );

        // Prepare options for GIL
        gilOptionsForAi.userSentImage = true;
        try {
            gilOptionsForAi.imageBase64Data = await polyglotHelpers.fileToBase64(imageFile);
            gilOptionsForAi.imageMimeType = imageFile.type;
        } catch (e) {
            console.error(`${functionName}: Failed to convert user image to base64 for GIL.`, e);
        }

    } else if (userProvidedText) { // User sent a text message
        groupUiHandler.appendMessageToGroupLog(
            userProvidedText, currentUser.displayName || "You", true, currentUser.uid,
            { messageId: optimisticAppMessageId, timestamp: optimisticTimestamp, type: 'text' }
        );

        userMessageFirestoreId = await groupDataManager.addMessageToGroup(
            currentGroupData.id, currentUser.uid, userProvidedText, 'text',
            {
                appMessageId: optimisticAppMessageId,
                timestamp: new Date(optimisticTimestamp),
                senderName: currentUser.displayName || "User"
            }
        );
        // gilOptionsForAi remains empty for text message
    } else {
        console.log(`${functionName}: No text or image provided by user.`);
        return; // Nothing to process
    }

    if (!userMessageFirestoreId) {
        console.error(`${functionName}: Failed to save user's message to Firestore. Aborting AI response.`);
        return;
    }
    console.log(`${functionName}: User message saved. FirestoreID: ${userMessageFirestoreId}, AppID: ${optimisticAppMessageId}`);

    // Trigger Group Interaction Logic
    const aiResponsePayload = await groupInteractionLogic.handleUserMessage(
        userProvidedText, // User's text (caption if image, or actual text message)
        gilOptionsForAi
    );

    // Save AI responses
    if (aiResponsePayload && aiResponsePayload.aiMessagesToPersist && aiResponsePayload.aiMessagesToPersist.length > 0) {
        console.log(`${functionName}: GIL generated ${aiResponsePayload.aiMessagesToPersist.length} AI messages. Saving...`);
        for (const aiMsg of aiResponsePayload.aiMessagesToPersist) {
            await groupDataManager.addMessageToFirestoreGroupChat(
                currentGroupData.id,
                { // Adapt to the structure expected by addMessageToFirestoreGroupChat
                    appMessageId: aiMsg.messageId,
                    senderId: aiMsg.speakerId,
                    senderName: aiMsg.speakerName,
                    text: aiMsg.text,
                    type: aiMsg.type, // 'text' or 'image' (for AI comment on user image)
                    imageSemanticDescription: aiMsg.imageSemanticDescription, // Will be undefined for pure text
                    // No content_url or imageUrl if AI is just sending text
                }
            );
        }
        console.log(`${functionName}: Saved ${aiResponsePayload.aiMessagesToPersist.length} AI messages.`);
    }
    // GIL's playScene handles optimistic UI for AI messages.
}
       
        const isCurrentlyJoined = (groupId: string): boolean => {
            return !!getDeps().groupDataManager?.isGroupJoined(groupId);
        };


        const getAllGroupDataWithLastActivity = (): ActiveGroupListItem[] => {
            return getDeps().groupDataManager?.getAllGroupDataWithLastActivity() || [];
        };
    
          // =======================================================================

          console.log("group_manager.ts: IIFE for actual methods FINISHED.");
          return {
              initialize, loadAvailableGroups, joinGroup, leaveCurrentGroup,
              handleUserMessageInGroup, userIsTyping: userIsTypingInGroupSignal, // Ensure userIsTypingInGroupSignal is defined
              getCurrentGroupData, getAllGroupDataWithLastActivity,
              isGroupJoined: isCurrentlyJoined, getFullCurrentGroupMembers,
              getMembersForGroup
          }; // This brace closes the 'return' object
   }   )();
    if (window.groupManager) {
        Object.assign(window.groupManager, methods);
        console.log("group_manager.ts: SUCCESSFULLY populated window.groupManager with real methods.");
    } else {
        console.error("group_manager.ts: CRITICAL ERROR - window.groupManager placeholder was unexpectedly missing. Assigning methods anyway.");
        window.groupManager = methods;
    }
    document.dispatchEvent(new CustomEvent('groupManagerReady'));
    console.log('group_manager.ts: "groupManagerReady" event dispatched (after init attempt).');

} // This brace closes the `initializeActualGroupManager` function.
console.log("group_manager.ts: Script execution finished. Initialization is event-driven or direct.");

// ... (rest of dependency checking logic for group_manager.ts) ...
function checkAndInitGroupManager(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`GROUP_MANAGER_EVENT: Listener for '${receivedEventName}' was triggered.`);
        
        let eventDependencyVerified = false;
        switch(receivedEventName) {
            case 'domElementsReady': 
                eventDependencyVerified = !!window.domElements; 
                break;
            case 'tabManagerReady': 
                eventDependencyVerified = !!(window.tabManager && typeof window.tabManager.switchToTab === 'function'); 
                break;
            case 'chatOrchestratorReady': 
                eventDependencyVerified = !!(window.chatOrchestrator && typeof window.chatOrchestrator.initialize === 'function'); 
                if(eventDependencyVerified) console.log("GROUP_MANAGER_DEPS: chatOrchestratorReady VERIFIED!");
                break;
            case 'polyglotHelpersReady': 
                eventDependencyVerified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function'); 
                break;
            case 'chatUiManagerPlaceholderReady': 
                eventDependencyVerified = !!window.chatUiManager; 
                break;
            case 'groupDataManagerReady': 
                eventDependencyVerified = !!(window.groupDataManager && typeof window.groupDataManager.initialize === 'function'); 
                if(eventDependencyVerified) console.log("GROUP_MANAGER_DEPS: groupDataManagerReady VERIFIED!");
                break;
            case 'groupUiHandlerReady': 
                eventDependencyVerified = !!window.groupUiHandler; 
                if(eventDependencyVerified) console.log("GROUP_MANAGER_DEPS: groupUiHandlerReady (placeholder check from event) VERIFIED!");
                break;
            case 'groupInteractionLogicReady': 
                eventDependencyVerified = !!window.groupInteractionLogic; 
                if(eventDependencyVerified) console.log("GROUP_MANAGER_DEPS: groupInteractionLogicReady (placeholder check from event) VERIFIED!");
                break;
            case 'polyglotDataReady': 
                eventDependencyVerified = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)); 
                break;
            default: 
                console.warn(`GROUP_MANAGER_EVENT: Unknown event '${receivedEventName}'`); 
                return;
        }

        if (eventDependencyVerified) {
            if (!groupManagerMetDependenciesLog[receivedEventName]) {
                groupManagerMetDependenciesLog[receivedEventName] = true;
                groupManagerDepsMetCount++;
                console.log(`GROUP_MANAGER_DEPS: Event '${receivedEventName}' processed. Verified: ${eventDependencyVerified}. Count: ${groupManagerDepsMetCount}/${dependenciesForGroupManager.length}`);
            }
        } else {
            console.warn(`GROUP_MANAGER_EVENT: Event '${receivedEventName}' FAILED verification.`);
        }
    }
    console.log(`GROUP_MANAGER_DEPS: Met status:`, JSON.stringify(groupManagerMetDependenciesLog));
    if (groupManagerDepsMetCount === dependenciesForGroupManager.length) {
        console.log('group_manager.ts: All dependencies (based on event receipt type) met. Calling initializeActualGroupManager.');
        initializeActualGroupManager(); 
    }
}
console.log('GROUP_MANAGER_SETUP: Starting initial dependency pre-check.');
groupManagerDepsMetCount = 0;
Object.keys(groupManagerMetDependenciesLog).forEach(key => groupManagerMetDependenciesLog[key] = false);
let groupManagerAllPreloadedAndVerified = true;
dependenciesForGroupManager.forEach(eventName => {
    let isReadyNow = false;
    let isVerifiedNow = false;

    switch (eventName) {
        case 'domElementsReady': 
            isReadyNow = !!window.domElements; 
            isVerifiedNow = isReadyNow; 
            break;
        case 'tabManagerReady': 
            isReadyNow = !!window.tabManager; 
            isVerifiedNow = !!(isReadyNow && typeof window.tabManager?.switchToTab === 'function'); 
            break;
        case 'chatOrchestratorReady': 
            isReadyNow = !!window.chatOrchestrator; 
            isVerifiedNow = !!(isReadyNow && typeof window.chatOrchestrator?.initialize === 'function'); 
            break;
        case 'polyglotHelpersReady': 
            isReadyNow = !!window.polyglotHelpers; 
            isVerifiedNow = !!(isReadyNow && typeof window.polyglotHelpers?.sanitizeTextForDisplay === 'function'); 
            break;
        case 'chatUiManagerPlaceholderReady': 
            isReadyNow = !!window.chatUiManager; 
            isVerifiedNow = isReadyNow; 
            break;
        case 'groupDataManagerReady': 
            isReadyNow = !!window.groupDataManager; 
            isVerifiedNow = !!(isReadyNow && typeof window.groupDataManager?.initialize === 'function'); 
            break;
            case 'groupUiHandlerReady': 
            isReadyNow = !!window.groupUiHandler; 
            isVerifiedNow = isReadyNow; 
            break;
        case 'groupInteractionLogicReady': 
            isReadyNow = !!window.groupInteractionLogic; 
            isVerifiedNow = isReadyNow; 
            break;
        case 'polyglotDataReady': 
            isReadyNow = !!window.polyglotConnectors; 
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotConnectors)); 
            break;
        default: 
            console.warn(`GROUP_MANAGER_PRECHECK: Unknown dependency event name: ${eventName}`);
            isVerifiedNow = false; 
    }

    console.log(`GROUP_MANAGER_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);

    if (isVerifiedNow) {
        console.log(`group_manager.ts: Pre-check: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!groupManagerMetDependenciesLog[eventName]) { 
            groupManagerMetDependenciesLog[eventName] = true;
            groupManagerDepsMetCount++;
        }
    } else {
        groupManagerAllPreloadedAndVerified = false;
        const specificEventNameToListenFor = eventName; 
        console.log(`group_manager.ts: Pre-check: Dependency '${specificEventNameToListenFor}' not ready or verified. Adding listener for '${specificEventNameToListenFor}'.`);
        document.addEventListener(specificEventNameToListenFor, function anEventListener() { 
            checkAndInitGroupManager(specificEventNameToListenFor);
        }, { once: true });
    }
});
console.log(`GROUP_MANAGER_SETUP: Initial pre-check dep count: ${groupManagerDepsMetCount} / ${dependenciesForGroupManager.length}. Met:`, JSON.stringify(groupManagerMetDependenciesLog));
if (groupManagerAllPreloadedAndVerified && groupManagerDepsMetCount === dependenciesForGroupManager.length) {
    console.log('group_manager.ts: All dependencies ALREADY MET AND VERIFIED during pre-check. Initializing directly.');
    initializeActualGroupManager();
} else if (groupManagerDepsMetCount > 0 && groupManagerDepsMetCount < dependenciesForGroupManager.length && !groupManagerAllPreloadedAndVerified) {
    console.log(`group_manager.ts: Some dependencies pre-verified, waiting for remaining events (${dependenciesForGroupManager.length - groupManagerDepsMetCount}).`);
} else if (groupManagerDepsMetCount === 0 && !groupManagerAllPreloadedAndVerified) {
    console.log(`group_manager.ts: No dependencies pre-verified. Waiting for all ${dependenciesForGroupManager.length} events.`);
} else if (groupManagerDepsMetCount === dependenciesForGroupManager.length && !groupManagerAllPreloadedAndVerified) {
    console.log('group_manager.ts: All dependencies met by events during pre-check iteration.');
} else if (dependenciesForGroupManager.length === 0) {
    console.log('group_manager.ts: No dependencies listed. Initializing directly.');
    initializeActualGroupManager();
}
console.log("group_manager.ts: Script execution finished. Initialization is event-driven or direct.");