// js/ui/shell_controller.js
window.shellController = (() => {
    console.log("ShellController IIFE STARTING"); // LOG ADDED

    const getDeps = () => ({
        domElements: window.domElements,
        modalHandler: window.modalHandler,
        cardRenderer: window.cardRenderer,
        listRenderer: window.listRenderer,
        polyglotHelpers: window.polyglotHelpers,
        activityManager: window.activityManager,
        uiUpdater: window.uiUpdater,
        chatManager: window.chatManager,
        groupManager: window.groupManager,
        sessionManager: window.sessionManager,
        polyglotSharedContent: window.polyglotSharedContent
    });

    let currentActiveTab = 'home';

    function initializeAppShell() {
        const { domElements, polyglotHelpers } = getDeps();
        console.log("ShellController: initializeAppShell - domElements:", domElements);

        if (!domElements?.appShell) {
            console.error("ShellController: App shell container (appShell) not found in domElements!");
            return;
        }

        currentActiveTab = polyglotHelpers?.loadFromLocalStorage('polyglotLastActiveTab') || 'home';
        console.log("ShellController: initializeAppShell - Loaded currentActiveTab:", currentActiveTab);

        switchView(currentActiveTab);
        populateHomepageTips();
        populateFilterDropdowns();
        setupShellEventListeners();
        initializeTheme();
        console.log("ui/shell_controller.js: Shell Initialized and initializeAppShell COMPLETED."); // MODIFIED LOG
    }

    function setupShellEventListeners() {
        const { domElements, modalHandler, groupManager, chatManager } = getDeps();
        // console.log("ShellController: setupShellEventListeners - domElements:", domElements);

        if (!domElements || !modalHandler) {
            console.warn("ShellController: Missing domElements or modalHandler for event listeners.");
            return;
        }

        if (domElements.themeToggleButton) {
            // console.log("ShellController: setupShellEventListeners - Adding theme toggle listener.");
            domElements.themeToggleButton.addEventListener('click', toggleTheme);
        }

        if (domElements.mainNavItems) {
            // console.log("ShellController: setupShellEventListeners - Adding navigation item listeners.");
            domElements.mainNavItems.forEach(item => item.addEventListener('click', handleTabSwitchEvent));
        }

        if (domElements.closePersonaModalBtn) {
            domElements.closePersonaModalBtn.addEventListener('click', () => {
                cleanupModalData();
                modalHandler.close(domElements.detailedPersonaModal);
            });
        }
        if (domElements.detailedPersonaModal) {
            domElements.detailedPersonaModal.addEventListener('click', (event) => {
                if (event.target === domElements.detailedPersonaModal) {
                    cleanupModalData();
                    modalHandler.close(domElements.detailedPersonaModal);
                }
            });
        }
        if(domElements.personaModalMessageBtn) domElements.personaModalMessageBtn.addEventListener('click', () => handlePersonaModalAction('message_modal'));
        if(domElements.personaModalVoiceChatBtn) domElements.personaModalVoiceChatBtn.addEventListener('click', () => handlePersonaModalAction('voiceChat_modal'));
        if(domElements.personaModalDirectCallBtn) domElements.personaModalDirectCallBtn.addEventListener('click', () => handlePersonaModalAction('direct_modal'));
        if (domElements.applyFiltersBtn) domElements.applyFiltersBtn.addEventListener('click', applyFindFilters);
        if (domElements.applyGroupFiltersBtn) domElements.applyGroupFiltersBtn.addEventListener('click', applyGroupFilters);
        if (domElements.sendGroupMessageBtn && domElements.groupChatInput) {
            domElements.sendGroupMessageBtn.addEventListener('click', handleSendGroupMessage);
            domElements.groupChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); }
                else if (groupManager?.userIsTyping) groupManager.userIsTyping();
            });
        }
        if (domElements.leaveGroupBtn) domElements.leaveGroupBtn.addEventListener('click', () => groupManager?.leaveCurrentGroup());
        if (domElements.embeddedMessageSendBtn && domElements.embeddedMessageTextInput) {
            domElements.embeddedMessageSendBtn.addEventListener('click', handleSendEmbeddedMessage);
            domElements.embeddedMessageTextInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendEmbeddedMessage();
                }
            });
        }
        if (domElements.embeddedMessageAttachBtn && domElements.embeddedMessageImageUpload) {
            domElements.embeddedMessageAttachBtn.addEventListener('click', () => domElements.embeddedMessageImageUpload.click());
            domElements.embeddedMessageImageUpload.addEventListener('change', handleEmbeddedImageUploadEvent);
        }
    }

    function handleTabSwitchEvent(e) {
        e.preventDefault();
        const targetTab = e.currentTarget.dataset.tab;
        // console.log("ShellController: handleTabSwitchEvent - Switching to tab:", targetTab);

        if (targetTab && targetTab !== currentActiveTab) {
            switchView(targetTab);
        }
    }

    function switchView(targetTab) {
        const { domElements, listRenderer, uiUpdater, chatManager, groupManager, sessionManager, polyglotHelpers } = getDeps();
        console.log(`ShellController: switchView - Attempting to switch to targetTab: '${targetTab}' (current: ${currentActiveTab})`);

        if (!targetTab || !domElements?.mainNavItems || !domElements.mainViews || !domElements.rightSidebarPanels) {
            console.warn("ShellController.switchView: ABORTING - Missing critical DOM elements for tab switching.");
            return;
        }

        currentActiveTab = targetTab;
        // console.log("ShellController: switchView - Updated currentActiveTab:", currentActiveTab);

        polyglotHelpers?.saveToLocalStorage('polyglotLastActiveTab', currentActiveTab);

        domElements.mainNavItems.forEach(i => i.classList.toggle('active', i.dataset.tab === targetTab));
        domElements.mainViews.forEach(view => view.classList.toggle('active-view', view.id === `${targetTab}-view`));
        domElements.rightSidebarPanels.forEach(panel => panel.classList.remove('active-panel'));

        const rightPanelMap = {
            'find': 'findFiltersPanel',
            'groups': 'groupsFiltersPanel',
            'messages': 'messagesChatListPanel',
            'summary': 'summaryChatListPanel'
        };
        const targetRightPanelKey = rightPanelMap[targetTab];
        // console.log("ShellController: switchView - Target right panel key:", targetRightPanelKey);

        if (targetRightPanelKey && domElements[targetRightPanelKey]) {
            domElements[targetRightPanelKey].classList.add('active-panel');
        } else if (targetRightPanelKey) {
            console.warn(`ShellController: Right sidebar panel DOM element '${targetRightPanelKey}' not found.`);
        }

        if (targetTab === 'find') {
            console.log("ShellController: switchView - Activating 'find' tab specifics.");
            applyFindFilters();
        } else if (targetTab === 'groups') {
            console.log("ShellController: switchView - Activating 'groups' tab specifics.");
            if (domElements.groupChatInterfaceDiv) domElements.groupChatInterfaceDiv.style.display = 'none';
            if (domElements.groupListContainer) domElements.groupListContainer.style.display = 'block';
            if (groupManager?.loadAvailableGroups) groupManager.loadAvailableGroups();
        } else if (targetTab === 'messages') {
            console.log("ShellController: switchView - Activating 'messages' tab specifics. Calling chatManager.handleMessagesTabActive()");
            chatManager?.handleMessagesTabActive();
        } else if (targetTab === 'summary') {
            console.log("ShellController: switchView - Activating 'summary' tab specifics.");
            if (sessionManager && listRenderer) {
                listRenderer.renderSummaryList(sessionManager.getCompletedSessions(), sessionManager.showSessionRecapInView);
            }
            if (uiUpdater?.displaySummaryInView) uiUpdater.displaySummaryInView(null);
        }

        updateEmptyListMessages();
        console.log(`ShellController: switchView - COMPLETED for targetTab: '${targetTab}'`);
    }

    function populateHomepageTips() {
        console.log("ShellController: populateHomepageTips - Function called.");
        const { domElements, polyglotHelpers, polyglotSharedContent } = getDeps();

        if (!domElements?.homepageTipsList) {
            console.error("ShellController: populateHomepageTips - domElements.homepageTipsList is missing!");
            return;
        }
        if (!polyglotSharedContent) { // Check parent object
            console.error("ShellController: populateHomepageTips - polyglotSharedContent is missing or undefined!");
            return;
        }
        if (!polyglotSharedContent.homepageTips) { // Then check specific property
            console.error("ShellController: populateHomepageTips - polyglotSharedContent.homepageTips is missing or undefined!");
            return;
        }
        if (!polyglotHelpers) {
            console.error("ShellController: populateHomepageTips - polyglotHelpers is missing!");
            return;
        }

        console.log("ShellController: populateHomepageTips - Dependencies OK. Tips data:", JSON.stringify(polyglotSharedContent.homepageTips));

        const tips = polyglotSharedContent.homepageTips;
        if (Array.isArray(tips) && tips.length > 0) {
             domElements.homepageTipsList.innerHTML = tips.map(tip => {
                const sanitizedTip = polyglotHelpers.sanitizeTextForDisplay(tip);
                return `<li><i class="fas fa-check-circle tip-icon"></i> ${sanitizedTip}</li>`;
            }).join('');
            console.log("ShellController: populateHomepageTips - Tips populated.");
        } else {
            console.warn("ShellController: populateHomepageTips - homepageTips is not a non-empty array. Content:", tips);
            domElements.homepageTipsList.innerHTML = "<li>No tips available at the moment.</li>";
        }
    }

    function applyFindFilters() {
        const { domElements, chatManager } = getDeps();
        // console.log("ShellController: applyFindFilters - Called.");

        if (!domElements || !chatManager) {
            console.warn("ShellController: applyFindFilters - Missing domElements or chatManager.");
            return;
        }

        const filters = {
            language: domElements.filterLanguageSelect?.value || 'all',
            role: domElements.filterRoleSelect?.value || 'all',
        };

        console.log("ShellController: applyFindFilters - Filters to apply:", filters);
        chatManager.filterAndDisplayConnectors(filters);
    }

    function applyGroupFilters() {
        const { domElements, groupManager } = getDeps();
        // console.log("ShellController: applyGroupFilters - Called.");

        if (!domElements || !groupManager) {
            console.warn("ShellController: applyGroupFilters - Missing domElements or groupManager.");
            return;
        }

        const langFilter = domElements.filterGroupLanguageSelect?.value || 'all';
        console.log("ShellController: applyGroupFilters - Language filter to apply:", langFilter);
        groupManager.loadAvailableGroups(langFilter === 'all' ? null : langFilter);
    }

    function populateFilterDropdowns() {
        const { domElements, polyglotHelpers } = getDeps();
        // console.log("ShellController: populateFilterDropdowns - Called.");

        if (!domElements || !polyglotHelpers) {
            console.warn("ShellController: populateFilterDropdowns - Missing domElements or polyglotHelpers.");
            return;
        }

        const languages = window.polyglotFilterLanguages || [];
        // console.log("ShellController: populateFilterDropdowns - Languages available for dropdowns:", languages);

        [domElements.filterLanguageSelect, domElements.filterGroupLanguageSelect].forEach(selectEl => {
            if (!selectEl) return;
            selectEl.innerHTML = '';
            languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.value;
                const flagEmoji = lang.flagCode ? polyglotHelpers.getFlagEmoji(lang.flagCode) : '';
                option.textContent = `${flagEmoji} ${polyglotHelpers.sanitizeTextForDisplay(lang.name)}`.trim();
                selectEl.appendChild(option);
            });
        });

        if (domElements.filterRoleSelect) {
            const roles = window.polyglotFilterRoles || [{ name: "Any Role", value: "all" }];
            // console.log("ShellController: populateFilterDropdowns - Roles available for dropdown:", roles);
            domElements.filterRoleSelect.innerHTML = '';
            roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.value;
                option.textContent = polyglotHelpers.sanitizeTextForDisplay(role.name);
                domElements.filterRoleSelect.appendChild(option);
            });
        }
    }


    function initializeTheme() {
        const { domElements, polyglotHelpers } = getDeps();
        if (!domElements || !polyglotHelpers) return;
        const savedTheme = polyglotHelpers.loadFromLocalStorage('polyglotConnectTheme') || 'light';
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        if(domElements.themeToggleButton) {
            domElements.themeToggleButton.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            domElements.themeToggleButton.setAttribute('aria-label', savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }

    function toggleTheme() {
        const { domElements, polyglotHelpers } = getDeps();
        if (!domElements || !polyglotHelpers) return;
        document.body.classList.toggle('dark-mode');
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        polyglotHelpers.saveToLocalStorage('polyglotConnectTheme', currentTheme);
        if (domElements.themeToggleButton) {
            domElements.themeToggleButton.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            domElements.themeToggleButton.setAttribute('aria-label', currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }

    function openDetailedPersonaModalInternal(connector) {
        const { domElements, modalHandler, polyglotHelpers, activityManager } = getDeps();
        if (!connector?.id || !domElements?.detailedPersonaModal || !modalHandler || !polyglotHelpers || !activityManager) {
            console.error("ShellController.openDetailedPersonaModalInternal: Cannot open modal - missing critical dependencies or connector ID.", { connectorId: connector?.id });
            return;
        }
        try {
            domElements.personaModalAvatar.src = connector.avatarModern || 'images/placeholder_avatar.png';
            domElements.personaModalAvatar.onerror = () => { domElements.personaModalAvatar.src = 'images/placeholder_avatar.png'; };
            domElements.personaModalName.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Unknown');
            const ageText = connector.age && connector.age !== "N/A" ? `${connector.age} yrs` : 'Age N/A';
            const locationText = `${polyglotHelpers.sanitizeTextForDisplay(connector.city || 'City N/A')}, ${polyglotHelpers.sanitizeTextForDisplay(connector.country || 'Country N/A')}`;
            domElements.personaModalLocationAge.textContent = `${locationText} | ${ageText}`;
            const isActive = activityManager.isConnectorActive(connector);
            domElements.personaModalActiveStatus.classList.toggle('active', isActive);
            domElements.personaModalActiveStatus.title = isActive ? "This person is currently active" : "This person is currently inactive";
            domElements.personaModalBio.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.bioModern || "This user hasn't written a bio yet.");

            if (modalHandler.renderLanguageSection) {
                modalHandler.renderLanguageSection(connector);
            } else {
                console.warn("ShellController: modalHandler.renderLanguageSection not found. Language section rendering will be skipped.");
                if (domElements.personaModalLanguagesUl) domElements.personaModalLanguagesUl.innerHTML = "<li>Language information unavailable.</li>";
            }

            domElements.personaModalInterestsUl.innerHTML = '';
            if (connector.interests && connector.interests.length > 0) {
                connector.interests.forEach(interest => {
                    const li = document.createElement('li');
                    li.className = 'interest-tag';
                    li.textContent = polyglotHelpers.sanitizeTextForDisplay(interest.charAt(0).toUpperCase() + interest.slice(1));
                    domElements.personaModalInterestsUl.appendChild(li);
                });
            } else {
                domElements.personaModalInterestsUl.innerHTML = "<li class='interest-tag-none'>No interests listed.</li>";
            }

            if (connector.galleryImageFiles?.length > 0) {
                domElements.personaModalGallery.innerHTML = `<p>${connector.galleryImageFiles.length} photos (gallery display feature coming soon).</p>`;
            } else {
                domElements.personaModalGallery.innerHTML = `<div class="gallery-placeholder-content"><i class="fas fa-images"></i><p>No photos shared yet.</p></div>`;
            }

            domElements.detailedPersonaModal.dataset.connectorId = connector.id;
            modalHandler.open(domElements.detailedPersonaModal);
        } catch (error) {
            console.error("Error populating persona modal:", error, "Connector data:", connector);
            modalHandler.close(domElements.detailedPersonaModal);
            cleanupModalData();
        }
    }

    function cleanupModalData() {
        const { domElements } = getDeps();
        if (domElements?.detailedPersonaModal) {
            domElements.detailedPersonaModal.dataset.connectorId = '';
        }
    }

    function handlePersonaModalAction(actionType) {
        const { domElements, modalHandler } = getDeps();
        if (!domElements?.detailedPersonaModal || !modalHandler) {
             console.error("ShellController.handlePersonaModalAction: Missing domElements.detailedPersonaModal or modalHandler.");
             return;
        }
        const connectorId = domElements.detailedPersonaModal.dataset.connectorId;
        if (!connectorId) {
            console.error("ShellController: No connector ID found on persona modal for action.");
            return;
        }
        const connector = (window.polyglotConnectors || []).find(c => c.id === connectorId);
        if (!connector) {
            console.error(`ShellController: Connector with ID '${connectorId}' not found.`);
            return;
        }

        modalHandler.close(domElements.detailedPersonaModal);
        cleanupModalData();

        if (window.polyglotApp?.initiateSession) {
            window.polyglotApp.initiateSession(connector, actionType);
        } else {
            console.error("ShellController: polyglotApp.initiateSession function is not available.");
        }
    }

    function updateEmptyListMessages() {
        const { domElements } = getDeps();
        if (!domElements) return;
        if (domElements.chatListUl && domElements.emptyChatListMsg) {
            domElements.emptyChatListMsg.style.display = domElements.chatListUl.children.length === 0 ? 'block' : 'none';
        }
        if (domElements.summaryListUl && domElements.emptySummaryListMsg) {
            domElements.emptySummaryListMsg.style.display = domElements.summaryListUl.children.length === 0 ? 'block' : 'none';
        }
        if (domElements.availableGroupsUl && domElements.groupLoadingMessage) {
            const hasGroups = domElements.availableGroupsUl.children.length > 0;
            let message = '';
            if (!hasGroups) {
                const currentFilterValue = domElements.filterGroupLanguageSelect?.value || 'all';
                message = currentFilterValue !== 'all' ? 'No groups match your current filter.' : 'No groups available at the moment.';
            }
            domElements.groupLoadingMessage.textContent = message;
            domElements.groupLoadingMessage.style.display = message ? 'block' : 'none';
        }
    }

    function handleSendGroupMessage() { getDeps().groupManager?.handleUserMessageInGroup(); }
    function handleSendEmbeddedMessage() {
        const { domElements, chatManager } = getDeps();
        const text = domElements?.embeddedMessageTextInput?.value.trim();
        if (text && chatManager?.sendEmbeddedTextMessage) {
            chatManager.sendEmbeddedTextMessage(text);
        }
    }
    function handleEmbeddedImageUploadEvent(event) { getDeps().chatManager?.handleEmbeddedImageUpload(event); }

    // console.log("ui/shell_controller.js loaded with debugging logs.");
    return {
        initializeAppShell,
        openDetailedPersonaModal: openDetailedPersonaModalInternal,
        switchView,
        updateEmptyListMessages,
        showEmbeddedChat: (connector) => {
            const { domElements, uiUpdater } = getDeps();
            console.log("%cShellController: showEmbeddedChat CALLED", "color: green; font-weight: bold;", "With connector:", connector ? JSON.parse(JSON.stringify(connector)) : "UNDEFINED/NULL");

            if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder || !uiUpdater || !connector) {
                console.error("ShellController.showEmbeddedChat: ABORTING - Missing critical elements or connector.", {
                    hasEmbContainer: !!domElements?.embeddedChatContainer,
                    hasPlaceholder: !!domElements?.messagesPlaceholder,
                    hasUiUpdater: !!uiUpdater,
                    hasConnector: !!connector
                });
                return;
            }
            console.log("ShellController.showEmbeddedChat: Dependencies OK. Setting display styles.");

            domElements.messagesPlaceholder.style.display = 'none';
            domElements.embeddedChatContainer.style.display = 'flex';
            uiUpdater.updateEmbeddedChatHeader(connector);
            // uiUpdater.clearEmbeddedChatLog(); // This is now done by chatManager.openConversation before populating
            // uiUpdater.clearEmbeddedChatInput(); // Also done by chatManager.openConversation
            if (domElements.embeddedMessageTextInput) domElements.embeddedMessageTextInput.focus();
        },
        hideEmbeddedChat: () => {
            const { domElements } = getDeps();
            console.log("ShellController: hideEmbeddedChat - Hiding embedded chat.");

            if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder) {
                 console.warn("ShellController.hideEmbeddedChat: Missing embeddedChatContainer or messagesPlaceholder.");
                return;
            }

            domElements.embeddedChatContainer.style.display = 'none';
            domElements.messagesPlaceholder.style.display = 'block';
            if (domElements.messagesTabHeader) domElements.messagesTabHeader.textContent = "Your Conversations";
        },
        showGroupChatInterface: (groupName, members) => {
            const { domElements, uiUpdater } = getDeps();
            if (!domElements?.groupListContainer || !domElements.groupChatInterfaceDiv || !uiUpdater) {
                console.warn("ShellController.showGroupChatInterface: Missing critical elements.");
                return;
            }
            domElements.groupListContainer.style.display = 'none';
            domElements.groupChatInterfaceDiv.style.display = 'flex';
            uiUpdater.updateGroupChatHeader(groupName, members);
            uiUpdater.clearGroupChatLog();
            if (domElements.groupChatInput) domElements.groupChatInput.focus();
        },
        hideGroupChatInterface: () => {
            const { domElements, groupManager } = getDeps();
            if (!domElements?.groupListContainer || !domElements.groupChatInterfaceDiv) return;
            domElements.groupChatInterfaceDiv.style.display = 'none';
            domElements.groupListContainer.style.display = 'block';
            groupManager?.loadAvailableGroups();
        },
    };
})();

// console.log("ui/shell_controller.js loaded. window.shellController object:", window.shellController); // From your paste
if (!window.shellController) {
    console.error("Failed to initialize window.shellController in shell_controller.js AFTER IIFE execution.");
}

// At the very, very end of js/ui/shell_controller.js
console.log("SHELL_CONTROLLER.JS FULLY PARSED AND EXECUTED. window.shellController:", window.shellController); // LOG ADDED