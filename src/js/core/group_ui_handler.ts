// D:\polyglot_connect\src\js\core\group_ui_handler.ts

import type {
    YourDomElements,
    UiUpdater,
    ChatUiManager,
    ListRenderer,
    GroupDataManager,
    Connector,
    Group,
    GroupChatHistoryItem,
    
    ChatMessageOptions // <<< ADD THIS LINE
} from '../types/global.d.ts';

console.log('group_ui_handler.ts: Script loaded, waiting for core dependencies.');
interface GroupUiHandlerModule {
    initialize: () => void;
    displayAvailableGroups: (groupsToDisplay: Group[], joinGroupCallback: (groupOrId: string | Group) => void) => void;
    showGroupChatView: (groupData: Group, groupMembers: Connector[], groupHistory: GroupChatHistoryItem[]) => void;
    hideGroupChatViewAndShowList: () => void;
    updateGroupTypingIndicator: (text: string) => HTMLElement | null;
    clearGroupInput: () => void;
    appendMessageToGroupLog: (text: string, senderName: string, isUser: boolean, speakerId: string, options?: ChatMessageOptions) => void;
    clearGroupChatLog: () => void;
    openGroupMembersModal: () => void;
    openGroupInfoModal: (group: Group) => void; // ===== ADD THIS LINE =====
    
}
// This type should match the non-null return of getSafeDeps if all checks pass
// Add the missing line to the interface
interface VerifiedGroupUiHandlerDeps {
    domElements: YourDomElements;
    uiUpdater: UiUpdater;
    chatUiManager: ChatUiManager;
    listRenderer: ListRenderer;
    groupDataManager: GroupDataManager;
    modalHandler: import('../types/global.d.ts').ModalHandler;
    polyglotHelpers: import('../types/global.d.ts').PolyglotHelpersOnWindow;
    polyglotConnectors: Connector[]; // <<< ADD THIS LINE
}
function initializeActualGroupUiHandler(): void {
    console.log('group_ui_handler.ts: initializeActualGroupUiHandler() called.');

    const getSafeDeps = (): VerifiedGroupUiHandlerDeps | null => {
        const deps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater,
            chatUiManager: window.chatUiManager,
            listRenderer: window.listRenderer,
            modalHandler: window.modalHandler,             // <<< ADD
            polyglotHelpers: window.polyglotHelpers ,       // <<< ADD
            groupDataManager: window.groupDataManager,
            polyglotConnectors: window.polyglotConnectors
        };
        const missingDeps: string[] = [];
        if (!deps.domElements) missingDeps.push("domElements");
        if (!deps.uiUpdater || typeof deps.uiUpdater.appendToGroupChatLog !== 'function') missingDeps.push("uiUpdater (or its key methods)");
        if (!deps.chatUiManager) missingDeps.push("chatUiManager (placeholder)");
        if (!deps.listRenderer || typeof deps.listRenderer.renderGroupMembersList !== 'function') missingDeps.push("listRenderer (or its renderGroupMembersList method)"); // <<< UPDATE CHECK
        if (!deps.groupDataManager || typeof deps.groupDataManager.getAllGroupDefinitions !== 'function') missingDeps.push("groupDataManager (or its key methods)");
        if (!deps.modalHandler || typeof deps.modalHandler.open !== 'function') missingDeps.push("modalHandler (or its open method)"); // <<< ADD CHECK
        if (!deps.polyglotHelpers || typeof deps.polyglotHelpers.sanitizeTextForDisplay !== 'function') missingDeps.push("polyglotHelpers (or its sanitizeTextForDisplay method)"); // <<< ADD CHECK
        if (!deps.polyglotConnectors || !Array.isArray(deps.polyglotConnectors)) missingDeps.push("polyglotConnectors"); // <<< ADD THIS LINE
    
        if (missingDeps.length > 0) {
            console.error(`GroupUiHandler: getSafeDeps - MISSING/INVALID: ${missingDeps.join(', ')}.`);
            return null;
        }
        return deps as VerifiedGroupUiHandlerDeps;
    };

    const resolvedDeps = getSafeDeps(); // Type is VerifiedGroupUiHandlerDeps | null

    if (!resolvedDeps) { // This check ensures resolvedDeps is not null if we proceed
        console.error("group_ui_handler.ts: CRITICAL - Core functional dependencies not ready. Halting GroupUiHandler setup.");
        window.groupUiHandler = { 
            initialize: () => console.error("GUH not init"),
            displayAvailableGroups: () => console.error("GUH not init"),
            showGroupChatView: () => console.error("GUH not init"),
            hideGroupChatViewAndShowList: () => console.error("GUH not init"),
            updateGroupTypingIndicator: () => { console.error("GUH not init"); return null; },
            clearGroupInput: () => console.error("GUH not init"),
            appendMessageToGroupLog: () => console.error("GUH not init"),
            clearGroupChatLog: () => console.error("GUH not init"),
            openGroupMembersModal: () => console.error("GUH not init (members modal)"),
            openGroupInfoModal: () => console.error("GUH not init (info modal)") // ===== ADD THIS LINE =====
        } as GroupUiHandlerModule;
        document.dispatchEvent(new CustomEvent('groupUiHandlerReady'));
        console.warn('group_ui_handler.ts: "groupUiHandlerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('group_ui_handler.ts: Core functional dependencies appear ready.');

    // Because of the `if (!resolvedDeps)` check above, TypeScript knows `resolvedDeps` is VerifiedGroupUiHandlerDeps here.
    // So, `resolvedDeps!` at destructuring might not be strictly necessary but doesn't hurt.
    window.groupUiHandler = ((): GroupUiHandlerModule => {
        'use strict';
        
        // resolvedDeps is non-null here due to the check before this IIFE.
        // TypeScript should infer that domElements, uiUpdater etc. are also non-null
        // if VerifiedGroupUiHandlerDeps defines them as non-optional.
        const { 
            domElements, 
            uiUpdater, 
            chatUiManager, 
            listRenderer, 
            groupDataManager,
            modalHandler,      // <<< ADD
            polyglotHelpers  ,  // <<< ADD
            polyglotConnectors // <<< ADD THIS LINE
        } = resolvedDeps!; // Using '!' because of the preceding null check for resolvedDeps


        function openGroupMembersModalInternal(): void {
          // Ensure listRenderer is here
            const currentPersonaModalManager = window.personaModalManager; // For clicking members
        
            if (!domElements?.groupMembersModal || !modalHandler || !groupDataManager || !listRenderer || !polyglotHelpers || !currentPersonaModalManager) {
                console.error("GUH.openGroupMembersModal: Missing critical dependencies.");
                return;
            }
        
            const groupData = groupDataManager.getCurrentGroupData();
            const groupMembers = window.groupManager?.getFullCurrentGroupMembers?.() || []; // Assuming groupManager provides this
        
            if (!groupData) {
                console.error("GUH.openGroupMembersModal: No active group data found.");
                return;
            }
        
            // 1. Populate Modal Header
            if (domElements.gmmGroupName) domElements.gmmGroupName.textContent = polyglotHelpers.sanitizeTextForDisplay(groupData.name);
            if (domElements.gmmGroupDescription) domElements.gmmGroupDescription.textContent = polyglotHelpers.sanitizeTextForDisplay(groupData.description);
            if (domElements.gmmMemberCount) domElements.gmmMemberCount.textContent = String(groupMembers.length);
        
            const effectiveBaseUrl_guh_gmm = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
            const safeBaseUrl_guh_gmm = effectiveBaseUrl_guh_gmm.endsWith('/') ? effectiveBaseUrl_guh_gmm : effectiveBaseUrl_guh_gmm + '/';
            const placeholderGroupAvatarSrc_guh_gmm = `${safeBaseUrl_guh_gmm}images/placeholder_group_avatar.png`;
            let groupPhotoSrc = placeholderGroupAvatarSrc_guh_gmm;
            if (groupData.groupPhotoUrl) {
                let photoPath = groupData.groupPhotoUrl;
                if (photoPath.startsWith('/')) photoPath = photoPath.substring(1);
                else if (!photoPath.startsWith('images/')) photoPath = `images/groups/${photoPath}`;
                groupPhotoSrc = `${safeBaseUrl_guh_gmm}${photoPath}`;
            }
            if (domElements.gmmGroupPhoto) {
                domElements.gmmGroupPhoto.src = groupPhotoSrc;
                domElements.gmmGroupPhoto.onerror = () => {
                    if(domElements.gmmGroupPhoto) domElements.gmmGroupPhoto.src = placeholderGroupAvatarSrc_guh_gmm;
                };
            }
        
            // 2. Define member click handler
            const handleMemberClick = (connector: Connector) => {
                console.log("GUH: Clicked group member in modal:", connector.profileName);
                modalHandler.close(domElements.groupMembersModal); // Close this modal
                currentPersonaModalManager.openDetailedPersonaModal(connector); // Open persona modal
            };
        
            // 3. Render Member List (initial render)
            listRenderer.renderGroupMembersList(groupMembers, groupData.tutorId, handleMemberClick, domElements.gmmMembersListUl);
        
            // 4. Setup Search (Optional)
            if (domElements.gmmMemberSearchInput && domElements.gmmMembersListUl && listRenderer?.renderGroupMembersList && polyglotHelpers?.debounce) { // Add more checks for robustness
                domElements.gmmMemberSearchInput.value = ''; // Clear previous search
                
                const debouncedSearchHandler = polyglotHelpers.debounce(() => {
                    const searchTerm = (domElements.gmmMemberSearchInput as HTMLInputElement).value;
                    console.log(`GUH.openGroupMembersModal: Live search triggered. Term: "${searchTerm}"`); // Debug log
                    listRenderer.renderGroupMembersList(
                        groupMembers, 
                        groupData.tutorId, 
                        handleMemberClick, // handleMemberClick is defined above in this function
                        domElements.gmmMembersListUl, 
                        searchTerm
                    );
                }, 300); // 300ms debounce delay
    
                // Remove previous listener if any to avoid duplicates if modal is reopened
                // (This is tricky with anonymous debounced functions. A more robust way is to store and remove the exact debounced function if needed,
                // but for now, let's assume the modal elements are fresh or this function is called on a fresh modal open)
                domElements.gmmMemberSearchInput.removeEventListener('input', (domElements.gmmMemberSearchInput as any)._debouncedSearchHandler); // Attempt to remove old if stored
    
                (domElements.gmmMemberSearchInput as any)._debouncedSearchHandler = debouncedSearchHandler; // Store for potential removal
                domElements.gmmMemberSearchInput.addEventListener('input', debouncedSearchHandler);
                console.log("GUH.openGroupMembersModal: Live search input listener attached.");
            } else {
                if (!domElements.gmmMemberSearchInput) console.warn("GUH.openGroupMembersModal: Search input field not found.");
                // Add more specific warnings if other parts are missing
            }
        
            // 5. Open Modal
            modalHandler.open(domElements.groupMembersModal);
        }

      // =================== START: REPLACEMENT ===================
function initialize(): void {
    console.log("GUH.initialize: GroupUiHandler.ts: Initializing event listeners...");

    // Get dependencies needed for the listeners
    const { domElements, modalHandler, groupDataManager } = resolvedDeps!;
    
    // --- Listener 1: For the Group Discovery Page (the cards) ---
    // This listener is on the main list container.
    if (domElements.availableGroupsUl) {
        domElements.availableGroupsUl.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const infoButton = target.closest('.group-card-info-btn');

            if (infoButton) {
                event.stopPropagation(); // Prevent other clicks
                const groupId = infoButton.getAttribute('data-group-id');
                if (groupId) {
                    console.log(`GUH: Group card 'Info' button clicked for group ID: ${groupId}`);
                    const groupData = groupDataManager.getGroupDefinitionById(groupId);
                    if (groupData) {
                        // This correctly calls the function to show the info/join modal
                        openGroupInfoModal(groupData);
                    }
                }
            }
            // Note: The 'Join' and 'View Chat' button listeners are attached dynamically
            // in list_renderer.ts, so we don't handle them here. This is correct.
        });
        console.log("GUH: Delegated listener for group card 'Info' buttons attached.");
    }

    // --- Listener 2: For the Active Group Chat Header ---
    // This listener is specifically on the header trigger element.
    if (domElements.groupHeaderInfoTrigger) {
        domElements.groupHeaderInfoTrigger.addEventListener('click', (event) => {
            console.log("GUH: Group chat header area clicked.");
            // This correctly calls the function to show the list of members
            openGroupMembersModalInternal();
        });
        console.log("GUH: Listener for active group chat header attached.");
    }

    // --- Listener 3: For the Close Button on the Members Modal ---
    if (domElements.closeGroupMembersModalBtn && domElements.groupMembersModal) {
        domElements.closeGroupMembersModalBtn.addEventListener('click', () => {
            modalHandler.close(domElements.groupMembersModal);
        });
        
        // Also close when clicking the overlay
        domElements.groupMembersModal.addEventListener('click', (event) => {
            if (event.target === domElements.groupMembersModal) {
                modalHandler.close(domElements.groupMembersModal);
            }
        });
        console.log("GUH: Listeners for closing the group members modal attached.");
    }
}
// ===================  END: REPLACEMENT  ===================

             // =================== START: REPLACE THE ENTIRE FUNCTION WITH THIS ===================
           // =================== START: REPLACE THE ENTIRE FUNCTION WITH THIS ===================
function openGroupInfoModal(group: Group): void {
    const { domElements, modalHandler, groupDataManager, listRenderer, polyglotHelpers } = resolvedDeps!;
    const groupManager = window.groupManager;

    if (!group || !domElements?.groupMembersModal || !modalHandler || !groupDataManager || !groupManager || !listRenderer || !polyglotHelpers) {
        console.error("GUH.openGroupInfoModal: Missing critical dependencies or group data.");
        return;
    }

    const isJoined = groupDataManager.isGroupJoined(group.id);

    // --- STATE MANAGEMENT ---
    // Add or remove the class that controls visibility based on join status
    domElements.groupMembersModal.classList.toggle('state-joined', isJoined);

    // 1. Populate Modal Header (No changes here)
    if (domElements.gmmGroupName) domElements.gmmGroupName.textContent = polyglotHelpers.sanitizeTextForDisplay(group.name);
    if (domElements.gmmGroupDescription) domElements.gmmGroupDescription.textContent = polyglotHelpers.sanitizeTextForDisplay(group.description);
    
    const effectiveBaseUrl_guh_gmm = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
    const safeBaseUrl_guh_gmm = effectiveBaseUrl_guh_gmm.endsWith('/') ? effectiveBaseUrl_guh_gmm : effectiveBaseUrl_guh_gmm + '/';
    const placeholderGroupAvatarSrc_guh_gmm = `${safeBaseUrl_guh_gmm}images/placeholder_group_avatar.png`;
    let groupPhotoSrc = placeholderGroupAvatarSrc_guh_gmm;
    if (group.groupPhotoUrl) {
        let photoPath = group.groupPhotoUrl;
        if (photoPath.startsWith('/')) photoPath = photoPath.substring(1);
        else if (!photoPath.startsWith('images/')) photoPath = `images/groups/${photoPath}`;
        groupPhotoSrc = `${safeBaseUrl_guh_gmm}${photoPath}`;
    }
    if (domElements.gmmGroupPhoto) {
        domElements.gmmGroupPhoto.src = groupPhotoSrc;
        domElements.gmmGroupPhoto.onerror = () => { if(domElements.gmmGroupPhoto) domElements.gmmGroupPhoto.src = placeholderGroupAvatarSrc_guh_gmm; };
    }

    // 2. Populate Members List (only if joined)
    if (isJoined && domElements.gmmMembersListUl) {
        const members = groupManager.getMembersForGroup(group);
        if (domElements.gmmMemberCount) domElements.gmmMemberCount.textContent = String(members.length);
        listRenderer.renderGroupMembersList(members, group.tutorId, (connector: Connector) => {
             modalHandler.close(domElements.groupMembersModal);
             window.personaModalManager?.openDetailedPersonaModal(connector);
        }, domElements.gmmMembersListUl);
    }

    // 3. Configure CTA Button Listener (No changes here, it was correct)
    const currentCtaBtnInDom = document.getElementById('gmm-cta-btn') as HTMLButtonElement | null;
    if (currentCtaBtnInDom) {
        currentCtaBtnInDom.textContent = isJoined ? 'View Chat' : 'Join Group';
        
        const newBtn = currentCtaBtnInDom.cloneNode(true) as HTMLButtonElement;

        newBtn.addEventListener('click', () => {
            console.log(`INFO MODAL CTA CLICKED! Action: ${isJoined ? 'View Chat' : 'Join Group'}. Group ID: ${group.id}`);
            groupManager.joinGroup(group);
            modalHandler.close(domElements.groupMembersModal);
        });

        currentCtaBtnInDom.parentNode?.replaceChild(newBtn, currentCtaBtnInDom);
        domElements.gmmCtaBtn = newBtn;
    } else {
        console.error("GUH: Could not find #gmm-cta-btn in the DOM to attach listener.");
    }

    // 4. Open Modal
    modalHandler.open(domElements.groupMembersModal);
}
// ===================  END: REPLACE THE ENTIRE FUNCTION WITH THIS  ===================





function displayAvailableGroups(
    groupsToDisplay: Group[], // The function now receives the final list
    joinGroupCallback: (groupOrId: string | Group) => void
): void {
    console.log(`GUH_DEBUG: displayAvailableGroups called with ${groupsToDisplay.length} pre-filtered groups.`);
    // const augmentedGroups = groupDataManager.getAllGroupDefinitions(...); // REMOVE THIS LINE
    
    if (!domElements.availableGroupsUl) {
        console.error("GUH_DEBUG: domElements.availableGroupsUl is NULL!");
        return;
    }
    console.log("GUH_DEBUG: domElements.availableGroupsUl found:", domElements.availableGroupsUl);
    
   // The render call now uses the passed-in array directly
   listRenderer.renderAvailableGroupsList(groupsToDisplay, joinGroupCallback);
}
// Inside the IIFE in group_ui_handler.ts
// =================== START: REPLACE THE ENTIRE FUNCTION ===================

function showGroupChatView(
    groupData: Group,
    groupMembers: Connector[],
    groupHistory: GroupChatHistoryItem[]
): void {
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.error(`GUH.showGroupChatView CALLED. Group: ${groupData?.id}, History Length: ${groupHistory?.length}. Stack:`, new Error().stack);
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    if (!groupData?.name || !groupMembers) {
        console.error("GroupUiHandler: Missing groupData.name or groupMembers for showGroupChatView.");
        return;
    }

    // --- FIX 1: Fetch dependencies just-in-time to avoid stale data ---
    const currentChatUiManager = window.chatUiManager as ChatUiManager | undefined;
    const currentUiUpdater = window.uiUpdater as UiUpdater | undefined;
    const domElements = window.domElements; // Also fetch domElements fresh

    if (!currentChatUiManager || typeof currentChatUiManager.showGroupChatView !== 'function') {
        console.error("GUH.showGroupChatView: Functional chatUiManager or its showGroupChatView method not available at runtime!");
        return;
    }

    // --- AGGRESSIVE UI RESET ---
    // Update the header FIRST to set the new context before clearing the log.
    currentChatUiManager.showGroupChatView(groupData.name, groupMembers);
    domElements.groupsView?.classList.add('in-chat-mode'); // <<< ADD THIS LINE
    console.log(`GUH.showGroupChatView: Clearing and re-rendering chat log for group ${groupData.id}. History length: ${groupHistory?.length || 0}`);
    
    // Clear the log completely.
    if (currentUiUpdater && typeof currentUiUpdater.clearGroupChatLog === 'function') {
        currentUiUpdater.clearGroupChatLog();
    } else if (domElements?.groupChatLogDiv) {
        (domElements.groupChatLogDiv as HTMLElement).innerHTML = '';
        console.warn("GUH.showGroupChatView: uiUpdater.clearGroupChatLog not available, used direct innerHTML clear.");
    }
    // --- END OF RESET ---

    if (groupHistory?.length > 0) {
        const MAX_MESSAGES_IN_UI = 100;
        const historyToRender = groupHistory.slice(-MAX_MESSAGES_IN_UI);

        let lastUserVoiceMemoText: string | null = null;
        let lastUserVoiceMemoTimestamp: number | null = null;

        historyToRender.forEach((msg: GroupChatHistoryItem) => {
            // --- FIX 2: Determine the speaker based ONLY on the data from this specific message ---
            const isCurrentUserMessage = msg.speakerId === "user_player" || msg.speakerId === "user_self_001";
            
            // This ensures we don't accidentally use a stale speaker from a previous session.
            const speakerConnector = groupMembers.find(m => m.id === msg.speakerId);
            const senderName = isCurrentUserMessage
                ? "You"
                : (speakerConnector?.profileName || msg.speakerName || "Bot");

            // --- Your existing logic for skipping duplicate voice memos ---
            if (
                isCurrentUserMessage &&
                !msg.isVoiceMemo &&
                !msg.isImageMessage &&
                lastUserVoiceMemoText &&
                msg.text === lastUserVoiceMemoText &&
                lastUserVoiceMemoTimestamp &&
                Math.abs(msg.timestamp - lastUserVoiceMemoTimestamp) < 2000
            ) {
                console.log(`GUH.showGroupChatView (History): Skipping duplicate plain text message...`);
                lastUserVoiceMemoText = null;
                lastUserVoiceMemoTimestamp = null;
                return; 
            }

            // --- Your existing logic for preparing message options ---
            if (currentUiUpdater && typeof currentUiUpdater.appendToGroupChatLog === 'function') {
                let textForDisplay = msg.text || "";
                const messageOptions: ChatMessageOptions = {
                    timestamp: msg.timestamp,
                    messageId: msg.messageId,
                };
                if (msg.isVoiceMemo && msg.audioBlobDataUrl) {
                    messageOptions.isVoiceMemo = true;
                    messageOptions.audioSrc = msg.audioBlobDataUrl;
                    lastUserVoiceMemoText = (msg.speakerId === "user_self_001") ? msg.text : null;
                    lastUserVoiceMemoTimestamp = (msg.speakerId === "user_self_001") ? msg.timestamp : null;
                } else if (msg.isImageMessage) {
                    if (msg.imageUrl) {
                        messageOptions.imageUrl = msg.imageUrl;
                    } else {
                        textForDisplay += "\n[Image was not reloaded to save space]";
                    }
                    lastUserVoiceMemoText = null;
                    lastUserVoiceMemoTimestamp = null;
                } else {
                    lastUserVoiceMemoText = null;
                    lastUserVoiceMemoTimestamp = null;
                }
                
                // --- FIX 3: Pass the explicit speakerId from the message to the renderer ---
                // This is the most critical part. We are telling the UI updater exactly who
                // spoke this specific message, preventing it from using any stale state.
                currentUiUpdater.appendToGroupChatLog(
                    textForDisplay,
                    senderName,
                    isCurrentUserMessage,
                    msg.speakerId, // <<< The ground truth for this message
                    messageOptions
                );
            } else {
                console.warn("GUH.showGroupChatView: Functional uiUpdater.appendToGroupChatLog not available for historical message.");
            }
        });
    }
    
    if (domElements?.groupChatInput) (domElements.groupChatInput as HTMLInputElement).focus();
}

// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================

      // Inside the IIFE in group_ui_handler.ts
// <<< REPLACE THE ENTIRE hideGroupChatViewAndShowList FUNCTION >>>
const hideGroupChatViewAndShowList = (): void => {
    // --- NEW: JUST-IN-TIME DEPENDENCY FETCH ---
    const currentChatUiManager = window.chatUiManager as ChatUiManager | undefined;
    if (!currentChatUiManager || typeof currentChatUiManager.hideGroupChatView !== 'function') {
        console.error("GUH.hideGroupChatViewAndShowList: Functional chatUiManager or its hideGroupChatView method not available at runtime!");
        return;
    }
    domElements.groupsView?.classList.remove('in-chat-mode'); // <<< ADD THIS LINE
    currentChatUiManager.hideGroupChatView();
};
// PASTE THIS NEW VERSION
// PASTE THIS NEW VERSION
// PASTE THIS NEW VERSION
// =================== START: REPLACE WITH THIS BLOCK (in group_ui_handler.ts) ===================
// =================== START: REPLACE WITH THIS FUNCTION (in group_ui_handler.ts) ===================
// =================== START: REPLACE WITH THIS FUNCTION (in group_ui_handler.ts) ===================
// Replace the old function with this new one.

function updateGroupTypingIndicator(text: string): HTMLElement | null {
    const { domElements, uiUpdater, polyglotConnectors } = resolvedDeps!;

    if (!domElements?.groupChatLogDiv || !uiUpdater || !polyglotConnectors) {
        console.error("GUH.updateTyping: Missing critical dependencies for bubble indicator.");
        return null;
    }

    const logElement = domElements.groupChatLogDiv;

    // First, find and remove any old typing bubble
    const existingIndicator = logElement.querySelector('.is-typing-indicator-bubble');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    const trimmedText = text ? String(text).trim() : "";

    // If new text is provided, create a new bubble
    if (trimmedText) {
        const nameMatch = trimmedText.match(/^(.*?)\s+is typing/);
        const speakerName = nameMatch ? nameMatch[1] : null;
        let speakerId = 'unknown_speaker';

        // Find the speaker's ID to get the correct avatar
        if (speakerName) {
            const speakerConnector = polyglotConnectors.find((c: Connector) => c.profileName === speakerName);
            if (speakerConnector) speakerId = speakerConnector.id;
        }
        
        // Use the main appendToGroupChatLog function to create a "thinking" bubble
        const newIndicatorBubble = uiUpdater.appendToGroupChatLog(
            "", // No text, just the thinking animation
            speakerName || "",
            false, // isUser
            speakerId,
            { isThinking: true } // This option creates the "..." animation
        );

        // Add a special class so we can find and remove it easily next time
        if (newIndicatorBubble) {
            newIndicatorBubble.classList.add('is-typing-indicator-bubble');
            return newIndicatorBubble;
        }
    }
    
    return null; // Return null if no bubble was created
}
// ===================  END: REPLACE WITH THIS FUNCTION (in group_ui_handler.ts)  ===================
// ===================  END: REPLACE WITH THIS FUNCTION (in group_ui_handler.ts)  ===================

        function clearGroupInput(): void {
            if (domElements.groupChatInput) (domElements.groupChatInput as HTMLInputElement).value = '';
        }

       // group_ui_handler.ts -> initializeActualGroupUiHandler -> IIFE
// Example for a method using uiUpdater:
function appendMessageToGroupLog(text: string, senderName: string, isUser: boolean, speakerId: string,
    options: ChatMessageOptions = {} // <<< THIS IS THE KEY ADDITION


): void {
    const currentUiUpdater = window.uiUpdater as UiUpdater | undefined;
    const currentGroupDataManager = window.groupDataManager as GroupDataManager | undefined;

    if (isUser && speakerId === "user_player" && currentGroupDataManager) {
        const groupHistory = currentGroupDataManager.getLoadedChatHistory?.();
        if (groupHistory && groupHistory.length > 0) {
            const lastUserVoiceMemo = groupHistory
                .slice() // Create a copy to reverse without modifying original
                .reverse()
                .find(msg =>
                    msg.speakerId === "user_self_001" && // VM uses user_self_001
                    msg.isVoiceMemo &&
                    msg.text === text // Compare transcript text
                );

            if (lastUserVoiceMemo) {
                // Check if this voice memo was very recent (e.g., within last 2 seconds)
                // This helps ensure we're linking to the voice memo just processed by voice_memo_handler
                const timeDifferenceMs = Date.now() - lastUserVoiceMemo.timestamp;
                if (timeDifferenceMs < 2000) { // 2 seconds threshold
                    console.log(`GUH.appendMessageToGroupLog: User text message ("${text.substring(0,20)}...") matches a recent voice memo transcript. Skipping duplicate UI append.`);
                    return; // Skip appending this plain text version
                }
            }
        }
    }

  
    if (currentUiUpdater && typeof currentUiUpdater.appendToGroupChatLog === 'function') {
        // Ensure the base options are passed through correctly
        const finalOptions: ChatMessageOptions = {
            ...options, // This carries the imageUrl, messageId, etc.
            timestamp: options.timestamp || Date.now(),
            speakerId: speakerId
        };

        console.log(`GUH.appendMessageToGroupLog: Passing to uiUpdater. Text: "${text.substring(0,30)}...", Sender: ${senderName}, speakerId: ${speakerId}`);
        currentUiUpdater.appendToGroupChatLog(text, senderName, isUser, speakerId, finalOptions);
    } else {
        console.error("GUH.appendMessageToGroupLog: Functional uiUpdater or appendToGroupChatLog method not available at runtime.");
    }
}

        function clearGroupChatLog(): void {
            if (domElements.groupChatLogDiv) (domElements.groupChatLogDiv as HTMLElement).innerHTML = '';
        }

        console.log("core/group_ui_handler.ts: IIFE finished.");
        return {
            initialize,
            displayAvailableGroups,
            showGroupChatView,
            hideGroupChatViewAndShowList,
            updateGroupTypingIndicator,
            clearGroupInput,
            appendMessageToGroupLog,
            clearGroupChatLog,
            openGroupMembersModal: openGroupMembersModalInternal,
            openGroupInfoModal // ===== ADD THIS LINE =====
        };
    })();

    if (window.groupUiHandler && typeof window.groupUiHandler.initialize === 'function') {
        console.log("group_ui_handler.ts: SUCCESSFULLY assigned to window.groupUiHandler. Calling its initialize method now.");
        window.groupUiHandler.initialize(); // <<< ADD THIS CALL
    } else {
        console.error("group_ui_handler.ts: CRITICAL ERROR - assignment FAILED or method missing, cannot call initialize.");
    }

    document.dispatchEvent(new CustomEvent('groupUiHandlerReady'));
    console.log('group_ui_handler.ts: "groupUiHandlerReady" event dispatched.');

} // End of initializeActualGroupUiHandler

