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
            messageId?: string;    // From chat_event_listeners
            timestamp?: number;    // From chat_event_listeners
        }
    ) => void;
    userIsTyping: () => void;
    getCurrentGroupData: () => Group | null | undefined;
    getAllGroupDataWithLastActivity: () => ActiveGroupListItem[];
    isGroupJoined: (groupId: string) => boolean;
    getFullCurrentGroupMembers: () => Connector[];
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

        function loadAvailableGroups(
            languageFilter: string | null = null,
            categoryFilter: string | null = null,
            nameSearch: string | null = null // Ensure this is the third parameter
        ): void {
            // Corrected log to include all parameters
            console.log("group_manager.ts: loadAvailableGroups() - START. Language:", languageFilter, "Category:", categoryFilter, "Name:", nameSearch);

            // The call to groupUiHandler.displayAvailableGroups needs to pass all these,
            // AND the joinGroup callback as the FOURTH argument.
            getDeps().groupUiHandler?.displayAvailableGroups(
                languageFilter,
                categoryFilter,
                nameSearch, // This is the name search string (or null)
                joinGroup   // This is the callback function
            );
            console.log("group_manager.ts: loadAvailableGroups() - FINISHED.");
        }

      function joinGroup(groupOrGroupId: string | Group): void {
            console.log("GROUP_MANAGER: joinGroup CALLED with:", typeof groupOrGroupId === 'string' ? groupOrGroupId : groupOrGroupId.id);
            const { groupDataManager, groupUiHandler, groupInteractionLogic, tabManager, chatOrchestrator, polyglotConnectors, polyglotHelpers } = getDeps();

            if (!groupUiHandler || !groupDataManager || !groupInteractionLogic || !tabManager || !chatOrchestrator || !polyglotConnectors || !polyglotHelpers) {
                console.error("GroupManager: joinGroup - One or more critical dependencies missing!");
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
                console.log(`GroupManager: Was in group '${currentActiveGroupId}', leaving silently before joining '${groupId}'.`);
                leaveCurrentGroup(false, false);
            }

            console.log(`GroupManager Facade: Proceeding with full join/activation for group "${groupDef.name}" (ID: ${groupId})`);
            groupDataManager.setCurrentGroupContext(groupId, groupDef);

            // 1. Select the Host/Tutor
            currentGroupTutorObject = polyglotConnectors.find(c => c.id === groupDef.tutorId);
            if (!currentGroupTutorObject) {
                console.error(`GroupManager: CRITICAL - Host/Tutor persona with ID '${groupDef.tutorId}' not found in window.polyglotConnectors for group '${groupDef.name}'. Cannot proceed.`);
                alert(`Error: Host for group "${groupDef.name}" (ID: ${groupDef.tutorId}) is missing from available personas. Please check configuration.`);
                groupDataManager.setCurrentGroupContext(null, null);
                resetGroupState();
                return;
            }
            console.log(`GroupManager: Host for group '${groupDef.name}' is '${currentGroupTutorObject.profileName}' (ID: ${currentGroupTutorObject.id})`);
            currentGroupMembersArray = [currentGroupTutorObject]; // Host is always the first member

            // 2. Select Additional Members based on Criteria or Fallback
            let potentialAdditionalMembers = [...polyglotConnectors].filter(p => p.id !== currentGroupTutorObject!.id); // Exclude host

            const criteria = groupDef.memberSelectionCriteria;
            const groupLanguage = groupDef.language;

            if (criteria) {
                console.log(`GroupManager: Applying member selection criteria for group '${groupDef.name}':`, JSON.parse(JSON.stringify(criteria)));

                const targetLang = criteria.language || groupLanguage;
                if (targetLang) {
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.language === targetLang ||
                        p.nativeLanguages?.some(nl => nl.lang === targetLang) ||
                        p.practiceLanguages?.some(pl => pl.lang === targetLang) ||
                        (p.languageRoles && Object.keys(p.languageRoles).includes(targetLang))
                    );
                    // console.log(`GM Criteria: After language filter ('${targetLang}'): ${potentialAdditionalMembers.length} potential.`);
                }

                if (criteria.role && targetLang) {
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.languageRoles?.[targetLang]?.includes(criteria.role!)
                    );
                    // console.log(`GM Criteria: After role ('${criteria.role}') in '${targetLang}': ${potentialAdditionalMembers.length} potential.`);
                } else if (criteria.role && !criteria.language) { // Role across any language
                     potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        Object.values(p.languageRoles || {}).some(rolesArray => rolesArray.includes(criteria.role!))
                    );
                    // console.log(`GM Criteria: After general role ('${criteria.role}'): ${potentialAdditionalMembers.length} potential.`);
                }

                if (criteria.country) {
                    const allowedCountries = (Array.isArray(criteria.country) ? criteria.country : [criteria.country]).map(c => c.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.country && allowedCountries.includes(p.country.toLowerCase())
                    );
                    // console.log(`GM Criteria: After country filter: ${potentialAdditionalMembers.length} potential.`);
                }

                if (criteria.city) {
                    const allowedCities = (Array.isArray(criteria.city) ? criteria.city : [criteria.city]).map(c => c.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.city && allowedCities.includes(p.city.toLowerCase())
                    );
                    // console.log(`GM Criteria: After city filter: ${potentialAdditionalMembers.length} potential.`);
                }

                if (criteria.interestsInclude) {
                    const requiredInterests = (Array.isArray(criteria.interestsInclude) ? criteria.interestsInclude : [criteria.interestsInclude]).map(i => i.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        p.interests?.some(interest => requiredInterests.includes(interest.toLowerCase()))
                    );
                    // console.log(`GM Criteria: After interestsInclude filter: ${potentialAdditionalMembers.length} potential.`);
                }

                if (criteria.interestsAll && criteria.interestsAll.length > 0) {
                    const requiredInterests = criteria.interestsAll.map(i => i.toLowerCase());
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                        requiredInterests.every(reqInterest =>
                            p.interests?.some(pInterest => pInterest.toLowerCase() === reqInterest)
                        )
                    );
                    // console.log(`GM Criteria: After interestsAll filter: ${potentialAdditionalMembers.length} potential.`);
                }

                if (criteria.excludeIds && criteria.excludeIds.length > 0) {
                    potentialAdditionalMembers = potentialAdditionalMembers.filter(p => !criteria.excludeIds?.includes(p.id));
                    // console.log(`GM Criteria: After excludeIds filter: ${potentialAdditionalMembers.length} potential.`);
                }
            } else {
                // Fallback logic if no memberSelectionCriteria is defined
                console.warn(`GroupManager: No memberSelectionCriteria for group '${groupDef.name}'. Falling back to selecting 'learner' role for group language '${groupLanguage}'.`);
                potentialAdditionalMembers = potentialAdditionalMembers.filter(p =>
                    p.languageRoles?.[groupLanguage]?.includes("learner") &&
                    !p.languageRoles?.[groupLanguage]?.includes("tutor")
                );
            }

            const shuffledAdditionalMembers = potentialAdditionalMembers.sort(() => 0.5 - Math.random());
            const neededAdditionalCount = Math.max(0, groupDef.maxLearners || 0);
            const selectedAdditionalMembers = shuffledAdditionalMembers.slice(0, neededAdditionalCount);

            currentGroupMembersArray.push(...selectedAdditionalMembers);

            console.log(`GroupManager: For group '${groupDef.name}', Host: '${currentGroupTutorObject.profileName}'. Added ${selectedAdditionalMembers.length} additional members. Total AI members: ${currentGroupMembersArray.length}.`);
            if (selectedAdditionalMembers.length < neededAdditionalCount) {
                console.warn(`GroupManager: Could only find ${selectedAdditionalMembers.length} additional members matching criteria/fallback for group '${groupDef.name}' (needed ${neededAdditionalCount}). Potential pool size was ${potentialAdditionalMembers.length}.`);
            }

            const loadedHistory = groupDataManager.getLoadedChatHistory();
            console.log(`GroupManager: Loaded history for group '${groupId}': ${loadedHistory.length} messages.`);

            if (groupUiHandler.showGroupChatView && groupDef.name && currentGroupMembersArray.length > 0) {
                groupUiHandler.showGroupChatView(groupDef, currentGroupMembersArray, loadedHistory);
            } else {
                console.error("GroupManager: Cannot show group chat view (handler missing or invalid data). Name:", groupDef.name, "Members:", currentGroupMembersArray.length);
                resetGroupState();
                groupDataManager.setCurrentGroupContext(null, null);
                return;
            }

            tabManager.switchToTab('groups');
            (window.shellController as any)?.switchView?.('groups');
            chatOrchestrator?.renderCombinedActiveChatsList?.();

            if (groupInteractionLogic?.initialize && groupInteractionLogic?.startConversationFlow && currentGroupTutorObject) {
                groupInteractionLogic.initialize(currentGroupMembersArray, currentGroupTutorObject);
                if (loadedHistory.length === 0) {
                    sendWelcomeMessagesToGroup(groupDef, currentGroupTutorObject, currentGroupMembersArray);
                }
                groupInteractionLogic.startConversationFlow();
            } else {
                console.error("GroupManager: groupInteractionLogic not fully available or host (currentGroupTutorObject) missing for interaction flow.");
            }
            console.log(`group_manager.ts: joinGroup() - FINISHED full join/activation for group: ${groupId}`);
        } // End of joinGroup

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

        function userIsTypingInGroupSignal(): void {
            const { groupInteractionLogic } = getDeps();
            isUserTypingInGroup = true;
            groupInteractionLogic?.setUserTypingStatus(true);
            clearTimeout(userTypingTimeoutId!); 
            userTypingTimeoutId = setTimeout(() => {
                isUserTypingInGroup = false;
                groupInteractionLogic?.setUserTypingStatus(false);
            }, 2500);
        }

        function leaveCurrentGroup(triggerReload: boolean = true, updateSidebar: boolean = true): void {
            const { groupInteractionLogic, groupUiHandler, groupDataManager, tabManager, chatOrchestrator } = getDeps(); 
            
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
            groupInteractionLogic.reset?.();

            const currentTab = tabManager.getCurrentActiveTab?.();
            const currentChatOrchestrator = window.chatOrchestrator as ChatOrchestrator | undefined; // Re-fetch for safety

            if (updateSidebar) {
                const shellCtrl = window.shellController as import('../types/global.d.ts').ShellController | undefined;
                if (shellCtrl?.switchView) {
                    const tabToRefresh = currentTab || 'home'; // Default to home if currentTab is undefined
                    console.log(`GM: Left group. Calling shellController.switchView('${tabToRefresh}') to update sidebar.`);
                    shellCtrl.switchView(tabToRefresh);
                    // If switchView doesn't automatically refresh chat list for 'groups' or 'messages' tab when appropriate,
                    // we might need an explicit call here, but ideally switchView handles it.
                    if ((tabToRefresh === 'groups' || tabToRefresh === 'messages') && currentChatOrchestrator?.renderCombinedActiveChatsList) {
                         console.log("GM: Forcing renderCombinedActiveChatsList after leaving group for data consistency.");
                        currentChatOrchestrator.renderCombinedActiveChatsList();
                    }
                } else {
                    console.warn("GM: updateSidebar is true, but shellController.switchView not available. Sidebar may not update correctly. Forcing chat list render.");
                    currentChatOrchestrator?.renderCombinedActiveChatsList?.();
                }
            } else { 
                // Even if not updating the sidebar panel itself, the underlying data for combined chats needs to be fresh.
                if (currentChatOrchestrator?.renderCombinedActiveChatsList) {
                    console.log("GM: Left group (updateSidebar=false). Calling renderCombinedActiveChatsList for data consistency.");
                    currentChatOrchestrator.renderCombinedActiveChatsList();
                }
            }
            
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
        uiUpdater
    } = getDeps();

    const currentGroup = groupDataManager.getCurrentGroupData();
    const { imageFile, captionText } = options || {};
    const text = textFromInput?.trim() || "";

    if (!currentGroup || (!text && !imageFile)) {
        console.log(`${functionName}: No group active, or no text/image to send.`);
        return;
    }

    const historyItem: GroupChatHistoryItem = {
        speakerId: "user_player",
        speakerName: "You",
        text: imageFile ? (captionText || "") : text,
        timestamp: options?.timestamp || Date.now(),
        messageId: options?.messageId || polyglotHelpers.generateUUID(),
    };

    let base64DataForAI: string | undefined = undefined;
    let mimeTypeForAI: string | undefined = undefined;

    if (imageFile) {
        console.log(`${functionName}: Processing group image "${imageFile.name}".`);
        try {
            // Convert file to a persistent data: URL for storage.
            const fullDataUrl = await polyglotHelpers.fileToBase64(imageFile);
            historyItem.isImageMessage = true;
            historyItem.imageUrl = fullDataUrl; // Store the persistent data URL in the history object

            // --- TRIGGER UI APPEND FOR IMAGE HERE ---
            uiUpdater.appendToGroupChatLog(
                historyItem.text || "", // <<< FIX IS HERE
                "You",
                true, // isUser
                "user_player",
                {
                    imageUrl: historyItem.imageUrl, // Use the persistent URL
                    messageId: historyItem.messageId,
                    timestamp: historyItem.timestamp
                }
            );

            // Prepare data for the AI
            const parts = fullDataUrl.split(',');
            const mimeTypePart = parts[0].match(/:(.*?);/);
            mimeTypeForAI = mimeTypePart ? mimeTypePart[1] : imageFile.type;
            base64DataForAI = parts[1];

        } catch (error) {
            console.error(`${functionName}: Error processing image:`, error);
            uiUpdater.appendToGroupChatLog("Error processing image.", "System", false, "system_error");
            return;
        }
    } else {
         // --- TRIGGER UI APPEND FOR TEXT ---
         uiUpdater.appendToGroupChatLog(
            historyItem.text || "", // <<< FIX IS HERE
            "You", 
            true, // isUser
            "user_player", 
            {
                messageId: historyItem.messageId,
                timestamp: historyItem.timestamp
            }
        );
    }

    // Add the fully prepared item (with the persistent URL if it's an image) to the history.
    groupDataManager.addMessageToCurrentGroupHistory(historyItem);
    groupDataManager.saveCurrentGroupChatHistory(true);

    // Trigger AI Response (with the indicator fix from before).
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
            isGroupJoined: isCurrentlyJoined, getFullCurrentGroupMembers
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