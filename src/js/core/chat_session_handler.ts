// D:\polyglot_connect\src\js\core\chat_session_handler.ts
import type {
    YourDomElements,
    UiUpdater,
    ModalHandler,
    ListRenderer,
    ChatUiManager, // <<< CHANGED FROM ChatViewManager
    ConversationManager,
    ChatActiveTargetManager,
    TextMessageHandler,
    PolyglotHelpersOnWindow, // Added for sanitizeTextForDisplay
    Connector,
    ChatOrchestrator,
    ConversationItem,
    CombinedChatItem,         // <<< IMPORTED
    ActiveOneOnOneChatItem,   // <<< IMPORTED
    MessageInStore,    
    ChatMessageOptions
    // Assuming MessageInStore is defined and exported from global.d.ts or another types file
} from '../types/global.d.ts';

console.log('chat_session_handler.ts: Script loaded, waiting for core dependencies (TS Version).');

interface ChatSessionHandlerModule {
    initialize: () => void;
    openConversationInEmbeddedView: (connectorOrId: Connector | string) => Promise<void>;
    handleMessagesTabBecameActive: () => Promise<void>;
    openMessageModalForConnector: (connector: Connector) => Promise<void>;
    endActiveModalMessagingSession: () => void;
}

window.chatSessionHandler = {} as ChatSessionHandlerModule;
console.log('chat_session_handler.ts: Placeholder window.chatSessionHandler assigned.');

// --- START: DUPLICATION FIX - Module-scoped locks ---
let openingModalOperationId: string | null = null;
let openingEmbeddedOperationId: string | null = null;
// --- END: DUPLICATION FIX ---


