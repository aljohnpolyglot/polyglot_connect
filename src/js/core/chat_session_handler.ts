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
    ChatMessageOptions,
    ChatUiUpdaterModule
    // Assuming MessageInStore is defined and exported from global.d.ts or another types file
} from '../types/global.d.ts';

console.log('chat_session_handler.ts: Script loaded, waiting for core dependencies (TS Version).');
interface ChatSessionHandlerModule {
    initialize: () => void;
    openConversationInEmbeddedView: (
        connectorOrId: Connector | string,
        registeredUserNameForPrompt?: string // <<< ADDED OPTIONAL PARAMETER
    ) => Promise<void>;
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
        chatUiUpdater: ChatUiUpdaterModule; // <<< CORRECTED: Use ChatUiUpdaterModule
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
            polyglotHelpers: window.polyglotHelpers,
            chatUiUpdater: window.chatUiUpdater
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
         if (!deps.chatUiUpdater || typeof deps.chatUiUpdater.showLoadingInEmbeddedChatLog !== 'function') missing.push("chatUiUpdater");
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
        textMessageHandler, polyglotConnectors, chatOrchestrator, polyglotHelpers, chatUiUpdater
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
// src/js/core/chat_session_handler.ts (The NEW version)

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
        if (message.type === 'call_event') {
            console.log(
                '%c[CALL_EVENT_TRACE #3] CSH: Received call event from store. Full message object:', 
                'color: white; background-color: #FF8C00; padding: 2px;',
                JSON.parse(JSON.stringify(message))
            );
        }
        // --- THIS IS THE FIX (APPLIED TO EMBEDDED VIEW) ---
        let senderClass: string;
        if (message.sender === 'user') {
            senderClass = 'user';
        } else if (message.type === 'call_event') {
            senderClass = 'system-call-event';
        } else {
            senderClass = 'connector';
        }
        // --- END OF FIX ---

        // LOGIC FOR EMBEDDED CHAT
        if (currentEmbeddedId && currentEmbeddedId === connectorId) {
            console.log(`CSH: New message for active embedded chat (${connectorId}). Appending to UI with class: ${senderClass}`);
            
            // --- THIS IS THE FIX ---
            // The `message` object itself becomes the 'options' payload.
            // We pass the text and senderClass separately.
            uiUpdater.appendToEmbeddedChatLog?.(message.text || '', senderClass, message);
            messageAppended = true;
        }
    
