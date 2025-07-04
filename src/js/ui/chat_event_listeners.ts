// D:\polyglot_connect\src\js\ui\chat_event_listeners.ts
console.log('chat_event_listeners.ts: SCRIPT EXECUTION STARTED - TOP OF FILE (TS Version).');
// THIS IS THE CORRECTED CODE:
import type {
    YourDomElements,
    PersonaModalManager,
    ConversationManager,
    AiTranslationServiceModule,
    ChatSessionHandler,
    ChatActiveTargetManager,
    VoiceMemoHandler,
    TextMessageHandler,
    GroupManager,
    PolyglotApp,
    SessionHistoryManager,
    UiUpdater,
    ModalHandler,
    Connector,
    PolyglotHelpersOnWindow, // <<< THIS IS THE ALIAS
    SessionData,
    RecapData,
    ChatMessageOptions, // Ensure this is imported if used by addSafeListener or handleCallEventButtonClick indirectly
    TabManagerModule,   // <<< ADD THIS
    ChatOrchestrator    // <<< AND THIS
} from '../types/global.d.ts';

console.log('chat_event_listeners.ts: Script loaded, waiting for core dependencies (TS Version).');

interface ChatEventListenersModule {
    initializeEventListeners: (
        domElements: YourDomElements,
        conversationManager: ConversationManager
    ) => void;
}

window.chatEventListeners = {} as ChatEventListenersModule;
console.log('chat_event_listeners.ts: Placeholder window.chatEventListeners assigned.');

// Define VerifiedDeps type at the module scope so getSafeDeps can use it
type VerifiedDepsForCelInit = {
    domElements: YourDomElements;
    personaModalManager: PersonaModalManager;
    chatSessionHandler: ChatSessionHandler;
    chatActiveTargetManager: ChatActiveTargetManager;
    voiceMemoHandler: VoiceMemoHandler;
    textMessageHandler: TextMessageHandler;
    groupManager: GroupManager;
    sessionHistoryManager: SessionHistoryManager;
    uiUpdater: UiUpdater;
    modalHandler: ModalHandler;
    polyglotConnectors: Connector[];
    polyglotHelpers: PolyglotHelpersOnWindow;
    conversationManager: ConversationManager;
    tabManager: TabManagerModule; // <<< THIS IS THE FIX
    chatOrchestrator?: ChatOrchestrator; // <<< THIS IS THE OTHER FIX (optional)
};
// Define getSafeDeps at the module scope or ensure it's correctly defined before its first call
// D:\polyglot_connect\src\js\ui\chat_event_listeners.ts

const getSafeDeps = (): VerifiedDepsForCelInit | null => {
    const deps = {
        domElements: window.domElements,
        personaModalManager: window.personaModalManager,
        chatSessionHandler: window.chatSessionHandler,
        chatActiveTargetManager: window.chatActiveTargetManager,
        voiceMemoHandler: window.voiceMemoHandler,
        textMessageHandler: window.textMessageHandler,
        groupManager: window.groupManager,
        sessionHistoryManager: window.sessionHistoryManager,
        uiUpdater: window.uiUpdater,
        modalHandler: window.modalHandler,
        polyglotConnectors: window.polyglotConnectors,
        polyglotHelpers: window.polyglotHelpers,
        conversationManager: window.conversationManager,
        tabManager: window.tabManager, // <<< ADD THIS
        chatOrchestrator: window.chatOrchestrator // <<< ADD THIS
    };
    const missing: string[] = [];


    if (!deps.domElements) missing.push("domElements");
    if (!deps.personaModalManager?.openDetailedPersonaModal) missing.push("personaModalManager or its .openDetailedPersonaModal method");
    if (!deps.chatSessionHandler?.endActiveModalMessagingSession) missing.push("chatSessionHandler or its .endActiveModalMessagingSession method");
    if (!deps.chatActiveTargetManager?.getEmbeddedChatTargetId) missing.push("chatActiveTargetManager or its .getEmbeddedChatTargetId method");
    if (!deps.voiceMemoHandler?.handleNewVoiceMemoInteraction) missing.push("voiceMemoHandler or its .handleNewVoiceMemoInteraction method");
    if (!deps.textMessageHandler?.sendEmbeddedTextMessage) {
        missing.push("textMessageHandler or its .sendEmbeddedTextMessage method");
    }
    if (!deps.groupManager?.handleUserMessageInGroup) missing.push("groupManager or its .handleUserMessageInGroup method");
    if (!deps.sessionHistoryManager?.getSessionById) missing.push("sessionHistoryManager or its .getSessionById method");
    if (!deps.uiUpdater?.populateRecapModal) missing.push("uiUpdater or its .populateRecapModal method");
    if (!deps.modalHandler?.open) missing.push("modalHandler or its .open method");
    if (!deps.polyglotConnectors || !Array.isArray(deps.polyglotConnectors)) missing.push("polyglotConnectors (must be an array)");
    if (!deps.polyglotHelpers?.generateUUID) missing.push("polyglotHelpers or its .generateUUID method");
    
    // VVVVVV ADD THIS CHECK VVVVVV
    if (!deps.conversationManager?.getConversationById) missing.push("conversationManager or its .getConversationById method");
    // ^^^^^^ ADD THIS CHECK ^^^^^^
    if (!deps.tabManager?.getCurrentActiveTab) missing.push("tabManager or its .getCurrentActiveTab method"); // <<< ADD 
    if (missing.length > 0) {
        console.error(`ChatEventListeners: getSafeDeps - FINAL VERDICT: MISSING/INVALID: ${missing.join(', ')}. RETURNING NULL.`);
        return null;
    }
    
    return deps as VerifiedDepsForCelInit;
};



