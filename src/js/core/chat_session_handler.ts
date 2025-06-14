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

   function initialize(): void {
    console.log("CSH_TS: initialize() - START.");
    chatActiveTargetManager.clearModalMessageTargetConnector(); 
    console.log("ChatSessionHandler (TS): Initialized. Modal target cleared. Embedded target state preserved.");
    console.log("CSH_TS: initialize() - FINISHED.");
}

async function openConversationInEmbeddedView(connectorOrId: Connector | string): Promise<void> {
    const targetIdForLock = typeof connectorOrId === 'string' ? connectorOrId : connectorOrId?.id;
    console.error("CSH_DEBUG_ENTRY: openConversationInEmbeddedView CALLED FOR:", targetIdForLock, "Stack:", new Error().stack); // <<< ADD THIS
   
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
            chatUiManager.showEmbeddedChatInterface(connectorToOpenWith); 
            if (domElements.embeddedMessageTextInput) {
                domElements.embeddedMessageTextInput.focus();
            }
            return; 
        }

        console.log(`CSH.openConversationInEmbeddedView: Proceeding with full display setup for chat '${targetId}'.`);

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
        
        console.log(`CSH.openConversationInEmbeddedView: About to clear and re-render embedded chat log for ${targetId}. History length: ${convo.messages?.length || 0}`);
        console.error(`CSH_DEBUG_EMBEDDED: Messages for ${targetId} BEFORE rendering loop:`, JSON.parse(JSON.stringify(convo.messages || [])));
        
        uiUpdater.clearEmbeddedChatLog?.(); 

// D:\polyglot_connect\src\js\core\chat_session_handler.ts

