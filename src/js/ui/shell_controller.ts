// D:\polyglot_connect\src\js\ui\shell_controller.ts

import type {
    YourDomElements,
    ModalHandler,
    CardRenderer,
    ListRenderer,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ActivityManager,
    UiUpdater,
    ChatOrchestrator,
    GroupManager,
    SessionManager,
    SharedContent,
    Connector, // For openDetailedPersonaModalInternal, etc.
    // Import other specific types if needed (e.g., Group, LanguageFilterItem from global.d.ts)
    LanguageFilterItem,
    RoleFilterItem
} from '../types/global.d.ts'; // Path from src/js/ui to src/js/types

console.log('shell_controller.ts: Script loaded, waiting for core dependencies.');
let initialAppShellViewInitialized = false;
interface ShellControllerModule {
  initializeAppShell: () => void;
  openDetailedPersonaModal: (connector: Connector) => void;
  switchView: (targetTab: string) => void;
  updateEmptyListMessages: () => void;
  showEmbeddedChat: (connector: Connector) => void;
  hideEmbeddedChat: () => void;
  showGroupChatInterface: (groupName: string, members: Connector[]) => void;
  hideGroupChatInterface: () => void;
}
let isSwitchingViewTo: string | null = null;
function initializeActualShellController(): void {
    console.log('shell_controller.ts: initializeActualShellController() called.');

    window.shellController = ((): ShellControllerModule => {
        'use strict';
        console.log("shell_controller.ts: IIFE STARTING");

        const getDeps = () => ({
            // Cast to ensure type safety within the module
            domElements: window.domElements as YourDomElements,
            modalHandler: window.modalHandler as ModalHandler,
            cardRenderer: window.cardRenderer as CardRenderer | undefined,
            listRenderer: window.listRenderer as ListRenderer | undefined,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers,
            activityManager: window.activityManager as ActivityManager | undefined,
            uiUpdater: window.uiUpdater as UiUpdater | undefined,
            chatManager: window.chatManager as ChatOrchestrator | undefined,
            groupManager: window.groupManager as GroupManager | undefined,
            sessionManager: window.sessionManager as SessionManager | undefined,
            polyglotSharedContent: window.polyglotSharedContent as SharedContent | undefined,
            chatOrchestrator: window.chatOrchestrator as ChatOrchestrator | undefined,
            sessionHistoryManager: window.sessionHistoryManager as import('../types/global').SessionHistoryManager | undefined,
            chatActiveTargetManager: window.chatActiveTargetManager as import('../types/global').ChatActiveTargetManager | undefined,
            sidebarPanelManager: window.sidebarPanelManager as import('../types/global').SidebarPanelManagerModule | undefined,
            filterController: window.filterController as import('../types/global').FilterController | undefined,
            personaModalManager: window.personaModalManager as import('../types/global').PersonaModalManager | undefined,
            conversationManager: window.conversationManager as import('../types/global').ConversationManager | undefined,
            groupDataManager: window.groupDataManager as import('../types/global').GroupDataManager | undefined 
      
        });
        let currentActiveTab = 'home'; // This was also in view_manager. Consider consolidating.

        function initializeAppShell(): void {
            const { domElements, polyglotHelpers } = getDeps();
            console.log("ShellController: initializeAppShell - START. domElements available:", !!domElements);

            if (!domElements?.appShell) {
                console.error("ShellController: initializeAppShell - App shell container (appShell) not found in domElements! Cannot proceed.");
                return;
            }

            if (initialAppShellViewInitialized) {
                console.warn("ShellController: initializeAppShell called again, but initial view setup already done. Skipping redundant setup.");
                return;
            }
            initialAppShellViewInitialized = true;
            console.log("ShellController: initializeAppShell - Performing initial setup for the first time.");

            const currentActiveTab = (polyglotHelpers!.loadFromLocalStorage('polyglotLastActiveTab') as string) || 'home';

            // This new function handles the initial view setup AND listens for all future changes.
            setupMasterViewCoordinator(currentActiveTab);

            console.log("ShellController: initializeAppShell - About to call other setup functions.");
          
            populateFilterDropdowns();
            setupShellEventListeners();
            initializeTheme();

            console.log("ui/shell_controller.ts: Shell Initialized and initializeAppShell COMPLETED.");
        }
        function setupShellEventListeners(): void {
            const { domElements, modalHandler, groupManager, chatManager, personaModalManager } = getDeps();

            if (!domElements || !modalHandler) {
                console.warn("ShellController: Missing domElements or modalHandler for event listeners.");
                return;
            }

            if (domElements.themeToggleButton) {
                domElements.themeToggleButton.addEventListener('click', toggleTheme);
            }


            if (domElements.closePersonaModalBtn) {
                domElements.closePersonaModalBtn.addEventListener('click', () => {
                    cleanupModalData();
                    modalHandler.close(domElements.detailedPersonaModal as HTMLElement);
                });
            }
            if (domElements.detailedPersonaModal) {
                domElements.detailedPersonaModal.addEventListener('click', (event: MouseEvent) => { // Typed event
                    if (event.target === domElements.detailedPersonaModal) {
                        cleanupModalData();
                        modalHandler.close(domElements.detailedPersonaModal as HTMLElement);
                    }
                });
            }

// =================== ADD THIS NEW, CORRECTED BLOCK ===================

        // NEW: Make chat header avatars clickable to open the persona modal.
  
        if (domElements.embeddedChatHeaderAvatar) {
            // Add the class that provides the pointer cursor and hover effect.
            domElements.embeddedChatHeaderAvatar.classList.add('clickable-chat-avatar');

            domElements.embeddedChatHeaderAvatar.addEventListener('click', () => {
                console.log("Embedded chat header AVATAR clicked.");
                const targetId = chatOrchestrator?.getCurrentEmbeddedChatTargetId?.();
                if (targetId) {
                    const connector = (window.polyglotConnectors || []).find(c => c.id === targetId);
                    if (connector) {
                        personaModalManager?.openDetailedPersonaModal(connector);
                    }
                }
            });
        }

        // 2. For the Message Modal Header Avatar
        if (domElements.messageModalHeaderAvatar) {
            // Add the class that provides the pointer cursor and hover effect.
            domElements.messageModalHeaderAvatar.classList.add('clickable-chat-avatar');
            
            domElements.messageModalHeaderAvatar.addEventListener('click', () => {
                console.log("Message modal header AVATAR clicked.");
                const connector = chatOrchestrator?.getCurrentModalMessageTarget?.();
                if (connector) {
                    personaModalManager?.openDetailedPersonaModal(connector);
                }
            });
        }

// =====================================================================
            // Add this inside setupShellEventListeners
   // AFTER
if (domElements.connectorHubGrid) {
    domElements.connectorHubGrid.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const button = target.closest('button');

        if (!button) return;

        const connectorId = button.dataset.connectorId;
        if (!connectorId) return;

        const connector = (window.polyglotConnectors || []).find(c => c.id === connectorId);
        if (!connector) {
            console.error(`ShellController: Connector with ID ${connectorId} not found.`);
            return;
        }

        // Handle "View Chat" button (NOW LOOKS FOR THE CORRECT CLASS)
        if (button.classList.contains('group-card-view-chat-btn')) {
            e.preventDefault();
            console.log(`View Chat clicked for ${connector.profileName}`);
            if (window.chatSessionHandler?.openConversationInEmbeddedView) {
                if (window.tabManager?.switchToTab) {
                    window.tabManager.switchToTab('messages');
                }
                window.chatSessionHandler.openConversationInEmbeddedView(connector);
            }
        }

        // Handle "View Info" and "View Profile" buttons (NOW LOOKS FOR THE CORRECT CLASSES)
        if (button.classList.contains('group-card-info-btn') || button.classList.contains('view-profile-btn')) {
            e.preventDefault();
            console.log(`View Info/Profile clicked for ${connector.profileName}`);
            if (window.personaModalManager?.openDetailedPersonaModal) {
                window.personaModalManager.openDetailedPersonaModal(connector);
            }
        }
    });
}

            // Ensure personaModalVoiceChatBtn exists on domElements interface if used
            const personaModalVoiceChatBtn = (domElements as any).personaModalVoiceChatBtn as HTMLButtonElement | null;

            if(domElements.personaModalMessageBtn) domElements.personaModalMessageBtn.addEventListener('click', () => handlePersonaModalAction('message_modal'));
            if(personaModalVoiceChatBtn) personaModalVoiceChatBtn.addEventListener('click', () => handlePersonaModalAction('voiceChat_modal'));
            if(domElements.personaModalDirectCallBtn) domElements.personaModalDirectCallBtn.addEventListener('click', () => handlePersonaModalAction('direct_modal'));

// ==========================================================
// === PASTE THE "View Full Dossier" LISTENER HERE        ===
// ==========================================================
if (domElements.personaModalViewDossierBtn) {
    domElements.personaModalViewDossierBtn.addEventListener('click', () => {
        const connectorId = domElements.detailedPersonaModal?.dataset.connectorId;
        if (connectorId) {
            // Close the current small modal
            if (modalHandler) { // Ensure modalHandler is available
                modalHandler.close(domElements.detailedPersonaModal);
            }
            // Open the new page, passing the persona ID
            window.open(`/dossier.html?id=${connectorId}`, '_blank'); 
        }
    });
}


            if (domElements.applyFiltersBtn) domElements.applyFiltersBtn.addEventListener('click', applyFindFilters);
            if (domElements.applyGroupFiltersBtn) domElements.applyGroupFiltersBtn.addEventListener('click', applyGroupFilters);

       // Add this new block
            // --- NEW: Event Listeners for Friends/Groups Sub-Tabs ---
      
    // ===================================================================
    // ==   ADD THIS ENTIRE BLOCK FOR SIDEBAR SEARCH LISTENERS          ==
    // ===================================================================
    const { polyglotHelpers, chatOrchestrator, sessionHistoryManager } = getDeps();

    if (domElements.searchActiveChatsInput && polyglotHelpers?.debounce && chatOrchestrator?.renderCombinedActiveChatsList) {
        domElements.searchActiveChatsInput.addEventListener('input',
            polyglotHelpers.debounce(chatOrchestrator.renderCombinedActiveChatsList, 300)
        );
        console.log("ShellController: Event listener for Active Chats search bar attached.");
    } else {
        console.warn("ShellController: Could not attach listener for Active Chats search. Dependencies missing.");
    }

    if (domElements.searchSessionHistoryInput && polyglotHelpers?.debounce && sessionHistoryManager?.updateSummaryListUI) {
        domElements.searchSessionHistoryInput.addEventListener('input',
            polyglotHelpers.debounce(sessionHistoryManager.updateSummaryListUI, 300)
        );
        console.log("ShellController: Event listener for Session History search bar attached.");
    } else {
        console.warn("ShellController: Could not attach listener for Session History search. Dependencies missing.");
    }


       // ===================================================================
// ==   LIVE SEARCH LISTENERS FOR SIDEBAR LISTS                     ==
// ===================================================================


// Listener for the "Active Chats" search bar
if (domElements.searchActiveChatsInput && polyglotHelpers?.debounce && chatOrchestrator?.renderCombinedActiveChatsList) {
    domElements.searchActiveChatsInput.addEventListener('input',
        // Debounce waits for the user to stop typing for 300ms before filtering
        polyglotHelpers.debounce(chatOrchestrator.renderCombinedActiveChatsList, 300)
    );
    console.log("ShellController: Event listener for Active Chats search bar attached.");
}

// Listener for the "Session History" search bar
if (domElements.searchSessionHistoryInput && polyglotHelpers?.debounce && sessionHistoryManager?.updateSummaryListUI) {
    domElements.searchSessionHistoryInput.addEventListener('input',
        // Debounce waits for the user to stop typing for 300ms before filtering
        polyglotHelpers.debounce(sessionHistoryManager.updateSummaryListUI, 300)
    );
    console.log("ShellController: Event listener for Session History search bar attached.");
}
// ===================================================================
// ==   END OF NEW BLOCK                                            ==
// ===================================================================


            if (domElements.sendGroupMessageBtn && domElements.groupChatInput) {
                domElements.sendGroupMessageBtn.addEventListener('click', handleSendGroupMessage);
                domElements.groupChatInput.addEventListener('keypress', (e: KeyboardEvent) => { // Typed event
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); }
                    else if (groupManager?.userIsTyping) groupManager.userIsTyping();
                });
            }
            if (domElements.leaveGroupBtn) domElements.leaveGroupBtn.addEventListener('click', () => groupManager?.leaveCurrentGroup?.());

            if (domElements.embeddedMessageAttachBtn && domElements.embeddedMessageImageUpload) {
                domElements.embeddedMessageAttachBtn.addEventListener('click', () => {
                    // Reset the value of the file input to allow uploading the same file again if needed
                    (domElements.embeddedMessageImageUpload as HTMLInputElement).value = '';
                    (domElements.embeddedMessageImageUpload as HTMLInputElement).click();
                });
            }

            
        }


   function switchView(targetTab: string): void {
    const { domElements } = getDeps();
    console.log(`%c[Shell Switch] Switching view to: '${targetTab}'`, 'color: white; background: #0d6efd; padding: 2px 5px; border-radius: 3px;');

    if (!targetTab || !domElements?.mainNavItems || !domElements.mainViews) {
        console.error("ShellController.switchView: ABORTING - Missing critical DOM elements for switch.");
        return;
    }

    // 1. Update the main view containers by toggling the 'active-view' class
    domElements.mainViews.forEach(view => {
        const isActive = view.id === `${targetTab}-view`;
        view.classList.toggle('active-view', isActive);
    });

    // 2. Update the left sidebar navigation item styles
    domElements.mainNavItems.forEach(item => {
        const isActive = item.dataset.tab === targetTab;
        item.classList.toggle('active', isActive);
    });

    console.log(`%c[Shell Switch] View switched successfully to '${targetTab}'.`, 'color: white; background: #198754; padding: 2px 5px; border-radius: 3px;');
}