function initializeActualChatEventListeners(): void {
    console.log("chat_event_listeners.ts: initializeActualChatEventListeners() called.");
    console.log("CEL_TS_DEBUG_FLOW: ENTERING initializeActualChatEventListeners(). Attempting to get safe dependencies.");

    console.log("CEL_TS_DEBUG_FLOW: ABOUT TO CALL getSafeDeps().");
    const resolvedDeps = getSafeDeps();
    console.log("CEL_TS_DEBUG_FLOW: getSafeDeps() CALL COMPLETE. resolvedDeps is:", resolvedDeps === null ? "NULL" : "NOT NULL (DEPS OK)");
    
    console.log("CEL_TS_DEBUG_FLOW: Status of resolvedDeps after getSafeDeps():", resolvedDeps ? "DEPS OK" : "DEPS FAILED/NULL"); 

    if (!resolvedDeps) { 
        console.error("chat_event_listeners.ts: CRITICAL - Functional dependencies not met (resolvedDeps is null). Placeholder remains. Listeners will not be attached.");
        // Dispatch ready event even on failure so app.ts doesn't hang indefinitely if it were waiting,
        // but it will be a non-functional CEL.
        document.dispatchEvent(new CustomEvent('chatEventListenersReady'));
        console.warn('chat_event_listeners.ts: "chatEventListenersReady" event dispatched (initialization FAILED because resolvedDeps was null).');
        return; 
    }
    
    console.log("CEL_TS_DEBUG_FLOW: resolvedDeps check PASSED. Proceeding to IIFE.");
    console.log('chat_event_listeners.ts: Core functional dependencies appear ready for IIFE.');

    const eventListenerMethods = ((): ChatEventListenersModule => {
        'use strict';
        console.log("chat_event_listeners.ts: IIFE (module definition) STARTING.");

        const initializedButtons = new WeakMap<HTMLButtonElement, boolean>();

        const {
            domElements, personaModalManager, chatSessionHandler,
            chatActiveTargetManager, voiceMemoHandler, textMessageHandler,
            groupManager, sessionHistoryManager, uiUpdater, modalHandler,
            polyglotConnectors, polyglotHelpers, conversationManager, tabManager, chatOrchestrator
        } = resolvedDeps!;

      

// --- START OF MODIFIED BLOCK ---
const MAX_PREVIEW_IMAGES = 1; // Max images user can queue up (set to 1 for single image)
const activeImageFilesByInput = new Map<HTMLInputElement, File[]>(); // Key: Main text input

function updateChatInputUIState(
    previewContainer: HTMLElement,
    captionInputElement: HTMLInputElement,
    mainTextInputElement: HTMLInputElement,
    imageIsPresent: boolean
) {
    const chatFooter = previewContainer.closest('.embedded-chat-footer, .messaging-interface-footer, .group-chat-footer');

    if (imageIsPresent) {
        previewContainer.style.display = 'flex';
        mainTextInputElement.style.display = 'none';
        // mainTextInputElement.value = ''; // Optional: Clear main input when image is added
        captionInputElement.style.display = 'block';
        captionInputElement.placeholder = "Add a caption (optional)...";
        // captionInputElement.focus(); // Optional: Focus caption
        if (chatFooter) chatFooter.classList.add('has-image-previews');
    } else {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = ''; // Clear previews
        captionInputElement.style.display = 'none';
        captionInputElement.value = '';
        mainTextInputElement.style.display = 'block';
        // mainTextInputElement.placeholder = "Type a message..."; // Or its original placeholder
        // mainTextInputElement.focus(); // Optional: Focus main input
        if (chatFooter) chatFooter.classList.remove('has-image-previews');
    }
}

function displayImagePreviews(
    filesToDisplay: File[],
    previewContainer: HTMLElement,
    captionInputElement: HTMLInputElement,
    mainTextInputElement: HTMLInputElement
) {
    let currentFilesForInputContext = activeImageFilesByInput.get(mainTextInputElement) || [];

    if (MAX_PREVIEW_IMAGES === 1) {
        currentFilesForInputContext = []; // Replace existing if single image mode
    }

    const newFilesToAdd = filesToDisplay.filter(file => file.type.startsWith('image/'));

    for (const file of newFilesToAdd) {
        if (currentFilesForInputContext.length < MAX_PREVIEW_IMAGES) {
            currentFilesForInputContext.push(file);
        } else {
            if (MAX_PREVIEW_IMAGES === 1) { // Should have been cleared, but as a safeguard
                currentFilesForInputContext = [file];
            } else {
                alert(`You can attach a maximum of ${MAX_PREVIEW_IMAGES} images.`);
            }
            break;
        }
    }
    activeImageFilesByInput.set(mainTextInputElement, currentFilesForInputContext);

    // Render previews
    previewContainer.innerHTML = ''; // Clear existing visual previews
    currentFilesForInputContext.forEach(file => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = 'Image preview';
        img.onload = () => URL.revokeObjectURL(img.src); // Clean up object URL

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-preview-btn';
        removeBtn.type = 'button';
        removeBtn.innerHTML = '×';
        removeBtn.setAttribute('aria-label', 'Remove image preview');
        removeBtn.onclick = () => {
            const updatedFiles = (activeImageFilesByInput.get(mainTextInputElement) || []).filter(f => f !== file);
            activeImageFilesByInput.set(mainTextInputElement, updatedFiles);
            // Rerun displayImagePreviews to update UI (it will call updateChatInputUIState internally)
            displayImagePreviews([], previewContainer, captionInputElement, mainTextInputElement);
        };

        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        previewContainer.appendChild(previewItem);
    });

    updateChatInputUIState(previewContainer, captionInputElement, mainTextInputElement, currentFilesForInputContext.length > 0);
}
// --- REPLACEMENT FUNCTION for handleFileSelection with Size Check ---
function handleFileSelection(
    event: Event,
    previewContainer: HTMLElement | null,
    captionInputElement: HTMLInputElement | null,
    mainTextInputElement: HTMLInputElement | null
) {
    if (!previewContainer || !captionInputElement || !mainTextInputElement) {
        console.error("CEL: handleFileSelection - Missing critical UI elements for preview.");
        return;
    }

    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
        return; // No files selected
    }

    const filesFromInput = Array.from(fileInput.files);
    const validImageFiles: File[] = [];
    const MAX_FILE_SIZE_MB = 2;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    let anImageWasTooLarge = false;

    for (const file of filesFromInput) {
        if (file.type.startsWith('image/')) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`Image "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Please select an image smaller than ${MAX_FILE_SIZE_MB} MB.`);
                anImageWasTooLarge = true;
                // Optionally, you could choose to process other valid files if multiple were selected,
                // or just stop processing altogether if one is too large.
                // For simplicity, if one is too large, we'll just alert and not process any from this selection.
                break; 
            } else {
                validImageFiles.push(file);
            }
        } else {
            // Optional: Alert if a non-image file was selected, or just ignore it
            console.warn(`CEL: handleFileSelection - Non-image file selected and ignored: "${file.name}"`);
        }
    }

    if (anImageWasTooLarge) {
        fileInput.value = ''; // Reset file input to allow re-selection
        // If you were allowing multiple files and one was too large, you might still want to display valid ones.
        // But since MAX_PREVIEW_IMAGES is likely 1, clearing is fine.
        // If validImageFiles still has items and you want to display them despite one being too large,
        // you would call displayImagePreviews(validImageFiles, ...) here.
        // For now, we stop if any image is too large.
        return;
    }

    if (validImageFiles.length > 0) {
        displayImagePreviews(validImageFiles, previewContainer, captionInputElement, mainTextInputElement);
    }

    fileInput.value = ''; // Reset file input after processing
}
// --- END OF REPLACEMENT FUNCTION ---
function handlePasteEvent(
    event: ClipboardEvent,
    previewContainer: HTMLElement | null,
    captionInputElement: HTMLInputElement | null,
    mainTextInputElement: HTMLInputElement | null
) {
    if (!previewContainer || !captionInputElement || !mainTextInputElement) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) imageFiles.push(file);
        }
    }
    if (imageFiles.length > 0) {
        event.preventDefault();
        displayImagePreviews(imageFiles, previewContainer, captionInputElement, mainTextInputElement);
    }
}
function createSendHandler(
    context: 'embedded' | 'modal' | 'group',
    mainTextInputElement: HTMLInputElement | null,
    captionInputElement: HTMLInputElement | null,
    previewContainer: HTMLElement | null
) {
    return async () => {
        // <<< FIX: Fetch the potentially problematic handlers "just-in-time" >>>
        const textMessageHandler = window.textMessageHandler;
        const groupManager = window.groupManager;
        
        // <<< FIX: Add a guard clause to ensure they are ready >>>
        if ((context !== 'group' && !textMessageHandler) || (context === 'group' && !groupManager)) {
            console.error(`CEL: Send failed. The required handler for context '${context}' is not available on the window object.`);
            alert("Chat system is still initializing, please try again in a moment.");
            return;
        }

        const uniqueSendId = Math.random().toString(36).substring(7);
        console.log(`CEL: SEND HANDLER INVOKED (ID: ${uniqueSendId}). Context: ${context}`);
        
        if (!mainTextInputElement || !captionInputElement || !previewContainer) {
            console.error(`CEL: Missing critical elements for send handler in ${context} context.`);
            return;
        }

        const currentFiles = activeImageFilesByInput.get(mainTextInputElement) || [];
        const imageFileToSend = currentFiles.length > 0 ? currentFiles[0] : null;

        let textFromActiveInput: string;
        let captionForImage: string | null = null;

        if (imageFileToSend) {
            textFromActiveInput = captionInputElement.value.trim();
            captionForImage = textFromActiveInput;
        } else {
            textFromActiveInput = mainTextInputElement.value.trim();
        }

        if (!textFromActiveInput && !imageFileToSend) {
            console.log(`CEL: Nothing to send from ${context}.`);
            return;
        }

        console.log(`CEL: Attempting to send from ${context}:`);
        if (imageFileToSend) console.log(`  Image: ${imageFileToSend.name}`);
        console.log(`  Text from active input: "${textFromActiveInput}"`);

        const sendOptions: {
            skipUiAppend?: boolean; // This will always be true after this block
            imageFile?: File | null;
            captionText?: string | null;
            messageId?: string;     // Will always be set
            timestamp?: number;     // Will always be set
        } = {
            // Properties will be set explicitly below.
            // skipUiAppend is intentionally not defaulted here, as it's always set to true.
        };

        // --- REVISED UI APPEND AND SENDOPTIONS LOGIC ---
        const tempUserMessageId = resolvedDeps?.polyglotHelpers?.generateUUID() || `fallback-uuid-${Date.now()}`;
        const tempTimestamp = Date.now();
        
        // Options for uiUpdater.appendChatMessage
        const uiAppendMessageOptions: ChatMessageOptions = {
            messageId: tempUserMessageId,
            timestamp: tempTimestamp,
        };

        // textFromActiveInput already holds the correct text:
        // - For text-only: value of mainTextInputElement.
        // - For image: value of captionInputElement.
        let messageTextForUiAppend = textFromActiveInput; 

        if (imageFileToSend) {
            // messageTextForUiAppend is already the caption.
            uiAppendMessageOptions.imageUrl = URL.createObjectURL(imageFileToSend); // Local URL for optimistic display
            
            sendOptions.imageFile = imageFileToSend;
            sendOptions.captionText = messageTextForUiAppend; // Pass caption to message handler
        }
        // Note: This generic send handler is for text or image+caption.
        // Voice memos are typically initiated via voiceMemoHandler, which then calls textMessageHandler
        // with specific options like isVoiceMemo and audioSrc. If this handler needed to
        // also directly manage voice memo UI append, uiAppendMessageOptions would need those.

        // Perform optimistic UI append for the user's message.
        // This MUST happen BEFORE textMessageHandler or groupManager is called.
        if (context !== 'group') { // For 'embedded' and 'modal' contexts
            const appendFn = context === 'embedded' 
                ? resolvedDeps?.uiUpdater?.appendToEmbeddedChatLog
                : resolvedDeps?.uiUpdater?.appendToMessageLogModal;
            
            // The text to display, 'user' as senderClass, and the options
            appendFn?.(messageTextForUiAppend, 'user', uiAppendMessageOptions);
        }
        // For 'group' context, groupManager.handleUserMessageInGroup is responsible for calling
        // groupUiHandler.appendMessageToGroupLog. It will use messageId and timestamp from sendOptions.

        // ALWAYS set skipUiAppend to true because this module (CEL) or groupManager
        // handles the UI append for the user's own message.
        sendOptions.skipUiAppend = true;
        sendOptions.messageId = tempUserMessageId;
        sendOptions.timestamp = tempTimestamp;

        // --- Call the appropriate message sending function ---
        // The textFromActiveInput passed to these handlers is correct (main text or caption text)
        if (context === 'embedded') {
            const targetConnectorId = chatActiveTargetManager.getEmbeddedChatTargetId();
            if (targetConnectorId) {
                const connector = polyglotConnectors.find(c => c.id === targetConnectorId);
                if (connector) {
                    const conversationId = await conversationManager.ensureConversationRecord(connector);
                    if (conversationId) {
                        textMessageHandler?.sendEmbeddedTextMessage(textFromActiveInput, conversationId, sendOptions);
                    } else {
                        console.error("CEL: Failed to get/create conversation ID for embedded chat.");
                    }
                }
            }
        } else if (context === 'modal') {
            const targetConnector = chatActiveTargetManager.getModalMessageTargetConnector();
            if (targetConnector) {
                textMessageHandler?.sendModalTextMessage(textFromActiveInput, targetConnector, sendOptions);
            }
        } else if (context === 'group') {
            const currentGroup = groupManager?.getCurrentGroupData?.();
            if (currentGroup) {
                groupManager?.handleUserMessageInGroup(textFromActiveInput, sendOptions);
            }
        }
        // Clear inputs and reset UI state
        if (imageFileToSend) {
            activeImageFilesByInput.set(mainTextInputElement, []);
            updateChatInputUIState(previewContainer, captionInputElement, mainTextInputElement, false);
        } else {
            mainTextInputElement.value = '';
        }
    };
}
// --- END OF MODIFIED BLOCK ---
   
