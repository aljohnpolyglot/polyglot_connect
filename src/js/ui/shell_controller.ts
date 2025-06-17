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

    // Check for all essential dependencies needed by the IIFE at its top level or by getDeps
    // if (!window.domElements || !window.polyglotHelpers || !window.modalHandler /* add others if critical for getDeps */) {
    //     console.error("shell_controller.ts: CRITICAL - Essential dependencies (domElements, polyglotHelpers, modalHandler, etc.) not ready. Halting ShellController setup.");
    //     window.shellController = { // Dummy assignment
    //         initializeAppShell: () => console.error("ShellController not initialized (deps missing)."),
    //         openDetailedPersonaModal: () => console.error("ShellController not initialized (deps missing)."),
    //         switchView: () => console.error("ShellController not initialized (deps missing)."),
    //         updateEmptyListMessages: () => console.error("ShellController not initialized (deps missing)."),
    //         showEmbeddedChat: () => console.error("ShellController not initialized (deps missing)."),
    //         hideEmbeddedChat: () => console.error("ShellController not initialized (deps missing)."),
    //         showGroupChatInterface: () => console.error("ShellController not initialized (deps missing)."),
    //         hideGroupChatInterface: () => console.error("ShellController not initialized (deps missing)."),
    //     };
    //     return;
    // }
    // console.log('shell_controller.ts: Essential dependencies appear ready.');





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
            chatManager: window.chatManager as ChatOrchestrator | undefined, // Using ChatOrchestrator type
            groupManager: window.groupManager as GroupManager | undefined,
            sessionManager: window.sessionManager as SessionManager | undefined,
            polyglotSharedContent: window.polyglotSharedContent as SharedContent | undefined,
            chatActiveTargetManager: window.chatActiveTargetManager as import('../types/global').ChatActiveTargetManager | undefined // <<< ADDED
        });

        let currentActiveTab = 'home'; // This was also in view_manager. Consider consolidating.

        function initializeAppShell(): void {
            const { domElements, polyglotHelpers } = getDeps();
            console.log("ShellController: initializeAppShell - START. domElements available:", !!domElements);
        
            if (!domElements?.appShell) {
                console.error("ShellController: initializeAppShell - App shell container (appShell) not found in domElements! Cannot proceed.");
                return;
            }
        
            // --- START: Guard for initial setup ---
            if (initialAppShellViewInitialized) {
                console.warn("ShellController: initializeAppShell called again, but initial view setup already done. Skipping redundant setup.");
                return;
            }
            initialAppShellViewInitialized = true;
            console.log("ShellController: initializeAppShell - Performing initial setup for the first time.");
            // --- END: Guard for initial setup ---
        
            currentActiveTab = (polyglotHelpers!.loadFromLocalStorage('polyglotLastActiveTab') as string) || 'home';
            console.log("ShellController: initializeAppShell - Loaded currentActiveTab:", currentActiveTab);
        
            console.log("ShellController: initializeAppShell - About to call switchView for tab:", currentActiveTab);
            switchView(currentActiveTab);
            console.log("ShellController: initializeAppShell - Returned from switchView for tab:", currentActiveTab);
        
            console.log("ShellController: initializeAppShell - About to call populateHomepageTips.");
            populateHomepageTips();
            console.log("ShellController: initializeAppShell - Returned from populateHomepageTips.");
        
            console.log("ShellController: initializeAppShell - About to call populateFilterDropdowns.");
            populateFilterDropdowns();
            console.log("ShellController: initializeAppShell - Returned from populateFilterDropdowns.");
            
            console.log("ShellController: initializeAppShell - About to call setupShellEventListeners.");
            setupShellEventListeners(); // Listeners should ideally only be set up once too.
            console.log("ShellController: initializeAppShell - Returned from setupShellEventListeners.");
        
            console.log("ShellController: initializeAppShell - About to call initializeTheme.");
            initializeTheme();
            console.log("ShellController: initializeAppShell - Returned from initializeTheme.");
            
            console.log("ui/shell_controller.ts: Shell Initialized and initializeAppShell COMPLETED.");
        }

        function setupShellEventListeners(): void {
            const { domElements, modalHandler, groupManager, chatManager } = getDeps();
            if (!domElements || !modalHandler) {
                console.warn("ShellController: Missing domElements or modalHandler for event listeners.");
                return;
            }

            if (domElements.themeToggleButton) {
                domElements.themeToggleButton.addEventListener('click', toggleTheme);
            }

            if (domElements.mainNavItems) {
                domElements.mainNavItems.forEach(item => item.addEventListener('click', handleTabSwitchEvent as EventListener));
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
            // Ensure personaModalVoiceChatBtn exists on domElements interface if used
            const personaModalVoiceChatBtn = (domElements as any).personaModalVoiceChatBtn as HTMLButtonElement | null;

            if(domElements.personaModalMessageBtn) domElements.personaModalMessageBtn.addEventListener('click', () => handlePersonaModalAction('message_modal'));
            if(personaModalVoiceChatBtn) personaModalVoiceChatBtn.addEventListener('click', () => handlePersonaModalAction('voiceChat_modal'));
            if(domElements.personaModalDirectCallBtn) domElements.personaModalDirectCallBtn.addEventListener('click', () => handlePersonaModalAction('direct_modal'));
            
            if (domElements.applyFiltersBtn) domElements.applyFiltersBtn.addEventListener('click', applyFindFilters);
            if (domElements.applyGroupFiltersBtn) domElements.applyGroupFiltersBtn.addEventListener('click', applyGroupFilters);
            
            if (domElements.sendGroupMessageBtn && domElements.groupChatInput) {
                domElements.sendGroupMessageBtn.addEventListener('click', handleSendGroupMessage);
                domElements.groupChatInput.addEventListener('keypress', (e: KeyboardEvent) => { // Typed event
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); }
                    else if (groupManager?.userIsTyping) groupManager.userIsTyping();
                });
            }
            if (domElements.leaveGroupBtn) domElements.leaveGroupBtn.addEventListener('click', () => groupManager?.leaveCurrentGroup?.());
            
            // if (domElements.embeddedMessageSendBtn && domElements.embeddedMessageTextInput) {
            //     domElements.embeddedMessageSendBtn.addEventListener('click', handleSendEmbeddedMessage);
            //     domElements.embeddedMessageTextInput.addEventListener('keypress', (e: KeyboardEvent) => { // Typed event
            //         if (e.key === 'Enter' && !e.shiftKey) {
            //             e.preventDefault();
            //             handleSendEmbeddedMessage();
            //         }
            //     });
            // }
            if (domElements.embeddedMessageAttachBtn && domElements.embeddedMessageImageUpload) {
                domElements.embeddedMessageAttachBtn.addEventListener('click', () => {
                    // Reset the value of the file input to allow uploading the same file again if needed
                    (domElements.embeddedMessageImageUpload as HTMLInputElement).value = ''; 
                    (domElements.embeddedMessageImageUpload as HTMLInputElement).click();
                });
                // domElements.embeddedMessageImageUpload.addEventListener('change', handleEmbeddedImageUploadEvent); // <<< COMMENTED OUT / REMOVED
            }
        }

        function handleTabSwitchEvent(e: Event): void { // Typed event
            e.preventDefault();
            const currentTarget = e.currentTarget as HTMLElement; // Type assertion
            const targetTab = currentTarget.dataset.tab;
            if (targetTab && targetTab !== currentActiveTab) {
                switchView(targetTab);
            }
        }

        // NOTE: switchView, populateHomepageTips, initializeTheme, toggleTheme,
        // openDetailedPersonaModalInternal, cleanupModalData, handlePersonaModalAction,
        // updateEmptyListMessages, applyFindFilters, applyGroupFilters, populateFilterDropdowns,
        // handleSendGroupMessage, handleSendEmbeddedMessage, handleEmbeddedImageUploadEvent,
        // showEmbeddedChat, hideEmbeddedChat, showGroupChatInterface, hideGroupChatInterface
        // functions from your original shell_controller.js need to be pasted here.
        // I will add typed stubs for a few, you'll need to fill them with your original logic
        // and add types.

        function switchView(targetTab: string): void {
            const previousTab = currentActiveTab; // <<< ADD THIS LINE
            const { domElements, listRenderer, uiUpdater, chatManager, groupManager, sessionManager, polyglotHelpers } = getDeps();
            console.log(`ShellController: switchView - START. TargetTab: '${targetTab}', CurrentActiveTab (before change): '${currentActiveTab}'`);
        
            if (!targetTab || !domElements?.mainNavItems || !domElements.mainViews /* removed rightSidebarPanels check here */ || !polyglotHelpers) {
                console.error("ShellController.switchView: ABORTING - Missing critical DOM elements or helpers for switchView.");
                return;
            }
        
            currentActiveTab = targetTab; 
            polyglotHelpers.saveToLocalStorage('polyglotLastActiveTab', currentActiveTab);
            console.log(`ShellController: switchView - Saved currentActiveTab '${currentActiveTab}' to localStorage.`);
        
            domElements.mainNavItems.forEach(i => {
                const isActive = i.dataset.tab === targetTab;
                i.classList.toggle('active', isActive);
            });
        
            domElements.mainViews.forEach(view => {
                const isActive = view.id === `${targetTab}-view`;
                view.classList.toggle('active-view', isActive);
                console.log(`ShellController: switchView - View '#${view.id}': active-view=${isActive}, display=${view.style.display}`);
                if (isActive) { 
                    const computedStyle = window.getComputedStyle(view);
                    console.log(`ShellController: switchView - Active View '#${view.id}' computed display: ${computedStyle.display}, visibility: ${computedStyle.visibility}, opacity: ${computedStyle.opacity}`);
                }
            });


    // --- START: Right Sidebar Panel Logic (Re-integrated and Modified) ---
 
// --- START: Right Sidebar Panel Logic (Managed by ShellController) ---
if (domElements.rightSidebarPanels && domElements.appShell) { // Added appShell check for querySelector
    // 1. Hide all right sidebar panels initially
    domElements.rightSidebarPanels.forEach(panel => {
        panel.classList.remove('active-panel');
    });

    let panelIdToShow: string | null = null;

    // 2. Determine which panel to show based on the targetTab
    if (targetTab === 'groups') {
        const currentGroupData = groupManager?.getCurrentGroupData?.();
        if (currentGroupData) {
            console.log("ShellController.switchView: 'groups' tab, group active. Showing messagesChatListPanel.");
            panelIdToShow = 'messagesChatListPanel';
        } else {
            console.log("ShellController.switchView: 'groups' tab, no group active. Showing groupsFiltersPanel.");
            panelIdToShow = 'groupsFiltersPanel';
        }
    } else if (targetTab === 'find') {
        console.log("ShellController.switchView: 'find' tab. Showing findFiltersPanel.");
        panelIdToShow = 'findFiltersPanel';
    } else if (targetTab === 'messages') {
        console.log("ShellController.switchView: 'messages' tab. Showing messagesChatListPanel.");
        panelIdToShow = 'messagesChatListPanel';
    } else if (targetTab === 'summary') {
        console.log("ShellController.switchView: 'summary' tab. Showing summaryChatListPanel.");
        panelIdToShow = 'summaryChatListPanel';
    } else if (targetTab === 'home') {
        console.log("ShellController.switchView: 'home' tab. No right sidebar panel.");
        panelIdToShow = null; // No panel for home
    } else {
        console.warn(`ShellController.switchView: Unknown targetTab '${targetTab}' for right sidebar logic.`);
        panelIdToShow = null;
    }

    // 3. Show the determined panel
    if (panelIdToShow) {
        // It's safer to query from a known common ancestor like appShell or document body,
        // as rightSidebarPanels might not be direct children of rightSidebar if structure changes.
        // However, if domElements.rightSidebarPanels correctly lists all of them, we can find it there.
        let panelToShowElement: HTMLElement | null = null;
        for (const panel of Array.from(domElements.rightSidebarPanels)) {
            if (panel.id === panelIdToShow) {
                panelToShowElement = panel as HTMLElement;
                break;
            }
        }

        if (panelToShowElement) {
            panelToShowElement.classList.add('active-panel');
            console.log(`ShellController.switchView: Activated right sidebar panel '#${panelIdToShow}'.`);

            // 4. If messagesChatListPanel is shown, refresh its content
            if (panelIdToShow === 'messagesChatListPanel') {
                if (chatManager?.renderCombinedActiveChatsList) {
                    console.log("ShellController.switchView: Refreshing messagesChatListPanel content.");
                    chatManager.renderCombinedActiveChatsList();
                } else {
                    console.warn("ShellController.switchView: chatManager.renderCombinedActiveChatsList not available.");
                }
            }
            // Note: summaryChatListPanel shows session history, not active chats,
            // so renderCombinedActiveChatsList() is not needed for it here.
        } else {
            console.warn(`ShellController.switchView: Right sidebar panel with ID '${panelIdToShow}' not found in domElements.rightSidebarPanels.`);
        }
    }
} else {
    console.warn("ShellController.switchView: domElements.rightSidebarPanels or domElements.appShell not found, cannot manage right sidebar panels.");
}
// --- END: Right Sidebar Panel Logic (Managed by ShellController) ---


    // --- END: Right Sidebar Panel Logic ---
    console.log(`ShellController: switchView - Performing tab-specific content actions for tab: '${targetTab}'`);
    if (targetTab === 'find') {
        console.log("ShellController: switchView - Calling applyFindFilters() for 'find' tab.");
        applyFindFilters();
    } else if (targetTab === 'groups') {
        console.log("ShellController: switchView - Handling content for 'groups' tab.");
        const currentGroupData = groupManager?.getCurrentGroupData?.();
        if (currentGroupData) {
            // A group is active, groupUiHandler should have already shown the chat interface.
            // We might not need to do anything here for the main view,
            // or ensure the group list container is hidden and chat interface is visible.
            console.log("ShellController (switchView/'groups' content): Group is active. Ensuring chat UI is primary.");
            if (domElements.groupListContainer) domElements.groupListContainer.style.display = 'none';
            if (domElements.groupChatInterfaceDiv) domElements.groupChatInterfaceDiv.style.display = 'flex'; // or 'block'
        } else {
            // No group active, show the list of available groups.
            console.log("ShellController (switchView/'groups' content): No group active. Showing available groups list.");
            if (domElements.groupChatInterfaceDiv) domElements.groupChatInterfaceDiv.style.display = 'none';
            if (domElements.groupListContainer) domElements.groupListContainer.style.display = 'block';
            applyGroupFilters();
        }
    } else if (targetTab === 'messages') {
        console.log("ShellController: switchView - Calling chatManager.handleMessagesTabActive() for 'messages' tab.");
        chatManager?.handleMessagesTabActive?.();
   } else if (targetTab === 'summary') {
    console.log("ShellController: switchView - Processing 'summary' tab.");
    const currentSessionManager = window.sessionManager as SessionManager | undefined;
    const currentListRenderer = window.listRenderer as ListRenderer | undefined;
    const currentUiUpdater = window.uiUpdater as UiUpdater | undefined;

    if (currentSessionManager && typeof currentSessionManager.getCompletedSessions === 'function' && 
        typeof currentSessionManager.showSessionRecapInView === 'function' &&
        currentListRenderer && typeof currentListRenderer.renderSummaryList === 'function') {
        console.log("ShellController: switchView (summary) - Rendering summary list.");
        const completedSessions = currentSessionManager.getCompletedSessions(); // <<< Needs to return data
        currentListRenderer.renderSummaryList(completedSessions || [], currentSessionManager.showSessionRecapInView);
    } else {
            console.warn("ShellController: switchView (summary) - sessionManager or listRenderer not fully functional for summary list.");
        }
        if (currentUiUpdater && typeof currentUiUpdater.displaySummaryInView === 'function') {
            console.log("ShellController: switchView (summary) - Displaying placeholder in main summary view.");
            currentUiUpdater.displaySummaryInView(null);
        } else {
            console.warn("ShellController: switchView (summary) - uiUpdater.displaySummaryInView not available.");
        }
   } else if (targetTab === 'home') {
        console.log("ShellController: switchView (home tab) - START actions for 'home'.");
        console.log("ShellController: switchView (home tab) - About to call populateHomepageTips().");
        populateHomepageTips();
        console.log("ShellController: switchView (home tab) - Returned from populateHomepageTips().");
        console.log("ShellController: switchView (home tab) - FINISHED actions for 'home'.");
    }

    if (previousTab === 'groups' && targetTab !== 'groups') {
        const currentGroupData = groupManager?.getCurrentGroupData?.();
        if (currentGroupData) {
            console.log(`ShellController: Navigated away from groups tab. Silently leaving group: ${currentGroupData.id}`);
            // The (false, false) arguments stop UI reloads, we just want to stop the background process.
            groupManager?.leaveCurrentGroup?.(false, false);
        }
    }

    console.log("ShellController: switchView - Calling updateEmptyListMessages().");
    updateEmptyListMessages();
    console.log(`ShellController: switchView - END for targetTab: '${targetTab}'.`);

            const activeViewElement = domElements.mainContainer?.querySelector(`#${targetTab}-view.active-view`) as HTMLElement | null;
    if (activeViewElement) {
        const styles = window.getComputedStyle(activeViewElement);
        console.log(`ShellController: switchView - VERIFY ACTIVE VIEW: Element '#${targetTab}-view' found. Display: ${styles.display}, Visibility: ${styles.visibility}, Opacity: ${styles.opacity}, Children: ${activeViewElement.children.length}`);
        if (targetTab === 'home' && domElements.homepageTipsList) {
            console.log(`ShellController: switchView (home) - Homepage tips list UL innerHTML:`, domElements.homepageTipsList.innerHTML.substring(0,100) + "...");
            console.log(`ShellController: switchView (home) - Homepage tips list UL child count:`, domElements.homepageTipsList.children.length);
        }
    } else {
        console.error(`ShellController: switchView - VERIFY ACTIVE VIEW: Element '#${targetTab}-view.active-view' NOT FOUND after switch.`);
    }




}

       // --- START OF MODIFICATION for populateHomepageTips (SC.DEBUG.3) ---