function setupMasterViewCoordinator(initialTab: string) {
    console.log('[Shell Coordinator] Setting up master event listener.');

    // This is the function that will run every time a tab is switched.
      // This is the function that will run every time a tab is switched.
      const handleViewChange = (tabName: string) => {
        console.log(`%c[Shell Coordinator] Coordinating view for tab: '${tabName}'`, 'color: #198754; font-weight: bold;');

        // Get fresh dependencies every time
        const { 
            filterController, 
            // groupManager, // groupDataManager is more direct for checking joined groups
            chatManager, 
            chatOrchestrator, 
            sessionHistoryManager, 
            uiUpdater, 
            sidebarPanelManager,
            conversationManager, // <<< Ensure this is available from getDeps()
            groupDataManager     // <<< Ensure this is available from getDeps()
        } = getDeps();

        // Step 1: Tell ShellController to handle the basic UI switch (updates main view and nav item styles)
        switchView(tabName);

        // Step 2: Tell the Sidebar to update its panel for the new tab
        sidebarPanelManager?.updatePanelForCurrentTab(tabName);

        // Step 3: Call the specific content-loading function for the new tab, with auto-redirect logic
        if (tabName === 'friends') {
            if (!filterController) {
                console.error("[Shell Coordinator] FilterController not available for 'friends' tab.");
                return;
            }
            const myFriends = conversationManager?.getActiveConversations().filter(c => !c.isGroup && c.connector) || [];
            
            if (myFriends.length === 0) {
                console.log("[Shell Coordinator] Friends tab: 'My Friends' is empty. Auto-switching to 'Discover Friends' sub-tab.");
                filterController.switchFriendsViewTab('discover', true); // <<< Add true// This will also trigger filters
            } else {
                console.log("[Shell Coordinator] Friends tab: 'My Friends' has content. Defaulting to 'My Friends' sub-tab.");
                filterController.switchFriendsViewTab('my-friends', true); // <<< Add true // This defaults to 'my-friends' and applies filters
            }
        } else if (tabName === 'groups') {
            if (!filterController || !groupDataManager) { 
                console.error("[Shell Coordinator] FilterController or GroupDataManager not available for 'groups' tab.");
                return;
            }
            
            // Use getAllGroupDataWithLastActivity as it computes an isJoined status for sidebar population
            // This list is generally more "settled" regarding join status on refresh.
            const activeAndJoinedGroupsForSidebar = groupDataManager.getAllGroupDataWithLastActivity() || [];
            
            // Filter this list further to specifically count groups marked as joined by its internal logic
            const trulyJoinedGroups = activeAndJoinedGroupsForSidebar.filter(g => g.isJoined);

            console.log(`[Shell Coordinator] Groups tab processing: Found ${trulyJoinedGroups.length} 'trulyJoinedGroups' (via GDM.getAllGroupDataWithLastActivity).`);
            console.error(`%c[SHELL_DEBUG] At initial 'groups' tab load: trulyJoinedGroups IDs: ${JSON.stringify(trulyJoinedGroups.map(g => g.id))}`, "color: white; background: blue;");
            if (trulyJoinedGroups.length === 0) {
                console.log("[Shell Coordinator] Groups tab: 'My Groups' determined to be empty. Auto-switching to 'Discover Groups' sub-tab.");
                filterController.switchGroupViewTab('discover', true); // <<< Add true
            } else {
                console.log("[Shell Coordinator] Groups tab: 'My Groups' has content. Defaulting to 'My Groups' sub-tab.");
                filterController.switchGroupViewTab('my-groups', true); // <<< Add true
            }
        } else if (tabName === 'messages') {
            chatManager?.handleMessagesTabActive();
        } else if (tabName === 'summary') {
            sessionHistoryManager?.updateSummaryListUI();
            uiUpdater?.displaySummaryInView(null);
        } else if (tabName === 'home') {
            // Handle home tab if necessary, or let it be managed by switchView only
            console.log("[Shell Coordinator] Home tab activated.");
        }
    };
    // Listen for all future tab switches
    document.addEventListener('tabSwitched', (e: Event) => {
        const newTab = (e as CustomEvent).detail?.newTab;
        if (newTab) {
            handleViewChange(newTab);
        }
    });

    // Immediately handle the initial tab load
    console.log(`[Shell Coordinator] Performing initial coordination for tab: '${initialTab}'`);
    handleViewChange(initialTab);
}