// --- END OF MODIFIED BLOCK ---


        let listenersInitialized = false;

        let lastClickedCallEventButton: HTMLButtonElement | null = null;
        let pendingCallEventAction: { connector: Connector, actionType: string, button: HTMLButtonElement } | null = null;
       


        function _clearPendingCallEventAction(success: boolean = true) {
            if (lastClickedCallEventButton) {
                lastClickedCallEventButton.disabled = false;
                // Restore original text or visual state
                const originalText = lastClickedCallEventButton.dataset.originalText ||
                                     (lastClickedCallEventButton.textContent === "Initializing..." || lastClickedCallEventButton.textContent === "Error..." ?
                                      "CALL BACK" : // Or derive from action
                                      lastClickedCallEventButton.textContent);
                lastClickedCallEventButton.textContent = originalText;
            }
            lastClickedCallEventButton = null;
            pendingCallEventAction = null;
            document.removeEventListener('polyglotAppReady', _retryCallEventAction);
        }

        function _executeCallEventCallBack(connector: Connector, actionType: string, button: HTMLButtonElement) {
            // Re-fetch polyglotApp from window as it might have become available
            const currentPolyglotApp = window.polyglotApp as PolyglotApp | undefined;
            const currentChatSessionHandler = window.chatSessionHandler as ChatSessionHandler | undefined;
            const currentDomElements = window.domElements as YourDomElements | undefined;
            const currentModalHandler = window.modalHandler as ModalHandler | undefined;


            if (currentDomElements?.messagingInterface && currentModalHandler?.isVisible?.(currentDomElements.messagingInterface)) {
                console.log("CEL_TS: Closing active messaging modal before initiating call.");
                if (currentChatSessionHandler?.endActiveModalMessagingSession) {
                   currentChatSessionHandler.endActiveModalMessagingSession();
                } else {
                   currentModalHandler.close?.(currentDomElements.messagingInterface);
                }
            }

            if (currentPolyglotApp && typeof currentPolyglotApp.initiateSession === 'function') {
                console.log("CEL_TS_DEBUG: Calling polyglotApp.initiateSession for direct_modal with connector:", connector.id);
                currentPolyglotApp.initiateSession(connector, 'direct_modal'); // Assuming 'direct_modal' for call_back/call_again
                _clearPendingCallEventAction(true);
            } else {
                console.error("CEL_TS: _executeCallEventCallBack - polyglotApp.initiateSession still not available.");
                button.textContent = "Error...";
                setTimeout(() => _clearPendingCallEventAction(false), 2000); // Reset after a delay
            }
        }

        function _retryCallEventAction() {
            console.log("CEL_DEBUG: _retryCallEventAction TRIGGERED by polyglotAppReady event."); // 
            console.log("CEL_TS: 'polyglotAppReady' event received, retrying pending call event action.");
            if (pendingCallEventAction) {
                _executeCallEventCallBack(pendingCallEventAction.connector, pendingCallEventAction.actionType, pendingCallEventAction.button);
            } else {
                _clearPendingCallEventAction(false);
            }
        }



        function handleCallEventButtonClick(event: Event): void {
            console.log("CEL_TS_DEBUG: RAW CLICK EVENT CAUGHT BY handleCallEventButtonClick. Target:", event.target);
            console.log("CEL_TS_DEBUG: RAW CLICK EVENT CurrentTarget:", event.currentTarget);
    
            const button = (event.target as HTMLElement).closest('.call-event-action-btn') as HTMLButtonElement | null;
            if (button) {
                // Prevent re-triggering if an action is already pending for this button
                if (pendingCallEventAction && lastClickedCallEventButton === button && button.disabled) {
                    console.warn("CEL_TS: Call event action already pending for this button. Ignoring.");
                    return;
                }
                 _clearPendingCallEventAction(false); // Clear any previous pending state
    
                const action = button.dataset.action;
                const targetConnectorId = button.dataset.connectorId;
                const sessionId = button.dataset.sessionId;
    
                console.log(`CEL_TS_DEBUG: Button data in handler - Action: '${action}', ConnectorID: '${targetConnectorId}', SessionID: '${sessionId}'`);
    
                if ((action === 'call_back' || action === 'call_again')) {
                    console.log("CEL_TS_DEBUG: Processing call_back/call_again action in handler.");
                    if (!targetConnectorId) {
                        alert("Partner information missing for call back.");
                        console.warn("CEL_TS: call_back - targetConnectorId missing.");
                        return;
                    }
                    // polyglotConnectors should be available from resolvedDeps
                    const connector = polyglotConnectors.find(c => c.id === targetConnectorId);
                    if (!connector) {
                        alert("Could not find partner information to call back.");
                        console.warn(`CEL_TS: call_back - Connector ${targetConnectorId} not found.`);
                        return;
                    }
    
                    lastClickedCallEventButton = button; // Store button reference
                    if (!button.dataset.originalText && button.textContent) {
                        button.dataset.originalText = button.textContent;
                    }
    
                    const currentPolyglotApp = window.polyglotApp as PolyglotApp | undefined;
                    if (currentPolyglotApp && typeof currentPolyglotApp.initiateSession === 'function') {
                        console.log("CEL_TS: polyglotApp.initiateSession IS available. Executing call_back/call_again directly.");
                        _executeCallEventCallBack(connector, action, button);
                    } else {
                        console.warn("CEL_TS: polyglotApp.initiateSession not available for call_back/call_again. Deferring action.");
                        pendingCallEventAction = { connector, actionType: action, button };
                        button.disabled = true;
                        button.textContent = "Initializing...";
                        console.log("CEL_DEBUG: Adding 'polyglotAppReady' listener for deferred call event action."); // <<< ADD THIS
                        document.addEventListener('polyglotAppReady', _retryCallEventAction, { once: true });
                    }
    
                } else if (action === 'view_summary') {
                    console.log("CEL_TS_DEBUG: Processing view_summary action in handler.");
                    if (!sessionId) {
                        alert("Session information missing for summary.");
                        console.warn("CEL_TS: view_summary - sessionId missing.");
                        return;
                    }
                    // sessionHistoryManager and uiUpdater should be available from resolvedDeps
                    const sessionData = sessionHistoryManager?.getSessionById?.(sessionId);
                    console.log("CEL_TS_DEBUG: Session data for summary from SHM:", JSON.parse(JSON.stringify(sessionData || {})));
                    let recapDataToPass: RecapData;
    
                    if (sessionData) {
                        recapDataToPass = sessionData as RecapData;
                    } else {
                        console.error(`ChatEventListeners: Session data not found for ID ${sessionId}.`);
                        recapDataToPass = {
                            connectorName: "Error", date: new Date().toLocaleDateString(), duration: "N/A",
                            conversationSummary: `Could not load details for session ID: ${sessionId}.`,
                            keyTopicsDiscussed: [], newVocabularyAndPhrases: [], goodUsageHighlights: [],
                            areasForImprovement: [], suggestedPracticeActivities: [], overallEncouragement: "",
                            sessionId: sessionId
                        };
                    }
                    console.log("[CEL_DEBUG_SUMMARY_VIEW] recapDataToPass to populateRecapModal:", JSON.parse(JSON.stringify(recapDataToPass)));
                    uiUpdater?.populateRecapModal?.(recapDataToPass);
                    if (domElements.sessionRecapScreen) modalHandler?.open?.(domElements.sessionRecapScreen);
                }
            } else {
                console.log("CEL_TS_DEBUG: No button found via .closest() in handleCallEventButtonClick.");
            }
        }
        
        const addSafeListener = (
            element: HTMLElement | Element | Window | Document | null,
            eventType: string, 
            handlerFn: EventListenerOrEventListenerObject,
            options: boolean | AddEventListenerOptions = {}
        ): void => {
            if (element && typeof handlerFn === 'function') {
                element.addEventListener(eventType, handlerFn, options);
            } else { 
                if (!element) console.warn(`CEL_TS: Element for listener type '${eventType}' not found for safe listener.`);
                if (typeof handlerFn !== 'function') console.warn(`CEL_TS: Handler for listener type '${eventType}' is not a function for safe listener.`);
            }
        };

      
        // ===================  END: ADD THIS ENTIRE NEW FUNCTION  ===================


        
        function setupAllChatInteractionListeners(): void {
            console.log("CEL_TS: setupAllChatInteractionListeners() - START (New Integrated Version).");

            // --- EMBEDDED CHAT ---
            if (domElements.embeddedMessageTextInput &&
                domElements.imagePreviewContainerEmbedded &&
                domElements.embeddedImageCaptionInput &&
                domElements.embeddedMessageSendBtn /* Ensure send button is checked */) {


// Inside initializeEventListeners function
addSafeListener(domElements.closeUpgradeCallModalBtn, 'click', () => modalHandler.close(domElements.upgradeCallLimitModal));
addSafeListener(domElements.upgradeCallModalMaybeLaterBtn, 'click', () => modalHandler.close(domElements.upgradeCallLimitModal));

addSafeListener(domElements.upgradeLimitModal, 'click', (e: Event) => {
    // Close modal if user clicks on the dark background overlay
    if ((e.target as HTMLElement).id === 'upgrade-limit-modal') {
        modalHandler.close(domElements.upgradeLimitModal);
    }
});
addSafeListener(domElements.closeUpgradeModalBtn, 'click', () => modalHandler.close(domElements.upgradeLimitModal));
addSafeListener(domElements.upgradeModalMaybeLaterBtn, 'click', () => modalHandler.close(domElements.upgradeLimitModal));

// This button now takes the user to the new standalone pricing page
addSafeListener(domElements.upgradeModalCtaBtn, 'click', () => {
    window.location.href = '/pricing.html'; 
});



                addSafeListener(
                    domElements.embeddedMessageTextInput,
                    'paste',
                    (e: Event) => handlePasteEvent(
                        e as ClipboardEvent,
                        domElements.imagePreviewContainerEmbedded,
                        domElements.embeddedImageCaptionInput,
                        domElements.embeddedMessageTextInput as HTMLInputElement
                    )
                );

                const sendEmbeddedHandler = createSendHandler(
                    'embedded',
                    domElements.embeddedMessageTextInput as HTMLInputElement,
                    domElements.embeddedImageCaptionInput as HTMLInputElement,
                    domElements.imagePreviewContainerEmbedded as HTMLElement
                );

                addSafeListener(domElements.embeddedMessageSendBtn, 'click', sendEmbeddedHandler);
                addSafeListener(domElements.embeddedMessageSendBtn, 'mousedown', (e: Event) => e.preventDefault());
                addSafeListener(domElements.embeddedMessageSendBtn, 'click', sendEmbeddedHandler);
                addSafeListener(domElements.embeddedMessageTextInput, 'keydown', (e: Event) => { // CHANGED
                    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
                        e.preventDefault();
                        sendEmbeddedHandler(); 
                    }
                });
                addSafeListener(domElements.embeddedImageCaptionInput, 'keydown', (e: Event) => { // CHANGED
                    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
                        e.preventDefault();
                        sendEmbeddedHandler(); 
                    }
                });
            } else {
                console.warn("CEL_TS: Missing DOM elements for embedded chat input/preview/caption/send button setup. Features might be limited.");
            }

            addSafeListener(domElements.embeddedMessageAttachBtn, 'click', () => {
                if (chatActiveTargetManager.getEmbeddedChatTargetId()) {
                    domElements.embeddedMessageImageUpload?.click();
                } else {
                    alert("Please open a chat to attach an image.");
                }
            });
            if (domElements.embeddedMessageImageUpload && domElements.imagePreviewContainerEmbedded && domElements.embeddedImageCaptionInput && domElements.embeddedMessageTextInput) {
                addSafeListener(
                    domElements.embeddedMessageImageUpload,
                    'change',
                    (e: Event) => handleFileSelection(
                        e,
                        domElements.imagePreviewContainerEmbedded,
                        domElements.embeddedImageCaptionInput,
                        domElements.embeddedMessageTextInput as HTMLInputElement
                    )
                );
            } else {
                console.warn("CEL_TS: Missing DOM elements for embedded chat file input 'change' listener setup.");
            }

            addSafeListener(domElements.embeddedMessageMicBtn, 'click', () => {
                const targetId = chatActiveTargetManager.getEmbeddedChatTargetId();
                if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetId && domElements.embeddedMessageMicBtn) {
                    voiceMemoHandler.handleNewVoiceMemoInteraction('embedded', domElements.embeddedMessageMicBtn, targetId);
                } else {
                    console.error("CEL_TS: voiceMemoHandler or dependencies not available for embedded mic.");
                }
            });

            // --- MODAL CHAT ---
            if (domElements.messageTextInput &&
                domElements.imagePreviewContainerModal &&
                domElements.modalImageCaptionInput &&
                domElements.messageSendBtn /* Ensure send button is checked */ ) {

                addSafeListener(
                    domElements.messageTextInput,
                    'paste',
                    (e: Event) => handlePasteEvent(
                        e as ClipboardEvent,
                        domElements.imagePreviewContainerModal,
                        domElements.modalImageCaptionInput,
                        domElements.messageTextInput as HTMLInputElement
                    )
                );

                const sendModalHandler = createSendHandler(
                    'modal',
                    domElements.messageTextInput as HTMLInputElement,
                    domElements.modalImageCaptionInput as HTMLInputElement,
                    domElements.imagePreviewContainerModal as HTMLElement
                );
              
                 
                addSafeListener(domElements.messageSendBtn, 'click', sendModalHandler);
                addSafeListener(domElements.messageSendBtn, 'mousedown', (e: Event) => e.preventDefault());
              
                addSafeListener(domElements.messageTextInput, 'keydown', (e: Event) => {
                    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
                        e.preventDefault();
                        sendModalHandler(); // Use the same handler instance
                    }
                });
                addSafeListener(domElements.modalImageCaptionInput, 'keydown', (e: Event) => {
                    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
                        e.preventDefault();
                        sendModalHandler(); // Use the same handler instance
                    }
                });
            } else {
                console.warn("CEL_TS: Missing DOM elements for modal chat input/preview/caption/send button setup. Features might be limited.");
            }

            addSafeListener(domElements.messageModalAttachBtn, 'click', () => {
                if (chatActiveTargetManager.getModalMessageTargetConnector()) {
                    domElements.messageModalImageUpload?.click();
                } else {
                    alert("Please open a message modal to attach an image.");
                }
            });
            if (domElements.messageModalImageUpload && domElements.imagePreviewContainerModal && domElements.modalImageCaptionInput && domElements.messageTextInput) {
                addSafeListener(
                    domElements.messageModalImageUpload,
                    'change',
                    (e: Event) => handleFileSelection(
                        e,
                        domElements.imagePreviewContainerModal,
                        domElements.modalImageCaptionInput,
                        domElements.messageTextInput as HTMLInputElement
                    )
                );
            } else {
                console.warn("CEL_TS: Missing DOM elements for modal chat file input 'change' listener setup.");
            }

            addSafeListener(domElements.messageModalMicBtn, 'click', () => {
                const targetConnector = chatActiveTargetManager.getModalMessageTargetConnector();
                if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetConnector?.id && domElements.messageModalMicBtn) {
                    voiceMemoHandler.handleNewVoiceMemoInteraction('modal', domElements.messageModalMicBtn, targetConnector.id);
                } else {
                     console.error("CEL_TS: voiceMemoHandler or dependencies not available for modal mic.");
                }
            });

            // --- GROUP CHAT ---
            if (domElements.groupChatInput &&
                domElements.imagePreviewContainerGroup &&
                domElements.groupImageCaptionInput &&
                domElements.sendGroupMessageBtn /* Ensure send button is checked */) {

                addSafeListener(
                    domElements.groupChatInput,
                    'paste',
                    (e: Event) => handlePasteEvent(
                        e as ClipboardEvent,
                        domElements.imagePreviewContainerGroup,
                        domElements.groupImageCaptionInput,
                        domElements.groupChatInput as HTMLInputElement
                    )
                );

                const sendGroupHandler = createSendHandler(
                    'group',
                    domElements.groupChatInput as HTMLInputElement,
                    domElements.groupImageCaptionInput as HTMLInputElement,
                    domElements.imagePreviewContainerGroup as HTMLElement
                );

                addSafeListener(domElements.sendGroupMessageBtn, 'click', sendGroupHandler);
                addSafeListener(domElements.sendGroupMessageBtn, 'mousedown', (e: Event) => e.preventDefault());
                addSafeListener(domElements.sendGroupMessageBtn, 'click', sendGroupHandler);
                addSafeListener(domElements.groupChatInput, 'keydown', (e: Event) => {
                    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
                        e.preventDefault();
                        sendGroupHandler(); // Use the same handler instance
                    } else {
                        groupManager?.userIsTyping?.();
                    }
                });
                addSafeListener(domElements.groupImageCaptionInput, 'keydown', (e: Event) => {
                    if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
                        e.preventDefault();
                        sendGroupHandler(); // Use the same handler instance
                    }
                });
            } else {
                console.warn("CEL_TS: Missing DOM elements for group chat input/preview/caption/send button setup. Features might be limited.");
            }

            addSafeListener(domElements.groupChatAttachBtn, 'click', () => {
                const currentGroup = groupManager?.getCurrentGroupData?.();
                if (currentGroup?.id) {
                    domElements.groupChatImageUpload?.click();
                } else {
                    alert("You must be in a group to attach an image.");
                }
            });
            if (domElements.groupChatImageUpload && domElements.imagePreviewContainerGroup && domElements.groupImageCaptionInput && domElements.groupChatInput) {
                addSafeListener(
                    domElements.groupChatImageUpload,
                    'change',
                    (e: Event) => handleFileSelection(
                        e,
                        domElements.imagePreviewContainerGroup,
                        domElements.groupImageCaptionInput,
                        domElements.groupChatInput as HTMLInputElement
                    )
                );
            } else {
                 console.warn("CEL_TS: Missing DOM elements for group chat file input 'change' listener setup.");
            }

            // Existing group chat listeners
            addSafeListener(domElements.groupChatInput, 'input', () => {
                // This listener is for typing indicator, avoid triggering send logic from here.
                // The 'keypress' for Enter already handles sending.
                // Only call userIsTyping if it's not an Enter key that would trigger a send.
                // However, the keypress 'Enter' handler already calls groupManager.userIsTyping for non-Enter keys.
                // So, this simple 'input' listener is fine as is for general typing.
                groupManager?.userIsTyping?.();
            });
