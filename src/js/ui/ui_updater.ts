// D:\polyglot_connect\src\js\ui\ui_updater.ts

// D:\polyglot_connect\src\js\ui\ui_updater.ts

import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ChatUiUpdaterModule, // <<< ADDED
    Connector,
    ChatMessageOptions,
    RecapData,
    RecapDataItem,
    SessionData,
    GroupManager,
    SessionManager
} from '../types/global.d.ts';

console.log('ui_updater.ts: Script loaded, waiting for core dependencies.');
// while the actual methods will be populated later.
window.uiUpdater = {
    // Add dummy/placeholder versions of ALL methods defined in UiUpdaterModule interface
    updateVirtualCallingScreen: () => console.warn("UIU structural: updateVirtualCallingScreen called before full init."),
    appendToVoiceChatLog: () => { console.warn("UIU structural: appendToVoiceChatLog called before full init."); return null; },
    showImageInVoiceChat: () => console.warn("UIU structural: showImageInVoiceChat called before full init."),
    updateVoiceChatHeader: () => console.warn("UIU structural: updateVoiceChatHeader called before full init."),
    clearVoiceChatLog: () => console.warn("UIU structural: clearVoiceChatLog called before full init."),
    resetVoiceChatInput: () => console.warn("UIU structural: resetVoiceChatInput called before full init."),
    updateVoiceChatTapToSpeakButton: () => console.warn("UIU structural: updateVoiceChatTapToSpeakButton called before full init."),
    updateDirectCallHeader: () => console.warn("UIU structural: updateDirectCallHeader called before full init."),
    updateDirectCallStatus: () => console.warn("UIU structural: updateDirectCallStatus called before full init."),
    updateDirectCallMicButtonVisual: () => console.warn("UIU structural: updateDirectCallMicButtonVisual called before full init."),
    updateDirectCallSpeakerButtonVisual: () => console.warn("UIU structural: updateDirectCallSpeakerButtonVisual called before full init."),
    showImageInDirectCall: () => console.warn("UIU structural: showImageInDirectCall called before full init."),
    clearDirectCallActivityArea: () => console.warn("UIU structural: clearDirectCallActivityArea called before full init."),
    appendToMessageLogModal: () => { console.warn("UIU structural: appendToMessageLogModal called before full init."); return null; },
    showImageInMessageModal: () => console.warn("UIU structural: showImageInMessageModal called before full init."),
    updateMessageModalHeader: () => console.warn("UIU structural: updateMessageModalHeader called before full init."),
    resetMessageModalInput: () => console.warn("UIU structural: resetMessageModalInput called before full init."),
    clearMessageModalLog: () => console.warn("UIU structural: clearMessageModalLog called before full init."),
    appendToEmbeddedChatLog: () => { console.warn("UIU structural: appendToEmbeddedChatLog called before full init."); return null; },
    showImageInEmbeddedChat: () => console.warn("UIU structural: showImageInEmbeddedChat called before full init."),
    updateEmbeddedChatHeader: () => console.warn("UIU structural: updateEmbeddedChatHeader called before full init."),
    clearEmbeddedChatInput: () => console.warn("UIU structural: clearEmbeddedChatInput called before full init."),
    toggleEmbeddedSendButton: () => console.warn("UIU structural: toggleEmbeddedSendButton called before full init."),
    clearEmbeddedChatLog: () => console.warn("UIU structural: clearEmbeddedChatLog called before full init."),
    appendToGroupChatLog: () => { console.warn("UIU structural: appendToGroupChatLog called before full init."); return null; },
    updateGroupChatHeader: () => console.warn("UIU structural: updateGroupChatHeader called before full init."),

    clearGroupChatInput: () => console.warn("UIU structural: clearGroupChatInput called before full init."),
    clearGroupChatLog: () => console.warn("UIU structural: clearGroupChatLog called before full init."),
    populateRecapModal: () => console.warn("UIU structural: populateRecapModal called before full init."),
    displaySummaryInView: () => console.warn("UIU structural: displaySummaryInView called before full init."),
    updateTTSToggleButtonVisual: () => console.warn("UIU structural: updateTTSToggleButtonVisual called before full init."),
    updateSendPhotoButtonVisibility: () => console.warn("UIU structural: updateSendPhotoButtonVisibility called before full init."),
    showProcessingSpinner: () => { console.warn("UIU structural: showProcessingSpinner called before full init."); return null; },
    removeProcessingSpinner: () => console.warn("UIU structural: removeProcessingSpinner called before full init."),
    appendSystemMessage: () => { console.warn("UIU structural: appendSystemMessage called before full init."); return null; },
    scrollEmbeddedChatToBottom: () => console.warn("UIU structural: scrollEmbeddedChatToBottom called before full init."),
    scrollMessageModalToBottom: () => console.warn("UIU structural: scrollMessageModalToBottom called before full init."),
    showLoadingInEmbeddedChatLog: () => console.warn("UIU structural: showLoadingInEmbeddedChatLog called before full init."),
    showErrorInEmbeddedChatLog: () => console.warn("UIU structural: showErrorInEmbeddedChatLog called before full init."),
    
    
} as UiUpdaterModule; // Cast to the module type
console.log('ui_updater.ts: Placeholder window.uiUpdater assigned.');
document.dispatchEvent(new CustomEvent('uiUpdaterPlaceholderReady')); // <<< RENAMED
console.log('ui_updater.ts: "uiUpdaterPlaceholderReady" (STRUCTURAL) event dispatched.');


interface UiUpdaterModule {
    updateVirtualCallingScreen: (connector: Connector, sessionTypeAttempt: string) => void;
    appendToVoiceChatLog: (text: string, senderClass: string, options?: ChatMessageOptions) => HTMLElement | null;
    showImageInVoiceChat: (imageUrl: string | null) => void; // Allow null to clear
    updateVoiceChatHeader: (connector: Connector) => void;
    clearVoiceChatLog: () => void;
    resetVoiceChatInput: () => void;
    updateVoiceChatTapToSpeakButton: (state: 'listening' | 'processing' | 'idle', text?: string) => void;
    updateDirectCallHeader: (connector: Connector) => void;
    updateDirectCallStatus: (statusText: string, isError?: boolean) => void;
    updateDirectCallMicButtonVisual: (isMuted: boolean) => void;
    updateDirectCallSpeakerButtonVisual: (isMuted: boolean) => void;
    showImageInDirectCall: (imageUrl: string | null) => void; // Allow null to clear
    clearDirectCallActivityArea: () => void;
    appendToMessageLogModal: (text: string, senderClass: string, options?: ChatMessageOptions) => HTMLElement | null;
    showImageInMessageModal: (imageUrl: string | null) => void; // Allow null to clear
    updateMessageModalHeader: (connector: Connector) => void;
    resetMessageModalInput: () => void;
    clearMessageModalLog: () => void;
    appendToEmbeddedChatLog: (text: string, senderClass: string, options?: ChatMessageOptions) => HTMLElement | null;
    showImageInEmbeddedChat: (imageUrl: string | null) => void; // Allow null to clear
    updateEmbeddedChatHeader: (connector: Connector) => void;
    clearEmbeddedChatInput: () => void;
    toggleEmbeddedSendButton: (enable: boolean) => void;
    clearEmbeddedChatLog: () => void;
  
  
  
  
    appendToGroupChatLog: (text: string, senderNameFromArg: string, isUser: boolean, speakerId: string, options?: ChatMessageOptions) => HTMLElement | null;
    updateGroupChatHeader: (groupName: string, members: Connector[]) => void;
  
