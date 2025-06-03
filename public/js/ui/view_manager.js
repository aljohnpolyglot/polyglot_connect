// js/ui/view_manager.js
// Manages view switching, navigation, and view-specific initializations.

console.log("view_manager.js: Script execution STARTED.");

window.viewManager = (() => {
    'use strict';
    console.log("view_manager.js: IIFE (module definition) STARTING.");

    const getDeps = () => {
        console.log("view_manager.js: getDeps() called.");
        const deps = {
            domElements: window.domElements,
            polyglotHelpers: window.polyglotHelpers,
            uiUpdater: window.uiUpdater,
            chatOrchestrator: window.chatOrchestrator, // Corrected name for chatManager/chatOrchestrator
            groupManager: window.groupManager,
            sessionHistoryManager: window.sessionHistoryManager,
            listRenderer: window.listRenderer,
            filterController: window.filterController,
            chatUiManager: window.chatUiManager,
            polyglotSharedContent: window.polyglotSharedContent,
        };
        // Log critical dependencies for viewManager
        console.log("view_manager.js: getDeps() - domElements:", !!deps.domElements);
        console.log("view_manager.js: getDeps() - polyglotHelpers:", !!deps.polyglotHelpers);
        console.log("view_manager.js: getDeps() - groupManager:", !!deps.groupManager);
        console.log("view_manager.js: getDeps() - chatUiManager:", !!deps.chatUiManager);
        console.log("view_manager.js: getDeps() - chatOrchestrator:", !!deps.chatOrchestrator);
        return deps;
    };

    let currentActiveTab = 'home';
    const getCurrentActiveTab = () => {
        // console.log("view_manager.js: getCurrentActiveTab() returning:", currentActiveTab);
        return currentActiveTab;
    };

    function initializeAndSwitchToInitialView() {
        console.log("view_manager.js: initializeAndSwitchToInitialView() - START.");
        const { polyglotHelpers } = getDeps();
        if (!polyglotHelpers) {
            console.error("ViewManager: initializeAndSwitchToInitialView - polyglotHelpers is MISSING! Cannot load last active tab.");
            currentActiveTab = 'home'; // Default
        } else {
            currentActiveTab = polyglotHelpers.loadFromLocalStorage('polyglotLastActiveTab') || 'home';
        }
        console.log("view_manager.js: Initial activeTab determined as:", currentActiveTab);
        setupNavigationEventListeners();
        switchView(currentActiveTab, true); // Pass isInitialLoad = true
        console.log("view_manager.js: initializeAndSwitchToInitialView() - FINISHED.");
    }

    function setupNavigationEventListeners() {
        console.log("view_manager.js: setupNavigationEventListeners() - START.");
        const { domElements } = getDeps();
        if (domElements?.mainNavItems && domElements.mainNavItems.length > 0) {
            domElements.mainNavItems.forEach(item => {
                // Ensure no duplicate listeners
                item.removeEventListener('click', handleTabSwitchEvent);
                item.addEventListener('click', handleTabSwitchEvent);
            });
            console.log("view_manager.js: Main navigation event listeners attached to", domElements.mainNavItems.length, "items.");
        } else {
            console.warn("view_manager.js: Main navigation items (domElements.mainNavItems) not found or empty.");
        }
        console.log("view_manager.js: setupNavigationEventListeners() - FINISHED.");
    }

    function handleTabSwitchEvent(e) {
        console.log("view_manager.js: handleTabSwitchEvent() - Event target:", e.currentTarget);
        e.preventDefault();
        const targetTab = e.currentTarget.dataset.tab;
        console.log("view_manager.js: handleTabSwitchEvent - Target tab from dataset:", targetTab, "Current active tab:", currentActiveTab);
        if (targetTab && targetTab !== currentActiveTab) {
            switchView(targetTab);
        } else if (targetTab === currentActiveTab) {
            console.log("view_manager.js: handleTabSwitchEvent - Clicked on already active tab:", targetTab);
        } else {
            console.warn("view_manager.js: handleTabSwitchEvent - No targetTab found in dataset or invalid event.");
        }
    }

    function setActiveRightSidebarPanel(panelIdToShow) {
        // console.log("view_manager.js: setActiveRightSidebarPanel() - START. Panel to show:", panelIdToShow);
        const { domElements } = getDeps();
        if (!domElements?.rightSidebarPanels) {
            console.error("ViewManager: setActiveRightSidebarPanel - domElements.rightSidebarPanels NodeList is MISSING.");
            return;
        }
        if (domElements.rightSidebarPanels.length === 0) {
            // console.warn("ViewManager: setActiveRightSidebarPanel - domElements.rightSidebarPanels is EMPTY. No panels to manage.");
            return;
        }

        let panelFoundAndActivated = false;
        domElements.rightSidebarPanels.forEach(panel => {
            if (panel.id === panelIdToShow) {
                panel.classList.add('active-panel');
                panelFoundAndActivated = true;
            } else {
                panel.classList.remove('active-panel');
            }
        });

        if (panelIdToShow && !panelFoundAndActivated) {
            console.error(`ViewManager: setActiveRightSidebarPanel - TARGET Panel with ID '${panelIdToShow}' was NOT FOUND.`);
        }
        // console.log("view_manager.js: setActiveRightSidebarPanel() - FINISHED. Panel activated:", panelFoundAndActivated ? panelIdToShow : "none");
    }


    function switchView(targetTab, isInitialLoad = false) {
        console.log(`view_manager.js: switchView() - START. To: '${targetTab}', Current: '${currentActiveTab}', InitialLoad: ${isInitialLoad}`);
        const { domElements, listRenderer, uiUpdater, chatOrchestrator, groupManager, sessionHistoryManager, polyglotHelpers, filterController, chatUiManager } = getDeps();

        if (!targetTab) {
            console.error("view_manager.js: switchView - targetTab is undefined or null. Aborting.");
            return;
        }
        if (!domElements?.mainNavItems || !domElements.mainViews) {
            console.error("view_manager.js: switchView - Missing critical DOM elements (mainNavItems or mainViews). Aborting.");
            return;
        }
        if (!polyglotHelpers) {
            console.error("view_manager.js: switchView - polyglotHelpers is missing. Cannot save last active tab.");
            // Continue without saving if helpers are missing, but log error.
        }


        const previousTab = currentActiveTab;
        currentActiveTab = targetTab;
        polyglotHelpers?.saveToLocalStorage('polyglotLastActiveTab', currentActiveTab);
        console.log(`view_manager.js: switchView - Active tab changed from '${previousTab}' to '${currentActiveTab}'. Saved to localStorage.`);

        domElements.mainNavItems.forEach(i => i.classList.toggle('active', i.dataset.tab === targetTab));
        domElements.mainViews.forEach(view => {
            view.classList.toggle('active-view', view.id === `${targetTab}-view`);
        });
        console.log(`view_manager.js: switchView - Updated active classes for nav items and views for tab '${targetTab}'.`);

        let rightPanelIdToShow = null;
        if (targetTab === 'find') {
            rightPanelIdToShow = 'findFiltersPanel';
        } else if (targetTab === 'groups') {
            if (groupManager?.getCurrentGroupData()) {
                rightPanelIdToShow = 'messagesChatListPanel';
            } else {
                rightPanelIdToShow = 'groupsFiltersPanel';
            }
        } else if (targetTab === 'messages') {
            rightPanelIdToShow = 'messagesChatListPanel';
        } else if (targetTab === 'summary') {
            rightPanelIdToShow = 'summaryChatListPanel';
        } else if (targetTab === 'home') {
            rightPanelIdToShow = null;
        }
        console.log(`ViewManager: switchView for tab '${targetTab}', determined rightPanelIdToShow: '${rightPanelIdToShow}'`);
        setActiveRightSidebarPanel(rightPanelIdToShow);


        // Tab-Specific Actions
        console.log(`view_manager.js: switchView - Performing actions for tab: '${targetTab}'`);
        if (targetTab === 'home') {
            populateHomepageTips();
        } else if (targetTab === 'find') {
            if (filterController?.applyFindConnectorsFilters) {
                filterController.applyFindConnectorsFilters();
            } else console.warn("view_manager.js: filterController.applyFindConnectorsFilters not found for 'find' tab.");
        } else if (targetTab === 'groups') {
            const currentGroup = groupManager?.getCurrentGroupData ? groupManager.getCurrentGroupData() : null;
            console.log("view_manager.js: 'groups' tab - Current group data:", currentGroup);
            if (currentGroup) {
                const groupName = currentGroup.name;
                // CORRECTLY GET MEMBERS: Use the exposed function from groupManager
                const members = groupManager?.getFullCurrentGroupMembers ? groupManager.getFullCurrentGroupMembers() : [];
                console.log("view_manager.js: 'groups' tab - Current group active. Name:", groupName, "Members count:", members.length);

                if (chatUiManager?.showGroupChatView) {
                    if (groupName && members) { // Ensure valid arguments
                        chatUiManager.showGroupChatView(groupName, members);
                    } else {
                        console.error("view_manager.js: 'groups' tab - Attempted to show group chat view with invalid groupName or members.", { groupName, members });
                        // Fallback: hide group chat view and load available groups
                        chatUiManager.hideGroupChatView?.();
                        groupManager.loadAvailableGroups?.();
                    }
                } else console.warn("view_manager.js: chatUiManager.showGroupChatView not found for 'groups' tab (active group).");
                
                if (chatOrchestrator?.renderCombinedActiveChatsList) {
                    chatOrchestrator.renderCombinedActiveChatsList();
                } else console.warn("view_manager.js: chatOrchestrator.renderCombinedActiveChatsList not found for 'groups' tab (active group).");

            } else {
                console.log("view_manager.js: 'groups' tab - No active group. Hiding chat view, loading available groups.");
                if (chatUiManager?.hideGroupChatView) {
                    chatUiManager.hideGroupChatView();
                } else console.warn("view_manager.js: chatUiManager.hideGroupChatView not found for 'groups' tab (no active group).");
                
                if (groupManager?.loadAvailableGroups) {
                    groupManager.loadAvailableGroups();
                } else console.warn("view_manager.js: groupManager.loadAvailableGroups not found for 'groups' tab (no active group).");
            }
        } else if (targetTab === 'messages') {
            console.log("view_manager.js: 'messages' tab - Calling chatOrchestrator.handleMessagesTabActive.");
            if (chatOrchestrator?.handleMessagesTabActive) {
                chatOrchestrator.handleMessagesTabActive();
            } else console.warn("view_manager.js: chatOrchestrator.handleMessagesTabActive not found for 'messages' tab.");
        } else if (targetTab === 'summary') {
            console.log("view_manager.js: 'summary' tab - Updating summary list and displaying placeholder.");
            if (sessionHistoryManager?.updateSummaryListUI) {
                sessionHistoryManager.updateSummaryListUI();
            } else console.warn("view_manager.js: sessionHistoryManager.updateSummaryListUI not found for 'summary' tab.");
            
            if (uiUpdater?.displaySummaryInView) {
                uiUpdater.displaySummaryInView(null);
            } else console.warn("view_manager.js: uiUpdater.displaySummaryInView not found for 'summary' tab.");
        }

        updateEmptyListMessages();
        console.log(`view_manager.js: switchView() - FINISHED switching to tab: '${targetTab}'`);
    }


    function populateHomepageTips() {
        console.log("view_manager.js: populateHomepageTips() - START.");
        const { domElements, polyglotHelpers, polyglotSharedContent } = getDeps();

        if (!domElements?.homepageTipsList) {
            console.error("view_manager.js: populateHomepageTips - domElements.homepageTipsList is missing!");
            return;
        }
        if (!polyglotSharedContent?.homepageTips) {
            console.error("view_manager.js: populateHomepageTips - polyglotSharedContent.homepageTips is missing or undefined!");
            if (domElements.homepageTipsList) domElements.homepageTipsList.innerHTML = "<li>No tips available at this moment.</li>";
            return;
        }
        if (!polyglotHelpers) {
            console.error("view_manager.js: populateHomepageTips - polyglotHelpers is missing!");
            return;
        }

        const tips = polyglotSharedContent.homepageTips;
        if (Array.isArray(tips) && tips.length > 0) {
            domElements.homepageTipsList.innerHTML = tips.map(tip =>
                `<li><i class="fas fa-check-circle tip-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(tip)}</li>`
            ).join('');
            console.log("view_manager.js: Homepage tips populated with", tips.length, "tips.");
        } else {
            console.warn("view_manager.js: populateHomepageTips - homepageTips is not a non-empty array. Content:", tips);
            domElements.homepageTipsList.innerHTML = "<li>Explore the app to discover its features!</li>";
        }
        console.log("view_manager.js: populateHomepageTips() - FINISHED.");
    }

    function updateEmptyListMessages() {
        // console.log("view_manager.js: updateEmptyListMessages() - START.");
        const { domElements, filterController } = getDeps();
        if (!domElements) {
            // console.warn("view_manager.js: updateEmptyListMessages - domElements not available.");
            return;
        }

        if (domElements.chatListUl && domElements.emptyChatListMsg) {
            const hasItems = domElements.chatListUl.children.length > 0;
            domElements.emptyChatListMsg.style.display = hasItems ? 'none' : 'block';
            if (!hasItems) domElements.emptyChatListMsg.textContent = "No active chats.";
        }

        if (domElements.summaryListUl && domElements.emptySummaryListMsg) {
            const hasItems = domElements.summaryListUl.children.length > 0;
            domElements.emptySummaryListMsg.style.display = hasItems ? 'none' : 'block';
            if (!hasItems) domElements.emptySummaryListMsg.textContent = "No session history.";
        }

        if (domElements.availableGroupsUl && domElements.groupLoadingMessage) {
            const hasItems = domElements.availableGroupsUl.children.length > 0;
            let message = '';
            if (!hasItems) {
                const groupLangFilterValue = domElements.filterGroupLanguageSelect?.value;
                if (groupLangFilterValue && groupLangFilterValue !== 'all') {
                    message = 'No groups match your current filter.';
                } else {
                    message = 'No groups available at the moment. Check back later!';
                }
            }
            domElements.groupLoadingMessage.textContent = message;
            domElements.groupLoadingMessage.style.display = message ? 'block' : 'none';
        }

        const connectorHubGrid = domElements.connectorHubGrid; // Changed variable name from connectorHub
        if (connectorHubGrid && connectorHubGrid.querySelector('.loading-message')) {
            const loadingMsgEl = connectorHubGrid.querySelector('.loading-message');
            const hasCards = connectorHubGrid.querySelectorAll('.connector-card').length > 0;
            if (hasCards) {
                loadingMsgEl.style.display = 'none';
            } else {
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
        // console.log("view_manager.js: updateEmptyListMessages() - FINISHED.");
    }


    function displaySessionSummaryInView(sessionDataOrId) {
        console.log("view_manager.js: displaySessionSummaryInView() - START. Input:", sessionDataOrId);
        const { uiUpdater, sessionHistoryManager } = getDeps();
        let sessionData = sessionDataOrId;

        if (typeof sessionDataOrId === 'string') {
            console.log("view_manager.js: Input is a session ID, fetching data...");
            sessionData = sessionHistoryManager?.getSessionById(sessionDataOrId);
            console.log("view_manager.js: Fetched session data for ID", sessionDataOrId, ":", !!sessionData);
        }

        if (uiUpdater?.displaySummaryInView) {
            uiUpdater.displaySummaryInView(sessionData); // Pass null if sessionData is not found
        } else {
            console.error("view_manager.js: uiUpdater.displaySummaryInView is not available.");
        }
        console.log("view_manager.js: displaySessionSummaryInView() - FINISHED.");
    }

    console.log("view_manager.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        initializeAndSwitchToInitialView,
        switchView,
        updateEmptyListMessages,
        displaySessionSummaryInView,
        setActiveRightSidebarPanel,
        getCurrentActiveTab
    };
})();

if (window.viewManager && typeof window.viewManager.initializeAndSwitchToInitialView === 'function') {
    console.log("view_manager.js: SUCCESSFULLY assigned to window.viewManager and initializeAndSwitchToInitialView is present.");
} else {
    console.error("view_manager.js: CRITICAL ERROR - window.viewManager or its initializeAndSwitchToInitialView method IS UNDEFINED/INVALID after IIFE execution.");
}
console.log("view_manager.js: Script execution FINISHED.");