// --- Event listening logic & Initialization ---
const dependenciesForGUH = [
    'domElementsReady', 
    'uiUpdaterPlaceholderReady', // <<< CHANGED FROM uiUpdaterReady
    'chatUiManagerPlaceholderReady', 
    'listRendererReady', 
    'groupDataManagerReady'
];
const guhMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGUH.forEach(dep => guhMetDependenciesLog[dep] = false);
let guhDepsMet = 0;
function checkAndInitGUH(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`GUH_EVENT: Listener for '${receivedEventName}' was triggered.`);
        if (!guhMetDependenciesLog[receivedEventName]) {
            let eventDependencyVerified = false;
            switch (receivedEventName) {
                case 'domElementsReady': eventDependencyVerified = !!window.domElements; break;
                case 'uiUpdaterPlaceholderReady': // <<< CHANGED
                    eventDependencyVerified = !!window.uiUpdater; // Just check for placeholder existence
                    // We can't check for functional methods here, as it might not be fully ready
                    break;
                case 'chatUiManagerPlaceholderReady': eventDependencyVerified = !!window.chatUiManager; break;
                case 'listRendererReady': eventDependencyVerified = !!(window.listRenderer && typeof window.listRenderer?.renderAvailableGroupsList === 'function'); break;
                case 'groupDataManagerReady': eventDependencyVerified = !!(window.groupDataManager && typeof window.groupDataManager?.getAllGroupDefinitions === 'function'); break;
                default: console.warn(`GUH_EVENT: Unknown event '${receivedEventName}'`); return;
            }

            if (eventDependencyVerified) {
                guhMetDependenciesLog[receivedEventName] = true;
                guhDepsMet++;
                console.log(`GUH_DEPS: Event '${receivedEventName}' processed. Placeholder/Functional Verified: ${eventDependencyVerified}. Count: ${guhDepsMet}/${dependenciesForGUH.length}`);
            } else {
                 console.warn(`GUH_DEPS: Event '${receivedEventName}' received but verification FAILED.`);
            }
        }
    }
    console.log(`GUH_DEPS: Met status:`, JSON.stringify(guhMetDependenciesLog));

    if (guhDepsMet === dependenciesForGUH.length) {
        console.log('group_ui_handler.ts: All dependencies met. Calling initializeActualGroupUiHandler directly.');
        initializeActualGroupUiHandler(); 
    }
}