// --- END OF MODIFICATION for populateHomepageTips (SC.DEBUG.3) ---
        function initializeTheme(): void { /* ... Your original logic, using getDeps ... */
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers) return;
            const savedTheme = polyglotHelpers.loadFromLocalStorage('polyglotConnectTheme') as string || 'light';
            document.body.classList.toggle('dark-mode', savedTheme === 'dark');
            const themeBtn = domElements.themeToggleButton as HTMLButtonElement | null;
            if(themeBtn) {
                themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                themeBtn.setAttribute('aria-label', savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            }
        }
        function toggleTheme(): void { /* ... Your original logic, using getDeps ... */
             const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers) return;
            document.body.classList.toggle('dark-mode');
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            polyglotHelpers.saveToLocalStorage('polyglotConnectTheme', currentTheme);
            const themeBtn = domElements.themeToggleButton as HTMLButtonElement | null;
            if (themeBtn) {
                themeBtn.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                themeBtn.setAttribute('aria-label', currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            }
        }
        function openDetailedPersonaModalInternal(connector: Connector): void { /* ... Your original logic, using getDeps ... */
            const { domElements, modalHandler, polyglotHelpers, activityManager } = getDeps();
            if (!connector?.id || !domElements?.detailedPersonaModal || !modalHandler || !polyglotHelpers || !activityManager) {
                console.error("ShellController.openDetailedPersonaModalInternal: Cannot open modal - missing dependencies or connector ID."); return;
            }
            (domElements.personaModalAvatar as HTMLImageElement).src = connector.avatarModern || 'images/placeholder_avatar.png';
            (domElements.personaModalAvatar as HTMLImageElement).onerror = () => { (domElements.personaModalAvatar as HTMLImageElement).src = 'images/placeholder_avatar.png'; };
            (domElements.personaModalName as HTMLElement).textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Unknown');
            // ... rest of this function from original
        }
        function cleanupModalData(): void { /* ... Your original logic, using getDeps ... */
            const { domElements } = getDeps();
            if (domElements?.detailedPersonaModal) {
                (domElements.detailedPersonaModal as HTMLElement).dataset.connectorId = '';
            }
        }
        function handlePersonaModalAction(actionType: string): void { /* ... Your original logic, using getDeps ... */
             const { domElements, modalHandler } = getDeps();



             
            if (!domElements?.detailedPersonaModal || !modalHandler) return;
            const connectorId = (domElements.detailedPersonaModal as HTMLElement).dataset.connectorId;
            // ... rest of function
            const connector = (window.polyglotConnectors || []).find(c => c.id === connectorId);
            if (!connector) return;
            modalHandler.close(domElements.detailedPersonaModal as HTMLElement);
            cleanupModalData();
            window.polyglotApp?.initiateSession?.(connector, actionType);
        }
        function updateEmptyListMessages(): void { /* ... Your original logic, using getDeps ... */ }
       // --- START OF REPLACEMENT for applyFindFilters function (SC.REVISE.1) ---
       function applyFindFilters(): void {
        const { domElements } = getDeps();
        const currentFilterController = window.filterController;
        if (!currentFilterController) {
            console.error("ShellController: filterController not available.");
            return;
        }

        // NEW: Check which sub-tab is active
        const myFriendsBtn = document.getElementById('my-friends-tab-btn');
        console.log("ShellController: applyFindFilters - Calling filterController.applyFindConnectorsFilters().");

        // Delegate the actual filtering and rendering to the filter controller.
        // The filter controller itself will be responsible for checking the active sub-tab.
        currentFilterController.applyFindConnectorsFilters();
    }
