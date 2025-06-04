// js/core/chat_orchestrator.js
// Central orchestrator for chat-related functionalities,
// managing 1-on-1 conversations, group chats, and their UI representation.

console.log("chat_orchestrator.js: Script execution STARTED.");

if (window.chatOrchestrator) {
    console.warn("chat_orchestrator.js: window.chatOrchestrator was ALREADY DEFINED before IIFE assignment.");
}

window.chatOrchestrator = (() => {
    'use strict';
    console.log("chat_orchestrator.js: IIFE (module definition) STARTING.");

    // --- Dependencies needed for the orchestrator's *methods* to function later ---
    // These will be fetched by getResolvedDeps() when methods are called.
    // The IIFE itself should only check for what's needed for its immediate structure, if anything.
    const METHOD_DEPENDENCIES_SPEC = [
        { name: 'domElements', getter: () => window.domElements },
        { name: 'listRenderer', getter: () => window.listRenderer },
        { name: 'uiUpdater', getter: () => window.uiUpdater },
        { name: 'modalHandler', getter: () => window.modalHandler },
        { name: 'conversationManager', getter: () => window.conversationManager, keyFn: 'getActiveConversations' },
        { name: 'groupManager', getter: () => window.groupManager, keyFn: 'getAllGroupDataWithLastActivity' },
        { name: 'chatSessionHandler', getter: () => window.chatSessionHandler, keyFn: 'openConversationInEmbeddedView' },
        { name: 'chatActiveTargetManager', getter: () => window.chatActiveTargetManager, keyFn: 'getEmbeddedChatTargetId' },
        { name: 'textMessageHandler', getter: () => window.textMessageHandler, keyFn: 'sendEmbeddedTextMessage' },
        { name: 'voiceMemoHandler', getter: () => window.voiceMemoHandler, keyFn: 'handleNewVoiceMemoInteraction' },
        { name: 'personaModalManager', getter: () => window.personaModalManager },
        { name: 'cardRenderer', getter: () => window.cardRenderer, keyFn: 'renderCards' },
        { name: 'activityManager', getter: () => window.activityManager },
        { name: 'viewManager', getter: () => window.viewManager, keyFn: 'switchView' }, // Check for key functions
        { name: 'chatUiManager', getter: () => window.chatUiManager, keyFn: 'showEmbeddedChatInterface' } // Check for key functions
    ];

    // Check for absolutely critical modules needed for the orchestrator object's *definition*, if any.
    // For this orchestrator, it mostly provides functions. The actual dependencies are used *within* those functions.
    // Let's assume `textMessageHandler` and `voiceMemoHandler` are needed to construct the getter functions.
    const STRUCTURAL_DEPENDENCIES_SPEC = [
        { name: 'textMessageHandler', getter: () => window.textMessageHandler },
        { name: 'voiceMemoHandler', getter: () => window.voiceMemoHandler },
        // Add other modules if they are directly instantiated or their properties are read during the IIFE
        // For now, keeping it minimal.
    ];

    let allStructuralDepsMet = true;
    let missingStructuralDeps = [];
    console.log("chat_orchestrator.js: IIFE - Checking STRUCTURAL dependencies...");
    STRUCTURAL_DEPENDENCIES_SPEC.forEach(spec => {
        const dep = spec.getter();
        console.log(`chat_orchestrator.js: IIFE - Structural check for '${spec.name}':`, !!dep);
        if (!dep) {
            console.error(`ChatOrchestrator: STRUCTURAL DEPENDENCY MISSING at IIFE definition - window.${spec.name}.`);
            missingStructuralDeps.push(spec.name);
            allStructuralDepsMet = false;
        }
    });

    if (!allStructuralDepsMet) {
        const errorMsgBase = `ChatOrchestrator cannot be properly defined (missing STRUCTURAL dependencies: ${missingStructuralDeps.join(', ')}). Returning dummy object.`;
        console.error(errorMsgBase);
        // Return a dummy object that logs errors for all its expected methods
        const dummy = {};
        ['initialize', 'openConversation', 'openMessageModal', 'handleMessagesTabActive', 
         'filterAndDisplayConnectors', 'renderCombinedActiveChatsList', 'notifyNewActivityInConversation',
         'getTextMessageHandler', 'getVoiceMemoHandler', 'getCurrentEmbeddedChatTargetId', 'getCurrentModalMessageTarget']
        .forEach(methodName => {
            dummy[methodName] = (...args) => {
                console.error(`${errorMsgBase} Method '${methodName}' called but orchestrator is a dummy.`);
                if (methodName.startsWith('get')) return null; // For getters
            };
        });
        return dummy;
    }
    console.log("chat_orchestrator.js: IIFE - All STRUCTURAL dependencies appear to be available.");


    const getResolvedDeps = (isStrictCheck = false) => {
        const resolved = {};
        let allMethodDepsMet = true;
        let missingMethodDeps = [];

        // console.log("chat_orchestrator.js: getResolvedDeps() called. Strict check:", isStrictCheck);

        METHOD_DEPENDENCIES_SPEC.forEach(spec => {
            const dep = spec.getter();
            resolved[spec.name] = dep;
            if (isStrictCheck) {
                const isInvalid = !dep || (spec.keyFn && typeof dep[spec.keyFn] !== 'function');
                if (isInvalid) {
                    console.error(`ChatOrchestrator: getResolvedDeps (STRICT) - METHOD DEPENDENCY MISSING/INVALID - window.${spec.name} (or its keyFn '${spec.keyFn}').`);
                    missingMethodDeps.push(spec.name);
                    allMethodDepsMet = false;
                }
            }
        });

        if (isStrictCheck && !allMethodDepsMet) {
            console.error("ChatOrchestrator: getResolvedDeps (STRICT) - One or more method dependencies failed check. Missing:", missingMethodDeps.join(', '));
            return null; // Indicate failure if strict check and deps are missing
        }
        return resolved;
    };

    function initialize() {
        console.log("ChatOrchestrator: initialize() - START.");
        // Perform a strict check for dependencies needed by initialize AND other core functions that run early.
        const deps = getResolvedDeps(true); // Strict check
        if (!deps) {
            console.error("ChatOrchestrator: initialize() - Cannot proceed, critical method dependencies missing (strict check failed).");
            return;
        }
        const { conversationManager, groupManager, chatSessionHandler } = deps;

        console.log("ChatOrchestrator: initialize() - conversationManager:", !!conversationManager);
        console.log("ChatOrchestrator: initialize() - groupManager:", !!groupManager);
        console.log("ChatOrchestrator: initialize() - chatSessionHandler:", !!chatSessionHandler);

        conversationManager?.initialize?.();
        groupManager?.initialize?.();
        chatSessionHandler?.initialize?.();
        
        console.log("ChatOrchestrator: initialize() - FINISHED.");
    }

    function getCombinedActiveChats() {
        const deps = getResolvedDeps(); // Non-strict for methods called frequently
        if (!deps) return []; // Should not happen if orchestrator itself is not a dummy
        const { conversationManager, groupManager } = deps;
        // ... (rest of the function remains the same, using deps.conversationManager etc.) ...
        let oneOnOneChats = [];
        if (conversationManager?.getActiveConversations) {
            oneOnOneChats = conversationManager.getActiveConversations();
            oneOnOneChats.forEach(c => { if (c.isGroup === undefined) c.isGroup = false; });
        } else {
            console.warn("ChatOrchestrator: getCombinedActiveChats - conversationManager.getActiveConversations is not available.");
        }

        let groupChats = [];
        if (groupManager?.getAllGroupDataWithLastActivity) {
            groupChats = groupManager.getAllGroupDataWithLastActivity();
        } else {
            console.warn("ChatOrchestrator: getCombinedActiveChats - groupManager.getAllGroupDataWithLastActivity is not available.");
        }

        const combined = [...oneOnOneChats, ...groupChats];
        const validCombined = combined.filter(chat => chat && chat.id && (chat.lastActivity !== undefined && chat.lastActivity !== null) );
        validCombined.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
        return validCombined;
    }
    
    // Inside chat_orchestrator.js
    function handleActiveChatItemClickInternal(itemData) {
        const deps = getResolvedDeps(true);
        if (!deps) {
            console.error("ChatOrchestrator: handleActiveChatItemClickInternal - Missing deps.");
            return;
        }
        const { groupManager, viewManager, chatSessionHandler, chatUiManager } = deps; // Added chatUiManager

        console.log("ChatOrchestrator: handleActiveChatItemClickInternal. Item isGroup:", itemData?.isGroup, "ID:", itemData?.id);
        if (!itemData || !itemData.id) {
            console.error("ChatOrchestrator: handleActiveChatItemClickInternal - itemData or itemData.id missing.");
            return;
        }

         if (itemData.isGroup) {
            console.log("ChatOrchestrator: Clicked on a GROUP item in active chats list:", itemData.id);
            
            // 1. Potentially hide the 1-on-1 embedded chat view if it's active
            //    (This might be handled by groupManager or chatUiManager when showing group chat)
            if (viewManager?.getCurrentActiveTab() === 'messages' && chatUiManager?.hideEmbeddedChatInterface) {
                chatUiManager.hideEmbeddedChatInterface();
                console.log("ChatOrchestrator: Hid embedded 1-on-1 chat interface.");
            }

            // 2. Call groupManager.joinGroup. This function should now:
            //    - Set the group as active.
            //    - Show the specific group's chat UI.
            //    - It ALREADY calls viewManager.setActiveRightSidebarPanel('messagesChatListPanel');
            //    - It ALREADY calls chatOrchestrator.renderCombinedActiveChatsList();
            if (groupManager?.joinGroup) {
                groupManager.joinGroup(itemData.id); // Pass the group ID
                console.log("ChatOrchestrator: Called groupManager.joinGroup for", itemData.id);

                // 3. AFTER groupManager.joinGroup has configured the UI for the specific group,
                //    tell viewManager to update the main navigation tab to "Groups".
                //    This should NOT re-trigger the default behavior of the 'groups' tab (showing group list).
                if (viewManager?.setActiveTabProgrammatically) { // Use the new method
                    viewManager.setActiveTabProgrammatically('groups');
                } else {
                    // Fallback if the new method isn't implemented - this might show the group list view
                    console.warn("ChatOrchestrator: viewManager.setActiveTabProgrammatically not found. Using switchView('groups') as fallback.");
                    viewManager.switchView?.('groups');
                }
            } else {
                console.error("ChatOrchestrator: groupManager.joinGroup method is missing!");
            }

        } else { // It's a 1-on-1 chat
            console.log("ChatOrchestrator: Clicked on a 1-on-1 item in active chats list:", itemData.connector?.id);
            // Your existing logic for 1-on-1 seems mostly fine, using initiateSession is good.
            if (polyglotApp?.initiateSession && itemData.connector) {
                polyglotApp.initiateSession(itemData.connector, 'message'); // 'message' type should switch to messages view and open convo
            } else {
                console.error("ChatOrchestrator: polyglotApp.initiateSession or itemData.connector not available for 1-on-1 chat.");
            }
        }
        console.log("ChatOrchestrator: handleActiveChatItemClickInternal - FINISHED for item:", itemData.id);
    }

    function renderCombinedActiveChatsList() {
        const deps = getResolvedDeps();
        if (!deps) return;
        const { listRenderer } = deps;
        // ... (rest of the function remains the same) ...
        const combinedChats = getCombinedActiveChats();
        if (listRenderer?.renderActiveChatList) {
            listRenderer.renderActiveChatList(combinedChats, handleActiveChatItemClickInternal);
        } else {
            console.error("ChatOrchestrator: listRenderer.renderActiveChatList is not available.");
        }
    }

    function openConversation(connector) {
        const deps = getResolvedDeps(true);
        if (!deps?.chatSessionHandler?.openConversationInEmbeddedView) {
            console.error("ChatOrchestrator.openConversation: chatSessionHandler.openConversationInEmbeddedView is missing or deps failed.");
            return;
        }
        deps.chatSessionHandler.openConversationInEmbeddedView(connector);
    }

    function openMessageModal(connector) {
        const deps = getResolvedDeps(true);
         if (!deps?.chatSessionHandler?.openMessageModalForConnector) {
            console.error("ChatOrchestrator.openMessageModal: chatSessionHandler.openMessageModalForConnector is missing or deps failed.");
            return;
        }
        deps.chatSessionHandler.openMessageModalForConnector(connector);
    }
    
    function handleMessagesTabActive() {
        const deps = getResolvedDeps(true);
        if (!deps?.chatSessionHandler?.handleMessagesTabBecameActive) {
            console.error("ChatOrchestrator: handleMessagesTabActive - chatSessionHandler.handleMessagesTabBecameActive missing or deps failed.");
            renderCombinedActiveChatsList(); // Attempt to render list even if handler is missing
            return;
        }
        deps.chatSessionHandler.handleMessagesTabBecameActive();
    }

    function filterAndDisplayConnectors(filters) {
        console.log("ChatOrchestrator: filterAndDisplayConnectors() - START. Filters:", JSON.stringify(filters));
        const deps = getResolvedDeps(true); // Strict check for this important UI function
        if (!deps) {
            console.error("ChatOrchestrator: filterAndDisplayConnectors - Cannot proceed, critical dependencies missing.");
            const domElements = window.domElements; // Try to get domElements directly for fallback message
            if (domElements?.connectorHubGrid) domElements.connectorHubGrid.innerHTML = '<p class="error-message">Cannot display connectors due to an internal error.</p>';
            return;
        }
        const { cardRenderer, activityManager, domElements } = deps;
        const liveConnectors = window.polyglotConnectors;

        if (!liveConnectors) {
            console.error("ChatOrchestrator.filterAndDisplayConnectors: window.polyglotConnectors is NOT AVAILABLE.");
            if (domElements?.connectorHubGrid) domElements.connectorHubGrid.innerHTML = '<p class="error-message">Connector data is currently unavailable.</p>';
            return;
        }
        console.log("ChatOrchestrator: filterAndDisplayConnectors - Initial connector count:", liveConnectors.length);
        // ... (rest of filtering logic remains the same, using deps.activityManager etc.) ...
        let filteredConnectors = liveConnectors.map(c => ({
            ...c,
            isActive: activityManager ? activityManager.isConnectorActive(c) : true
        }));

        if (filters.language && filters.language !== 'all') {
            filteredConnectors = filteredConnectors.filter(c =>
                c.languageRoles && c.languageRoles[filters.language]
            );
        }
        if (filters.role && filters.role !== 'all') {
            filteredConnectors = filteredConnectors.filter(c => {
                if (!c.languageRoles) return false;
                if (filters.language && filters.language !== 'all') {
                    return c.languageRoles[filters.language] &&
                           Array.isArray(c.languageRoles[filters.language]) &&
                           c.languageRoles[filters.language].includes(filters.role);
                } else {
                    return Object.values(c.languageRoles).some(
                        rolesInLang => Array.isArray(rolesInLang) && rolesInLang.includes(filters.role)
                    );
                }
            });
        }
        
        console.log("ChatOrchestrator: filterAndDisplayConnectors - Final count:", filteredConnectors.length);
        if (!domElements?.connectorHubGrid) {
            console.error("ChatOrchestrator: filterAndDisplayConnectors - domElements.connectorHubGrid NOT FOUND.");
            return;
        }
        cardRenderer.renderCards(filteredConnectors); 
        console.log("ChatOrchestrator: filterAndDisplayConnectors() - FINISHED.");
    }

    function notifyNewActivityInConversation(connectorId) {
        // This method doesn't have heavy dependencies beyond listRenderer (via renderCombinedActiveChatsList)
        // console.log(`ChatOrchestrator: notifyNewActivityInConversation() for '${connectorId}'.`);
        renderCombinedActiveChatsList();
    }

    function getTextMessageHandler() {
        // This is one of the STRUCTURAL dependencies checked at IIFE time.
        // console.log("ChatOrchestrator: getTextMessageHandler() called.");
        return window.textMessageHandler; // Directly return the globally defined module
    }
    function getVoiceMemoHandler() {
        // console.log("ChatOrchestrator: getVoiceMemoHandler() called.");
        return window.voiceMemoHandler; // Directly return
    }
    function getCurrentEmbeddedChatTargetId() {
        const deps = getResolvedDeps();
        return deps?.chatActiveTargetManager?.getEmbeddedChatTargetId();
    }
    function getCurrentModalMessageTarget() {
        const deps = getResolvedDeps();
        return deps?.chatActiveTargetManager?.getModalMessageTargetConnector();
    }

    console.log("chat_orchestrator.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
    initialize,
    openConversation,
    openMessageModal,
    handleMessagesTabActive,
    filterAndDisplayConnectors,
    renderCombinedActiveChatsList,
    notifyNewActivityInConversation,
    getTextMessageHandler, // These getters are fine
    getVoiceMemoHandler,
    getCurrentEmbeddedChatTargetId,
    getCurrentModalMessageTarget
    // Add any other methods defined in chat_orchestrator.js that need to be public
};
})();