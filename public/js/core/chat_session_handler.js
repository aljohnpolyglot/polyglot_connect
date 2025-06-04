// js/core/chat_session_handler.js
// Orchestrates 1-on-1 chat session UI interactions, including opening views/modals,
// managing active targets via chatActiveTargetManager, and delegating send actions
// to textMessageHandler.

console.log("chat_session_handler.js: Script execution STARTED.");

window.chatSessionHandler = (() => {
    'use strict';
    console.log("chat_session_handler.js: IIFE (module definition) STARTING.");

    const getDeps = () => {
        console.log("chat_session_handler.js: getDeps() called.");
        const deps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater,
            modalHandler: window.modalHandler,
            listRenderer: window.listRenderer,
            chatViewManager: window.chatViewManager,
            conversationManager: window.conversationManager,
            chatActiveTargetManager: window.chatActiveTargetManager,
            textMessageHandler: window.textMessageHandler,
            polyglotHelpers: window.polyglotHelpers,
            polyglotConnectors: window.polyglotConnectors,
            chatOrchestrator: window.chatOrchestrator
        };
        // Log availability of critical dependencies for this module
        console.log("chat_session_handler.js: getDeps() - domElements:", !!deps.domElements);
        console.log("chat_session_handler.js: getDeps() - uiUpdater:", !!deps.uiUpdater);
        console.log("chat_session_handler.js: getDeps() - modalHandler:", !!deps.modalHandler);
        console.log("chat_session_handler.js: getDeps() - listRenderer:", !!deps.listRenderer);
        console.log("chat_session_handler.js: getDeps() - chatViewManager:", !!deps.chatViewManager);
        console.log("chat_session_handler.js: getDeps() - conversationManager:", !!deps.conversationManager, " (typeof getActiveConversations: " + typeof deps.conversationManager?.getActiveConversations + ")");
        console.log("chat_session_handler.js: getDeps() - chatActiveTargetManager:", !!deps.chatActiveTargetManager);
        console.log("chat_session_handler.js: getDeps() - textMessageHandler:", !!deps.textMessageHandler);
        console.log("chat_session_handler.js: getDeps() - polyglotConnectors:", !!deps.polyglotConnectors);
        console.log("chat_session_handler.js: getDeps() - chatOrchestrator:", !!deps.chatOrchestrator);
        return deps;
    };

    function initialize() {
        console.log("chat_session_handler.js: initialize() - START.");
        const { chatActiveTargetManager } = getDeps();
        if (chatActiveTargetManager) {
            chatActiveTargetManager.clearEmbeddedChatTargetId();
            chatActiveTargetManager.clearModalMessageTargetConnector();
            console.log("ChatSessionHandler: Initialized. Active 1-on-1 targets cleared. Ready.");
        } else {
            console.error("ChatSessionHandler: CRITICAL - chatActiveTargetManager not available for initialization.");
        }
        console.log("chat_session_handler.js: initialize() - FINISHED.");
    }

  function openConversationInEmbeddedView(connectorOrId) {
        console.log("chat_session_handler.js: openConversationInEmbeddedView() - START. Input:", connectorOrId);
        const {
            domElements, uiUpdater, chatViewManager, conversationManager,
            chatActiveTargetManager, polyglotConnectors, chatOrchestrator
        } = getDeps();

        if (!uiUpdater || !chatViewManager || !conversationManager || !chatActiveTargetManager || !chatOrchestrator || !polyglotConnectors || !domElements) {
            console.error("ChatSessionHandler.openConversationInEmbeddedView: Missing critical dependencies.");
            return;
        }

        const targetId = typeof connectorOrId === 'string' ? connectorOrId : connectorOrId?.id;
        let connectorToOpenWith = typeof connectorOrId === 'object' && connectorOrId !== null ? connectorOrId : polyglotConnectors.find(c => c.id === targetId);

        console.log("chat_session_handler.js: openConversationInEmbeddedView - Target ID:", targetId, "Connector to open with:", !!connectorToOpenWith);

        if (!targetId) {
            console.error("ChatSessionHandler.openConversationInEmbeddedView: Invalid connector or ID provided.", connectorOrId);
            chatViewManager.hideEmbeddedChatInterface();
            return;
        }

        if (!connectorToOpenWith) {
            console.error(`ChatSessionHandler.openConversationInEmbeddedView: Connector object not found for ID '${targetId}'. Cannot open chat.`);
            chatViewManager.hideEmbeddedChatInterface();
            return;
        }

        console.log(`ChatSessionHandler: Opening embedded conversation with '${targetId}' (${connectorToOpenWith.profileName}).`);
        chatActiveTargetManager.setEmbeddedChatTargetId(targetId);
        console.log("ChatSessionHandler: Embedded chat target ID set to:", targetId);

        const { conversation: convo, isNew } = conversationManager.ensureConversationRecord(targetId, connectorToOpenWith);
        console.log("ChatSessionHandler: ensureConversationRecord result - convo exists:", !!convo, "isNew:", isNew);

        if (!convo || !convo.connector) {
            console.error(`ChatSessionHandler: Failed to ensure/get conversation record for '${targetId}'. Cannot open embedded chat.`);
            chatActiveTargetManager.clearEmbeddedChatTargetId();
            chatViewManager.hideEmbeddedChatInterface();
            return;
        }

        chatViewManager.showEmbeddedChatInterface(convo.connector);
        uiUpdater.clearEmbeddedChatLog();
        console.log("ChatSessionHandler: Embedded chat interface shown and log cleared.");

            if (Array.isArray(convo.messages) && convo.messages.length > 0) {
        console.log(`ChatSessionHandler: Populating ${convo.messages.length} messages into embedded chat log for ${targetId}.`);
        convo.messages.forEach(msg => {
            if (!msg) { console.warn("ChatSessionHandler: Null/undefined message in conversation for", targetId); return; }
            
            let senderClass = msg.sender; 
            if (msg.sender === 'user-voice-transcript') {
                senderClass = 'user';
            }

            // Prepare options object to pass to uiUpdater
            // This object will include all necessary details from the msg object
            // Inside openConversationInEmbeddedView -> forEach loop
        const msgOptions = { 
            timestamp: msg.timestamp, 
            type: msg.type,           
            eventType: msg.eventType, 
            duration: msg.duration,   
            callSessionId: msg.callSessionId, // <<< ADD THIS LINE
            senderName: (senderClass === 'connector') ? convo.connector.profileName : undefined,
            avatarUrl: (senderClass === 'connector') ? convo.connector.avatarModern : undefined,
            imageUrl: (msg.type === 'image' && msg.content_url) ? msg.content_url : undefined,
            // Note: connectorId and connectorName for call_event types will be added by 
            // uiUpdater's appendToEmbeddedChatLog based on the current chat context.
        };

            let textForDisplay = msg.text;
            
            uiUpdater.appendToEmbeddedChatLog(textForDisplay || "", senderClass, msgOptions);
        });
        } else if (isNew) {
            console.log(`ChatSessionHandler: New embedded conversation with ${convo.connector.profileName}. No prior messages.`);
        }

        if (uiUpdater && typeof uiUpdater.scrollEmbeddedChatToBottom === 'function') { // ADDED CHECK
            uiUpdater.scrollEmbeddedChatToBottom();
        } else {
            console.warn("ChatSessionHandler: uiUpdater.scrollEmbeddedChatToBottom function not found or uiUpdater itself is missing.");
            // Fallback attempt if specific function is missing but main log element is known
            if (domElements?.embeddedChatLog) {
                console.log("ChatSessionHandler: Fallback scrolling embeddedChatLog directly.");
                requestAnimationFrame(() => {
                    domElements.embeddedChatLog.scrollTop = domElements.embeddedChatLog.scrollHeight;
                });
            }
        }

        if (domElements?.embeddedMessageTextInput) {
            console.log("ChatSessionHandler: Focusing embeddedMessageTextInput.");
            domElements.embeddedMessageTextInput.focus();
        }

        if (chatOrchestrator?.renderCombinedActiveChatsList) { // Added null check for chatOrchestrator
            console.log("ChatSessionHandler: Calling chatOrchestrator.renderCombinedActiveChatsList after opening conversation.");
            chatOrchestrator.renderCombinedActiveChatsList();
        } else {
            console.warn("ChatSessionHandler: chatOrchestrator.renderCombinedActiveChatsList not found.");
        }
        console.log("chat_session_handler.js: openConversationInEmbeddedView() - FINISHED for", typeof connectorOrId === 'string' ? connectorOrId : connectorOrId?.id);
    }
    function handleMessagesTabBecameActive() {
        console.log("chat_session_handler.js: handleMessagesTabBecameActive() - START.");
        const { conversationManager, chatActiveTargetManager, chatViewManager, listRenderer } = getDeps();

        if (!conversationManager || !chatActiveTargetManager || !chatViewManager || !listRenderer) {
            console.error("ChatSessionHandler.handleMessagesTabBecameActive: Missing one or more critical dependencies.");
            return;
        }

        const currentEmbeddedId = chatActiveTargetManager.getEmbeddedChatTargetId();
        console.log("ChatSessionHandler: handleMessagesTabBecameActive - currentEmbeddedId:", currentEmbeddedId);

        if (currentEmbeddedId) {
            const currentConvo = conversationManager.getConversation(currentEmbeddedId);
            if (currentConvo?.connector) {
                console.log("ChatSessionHandler: Re-opening currently active embedded chat:", currentEmbeddedId);
                openConversationInEmbeddedView(currentConvo.connector); // This will render list
                return;
            } else {
                console.log("ChatSessionHandler: Current embedded ID was set, but no valid conversation found. Clearing ID.");
                chatActiveTargetManager.clearEmbeddedChatTargetId();
            }
        }

        // *** THIS IS THE LINE WITH THE ERROR ***
        // Corrected to use getActiveConversations()
        console.log("ChatSessionHandler: Attempting to call conversationManager.getActiveConversations()");
        if (typeof conversationManager.getActiveConversations !== 'function') {
            console.error("ChatSessionHandler: FATAL - conversationManager.getActiveConversations IS NOT A FUNCTION!");
            chatViewManager.hideEmbeddedChatInterface();
            listRenderer.renderActiveChatList([], openConversationInEmbeddedView); // Render empty
            return;
        }
        const allConversations = conversationManager.getActiveConversations();
        console.log("ChatSessionHandler: allConversations from conversationManager.getActiveConversations():", allConversations ? allConversations.length : 'null/undefined');


        const convosWithMessages = allConversations.filter(c => c.messages?.length > 0 && c.connector && !c.isGroup); // Ensure it's not a group chat
        console.log("ChatSessionHandler: Filtered 1-on-1 conversations with messages:", convosWithMessages.length);

        if (convosWithMessages.length > 0) {
            convosWithMessages.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
            const mostRecentConnector = convosWithMessages[0].connector;
            console.log("ChatSessionHandler: Opening most recent 1-on-1 conversation:", mostRecentConnector?.id);
            openConversationInEmbeddedView(mostRecentConnector); // This will render list
        } else {
            console.log("ChatSessionHandler: No active 1-on-1 conversations with messages. Hiding embedded chat interface and rendering empty active chat list.");
            chatViewManager.hideEmbeddedChatInterface();
            // chatOrchestrator.renderCombinedActiveChatsList will be called by openConversationInEmbeddedView if a chat is opened
            // If no chat is opened, we might need to explicitly call it here or ensure viewManager does.
            // For now, let listRenderer handle the empty state message for its specific list.
            if (window.chatOrchestrator?.renderCombinedActiveChatsList) { // Check if orchestrator is available
                window.chatOrchestrator.renderCombinedActiveChatsList();
            } else { // Fallback to just rendering the 1-on-1 list empty if orchestrator is not ready
                 listRenderer.renderActiveChatList([], openConversationInEmbeddedView);
            }
        }
        console.log("chat_session_handler.js: handleMessagesTabBecameActive() - FINISHED.");
    }

    function openMessageModalForConnector(connector) {
        console.log("chat_session_handler.js: openMessageModalForConnector() - START for connector:", connector?.id);
        const {
            domElements, uiUpdater, modalHandler, conversationManager,
            chatActiveTargetManager, chatOrchestrator // Added chatOrchestrator
        } = getDeps();

        if (!uiUpdater || !modalHandler || !conversationManager || !chatActiveTargetManager || !domElements || !chatOrchestrator) {
            console.error("ChatSessionHandler.openMessageModalForConnector: Missing critical dependencies.");
            return;
        }

        if (!connector || !connector.id) {
            console.error("ChatSessionHandler.openMessageModalForConnector: Invalid connector object provided.", connector);
            return;
        }
        console.log(`ChatSessionHandler: Opening message modal for '${connector.id}'.`);
        chatActiveTargetManager.setModalMessageTargetConnector(connector);
        console.log("ChatSessionHandler: Modal message target connector set to:", connector.id);

        const { conversation: convo, isNew } = conversationManager.ensureConversationRecord(connector.id, connector);
        console.log("ChatSessionHandler: ensureConversationRecord for modal - convo exists:", !!convo, "isNew:", isNew);

        if (!convo || !convo.connector) {
            console.error(`ChatSessionHandler: Failed to ensure/get conversation for modal for '${connector.id}'.`);
            chatActiveTargetManager.clearModalMessageTargetConnector();
            return;
        }

        uiUpdater.updateMessageModalHeader(convo.connector);
        uiUpdater.clearMessageModalLog();
        console.log("ChatSessionHandler: Message modal header updated and log cleared.");

        if (Array.isArray(convo.messages) && convo.messages.length > 0) {
    console.log(`ChatSessionHandler: Populating ${convo.messages.length} messages into modal chat log for ${connector.id}.`);
    convo.messages.forEach(msg => {
        if (!msg) { console.warn("ChatSessionHandler: Null/undefined message in modal conversation for", connector.id); return; }

        let senderClass = msg.sender;
        if (msg.sender === 'user-voice-transcript') {
            senderClass = 'user';
        }

        // Inside openMessageModalForConnector -> forEach loop
        // Inside openMessageModalForConnector -> forEach loop
        const msgOptions = { 
            timestamp: msg.timestamp, 
            type: msg.type,
            eventType: msg.eventType,
            duration: msg.duration,
            callSessionId: msg.callSessionId, // <<< ADD THIS LINE
            senderName: (senderClass === 'connector') ? convo.connector.profileName : undefined,
            avatarUrl: (senderClass === 'connector') ? convo.connector.avatarModern : undefined,
            imageUrl: (msg.type === 'image' && msg.content_url) ? msg.content_url : undefined,
        };

        let textForDisplay = msg.text;
        
        uiUpdater.appendToMessageLogModal(textForDisplay || "", senderClass, msgOptions);
    });
        } else if (isNew) {
             console.log(`ChatSessionHandler: New modal conversation with ${convo.connector.profileName}.`);
        }

        if (uiUpdater?.scrollMessageModalToBottom) {
            uiUpdater.scrollMessageModalToBottom();
        } else {
            console.warn("ChatSessionHandler: scrollMessageModalToBottom function not found in uiUpdater.");
        }

        uiUpdater.resetMessageModalInput();
        if (domElements.messagingInterface) {
            modalHandler.open(domElements.messagingInterface);
            console.log("ChatSessionHandler: Messaging interface modal opened.");
        } else {
            console.error("ChatSessionHandler: domElements.messagingInterface not found for modal open.");
        }
        if (domElements.messageTextInput) {
            console.log("ChatSessionHandler: Focusing messageTextInput (modal).");
            domElements.messageTextInput.focus();
        }
        // It's good practice to also update the active chats list if opening a modal might change its state
        // (e.g., if ensureConversationRecord creates a new one that should now appear)
        if (chatOrchestrator.renderCombinedActiveChatsList) {
             console.log("ChatSessionHandler: Calling chatOrchestrator.renderCombinedActiveChatsList after opening modal.");
            chatOrchestrator.renderCombinedActiveChatsList();
        }
        console.log("chat_session_handler.js: openMessageModalForConnector() - FINISHED for", connector.id);
    }

    async function sendMessageFromEmbeddedUI() {
        console.log("chat_session_handler.js: sendMessageFromEmbeddedUI() - START.");
        const { domElements, chatActiveTargetManager, textMessageHandler } = getDeps();
        
        if (!domElements || !chatActiveTargetManager || !textMessageHandler) {
            console.error("ChatSessionHandler.sendMessageFromEmbeddedUI: Missing critical dependencies.");
            return;
        }

        const text = domElements.embeddedMessageTextInput?.value;
        const targetId = chatActiveTargetManager.getEmbeddedChatTargetId();
        console.log("ChatSessionHandler: sendMessageFromEmbeddedUI - Text:", text?.substring(0,20)+"...", "Target ID:", targetId);

        if (!text || text.trim() === "") {
            console.warn("ChatSessionHandler: Attempted to send empty/whitespace message from embedded UI.");
            return;
        }
        if (!targetId) {
            console.warn("ChatSessionHandler: No active embedded chat target to send message to.");
            return;
        }
        if (!textMessageHandler.sendEmbeddedTextMessage) {
            console.error("ChatSessionHandler: textMessageHandler.sendEmbeddedTextMessage is missing.");
            return;
        }
        await textMessageHandler.sendEmbeddedTextMessage(text, targetId);
        console.log("chat_session_handler.js: sendMessageFromEmbeddedUI() - FINISHED.");
    }

    async function sendMessageFromModalUI() {
        console.log("chat_session_handler.js: sendMessageFromModalUI() - START.");
        const { domElements, chatActiveTargetManager, textMessageHandler } = getDeps();

        if (!domElements || !chatActiveTargetManager || !textMessageHandler) {
            console.error("ChatSessionHandler.sendMessageFromModalUI: Missing critical dependencies.");
            return;
        }

        const text = domElements.messageTextInput?.value;
        const targetConnector = chatActiveTargetManager.getModalMessageTargetConnector();
        console.log("ChatSessionHandler: sendMessageFromModalUI - Text:", text?.substring(0,20)+"...", "Target Connector ID:", targetConnector?.id);

        if (!text || text.trim() === "") {
            console.warn("ChatSessionHandler: Attempted to send empty/whitespace message from modal UI.");
            return;
        }
        if (!targetConnector || !targetConnector.id) {
             console.warn("ChatSessionHandler: No active modal chat target to send message to.");
            return;
        }
        if (!textMessageHandler.sendModalTextMessage) {
            console.error("ChatSessionHandler: textMessageHandler.sendModalTextMessage is missing.");
            return;
        }
        await textMessageHandler.sendModalTextMessage(text, targetConnector);
        console.log("chat_session_handler.js: sendMessageFromModalUI() - FINISHED.");
    }

    async function handleImageUploadFromEmbeddedUI(event) {
        console.log("chat_session_handler.js: handleImageUploadFromEmbeddedUI() - START.");
        const { chatActiveTargetManager, textMessageHandler, domElements } = getDeps();

        if (!chatActiveTargetManager || !textMessageHandler || !domElements) {
            console.error("ChatSessionHandler.handleImageUploadFromEmbeddedUI: Missing critical dependencies.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        const targetId = chatActiveTargetManager.getEmbeddedChatTargetId();
        console.log("ChatSessionHandler: handleImageUploadFromEmbeddedUI - Target ID:", targetId);

        if (!targetId) {
            console.warn("ChatSessionHandler: No embedded chat target for image upload.");
            if (domElements.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }
        if (!textMessageHandler.handleEmbeddedImageUpload) {
            console.error("ChatSessionHandler: textMessageHandler.handleEmbeddedImageUpload is missing.");
            return;
        }
        await textMessageHandler.handleEmbeddedImageUpload(event, targetId);
        console.log("chat_session_handler.js: handleImageUploadFromEmbeddedUI() - FINISHED.");
    }

    async function handleImageUploadFromModalUI(event) {
        console.log("chat_session_handler.js: handleImageUploadFromModalUI() - START.");
        const { chatActiveTargetManager, textMessageHandler, domElements } = getDeps();

        if (!chatActiveTargetManager || !textMessageHandler || !domElements) {
            console.error("ChatSessionHandler.handleImageUploadFromModalUI: Missing critical dependencies.");
            if (domElements?.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
            return;
        }

        const targetConnector = chatActiveTargetManager.getModalMessageTargetConnector();
        console.log("ChatSessionHandler: handleImageUploadFromModalUI - Target Connector ID:", targetConnector?.id);

        if (!targetConnector || !targetConnector.id) {
            console.warn("ChatSessionHandler: No modal chat target for image upload.");
            if (domElements.messageModalImageUpload) domElements.messageModalImageUpload.value = '';
            return;
        }
        if (!textMessageHandler.handleModalImageUpload) {
            console.error("ChatSessionHandler: textMessageHandler.handleModalImageUpload is missing.");
            return;
        }
        await textMessageHandler.handleModalImageUpload(event, targetConnector);
        console.log("chat_session_handler.js: handleImageUploadFromModalUI() - FINISHED.");
    }

    function endActiveModalMessagingSession() {
        console.log("chat_session_handler.js: endActiveModalMessagingSession() - START.");
        const { modalHandler, domElements, chatActiveTargetManager, chatOrchestrator } = getDeps();

        if (!modalHandler || !domElements || !chatActiveTargetManager || !chatOrchestrator) {
             console.error("ChatSessionHandler.endActiveModalMessagingSession: Missing critical dependencies.");
            return;
        }

        console.log("ChatSessionHandler: Ending active modal messaging session.");
        if (modalHandler.close && domElements.messagingInterface) {
            modalHandler.close(domElements.messagingInterface);
            console.log("ChatSessionHandler: Messaging interface modal closed.");
        }
        chatActiveTargetManager.clearModalMessageTargetConnector();
        if (window.speechSynthesis?.speaking) {
            console.log("ChatSessionHandler: Cancelling active speech synthesis.");
            window.speechSynthesis.cancel();
        }
        if (chatOrchestrator.renderCombinedActiveChatsList) {
            console.log("ChatSessionHandler: Calling chatOrchestrator.renderCombinedActiveChatsList after ending modal session.");
            chatOrchestrator.renderCombinedActiveChatsList();
        } else {
            console.warn("ChatSessionHandler: chatOrchestrator.renderCombinedActiveChatsList not found after ending modal session.");
        }
        console.log("chat_session_handler.js: endActiveModalMessagingSession() - FINISHED.");
    }

    console.log("chat_session_handler.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        initialize,
        openConversationInEmbeddedView,
        handleMessagesTabBecameActive,
        openMessageModalForConnector,
        sendMessageFromEmbeddedUI,
        sendMessageFromModalUI,
        handleImageUploadFromEmbeddedUI,
        handleImageUploadFromModalUI,
        endActiveModalMessagingSession
    };
})();

if (window.chatSessionHandler) {
    console.log("chat_session_handler.js: SUCCESSFULLY assigned to window.chatSessionHandler.");
} else {
    console.error("chat_session_handler.js: CRITICAL ERROR - window.chatSessionHandler IS UNDEFINED after IIFE execution.");
}
console.log("chat_session_handler.js: Script execution FINISHED.");