// --- Initial Pre-Check and Listener Setup ---
console.log('GUH_SETUP: Starting initial dependency pre-check for GroupUiHandler.');
guhDepsMet = 0;
Object.keys(guhMetDependenciesLog).forEach(key => guhMetDependenciesLog[key] = false);
let guhAllPreloadedAndVerified = true;

dependenciesForGUH.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false; 

    switch (eventName) {
        case 'domElementsReady': isReadyNow = !!window.domElements; isVerifiedNow = isReadyNow; break;
        case 'uiUpdaterPlaceholderReady': // <<< CHANGED
            isReadyNow = !!window.uiUpdater; 
            isVerifiedNow = isReadyNow; // Check for placeholder existence
            break;
        case 'chatUiManagerPlaceholderReady': isReadyNow = !!window.chatUiManager; isVerifiedNow = isReadyNow; break;
        case 'listRendererReady': isReadyNow = !!window.listRenderer; isVerifiedNow = !!(isReadyNow && typeof window.listRenderer?.renderAvailableGroupsList === 'function'); break;
        case 'groupDataManagerReady': isReadyNow = !!window.groupDataManager; isVerifiedNow = !!(isReadyNow && typeof window.groupDataManager?.getAllGroupDefinitions === 'function'); break;
        default: console.warn(`GUH_PRECHECK: Unknown dependency: ${eventName}`); break;
    }

    console.log(`GUH_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if (!guhMetDependenciesLog[eventName]) {
            guhMetDependenciesLog[eventName] = true;
            guhDepsMet++;
        }
    } else {
        guhAllPreloadedAndVerified = false;
        console.log(`GUH_PRECHECK: Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, function anEventListener() {
            checkAndInitGUH(eventName);
        }, { once: true });
    }
});

console.log(`GUH_SETUP: Pre-check done. Met: ${guhDepsMet}/${dependenciesForGUH.length}`, JSON.stringify(guhMetDependenciesLog));

if (guhAllPreloadedAndVerified && guhDepsMet === dependenciesForGUH.length) {
    console.log('group_ui_handler.ts: All dependencies ALREADY MET AND VERIFIED. Initializing directly.');
    initializeActualGroupUiHandler(); 
} else if (guhDepsMet > 0 && guhDepsMet < dependenciesForGUH.length) {
    console.log(`group_ui_handler.ts: Some dependencies pre-verified, waiting for remaining events.`);
} else if (guhDepsMet === 0 && !guhAllPreloadedAndVerified) {
    console.log(`group_ui_handler.ts: No dependencies pre-verified. Waiting for all events.`);
}

console.log("core/group_ui_handler.ts: Script execution finished. Initialization is event-driven or direct.");