// In chat_event_listeners.ts (or equivalent file where you have the "intelligent" listener)

if (domElements.leaveGroupBtn) { // Check if the button exists
    addSafeListener(domElements.leaveGroupBtn, 'click', async () => {
        console.log("CEL: 'Back to Groups' (leaveGroupBtn) clicked. [INTELLIGENT HANDLER v2]");
        const currentGroupManager = window.groupManager;
        const currentGroupUiHandler = window.groupUiHandler;
        const currentGroupDataManager = window.groupDataManager;
        const currentGroupInteractionLogic = window.groupInteractionLogic;
        const currentTabManager = window.tabManager;
        const currentChatOrchestrator = window.chatOrchestrator;
        const currentSidebarPanelManager = window.sidebarPanelManager; // <<< ADD THIS

        if (!currentGroupManager || !currentGroupUiHandler || !currentGroupDataManager || !currentGroupInteractionLogic || !currentTabManager || !currentChatOrchestrator || !currentSidebarPanelManager) { // <<< ADD CHECK
            console.error("CEL: Missing core dependencies for 'Back to Groups' button. Cannot proceed.");
            alert("Error: Could not navigate back properly. Core components missing.");
            return;
        }

        // 1. Stop and reset GroupInteractionLogic
        console.log("CEL: Stopping and resetting GroupInteractionLogic.");
        currentGroupInteractionLogic.stopConversationFlow?.();
        currentGroupInteractionLogic.reset?.();

        // 2. Hide group chat UI, show list (UI only)
        console.log("CEL: Hiding group chat view and showing list (UI only).");
        currentGroupUiHandler.hideGroupChatViewAndShowList();

        // 3. Clear GDM context (does NOT delete Firestore membership)
        console.log("CEL: Clearing current group context in GroupDataManager.");
        currentGroupDataManager.setCurrentGroupContext(null, null);

        // 4. Remove 'polyglotLastActiveGroupId' from LocalStorage
        console.log("CEL: Removing 'polyglotLastActiveGroupId' from LocalStorage.");
        localStorage.removeItem('polyglotLastActiveGroupId');

        // 5. Switch to 'groups' tab
        console.log("CEL: Switching to 'groups' tab.");
        currentTabManager.switchToTab('groups'); // This will trigger shell_controller's handleViewChange for 'groups'

        // 6. IMPORTANT: Update the Right Sidebar Panel
        //    Since we've switched to the 'groups' tab, ensure the correct sidebar panel (group filters) is shown.
        //    The shell_controller.handleViewChange should ideally handle this when 'tabSwitched' event fires,
        //    but calling it explicitly here ensures it happens if the event propagation has quirks.
        console.log("CEL: Explicitly updating sidebar panel for 'groups' tab.");
        currentSidebarPanelManager.updatePanelForCurrentTab('groups');

        // 7. Reload "My Groups" view (this should now find the non-deleted membership)
        //    This is still important to refresh the list content itself.
        console.log("CEL: Loading 'my-groups' view.");
        await currentGroupManager.loadAvailableGroups(null, null, null, { viewType: 'my-groups' });

        // 8. Refresh Active Chats List in sidebar (ChatOrchestrator's responsibility)
        //    Even though we switched to group filters, the underlying data for active chats might need a refresh
        //    if the group we just left was showing up there.
        console.log("CEL: Requesting sidebar active chats list refresh (CO).");
        currentChatOrchestrator.renderCombinedActiveChatsList();

        console.log("CEL: 'Back to Groups' action completed successfully (UI navigation, no Firestore delete, sidebar panel updated).");
    });
    console.log("CEL: [INTELLIGENT v2] Event listener for 'leaveGroupBtn' attached.");
} else {
    console.warn("CEL: domElements.leaveGroupBtn not found, intelligent listener not attached.");
}




            addSafeListener(domElements.groupChatMicBtn, 'click', () => {
                const currentGroup = groupManager?.getCurrentGroupData?.();
                const currentVoiceMemoHandler = window.voiceMemoHandler;
                if (currentVoiceMemoHandler?.handleNewVoiceMemoInteraction && currentGroup?.id && domElements.groupChatMicBtn) {
                    currentVoiceMemoHandler.handleNewVoiceMemoInteraction('group', domElements.groupChatMicBtn, currentGroup.id);
                } else {
                    console.error("CEL_TS: voiceMemoHandler or group context not available for group mic.", {
                        hasVMH: !!currentVoiceMemoHandler?.handleNewVoiceMemoInteraction,
                        groupId: currentGroup?.id,
                        micBtnExists: !!domElements.groupChatMicBtn
                    });
                    if (domElements.groupChatMicBtn) {
                        domElements.groupChatMicBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                        domElements.groupChatMicBtn.disabled = true;
                        setTimeout(() => {
                            if(domElements.groupChatMicBtn) {
                                domElements.groupChatMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                                domElements.groupChatMicBtn.disabled = false;
                            }
                        }, 3000);
                    }
                }
            });
       
            // --- END OF ADDED LISTENERS ---
        

            setupHeaderButtonListener(domElements.embeddedChatCallBtn, () => {
                const id = chatActiveTargetManager.getEmbeddedChatTargetId();
                return id ? polyglotConnectors.find(c => c.id === id) : null;
            });
            setupHeaderButtonListener(domElements.messageModalCallBtn, () => chatActiveTargetManager.getModalMessageTargetConnector());
            // =================== END: PASTE THE LOGIC HERE ===================
        
            console.log("CEL_TS: setupAllChatInteractionListeners() - FINISHED.");
        }
        

            
            // D:\polyglot_connect\src\js\ui\chat_event_listeners.ts