// --- END OF REPLACEMENT for applyFindFilters function (SC.REVISE.1) ---
      // --- CONFIRM THIS FUNCTION (SC.INTEGRATE.2) ---
    // Replace the existing applyGroupFilters function
    function applyGroupFilters(): void {
        const { domElements, groupManager } = getDeps();
        if (!groupManager?.loadAvailableGroups) {
            console.warn("ShellController: groupManager.loadAvailableGroups not available.");
            return;
        }

        // NEW: Check which sub-tab is active
        const myGroupsBtn = document.getElementById('my-groups-tab-btn');
        const activeGroupsView = myGroupsBtn?.classList.contains('active') ? 'my-groups' : 'discover';

        console.log(`ShellController: applyGroupFilters called for sub-view: ${activeGroupsView}`);

        const langFilter = domElements.filterGroupLanguageSelect?.value || 'all';
        const categoryFilter = domElements.filterGroupCategorySelect?.value || 'all';
        const nameSearch = domElements.filterGroupNameInput?.value.trim() || '';

        // Pass the active view type to the group manager
        groupManager.loadAvailableGroups(
            langFilter === 'all' ? null : langFilter,
            categoryFilter === 'all' ? null : categoryFilter,
            nameSearch === '' ? null : nameSearch.toLowerCase(),
            { viewType: activeGroupsView } // Pass the context here
        );
    }
