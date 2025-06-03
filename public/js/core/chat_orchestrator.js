// FILE: js/core/chat_orchestrator.js
// Orchestrates 1-on-1 chat interactions and group chats, acting as the main chatManager facade.

window.chatOrchestrator = (() => {
    'use strict';

    const getDeps = () => ({
        domElements: window.domElements,
        uiUpdater: window.uiUpdater,
        polyglotHelpers: window.polyglotHelpers,
        modalHandler: window.modalHandler,
        listRenderer: window.listRenderer,
        cardRenderer: window.cardRenderer,
        chatUiManager: window.chatUiManager,
        conversationManager: window.conversationManager,
        groupManager: window.groupManager,
        groupDataManager: window.groupDataManager, // Make sure groupDataManager is available if used directly
        textMessageHandler: window.textMessageHandler,
        voiceMemoHandler: window.voiceMemoHandler,
        activityManager: window.activityManager,
        viewManager: window.viewManager
    });

    let currentEmbeddedChatTargetId = null;
    let currentModalMessageTarget = null;

    function initialize() {
        const { groupManager } = getDeps(); // conversationManager is initialized in app.js
        console.log("ChatOrchestrator: Initializing...");
        groupManager?.initialize();
        console.log("ChatOrchestrator: Initialized.");
    }

    function getCombinedActiveChats() {
        const { conversationManager, groupDataManager, polyglotHelpers } = getDeps(); // groupManager is not directly needed here, but groupDataManager is
        
        console.log("ChatOrchestrator: getCombinedActiveChats - START");

        const oneOnOneConversations = Object.values(conversationManager.getActiveConversations() || {})
            .filter(convo => convo?.connector && convo.messages?.length > 0)
            .map(convo => {
                const lastActivity = convo.lastActivity || 0;
                // console.log(`CombinedChats: 1v1 Chat "${convo.connector.profileName}" - LastActivity:`, {
                //     timestamp: lastActivity,
                //     relative: polyglotHelpers.formatRelativeTimestamp(lastActivity),
                //     messageCount: convo.messages.length
                // });

                return {
                    id: convo.connector.id,
                    name: convo.connector.profileName || convo.connector.name,
                    connector: convo.connector,
                    messages: convo.messages.slice(-1).map(m => ({
                        ...m,
                        speakerName: m.sender === 'user' ? 'You' : convo.connector.profileName.split(' ')[0]
                    })),
                    lastActivity: lastActivity,
                    isGroup: false
                };
            });

        const groupConversations = groupDataManager?.getAllGroupDataWithLastActivity() || [];
        // groupConversations.forEach(group => {
        //     console.log(`CombinedChats: Group "${group.name}" - LastActivity:`, {
        //         timestamp: group.lastActivity,
        //         relative: polyglotHelpers.formatRelativeTimestamp(group.lastActivity),
        //         messageCount: group.messages?.length || 0
        //     });
        // });

        const allChats = [...oneOnOneConversations, ...groupConversations];
        allChats.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));

        console.log("ChatOrchestrator: getCombinedActiveChats - Summary:", {
            total: allChats.length,
            oneOnOne: oneOnOneConversations.length,
            groups: groupConversations.length,
            firstChatName: allChats.length > 0 ? allChats[0].name : "N/A"
        });

        return allChats;
    }

    // THIS FUNCTION WAS MISSING FROM YOUR "my version now"
    function handleActiveChatItemClick(itemData) {
        console.log("ChatOrchestrator: handleActiveChatItemClick. Item isGroup:", itemData.isGroup, "ID:", itemData.id, "Name:", itemData.name);
        const { groupManager, viewManager, chatUiManager } = getDeps();

        if (itemData.isGroup) {
            console.log("ChatOrchestrator: Item is a Group. Current tab:", viewManager?.getCurrentActiveTab());
            // Check if already viewing this group in the groups tab
            const isCorrectViewAndGroup = viewManager?.getCurrentActiveTab() === 'groups' && groupManager?.getCurrentGroupData()?.id === itemData.id;

            if (!isCorrectViewAndGroup) {
                if (viewManager?.getCurrentActiveTab() !== 'groups') {
                    viewManager?.switchView('groups'); // This might trigger renders depending on its logic
                }
                // joinGroup will set context, show UI, and then call renderCombinedActiveChatsList
                groupManager?.joinGroup(itemData.id);
            } else {
                // Already viewing this group, ensure UI is correct (e.g., if sidebar was re-rendered)
                 const members = groupManager.getFullCurrentGroupMembers ? groupManager.getFullCurrentGroupMembers() : (window.groupManager?.getFullCurrentGroupMembers ? window.groupManager.getFullCurrentGroupMembers() : []);
                chatUiManager?.showGroupChatView(itemData.name, members);
                // No need to call renderCombinedActiveChatsList here typically, as state hasn't changed much.
            }
        } else { // 1-on-1 chat
            console.log("ChatOrchestrator: Item is 1-on-1. Current tab:", viewManager?.getCurrentActiveTab());

            if (groupManager?.getCurrentGroupData()) {
                console.log("ChatOrchestrator: Leaving current group to open 1-on-1 chat.");
                // leaveCurrentGroup internally calls renderCombinedActiveChatsList.
                groupManager.leaveCurrentGroup(false, true);
            }

            if (viewManager?.getCurrentActiveTab() !== 'messages') {
                // switchView to 'messages' will call handleMessagesTabActive,
                // which in turn calls openConversation (if a chat is to be opened by default)
                // and openConversation will call renderCombinedActiveChatsList.
                viewManager?.switchView('messages');
                // The openConversation called by handleMessagesTabActive will also call markConversationActive.
            }
            
            // Open the specific conversation. This will mark it active and trigger its own render.
            openConversation(itemData.connector || itemData.id);
        }
    }

    function renderCombinedActiveChatsList() {
        const { listRenderer } = getDeps();
        if (listRenderer) {
            const combinedChats = getCombinedActiveChats();
            // Ensure handleActiveChatItemClick is defined and passed
            if (typeof handleActiveChatItemClick !== 'function') {
                console.error("ChatOrchestrator: FATAL - handleActiveChatItemClick is not defined within renderCombinedActiveChatsList's scope!");
                // Fallback: render list without click handler to prevent further errors, but items won't be clickable.
                listRenderer.renderActiveChatList(combinedChats, () => {
                    console.warn("ChatOrchestrator: Sidebar item clicked, but handler is missing.");
                });
            } else {
                listRenderer.renderActiveChatList(combinedChats, handleActiveChatItemClick);
            }
        }
    }

    function openConversation(connectorOrId) {
        const { chatUiManager, conversationManager, uiUpdater, domElements, viewManager } = getDeps();
        const targetId = typeof connectorOrId === 'string' ? connectorOrId : connectorOrId?.id;

        console.log(`ChatOrchestrator: openConversation -- START -- Target ID: ${targetId}.`);
        
        if (!targetId) {
            console.error("ChatOrchestrator: openConversation - No targetId provided.");
            chatUiManager?.hideEmbeddedChatInterface();
            return;
        }

        // Switch to messages tab if needed BEFORE ensuring record or marking active
        if (viewManager?.getCurrentActiveTab() !== 'messages') {
            console.log("ChatOrchestrator: openConversation - Not on messages tab, switching now.");
            viewManager.switchView('messages');
        }

        // Ensure conversation exists
        const { conversation: convo } = conversationManager.ensureConversationRecord(
            targetId, 
            typeof connectorOrId === 'object' ? connectorOrId : null
        );

        if (!convo || !convo.connector) {
            console.error(`ChatOrchestrator: Failed to get/create conversation for ${targetId}`);
            chatUiManager?.hideEmbeddedChatInterface();
            renderCombinedActiveChatsList();
            return;
        }

        // Mark conversation as active (updates lastActivity)
        // conversationManager.markConversationActive(targetId); // REMOVED/COMMENTED OUT
        currentEmbeddedChatTargetId = targetId;

        // Update UI
        chatUiManager.hideGroupChatView(); // Hide group view if it was active
        chatUiManager.showEmbeddedChatInterface(convo.connector);

        // Repopulate messages
        uiUpdater.clearEmbeddedChatLog();
        convo.messages?.forEach(msg => {
            if (!msg) {
                console.warn("ChatOrchestrator: Null/undefined message found in convo for", currentEmbeddedChatTargetId, msg);
                return;
            }
            if (msg.type === 'image' && msg.content_url) {
                uiUpdater.appendToEmbeddedChatLog("", msg.sender.startsWith('user') ? 'user' : 'connector', 
                    { imageUrl: msg.content_url });
            } else if (msg.text !== undefined && msg.text !== null) {
                const senderClass = msg.sender === 'user-voice-transcript' || msg.sender === 'user-audio' 
                    ? 'user-audio' 
                    : msg.sender.startsWith('user') ? 'user' : 'connector';
                uiUpdater.appendToEmbeddedChatLog(msg.text, senderClass);
            } else {
                 console.warn("ChatOrchestrator: Message without text or valid image content_url:", msg, "for connector:", currentEmbeddedChatTargetId);
            }
        });

        // Scroll to bottom
        if (domElements.embeddedChatLog) {
            requestAnimationFrame(() => {
                domElements.embeddedChatLog.scrollTop = domElements.embeddedChatLog.scrollHeight;
            });
        }

        // Update sidebar and render list
        if (viewManager?.setActiveRightSidebarPanel) {
            viewManager.setActiveRightSidebarPanel('messagesChatListPanel');
        }
        renderCombinedActiveChatsList(); // Render after all updates for this conversation
        console.log(`ChatOrchestrator: openConversation -- END -- Successfully opened for: ${currentEmbeddedChatTargetId}`);
    }

    function openMessageModal(connector) {
        const { uiUpdater, modalHandler, domElements, conversationManager } = getDeps();
        if (!connector?.id || !uiUpdater || !modalHandler || !domElements || !conversationManager) {
            console.error("ChatOrchestrator.openMessageModal: Missing dependencies.");
            return;
        }

        // Ensure record but don't necessarily mark active just for modal view
        const { conversation: convo } = conversationManager.ensureConversationRecord(connector.id, connector);
        // If you want opening modal to update lastActivity, then call:
        // conversationManager.markConversationActive(connector.id); 
        // And then you might want to renderCombinedActiveChatsList();

        if (!convo) {
            console.error("ChatOrchestrator: Failed to get/create conversation for message modal for connector:", connector.id);
            return;
        }
        currentModalMessageTarget = connector;

        uiUpdater.updateMessageModalHeader(connector);
        uiUpdater.clearMessageModalLog();

        convo.messages?.forEach(msg => {
             if (msg.type === 'image' && msg.content_url) {
                uiUpdater.showImageInMessageModal(msg.content_url);
            } else if (msg.text) {
                let senderClass = msg.sender.startsWith('user') ? 'user' : 'connector';
                if (msg.sender === 'user-voice-transcript' || msg.sender === 'user-audio') senderClass = 'user-audio';
                uiUpdater.appendToMessageLogModal(msg.text, senderClass);
            }
        });

        if (domElements.messageChatLog) {
            requestAnimationFrame(() => {
                domElements.messageChatLog.scrollTop = domElements.messageChatLog.scrollHeight;
            });
        }

        uiUpdater.resetMessageModalInput();
        modalHandler.open(domElements.messagingInterface);
        if (domElements.messageTextInput) domElements.messageTextInput.focus();
        console.log("ChatOrchestrator: Message modal opened for", connector.id);
    }

    function handleMessagesTabActive() {
        const { chatUiManager, conversationManager } = getDeps();
        console.log("ChatOrchestrator: handleMessagesTabActive.");
        if (!chatUiManager || !conversationManager) {
            renderCombinedActiveChatsList(); // Still render list if deps are missing
            return;
        }

        let chatToOpenConnector = null;
        if (currentEmbeddedChatTargetId) {
            const currentConvo = conversationManager.getConversation(currentEmbeddedChatTargetId);
            if (currentConvo && !currentConvo.isGroup) { // Ensure it's not a group context lingering
                chatToOpenConnector = currentConvo.connector;
            } else {
                 // currentEmbeddedChatTargetId might be for a group, so clear it for 1v1 messages view
                currentEmbeddedChatTargetId = null; 
            }
        }

        if (!chatToOpenConnector) {
            // Try to find the most recent 1-on-1 chat if no specific one is targeted
            const tempCombinedChats = getCombinedActiveChats(); // Get current state without rendering yet
            const firstOneOnOne = tempCombinedChats.find(chat => !chat.isGroup && chat.connector);
            if (firstOneOnOne) {
                chatToOpenConnector = firstOneOnOne.connector;
            }
        }

        if (chatToOpenConnector) {
            // openConversation will handle marking active and its own renderCombinedActiveChatsList call
            openConversation(chatToOpenConnector);
        } else {
            // No 1-on-1 chat to open (e.g., no history or only groups)
            chatUiManager.hideEmbeddedChatInterface();
            currentEmbeddedChatTargetId = null; // Ensure this is cleared
            renderCombinedActiveChatsList(); // Refresh the list (might show empty message)
        }
    }

    function endModalMessagingSession() {
        getDeps().modalHandler?.close(getDeps().domElements.messagingInterface);
        currentModalMessageTarget = null;
    }

    function filterAndDisplayConnectors(filters) {
        // ... (this function looks okay from your paste, assuming cardRenderer and activityManager are fine)
        const { cardRenderer, activityManager, domElements } = getDeps();

        if (!window.polyglotConnectors) {
            console.error("ChatOrchestrator: window.polyglotConnectors is undefined or empty. Cannot filter.");
            if (domElements?.connectorHubGrid) domElements.connectorHubGrid.innerHTML = "<p class='error-message'>No connector data loaded.</p>";
            return;
        }
        // ... rest of filterAndDisplayConnectors
         console.log("ChatOrchestrator: filterAndDisplayConnectors called with filters:", filters);
        // const { cardRenderer, activityManager } = getDeps(); // domElements is already in getDeps

        if (!window.polyglotConnectors) {
            console.error("ChatOrchestrator: window.polyglotConnectors is undefined or empty. Cannot filter.");
            const grid = domElements?.connectorHubGrid; // Use destructured domElements
            if (grid) grid.innerHTML = "<p class='error-message'>No connector data loaded.</p>";
            return;
        }
        if (!cardRenderer) {
            console.error("ChatOrchestrator: cardRenderer is not available. Cannot display cards.");
            return;
        }
        if (!activityManager) {
            console.warn("ChatOrchestrator: activityManager not available. isActive status might be incorrect.");
        }

        console.log("ChatOrchestrator: Total connectors before filter:", window.polyglotConnectors.length);

        let filtered = window.polyglotConnectors.map(c => ({
            ...c,
            isActive: activityManager ? activityManager.isConnectorActive(c) : true
        }));

        if (filters.language && filters.language !== 'all') {
            filtered = filtered.filter(c => c.languageRoles && c.languageRoles[filters.language]);
        }
        if (filters.role && filters.role !== 'all') {
            filtered = filtered.filter(c => {
                if (!c.languageRoles) return false;
                if (filters.language && filters.language !== 'all') {
                    return c.languageRoles[filters.language] && Array.isArray(c.languageRoles[filters.language]) && c.languageRoles[filters.language].includes(filters.role);
                } else {
                    return Object.values(c.languageRoles).some(langDataArray => Array.isArray(langDataArray) && langDataArray.includes(filters.role));
                }
            });
        }

        console.log("ChatOrchestrator: Connectors after filtering:", filtered.length, filtered);
        cardRenderer.renderCards(filtered);
        console.log("ChatOrchestrator: cardRenderer.renderCards called.");
    }

    function notifyNewActivityInConversation(connectorId) {
        const { conversationManager } = getDeps();
        if (conversationManager.markConversationActive(connectorId)) { // Uses the new function
            // conversationManager.saveConversationsToStorage(); // markConversationActive now handles saving
            renderCombinedActiveChatsList();
        }
    }

    console.log("js/core/chat_orchestrator.js (Copilot revised version) loaded.");
    return {
        initialize,
        openConversation,
        openMessageModal,
        handleMessagesTabActive,
        endModalMessagingSession,
        filterAndDisplayConnectors,
        getTextMessageHandler: () => getDeps().textMessageHandler,
        getVoiceMemoHandler: () => getDeps().voiceMemoHandler,
        getConversationManager: () => getDeps().conversationManager,
        getCurrentEmbeddedChatTargetId: () => currentEmbeddedChatTargetId,
        getCurrentModalMessageTarget: () => currentModalMessageTarget,
        renderCombinedActiveChatsList,
        notifyNewActivityInConversation
        // handleActiveChatItemClick is NOT exported as it's internal to this module
    };
})();

window.chatManager = window.chatOrchestrator;
console.log("chat_orchestrator.js: window.chatManager assigned from window.chatOrchestrator.");