// (Inside the eventListenerMethods IIFE, ensure `personaModalManager` is correctly destructured at the top of the IIFE)

    // =================== START OF REPLACEMENT BLOCK ===================
    const setupHeaderButtonListener = (
        btn: HTMLButtonElement | null,
        getConnFn: () => Connector | null | undefined
    ): void => {
        if (!btn) return;
        if (initializedButtons.has(btn)) { // Corrected variable name
            return;
        }
        const actionHandler = () => {
            const connector = getConnFn ? getConnFn() : null;
            if (!connector || !connector.id) {
                console.warn(`CEL_TS: No valid connector found for header call button.`);
                return;
            }
            const currentPolyglotApp = window.polyglotApp as PolyglotApp | undefined;
            if (currentPolyglotApp && typeof currentPolyglotApp.initiateSession === 'function') {
                console.log(`CEL_TS: Header button initiating 'direct_modal' call for ${connector.id}.`);
                currentPolyglotApp.initiateSession(connector, 'direct_modal');
            } else {
                console.warn(`CEL_TS: polyglotApp.initiateSession not available for header button call.`);
                alert(`Call feature is still initializing. Please try again shortly.`);
            }
        };
        addSafeListener(btn, 'click', actionHandler);
        initializedButtons.set(btn, true); // Corrected variable name
    };

 

        
        function initializeEventListeners(domElements: YourDomElements, conversationManager: ConversationManager): void {
            console.log("CEL_TS_DEBUG_FLOW: ENTERING initializeEventListeners() - ATTACHING LISTENERS NOW.");
            console.log("CEL_TS: initializeEventListeners() called.");
          
          
          
          
          
          
            if (listenersInitialized) {
                console.warn("CEL_TS: Event listeners already initialized.");
                return;
            }
        
            setupAllChatInteractionListeners();
            setupChatAvatarClickListeners();
            
        // in chat_event_listeners.ts

// =================== REPLACE WITH THIS BLOCK ===================
// in chat_event_listeners.ts, inside initializeEventListeners

if (window.reactionHandler?.initialize && window.aiTranslationService && window.groupDataManager) {
    console.log("CEL: Initializing Reaction Handler with all required dependencies (including groupDataManager).");
    // Pass all four required arguments now
    window.reactionHandler.initialize(
        domElements, 
        conversationManager, 
        window.aiTranslationService,
        window.groupDataManager // <<< THIS IS THE FIX
    );
} else {
    console.error("CEL: Could not initialize Reaction Handler. A dependency is missing.", {
        hasRH: !!window.reactionHandler?.initialize,
        hasATS: !!window.aiTranslationService,
        hasGDM: !!window.groupDataManager
    });
}
// ===============================================================

         // =================== START: ADD NEW RECAP CLOSE LISTENER ===================
// The old, "dumb" listener in chat_event_listeners.ts
// The new, smarter listener in chat_event_listeners.ts
addSafeListener(domElements.closeRecapBtn, 'click', () => {
    // Step 1: Get the dependencies.
    const deps = getSafeDeps();

    // Step 2: If the dependencies object is null, we can't do anything. Exit.
    if (!deps) {
        console.error("Cannot handle recap close: Core dependencies are missing.");
        return;
    }

    // Step 3: Now we know 'deps' is a valid object. We can safely use its properties.
    const { modalHandler, tabManager, sessionHistoryManager, chatOrchestrator } = deps;

    modalHandler.close(domElements.sessionRecapScreen);

    const currentTab = tabManager.getCurrentActiveTab();
    if (currentTab !== 'summary') {
        const lastSession = sessionHistoryManager?.getLastSession?.();
        
        // --- THIS IS THE FIX (Type Guard) ---
        // Before passing the connector, we check that it exists AND that it has an 'id'.
        // This simple check proves to TypeScript that it's a "sufficiently complete"
        // connector object.
        if (lastSession?.connector && lastSession.connector.id) {
            // Because of the check above, TypeScript now allows us to treat this
            // as a full Connector for this function call.
            chatOrchestrator?.openConversation(lastSession.connector as Connector);
        }
        // --- END OF FIX ---
    }
});
// ==========================================================
// === ADD THIS ENTIRE NEW BLOCK OF CODE ===
// ==========================================================
// Listeners for the "Upgrade Limit" modal that pops up





const handleChatLogClick = (event: Event) => {
    const target = event.target as HTMLElement;

    // Check if a call event button was clicked
    const callButton = target.closest('.call-event-action-btn');
    if (callButton) {
        console.log("Unified Handler: Detected click on a call event button.");
        handleCallEventButtonClick(event);
        return; // Stop processing
    }

    // You can add other checks here in the future if needed
    // For example, if you wanted to handle clicks on images to open a lightbox:
    // const chatImage = target.closest('.chat-message-image');
    // if (chatImage) {
    //     handleImageClick(chatImage);
    //     return;
    // }
};

// Attach the new unified handler to all relevant chat logs
addSafeListener(domElements.embeddedChatLog, 'click', handleChatLogClick);
addSafeListener(domElements.messageChatLog, 'click', handleChatLogClick);
addSafeListener(domElements.groupChatLogDiv, 'click', handleChatLogClick); // Also add to group chat for consistency
listenersInitialized = true; 

        }