// --- END OF CONFIRMATION (SC.INTEGRATE.2) ---
      // --- START OF REPLACEMENT for populateFilterDropdowns (SC.INTEGRATE.1) ---
function populateFilterDropdowns(): void {
    console.log("ShellController: populateFilterDropdowns - STARTING (from integrated JS logic).");
    const { domElements, polyglotHelpers } = getDeps();

    if (!domElements || !polyglotHelpers) {
        console.warn("ShellController: populateFilterDropdowns - Missing domElements or polyglotHelpers.");
        return;
    }

    const languages = window.polyglotFilterLanguages as LanguageFilterItem[] | undefined || [];
    const roles = window.polyglotFilterRoles as RoleFilterItem[] | undefined || [{ name: "Any Role", value: "all" }]; // Default if not present

    console.log("ShellController: populateFilterDropdowns - Languages for dropdowns:", JSON.stringify(languages));
    console.log("ShellController: populateFilterDropdowns - Roles for dropdown:", JSON.stringify(roles));

    // Helper function from your JS, now typed and within scope
    const populateSelect = (
        selectEl: HTMLSelectElement | null,
        options: Array<{ value: string; name: string; flagCode?: string | null }>, // Matches LanguageFilterItem and RoleFilterItem structure
        includeFlag: boolean
    ) => {
        if (!selectEl) {
            console.warn("ShellController: populateSelect - selectEl is null.");
            return;
        }
        selectEl.innerHTML = ''; // Clear existing
        if (!Array.isArray(options) || options.length === 0) {
            console.warn(`ShellController: populateSelect - No options for ${selectEl.id}.`);
            const defaultOption = document.createElement('option');
            defaultOption.value = "all";
            defaultOption.textContent = "N/A";
            selectEl.appendChild(defaultOption);
            return;
        }
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            let textContent = polyglotHelpers.sanitizeTextForDisplay(opt.name);
            if (includeFlag && opt.flagCode) {
                const flagEmoji = polyglotHelpers.getFlagEmoji(opt.flagCode);
                textContent = `${flagEmoji} ${textContent}`.trim();
            }
            option.textContent = textContent;
            selectEl.appendChild(option);
        });
        console.log(`ShellController: populateSelect - Populated ${selectEl.id} with ${selectEl.options.length} options.`);
    };

    if (domElements.filterLanguageSelect) {
        populateSelect(domElements.filterLanguageSelect, languages, true);
    } else { console.warn("ShellController: domElements.filterLanguageSelect not found."); }

    if (domElements.filterGroupLanguageSelect) {
        populateSelect(domElements.filterGroupLanguageSelect, languages, true);
    } else { console.warn("ShellController: domElements.filterGroupLanguageSelect not found."); }

    if (domElements.filterRoleSelect) {
        populateSelect(domElements.filterRoleSelect, roles, false);
    } else { console.warn("ShellController: domElements.filterRoleSelect not found."); }

    console.log("ShellController: populateFilterDropdowns - FINISHED.");
}
// --- END OF REPLACEMENT for populateFilterDropdowns (SC.INTEGRATE.1) ---
     function handleSendGroupMessage(): void {
    console.log("ShellController: handleSendGroupMessage - Called."); // Added log
    getDeps().groupManager?.handleUserMessageInGroup?.();
}
       // --- START OF REPLACEMENT for handleSendEmbeddedMessage (SC.INTEGRATE.4) ---
       function handleSendEmbeddedMessage(): void {
        console.warn("ShellController: handleSendEmbeddedMessage - Called. DEBUG: Action deliberately PREVENTED to test for duplicate send triggers.");
        return; // Explicitly return to do nothing further.
    }