// <<< START OF REPLACEMENT BLOCK >>>
if (Array.isArray(convo.messages) && convo.messages.length > 0) {
    convo.messages.forEach((msg: MessageInStore) => {
        if (!msg) return;

        // --- Logging for Debugging ---
        console.log(`CSH.openConversationInEmbeddedView - Rendering HISTORICAL msg: ID='${msg.id}', Text='${msg.text?.substring(0,30)}', Type='${msg.type}', Sender='${msg.sender}'`);
        
        // --- Prepare Message Data ---
        let senderClass = msg.sender === 'user-voice-transcript' ? 'user' : (msg.sender === 'user' ? 'user' : 'connector');
        let textForDisplay = msg.text || ""; 

        const msgOptions: ChatMessageOptions = {
            timestamp: msg.timestamp,
            messageId: msg.id,
            type: msg.type,
            eventType: msg.eventType,
            duration: msg.duration,
            callSessionId: msg.callSessionId,
            connectorIdForButton: msg.connectorIdForButton,
            connectorNameForDisplay: msg.connectorNameForDisplay,
            imageSemanticDescription: msg.imageSemanticDescription
        };

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
            console.log(`CSH_TS: Conversation with ${convo.connector!.profileName} has no messages to display.`);
            if (domElements.embeddedChatLog && polyglotHelpers) { 
                domElements.embeddedChatLog.innerHTML = 
                    `<p class="chat-log-placeholder">No messages yet with ${polyglotHelpers.sanitizeTextForDisplay(convo.connector!.profileName || 'this contact')}.<br>Send a message to start the conversation!</p>`;
            }
        }
        uiUpdater.scrollEmbeddedChatToBottom?.();
        if (domElements.embeddedMessageTextInput) domElements.embeddedMessageTextInput.focus();
        
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
    
    let currentEmbeddedId = chatActiveTargetManager.getEmbeddedChatTargetId();
    console.log("CSH_TS: Current active target from CATM (at start of handleMessagesTabBecameActive):", currentEmbeddedId);
    let chatToOpenId: string | null = currentEmbeddedId;

    if (!chatToOpenId) {
        console.log("CSH_TS: No current active target, checking localStorage for LAST_EMBEDDED_CHAT_ID_KEY...");
        try {
            const storedId = localStorage.getItem(LAST_EMBEDDED_CHAT_ID_KEY);
            console.log("CSH_TS: Value from localStorage for LAST_EMBEDDED_CHAT_ID_KEY:", storedId); 
            if (storedId) {
                console.log("CSH_TS: Available polyglotConnectors for validation:", JSON.parse(JSON.stringify(polyglotConnectors || [])));
                if (polyglotConnectors.some((c: Connector) => c.id === storedId)) {
                    console.log("CSH_TS: Stored ID", storedId, "is VALID and found in polyglotConnectors.");
                    chatToOpenId = storedId;
                } else {
                    console.warn("CSH_TS: Stored chat ID", storedId, "no longer exists in polyglotConnectors. Clearing from localStorage.");
                    localStorage.removeItem(LAST_EMBEDDED_CHAT_ID_KEY);
                }
            } else {
                console.log("CSH_TS: No ID found in localStorage for LAST_EMBEDDED_CHAT_ID_KEY.");
            }
        } catch (e) { 
            console.warn("CSH_TS: Error reading last embedded chat ID from localStorage", e);
        }
    }
    
    console.log("CSH_TS: Effective chatToOpenId after localStorage check:", chatToOpenId);
         let listNeedsExplicitRefresh = true;

         if (chatToOpenId) {
             const { conversation: convo } = await conversationManager.ensureConversationRecord(chatToOpenId);
             const connectorToOpen = convo?.connector;

             if (connectorToOpen) {
                 await openConversationInEmbeddedView(connectorToOpen); 
                 listNeedsExplicitRefresh = false; 
             } else {
                 chatActiveTargetManager.clearEmbeddedChatTargetId(); 
                 chatUiManager.hideEmbeddedChatInterface();
             }
         } else {
             const allConversations = conversationManager.getActiveConversations(); 
             const convosWithMessages = allConversations.filter(c => c.messages?.length > 0 && c.connector && !c.isGroup);
             if (convosWithMessages.length > 0) {
                 convosWithMessages.sort((a, b) => (Number(b.lastActivity) || 0) - (Number(a.lastActivity) || 0));
                 await openConversationInEmbeddedView(convosWithMessages[0].connector);
                 listNeedsExplicitRefresh = false; 
             } else {
                 chatUiManager.hideEmbeddedChatInterface();
             }
         }
         if (listNeedsExplicitRefresh) {
            console.log("CSH_TS: handleMessagesTabBecameActive() - Explicit list refresh needed."); 
             chatOrchestrator.renderCombinedActiveChatsList();
         }
         console.log("CSH_TS: handleMessagesTabBecameActive() - FINISHED.");
    }

    async function openMessageModalForConnector(connector: Connector): Promise<void> {
        console.error("CSH_DEBUG_ENTRY: openMessageModalForConnector CALLED FOR:", connector?.id, "Stack:", new Error().stack); // <<< ADD THIS
        if (!connector?.id) { 
            console.error("CSH_TS: Invalid connector for modal. Cannot acquire lock or proceed."); 
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

            const currentModalTargetConnector = chatActiveTargetManager.getModalMessageTargetConnector();
            const isModalVisible = modalHandler.isVisible?.(domElements.messagingInterface);
            
            const isThisModalAlreadyOpenAndActiveForThisConnector = 
                currentModalTargetConnector?.id === connector.id && isModalVisible;

            if (isThisModalAlreadyOpenAndActiveForThisConnector) {
                console.warn(`CSH.openMessageModalForConnector: Called for ALREADY OPEN and ACTIVE modal for connector '${connector.id}'. Minimal UI update (e.g., focus). Chat log NOT cleared or re-rendered from history.`);
                if (domElements.messageTextInput) {
                    domElements.messageTextInput.focus();
                }
                return; 
            } else {
                console.log(`CSH.openMessageModalForConnector: Condition 'isThisModalAlreadyOpenAndActiveForThisConnector' FAILED. Proceeding with full display setup for modal with '${connector.id}'.`);
                if (currentModalTargetConnector?.id !== connector.id) console.log(`  Reason: currentModalTargetConnector ID ('${currentModalTargetConnector?.id}') !== connector.id ('${connector.id}')`);
                if (!isModalVisible) console.log(`  Reason: Modal is NOT visible.`);
            }

            chatActiveTargetManager.setModalMessageTargetConnector(connector);
            const { conversation: convo } = await conversationManager.ensureConversationRecord(connector.id, connector);

            if (!convo || !convo.connector) {
                console.error(`CSH_TS: Failed to get convo or connector for modal for '${connector.id}'.`);
                chatActiveTargetManager.clearModalMessageTargetConnector(); 
                return; 
            }
            console.log("CSH_DEBUG: Calling uiUpdater.updateMessageModalHeader with connector:", JSON.parse(JSON.stringify(convo.connector || {})));
            uiUpdater.updateMessageModalHeader(convo.connector);
           
         
            
                      // Clear the log right before we decide what to put in it.
            uiUpdater.clearMessageModalLog?.();

            if (Array.isArray(convo.messages) && convo.messages.length > 0) {
                // If there is history, loop through and add each message.
                console.log(`CSH_TS: Populating ${convo.messages.length} messages into modal for ${connector.id}.`);
                convo.messages.forEach((msg: MessageInStore) => {
                    if (!msg) return;
                  
                    const senderClass = msg.sender === 'user' ? 'user' : 'connector';
                    const msgOptions: ChatMessageOptions = {
                        timestamp: msg.timestamp,
                        messageId: msg.id,
                        type: msg.type,
                        eventType: msg.eventType,
                        duration: msg.duration,
                        callSessionId: msg.callSessionId,
                        connectorIdForButton: msg.connectorIdForButton,
                        connectorNameForDisplay: msg.connectorNameForDisplay,
                        isVoiceMemo: msg.isVoiceMemo,
                      audioSrc: msg.audioBlobDataUrl || undefined,
                      imageUrl: msg.content_url || undefined,
                        avatarUrl: convo.connector?.avatarModern,
                        senderName: convo.connector?.profileName,
                        connectorId: convo.connector?.id
                    };
    
                    uiUpdater.appendToMessageLogModal?.(msg.text || "", senderClass, msgOptions);
                });
                    } else {
                // This is a new conversation. Manually add the placeholder.
                console.log(`CSH_TS: New modal conversation with ${convo.connector!.profileName}. Manually inserting placeholder.`);
                if (domElements.messageChatLog && polyglotHelpers && convo.connector) {
                     domElements.messageChatLog.innerHTML = 
                        `<div class="chat-log-empty-placeholder">
                            <i class="far fa-comments"></i>
                            <p>No messages yet with ${polyglotHelpers.sanitizeTextForDisplay(convo.connector.profileName)}.</p>
                            <p>Send a message to start!</p>
                        </div>`;
                }
            }
            uiUpdater.scrollMessageModalToBottom?.();
            uiUpdater.resetMessageModalInput?.();
            if (domElements.messagingInterface) modalHandler.open(domElements.messagingInterface);
            if (domElements.messageTextInput) domElements.messageTextInput.focus();
            chatOrchestrator.renderCombinedActiveChatsList();
            console.log("CSH_TS: openMessageModalForConnector() - FINISHED for", connector.id);
       
        } finally {
            if (openingModalOperationId === operationKey) {
                openingModalOperationId = null;
                console.log(`CSH.openMessageModalForConnector: Cleared processing lock for ${operationKey}.`);
            }
        }
    }
    
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