function populateHomepageTips(): void {
    console.log("ShellController: populateHomepageTips - STARTING.");
    const { domElements, polyglotHelpers, polyglotSharedContent } = getDeps();

    if (!domElements) {
        console.error("ShellController: populateHomepageTips - domElements is nullish!");
        return;
    }
    if (!polyglotHelpers) {
        console.error("ShellController: populateHomepageTips - polyglotHelpers is nullish!");
        return;
    }
     if (!polyglotSharedContent) {
        console.warn("ShellController: populateHomepageTips - polyglotSharedContent is nullish. No tips to show.");
        if (domElements.homepageTipsList) {
            (domElements.homepageTipsList as HTMLUListElement).innerHTML = "<li>Shared content for tips not available.</li>";
        }
        return;
    }
    
    const tipsListElement = domElements.homepageTipsList as HTMLUListElement | null;
    if (!tipsListElement) {
        console.error("ShellController: populateHomepageTips - domElements.homepageTipsList not found!");
        return;
    }

    const tips = polyglotSharedContent.homepageTips;
    if (!tips || !Array.isArray(tips) || tips.length === 0) {
        console.warn("ShellController: populateHomepageTips - No tips found in polyglotSharedContent.homepageTips or it's not an array.");
        tipsListElement.innerHTML = "<li>No tips available at the moment.</li>";
        return;
    }

    console.log(`ShellController: populateHomepageTips - Found ${tips.length} tip(s). Preparing to render.`);
    try {
        const tipsHTML = tips.map(tip =>
            `<li><i class="fas fa-check-circle tip-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(String(tip))}</li>`
        ).join('');
        tipsListElement.innerHTML = tipsHTML;
        console.log("ShellController: populateHomepageTips - Successfully set innerHTML for tips list.", tipsListElement);
        if (tipsListElement.children.length > 0) {
            console.log("ShellController: populateHomepageTips - Tips list now has children:", tipsListElement.children.length);
        } else {
            console.warn("ShellController: populateHomepageTips - Tips list has NO children after setting innerHTML. HTML was:", tipsHTML);
        }
    } catch (error) {
        console.error("ShellController: populateHomepageTips - Error during tips HTML generation or assignment:", error);
        tipsListElement.innerHTML = "<li>Error loading tips.</li>";
    }
    console.log("ShellController: populateHomepageTips - FINISHED.");
    if (tipsListElement && tipsListElement.children.length > 0) {
    const styles = window.getComputedStyle(tipsListElement);
    const parentViewStyles = tipsListElement.closest('.view') ? window.getComputedStyle(tipsListElement.closest('.view')!) : null;
    console.log(`ShellController: populateHomepageTips - VERIFY TIPS LIST: Populated. Display: ${styles.display}, Visibility: ${styles.visibility}. Parent View Display: ${parentViewStyles?.display}, Parent View Visibility: ${parentViewStyles?.visibility}`);
} else if (tipsListElement) {
    console.warn(`ShellController: populateHomepageTips - VERIFY TIPS LIST: Populated but has NO children.`);
}
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
    console.log("ShellController: applyFindFilters - Attempting to apply find filters via FilterController.");
    // We no longer need to get 'chatManager' here for this specific action.
    // We also don't need to construct the 'filters' object here, as
    // filterController.applyFindConnectorsFilters will read them from the DOM.
    const { domElements } = getDeps(); // Still useful for console logs or potential fallbacks.
    
    const currentFilterController = window.filterController; 

    if (!currentFilterController || typeof currentFilterController.applyFindConnectorsFilters !== 'function') {
        console.error("ShellController: applyFindFilters - window.filterController or its applyFindConnectorsFilters method is not available.");
        if (domElements?.connectorHubGrid) {
            domElements.connectorHubGrid.innerHTML = '<p class="error-message">Filter functionality is currently unavailable (controller missing).</p>';
        }
        return;
    }
    
    // filterController.applyFindConnectorsFilters() should now internally:
    // 1. Get domElements.filterLanguageSelect.value and domElements.filterRoleSelect.value
    // 2. Call the local filterAndDisplayConnectors() function (which you added in filter_controller.ts in FC.1)
    currentFilterController.applyFindConnectorsFilters();
    console.log("ShellController: applyFindFilters - Called filterController.applyFindConnectorsFilters().");
}
// --- END OF REPLACEMENT for applyFindFilters function (SC.REVISE.1) ---
      // --- CONFIRM THIS FUNCTION (SC.INTEGRATE.2) ---
      function applyGroupFilters(): void {
        const { domElements, groupManager } = getDeps();
        console.log("ShellController: applyGroupFilters - Called (Revised to read all filters).");

        if (!domElements || !groupManager?.loadAvailableGroups) {
            console.warn("ShellController: applyGroupFilters - Missing domElements or groupManager.loadAvailableGroups.");
            groupManager?.loadAvailableGroups?.(null, null, null); // Fallback with 3 nulls
            return;
        }

        // Read ALL relevant filter values from the DOM elements that filter_controller populates/manages
        const langFilter = domElements.filterGroupLanguageSelect?.value || 'all';
        const categoryFilter = domElements.filterGroupCategorySelect?.value || 'all'; // Assumes filterGroupCategorySelect is in YourDomElements
        const nameSearch = (domElements.filterGroupNameInput as HTMLInputElement)?.value.trim() || ''; // Assumes filterGroupNameInput is in YourDomElements

        console.log("ShellController: applyGroupFilters - Read from DOM - Lang:", langFilter, "Cat:", categoryFilter, "Name:", nameSearch);

        groupManager.loadAvailableGroups(
            langFilter === 'all' ? null : langFilter,
            categoryFilter === 'all' ? null : categoryFilter,
            nameSearch === '' ? null : nameSearch.toLowerCase() // Pass lowercase or handle in GDM
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
        // const { domElements, chatManager } = getDeps(); 
        // const textInput = domElements?.embeddedMessageTextInput as HTMLInputElement | null;
        // const text = textInput?.value.trim();
        // console.log(`ShellController (DEBUG): Original text would have been: "${text}"`);
    
        // if (text) {
        //     // ACTUAL SENDING LOGIC IS COMMENTED OUT
        //     // const tmh = chatManager?.getTextMessageHandler?.();
        //     // if (tmh && typeof tmh.sendEmbeddedTextMessage === 'function') {
        //     //     const currentTargetId = chatManager?.getCurrentEmbeddedChatTargetId?.();
        //     //     if (currentTargetId) {
        //     //         // tmh.sendEmbeddedTextMessage(text, currentTargetId); 
        //     //         if (textInput) textInput.value = ""; 
        //     //     } else {
        //     //         console.warn("ShellController (DEBUG): No current embedded chat target ID if it were to send.");
        //     //     }
        //     // } else {
        //     //     console.error("ShellController (DEBUG): TextMessageHandler or its sendEmbeddedTextMessage method not available if it were to send.");
        //     // }
        // }
        
        // For testing, we might still want to clear the input to mimic user expectation,
        // but only if this function IS the one that should be clearing it.
        // Let's leave it commented for now to see if another handler clears it.
        // const { domElements } = getDeps();
        // const textInput = domElements?.embeddedMessageTextInput as HTMLInputElement | null;
        // if (textInput) {
        //      console.log("ShellController (DEBUG): Intentionally NOT clearing input from this function for testing.");
        //      // textInput.value = ""; 
        // }
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
// --- END OF REPLACEMENT ---
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

   // --- START OF REPLACEMENT (APP.X1) ---
} // End of initializeActualShellController


// --- START OF NEW DEPENDENCY MANAGEMENT for ShellController (SC.1) ---
// --- START OF NEW DEPENDENCY MANAGEMENT for ShellController (SC.IMPLEMENT_DEPS) ---
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
    { eventName: 'polyglotDataReady', windowObjectKey: 'polyglotFilterLanguages' } , // For populateFilterDropdowns (polyglotFilterLanguages is from polyglotDataReady)
   { 
    eventName: 'chatActiveTargetManagerReady', 
    windowObjectKey: 'chatActiveTargetManager', 
    keyFunction: 'setEmbeddedChatTargetId' // Or another key method like getEmbeddedChatTargetId
},
    // Add ChatUiManager if it's used directly by shell_controller and not just via other managers
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
// --- END OF NEW DEPENDENCY MANAGEMENT for ShellController (SC.IMPLEMENT_DEPS) ---
console.log("js/ui/shell_controller.ts: Script execution finished. Initialization is event-driven or direct.");