// --- END OF REPLACEMENT for handleSendEmbeddedMessage (SC.INTEGRATE.4) ---
      // --- START OF REPLACEMENT for handleEmbeddedImageUploadEvent (SC.INTEGRATE.5) ---
function handleEmbeddedImageUploadEvent(event: Event): void {
    console.log("ShellController: handleEmbeddedImageUploadEvent - Called."); // Added log
    const { chatManager } = getDeps(); // chatManager is chatOrchestrator

    const tmh = chatManager?.getTextMessageHandler?.();
    if (tmh && typeof tmh.handleEmbeddedImageUpload === 'function') {
        const currentTargetId = chatManager?.getCurrentEmbeddedChatTargetId?.();
        // handleEmbeddedImageUpload in TextMessageHandler should ideally take targetId
        // Assuming it does based on common patterns (you may need to adjust TextMessageHandler)
        if (currentTargetId) {
             tmh.handleEmbeddedImageUpload(event, currentTargetId);
        } else {
            console.warn("ShellController: handleEmbeddedImageUploadEvent - No current embedded chat target ID.");
        }
    } else {
        console.error("ShellController: handleEmbeddedImageUploadEvent - TextMessageHandler or its handleEmbeddedImageUpload method not available.");
    }
}
// --- END OF REPLACEMENT for handleEmbeddedImageUploadEvent (SC.INTEGRATE.5) ---

        // --- REPLACEMENT for showEmbeddedChat (SC.INTEGRATE.6) ---