    clearGroupChatInput: () => void;
    clearGroupChatLog: () => void;
    populateRecapModal: (recapData: RecapData | null) => void; // Allow null recapData
    displaySummaryInView: (sessionData: SessionData | null) => void;
    updateTTSToggleButtonVisual: (buttonElement: HTMLElement | null, isMuted: boolean) => void;
    updateSendPhotoButtonVisibility: (connector: Connector | null, buttonElement: HTMLElement | null) => void; // Allow null connector
    showProcessingSpinner: (logElement: HTMLElement, messageId?: string | null) => HTMLElement | null;
    removeProcessingSpinner: (logElement: HTMLElement, messageId?: string | null) => void;
    appendSystemMessage: (logElement: HTMLElement | null, text: string, isError?: boolean, isTimestamp?: boolean) => HTMLElement | null;
    scrollEmbeddedChatToBottom?: () => void;
    scrollMessageModalToBottom?: () => void;
    showLoadingInEmbeddedChatLog: () => void;
    showErrorInEmbeddedChatLog: (errorMessage: string) => void;
    
}

function initializeActualUiUpdater(): void {
    console.log('ui_updater.ts: initializeActualUiUpdater() for FULL method population called.');

    // Define getSafeFunctionalDeps here or ensure it's accessible
       // REPLACE WITH THIS
       const getSafeFunctionalDeps = (): {
        domElements: YourDomElements,
        polyglotHelpers: PolyglotHelpers,
        chatUiUpdater: ChatUiUpdaterModule, // <<< ADDED
        polyglotConnectors: Connector[] | undefined,
        groupManager: GroupManager | undefined,
        sessionManager: SessionManager | undefined
    } | null => {
        const deps = {
            domElements: window.domElements as YourDomElements | undefined,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers | undefined,

            chatUiUpdater: window.chatUiUpdater as ChatUiUpdaterModule | undefined, // <<< ADDED
            polyglotConnectors: window.polyglotConnectors as Connector[] | undefined,
            groupManager: window.groupManager as GroupManager | undefined,
            sessionManager: window.sessionManager as SessionManager | undefined
        };
        // Check for essential ones (domElements, polyglotHelpers, and the new one)
        if (!deps.domElements || !deps.polyglotHelpers || !deps.chatUiUpdater) { // <<< MODIFIED
            console.error(`UiUpdater (Full Init): Missing essential domElements, polyglotHelpers, or chatUiUpdater.`);
            return null;
        }
        return deps as any; // Cast to the full type
    };
    
    const functionalDeps = getSafeFunctionalDeps();

    if (!functionalDeps) {
        console.error("ui_updater.ts: CRITICAL - Functional dependencies not ready for full UiUpdater setup.");
        return;
    }
    
    console.log('ui_updater.ts: Functional dependencies ready.');

    // Initialize the new module INSIDE the safe block
    functionalDeps.chatUiUpdater.initialize({
        domElements: functionalDeps.domElements,
        polyglotHelpers: functionalDeps.polyglotHelpers
    });
    console.log('ui_updater.ts: Functional dependencies for full method population appear ready.');

    // Destructure essential deps, others can be fetched via getDeps() inside methods if preferred
    const { domElements, polyglotHelpers } = functionalDeps;


          
    
  // D:\polyglot_connect\src\js\ui\ui_updater.ts

// This is inside initializeActualUiUpdater, replacing the original 'methods' \\\



const methods = ((): UiUpdaterModule => {
    'use strict';
    console.log("ui_updater.ts: IIFE for actual methods STARTING.");
    // Map to track the last displayed timestamp for each chat log
 

    try { // <<< WRAP THE ENTIRE IIFE CONTENT
        const getDepsLocal = () => {
            return {
                domElements: window.domElements as YourDomElements,
                polyglotHelpers: window.polyglotHelpers as PolyglotHelpers,
                chatUiUpdater: window.chatUiUpdater as ChatUiUpdaterModule, // <<< ADDED
                polyglotConnectors: window.polyglotConnectors as Connector[] | undefined,
                groupManager: window.groupManager as GroupManager | undefined,
                sessionManager: window.sessionManager as SessionManager | undefined
            };
        };

        const appendSystemMessage = (logEl: HTMLElement | null, text: string, isError: boolean = false, isTimestamp: boolean = false): HTMLElement | null => {
            return getDepsLocal().chatUiUpdater.appendSystemMessage(logEl, text, isError, isTimestamp);
        };
      // D:\polyglot_connect\src\js\ui\ui_updater.ts
// Inside the initializeActualUiUpdater -> const methods = ((): UiUpdaterModule => { ... })();



// PASTE THIS NEW FUNCTION:
// REPLACE WITH THIS LINE (this is the correct version):
// D:\polyglot_connect\src\js\ui\ui_updater.ts
// Inside the initializeActualUiUpdater -> const methods = ((): UiUpdaterModule => { ... })();



const scrollChatLogToBottom = (chatLogElement: HTMLElement | null): void => {
    if (chatLogElement) getDepsLocal().chatUiUpdater.scrollChatLogToBottom(chatLogElement);
};
        const scrollEmbeddedChatToBottom = (): void => scrollChatLogToBottom(getDepsLocal().domElements.embeddedChatLog);
        const scrollMessageModalToBottom = (): void => scrollChatLogToBottom(getDepsLocal().domElements.messageChatLog);


// =================== ADD THIS FUNCTION ===================
const clearVoiceChatLog = (): void => {
    const { domElements, chatUiUpdater } = getDepsLocal();
    if (domElements.directCallMainContent) {
        domElements.directCallMainContent.innerHTML = '';
        chatUiUpdater.clearLogCache(domElements.directCallMainContent);
    }
    if (domElements.directCallActivityArea) (domElements.directCallActivityArea as HTMLElement).style.display = 'none';
    if (domElements.directCallActivityImageDisplay) (domElements.directCallActivityImageDisplay as HTMLImageElement).src = '';
};
// =========================================================


        const showImageInActivityArea = (activityAreaEl: HTMLElement | null, imgDisplayEl: HTMLImageElement | null, logToScrollEl: HTMLElement | null, imageUrl: string | null | undefined): void => {
            if (!activityAreaEl || !imgDisplayEl || !logToScrollEl) return;
            if (imageUrl) {
                imgDisplayEl.src = imageUrl;
                activityAreaEl.style.display = 'block';
                requestAnimationFrame(() => { logToScrollEl.scrollTop = logToScrollEl.scrollHeight; });
            } else {
                imgDisplayEl.src = '';
                activityAreaEl.style.display = 'none';
            }
        };

        const populateListInRecap = (ulEl: HTMLElement | null, items: Array<string | RecapDataItem> | null | undefined, itemType: 'simple' | 'vocabulary' | 'improvementArea' = 'simple'): void => {
            const { polyglotHelpers: currentPolyglotHelpers } = getDepsLocal();
            if (!ulEl || !currentPolyglotHelpers) { if (ulEl) ulEl.innerHTML = '<li>Error: Deps missing.</li>'; return; }
            ulEl.innerHTML = '';
            if (!items || items.length === 0) {
                const li = document.createElement('li'); li.className = 'recap-list-placeholder-item';
                li.textContent = (itemType === 'vocabulary' || itemType === 'improvementArea') ? 'None noted.' : 'N/A';
                ulEl.appendChild(li); return;
            }
            items.forEach(itemData => {
                const li = document.createElement('li');
                try {
                    if (itemType === 'simple' && typeof itemData === 'string') {
                        li.innerHTML = `<i class="fas fa-check-circle recap-item-icon"></i> ${currentPolyglotHelpers.sanitizeTextForDisplay(itemData)}`;
                    } else if (itemType === 'vocabulary' && typeof itemData === 'object' && itemData?.term) {
                        const vocab = itemData as RecapDataItem;
                        li.innerHTML = `<i class="fas fa-book-open"></i> <strong>${currentPolyglotHelpers.sanitizeTextForDisplay(vocab.term!)}</strong>` +
                                    (vocab.translation ? `: ${currentPolyglotHelpers.sanitizeTextForDisplay(vocab.translation)}` : '') +
                                    (vocab.exampleSentence ? `<br><em class="recap-example">E.g.: "${currentPolyglotHelpers.sanitizeTextForDisplay(vocab.exampleSentence)}"</em>` : '');
                    } else if (itemType === 'improvementArea' && typeof itemData === 'object' && itemData?.areaType) {
                        const impr = itemData as RecapDataItem;
                        li.className = 'improvement-list-item';
                        li.innerHTML = `<div class="improvement-item"><div class="improvement-area-header"><i class="fas fa-pencil-alt"></i> <strong>${currentPolyglotHelpers.sanitizeTextForDisplay(impr.areaType!)}:</strong></div>` +
                                    (impr.userInputExample ? `<div class="recap-user-input">You said: "<em>${currentPolyglotHelpers.sanitizeTextForDisplay(impr.userInputExample)}</em>"</div>` : '') +
                                    (impr.coachSuggestion ? `<div class="recap-coach-suggestion">Suggestion: "<strong>${currentPolyglotHelpers.sanitizeTextForDisplay(impr.coachSuggestion)}</strong>"</div>` : '') +
                                    (impr.explanation ? `<div class="recap-explanation">Why: ${currentPolyglotHelpers.sanitizeTextForDisplay(impr.explanation)}</div>` : '') +
                                    (impr.exampleWithSuggestion ? `<div class="recap-example">Example: "<em>${currentPolyglotHelpers.sanitizeTextForDisplay(impr.exampleWithSuggestion)}</em>"</div>` : '') +
                                    `</div>`;
                    } else if (typeof itemData === 'string') { 
                        li.innerHTML = `<i class="fas fa-info-circle"></i> ${currentPolyglotHelpers.sanitizeTextForDisplay(itemData)}`;
                    } else { li.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Malformed`; }
                } catch { li.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error`; }
                ulEl.appendChild(li);
            });
        };

   

        const updateVirtualCallingScreen = (connector: Connector, sessionTypeAttempt: string): void => {
            const { domElements: currentDomElements, polyglotHelpers: currentPolyglotHelpers } = getDepsLocal();
            if (!currentDomElements || !currentPolyglotHelpers || !connector) return;
            (currentDomElements.callingAvatar as HTMLImageElement).src = connector.avatarModern || '/images/placeholder_avatar.png';
            (currentDomElements.callingName as HTMLElement).textContent = `Connecting to ${currentPolyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Partner')}...`;
            (currentDomElements.callingStatus as HTMLElement).textContent = `Attempting ${sessionTypeAttempt.replace('_modal', '')}... Ringing...`;
        };

        const appendToVoiceChatLog = (text: string, senderClass: string, options: ChatMessageOptions = {}): HTMLElement | null =>
            getDepsLocal().chatUiUpdater.appendChatMessage(getDepsLocal().domElements.directCallMainContent, text, senderClass, options);   const showImageInVoiceChat = (imageUrl: string | null): void => {
            const { domElements: currentDomElements } = getDepsLocal();
            showImageInActivityArea(currentDomElements.directCallActivityArea, currentDomElements.directCallActivityImageDisplay, currentDomElements.directCallMainContent, imageUrl);
        };

        const updateVoiceChatHeader = (connector: Connector): void => {
            const { domElements: currentDomElements, polyglotHelpers: currentPolyglotHelpers } = getDepsLocal();
            if (!currentDomElements || !currentPolyglotHelpers || !connector) return;
            (currentDomElements.directCallActiveAvatar as HTMLImageElement).src = connector.avatarModern || '/images/placeholder_avatar.png';
            (currentDomElements.directCallActiveName as HTMLElement).textContent = currentPolyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Partner');
        };

     

        const resetVoiceChatInput = (): void => { /* Placeholder */ };
        const updateVoiceChatTapToSpeakButton = (state: 'listening' | 'processing' | 'idle', text: string = ''): void => { /* Placeholder */ };
        
        const updateDirectCallHeader = (connector: Connector): void => {
            const { domElements: currentDomElements, polyglotHelpers: currentPolyglotHelpers } = getDepsLocal();
            if (!currentDomElements || !currentPolyglotHelpers || !connector) return;
            (currentDomElements.directCallActiveAvatar as HTMLImageElement).src = connector.avatarModern || '/images/placeholder_avatar.png';
            (currentDomElements.directCallActiveName as HTMLElement).textContent = currentPolyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Partner');
            const activityBtn = currentDomElements.directCallActivityBtn as HTMLButtonElement | null;
            if (activityBtn) {
                const isTutor = connector.languageRoles?.[connector.language]?.includes('tutor');
                activityBtn.style.display = isTutor && (connector.tutorMinigameImageFiles?.length ?? 0) > 0 ? 'inline-flex' : 'none';
            }
        };
        const updateDirectCallStatus = (statusText: string, isError: boolean = false): void => { 
            const { domElements } = getDepsLocal();
            if(domElements.directCallStatusIndicator) {
                domElements.directCallStatusIndicator.textContent = statusText;
                domElements.directCallStatusIndicator.classList.toggle('error', isError);
            }
        };
      
        const updateDirectCallMicButtonVisual = (isMuted: boolean): void => {
            const { domElements } = getDepsLocal();
            const micButton = domElements.directCallMuteBtn as HTMLButtonElement | null;
            if (micButton) {
                const icon = micButton.querySelector('i');
                if (isMuted) {
                    micButton.classList.remove('active'); 
                    micButton.classList.add('muted');    
                    micButton.title = "Microphone Off (Click to Unmute)";
                    if (icon) icon.className = 'fas fa-microphone-slash';
                } else {
                    micButton.classList.add('active');
                    micButton.classList.remove('muted');
                    micButton.title = "Microphone On (Click to Mute)";
                    if (icon) icon.className = 'fas fa-microphone';
                }
            }
        };
       
        const updateDirectCallSpeakerButtonVisual = (isMuted: boolean): void => {
            const { domElements } = getDepsLocal();
            const speakerButton = domElements.directCallSpeakerToggleBtn as HTMLButtonElement | null;
            if (speakerButton) {
                const icon = speakerButton.querySelector('i');
                if (isMuted) {
                    speakerButton.classList.remove('active');
                    speakerButton.classList.add('muted');
                    speakerButton.title = "Speaker Off (Click to Unmute)";
                    if (icon) icon.className = 'fas fa-volume-mute';
                } else {
                    speakerButton.classList.add('active');
                    speakerButton.classList.remove('muted');
                    speakerButton.title = "Speaker On (Click to Mute)";
                    if (icon) icon.className = 'fas fa-volume-up';
                }
            }
        };
     
        const showImageInDirectCall = (imageUrl: string | null): void => showImageInActivityArea(getDepsLocal().domElements.directCallActivityArea, getDepsLocal().domElements.directCallActivityImageDisplay, getDepsLocal().domElements.directCallMainContent, imageUrl);
      
        const clearDirectCallActivityArea = (): void => {
            const { domElements } = getDepsLocal();
            if(domElements.directCallActivityArea) domElements.directCallActivityArea.style.display = 'none';
            if(domElements.directCallActivityImageDisplay) (domElements.directCallActivityImageDisplay as HTMLImageElement).src = '';
        };

        const appendToMessageLogModal = (text: string, senderClass: string, options: ChatMessageOptions = {}): HTMLElement | null => {
            const { domElements: cd, polyglotConnectors: pc, chatUiUpdater } = getDepsLocal();
            let finalOptions = { ...options };
        
            if (!senderClass.includes('user') && !senderClass.includes('system')) {
                const connectorId = (cd.messagingInterface as HTMLElement)?.dataset.currentConnectorId;
                const connector = pc?.find(c => c.id === connectorId);
                if (connector) {
                    finalOptions = { ...finalOptions, avatarUrl: connector.avatarModern, senderName: connector.profileName, speakerId: connector.id, connectorId: connector.id };
                }
            }
            
            // Always call appendChatMessage.
            return chatUiUpdater.appendChatMessage(cd.messageChatLog, text, senderClass, finalOptions);
        };

        const showImageInMessageModal = (imageUrl: string | null): void => {
            if (imageUrl) {
                console.warn("UIU: showImageInMessageModal called. Images in message modal are typically handled by appendToMessageLogModal's options.imageUrl.");
            }
        };
       
        const updateMessageModalHeader = (connector: Connector): void => {
            const { domElements:cd, polyglotHelpers: ph } = getDepsLocal(); // Shorter aliases
            if (!cd || !ph || !connector) { console.error("UIU: updateMessageModalHeader - Missing deps or connector."); return; }
            if (cd.messageModalHeaderName) cd.messageModalHeaderName.textContent = ph.sanitizeTextForDisplay(connector.profileName || connector.name || "Chat");
            if (cd.messageModalHeaderDetails) {
                const age = connector.age && connector.age !== "N/A" ? `${connector.age} yrs` : '';
                const city = ph.sanitizeTextForDisplay(connector.city || '');
                const country = ph.sanitizeTextForDisplay(connector.country || '');
                cd.messageModalHeaderDetails.textContent = [city, country, age].filter(Boolean).join(' | ') || 'Details unavailable';
            }
            if (cd.messageModalHeaderAvatar) {
                const base = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
                const safeBase = base.endsWith('/') ? base : base + '/';
                const placeholder = `${safeBase}images/placeholder_avatar.png`;
                cd.messageModalHeaderAvatar.src = connector.avatarModern || placeholder;
                cd.messageModalHeaderAvatar.onerror = () => { if(cd.messageModalHeaderAvatar) cd.messageModalHeaderAvatar.src = placeholder; };
            }
            if (cd.messagingInterface) cd.messagingInterface.dataset.currentConnectorId = connector.id;
        };

        const resetMessageModalInput = (): void => {
            const { domElements: cd } = getDepsLocal();
            if (cd.messageTextInput) cd.messageTextInput.value = '';
            if (cd.messageSendBtn) cd.messageSendBtn.disabled = false;
        };

        const clearMessageModalLog = (): void => {
            const { domElements: cd, chatUiUpdater } = getDepsLocal();
            if (cd.messageChatLog) {
                cd.messageChatLog.innerHTML = '';
                chatUiUpdater.clearLogCache(cd.messageChatLog);
            }
        };
    // Replacement for appendToEmbeddedChatLog in: D:\polyglot_connect\src\js\ui\ui_updater.ts
    const appendToEmbeddedChatLog = (text: string, senderClass: string, options: ChatMessageOptions = {}): HTMLElement | null => {
        const { domElements: cd, polyglotConnectors: pc, chatUiUpdater } = getDepsLocal();
    
        // This function should NOT have complex routing logic. It just prepares the options.
        let finalOptions = { ...options };
    
        // If the message is from a connector, add their specific details for the UI.
        if (typeof senderClass === 'string' && !senderClass.includes('user') && !senderClass.includes('system')) {
            const connectorId = cd.embeddedChatContainer?.dataset.currentConnectorId;
            const connector = pc?.find(c => c.id === connectorId);
            if (connector) {
                finalOptions = {
                    ...finalOptions,
                    avatarUrl: connector.avatarModern,
                    senderName: connector.profileName,
                    speakerId: connector.id,
                    connectorId: connector.id
                };
            }
        }
        
        // Always call appendChatMessage and let IT decide how to render based on options.type.
        return chatUiUpdater.appendChatMessage(cd.embeddedChatLog, text, senderClass, finalOptions);
    };
    
        const showImageInEmbeddedChat = (imageUrl: string | null): void => {
            const { domElements: cd } = getDepsLocal();
            showImageInActivityArea(cd.appShell?.querySelector('#embedded-message-activity-area') as HTMLElement | null, cd.appShell?.querySelector('#embedded-message-activity-image-display') as HTMLImageElement | null, cd.embeddedChatLog, imageUrl);
        };
       
        const updateEmbeddedChatHeader = (connector: Connector): void => {
            const { domElements: cd, polyglotHelpers: ph } = getDepsLocal();
            if (!cd || !ph || !connector) { console.error("UIU: updateEmbeddedChatHeader - Missing deps or connector."); return; }

            if (cd.embeddedChatHeaderName) cd.embeddedChatHeaderName.textContent = ph.sanitizeTextForDisplay(connector.profileName || connector.name || "Chat");
            if (cd.embeddedChatHeaderDetails) {
                const age = connector.age && connector.age !== "N/A" ? `${connector.age} yrs` : '';
                const city = ph.sanitizeTextForDisplay(connector.city || '');
                const country = ph.sanitizeTextForDisplay(connector.country || '');
                cd.embeddedChatHeaderDetails.textContent = [city, country, age].filter(Boolean).join(' | ') || 'Details unavailable';
            }
            if (cd.embeddedChatHeaderAvatar) {
                const base = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
                const safeBase = base.endsWith('/') ? base : base + '/';
                const placeholder = `${safeBase}images/placeholder_avatar.png`;
                cd.embeddedChatHeaderAvatar.src = connector.avatarModern || placeholder;
                cd.embeddedChatHeaderAvatar.onerror = () => { if(cd.embeddedChatHeaderAvatar) cd.embeddedChatHeaderAvatar.src = placeholder; };
            }
            if (cd.embeddedChatContainer) {
                cd.embeddedChatContainer.dataset.currentConnectorId = connector.id;
            }
        };
        
        const clearEmbeddedChatInput = (): void => { 
            const { domElements: cd } = getDepsLocal();
            if(cd.embeddedMessageTextInput) cd.embeddedMessageTextInput.value = '';
        };
        const toggleEmbeddedSendButton = (enable: boolean): void => { 
            const { domElements: cd } = getDepsLocal();
            if(cd.embeddedMessageSendBtn) cd.embeddedMessageSendBtn.disabled = !enable;
        };
        const clearEmbeddedChatLog = (): void => {
            const { domElements: cd, chatUiUpdater } = getDepsLocal();
            if (cd.embeddedChatLog) {
                cd.embeddedChatLog.innerHTML = '<div class="log-is-loading" style="display: none;"></div>';
                chatUiUpdater.clearLogCache(cd.embeddedChatLog);
            }
        };
      // --- PASTE THE NEW FUNCTIONS HERE ---
const showLoadingInEmbeddedChatLog = (): void => {
    const { domElements } = getDepsLocal();
    if (domElements?.embeddedChatLog) {
        domElements.embeddedChatLog.innerHTML = `
            <div class="chat-log-loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading conversation...</p>
            </div>
        `;
    }
};

const showErrorInEmbeddedChatLog = (errorMessage: string): void => {
    const { domElements, polyglotHelpers } = getDepsLocal();
    if (domElements?.embeddedChatLog && polyglotHelpers) {
        const sanitizedMessage = polyglotHelpers.sanitizeTextForDisplay(errorMessage);
        domElements.embeddedChatLog.innerHTML = `
            <div class="chat-log-error-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${sanitizedMessage}</p>
            </div>
        `;
    }
};
      

const appendToGroupChatLog = (
    text: string,
    // This first string argument can now be 'system-warning', 'system-error',
    // or the actual senderName if it's a regular user/connector message.
    senderClassOrName: string,
    isUser: boolean, // Primarily for non-system messages
    speakerId: string, // Primarily for non-system messages
    options: ChatMessageOptions = {}
): HTMLElement | null => {
    const { domElements: cd, polyglotConnectors: pc, chatUiUpdater } = getDepsLocal();

    if (typeof senderClassOrName === 'string' && senderClassOrName.startsWith('system-')) {
        // It's a system message
        const logEl = cd.groupChatLogDiv;
        if (!logEl) {
            console.error("UIU.appendToGroupChatLog: groupChatLogDiv element not found for system message.");
            return null;
        }
        const isErrorType = senderClassOrName === 'system-error' || senderClassOrName === 'system-warning' || !!options.isError;
        return chatUiUpdater.appendSystemMessage(logEl, text, isErrorType, false /* isTimestamp */);
    } else {
        // It's a regular user or connector message
        const senderNameFromArg = senderClassOrName; // We now know it's the actual name
        const finalSenderClass = isUser ? 'user' : 'connector group-chat-connector';
        let finalOpts: ChatMessageOptions = {
            ...options,
            senderName: senderNameFromArg,
            showSenderName: !isUser, // Show name if it's a connector in the group
            speakerId,
            connectorId: speakerId, // speakerId is the connectorId in group context
            timestamp: options.timestamp || Date.now()
        };

        if (!isUser) { // If it's a connector message, get their avatar
            const speakerConnector = pc?.find(c => c.id === speakerId);
            if (speakerConnector) {
                finalOpts.avatarUrl = speakerConnector.avatarModern;
            } else {
                // Fallback avatar if connector not found (shouldn't happen ideally)
                const placeholderBase = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
                finalOpts.avatarUrl = `${placeholderBase}images/placeholder_avatar.png`;
            }
        }
        return chatUiUpdater.appendChatMessage(cd.groupChatLogDiv, text, finalSenderClass, finalOpts);
    }
};
        const updateGroupChatHeader = (groupName: string, members: Connector[]): void => {
            const { domElements: cd, polyglotHelpers: ph } = getDepsLocal();
            const MAX_DISPLAY_AVATARS = 5;
            if (!cd || !ph) {
                console.error("UIU: updateGroupChatHeader - Missing domElements or polyglotHelpers.");
                return;
            }

            if (cd.activeGroupNameHeader) {
                cd.activeGroupNameHeader.textContent = ph.sanitizeTextForDisplay(groupName);
            }

            if (cd.groupChatMembersAvatarsDiv) {
                cd.groupChatMembersAvatarsDiv.innerHTML = '';
                if (members && members.length > 0) {
                    members.slice(0, MAX_DISPLAY_AVATARS).forEach(member => {
                        const avatarImg = document.createElement('img');
                        const baseUrl = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
                        const safeBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
                        
                        avatarImg.src = member.avatarModern || `${safeBaseUrl}images/placeholder_avatar.png`;
                        avatarImg.alt = ph.sanitizeTextForDisplay(member.profileName || 'Member');
                        avatarImg.title = ph.sanitizeTextForDisplay(member.profileName || 'Member');
                        avatarImg.classList.add('group-member-avatar-small', 'clickable-group-header-avatar');
                        avatarImg.onerror = () => { avatarImg.src = `${safeBaseUrl}images/placeholder_avatar.png`; };
                        avatarImg.dataset.connectorId = member.id;
                        cd.groupChatMembersAvatarsDiv?.appendChild(avatarImg);
                    });
                    if (members.length > MAX_DISPLAY_AVATARS) {
                        const moreCountSpan = document.createElement('span');
                        moreCountSpan.classList.add('group-member-avatar-more');
                        moreCountSpan.textContent = `+${members.length - MAX_DISPLAY_AVATARS}`;
                        moreCountSpan.title = `${members.length - MAX_DISPLAY_AVATARS} more members`;
                        cd.groupChatMembersAvatarsDiv?.appendChild(moreCountSpan);
                    }
                }
            }
        };
        
  
      
      
      
      
      
      
        const clearGroupChatInput = (): void => { /* Placeholder */ };
     
        const clearGroupChatLog = (): void => { 
            const { domElements: cd, chatUiUpdater } = getDepsLocal();
            if(cd.groupChatLogDiv) {
                cd.groupChatLogDiv.innerHTML = '';
                chatUiUpdater.clearLogCache(cd.groupChatLogDiv);
            }
        };

    // D:\polyglot_connect\src\js\ui\ui_updater.ts

const populateRecapModal = (recapData: RecapData | null): void => {
    const { domElements: cd, polyglotHelpers: ph } = getDepsLocal();
    
    const setText = (el: HTMLElement | null, textVal: string | undefined | null, def = "N/A") => {
        // Null check for 'el' is already correctly inside setText
        if (el) el.textContent = ph.sanitizeTextForDisplay(textVal || def);
    };
    const safePopulateList = (ul: HTMLUListElement | null, items: Array<string | RecapDataItem> | null | undefined, type: 'simple' | 'vocabulary' | 'improvementArea') => {
        if (ul) populateListInRecap(ul, items, type);
    };
    
    if (!ph) { // Only need polyglotHelpers if we proceed further
        console.error("UIU: populateRecapModal - Missing polyglotHelpers.");
        return;
    }
    // No need to check cd.sessionRecapScreen here, as individual elements are checked below

    console.log("[UIU_RECAP_DOM_CHECK] recapData received:", JSON.parse(JSON.stringify(recapData || {})));
    console.log("[UIU_RECAP_DOM_CHECK] cd.recapDate element:", cd.recapDate);
    console.log("[UIU_RECAP_DOM_CHECK] cd.recapDuration element:", cd.recapDuration);
    console.log("[UIU_RECAP_DOM_CHECK] cd.recapConnectorName element:", cd.recapConnectorName);


    if (!recapData) {
        console.warn("UIU: populateRecapModal called with null recapData. Displaying 'unavailable'.");
        // Null checks for each DOM element before setting textContent
        if (cd.recapConnectorName) cd.recapConnectorName.textContent = 'Call Debrief';
        setText(cd.recapDate ?? null, null, 'Date Unavailable');
        setText(cd.recapDuration ?? null, null, 'Duration Unavailable');
        setText(cd.recapConversationSummaryText ?? null, 'Recap data is unavailable.', 'Recap data is unavailable.');
        safePopulateList(cd.recapTopicsList ?? null, [], 'simple');
        safePopulateList(cd.recapGoodUsageList ?? null, [], 'simple');
        safePopulateList(cd.recapVocabularyList ?? null, [], 'vocabulary');
        safePopulateList(cd.recapFocusAreasList ?? null, [], 'improvementArea');
        safePopulateList(cd.recapPracticeActivitiesList ?? null, [], 'simple');
        setText(cd.recapOverallEncouragementText ?? null, '', '');
        if (cd.sessionRecapScreen) delete (cd.sessionRecapScreen as HTMLElement).dataset.sessionIdForDownload;
        return;
    }

    // If recapData IS available:
    try {
        if (cd.recapConnectorName) {
            cd.recapConnectorName.textContent = `With ${ph.sanitizeTextForDisplay(recapData.connectorName || 'Partner')}`;
            console.log(`[UIU_RECAP_POPULATE] Set recapConnectorName to: ${cd.recapConnectorName.textContent}`);
        } else {
            console.warn("[UIU_RECAP_POPULATE] cd.recapConnectorName element is null.");
        }
        
        // --- START OF TIMESTAMP FIX ---
        let displayDateTime = 'Date/Time Not Specified';
        if (recapData.startTimeISO) {
            try {
                const startDate = new Date(recapData.startTimeISO);
                // Format to "MM/DD/YYYY, HH:MM AM/PM" (locale-dependent)
                displayDateTime = startDate.toLocaleString([], { 
                    year: 'numeric', month: 'numeric', day: 'numeric', 
                    hour: 'numeric', minute: '2-digit' 
                });
            } catch (e) {
                console.error("Error formatting startTimeISO for display:", e);
                displayDateTime = recapData.date || 'Date/Time Invalid'; // Fallback to existing date if ISO parse fails
            }
        } else if (recapData.date) { // Fallback if only old 'date' field is present
            displayDateTime = recapData.date;
        }
        setText(cd.recapDate ?? null, displayDateTime, 'Date/Time Not Specified');
        // --- END OF TIMESTAMP FIX ---
        if (cd.recapDate) console.log(`[UIU_RECAP_POPULATE] Set recapDate to: ${cd.recapDate.textContent} (from data.startTimeISO: ${recapData.startTimeISO}, or data.date: ${recapData.date})`);
        else console.warn("[UIU_RECAP_POPULATE] cd.recapDate element is null.");
        
        setText(cd.recapDuration ?? null, recapData.duration, 'Duration N/A');
        if (cd.recapDuration) console.log(`[UIU_RECAP_POPULATE] Set recapDuration to: ${cd.recapDuration.textContent} (from data: ${recapData.duration})`);
        else console.warn("[UIU_RECAP_POPULATE] cd.recapDuration element is null.");
        
        setText(cd.recapConversationSummaryText ?? null, recapData.conversationSummary, "No summary provided.");
        safePopulateList(cd.recapTopicsList ?? null, recapData.keyTopicsDiscussed, 'simple');
        safePopulateList(cd.recapGoodUsageList ?? null, recapData.goodUsageHighlights, 'simple');
        safePopulateList(cd.recapVocabularyList ?? null, recapData.newVocabularyAndPhrases, 'vocabulary');
        safePopulateList(cd.recapFocusAreasList ?? null, recapData.areasForImprovement, 'improvementArea');
        safePopulateList(cd.recapPracticeActivitiesList ?? null, recapData.suggestedPracticeActivities, 'simple');
        setText(cd.recapOverallEncouragementText ?? null, recapData.overallEncouragement, "Keep practicing!");
        
        if (cd.sessionRecapScreen) (cd.sessionRecapScreen as HTMLElement).dataset.sessionIdForDownload = recapData.sessionId || '';
    } catch (e: any) { 
        console.error("Error populating recap modal sections:", e);
        if (cd.recapConversationSummaryText) {
            setText(cd.recapConversationSummaryText, 'Error displaying recap details.');
        }
    }
};

        const displaySummaryInView = (sessionData: SessionData | null): void => {
            const { domElements: cd, polyglotHelpers: ph, sessionManager: sm } = getDepsLocal();
            if (!cd.summaryViewContent || !cd.summaryTabHeader || !cd.summaryPlaceholder || !ph) return;
            if (!sessionData?.sessionId) { /* ... */ return; }
            const downloadBtn = document.getElementById('summary-view-download-btn') as HTMLButtonElement | null; 
            if (downloadBtn && sm?.downloadTranscriptForSession) {
                const newBtn = downloadBtn.cloneNode(true) as HTMLButtonElement;
                downloadBtn.parentNode?.replaceChild(newBtn, downloadBtn);
                newBtn.addEventListener('click', () => sm.downloadTranscriptForSession!(sessionData.sessionId!));
            }
        };
        const updateTTSToggleButtonVisual = (buttonElement: HTMLElement | null, isMuted: boolean): void => { /* Placeholder */ };
        const updateSendPhotoButtonVisibility = (connector: Connector | null, buttonElement: HTMLElement | null): void => { /* Placeholder */ };
        
        const showProcessingSpinner = (logElement: HTMLElement, messageId: string | null = null): HTMLElement | null => { 
            const spinner = document.createElement('div'); 
            spinner.className = 'chat-message-wrapper connector-wrapper is-thinking-wrapper';
            if (messageId) spinner.dataset.messageId = messageId;
            spinner.innerHTML = `<div class="chat-message-ui connector connector-thinking"><span>...</span></div>`;
            logElement.appendChild(spinner);
            scrollChatLogToBottom(logElement);
            return spinner;
        };
        const removeProcessingSpinner = (logElement: HTMLElement, messageId: string | null = null): void => {
            const selector = messageId ? `.is-thinking-wrapper[data-message-id="${messageId}"]` : '.is-thinking-wrapper';
            const spinner = logElement.querySelector(selector);
            if (spinner) spinner.remove();
        };

        console.log("ui/ui_updater.ts: IIFE for actual methods finished, returning all methods.");
      
      
      
      // ======================= NEW DEBUGGING LOGS =======================
      console.log(`%c[UI_UPDATER_DEBUG] Final check before returning methods:`, 'color: #fd7e14; font-weight: bold;');
      console.log(`  - typeof appendToEmbeddedChatLog:`, typeof appendToEmbeddedChatLog);
      console.log(`  - typeof appendToMessageLogModal:`, typeof appendToMessageLogModal);
      // ======================= END DEBUGGING LOGS =======================
      
      // PASTE THESE NEW FUNCTIONS inside your ui_updater.ts IIFE

      
      
    // =================== REPLACE THE OLD RETURN BLOCK WITH THIS ===================
    return {
        updateVirtualCallingScreen, 
        appendToVoiceChatLog, 
        showImageInVoiceChat, 
        updateVoiceChatHeader,
        clearVoiceChatLog, 
        resetVoiceChatInput, 
        updateVoiceChatTapToSpeakButton, 
        updateDirectCallHeader,
        updateDirectCallStatus, 
        updateDirectCallMicButtonVisual, 
        updateDirectCallSpeakerButtonVisual,
        showImageInDirectCall, 
        clearDirectCallActivityArea, 
        appendToMessageLogModal, 
        showImageInMessageModal,
        updateMessageModalHeader, 
        resetMessageModalInput, 
        clearMessageModalLog, 
        appendToEmbeddedChatLog,
        showImageInEmbeddedChat, 
        updateEmbeddedChatHeader, 
        clearEmbeddedChatInput, 
        toggleEmbeddedSendButton,
        clearEmbeddedChatLog, 
        appendToGroupChatLog, 
        updateGroupChatHeader,
        clearGroupChatInput, 
        clearGroupChatLog, 
        populateRecapModal, 
        displaySummaryInView,
        updateTTSToggleButtonVisual, 
        updateSendPhotoButtonVisibility, 
        showProcessingSpinner,
        removeProcessingSpinner, 
        appendSystemMessage,
        scrollEmbeddedChatToBottom, 
        scrollMessageModalToBottom,
        showLoadingInEmbeddedChatLog,
        showErrorInEmbeddedChatLog,
     
    };
// ============================================================================

    } catch (e: any) {
        console.error("CRITICAL ERROR INSIDE UiUpdater IIFE:", e.message, e.stack);
        const dummyReturn: UiUpdaterModule = {
            updateVirtualCallingScreen: () => { }, appendToVoiceChatLog: () => null, showImageInVoiceChat: () => { },
            updateVoiceChatHeader: () => { }, clearVoiceChatLog: () => { }, resetVoiceChatInput: () => { },
            updateVoiceChatTapToSpeakButton: () => { }, updateDirectCallHeader: () => { }, updateDirectCallStatus: () => { },
            updateDirectCallMicButtonVisual: () => { }, updateDirectCallSpeakerButtonVisual: () => { },
            showImageInDirectCall: () => { }, clearDirectCallActivityArea: () => { }, appendToMessageLogModal: () => null,
            showImageInMessageModal: () => { }, updateMessageModalHeader: () => { }, resetMessageModalInput: () => { },
            clearMessageModalLog: () => { }, appendToEmbeddedChatLog: () => null, showImageInEmbeddedChat: () => { },
            updateEmbeddedChatHeader: () => { }, clearEmbeddedChatInput: () => { }, toggleEmbeddedSendButton: () => { },
            clearEmbeddedChatLog: () => { }, appendToGroupChatLog: () => null, updateGroupChatHeader: () => { },
            clearGroupChatInput: () => { }, clearGroupChatLog: () => { },
            populateRecapModal: () => { }, displaySummaryInView: () => { }, updateTTSToggleButtonVisual: () => { },
            updateSendPhotoButtonVisibility: () => { }, showProcessingSpinner: () => null, removeProcessingSpinner: () => { },
            appendSystemMessage: () => null, scrollEmbeddedChatToBottom: () => { }, scrollMessageModalToBottom: () => { },
            showLoadingInEmbeddedChatLog: function (): void {
                throw new Error('Function not implemented.');
            },
            showErrorInEmbeddedChatLog: function (errorMessage: string): void {
                throw new Error('Function not implemented.');
            }
        };
        return dummyReturn;
    }
})();

    // Assign the real methods to the existing placeholder object on window
    if (window.uiUpdater) { // The placeholder should exist
        Object.assign(window.uiUpdater, methods);
        console.log("ui_updater.ts: SUCCESSFULLY populated window.uiUpdater with real methods.");
   
   
        document.dispatchEvent(new CustomEvent('uiUpdaterReady'));
        console.log('ui_updater.ts: "uiUpdaterReady" (FUNCTIONAL) event dispatched.');
   
   
    } else {
        console.error("ui_updater.ts: CRITICAL ERROR - window.uiUpdater placeholder was unexpectedly missing...");
        window.uiUpdater = methods; // Assign anyway
        document.dispatchEvent(new CustomEvent('uiUpdaterReady')); // Dispatch even on error but after assignment
        console.warn('ui_updater.ts: "uiUpdaterReady" (FUNCTIONAL, after error) event dispatched.');
    }
    // The original 'uiUpdaterReady' (structural) was already dispatched.

} // End of initializeActualUiUpdater

// ui_updater.ts - at the bottom in the dependency checking section

// REPLACE THESE TWO BLOCKS at the bottom of the file
const dependenciesForUiUpdater = ['domElementsReady', 'polyglotHelpersReady', 'polyglotDataReady', 'groupManagerReady', 'chatUiUpdaterReady'];
let uiUpdaterDepsMetCount = 0;
const uiUpdaterMetDependenciesLog: { [key: string]: boolean } = {
    'domElementsReady': false,
    'polyglotHelpersReady': false,
    'polyglotDataReady': false,
    'groupManagerReady': false,
    'chatUiUpdaterReady': false
};

function checkAndInitUiUpdater(receivedEventName?: string) {
    if (receivedEventName) { // This block is specifically for when an event listener triggers this function
        console.log(`UI_UPDATER_EVENT: Listener for '${receivedEventName}' was triggered.`);
        if (!uiUpdaterMetDependenciesLog[receivedEventName]) {
            uiUpdaterMetDependenciesLog[receivedEventName] = true;
            uiUpdaterDepsMetCount++;
            console.log(`UI_UPDATER_DEPS: Event '${receivedEventName}' processed. Count updated.`);
        } else {
            // console.log(`UI_UPDATER_EVENT: Event '${receivedEventName}' was already logged as met (likely from pre-check). Count remains.`);
        }
    }
    // If called from pre-check (receivedEventName is undefined), the count is handled directly in the pre-check loop.

    console.log(`UI_UPDATER_DEPS: Current count is ${uiUpdaterDepsMetCount} / ${dependenciesForUiUpdater.length}. Met status:`, JSON.stringify(uiUpdaterMetDependenciesLog));

   if (uiUpdaterDepsMetCount === dependenciesForUiUpdater.length) {
    console.log('ui_updater.ts: All dependency events received for UiUpdater. Calling initializeActualUiUpdater directly.');
    initializeActualUiUpdater(); // Call directly
    // ...
}
}
// --- Initial Pre-Check and Listener Setup for UI_UPDATER ---
console.log('UI_UPDATER_SETUP: Starting initial dependency pre-check.');
uiUpdaterDepsMetCount = 0;
// Reset metDependenciesLog
Object.keys(uiUpdaterMetDependenciesLog).forEach(k => uiUpdaterMetDependenciesLog[k] = false);


let uiUpdaterAllPreloadedAndVerified = true;
dependenciesForUiUpdater.forEach(eventName => {
    let isReadyNow = false;
    let isVerifiedNow = false; // Using a more detailed verification for pre-check

    switch (eventName) {
        case 'domElementsReady':
            isReadyNow = !!window.domElements;
            isVerifiedNow = isReadyNow; // Basic existence is usually fine
            break;
        case 'polyglotHelpersReady':
            isReadyNow = !!window.polyglotHelpers;
            isVerifiedNow = !!(isReadyNow && typeof window.polyglotHelpers?.sanitizeTextForDisplay === 'function');
            break;
        case 'polyglotDataReady':
            isReadyNow = !!window.polyglotConnectors;
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotConnectors));
            break;
        case 'groupManagerReady':
            isReadyNow = !!window.groupManager;
            isVerifiedNow = !!(isReadyNow && typeof window.groupManager?.initialize === 'function');
            break;
        case 'chatUiUpdaterReady':
            isReadyNow = !!window.chatUiUpdater;
            isVerifiedNow = !!(isReadyNow && typeof window.chatUiUpdater?.initialize === 'function');
            break;
      
        default:
            console.warn(`UI_UPDATER_PRECHECK: Unknown dependency event name: ${eventName}`);
    }

    console.log(`UI_UPDATER_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);

    if (isVerifiedNow) {
        console.log(`ui_updater.ts: Pre-check: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!uiUpdaterMetDependenciesLog[eventName]) { // Ensure we only count it once
            uiUpdaterMetDependenciesLog[eventName] = true;
            uiUpdaterDepsMetCount++;
        }
    } else {
        uiUpdaterAllPreloadedAndVerified = false;
        const specificEventNameToListenFor = eventName; // Capture current eventName for the closure
        console.log(`ui_updater.ts: Pre-check: Dependency '${specificEventNameToListenFor}' not ready or verified. Adding listener.`);
        document.addEventListener(specificEventNameToListenFor, function eventHandlerCallback() {
            // 'this' would be 'document' here, 'specificEventNameToListenFor' is from closure
            checkAndInitUiUpdater(specificEventNameToListenFor);
        }, { once: true });
    }
});

console.log(`UI_UPDATER_SETUP: Initial pre-check dep count: ${uiUpdaterDepsMetCount} / ${dependenciesForUiUpdater.length}. Met:`, JSON.stringify(uiUpdaterMetDependenciesLog));

if (uiUpdaterAllPreloadedAndVerified && uiUpdaterDepsMetCount === dependenciesForUiUpdater.length) {
    console.log('ui_updater.ts: All dependencies ALREADY MET during pre-check. Initializing directly.');
    initializeActualUiUpdater(); // THIS IS ALREADY A DIRECT CALL in the version you sent - GOOD!
} else if (uiUpdaterDepsMetCount > 0 && uiUpdaterDepsMetCount < dependenciesForUiUpdater.length) {
    // console.log(`ui_updater.ts: Some dependencies pre-verified, waiting for events.`);
} else if (uiUpdaterDepsMetCount === 0) {
    // console.log('ui_updater.ts: No dependencies pre-verified. Waiting for all events.');
}

function getDeps(): { domElements: any; } {
    throw new Error('Function not implemented.');
}
