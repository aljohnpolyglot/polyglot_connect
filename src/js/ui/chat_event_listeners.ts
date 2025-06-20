// D:\polyglot_connect\src\js\ui\chat_event_listeners.ts
console.log('chat_event_listeners.ts: SCRIPT EXECUTION STARTED - TOP OF FILE (TS Version).');
import type {
    YourDomElements,
    PersonaModalManager,
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
    ChatMessageOptions // Ensure this is imported if used by addSafeListener or handleCallEventButtonClick indirectly
} from '../types/global.d.ts';

console.log('chat_event_listeners.ts: Script loaded, waiting for core dependencies (TS Version).');

interface ChatEventListenersModule {
    initializeEventListeners: () => void;
}

window.chatEventListeners = {} as ChatEventListenersModule;
console.log('chat_event_listeners.ts: Placeholder window.chatEventListeners assigned.');

// Define VerifiedDeps type at the module scope so getSafeDeps can use it
type VerifiedDepsForCelInit = { // Renamed for clarity of its purpose
    domElements: YourDomElements;
    personaModalManager: PersonaModalManager;
    chatSessionHandler: ChatSessionHandler;
    chatActiveTargetManager: ChatActiveTargetManager;
    voiceMemoHandler: VoiceMemoHandler;
    textMessageHandler: TextMessageHandler;
    groupManager: GroupManager;
    // polyglotApp: PolyglotApp; // REMOVED - handlers will access window.polyglotApp
    sessionHistoryManager: SessionHistoryManager;
    uiUpdater: UiUpdater;
    modalHandler: ModalHandler;
    polyglotConnectors: Connector[];
  // BECOMES:
polyglotHelpers: PolyglotHelpersOnWindow; // <<< USE THE ALIAS FROM YOUR IMPORTS
};
// Define getSafeDeps at the module scope or ensure it's correctly defined before its first call
// D:\polyglot_connect\src\js\ui\chat_event_listeners.ts