function showEmbeddedChat(connector: Connector): void {
    console.log("ShellController: showEmbeddedChat - Called for connector:", connector?.id);
    const { domElements, uiUpdater, chatActiveTargetManager } = getDeps();

    if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder || !uiUpdater || !connector || !chatActiveTargetManager) {
        console.error("ShellController.showEmbeddedChat: ABORTING - Missing critical elements or connector.");
        return;
    }

    chatActiveTargetManager.setEmbeddedChatTargetId(connector.id); // Set the target

    domElements.messagesPlaceholder.style.display = 'none';
    domElements.embeddedChatContainer.style.display = 'flex';

    if (typeof uiUpdater.updateEmbeddedChatHeader === 'function') {
         uiUpdater.updateEmbeddedChatHeader(connector);
    } else { console.warn("ShellController: uiUpdater.updateEmbeddedChatHeader is not a function");}

    if (typeof uiUpdater.clearEmbeddedChatLog === 'function') {
         uiUpdater.clearEmbeddedChatLog(); // Good practice
    }
    if (typeof uiUpdater.clearEmbeddedChatInput === 'function') {
         uiUpdater.clearEmbeddedChatInput();
    }

    if (domElements.embeddedMessageTextInput) {
         domElements.embeddedMessageTextInput.focus();
    }
    console.log("ShellController: showEmbeddedChat - UI updated for connector:", connector.id);
}

        function hideEmbeddedChat(): void { /* ... Your original logic ... */ }
        function showGroupChatInterface(groupName: string, members: Connector[]): void { /* ... Your original logic ... */ }
        function hideGroupChatInterface(): void { /* ... Your original logic ... */ }


        // Ensure all functions from your original return object are included here
        console.log("ui/shell_controller.ts: IIFE finished, returning exports.");
        return {
            initializeAppShell,
            openDetailedPersonaModal: openDetailedPersonaModalInternal,
            switchView,
            updateEmptyListMessages,
            showEmbeddedChat,
            hideEmbeddedChat,
            showGroupChatInterface,
            hideGroupChatInterface,
         
        };
    })(); // End of IIFE

} // End of initializeActualShellController