// =================== ADD THIS BLOCK INSIDE initializeEventListeners ===================

function setupInputFocusListeners(): void {
    const inputsToWatch = [
        domElements.embeddedMessageTextInput,
        domElements.embeddedImageCaptionInput,
        domElements.messageTextInput,
        domElements.modalImageCaptionInput,
        domElements.groupChatInput,
        domElements.groupImageCaptionInput
    ].filter(input => input); // Filter out any null elements

    const handleFocus = () => {
        document.body.classList.add('chat-input-active');
        console.log("Body class 'chat-input-active' ADDED.");
    };

    const handleBlur = () => {
        // A small delay is needed because focus can shift between caption/main input
        // and we don't want the buttons to flicker.
        setTimeout(() => {
            // Check if focus is still within any of the chat inputs.
            const isAnyChatInputFocused = inputsToWatch.some(input => document.activeElement === input);
            if (!isAnyChatInputFocused) {
                document.body.classList.remove('chat-input-active');
                console.log("Body class 'chat-input-active' REMOVED.");
            }
        }, 100);
    };

    inputsToWatch.forEach(input => {
        addSafeListener(input, 'focus', handleFocus);
        addSafeListener(input, 'blur', handleBlur);
    });

    console.log("CEL: Setup input focus listeners for jump button visibility.");
}