        // LOGIC FOR MODAL CHAT (The same fix is implicitly applied via the senderClass variable)
        if (currentModalConnector && currentModalConnector.id === connectorId) {
            console.log(`CSH: New message for active modal chat (${connectorId}). Appending to UI with class: ${senderClass}`);
            const msgOptions: ChatMessageOptions = {
                ...message,
                avatarUrl: currentModalConnector.avatarModern,
                senderName: currentModalConnector.profileName,
                connectorId: currentModalConnector.id,
            };
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
// D:\polyglot_connect\src\js\core\chat_session_handler.ts
// ... (imports and other functions) ...

// D:\polyglot_connect\src\js\core\chat_session_handler.ts

// ... (existing imports and other surrounding code) ...

async function openConversationInEmbeddedView(
    connectorOrId: Connector | string,
    registeredUserNameForPrompt?: string // Parameter to pass the Firebase display name
): Promise<void> {
    const targetIdForLock = typeof connectorOrId === 'string' ? connectorOrId : connectorOrId?.id;
    console.log(`CSH_DEBUG_ENTRY: openConversationInEmbeddedView CALLED FOR: ${targetIdForLock}, RegisteredName: ${registeredUserNameForPrompt}`);

    if (!targetIdForLock) {
        console.error("CSH_TS: openConversationInEmbeddedView - Invalid connectorOrId.", connectorOrId);
        chatUiManager.hideEmbeddedChatInterface(); // Ensure UI is hidden if no valid target
        return;
    }
    const operationKey = `embedded-${targetIdForLock}`;

    if (openingEmbeddedOperationId === operationKey) {
        console.warn(`CSH: Already processing openConversationInEmbeddedView for ${operationKey}. Ignoring duplicate call.`);
        return;
    }
    openingEmbeddedOperationId = operationKey;

    try {
        const connector = (typeof connectorOrId === 'object' && connectorOrId !== null)
            ? connectorOrId
            : polyglotConnectors.find(c => c.id === targetIdForLock);

        if (!connector) {
            console.error("CSH_TS: Could not find connector for embedded view.", { targetIdForLock });
            chatUiManager.hideEmbeddedChatInterface();
            openingEmbeddedOperationId = null;
            return;
        }

        // 1. Set active target, update UI header, and show loading spinner
        chatActiveTargetManager.setEmbeddedChatTargetId(connector.id);
        localStorage.setItem(LAST_EMBEDDED_CHAT_ID_KEY, connector.id); // Persist for session restore
        chatUiManager.showEmbeddedChatInterface(connector); // Updates header, makes chat visible
        chatUiUpdater.showLoadingInEmbeddedChatLog?.(); // Show loading while history is fetched

        // 2. Ensure the conversation record exists in Firestore and get its ID
        const conversationId = await conversationManager.ensureConversationRecord(connector);
        if (!conversationId) {
            console.error(`CSH_TS: Failed to get/create conversationId for connector: ${connector.id}`);
            chatActiveTargetManager.clearEmbeddedChatTargetId(); // Clear target if setup fails
            chatUiUpdater.showErrorInEmbeddedChatLog?.("An unexpected error occurred loading the chat.");
            openingEmbeddedOperationId = null;
            return;
        }

        // Set conversation context on the DOM element for TextMessageHandler or other modules to pick up
        if (domElements.embeddedChatContainer) {
            domElements.embeddedChatContainer.dataset.currentConversationId = conversationId;
            domElements.embeddedChatContainer.dataset.currentConnectorId = connector.id;
            // Store the registeredUserNameForPrompt on the DOM element if it's a first interaction scenario.
            // TextMessageHandler can then pick this up when building the prompt for the user's first message.
            if (registeredUserNameForPrompt) {
                 domElements.embeddedChatContainer.dataset.registeredUserName = registeredUserNameForPrompt;
            } else {
                // Clear it if not provided, for subsequent openings of the same chat
                delete domElements.embeddedChatContainer.dataset.registeredUserName;
            }
            console.log(`CSH_TS: Set data attributes on embeddedChatContainer. ConvID: '${conversationId}', ConnectorID: '${connector.id}', RegisteredName: '${registeredUserNameForPrompt || 'N/A'}'`);
        }

        // 3. Await message listener setup for the specific conversation
        // This will start populating the local cache with messages from Firestore.
        await conversationManager.setActiveConversationAndListen(conversationId);
        console.log(`CSH_TS: Message listener is now active for ${conversationId}.`);

        // 4. Get messages from cache (now populated by the listener)
        const cachedConvo = conversationManager.getConversationById(conversationId);
        console.log(`CSH_TS: Rendering messages. Found ${cachedConvo?.messages?.length || 0} in cache for ${conversationId}.`);

        // 5. Clear loading spinner and render messages or placeholder
        uiUpdater.clearEmbeddedChatLog?.(); // Clear loading spinner

        const isFirstEverInteraction = !cachedConvo?.messages || cachedConvo.messages.length === 0;

        if (isFirstEverInteraction) {
            // No messages yet. Display a placeholder.
            // The "Preferred Name Inquiry" rule will be part of the system prompt
            // when the USER sends their first message.
            console.log(`CSH_TS: No messages found for ${connector.id}. Displaying placeholder.`);
            if (domElements.embeddedChatLog && polyglotHelpers) {
                const placeholderHTML = `<div class="chat-log-empty-placeholder"><i class="far fa-comments"></i><p>Start the conversation with ${polyglotHelpers.sanitizeTextForDisplay(connector.profileName)}.</p></div>`;
                domElements.embeddedChatLog.innerHTML = placeholderHTML;
            }
        } if (cachedConvo?.messages && cachedConvo.messages.length > 0) {
            cachedConvo.messages.forEach(msg => { // msg is of type MessageInStore
                let senderClass: string;
                
                // Determine the CSS class for the message bubble
                if (msg.sender === 'user') {
                    senderClass = 'user';
                } else if (msg.type === 'call_event') {
                    senderClass = 'system-call-event';
                } else if (msg.senderId === 'system' || msg.type === 'system_event') {
                    senderClass = 'system-message';
                    if (msg.isError) senderClass += ' error-message-bubble';
                } else { // Assumed to be a connector/AI message
                    senderClass = 'connector';
                }
            
                // Construct the options object for the UI updater
                const optionsForUI: ChatMessageOptions = {
                    ...msg, // THE FIX: Copy all properties from the message first
            
                    // Add or override properties specific to the UI rendering
                    avatarUrl: msg.sender === 'user' ? undefined : (msg.avatarUrl || connector.avatarModern),
                    senderName: msg.sender === 'user' ? undefined : (msg.senderName || connector.profileName),
                    speakerId: msg.sender === 'user' ? undefined : (msg.speakerId || connector.id),
                    connectorId: msg.sender === 'user' ? undefined : (msg.connectorId || connector.id),
            
                    // Explicitly map fields that might have different names or need logic
                    isVoiceMemo: msg.type === 'voice_memo',
                    audioSrc: msg.type === 'voice_memo' ? msg.content_url || undefined : undefined,
                    imageUrl: msg.type === 'image' ? msg.imageUrl || undefined : undefined,
                };
            

                if (msg.sender === 'connector' && connector) { // Assuming 'connector' is the AI
                     optionsForUI.avatarUrl = msg.avatarUrl || connector.avatarModern;
                     optionsForUI.senderName = msg.senderName || connector.profileName;
                     optionsForUI.speakerId = msg.speakerId || connector.id; // Or msg.senderId
                     optionsForUI.connectorId = msg.connectorId || connector.id;
                }


                if (msg.type === 'voice_memo') { console.log('[CSH] Historical Voice Memo - optionsForUI:', JSON.stringify(optionsForUI));
                    optionsForUI.isVoiceMemo = true;
                    optionsForUI.audioSrc = msg.content_url || undefined; // <<< CRITICAL MAPPING
                    if (!msg.content_url) {
                        console.warn(`[CSH] Rendering historical voice memo (ID: ${msg.messageId}) but content_url is missing! Player will not work.`);
                    }
                } else if (msg.type === 'image') {
                    optionsForUI.imageUrl = msg.imageUrl || undefined; // Map imageUrl for images
                    if (!msg.imageUrl) {
                        console.warn(`[CSH] Rendering historical image message (ID: ${msg.messageId}) but imageUrl is missing!`);
                    }
                }
                // Add other type-specific mappings if necessary

                console.log(`[CSH] Preparing to render historical message. Type: ${msg.type}, AppMessageID: ${msg.messageId}, AudioSrc for UI: ${optionsForUI.audioSrc}`);
              if (domElements.embeddedChatContainer?.dataset.currentConnectorId === connector.id) {
         uiUpdater.appendToEmbeddedChatLog?.(msg.text || '', senderClass, optionsForUI);
    } else if (domElements.messagingInterface?.dataset.currentConnectorId === connector.id) {
         uiUpdater.appendToMessageLogModal?.(msg.text || '', senderClass, optionsForUI);
    }
            });
        }

        // 6. Finalize UI
        uiUpdater.scrollEmbeddedChatToBottom?.(domElements.embeddedChatLog);
        domElements.embeddedMessageTextInput?.focus();
        chatOrchestrator.renderCombinedActiveChatsList(); // Refresh sidebar

    } catch (error) {
        console.error("CSH_TS: Unhandled error in openConversationInEmbeddedView:", error);
        chatActiveTargetManager.clearEmbeddedChatTargetId();
        // Attempt to show error in UI, even if some deps might be problematic
        resolvedDeps?.chatUiUpdater?.showErrorInEmbeddedChatLog?.("An unexpected error occurred while opening the chat.");
    } finally {
        // Release the lock for this specific operation
        if (openingEmbeddedOperationId === operationKey) {
            openingEmbeddedOperationId = null;
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
        // Find the full connector object from the master list using the ID.
        const connectorToOpen = polyglotConnectors.find(c => c.id === chatToOpenId);
    
        if (connectorToOpen) {
            // Fetch displayName if needed for restoring a chat that might be a first interaction
            const user = window.auth?.currentUser; // Assuming window.auth is available
            const displayNameForRestore = user?.displayName || undefined;
            await openConversationInEmbeddedView(connectorToOpen, displayNameForRestore); // Pass it here too
        } else {
            console.warn(`CSH: Could not find connector for last active chat ID: ${chatToOpenId}`);
            chatUiManager.hideEmbeddedChatInterface();
        }
    }else {
        // If no last chat, open the most recent conversation instead
        const allConversations = conversationManager.getActiveConversations(); 
        const convosWithMessages = allConversations.filter(c => c.messages?.length > 0 && c.connector && !c.isGroup);
        if (convosWithMessages.length > 0) {
            convosWithMessages.sort((a, b) => (Number(b.lastActivity) || 0) - (Number(a.lastActivity) || 0));
            const user = window.auth?.currentUser;
            const displayNameForMostRecent = user?.displayName || undefined;
            await openConversationInEmbeddedView(convosWithMessages[0].connector, displayNameForMostRecent); // Pass it
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

// D:\polyglot_connect\src\js\core\chat_session_handler.ts
// ... (imports and other functions) ...

async function openMessageModalForConnector(connector: Connector): Promise<void> {
    console.log(`CSH_DEBUG_ENTRY: openMessageModalForConnector CALLED FOR: ${connector?.id}`);
    if (!connector?.id) {
        console.error("CSH_TS: Invalid connector for modal. Cannot proceed.");
        return;
    }
    const operationKey = `modal-${connector.id}`;
    if (openingModalOperationId === operationKey) {
        console.warn(`CSH: Already processing openMessageModalForConnector for ${operationKey}.`);
        return;
    }
    openingModalOperationId = operationKey;

    try {
        chatActiveTargetManager.setModalMessageTargetConnector(connector);
        uiUpdater.updateMessageModalHeader(connector);
        uiUpdater.clearMessageModalLog?.(); // Clear log before showing loading/messages

        // Show loading state in modal log (optional, but good UX)
        // You might need a new method in chatUiUpdater for modal loading/error, or adapt existing ones.
        // For now, we'll proceed without it and clear directly before rendering.

        const conversationId = await conversationManager.ensureConversationRecord(connector);
        if (!conversationId) {
            console.error(`CSH_TS: Failed to get/create conversationId for modal chat with: ${connector.id}`);
            chatActiveTargetManager.clearModalMessageTargetConnector();
            // Potentially show error in modal log here
            openingModalOperationId = null;
            return;
        }

        // --- FIX: Set dataset.currentConversationId AFTER conversationId is defined ---
        if (domElements.messagingInterface) {
            domElements.messagingInterface.dataset.currentConversationId = conversationId;
            domElements.messagingInterface.dataset.currentConnectorId = connector.id;
            console.log(`CSH_TS: Set data-current-conversation-id to '${conversationId}' on messagingInterface.`);
        }
        // --- END OF FIX ---

        await conversationManager.setActiveConversationAndListen(conversationId); // Await listener setup
        console.log(`CSH_TS: Message listener is now active for MODAL chat ${conversationId}.`);

        const cachedConvo = conversationManager.getConversationById(conversationId);
        // Clear log again *before* rendering, in case loading spinner was there

        uiUpdater.clearMessageModalLog?.(); // Clear log before rendering

        if (cachedConvo?.messages && cachedConvo.messages.length > 0) {
            cachedConvo.messages.forEach(msg => { // msg is of type MessageInStore
                let senderClass: string;
                
                // Determine the CSS class for the message bubble
                if (msg.sender === 'user') {
                    senderClass = 'user';
                } else if (msg.type === 'call_event') {
                    senderClass = 'system-call-event';
                } else if (msg.senderId === 'system' || msg.type === 'system_event') {
                    senderClass = 'system-message';
                    if (msg.isError) senderClass += ' error-message-bubble';
                } else { // Assumed to be a connector/AI message
                    senderClass = 'connector';
                }
            
                // Construct the options object for the UI updater
                const optionsForUI: ChatMessageOptions = {
                    ...msg, // THE FIX: Copy all properties from the message first
            
                    // Add or override properties specific to the UI rendering
                    avatarUrl: msg.sender === 'user' ? undefined : (msg.avatarUrl || connector.avatarModern),
                    senderName: msg.sender === 'user' ? undefined : (msg.senderName || connector.profileName),
                    speakerId: msg.sender === 'user' ? undefined : (msg.speakerId || connector.id),
                    connectorId: msg.sender === 'user' ? undefined : (msg.connectorId || connector.id),
            
                    // Explicitly map fields that might have different names or need logic
                    isVoiceMemo: msg.type === 'voice_memo',
                    audioSrc: msg.type === 'voice_memo' ? msg.content_url || undefined : undefined,
                    imageUrl: msg.type === 'image' ? msg.imageUrl || undefined : undefined,
                };

                if (msg.type === 'voice_memo') {
                    optionsForUI.isVoiceMemo = true;
                    optionsForUI.audioSrc = msg.content_url || undefined; // <<< CRITICAL MAPPING
                    if (!msg.content_url) {
                        console.warn(`[CSH - Modal] Rendering historical voice memo (ID: ${msg.messageId}) but content_url is missing! Player will not work.`);
                    }
                } else if (msg.type === 'image') {
                    optionsForUI.imageUrl = msg.imageUrl || undefined;
                    if (!msg.imageUrl) {
                        console.warn(`[CSH - Modal] Rendering historical image message (ID: ${msg.messageId}) but imageUrl is missing!`);
                    }
                }
                // Add other type-specific mappings if necessary

                if (msg.type === 'voice_memo') { // Extra log for voice memos
                    console.log(`[CSH - Modal] Historical Voice Memo - optionsForUI:`, JSON.stringify(optionsForUI));
                }
                if (domElements.embeddedChatContainer?.dataset.currentConnectorId === connector.id) {
                    uiUpdater.appendToEmbeddedChatLog?.(msg.text || '', senderClass, optionsForUI);
               } else if (domElements.messagingInterface?.dataset.currentConnectorId === connector.id) {
                    uiUpdater.appendToMessageLogModal?.(msg.text || '', senderClass, optionsForUI);
               }
            });
        } else {
            // Handle empty placeholder for modal
            if (domElements.messageChatLog && polyglotHelpers) {
                domElements.messageChatLog.innerHTML = `<div class="chat-log-empty-placeholder"><i class="far fa-comments"></i><p>No messages yet with ${polyglotHelpers.sanitizeTextForDisplay(connector.profileName)}.</p></div>`;
            }
        }
        
        modalHandler.open(domElements.messagingInterface);
        uiUpdater.scrollMessageModalToBottom?.();
        uiUpdater.resetMessageModalInput?.();
        domElements.messageTextInput?.focus();
        
        // No need to call setActiveConversationAndListen again here, it was done above.

    } catch (error) {
        console.error("CSH_TS: Error in openMessageModalForConnector:", error);
        chatActiveTargetManager.clearModalMessageTargetConnector();
        // Potentially show error in modal log
    } finally {
        if (openingModalOperationId === operationKey) {
            openingModalOperationId = null;
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
    'chatOrchestratorReady', 'polyglotHelpersReady', 'chatUiUpdaterReady'
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
               case 'chatUiUpdaterReady': eventDependencyVerified = !!(window.chatUiUpdater && typeof window.chatUiUpdater?.appendChatMessage === 'function'); break;
               
               
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
      
        case 'chatUiUpdaterReady': // <<< ADD THIS CASE
        isReadyNow = !!window.chatUiUpdater;
        // Add a check for a key function on chatUiUpdater if you want to be thorough for "verified" status
        isVerifiedNow = !!(isReadyNow && typeof window.chatUiUpdater?.appendChatMessage === 'function'); // Or showLoadingInEmbeddedChatLog
        break;
      
      
      
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