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
    UiUpdater
} from '../types/global.d.ts';

console.log('group_manager.ts: Script loaded, waiting for core dependencies.');

window.groupManager = {} as GroupManagerModule;
console.log('group_manager.ts: Structural placeholder for window.groupManager assigned.');

interface GroupManagerModule {
    initialize: () => void;
    loadAvailableGroups: (languageFilter?: string | null, categoryFilter?: string | null, nameSearch?: string | null) => void;
    joinGroup: (groupOrGroupId: string | Group) => void;
    leaveCurrentGroup: (triggerReload?: boolean, updateSidebar?: boolean) => void;
    handleUserMessageInGroup: ( 
        textFromInput?: string, 
        options?: {
            skipUiAppend?: boolean;
            imageFile?: File | null;
            captionText?: string | null;
            messageId?: string;
            timestamp?: number;
        }
    ) => void;
    userIsTyping: () => void;
    getCurrentGroupData: () => Group | null | undefined;
    getAllGroupDataWithLastActivity: () => ActiveGroupListItem[];
    isGroupJoined: (groupId: string) => boolean;
    getFullCurrentGroupMembers: () => Connector[];
    getMembersForGroup: (groupDef: Group) => Connector[]; // ===== ADD THIS LINE =====
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
        return; 
    }
    console.log('group_manager.ts: All finalChecks passed. Proceeding to assign methods for `groupManagerReady` dispatch.');
    
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
            uiUpdater: window.uiUpdater as UiUpdater // <<< ADD THIS LINE
        });

        let currentGroupTutorObject: Connector | null | undefined = null;
        let currentGroupMembersArray: Connector[] = [];
        let isUserTypingInGroup: boolean = false;
        let userTypingTimeoutId: ReturnType<typeof setTimeout> | null = null;

        function initialize(): void {
            console.log("group_manager.ts: initialize() - START (FULL).");
            const { groupDataManager, groupUiHandler } = getDeps(); // Fetch fresh deps
            groupDataManager?.initialize?.();
            groupUiHandler?.initialize?.();
            console.log("GroupManager (Facade): Initialized. Delegating to specialized managers.");
            console.log("group_manager.ts: initialize() - FINISHED (FULL).");
        }

        function getCurrentGroupData(): Group | null | undefined {
            return getDeps().groupDataManager?.getCurrentGroupData();
        }

        function getFullCurrentGroupMembers(): Connector[] {
            return [...currentGroupMembersArray]; 
        }

     // =================== REPLACE THE loadAvailableGroups FUNCTION IN group_manager.ts ===================