// Call the new setup function
setupInputFocusListeners();

// ==================================================================================



        
        function setupChatAvatarClickListeners(): void {
            // personaModalManager and polyglotConnectors are already destructured from resolvedDeps at the top of the IIFE
            if (!domElements || !personaModalManager || !polyglotConnectors) {
                console.error("CEL_TS: Missing dependencies for setupChatAvatarClickListeners (domElements, personaModalManager, or polyglotConnectors).");
                return;
            }
    
            const chatLogContainers = [
                domElements.embeddedChatLog,
                domElements.messageChatLog,
                domElements.groupChatLogDiv
            ].filter(el => el !== null) as HTMLElement[];
    
            console.log("CEL_TS: Setting up avatar click listeners for containers:", chatLogContainers.map(c => c?.id || 'unknown'));
    
            chatLogContainers.forEach(container => {
                // Use addSafeListener for consistency
                addSafeListener(container, 'click', (event: Event) => {
                    const target = event.target as HTMLElement;
                    const avatarElement = target.closest('.clickable-chat-avatar') as HTMLElement | null;
    
                    if (avatarElement) {
                        event.preventDefault(); 
                        event.stopPropagation(); 
    
                        const connectorId = avatarElement.dataset.connectorId;
                        if (!connectorId) {
                            console.warn("CEL_TS: Clicked avatar has no data-connector-id.");
                            return;
                        }
    
                        const connector = polyglotConnectors.find(c => c.id === connectorId);
                        if (connector) {
                            console.log(`CEL_TS: Avatar clicked for connector ID: ${connectorId}. Opening persona modal.`);
                            if (personaModalManager.openDetailedPersonaModal) {
                                personaModalManager.openDetailedPersonaModal(connector);
                            } else {
                                console.error("CEL_TS: personaModalManager.openDetailedPersonaModal is not available.");
                            }
                        } else {
                            console.warn(`CEL_TS: Connector with ID '${connectorId}' not found for clicked avatar.`);
                        }
                    }
                });
            });
            console.log('CEL_TS: Chat Avatar click listeners setup complete.');
        }

        
      
      // REPLACE WITH THIS
        // Pass the dependencies from the main IIFE scope into the initializer
        initializeEventListeners(domElements, conversationManager);

        console.log("chat_event_listeners.ts: IIFE (module definition) FINISHED.");
        return {
            initializeEventListeners
        };
    })();

    Object.assign(window.chatEventListeners!, eventListenerMethods);

    if (window.chatEventListeners && typeof window.chatEventListeners.initializeEventListeners === 'function') {
        console.log("chat_event_listeners.ts: SUCCESSFULLY assigned and populated.");
    } else {
        console.error("chat_event_listeners.ts: CRITICAL ERROR - window.chatEventListeners population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('chatEventListenersReady'));
    console.log('chat_event_listeners.ts: "chatEventListenersReady" event dispatched.');
} // <<< This is the closing brace for initializeActualChatEventListeners
// ... (rest of the file for dependency checking and initialization logic remains the same) ...

const dependenciesForCEL: string[] = [
    'domElementsReady', 
    'personaModalManagerReady', 
    'chatSessionHandlerReady', 
    'chatActiveTargetManagerReady', 
    'voiceMemoHandlerReady',
    'textMessageHandlerReady',
    'groupManagerReady', 
    // 'polyglotAppReady',
    'sessionHistoryManagerReady', 
    'uiUpdaterReady',
    'modalHandlerReady',
    'polyglotDataReady',
    'reactionHandlerReady',
    'aiTranslationServiceReady'
];

const celMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForCEL.forEach((dep: string) => {
    celMetDependenciesLog[dep] = false;
});
let celDepsMetCount = 0;

function checkAndInitCEL(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`CEL_EVENT: Listener for '${receivedEventName}' was triggered.`);
        // Verification logic
        let verified = false;
        switch(receivedEventName) {
            case 'domElementsReady': verified = !!window.domElements; break;
            case 'personaModalManagerReady': verified = !!window.personaModalManager?.openDetailedPersonaModal; break;
            case 'chatSessionHandlerReady': verified = !!window.chatSessionHandler?.endActiveModalMessagingSession; break;
            case 'chatActiveTargetManagerReady': verified = !!window.chatActiveTargetManager?.getEmbeddedChatTargetId; break;
            case 'voiceMemoHandlerReady': verified = !!window.voiceMemoHandler?.handleNewVoiceMemoInteraction; break;
            case 'textMessageHandlerReady': verified = !!window.textMessageHandler?.sendEmbeddedTextMessage; break;
            case 'groupManagerReady': verified = !!window.groupManager?.handleUserMessageInGroup; break;
            // case 'polyglotAppReady': verified = !!(window.polyglotApp && typeof window.polyglotApp.initiateSession === 'function'); if (verified) console.log("CEL_DEPS: polyglotAppReady VERIFIED!");break;

            case 'sessionHistoryManagerReady': verified = !!window.sessionHistoryManager?.getSessionById; break;
            case 'uiUpdaterReady': verified = !!window.uiUpdater?.populateRecapModal; break;
            case 'modalHandlerReady': verified = !!window.modalHandler?.open; break;
            case 'polyglotDataReady': verified = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)); break;
          
            case 'reactionHandlerReady': verified = !!window.reactionHandler?.initialize; break; // <<< ADD THIS LINE
            default: console.warn(`CEL_EVENT: Unknown event '${receivedEventName}'`); return;
        }

        if (verified) {
            if (!celMetDependenciesLog[receivedEventName]) {
                celMetDependenciesLog[receivedEventName] = true;
                celDepsMetCount++;
                console.log(`CEL_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${celDepsMetCount}/${dependenciesForCEL.length}`);
            }
        } 
        
        
        
        
        else {
            console.warn(`CEL_EVENT: Event '${receivedEventName}' received but verification FAILED.`);
        }
    }
    // This console.log should be here to show status after each event or pre-check
    console.log(`CEL_DEPS: Met status (after processing '${receivedEventName || 'pre-check'}'):`, JSON.stringify(celMetDependenciesLog));

    if (celDepsMetCount === dependenciesForCEL.length) {
        console.log('chat_event_listeners.ts: All dependencies met. Initializing actual ChatEventListeners.');
        console.log("CEL_EXEC_POINT: checkAndInitCEL - All dependencies met. Calling initializeActualChatEventListeners().");
        initializeActualChatEventListeners();
    }
}