const getSafeDeps = (): VerifiedDepsForCelInit | null => {
    console.log("CEL_DEBUG_GETSAFEDEPS: --- Entered getSafeDeps (polyglotApp check removed) ---");
    const deps = {
        domElements: window.domElements,
        personaModalManager: window.personaModalManager,
        chatSessionHandler: window.chatSessionHandler,
        chatActiveTargetManager: window.chatActiveTargetManager,
        voiceMemoHandler: window.voiceMemoHandler,
        textMessageHandler: window.textMessageHandler,
        groupManager: window.groupManager,
        // polyglotApp: window.polyglotApp, // REMOVED from deps object
        sessionHistoryManager: window.sessionHistoryManager,
        uiUpdater: window.uiUpdater,
        modalHandler: window.modalHandler,
        polyglotConnectors: window.polyglotConnectors,
        polyglotHelpers: window.polyglotHelpers // <<< ADD THIS LINE if missing
    };
    const missing: string[] = [];

    if (!deps.domElements) missing.push("domElements");
    if (!deps.personaModalManager?.openDetailedPersonaModal) missing.push("personaModalManager or its .openDetailedPersonaModal method");
    if (!deps.chatSessionHandler?.endActiveModalMessagingSession) missing.push("chatSessionHandler or its .endActiveModalMessagingSession method");
    if (!deps.chatActiveTargetManager?.getEmbeddedChatTargetId) missing.push("chatActiveTargetManager or its .getEmbeddedChatTargetId method");
    if (!deps.voiceMemoHandler?.handleNewVoiceMemoInteraction) missing.push("voiceMemoHandler or its .handleNewVoiceMemoInteraction method");
    if (!deps.textMessageHandler?.sendEmbeddedTextMessage) missing.push("textMessageHandler or its .sendEmbeddedTextMessage method");
    if (!deps.groupManager?.handleUserMessageInGroup) missing.push("groupManager or its .handleUserMessageInGroup method");
    
    // REMOVED: The check for polyglotApp.initiateSession
    // if (!deps.polyglotApp?.initiateSession) missing.push("polyglotApp or its .initiateSession method"); 
    
    if (!deps.sessionHistoryManager?.getSessionById) missing.push("sessionHistoryManager or its .getSessionById method");
    if (!deps.uiUpdater?.populateRecapModal) missing.push("uiUpdater or its .populateRecapModal method");
    if (!deps.modalHandler?.open) missing.push("modalHandler or its .open method");
    if (!deps.polyglotConnectors || !Array.isArray(deps.polyglotConnectors)) missing.push("polyglotConnectors (must be an array)");
    if (!deps.polyglotHelpers?.generateUUID) missing.push("polyglotHelpers or its .generateUUID method"); // <<< ADD THIS CHECK
    if (missing.length > 0) {
        console.error(`ChatEventListeners: getSafeDeps - FINAL VERDICT: MISSING/INVALID: ${missing.join(', ')}. RETURNING NULL.`);
        return null;
    }
    // console.log("CEL_DEBUG_GETSAFEDEPS: --- All checks in getSafeDeps PASSED, RETURNING deps object ---");
    return deps as VerifiedDepsForCelInit; // Cast to the new type
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

// D:\polyglot_connect\src\js\ui\chat_event_listeners.ts
// ... (inside the IIFE)
const { // Destructure all needed dependencies from resolvedDeps!
    domElements, personaModalManager, chatSessionHandler,
    chatActiveTargetManager, voiceMemoHandler, textMessageHandler,
    groupManager, /* polyglotApp, */ sessionHistoryManager, // polyglotApp REMOVED/COMMENTED
    uiUpdater, modalHandler, polyglotConnectors,
    polyglotHelpers // <<< ADD THIS LINE if missing
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

function handleFileSelection(
    event: Event,
    previewContainer: HTMLElement | null,
    captionInputElement: HTMLInputElement | null,
    mainTextInputElement: HTMLInputElement | null
) {
    if (!previewContainer || !captionInputElement || !mainTextInputElement) return;
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
        displayImagePreviews(Array.from(fileInput.files), previewContainer, captionInputElement, mainTextInputElement);
        fileInput.value = ''; // Reset file input
    }
}

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
    return async () => { // Made async for potential await later if needed
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
            captionForImage = textFromActiveInput; // Caption is the text from caption input
        } else {
            textFromActiveInput = mainTextInputElement.value.trim();
        }

        if (!textFromActiveInput && !imageFileToSend) {
            console.log(`CEL: Nothing to send (no text in active input, and no image) from ${context}.`);
            return;
        }

        console.log(`CEL: Attempting to send from ${context}:`);
        if (imageFileToSend) console.log(`  Image: ${imageFileToSend.name}`);
        console.log(`  Text from active input: "${textFromActiveInput}"`);


        const sendOptions: {
            skipUiAppend?: boolean;
            imageFile?: File | null;
            captionText?: string | null;
            messageId?: string;    // <<< ADD THIS
            timestamp?: number;    // <<< ADD THIS
        } = {
            skipUiAppend: false,
        };

        if (imageFileToSend) {
            sendOptions.imageFile = imageFileToSend;
            sendOptions.captionText = captionForImage;

            // --- INSTANT UI APPEND FOR IMAGE ---
            const tempUserMessageId = resolvedDeps?.polyglotHelpers?.generateUUID() || Date.now().toString();
            const tempTimestamp = Date.now();
            const tempImageUrl = URL.createObjectURL(imageFileToSend);

            const uiAppendOptions: ChatMessageOptions = {
                messageId: tempUserMessageId,
                timestamp: tempTimestamp,
                imageUrl: tempImageUrl,
            };

            if (context === 'embedded') {
                resolvedDeps?.uiUpdater?.appendToEmbeddedChatLog?.(captionForImage || "", 'user', uiAppendOptions);
            } else if (context === 'modal') {
                resolvedDeps?.uiUpdater?.appendToMessageLogModal?.(captionForImage || "", 'user', uiAppendOptions);
            } 
            sendOptions.skipUiAppend = true;
            sendOptions.messageId = tempUserMessageId;
            sendOptions.timestamp = tempTimestamp;
        } else { 
            // --- INSTANT UI APPEND FOR TEXT (MODAL/EMBEDDED ONLY) ---
            const tempUserMessageId = resolvedDeps?.polyglotHelpers?.generateUUID() || Date.now().toString();
            const tempTimestamp = Date.now();
            
            const uiAppendOptions: ChatMessageOptions = {
                messageId: tempUserMessageId,
                timestamp: tempTimestamp,
            };

            // Only handle instant append for non-group contexts here.
            // The groupManager will handle its own UI appending.
            if (context === 'embedded') {
                resolvedDeps?.uiUpdater?.appendToEmbeddedChatLog?.(textFromActiveInput, 'user', uiAppendOptions);
                sendOptions.skipUiAppend = true; // Prevent TextMessageHandler from re-appending
            } else if (context === 'modal') {
                resolvedDeps?.uiUpdater?.appendToMessageLogModal?.(textFromActiveInput, 'user', uiAppendOptions);
                sendOptions.skipUiAppend = true; // Prevent TextMessageHandler from re-appending
            }
            
            // Pass the generated ID and timestamp so they are stored correctly in history.
            sendOptions.messageId = tempUserMessageId;
            sendOptions.timestamp = tempTimestamp;
        }
        // If it's just text, TextMessageHandler will handle UI append as normal unless skipUiAppend is true from voice memo etc.

        // Call the appropriate message sending function
        if (context === 'embedded') {
            const targetId = chatActiveTargetManager.getEmbeddedChatTargetId();
            if (targetId) {
                textMessageHandler.sendEmbeddedTextMessage(textFromActiveInput, targetId, sendOptions);
            }
        } else if (context === 'modal') {
            const targetConnector = chatActiveTargetManager.getModalMessageTargetConnector();
            if (targetConnector) {
                textMessageHandler.sendModalTextMessage(textFromActiveInput, targetConnector, sendOptions);
            }
        } else if (context === 'group') {
            const currentGroup = groupManager?.getCurrentGroupData?.();
            if (currentGroup) {
                groupManager.handleUserMessageInGroup(textFromActiveInput, sendOptions);
            }
        }

        // Clear inputs and reset UI state
        if (imageFileToSend) {
            activeImageFilesByInput.set(mainTextInputElement, []); // Clear stored file
            // captionInputElement.value = ''; // Already read, will be cleared by updateChatInputUIState
            updateChatInputUIState(previewContainer, captionInputElement, mainTextInputElement, false);
        } else {
            mainTextInputElement.value = ''; // Clear main text input if only text was sent
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




        
        function setupAllChatInteractionListeners(): void {
            console.log("CEL_TS: setupAllChatInteractionListeners() - START (New Integrated Version).");

            // --- EMBEDDED CHAT ---
            if (domElements.embeddedMessageTextInput &&
                domElements.imagePreviewContainerEmbedded &&
                domElements.embeddedImageCaptionInput &&
                domElements.embeddedMessageSendBtn /* Ensure send button is checked */) {

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
            addSafeListener(domElements.leaveGroupBtn, 'click', () => groupManager?.leaveCurrentGroup?.());
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
        



            
            // D:\polyglot_connect\src\js\ui\chat_event_listeners.ts
// (Inside the eventListenerMethods IIFE, ensure `personaModalManager` is correctly destructured at the top of the IIFE)

        const setupHeaderButtonListener = (
            btn: HTMLButtonElement | null,
            actType: 'call' | 'info',
            getConnFn: () => Connector | null | undefined,
            iface: string
        ): void => {
            if (!btn) return; // Early exit if button is null

            const actionHandler = () => {
                const connector = getConnFn ? getConnFn() : null;
                if (!connector || !connector.id) {
                    console.warn(`CEL_TS: No valid connector found for ${iface} ${actType} action.`);
                    return;
                }

                if (actType === 'call') {
                    const currentPolyglotApp = window.polyglotApp as PolyglotApp | undefined;
                    if (currentPolyglotApp && typeof currentPolyglotApp.initiateSession === 'function') {
                        console.log(`CEL_TS: Header button initiating 'direct_modal' call for ${connector.id} via ${iface}`);
                        currentPolyglotApp.initiateSession(connector, 'direct_modal');
                    } else {
                        console.warn(`CEL_TS: polyglotApp.initiateSession not available for header button call (${iface}). Deferring.`);
                        // Simple deferral without button state change for header buttons for now
                        const retryHeaderCall = () => {
                            console.log(`CEL_TS: Retrying header button call for ${connector.id} after polyglotAppReady.`);
                            const updatedPolyglotApp = window.polyglotApp as PolyglotApp | undefined;
                            if (updatedPolyglotApp && typeof updatedPolyglotApp.initiateSession === 'function') {
                                updatedPolyglotApp.initiateSession(connector, 'direct_modal');
                            } else {
                                console.error(`CEL_TS: polyglotApp.initiateSession still not ready on retry for header button (${iface}).`);
                                alert(`Call feature for ${iface} is still initializing. Please try again shortly.`);
                            }
                        };
                        document.addEventListener('polyglotAppReady', retryHeaderCall, { once: true });
                        // Optionally, briefly disable the button or show a small message
                        // btn.disabled = true; setTimeout(() => { if(btn) btn.disabled = false; }, 3000);
                    }
                } else if (actType === 'info') {
                    // personaModalManager is from the IIFE's destructured scope
                    if (personaModalManager && typeof personaModalManager.openDetailedPersonaModal === 'function') {
                        personaModalManager.openDetailedPersonaModal(connector);
                    } else {
                        console.error(`CEL_TS: personaModalManager or openDetailedPersonaModal method not available in setupHeaderButtonListener for info (${iface}).`);
                        alert(`Profile information for ${iface} is currently unavailable.`);
                    }
                }
            };
            addSafeListener(btn, 'click', actionHandler);
        };
            setupHeaderButtonListener(domElements.embeddedChatCallBtn, 'call', () => {
                const id = chatActiveTargetManager.getEmbeddedChatTargetId(); return id ? polyglotConnectors.find(c => c.id === id) : null;
            }, 'Embedded Chat');
            setupHeaderButtonListener(domElements.embeddedChatInfoBtn, 'info', () => {
                const id = chatActiveTargetManager.getEmbeddedChatTargetId(); return id ? polyglotConnectors.find(c => c.id === id) : null;
            }, 'Embedded Chat');
            setupHeaderButtonListener(domElements.messageModalCallBtn, 'call', () => chatActiveTargetManager.getModalMessageTargetConnector(), 'Message Modal');
            setupHeaderButtonListener(domElements.messageModalInfoBtn, 'info', () => chatActiveTargetManager.getModalMessageTargetConnector(), 'Message Modal');

            console.log("CEL_TS: setupAllChatInteractionListeners() - FINISHED.");
        } 
        
        function initializeEventListeners(): void {
            console.log("CEL_TS_DEBUG_FLOW: ENTERING initializeEventListeners() - ATTACHING LISTENERS NOW.");
            console.log("CEL_TS: initializeEventListeners() called.");
            if (listenersInitialized) {
                console.warn("CEL_TS: Event listeners already initialized.");
                return;
            }
            
            setupAllChatInteractionListeners(); 
            setupChatAvatarClickListeners(); // <<< ADD THIS 
            


         // =================== START: ADD NEW RECAP CLOSE LISTENER ===================
addSafeListener(domElements.closeRecapBtn, 'click', async () => {
    // First, get the connector from the last session
    const lastSession = sessionHistoryManager?.getLastSession?.();
    if (!lastSession || !lastSession.connector) {
        console.warn("CEL (Recap Close): Could not retrieve last session's connector. Closing modal only.");
        modalHandler.close(domElements.sessionRecapScreen);
        return;
    }
    
    const connectorToOpen = lastSession.connector;

    // Close the recap modal
    modalHandler.close(domElements.sessionRecapScreen);

    // Now, perform the "Flawless Handoff"
    console.log(`%c[Flawless Handoff] Recap closed. Forcing view switch to 'messages' and opening chat for [${connectorToOpen.id}]`, 'color: #007bff; font-weight: bold;');

    // 1. Tell the chat orchestrator to open the correct conversation in the embedded view.
    //    This function will handle the prompt rebuild and all other necessary logic.
    if (window.chatOrchestrator?.openConversation) { // Using the orchestrator is cleaner
         window.chatOrchestrator.openConversation(connectorToOpen);
    } else if (window.chatSessionHandler?.openConversationInEmbeddedView) { // Fallback
         window.chatSessionHandler.openConversationInEmbeddedView(connectorToOpen);
    }
    
    // 2. Explicitly switch the main view to 'messages'.
    window.shellController?.switchView('messages');
});
// ===================  END: ADD NEW RECAP CLOSE LISTENER  ===================
            console.log("CEL_TS_DEBUG_FLOW: Checking embeddedChatLog for attaching call button listener:", domElements.embeddedChatLog);
            if (domElements.embeddedChatLog) {
                domElements.embeddedChatLog.addEventListener('click', handleCallEventButtonClick as EventListener);
                console.log("CEL_TS_DEBUG_FLOW: ATTEMPTED to attach call event listener to embeddedChatLog.");
            } else {
                console.warn("CEL_TS: domElements.embeddedChatLog not found for call event buttons.");
            }

            console.log("CEL_TS_DEBUG_FLOW: Checking messageChatLog for attaching call button listener:", domElements.messageChatLog);
            if (domElements.messageChatLog) { 
                domElements.messageChatLog.addEventListener('click', handleCallEventButtonClick as EventListener);
                console.log("CEL_TS_DEBUG_FLOW: ATTEMPTED to attach call event listener to messageChatLog.");
            } else {
                console.warn("CEL_TS: domElements.messageChatLog not found for call event buttons.");
            }
            listenersInitialized = true; 
        }
        
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
      
      
      
      
      
        initializeEventListeners(); // Call to attach listeners when the IIFE runs

        console.log("chat_event_listeners.ts: IIFE (module definition) FINISHED.");
        return {
            initializeEventListeners 
        };
    })(); // End of IIFE

    Object.assign(window.chatEventListeners!, eventListenerMethods);

    if (window.chatEventListeners && typeof window.chatEventListeners.initializeEventListeners === 'function') {
        console.log("chat_event_listeners.ts: SUCCESSFULLY assigned and populated.");
    } else {
        console.error("chat_event_listeners.ts: CRITICAL ERROR - window.chatEventListeners population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('chatEventListenersReady'));
    console.log('chat_event_listeners.ts: "chatEventListenersReady" event dispatched.');

} // End of initializeActualChatEventListeners
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
    'polyglotDataReady'
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
            default: console.warn(`CEL_EVENT: Unknown event '${receivedEventName}'`); return;
        }

        if (verified) {
            if (!celMetDependenciesLog[receivedEventName]) {
                celMetDependenciesLog[receivedEventName] = true;
                celDepsMetCount++;
                console.log(`CEL_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${celDepsMetCount}/${dependenciesForCEL.length}`);
            }
        } else {
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
} else if (dependenciesForCEL.length === 0) { // Handle case with no dependencies
    console.log('chat_event_listeners.ts: No dependencies listed. Initializing directly.');
    initializeActualChatEventListeners();
}
// This was the line causing the TS1005 error, it was an extra, unneeded closing brace.
// } 

console.log("chat_event_listeners.ts: Script execution FINISHED (TS Version).");