function loadAvailableGroups(
    languageFilter: string | null = null,
    categoryFilter: string | null = null,
    nameSearch: string | null = null,
    options: { viewType: 'my-groups' | 'discover' } = { viewType: 'my-groups' }
): void {
    console.log(`GM: loadAvailableGroups() - View: ${options.viewType}, Lang: ${languageFilter}, Cat: ${categoryFilter}, Name: ${nameSearch}`);
    const { groupUiHandler, groupDataManager, domElements } = getDeps(); // Add domElements

    if (!groupUiHandler || !groupDataManager || !domElements) {
        console.error("GM: Missing GUH, GDM, or domElements in loadAvailableGroups");
        return;
    }

    let allGroups = groupDataManager.getAllGroupDefinitions(languageFilter, categoryFilter, nameSearch);
    let groupsToDisplay: Group[];

    if (options.viewType === 'my-groups') {
        groupsToDisplay = allGroups.filter(g => g.isJoined);
    } else { 
        groupsToDisplay = allGroups.filter(g => !g.isJoined);
    }

    // Call the UI handler to render the list
    groupUiHandler.displayAvailableGroups(groupsToDisplay, joinGroup);
    
    // --- THIS IS THE NEW LOGIC ---
    // Now, update the empty placeholder message based on the results.
    const placeholderEl = domElements.groupsEmptyPlaceholder;
    if (placeholderEl) {
        const hasActiveFilters = !!languageFilter || !!categoryFilter || !!nameSearch;
        if (groupsToDisplay.length > 0) {
            placeholderEl.style.display = 'none';
        } else {
            placeholderEl.style.display = 'block'; // Or 'flex'
            if (hasActiveFilters) {
                placeholderEl.textContent = 'No groups match your current filters.';
            } else {
                // Show a different message depending on the tab
                if (options.viewType === 'my-groups') {
                    placeholderEl.textContent = 'You have not joined any groups yet. Find some in the Discover tab!';
                } else {
                    placeholderEl.textContent = 'No new groups to discover right now.';
                }
            }
        }
    }
    // --- END OF NEW LOGIC ---
    
    console.log(`GM: loadAvailableGroups() - Finished. Displaying ${groupsToDisplay.length} groups.`);
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








     // D:\polyglot_connect\src\js\core\group_manager.ts

     async function joinGroup(groupOrGroupId: string | Group): Promise<void> {
        console.log("GROUP_MANAGER: joinGroup CALLED with:", typeof groupOrGroupId === 'string' ? groupOrGroupId : groupOrGroupId.id);
        const { groupDataManager, groupUiHandler, groupInteractionLogic, tabManager, chatOrchestrator } = getDeps();
    
        if (!groupUiHandler || !groupDataManager || !groupInteractionLogic || !tabManager || !chatOrchestrator) {
            console.error("GroupManager: joinGroup - One or more critical dependencies missing!");
            alert("Cannot join group: core components missing.");
            return;
        }
    
        // <<< FIX: The logic is now in the correct order >>>
        // 1. Get the groupId first.
        const groupId = (typeof groupOrGroupId === 'object' && groupOrGroupId !== null) ? groupOrGroupId.id : groupOrGroupId;
        
        // 2. NOW declare groupDef using the groupId.
        const groupDef = groupDataManager.getGroupDefinitionById(groupId);
    
        // 3. NOW it is safe to check groupDef.
        if (!groupDef || !groupDef.name || !groupDef.language) {
            // I've also corrected the error message here to be more accurate.
            console.error(`GroupManager: Group definition (or its name/language) not found for ID: '${groupId}'`);
            alert(`Error: Could not find details for group ID ${groupId}.`);
            return;
        }

        const currentActiveGroupId = groupDataManager.getCurrentGroupId();
        const currentDomElements = window.domElements;
        const currentTab = tabManager.getCurrentActiveTab?.();
        const groupChatUIDisplayStyle = currentDomElements?.groupChatInterfaceDiv?.style.display;

        const isAlreadyActiveAndVisible = currentActiveGroupId === groupId &&
                                        groupChatUIDisplayStyle !== 'none' &&
                                        currentTab === 'groups';

        if (isAlreadyActiveAndVisible) {
            console.warn(`GroupManager: joinGroup called for ALREADY ACTIVE and VISIBLE group '${groupId}'. Ensuring UI consistency.`);
            tabManager.switchToTab('groups');
            (window.shellController as any)?.switchView?.('groups');
            if (window.uiUpdater?.updateGroupChatHeader && groupDef.name && currentGroupMembersArray.length > 0) {
                window.uiUpdater.updateGroupChatHeader(groupDef.name, currentGroupMembersArray);
            }
            return;
        }

        if (currentActiveGroupId && currentActiveGroupId !== groupId) {
            leaveCurrentGroup(false, false);
        }
    
        console.log(`GroupManager Facade: Proceeding with full join/activation for group "${groupDef.name}" (ID: ${groupId})`);
        
        groupDataManager.setCurrentGroupContext(groupId, groupDef);
        localStorage.setItem('polyglotLastActiveGroupId', groupId); // <<< ADD THIS LINE
        currentGroupMembersArray = getMembersForGroup(groupDef);
        if (currentGroupMembersArray.length === 0) {
            console.error(`GroupManager: Failed to get any members for group '${groupDef.name}'. Aborting join.`);
            return;
        }
        currentGroupTutorObject = currentGroupMembersArray.find(m => m.id === groupDef.tutorId);
    
        const loadedHistory = groupDataManager.getLoadedChatHistory();
        console.log(`GroupManager: Loaded history for group '${groupId}': ${loadedHistory.length} messages.`);
    
        if (groupInteractionLogic?.initialize && currentGroupTutorObject) {
            groupInteractionLogic.initialize(currentGroupMembersArray, currentGroupTutorObject);
            groupInteractionLogic.startConversationFlow(true); 
        } else {
            console.error("GroupManager: CRITICAL - groupInteractionLogic.initialize not available or host missing.");
            return;
        }
        
        if (groupUiHandler.showGroupChatView && groupDef.name && currentGroupMembersArray.length > 0) {
            groupUiHandler.showGroupChatView(groupDef, currentGroupMembersArray, loadedHistory);
        } else {
            console.error("GroupManager: Cannot show group chat view.");
            resetGroupState();
            groupDataManager.setCurrentGroupContext(null, null);
            return;
        }

        tabManager.switchToTab('groups');
        
        // --- THIS IS THE FIX ---
        // Because we are now IN a group, we must EXPLICITLY tell the sidebar
        // to re-evaluate its state for the 'groups' tab.
        const sidebarPanelManager = window.sidebarPanelManager;
        if (sidebarPanelManager) {
            console.log("[GroupManager] Forcing sidebar panel update after joining group.");
            sidebarPanelManager.updatePanelForCurrentTab('groups');
        }
        // --- END OF FIX ---
        
        // Update the list of active chats
        chatOrchestrator?.renderCombinedActiveChatsList?.();
        // --- THIS IS THE CRITICAL FIX ---
        // We now AWAIT the conversation flow to start and finish its first run.

// --- END OF NEW, CORRECT ORDER ---

console.log(`group_manager.ts: joinGroup() - FINISHED full join/activation for group: ${groupId}`);
} 

        function sendWelcomeMessagesToGroup(groupDef: Group, tutor: Connector, members: Connector[]): void {
            console.log("GM: sendWelcomeMessagesToGroup() - START for group:", groupDef?.name);
            const { groupUiHandler, groupDataManager, groupInteractionLogic } = getDeps(); 

            if (!groupDef || !tutor || !groupUiHandler?.appendMessageToGroupLog || !groupDataManager?.addMessageToCurrentGroupHistory) {
                console.error("GM.sendWelcomeMessagesToGroup: Missing critical parameters or dependencies (groupDef, tutor, GUH.append, GDM.addMsg).");
                return;
            }

            // Tutor sends the initial welcome and prompts the user.
            const welcomePromptForUser = `Welcome to "${groupDef.name}"! I'm ${tutor.profileName || 'your host for this session'}, and we'll be chatting in ${groupDef.language}. Our general topic is: ${groupDef.tags?.[0] || 'conversation practice'}. To get us started, could you introduce yourself and let us know what you'd like to talk about or practice today?`;
            groupUiHandler.appendMessageToGroupLog(welcomePromptForUser, tutor.profileName!, false, tutor.id);
            groupDataManager.addMessageToCurrentGroupHistory({ 
                speakerId: tutor.id, 
                text: welcomePromptForUser, 
                timestamp: Date.now(), 
                speakerName: tutor.profileName 
            });
            
            // Crucially, save history *after* tutor's first message so it's persisted.
            groupDataManager.saveCurrentGroupChatHistory(true); // Update sidebar immediately

            // Set a flag in GroupInteractionLogic to indicate it's awaiting the user's first intro.
            // The actual AI learner introductions will be triggered by GIL after the user speaks.
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

        function leaveCurrentGroup(triggerReload: boolean = true, updateSidebar: boolean = true): void {
            const { groupInteractionLogic, groupUiHandler, groupDataManager, tabManager, chatOrchestrator } = getDeps(); 
            groupInteractionLogic.stopConversationFlow?.();
            // --- GM.DEBUG.LEAVE.1 ---
            const currentGroupIdBeforeLeaving = groupDataManager?.getCurrentGroupId?.(); 
            console.error(`GM.leaveCurrentGroup: CALLED. Current Group ID (from GDM before GDM.setCurrentContext(null) is called by this func): '${currentGroupIdBeforeLeaving}'. TriggerReload: ${triggerReload}, UpdateSidebar: ${updateSidebar}. Stack:`, new Error().stack);
            // --- END GM.DEBUG.LEAVE.1 ---

            console.log("group_manager.ts: leaveCurrentGroup() - START. TriggerReload:", triggerReload, "UpdateSidebar:", updateSidebar);

            if (!groupInteractionLogic || !groupUiHandler || !groupDataManager || !tabManager || !chatOrchestrator) {
                console.error("GroupManager: leaveCurrentGroup - One or more critical dependencies missing!");
                return;
            }

            groupInteractionLogic.stopConversationFlow?.();
            
            if (groupDataManager.getCurrentGroupId()) { // Check if there was an active group
                console.log("GroupManager Facade: Performing final save for group:", groupDataManager.getCurrentGroupId());
                groupDataManager.saveCurrentGroupChatHistory(false); 
            }

            groupUiHandler.hideGroupChatViewAndShowList?.();
            resetGroupState(); 
            groupDataManager.setCurrentGroupContext(null, null); // This sets GDM's current group to null
            localStorage.removeItem('polyglotLastActiveGroupId'); // <<< ADD THIS LINE
           
            groupInteractionLogic.reset?.();

            const currentTab = tabManager.getCurrentActiveTab?.();
            const currentChatOrchestrator = window.chatOrchestrator as ChatOrchestrator | undefined; // Re-fetch for safety

          // =================== REPLACE THE DELETED BLOCK WITH THIS ===================
            // After leaving a group, we always want to be on the 'groups' tab.
            // By calling the tabManager, we trigger the master coordinator in shell_controller,
            // which will handle BOTH the view switch and the sidebar panel update correctly.
        
         
            if (tabManager) {
                tabManager.switchToTab('groups');
            }
            
            // --- THIS IS THE FIX ---
            // Because we have just LEFT a group, we must EXPLICITLY tell the sidebar
            // to re-evaluate its state for the 'groups' tab.
            const sidebarPanelManager = window.sidebarPanelManager;
            if (sidebarPanelManager) {
                console.log("[GroupManager] Forcing sidebar panel update after leaving group.");
                sidebarPanelManager.updatePanelForCurrentTab('groups');
            }
            // --- END OF FIX ---

            // The list of groups to display might have changed (e.g., if it was the last joined group)
            if (tabManager?.getCurrentActiveTab?.() === 'groups') {
                loadAvailableGroups();
            }

            // Update the list of active chats
            chatOrchestrator?.renderCombinedActiveChatsList?.();
// ============================================================================
            
            if (triggerReload && currentTab === 'groups') {
                console.log("GroupManager: Reloading available groups list as current tab was 'groups'.");
                loadAvailableGroups();
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
    options?: {
        skipUiAppend?: boolean;
        imageFile?: File | null;
        captionText?: string | null;
        messageId?: string;
        timestamp?: number;
    }
): Promise<void> {
    const functionName = "GroupManager.handleUserMessageInGroup";
    const {
        groupDataManager,
        groupInteractionLogic,
        polyglotHelpers,
        groupUiHandler
    } = getDeps();

    const currentGroup = groupDataManager.getCurrentGroupData();
    const { imageFile, captionText } = options || {};
    const text = textFromInput?.trim() || "";

    if (!currentGroup || (!text && !imageFile)) {
        console.log(`${functionName}: No group active, or no text/image to send.`);
        groupInteractionLogic.startConversationFlow();
        return;
    }

    const historyItem: GroupChatHistoryItem = {
        speakerId: "user_player",
        speakerName: "You",
        text: imageFile ? (captionText || text) : text,
        timestamp: options?.timestamp || Date.now(),
        messageId: options?.messageId || polyglotHelpers.generateUUID(),
    };

    let base64DataForAI: string | undefined = undefined;
    let mimeTypeForAI: string | undefined = undefined;

    if (imageFile) {
        console.log(`${functionName}: Processing group image "${imageFile.name}".`);
        try {
            const fullDataUrl = await polyglotHelpers.fileToBase64(imageFile);
            historyItem.isImageMessage = true;
            // --- THIS IS THE KEY FIX: We assign the data URL to historyItem.imageUrl ---
            historyItem.imageUrl = fullDataUrl;

            const parts = fullDataUrl.split(',');
            const mimeTypePart = parts[0].match(/:(.*?);/);
            mimeTypeForAI = mimeTypePart ? mimeTypePart[1] : imageFile.type;
            base64DataForAI = parts[1];

        } catch (error) {
            console.error(`${functionName}: Error processing image:`, error);
            groupUiHandler.appendMessageToGroupLog("Error processing image.", "System", false, "system_error");
            groupInteractionLogic.startConversationFlow();
            return;
        }
    }

    // Now, we append the user's message to the UI.
    // If it's an image, historyItem.imageUrl will have the data.
    groupUiHandler.appendMessageToGroupLog(
        historyItem.text || "",
        "You", 
        true, // isUser
        "user_player", 
        { imageUrl: historyItem.imageUrl, messageId: historyItem.messageId, timestamp: historyItem.timestamp }
    );
    
    // Add to data manager and save
    groupDataManager.addMessageToCurrentGroupHistory(historyItem);
    groupDataManager.saveCurrentGroupChatHistory(true);

    // Delegate to the interaction logic
    await groupInteractionLogic.handleUserMessage(
        historyItem.text || undefined,
        {
            userSentImage: !!imageFile,
            imageBase64Data: base64DataForAI,
            imageMimeType: mimeTypeForAI,
        }
    );
}
//...
        const isCurrentlyJoined = (groupId: string): boolean => {
            return !!getDeps().groupDataManager?.isGroupJoined(groupId);
        };

        const getAllGroupDataWithLastActivity = (): ActiveGroupListItem[] => {
            return getDeps().groupDataManager?.getAllGroupDataWithLastActivity() || [];
        };

        console.log("group_manager.ts: IIFE for actual methods FINISHED.");
        return {
            initialize, loadAvailableGroups, joinGroup, leaveCurrentGroup,
            handleUserMessageInGroup, userIsTyping: userIsTypingInGroupSignal,
            getCurrentGroupData, getAllGroupDataWithLastActivity,
            isGroupJoined: isCurrentlyJoined, getFullCurrentGroupMembers,
            getMembersForGroup
        };
    })(); 

    if (window.groupManager) {
        Object.assign(window.groupManager, methods);
        console.log("group_manager.ts: SUCCESSFULLY populated window.groupManager with real methods.");
    } else {
        console.error("group_manager.ts: CRITICAL ERROR - window.groupManager placeholder was unexpectedly missing. Assigning methods anyway.");
        window.groupManager = methods;
    }
    document.dispatchEvent(new CustomEvent('groupManagerReady'));
    console.log('group_manager.ts: "groupManagerReady" event dispatched (after init attempt).');

} 
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