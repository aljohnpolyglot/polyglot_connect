// js/ui/view_manager.js
// Manages view switching, navigation, and view-specific initializations.

window.viewManager = (() => {
    'use strict';
    const getDeps = () => ({
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        uiUpdater: window.uiUpdater,
        chatManager: window.chatOrchestrator, // This is chatOrchestrator
        groupManager: window.groupManager,
        sessionHistoryManager: window.sessionHistoryManager,
        listRenderer: window.listRenderer,
        filterController: window.filterController,
        chatUiManager: window.chatUiManager,
        polyglotSharedContent: window.polyglotSharedContent,
    });

    let currentActiveTab = 'home';
    const getCurrentActiveTab = () => currentActiveTab;

    function initializeAndSwitchToInitialView() {
        const { polyglotHelpers } = getDeps();
        console.log("viewManager: initializeAndSwitchToInitialView - Starting.");
        currentActiveTab = polyglotHelpers?.loadFromLocalStorage('polyglotLastActiveTab') || 'home';
        console.log("viewManager: Initial activeTab:", currentActiveTab);
        setupNavigationEventListeners();
        switchView(currentActiveTab, true); // Pass isInitialLoad = true
        console.log("viewManager: initializeAndSwitchToInitialView - Complete.");
    }

    function setupNavigationEventListeners() {
        const { domElements } = getDeps();
        if (domElements?.mainNavItems && domElements.mainNavItems.length > 0) {
            domElements.mainNavItems.forEach(item => {
                item.addEventListener('click', handleTabSwitchEvent);
            });
            console.log("viewManager: Main navigation event listeners attached to", domElements.mainNavItems.length, "items.");
        } else {
            console.warn("viewManager: Main navigation items (domElements.mainNavItems) not found or empty.");
        }
    }

    function handleTabSwitchEvent(e) {
        e.preventDefault();
        const targetTab = e.currentTarget.dataset.tab;
        if (targetTab && targetTab !== currentActiveTab) {
            switchView(targetTab);
        }
    }

    function setActiveRightSidebarPanel(panelIdToShow) {
        const { domElements } = getDeps();
        if (!domElements?.rightSidebarPanels) {
            console.error("ViewManager: setActiveRightSidebarPanel - domElements.rightSidebarPanels NodeList is MISSING.");
            return;
        }
        if (domElements.rightSidebarPanels.length === 0) {
            console.warn("ViewManager: setActiveRightSidebarPanel - domElements.rightSidebarPanels is EMPTY. No panels to manage.");
            return;
        }

        let panelFoundAndActivated = false;
        // console.log("ViewManager: setActiveRightSidebarPanel - Available panels:", Array.from(domElements.rightSidebarPanels).map(p => p.id));

        domElements.rightSidebarPanels.forEach(panel => {
            if (panel.id === panelIdToShow) {
                panel.classList.add('active-panel');
                panelFoundAndActivated = true;
                // console.log(`ViewManager: Activated panel '${panel.id}'`);
            } else {
                panel.classList.remove('active-panel');
            }
        });

        if (panelIdToShow && !panelFoundAndActivated) {
            console.error(`ViewManager: setActiveRightSidebarPanel - TARGET Panel with ID '${panelIdToShow}' was NOT FOUND among domElements.rightSidebarPanels.`);
        } else if (!panelIdToShow) {
            // console.log("ViewManager: setActiveRightSidebarPanel - No panelIdToShow provided, all panels deactivated (hidden).");
        }
    }


    function switchView(targetTab, isInitialLoad = false) {
        const { domElements, listRenderer, uiUpdater, chatManager, groupManager, sessionHistoryManager, polyglotHelpers, filterController, chatUiManager } = getDeps();
        console.log(`viewManager: switchView - To: '${targetTab}', Current: '${currentActiveTab}', Initial: ${isInitialLoad}`);

        if (!targetTab || !domElements?.mainNavItems || !domElements.mainViews) {
            console.error("viewManager: switchView - Missing critical DOM elements for tab switching. Aborting.");
            return;
        }

        const previousTab = currentActiveTab;
        currentActiveTab = targetTab;
        polyglotHelpers?.saveToLocalStorage('polyglotLastActiveTab', currentActiveTab);

        domElements.mainNavItems.forEach(i => i.classList.toggle('active', i.dataset.tab === targetTab));
        domElements.mainViews.forEach(view => {
            view.classList.toggle('active-view', view.id === `${targetTab}-view`);
        });

        let rightPanelIdToShow = null;
        if (targetTab === 'find') {
            rightPanelIdToShow = 'findFiltersPanel';
        } else if (targetTab === 'groups') {
            if (groupManager?.getCurrentGroupData()) {
                rightPanelIdToShow = 'messagesChatListPanel'; // Show active chats if in a group
            } else {
                rightPanelIdToShow = 'groupsFiltersPanel'; // Default to group filters
            }
        } else if (targetTab === 'messages') {
            rightPanelIdToShow = 'messagesChatListPanel';
        } else if (targetTab === 'summary') {
            rightPanelIdToShow = 'summaryChatListPanel';
        } else if (targetTab === 'home') {
            rightPanelIdToShow = null; // No right sidebar panel for home
        }
        // console.log(`ViewManager: switchView for tab '${targetTab}', determined rightPanelIdToShow: '${rightPanelIdToShow}'`);
        setActiveRightSidebarPanel(rightPanelIdToShow);


        // Tab-Specific Actions
        if (targetTab === 'home') {
            populateHomepageTips();
        } else if (targetTab === 'find') {
            filterController?.applyFindConnectorsFilters(); // This should render the cards
        } else if (targetTab === 'groups') {
            if (groupManager?.getCurrentGroupData()) {
                // If already in a group (e.g., tab switch away and back), ensure chat UI is visible
                chatUiManager?.showGroupChatView(groupManager.getCurrentGroupData().name, window.groupManager.currentGroupMembers); // Ensure currentGroupMembers is accessible or passed
                chatManager?.renderCombinedActiveChatsList(); // Refresh active chats list in sidebar
            } else {
                // If not in a group, show the group list
                chatUiManager?.hideGroupChatView();
                groupManager?.loadAvailableGroups(); // This renders the list of available groups
            }
        } else if (targetTab === 'messages') {
            // chatManager.handleMessagesTabActive typically renders the combined list
            // and might open the first/last active chat.
            chatManager?.handleMessagesTabActive();
        } else if (targetTab === 'summary') {
            if (sessionHistoryManager) sessionHistoryManager.updateSummaryListUI(); // Renders summary list
            uiUpdater?.displaySummaryInView(null); // Show placeholder initially
        }

        updateEmptyListMessages(); // Call this after content might have changed
        console.log(`viewManager: switchView - Successfully switched to tab: '${targetTab}'`);
    }


    function populateHomepageTips() {
        const { domElements, polyglotHelpers, polyglotSharedContent } = getDeps();
        // console.log("viewManager: populateHomepageTips - Called.");

        if (!domElements?.homepageTipsList) {
            // console.error("viewManager: populateHomepageTips - domElements.homepageTipsList is missing!");
            return;
        }
        if (!polyglotSharedContent?.homepageTips) {
            // console.error("viewManager: populateHomepageTips - polyglotSharedContent.homepageTips is missing or undefined!");
            if (domElements.homepageTipsList) domElements.homepageTipsList.innerHTML = "<li>No tips available.</li>";
            return;
        }
        if (!polyglotHelpers) {
            // console.error("viewManager: populateHomepageTips - polyglotHelpers is missing!");
            return;
        }

        const tips = polyglotSharedContent.homepageTips;
        if (Array.isArray(tips) && tips.length > 0) {
            domElements.homepageTipsList.innerHTML = tips.map(tip =>
                `<li><i class="fas fa-check-circle tip-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(tip)}</li>`
            ).join('');
            // console.log("viewManager: Homepage tips populated.");
        } else {
            // console.warn("viewManager: populateHomepageTips - homepageTips is not a non-empty array. Content:", tips);
            domElements.homepageTipsList.innerHTML = "<li>Tips are loading or unavailable.</li>";
        }
    }

    function updateEmptyListMessages() {
        const { domElements, filterController } = getDeps(); // Added filterController
        if (!domElements) {
            // console.warn("viewManager: updateEmptyListMessages - domElements not available.");
            return;
        }

        // Active Chats List (Messages Tab, Groups Tab when in a group)
        if (domElements.chatListUl && domElements.emptyChatListMsg) {
            const hasItems = domElements.chatListUl.children.length > 0;
            domElements.emptyChatListMsg.style.display = hasItems ? 'none' : 'block';
            domElements.emptyChatListMsg.textContent = "No active chats."; // Default message
        }

        // Session History List (Summary Tab)
        if (domElements.summaryListUl && domElements.emptySummaryListMsg) {
            const hasItems = domElements.summaryListUl.children.length > 0;
            domElements.emptySummaryListMsg.style.display = hasItems ? 'none' : 'block';
            domElements.emptySummaryListMsg.textContent = "No session history."; // Default message
        }

        // Available Groups List (Groups Tab when not in a group)
        if (domElements.availableGroupsUl && domElements.groupLoadingMessage) {
            const hasItems = domElements.availableGroupsUl.children.length > 0;
            let message = '';
            if (!hasItems) {
                // Check if filters are applied from filterController or domElements
                const groupLangFilterValue = domElements.filterGroupLanguageSelect?.value;
                if (groupLangFilterValue && groupLangFilterValue !== 'all') {
                    message = 'No groups match your current filter.';
                } else {
                    message = 'No groups available at the moment. Check back later!';
                }
            }
            domElements.groupLoadingMessage.textContent = message;
            domElements.groupLoadingMessage.style.display = message ? 'block' : 'none'; // Show if message is not empty
        }

        // Connector Hub (Find Tab) - Assuming a similar pattern
        if (domElements.connectorHub && domElements.connectorHub.querySelector('.loading-message')) {
            const loadingMsgEl = domElements.connectorHub.querySelector('.loading-message');
            const hasCards = domElements.connectorHub.querySelectorAll('.connector-card').length > 0;
            if (hasCards) {
                loadingMsgEl.style.display = 'none';
            } else {
                // Message could depend on whether filters are active
                const langFilterValue = domElements.filterLanguageSelect?.value;
                const roleFilterValue = domElements.filterRoleSelect?.value;
                if ((langFilterValue && langFilterValue !== 'all') || (roleFilterValue && roleFilterValue !== 'all')) {
                    loadingMsgEl.textContent = 'No connectors match your current filters.';
                } else {
                    loadingMsgEl.textContent = 'No connectors available. Try adjusting filters or check back later.';
                }
                loadingMsgEl.style.display = 'block';
            }
        }
    }


    function displaySessionSummaryInView(sessionDataOrId) {
        // console.log("viewManager: displaySessionSummaryInView called with:", sessionDataOrId);
        const { uiUpdater, sessionHistoryManager } = getDeps();
        let sessionData = sessionDataOrId;

        if (typeof sessionDataOrId === 'string') { // If only ID is passed
            sessionData = sessionHistoryManager?.getSessionById(sessionDataOrId);
        }

        if (uiUpdater?.displaySummaryInView) {
            if (sessionData) {
                uiUpdater.displaySummaryInView(sessionData);
            } else {
                // console.warn("viewManager: No session data found for summary display:", sessionDataOrId);
                uiUpdater.displaySummaryInView(null); // Show placeholder if no data
            }
        } else {
            console.error("viewManager: uiUpdater.displaySummaryInView is not available.");
        }
    }

    console.log("js/ui/view_manager.js loaded.");
    return {
        initializeAndSwitchToInitialView,
        switchView,
        updateEmptyListMessages,
        displaySessionSummaryInView,
        setActiveRightSidebarPanel,
        getCurrentActiveTab
    };
})();