console.log('CEL_SETUP: Starting initial dependency pre-check for ChatEventListeners.');
celDepsMetCount = 0;
Object.keys(celMetDependenciesLog).forEach(key => celMetDependenciesLog[key] = false);
let celAllPreloadedAndVerified = true;

dependenciesForCEL.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false;
    switch(eventName) {
        case 'domElementsReady': isReadyNow = !!window.domElements; isVerifiedNow = isReadyNow; break;
        case 'personaModalManagerReady': isReadyNow = !!window.personaModalManager; isVerifiedNow = isReadyNow && !!window.personaModalManager?.openDetailedPersonaModal; break;
        case 'chatSessionHandlerReady': isReadyNow = !!window.chatSessionHandler; isVerifiedNow = isReadyNow && !!window.chatSessionHandler?.endActiveModalMessagingSession; break;
        case 'chatActiveTargetManagerReady': isReadyNow = !!window.chatActiveTargetManager; isVerifiedNow = isReadyNow && !!window.chatActiveTargetManager?.getEmbeddedChatTargetId; break;
        case 'voiceMemoHandlerReady': isReadyNow = !!window.voiceMemoHandler; isVerifiedNow = isReadyNow && !!window.voiceMemoHandler?.handleNewVoiceMemoInteraction; break;
        case 'textMessageHandlerReady': isReadyNow = !!window.textMessageHandler; isVerifiedNow = isReadyNow && !!window.textMessageHandler?.sendEmbeddedTextMessage; break;
        case 'groupManagerReady': isReadyNow = !!window.groupManager; isVerifiedNow = isReadyNow && !!window.groupManager?.handleUserMessageInGroup; break;
        // case 'polyglotAppReady': isReadyNow = !!window.polyglotApp; isVerifiedNow = isReadyNow && !!window.polyglotApp?.initiateSession; break;
        case 'sessionHistoryManagerReady': isReadyNow = !!window.sessionHistoryManager; isVerifiedNow = isReadyNow && !!window.sessionHistoryManager?.getSessionById; break;
        case 'uiUpdaterReady': isReadyNow = !!window.uiUpdater; isVerifiedNow = isReadyNow && !!window.uiUpdater?.populateRecapModal; break;
        case 'modalHandlerReady': isReadyNow = !!window.modalHandler; isVerifiedNow = isReadyNow && !!window.modalHandler?.open; break;
        case 'polyglotDataReady': isReadyNow = !!window.polyglotConnectors; isVerifiedNow = isReadyNow && Array.isArray(window.polyglotConnectors); break;
        // Removed the duplicate 'polyglotAppReady' check that was only checking for existence
        case 'reactionHandlerReady': isReadyNow = !!window.reactionHandler; isVerifiedNow = isReadyNow && !!window.reactionHandler?.initialize; break;
        case 'aiTranslationServiceReady': 
        isReadyNow = !!window.aiTranslationService; 
        isVerifiedNow = isReadyNow && !!window.aiTranslationService?.initialize; 
        break;
        default: console.warn(`CEL_PRECHECK: Unknown dependency: ${eventName}`); isVerifiedNow = false; break;
    }

    console.log(`CEL_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if (!celMetDependenciesLog[eventName]) {
            celMetDependenciesLog[eventName] = true;
            celDepsMetCount++;
        }
    } else {
        celAllPreloadedAndVerified = false;
        console.log(`CEL_PRECHECK: Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, function anEventListener() { 
            checkAndInitCEL(eventName); 
        }, { once: true });
    }
});

console.log(`CEL_SETUP: Pre-check done. Met: ${celDepsMetCount}/${dependenciesForCEL.length}`, JSON.stringify(celMetDependenciesLog));

if (celAllPreloadedAndVerified && celDepsMetCount === dependenciesForCEL.length) {
    console.log('chat_event_listeners.ts: All dependencies ALREADY MET. Initializing directly.');
    initializeActualChatEventListeners();
} else if (celDepsMetCount > 0 && celDepsMetCount < dependenciesForCEL.length) {
    console.log(`chat_event_listeners.ts: Some deps pre-verified (${celDepsMetCount}/${dependenciesForCEL.length}), waiting for events.`);
} else if (celDepsMetCount === 0 && !celAllPreloadedAndVerified) {
    console.log(`chat_event_listeners.ts: No deps pre-verified. Waiting for all ${dependenciesForCEL.length} events.`);

// ... lots of code before
} else if (dependenciesForCEL.length === 0) { 
    console.log('chat_event_listeners.ts: No dependencies listed. Initializing directly.');
    initializeActualChatEventListeners();
}
// }  // You even commented this one out, but there must be another one

console.log("chat_event_listeners.ts: Script execution FINISHED (TS Version).");
// The error is caused by a stray '}' right around here. Just delete it.