const SC_DEPENDENCIES: { eventName: string, windowObjectKey: keyof Window, keyFunction?: string }[] = [
    // Core structural dependencies needed by almost all methods in shell_controller
    { eventName: 'domElementsReady', windowObjectKey: 'domElements', keyFunction: 'appShell' },
    { eventName: 'polyglotHelpersReady', windowObjectKey: 'polyglotHelpers', keyFunction: 'sanitizeTextForDisplay' },
    { eventName: 'modalHandlerReady', windowObjectKey: 'modalHandler', keyFunction: 'open' },

    // Functional dependencies for specific methods. ShellController initializes UI, so it needs many things ready.
    { eventName: 'cardRendererReady', windowObjectKey: 'cardRenderer', keyFunction: 'renderCards' },
    { eventName: 'listRendererReady', windowObjectKey: 'listRenderer', keyFunction: 'renderActiveChatList' },
    { eventName: 'activityManagerReady', windowObjectKey: 'activityManager', keyFunction: 'isConnectorActive' },
    { eventName: 'uiUpdaterReady', windowObjectKey: 'uiUpdater', keyFunction: 'appendToVoiceChatLog' }, // Check a representative method
    { eventName: 'chatOrchestratorReady', windowObjectKey: 'chatOrchestrator', keyFunction: 'initialize' },
    { eventName: 'groupManagerReady', windowObjectKey: 'groupManager', keyFunction: 'initialize' },
    { eventName: 'sessionManagerReady', windowObjectKey: 'sessionManager', keyFunction: 'initialize' },
    { eventName: 'polyglotSharedContentReady', windowObjectKey: 'polyglotSharedContent', keyFunction: 'homepageTips' }, // Check property existence
    { eventName: 'tabManagerReady', windowObjectKey: 'tabManager', keyFunction: 'switchToTab' }, // For switchView
    {
        eventName: 'filterControllerReady',                 // <<<< IMPORTANT
        windowObjectKey: 'filterController',
        keyFunction: 'applyFindConnectorsFilters'           // <<<< IMPORTANT
    },
    { 
        eventName: 'conversationManagerReady', 
        windowObjectKey: 'conversationManager', 
        keyFunction: 'initialize' // Or another key method to verify
    },
    { 
        eventName: 'groupDataManagerReady', 
        windowObjectKey: 'groupDataManager', 
        keyFunction: 'initialize' // Or another key method to verify
    },
    { eventName: 'polyglotDataReady', windowObjectKey: 'polyglotFilterLanguages' } , // For populateFilterDropdowns (polyglotFilterLanguages is from polyglotDataReady)

    { eventName: 'sidebarPanelManagerReady', windowObjectKey: 'sidebarPanelManager', keyFunction: 'initialize' },

    {
    eventName: 'chatActiveTargetManagerReady',
    windowObjectKey: 'chatActiveTargetManager',
    keyFunction: 'setEmbeddedChatTargetId' // Or another key method like getEmbeddedChatTargetId
},
];

const scModuleReadyStatus: { [key: string]: boolean } = {};
SC_DEPENDENCIES.forEach(dep => scModuleReadyStatus[dep.eventName] = false);
let scCoreModulesReadyCount = 0;

function scMarkModuleAsReady(eventName: string) {
    if (scModuleReadyStatus[eventName]) return;

    scModuleReadyStatus[eventName] = true;
    scCoreModulesReadyCount++;
    console.log(`SHELL_CONTROLLER_DEPS: '${eventName}' is ready. Progress: ${scCoreModulesReadyCount}/${SC_DEPENDENCIES.length}`);

    if (scCoreModulesReadyCount === SC_DEPENDENCIES.length) {
        console.log(`SHELL_CONTROLLER_DEPS: All ${SC_DEPENDENCIES.length} dependencies for ShellController are now ready. Initializing actual ShellController.`);
        initializeActualShellController();

      if (window.shellController && typeof window.shellController.initializeAppShell === 'function') {
    console.log("shell_controller.ts: ShellController object is populated. Now calling its initializeAppShell method.");
    window.shellController.initializeAppShell(); // <<< CALLING ITSELF
    console.log("shell_controller.ts: shellController.initializeAppShell() has been called. Dispatching 'shellControllerReady'.");
    document.dispatchEvent(new CustomEvent('shellControllerReady'));
} else {
    console.error("shell_controller.ts: initializeActualShellController finished, but window.shellController.initializeAppShell is not a function. UI not initialized by shell_controller. 'shellControllerReady' NOT dispatched.");
}
    }
}

console.log("SHELL_CONTROLLER_DEPS: Setting up listeners and performing pre-checks for ShellController dependencies.");
SC_DEPENDENCIES.forEach(depInfo => {
    const moduleObject = window[depInfo.windowObjectKey] as any;
    let isAlreadyReady = false;

    if (moduleObject) {
        if (depInfo.keyFunction) {
            if (typeof moduleObject[depInfo.keyFunction] === 'function') {
                isAlreadyReady = true;
            } else if (moduleObject.hasOwnProperty(depInfo.keyFunction) && typeof moduleObject[depInfo.keyFunction] !== 'undefined') {
                isAlreadyReady = true; // Property exists
            }
        } else {
            isAlreadyReady = true; // Object presence is enough
        }
    }

    if (isAlreadyReady) {
        console.log(`SHELL_CONTROLLER_DEPS: Pre-check - Dependency for '${depInfo.eventName}' (window.${String(depInfo.windowObjectKey)}) is ALREADY functionally ready.`);
        scMarkModuleAsReady(depInfo.eventName);
    } else {
        console.log(`SHELL_CONTROLLER_DEPS: Pre-check - Dependency for '${depInfo.eventName}' not yet ready. Adding listener.`);
        document.addEventListener(depInfo.eventName, () => scMarkModuleAsReady(depInfo.eventName), { once: true });
    }
});
console.log("js/ui/shell_controller.ts: Script execution finished. New dependency logic in place.");
console.log("js/ui/shell_controller.ts: Script execution finished. Initialization is event-driven or direct.");