function initializeActualChatSessionHandler(): void {
    console.log("chat_session_handler.ts: initializeActualChatSessionHandler() called.");

    type VerifiedDeps = {
        domElements: YourDomElements;
        uiUpdater: UiUpdater;
        modalHandler: ModalHandler;
        listRenderer: ListRenderer;
        chatUiManager: ChatUiManager; 
        conversationManager: ConversationManager;
        chatActiveTargetManager: ChatActiveTargetManager;
        textMessageHandler: TextMessageHandler;
        polyglotConnectors: Connector[];
        chatOrchestrator: ChatOrchestrator;
        polyglotHelpers: PolyglotHelpersOnWindow;
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater,
            modalHandler: window.modalHandler,
            listRenderer: window.listRenderer,
           chatUiManager: window.chatUiManager,
            conversationManager: window.conversationManager,
            chatActiveTargetManager: window.chatActiveTargetManager,
            textMessageHandler: window.textMessageHandler,
            polyglotConnectors: window.polyglotConnectors,
            chatOrchestrator: window.chatOrchestrator,
            polyglotHelpers: window.polyglotHelpers
        };
        const missing: string[] = [];
        if (!deps.domElements) missing.push("domElements");
        if (!deps.uiUpdater || typeof deps.uiUpdater.appendToEmbeddedChatLog !== 'function') missing.push("uiUpdater");
        if (!deps.modalHandler || typeof deps.modalHandler.open !== 'function') missing.push("modalHandler");
        if (!deps.listRenderer || typeof deps.listRenderer.renderActiveChatList !== 'function') missing.push("listRenderer");
      if (!deps.chatUiManager || typeof deps.chatUiManager.showEmbeddedChatInterface !== 'function') missing.push("chatUiManager");
        if (!deps.conversationManager || typeof deps.conversationManager.ensureConversationRecord !== 'function') missing.push("conversationManager");
        if (!deps.chatActiveTargetManager || typeof deps.chatActiveTargetManager.setEmbeddedChatTargetId !== 'function') missing.push("chatActiveTargetManager");
        if (!deps.textMessageHandler || typeof (deps.textMessageHandler as any)?.sendEmbeddedTextMessage !== 'function') missing.push("textMessageHandler");
        if (!deps.polyglotConnectors || !Array.isArray(deps.polyglotConnectors)) missing.push("polyglotConnectors");
        if (!deps.chatOrchestrator || typeof deps.chatOrchestrator.renderCombinedActiveChatsList !== 'function') missing.push("chatOrchestrator");
        if (!deps.polyglotHelpers || typeof deps.polyglotHelpers.sanitizeTextForDisplay !== 'function') missing.push("polyglotHelpers");
        
        if (missing.length > 0) {
            console.error(`CSH: getSafeDeps - MISSING/INVALID: ${missing.join(', ')}.`);
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("chat_session_handler.ts: CRITICAL - Functional dependencies not met. Placeholder remains.");
        document.dispatchEvent(new CustomEvent('chatSessionHandlerReady'));
        console.warn('chat_session_handler.ts: "chatSessionHandlerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('chat_session_handler.ts: Core functional dependencies appear ready for IIFE.');

    const LAST_EMBEDDED_CHAT_ID_KEY = 'polyglotLastEmbeddedChatId';

const serviceMethods = ((): ChatSessionHandlerModule => {
    'use strict';
    console.log("chat_session_handler.ts: IIFE (module definition) STARTING.");

    const {
        domElements, uiUpdater, modalHandler, listRenderer,
        chatUiManager, conversationManager, chatActiveTargetManager,
        textMessageHandler, polyglotConnectors, chatOrchestrator, polyglotHelpers
    } = resolvedDeps!; 

 // Define the wrapper here so it can be referenced by both add/remove event listener
const newMessageInStoreListener = (event: Event) => {
    // This is the "proxy" that safely casts the generic Event to our CustomEvent
    handleNewMessageInStore(event as CustomEvent);
};

/**
 * Handles the 'new-message-in-store' global event.
 * Checks if the new message belongs to the currently active chat (embedded or modal)
 * and appends it to the UI in real-time.
 * @param {CustomEvent} event The event containing the new message details.
 */
// <<< START OF REPLACEMENT FUNCTION >>>
/**
 * Handles the 'new-message-in-store' global event.
 * Checks if the new message belongs to the currently active chat (embedded or modal)
 * and appends it to the UI in real-time. This is wrapped in a setTimeout
 * to prevent race conditions with modal dialogs opening simultaneously.
 * @param {CustomEvent} event The event containing the new message details.
 */
// in chat_session_handler.ts

function handleNewMessageInStore(event: CustomEvent): void {
    setTimeout(() => {
        const { connectorId, message } = event.detail as { connectorId: string, message: MessageInStore };
    
        if (!connectorId || !message) {
            console.warn("CSH: handleNewMessageInStore - Received event with invalid detail.", event.detail);
            return;
        }
    
        const currentEmbeddedId = chatActiveTargetManager.getEmbeddedChatTargetId();
        const currentModalConnector = chatActiveTargetManager.getModalMessageTargetConnector();
        let messageAppended = false;
    
        // FIX FOR EMBEDDED CHAT
        if (currentEmbeddedId && currentEmbeddedId === connectorId) {
            console.log(`CSH: New message for active embedded chat (${connectorId}). Appending to UI.`);
            const convoRecord = conversationManager.getConversationById(connectorId);
            const senderClass = message.sender === 'user' ? 'user' : (message.sender === 'system-call-event' ? 'system-call-event' : 'connector');
            
            // =================== START OF FIX ===================
            const msgOptions: ChatMessageOptions = { ...message };
            
            // This is the crucial mapping that was missing.
            if (message.type === 'image' && message.content_url) {
                msgOptions.imageUrl = message.content_url;
            }
            // ==================== END OF FIX ====================
    
            if (senderClass === 'connector' && convoRecord?.connector) {
                msgOptions.avatarUrl = convoRecord.connector.avatarModern;
                msgOptions.senderName = convoRecord.connector.profileName;
                msgOptions.connectorId = convoRecord.connector.id;
            }
    
            uiUpdater.appendToEmbeddedChatLog?.(message.text || "", senderClass, msgOptions);
            messageAppended = true;
        }
    
        // FIX FOR MODAL CHAT (The same fix applies here)
        if (currentModalConnector && currentModalConnector.id === connectorId) {
            console.log(`CSH: New message for active modal chat (${connectorId}). Appending to UI.`);
            const senderClass = message.sender === 'user' ? 'user' : (message.sender === 'system-call-event' ? 'system-call-event' : 'connector');
    
            // =================== START OF FIX ===================
            const msgOptions: ChatMessageOptions = {
                ...message,
                avatarUrl: currentModalConnector.avatarModern,
                senderName: currentModalConnector.profileName,
                connectorId: currentModalConnector.id,
            };

            // This is the crucial mapping that was missing.
            if (message.type === 'image' && message.content_url) {
                msgOptions.imageUrl = message.content_url;
            }
            // ==================== END OF FIX ====================

            uiUpdater.appendToMessageLogModal?.(message.text || "", senderClass, msgOptions);
            messageAppended = true;
        }
    
        if (messageAppended) {
            console.log("CSH: Message was appended to a live view, re-rendering active chat list.");
            chatOrchestrator.renderCombinedActiveChatsList();
        }
    }, 0);
}


function initialize(): void {
    console.log("CSH_TS: initialize() - START.");
    chatActiveTargetManager.clearModalMessageTargetConnector();
    // Use the type-safe wrapper function for adding and removing the listener
    document.removeEventListener('new-message-in-store', newMessageInStoreListener); 
    document.addEventListener('new-message-in-store', newMessageInStoreListener);
    console.log("CSH_TS: Added global event listener for 'new-message-in-store'.");
    
    console.log("ChatSessionHandler (TS): Initialized. Modal target cleared. Embedded target state preserved.");
    console.log("CSH_TS: initialize() - FINISHED.");
}

async function openConversationInEmbeddedView(connectorOrId: Connector | string): Promise<void> {
    const targetIdForLock = typeof connectorOrId === 'string' ? connectorOrId : connectorOrId?.id;
    console.log(`CSH_DEBUG_ENTRY: openConversationInEmbeddedView CALLED FOR: ${targetIdForLock}`);
   
    if (!targetIdForLock) {
        console.error("CSH_TS: openConversationInEmbeddedView - Invalid connectorOrId, cannot acquire lock.", connectorOrId);
        chatUiManager.hideEmbeddedChatInterface(); 
        return;
    }
    const operationKey = `embedded-${targetIdForLock}`;

    if (openingEmbeddedOperationId === operationKey) { // <<<< THIS IS THE LOCK CHECK
        console.warn(`CSH.openConversationInEmbeddedView: Already processing ${operationKey}. Preventing re-entry.`);
        return;
    }
    openingEmbeddedOperationId = operationKey; // Acquire lock
    
    try {
        console.log("CSH_TS: openConversationInEmbeddedView() - START. Input:", connectorOrId);
        
        const targetId = targetIdForLock;
        let connectorToOpenWith = (typeof connectorOrId === 'object' && connectorOrId !== null) ? connectorOrId : polyglotConnectors.find(c => c.id === targetId);

        if (!connectorToOpenWith) { 
            console.error("CSH_TS: Could not find connector for embedded view.", { targetId, connectorOrId });
            chatUiManager.hideEmbeddedChatInterface(); 
            return; 
        }

        const currentEmbeddedTargetId = chatActiveTargetManager.getEmbeddedChatTargetId();
        const currentTabManager = window.tabManager as import('../types/global.d.ts').TabManagerModule | undefined;
        const isMessagesTabActive = currentTabManager?.getCurrentActiveTab?.() === 'messages';

        if (currentEmbeddedTargetId === targetId && 
            domElements.embeddedChatContainer?.style.display !== 'none' &&
            isMessagesTabActive) { 
            
            console.warn(`CSH.openConversationInEmbeddedView: Called for ALREADY ACTIVE and VISIBLE 1v1 chat '${targetId}'. Minimal UI update only (e.g., header). Chat log NOT cleared or re-rendered from history.`);
            
            // --- THIS IS THE FIX ---
            // Even on a minimal UI update, we MUST rebuild the prompt to load post-call memories.
            if (window.conversationManager) {
                console.log(`[CSH_PROMPT_REBUILD] 🧠 Forcing prompt rebuild for ALREADY ACTIVE chat [${targetId}]...`);
                await window.conversationManager.getGeminiHistoryForConnector(targetId);
                console.log(`[CSH_PROMPT_REBUILD] ✅ Prompt rebuild complete for active chat.`);
            }
            // --- END OF FIX ---
        
            chatUiManager.showEmbeddedChatInterface(connectorToOpenWith); 
            if (domElements.embeddedMessageTextInput) {
                domElements.embeddedMessageTextInput.focus();
            }
            return; 
        }

        console.log(`CSH.openConversationInEmbeddedView: Proceeding with full display setup for chat '${targetId}'.`);
        uiUpdater.clearEmbeddedChatLog?.();
        chatActiveTargetManager.setEmbeddedChatTargetId(targetId); 
        localStorage.setItem(LAST_EMBEDDED_CHAT_ID_KEY, targetId); 
        
        const { conversation: convo, isNew } = await conversationManager.ensureConversationRecord(targetId, connectorToOpenWith); 

        if (!convo || !convo.connector) {
            console.error(`CSH_TS: Failed to get convo record or connector for '${targetId}'.`);
            chatActiveTargetManager.clearEmbeddedChatTargetId();
            localStorage.removeItem(LAST_EMBEDDED_CHAT_ID_KEY);
            chatUiManager.hideEmbeddedChatInterface();
            return;
        }

        chatUiManager.showEmbeddedChatInterface(convo.connector); 

// =================== START: REBUILD PROMPT ON CHAT OPEN (EMBEDDED) ===================
if (window.conversationManager) {
    console.log(`[CSH_PROMPT_REBUILD] 🧠 Forcing prompt rebuild for [${connectorToOpenWith.id}] on embedded chat open...`);
    // This tells the conversation manager to create a new, fresh Gemini history
    // with the latest memories from the Cerebrum.
    await window.conversationManager.getGeminiHistoryForConnector(connectorToOpenWith.id);
    console.log(`[CSH_PROMPT_REBUILD] ✅ Prompt rebuild complete for [${connectorToOpenWith.id}].`);
}
// ===================  END: REBUILD PROMPT ON CHAT OPEN (EMBEDDED)  ===================


        
        console.log(`CSH.openConversationInEmbeddedView: About to clear and re-render embedded chat log for ${targetId}. History length: ${convo.messages?.length || 0}`);
        console.error(`CSH_DEBUG_EMBEDDED: Messages for ${targetId} BEFORE rendering loop:`, JSON.parse(JSON.stringify(convo.messages || [])));
        
        uiUpdater.clearEmbeddedChatLog?.(); 

// D:\polyglot_connect\src\js\core\chat_session_handler.ts

// <<< START OF REPLACEMENT BLOCK >>>

if (Array.isArray(convo.messages) && convo.messages.length > 0) {
    convo.messages.forEach((msg: MessageInStore) => {
        if (!msg) return;

        // --- Logging for Debugging ---
        console.log(`CSH.openConversationInEmbeddedView - Rendering HISTORICAL msg: ID='${msg.id}', Reactions='${JSON.stringify(msg.reactions)}'`);
        
        // --- Prepare Message Data ---
        let senderClass = msg.sender === 'user-voice-transcript' ? 'user' : (msg.sender === 'user' ? 'user' : 'connector');
        let textForDisplay = msg.text || ""; 

         // THE FIX: Explicitly map the stored 'id' to the 'messageId' property the UI needs.
         const msgOptions: ChatMessageOptions = {
            ...msg, // Spread first to copy all other properties (reactions, etc.)
            messageId: msg.id, // This is the crucial line
            connectorIdForButton: msg.connectorIdForButton,
            connectorNameForDisplay: msg.connectorNameForDisplay
        };
        // ^^^^^^ END OF FIX ^^^^^^

        if (senderClass === 'connector' && convo.connector) {
            msgOptions.senderName = convo.connector.profileName;
            msgOptions.avatarUrl = convo.connector.avatarModern;
            msgOptions.connectorId = convo.connector.id;
        }

        // --- Handle Special Message Types (Voice/Image) ---
        if (msg.isVoiceMemo && msg.audioBlobDataUrl) {
            msgOptions.isVoiceMemo = true;
            msgOptions.audioSrc = msg.audioBlobDataUrl;
        } else if ((msg.isImageMessage || msg.type === 'image') && msg.content_url) {
            msgOptions.imageUrl = msg.content_url;
        }
        
        // --- Render the Message ---
        uiUpdater.appendToEmbeddedChatLog?.(String(textForDisplay), senderClass, msgOptions);
    });
// <<< END OF REPLACEMENT BLOCK >>>
         


} else { 
    console.log(`CSH_TS: Conversation with ${convo.connector!.profileName} has no messages. Showing placeholder.`);
    // uiUpdater.clearEmbeddedChatLog() already cleared it. Now we add the placeholder.
    if (domElements.embeddedChatLog && polyglotHelpers) { 
        const placeholderHTML = `<div class="chat-log-empty-placeholder">
                                    <i class="far fa-comments"></i>
                                    <p>No messages yet with ${polyglotHelpers.sanitizeTextForDisplay(convo.connector!.profileName)}.</p>
                                 </div>`;
        // Only set the placeholder if the log is truly empty
        if (domElements.embeddedChatLog.children.length === 0 || (domElements.embeddedChatLog.children.length === 1 && domElements.embeddedChatLog.firstElementChild?.classList.contains('log-is-loading'))) {
            domElements.embeddedChatLog.innerHTML = placeholderHTML;
        }
    }
}
        uiUpdater.scrollEmbeddedChatToBottom?.();
        if (domElements.embeddedMessageTextInput) domElements.embeddedMessageTextInput.focus();
        
        // --- THIS IS THE FIX ---
        // After successfully setting up the chat content, explicitly tell the
        // TabManager to switch to the 'messages' tab. This will trigger the
        // ShellController to make the view visible.
       
        
        console.log("CSH_TS: openConversationInEmbeddedView() - About to call chatOrchestrator.renderCombinedActiveChatsList()");
        chatOrchestrator.renderCombinedActiveChatsList(); 
        console.log("CSH_TS: openConversationInEmbeddedView() - FINISHED for", targetId);
    } finally {
        if (openingEmbeddedOperationId === operationKey) {
            openingEmbeddedOperationId = null;
            console.log(`CSH.openConversationInEmbeddedView: Cleared processing lock for ${operationKey}.`);
        }
    }



    
}

async function handleMessagesTabBecameActive(): Promise<void> {
    console.log("CSH_TS: handleMessagesTabBecameActive() - START.");
    
    // Get the currently set target ID. This might have been set by a "View Chat" click moments ago.
    const currentTargetId = chatActiveTargetManager.getEmbeddedChatTargetId();
    console.log("CSH_TS: Current active target from CATM (at start of handleMessagesTabBecameActive):", currentTargetId);
    
    // --- THIS IS THE FIX ---
    // If a target is already set, it means another process (like a "View Chat" click)
    // is already handling the chat opening. In this case, this function should do nothing
    // and let the other process finish.
    if (currentTargetId) {
        console.log(`CSH_TS: A chat target ('${currentTargetId}') is already set. Aborting restore-from-memory logic.`);
        
        // As a safety check, ensure the view is actually visible if a target is set.
        if (domElements.embeddedChatContainer && domElements.embeddedChatContainer.style.display === 'none') {
             const connector = (window.polyglotConnectors || []).find(c => c.id === currentTargetId);
             if(connector) {
                console.warn("CSH_TS: Target was set, but view was hidden. Forcing it open.");
                await openConversationInEmbeddedView(connector);
             }
        }
        return; // Exit the function
    }
    // --- END OF FIX ---
    
    // If we reach here, it means no chat target was set, so it's safe to restore from memory.
    console.log("CSH_TS: No current active target. Proceeding to restore a chat from memory.");
    let chatToOpenId: string | null = null;
    
    try {
        const storedId = localStorage.getItem(LAST_EMBEDDED_CHAT_ID_KEY);
        if (storedId && polyglotConnectors.some(c => c.id === storedId)) {
            chatToOpenId = storedId;
        }
    } catch (e) { 
        console.warn("CSH_TS: Error reading last embedded chat ID from localStorage", e);
    }
    
    console.log("CSH_TS: Effective chatToOpenId to restore from memory:", chatToOpenId);

    if (chatToOpenId) {
        const { conversation: convo } = await conversationManager.ensureConversationRecord(chatToOpenId);
        const connectorToOpen = convo?.connector;
        if (connectorToOpen) {
            await openConversationInEmbeddedView(connectorToOpen); 
        } else {
            chatUiManager.hideEmbeddedChatInterface();
        }
    } else {
        // If no last chat, open the most recent conversation instead
        const allConversations = conversationManager.getActiveConversations(); 
        const convosWithMessages = allConversations.filter(c => c.messages?.length > 0 && c.connector && !c.isGroup);
        if (convosWithMessages.length > 0) {
            convosWithMessages.sort((a, b) => (Number(b.lastActivity) || 0) - (Number(a.lastActivity) || 0));
            await openConversationInEmbeddedView(convosWithMessages[0].connector);
        } else {
            // No chats at all, hide the interface
            chatUiManager.hideEmbeddedChatInterface();
        }
    }
    
    // The list of active chats on the right sidebar should always be fresh.
    chatOrchestrator.renderCombinedActiveChatsList();
    console.log("CSH_TS: handleMessagesTabBecameActive() - FINISHED.");
}



// =================== REPLACE THE ENTIRE FUNCTION WITH THIS ===================
async function openMessageModalForConnector(connector: Connector): Promise<void> {
    console.log(`CSH_DEBUG_ENTRY: openMessageModalForConnector CALLED FOR: ${connector?.id}`);
    if (!connector?.id) { 
        console.error("CSH_TS: Invalid connector for modal. Cannot proceed."); 
        return; 
    }
    const operationKey = `modal-${connector.id}`;
    if (openingModalOperationId === operationKey) {
        console.warn(`CSH.openMessageModalForConnector: Already processing ${operationKey}. Preventing re-entry.`);
        return;
    }
    openingModalOperationId = operationKey;

    try {
        console.log("CSH_TS: openMessageModalForConnector() - START for", connector.id);
        const isModalVisible = modalHandler.isVisible?.(domElements.messagingInterface);
        const currentModalTargetConnector = chatActiveTargetManager.getModalMessageTargetConnector();
        
        if (currentModalTargetConnector?.id === connector.id && isModalVisible) {
            console.warn(`CSH: Modal for ${connector.id} is already open. Focusing input.`);
            domElements.messageTextInput?.focus();
            return; 
        }

        // --- START OF THE FIX ---
        
        // 1. Set the target and update the UI header immediately.
        chatActiveTargetManager.setModalMessageTargetConnector(connector);
        uiUpdater.updateMessageModalHeader(connector);
        uiUpdater.clearMessageModalLog?.();
        
        // 2. Ensure the prompt is ready with latest memories BEFORE user can type.
        await conversationManager.getGeminiHistoryForConnector(connector.id);
        console.log(`[CSH_PROMPT_REBUILD] ✅ Prompt ready for modal with [${connector.id}].`);

        // 3. Check if a conversation with messages *already exists*.
        const existingConvo = conversationManager.getConversationById(connector.id);
        
        if (existingConvo && existingConvo.messages?.length > 0) {
            console.log(`CSH: Populating ${existingConvo.messages.length} messages from existing conversation for ${connector.id}.`);
            existingConvo.messages.forEach((msg: MessageInStore) => {
                const senderClass = msg.sender === 'user' ? 'user' : 'connector';

                const msgOptions: ChatMessageOptions = {
                    ...msg, // Spread all properties from the stored message (like reactions)
                    messageId: msg.id, // <<< THIS IS THE ONLY LINE YOU NEED TO ADD
                    avatarUrl: connector.avatarModern,
                    senderName: connector.profileName,
                    connectorId: connector.id,
                };

                uiUpdater.appendToMessageLogModal?.(msg.text || "", senderClass, msgOptions);
            });
// ====================================================================================
            
        } else {
            // This is a NEW chat or an EMPTY one. Show a placeholder.
            // CRUCIALLY, we do NOT create the record here and do NOT update the active chat list.
            console.log(`CSH: New/empty modal conversation with ${connector.profileName}. Displaying placeholder.`);
            if (domElements.messageChatLog && polyglotHelpers) {
                domElements.messageChatLog.innerHTML =
                    `<div class="chat-log-empty-placeholder">
                        <i class="far fa-comments"></i>
                        <p>No messages yet with ${polyglotHelpers.sanitizeTextForDisplay(connector.profileName)}.</p>
                    </div>`;
            }
        }

        // 4. Open the modal and set up the input.
        uiUpdater.scrollMessageModalToBottom?.();
        uiUpdater.resetMessageModalInput?.();
        if (domElements.messagingInterface) modalHandler.open(domElements.messagingInterface);
        domElements.messageTextInput?.focus();
        
        console.log("CSH_TS: openMessageModalForConnector() - FINISHED for", connector.id);
        // --- END OF FIX ---

    } finally {
        if (openingModalOperationId === operationKey) {
            openingModalOperationId = null;
            console.log(`CSH.openMessageModalForConnector: Cleared processing lock for ${operationKey}.`);
        }
    }
}
// ============================================================================
    
    function endActiveModalMessagingSession(): void {
         console.log("CSH_TS: endActiveModalMessagingSession() - START.");
         if (modalHandler.close && domElements.messagingInterface) {
             modalHandler.close(domElements.messagingInterface);
         }
         chatActiveTargetManager.clearModalMessageTargetConnector();
         if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
         chatOrchestrator.renderCombinedActiveChatsList();
         console.log("CSH_TS: endActiveModalMessagingSession() - FINISHED.");
    }

    console.log("chat_session_handler.ts: IIFE (module definition) FINISHED.");
    return { 
        initialize,
        openConversationInEmbeddedView,
        handleMessagesTabBecameActive,
        openMessageModalForConnector,
        endActiveModalMessagingSession
    };
})(); 

   Object.assign(window.chatSessionHandler!, serviceMethods); 

if (window.chatSessionHandler && typeof (window.chatSessionHandler as ChatSessionHandlerModule).initialize === 'function') {
    console.log("chat_session_handler.ts: SUCCESSFULLY assigned and populated window.chatSessionHandler.");
} else {
    console.error("chat_session_handler.ts: CRITICAL ERROR - window.chatSessionHandler population FAILED.");
}
document.dispatchEvent(new CustomEvent('chatSessionHandlerReady'));
console.log('chat_session_handler.ts: "chatSessionHandlerReady" event dispatched (after full init attempt).');

} 

const dependenciesForCSH = [
    'domElementsReady', 'uiUpdaterReady', 'modalHandlerReady', 'listRendererReady',
    'chatUiManagerReady', 
    'conversationManagerReady', 'chatActiveTargetManagerReady',
    'textMessageHandlerReady', 'polyglotDataReady', 
    'chatOrchestratorReady', 'polyglotHelpersReady'
];
const cshMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForCSH.forEach(dep => cshMetDependenciesLog[dep] = false);
let cshDepsMetCount = 0;

function checkAndInitCSH(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`CSH_EVENT: Listener for '${receivedEventName}' was triggered.`);
        if (!cshMetDependenciesLog[receivedEventName]) {
            let eventDependencyVerified = false; 
            switch (receivedEventName) {
                case 'domElementsReady': eventDependencyVerified = !!window.domElements; break;
                case 'uiUpdaterReady': eventDependencyVerified = !!(window.uiUpdater && typeof window.uiUpdater?.appendToEmbeddedChatLog === 'function'); break;
                case 'modalHandlerReady': eventDependencyVerified = !!(window.modalHandler && typeof window.modalHandler?.open === 'function'); break;
                case 'listRendererReady': eventDependencyVerified = !!(window.listRenderer && typeof window.listRenderer?.renderActiveChatList === 'function'); break;
               case 'chatUiManagerReady': eventDependencyVerified = !!(window.chatUiManager && typeof window.chatUiManager?.showEmbeddedChatInterface === 'function'); break;
                case 'conversationManagerReady': eventDependencyVerified = !!(window.conversationManager && typeof window.conversationManager?.ensureConversationRecord === 'function'); break;
                case 'chatActiveTargetManagerReady': eventDependencyVerified = !!(window.chatActiveTargetManager && typeof window.chatActiveTargetManager?.setEmbeddedChatTargetId === 'function'); break;
                case 'textMessageHandlerReady': eventDependencyVerified = !!(window.textMessageHandler && typeof (window.textMessageHandler as any)?.sendEmbeddedTextMessage === 'function'); break;
                case 'polyglotDataReady': eventDependencyVerified = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)); break;
                case 'chatOrchestratorReady': eventDependencyVerified = !!(window.chatOrchestrator && typeof window.chatOrchestrator?.renderCombinedActiveChatsList === 'function'); break;
                case 'polyglotHelpersReady': eventDependencyVerified = !!(window.polyglotHelpers && typeof window.polyglotHelpers?.sanitizeTextForDisplay === 'function'); break;
                default: console.warn(`CSH_EVENT: Unknown event '${receivedEventName}'`); return;
            }

            if (eventDependencyVerified) {
                cshMetDependenciesLog[receivedEventName] = true;
                cshDepsMetCount++;
                console.log(`CSH_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${cshDepsMetCount}/${dependenciesForCSH.length}`);
            } else {
                 console.warn(`CSH_EVENT: Event '${receivedEventName}' received, but window dependency verification FAILED.`);
            }
        }
    }
    console.log(`CSH_DEPS: Met status:`, JSON.stringify(cshMetDependenciesLog));

    if (cshDepsMetCount === dependenciesForCSH.length) {
        console.log('chat_session_handler.ts: All dependencies met and verified. Initializing actual ChatSessionHandler.');
        initializeActualChatSessionHandler(); 
    }
}

console.log('CSH_SETUP: Starting initial dependency pre-check for ChatSessionHandler.');
cshDepsMetCount = 0;
Object.keys(cshMetDependenciesLog).forEach(key => cshMetDependenciesLog[key] = false);
let cshAllPreloadedAndVerified = true;

dependenciesForCSH.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false;

    switch (eventName) {
        case 'domElementsReady': isReadyNow = !!window.domElements; isVerifiedNow = isReadyNow; break;
        case 'uiUpdaterReady': isReadyNow = !!window.uiUpdater; isVerifiedNow = !!(isReadyNow && typeof window.uiUpdater?.appendToEmbeddedChatLog === 'function'); break;
        case 'modalHandlerReady': isReadyNow = !!window.modalHandler; isVerifiedNow = !!(isReadyNow && typeof window.modalHandler?.open === 'function'); break;
        case 'listRendererReady': isReadyNow = !!window.listRenderer; isVerifiedNow = !!(isReadyNow && typeof window.listRenderer?.renderActiveChatList === 'function'); break;
    case 'chatUiManagerReady': isReadyNow = !!window.chatUiManager; isVerifiedNow = !!(isReadyNow && typeof window.chatUiManager?.showEmbeddedChatInterface === 'function'); break;
        case 'conversationManagerReady': isReadyNow = !!window.conversationManager; isVerifiedNow = !!(isReadyNow && typeof window.conversationManager?.ensureConversationRecord === 'function'); break;
        case 'chatActiveTargetManagerReady': isReadyNow = !!window.chatActiveTargetManager; isVerifiedNow = !!(isReadyNow && typeof window.chatActiveTargetManager?.setEmbeddedChatTargetId === 'function'); break;
        case 'textMessageHandlerReady': 
            isReadyNow = !!window.textMessageHandler; 
            isVerifiedNow = !!(isReadyNow && typeof (window.textMessageHandler as any)?.sendEmbeddedTextMessage === 'function'); 
            break;
        case 'polyglotDataReady': isReadyNow = !!window.polyglotConnectors; isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotConnectors)); break;
        case 'chatOrchestratorReady': isReadyNow = !!window.chatOrchestrator; isVerifiedNow = !!(isReadyNow && typeof window.chatOrchestrator?.renderCombinedActiveChatsList === 'function'); break;
        case 'polyglotHelpersReady': isReadyNow = !!window.polyglotHelpers; isVerifiedNow = !!(isReadyNow && typeof window.polyglotHelpers?.sanitizeTextForDisplay === 'function'); break;
        default: console.warn(`CSH_PRECHECK: Unknown dependency: ${eventName}`); break;
    }

    console.log(`CSH_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if (!cshMetDependenciesLog[eventName]) {
            cshMetDependenciesLog[eventName] = true;
            cshDepsMetCount++;
        }
    } else {
        cshAllPreloadedAndVerified = false;
        console.log(`CSH_PRECHECK: Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, function anEventListener() { 
            checkAndInitCSH(eventName);
        }, { once: true });
    }
});

console.log(`CSH_SETUP: Pre-check done. Met: ${cshDepsMetCount}/${dependenciesForCSH.length}`, JSON.stringify(cshMetDependenciesLog));

if (cshAllPreloadedAndVerified && cshDepsMetCount === dependenciesForCSH.length) {
    console.log('chat_session_handler.ts: All dependencies ALREADY MET. Initializing directly.');
    initializeActualChatSessionHandler();
} else if (cshDepsMetCount > 0 && cshDepsMetCount < dependenciesForCSH.length) {
    console.log(`chat_session_handler.ts: Some deps pre-verified, waiting for events.`);
} else if (cshDepsMetCount === 0 && !cshAllPreloadedAndVerified) {
    console.log(`chat_session_handler.ts: No deps pre-verified. Waiting for all events.`);
}

console.log("chat_session_handler.ts: Script execution FINISHED (TS Version).");