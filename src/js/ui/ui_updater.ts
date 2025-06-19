// D:\polyglot_connect\src\js\ui\ui_updater.ts

import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    Connector,
    ChatMessageOptions, // Ensure this is well-defined and exported in global.d.ts
    RecapData,          // Ensure this is well-defined and exported in global.d.ts
    RecapDataItem,      // Ensure this is well-defined and exported in global.d.ts
    SessionData,        // Ensure this is well-defined and exported in global.d.ts
    GroupManager,       // Ensure this is well-defined and exported in global.d.ts
    SessionManager      // Ensure this is well-defined and exported in global.d.ts
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
    scrollMessageModalToBottom: () => console.warn("UIU structural: scrollMessageModalToBottom called before full init.")
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
}

function initializeActualUiUpdater(): void {
    console.log('ui_updater.ts: initializeActualUiUpdater() for FULL method population called.');

    // Define getSafeFunctionalDeps here or ensure it's accessible
    const getSafeFunctionalDeps = (): {
        domElements: YourDomElements,
        polyglotHelpers: PolyglotHelpers,
        polyglotConnectors: Connector[] | undefined, // Optional based on usage
        groupManager: GroupManager | undefined,    // Optional
        sessionManager: SessionManager | undefined   // Optional
    } | null => {
        const deps = {
            domElements: window.domElements as YourDomElements | undefined,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers | undefined,
            polyglotConnectors: window.polyglotConnectors as Connector[] | undefined,
            groupManager: window.groupManager as GroupManager | undefined,
            sessionManager: window.sessionManager as SessionManager | undefined
        };
        let allPresent = true;
        // Check for essential ones (domElements, polyglotHelpers)
        if (!deps.domElements || !deps.polyglotHelpers) {
            console.error(`UiUpdater (Full Init): Missing essential domElements or polyglotHelpers.`);
            allPresent = false;
        }
        // Log missing optional ones if they are actually needed by any method
        // For example: if (!deps.groupManager) console.warn("UiUpdater (Full Init): groupManager is undefined, some methods might be affected.");
        return allPresent ? deps as { domElements: YourDomElements, polyglotHelpers: PolyglotHelpers, polyglotConnectors: Connector[] | undefined, groupManager: GroupManager | undefined, sessionManager: SessionManager | undefined } : null;
    };
    
    const functionalDeps = getSafeFunctionalDeps();

    if (!functionalDeps) {
        console.error("ui_updater.ts: CRITICAL - Functional dependencies (domElements, polyglotHelpers) not ready for full UiUpdater setup. Methods will remain placeholders.");
        // The structural 'uiUpdaterReady' was already dispatched.
        // No need to dispatch another 'uiUpdaterReady' or a failed one here if placeholder exists.
        return;
    }
    console.log('ui_updater.ts: Functional dependencies for full method population appear ready.');

    // Destructure essential deps, others can be fetched via getDeps() inside methods if preferred
    const { domElements, polyglotHelpers } = functionalDeps;

  // D:\polyglot_connect\src\js\ui\ui_updater.ts

// This is inside initializeActualUiUpdater, replacing the original 'methods' IIFE
const methods = ((): UiUpdaterModule => {
    'use strict';
    console.log("ui_updater.ts: IIFE for actual methods STARTING.");
    // Map to track the last displayed timestamp for each chat log
    const lastDisplayedTimestamps: Map<HTMLElement, Date> = new Map();
    // Map to track the last speaker's ID for each chat log to handle consecutive messages
    const lastSpeakerPerLog: Map<HTMLElement, string> = new Map();
    const TIME_DIFFERENCE_THRESHOLD_MINUTES = 30; // Display new time if more than 30 mins passed

    try { // <<< WRAP THE ENTIRE IIFE CONTENT
        const getDepsLocal = () => {
            return {
                domElements: window.domElements as YourDomElements,
                polyglotHelpers: window.polyglotHelpers as PolyglotHelpers,
                polyglotConnectors: window.polyglotConnectors as Connector[] | undefined,
                groupManager: window.groupManager as GroupManager | undefined,
                sessionManager: window.sessionManager as SessionManager | undefined
            };
        };

      // D:\polyglot_connect\src\js\ui\ui_updater.ts
// Inside the initializeActualUiUpdater -> const methods = ((): UiUpdaterModule => { ... })();



// PASTE THIS NEW FUNCTION:
// REPLACE WITH THIS LINE (this is the correct version):
// D:\polyglot_connect\src\js\ui\ui_updater.ts
// Inside the initializeActualUiUpdater -> const methods = ((): UiUpdaterModule => { ... })();



// PASTE THIS NEW FUNCTION:
// REPLACE WITH THIS LINE (this is the correct version):
function appendSystemMessage(logEl: HTMLElement | null, text: string, isError: boolean = false, isTimestamp: boolean = false): HTMLElement | null {
    if (!logEl) return null;

    const messageWrapper = document.createElement('div');
    const messageDiv = document.createElement('div');

    if (isTimestamp) {
        messageWrapper.classList.add('system-event-wrapper');
        messageDiv.classList.add('chat-session-timestamp');
        messageDiv.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else {
        messageWrapper.classList.add('system-message-wrapper');
        messageDiv.classList.add('system-message');
        if (isError) messageDiv.classList.add('error-message-bubble');
        messageDiv.textContent = text;
    }

    messageWrapper.appendChild(messageDiv);
    logEl.appendChild(messageWrapper);
    scrollChatLogToBottom(logEl);
    return messageWrapper;
}



function appendChatMessage(
    logElement: HTMLElement | null,
    text: string, // For voice memos, this might be empty if player is primary, or transcript
    senderClass: string,
    options: ChatMessageOptions = {}
): HTMLElement | null {
    const { polyglotHelpers: currentPolyglotHelpers, domElements: currentDomElements } = getDepsLocal();

    if (!logElement || !currentPolyglotHelpers) {
        console.error("UIU_appendChatMessage: logElement or polyglotHelpers missing. LogEl:", logElement, "Helpers:", !!currentPolyglotHelpers);
        return null;
    }
    
    const scrollThreshold = 50; // A 50px buffer is good practice
    const isScrolledToBottom = logElement.scrollHeight - logElement.clientHeight <= logElement.scrollTop + scrollThreshold;



    const manualPlaceholder = logElement.querySelector('.chat-log-empty-placeholder, .log-is-loading');
    if (manualPlaceholder) {
        // If it exists, this must be the first message. Clear the log before proceeding.
        logElement.innerHTML = '';
    }

   // REPLACE WITH THIS BLOCK:
// =================== START: REPLACE WITH THIS BLOCK (in ui_updater.ts) ===================
   // REPLACE WITH THIS BLOCK:
// =================== START: REPLACE WITH THIS BLOCK (in ui_updater.ts) ===================
const messageTimestamp = options.timestamp ? new Date(options.timestamp) : new Date();
let lastDisplayedDate = lastDisplayedTimestamps.get(logElement);
let shouldDisplayTimestamp = false;

// Check if this is the very first message being added to a completely empty log.
const isFirstMessageInLog = logElement.children.length === 0;

if (isFirstMessageInLog) {
    // FIX: Always show a timestamp for the very first message.
    shouldDisplayTimestamp = true;
} else if (lastDisplayedDate) {
    // This is a subsequent message, check the time difference from the last displayed timestamp.
    const timeDiffMinutes = (messageTimestamp.getTime() - lastDisplayedDate.getTime()) / (1000 * 60);
    if (messageTimestamp.toDateString() !== lastDisplayedDate.toDateString() ||
        timeDiffMinutes > TIME_DIFFERENCE_THRESHOLD_MINUTES) {
        shouldDisplayTimestamp = true;
    }
} else if (!lastDisplayedDate) {
    // This case handles when the log has content (from history), but no timestamp has been shown yet in this session.
    shouldDisplayTimestamp = true;
}
// ===================  END: REPLACE WITH THIS BLOCK (in ui_updater.ts)  ===================

    if (shouldDisplayTimestamp &&
        options.type !== 'call_event' && // Don't show for call events if they have their own time
        senderClass !== 'system-call-event' && // Same as above
        !senderClass.includes('system-message')) { // Don't show for generic system messages if they are too frequent

        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('chat-session-timestamp');

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDateOnly = new Date(messageTimestamp.getFullYear(), messageTimestamp.getMonth(), messageTimestamp.getDate());
        let formattedSessionTimestampStr = "";
        const timePart = messageTimestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        if (messageDateOnly.getTime() === todayStart.getTime()) {
            formattedSessionTimestampStr = timePart;
        } else {
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(todayStart.getDate() - 1);
            if (messageDateOnly.getTime() === yesterdayStart.getTime()) {
                formattedSessionTimestampStr = `Yesterday, ${timePart}`;
            } else {
                const sevenDaysAgoStart = new Date(todayStart);
                sevenDaysAgoStart.setDate(todayStart.getDate() - 7);
                if (messageTimestamp.getTime() > sevenDaysAgoStart.getTime() && messageTimestamp.getFullYear() === now.getFullYear()) {
                    const dayOfWeek = messageTimestamp.toLocaleDateString([], { weekday: 'long' });
                    formattedSessionTimestampStr = `${dayOfWeek}, ${timePart}`;
                } else {
                    const day = messageTimestamp.getDate();
                    const month = messageTimestamp.toLocaleDateString([], { month: 'long' });
                    const year = messageTimestamp.getFullYear();
                    formattedSessionTimestampStr = `${month} ${day}, ${year}, ${timePart}`;
                }
            }
        }
        timestampDiv.textContent = formattedSessionTimestampStr;
        logElement.appendChild(timestampDiv);
        lastDisplayedTimestamps.set(logElement, messageTimestamp);
    }
    
    // --- START: Consecutive Message Logic ---
    const messageWrapper = document.createElement('div');
    const currentSpeakerId = options.speakerId || options.connectorId;
    
    if (shouldDisplayTimestamp) {
        // A timestamp breaks the sequence, so the next message is treated as a new one.
        lastSpeakerPerLog.delete(logElement);
    } else {
        const lastSpeakerId = lastSpeakerPerLog.get(logElement);
    
        // Check if the current message is a consecutive one from the same non-user speaker.
        if (currentSpeakerId && lastSpeakerId === currentSpeakerId && !options.isThinking && !senderClass.includes('user')) {
            // It's a consecutive message, so add the class to hide the name.
            messageWrapper.classList.add('is-consecutive');
    
            // Find the PREVIOUS message wrapper from this speaker to remove its avatar.
            // This makes the avatar "move" to the newest message in the sequence.
            const previousMessageWrapper = logElement.querySelector(`:scope > .chat-message-wrapper[data-speaker-id="${currentSpeakerId}"]:last-child`);
            
            if (previousMessageWrapper) {
                const previousAvatar = previousMessageWrapper.querySelector('.chat-bubble-avatar');
                if (previousAvatar) {
                    previousAvatar.remove();
                    previousMessageWrapper.classList.remove('has-avatar-left');
                }
            }
        }
    }
    // --- END: Consecutive Message Logic ---

    const messageDiv = document.createElement('div'); // This will hold the primary content bubble

    if (options.messageId) messageWrapper.dataset.messageId = options.messageId;
    messageWrapper.title = messageTimestamp.toLocaleString([], {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit'
    });

    // Set speaker ID on the wrapper for the *next* message to check against.
    if (currentSpeakerId) {
        messageWrapper.dataset.speakerId = currentSpeakerId;
    }

    // --- BRANCH FOR DIFFERENT MESSAGE TYPES ---

    if (options.type === 'call_event' || senderClass === 'system-call-event') {
        // --- CALL EVENT RENDERING ---
        messageWrapper.classList.add('system-event-wrapper');
        messageDiv.classList.add('call-event-message');

        let eventIconHtml = '';
        let callActionHtml = '';
        let eventMainText = currentPolyglotHelpers.sanitizeTextForDisplay(text || "Call event occurred.");
        let eventDetailsHtml = '';

        switch (options.eventType) {
            case 'call_started':
                eventIconHtml = '<i class="fas fa-phone-alt call-event-icon call-started"></i> ';
                break;
            case 'call_ended':
                eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-ended"></i> ';
                const sid = options.callSessionId || '';
                callActionHtml = `
                    <button class="call-event-action-btn" data-action="call_back" data-connector-id="${options.connectorIdForButton || ''}" data-session-id="${sid}">CALL BACK</button>
                    <button class="call-event-action-btn summary-btn" data-action="view_summary" data-session-id="${sid}">VIEW SUMMARY</button>`;
                break;
            case 'call_failed_user_attempt':
                eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> ';
                callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorIdForButton || ''}">CALL AGAIN</button>`;
                break;
            case 'call_missed_connector':
                eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> ';
                eventMainText = `${options.connectorNameForDisplay || options.connectorName || 'Partner'} missed your call.`;
                callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorIdForButton || ''}">CALL AGAIN</button>`;
                break;
        }

        if (options.duration) eventDetailsHtml += `<span class="call-event-detail duration"><i class="far fa-clock"></i> ${currentPolyglotHelpers.sanitizeTextForDisplay(options.duration)}</span>`;
        const eventTime = options.timestamp ? new Date(options.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        if (eventDetailsHtml && eventTime) eventDetailsHtml += ' | ';
        if (eventTime) eventDetailsHtml += `<span class="call-event-detail time">${eventTime}</span>`;

        messageDiv.innerHTML = `<div class="call-event-main-text">${eventIconHtml}${eventMainText}</div><div class="call-event-details-container">${eventDetailsHtml}</div>${callActionHtml ? `<div class="call-event-actions">${callActionHtml}</div>` : ''}`;
        messageWrapper.appendChild(messageDiv);

    } else if (options.isVoiceMemo && options.audioSrc) {
        // --- VOICE MEMO RENDERING (USER OR CONNECTOR) WITH WAVESURFER ---
        messageWrapper.classList.add('chat-message-wrapper');
        messageDiv.classList.add('chat-message-ui', 'voice-memo-message'); // Bubble
    
        let avatarHtml = '';
        if (senderClass.includes('user')) {
            messageWrapper.classList.add('user-wrapper');
            messageDiv.classList.add('user');
        } else { // Connector
            messageWrapper.classList.add('connector-wrapper');
            messageDiv.classList.add('connector');
            const placeholderBase = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
            const safePlaceholderBase = placeholderBase.endsWith('/') ? placeholderBase : placeholderBase + '/';
            const placeholderAvatarSrc = `${safePlaceholderBase}images/placeholder_avatar.png`;
            if (options.avatarUrl) {
                let avatarConnectorId = options.connectorId || options.speakerId || '';
                if (!avatarConnectorId && (logElement?.id === currentDomElements?.embeddedChatLog?.id || logElement?.id === currentDomElements?.messageChatLog?.id)) {
                    const parentContainer = logElement.id === currentDomElements?.embeddedChatLog?.id ? currentDomElements.embeddedChatContainer : currentDomElements.messagingInterface;
                    avatarConnectorId = parentContainer?.dataset.currentConnectorId || '';
                }
                const altText = currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName || 'Partner');
                if (avatarConnectorId) {
                    avatarHtml = `<img src="${currentPolyglotHelpers.sanitizeTextForDisplay(options.avatarUrl)}" alt="${altText}" class="chat-bubble-avatar left-avatar clickable-chat-avatar" data-connector-id="${currentPolyglotHelpers.sanitizeTextForDisplay(avatarConnectorId)}" onerror="this.onerror=null; this.src='${placeholderAvatarSrc}';">`;
                } else {
                    avatarHtml = `<img src="${currentPolyglotHelpers.sanitizeTextForDisplay(options.avatarUrl)}" alt="${altText}" class="chat-bubble-avatar left-avatar" onerror="this.onerror=null; this.src='${placeholderAvatarSrc}';">`;
                }
            }
        }
    
        // Create a dedicated container for play button and waveform
        const playerControlsContainer = document.createElement('div');
        playerControlsContainer.classList.add('voice-memo-player-controls');
    
        const playButtonId = `playbtn-${options.messageId || currentPolyglotHelpers.generateUUID()}`;
        const playButton = document.createElement('button');
        playButton.id = playButtonId;
        playButton.type = 'button'; // Good practice for buttons not submitting forms
        playButton.setAttribute('aria-label', 'Play audio message');
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        playButton.classList.add('voice-memo-play-btn');
        playerControlsContainer.appendChild(playButton);
    
        const waveformContainerId = `waveform-${options.messageId || currentPolyglotHelpers.generateUUID()}`;
        const waveformDiv = document.createElement('div');
        waveformDiv.id = waveformContainerId;
        waveformDiv.classList.add('voice-memo-waveform-container'); // Added class for styling
        playerControlsContainer.appendChild(waveformDiv);
    
        messageDiv.appendChild(playerControlsContainer); // Add controls container to bubble
    
        requestAnimationFrame(() => {
            const waveformElement = document.getElementById(waveformContainerId);
            if (waveformElement && (window as any).WaveSurfer) {
                try {
                    const wavesurfer = (window as any).WaveSurfer.create({
                        container: waveformElement, // Pass the element directly
                        waveColor: senderClass.includes('user') ? 'rgba(255, 255, 255, 0.5)' : 'rgba(100, 100, 100, 0.5)', // Lighter for user, darker for connector base
                        progressColor: senderClass.includes('user') ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)', // More opaque progress
                        barWidth: 2,
                        barRadius: 2, // Slightly less radius for a flatter look if desired
                        cursorWidth: 0, // Hide cursor for a cleaner look like the image
                        height: 30,     // Adjust height to match reference
                        barGap: 2,      // Space between bars
                        responsive: true,
                        hideScrollbar: true,
                    });
                    wavesurfer.load(options.audioSrc);
    
                    const btnElement = document.getElementById(playButtonId);
                    if (btnElement) {
                        btnElement.onclick = () => {
                            wavesurfer.playPause();
                        };
                        wavesurfer.on('play', () => { btnElement.innerHTML = '<i class="fas fa-pause"></i>'; btnElement.setAttribute('aria-label', 'Pause audio message');});
                        wavesurfer.on('pause', () => { btnElement.innerHTML = '<i class="fas fa-play"></i>'; btnElement.setAttribute('aria-label', 'Play audio message');});
                        wavesurfer.on('finish', () => { btnElement.innerHTML = '<i class="fas fa-play"></i>'; wavesurfer.seekTo(0); btnElement.setAttribute('aria-label', 'Play audio message');});
                    }
                } catch (e) {
                    console.error("WaveSurfer initialization error:", e);
                    const fallbackPlayer = document.createElement('audio'); /* ... your fallback ... */
                    fallbackPlayer.controls = true;
                    fallbackPlayer.src = options.audioSrc!;
                    fallbackPlayer.preload = "metadata";
                    fallbackPlayer.classList.add('chat-audio-player', 'fallback-player');
                    if(waveformElement.parentNode) waveformElement.parentNode.replaceChild(fallbackPlayer, waveformElement);
                    playButton.remove();
                }
            } else {
                console.warn("WaveSurfer container or WaveSurfer library not found for ID:", waveformContainerId);
                 const fallbackPlayer = document.createElement('audio'); /* ... your fallback ... */
                 fallbackPlayer.controls = true;
                 fallbackPlayer.src = options.audioSrc!;
                 fallbackPlayer.preload = "metadata";
                 fallbackPlayer.classList.add('chat-audio-player', 'fallback-player');
                 if(waveformDiv.parentNode) waveformDiv.parentNode.replaceChild(fallbackPlayer, waveformDiv);
                 playButton.remove();
            }
        });
    
        if (text && text.trim() !== "") {
            const transcriptSpan = document.createElement('span');
            transcriptSpan.className = 'voice-memo-transcript'; // Changed class for specific styling
            transcriptSpan.textContent = `(Transcript: ${currentPolyglotHelpers.sanitizeTextForDisplay(text)})`;
            messageDiv.appendChild(transcriptSpan);
        }
    
      

    // Create and append the avatar as a proper DOM element.
    // This allows the logic from Step 1 to find and remove it later.
    const shouldShowAvatar = !senderClass.includes('user') && !senderClass.includes('system-message') && options.avatarUrl;

    if (shouldShowAvatar) {
        // Create the avatar image element
        const avatarElement = document.createElement('img');
        const placeholderBase = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
        const safePlaceholderBase = placeholderBase.endsWith('/') ? placeholderBase : placeholderBase + '/';
        const placeholderAvatarSrc = `${safePlaceholderBase}images/placeholder_avatar.png`;

        avatarElement.src = currentPolyglotHelpers.sanitizeTextForDisplay(options.avatarUrl || '');
        avatarElement.alt = currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName || 'Partner');
        avatarElement.className = 'chat-bubble-avatar left-avatar'; // The classes needed for styling
        avatarElement.onerror = () => { if(avatarElement) { avatarElement.onerror = null; avatarElement.src = placeholderAvatarSrc; }};

        // Make the avatar clickable if it has an ID
        let avatarConnectorId = options.connectorId || options.speakerId || '';
        if (avatarConnectorId) {
            avatarElement.classList.add('clickable-chat-avatar');
            avatarElement.dataset.connectorId = currentPolyglotHelpers.sanitizeTextForDisplay(avatarConnectorId);
        }

        // Add the avatar to the wrapper.
        messageWrapper.appendChild(avatarElement);
        messageWrapper.classList.add('has-avatar-left');
    }

    // Add the message bubble next to the avatar (or by itself).
    messageWrapper.appendChild(messageDiv);

    } else {
        // --- REGULAR TEXT/IMAGE OR SYSTEM MESSAGE RENDERING ---
        messageWrapper.classList.add('chat-message-wrapper');
        messageDiv.classList.add('chat-message-ui');

        // Add sender-specific wrapper and bubble classes
        if (senderClass.includes('user')) {
            messageWrapper.classList.add('user-wrapper');
            messageDiv.classList.add('user');
        } else if (senderClass.includes('system-message')) {
            messageWrapper.classList.add('system-message-wrapper');
            messageDiv.classList.add('system-message');
        } else { // Connector
            messageWrapper.classList.add('connector-wrapper');
            messageDiv.classList.add('connector');
        }

        // Add conditional classes to the bubble itself
        if (options.isThinking) messageDiv.classList.add('connector-thinking');
        if (options.isError) messageDiv.classList.add('error-message-bubble');
        if (senderClass && !senderClass.includes('user') && !senderClass.includes('system-message') && !options.isThinking) {
            const groupClasses = senderClass.split(' ').filter(cls => cls !== 'connector');
            if (groupClasses.length) messageDiv.classList.add(...groupClasses);
        }

        let avatarHtml = ''; // To store potential avatar HTML for this branch
        const placeholderBase = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
        const safePlaceholderBase = placeholderBase.endsWith('/') ? placeholderBase : placeholderBase + '/';
        const placeholderAvatarSrc = `${safePlaceholderBase}images/placeholder_avatar.png`;

        if (!senderClass.includes('user') && !senderClass.includes('system-message') && options.avatarUrl) {
            let avatarConnectorId = options.connectorId || options.speakerId || '';
            if (!avatarConnectorId && (logElement?.id === currentDomElements?.embeddedChatLog?.id || logElement?.id === currentDomElements?.messageChatLog?.id)) {
                const parentContainer = logElement.id === currentDomElements?.embeddedChatLog?.id ? currentDomElements.embeddedChatContainer : currentDomElements.messagingInterface;
                avatarConnectorId = parentContainer?.dataset.currentConnectorId || '';
            }
            const altText = currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName || 'Partner');
            if (avatarConnectorId) {
                avatarHtml = `<img src="${currentPolyglotHelpers.sanitizeTextForDisplay(options.avatarUrl)}" alt="${altText}" class="chat-bubble-avatar left-avatar clickable-chat-avatar" data-connector-id="${currentPolyglotHelpers.sanitizeTextForDisplay(avatarConnectorId)}" onerror="this.onerror=null; this.src='${placeholderAvatarSrc}';">`;
            } else {
                avatarHtml = `<img src="${currentPolyglotHelpers.sanitizeTextForDisplay(options.avatarUrl)}" alt="${altText}" class="chat-bubble-avatar left-avatar" onerror="this.onerror=null; this.src='${placeholderAvatarSrc}';">`;
            }
        }

        // Content for the bubble (text and/or image)
        let contentHtml = '';
        const isGroupChatLog = logElement?.id === currentDomElements?.groupChatLogDiv?.id;

        // Always show sender name for AI in group chat (if provided and not thinking bubble)
        if (options.senderName && !senderClass.includes('user') && !senderClass.includes('system-message') && !options.isThinking && options.showSenderName !== false && isGroupChatLog) {
            contentHtml += `<strong class="chat-message-sender-name">${currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName)}</strong>`;
        }

        // --- START OF THE FIX ---
        
        // FIX #1: Create the image tag FIRST if an imageUrl is provided.
        if (options.imageUrl) {
            contentHtml += `<img src="${currentPolyglotHelpers.sanitizeTextForDisplay(options.imageUrl)}" alt="Chat Image" class="chat-message-image">`;
        }

        // FIX #2: Create the text tag SECOND if text content exists.
        if (text && text.trim() !== "") {
            // Add a line break if there is BOTH an image AND text, for spacing.
            if (options.imageUrl) {
                contentHtml += '<br>';
            }
            let processedText = currentPolyglotHelpers.sanitizeTextForDisplay(text);
            processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            contentHtml += `<span class="chat-message-text">${processedText}</span>`;
        }
        
        // --- END OF THE FIX ---

        messageDiv.innerHTML = contentHtml;

        // Create and append the avatar as a proper DOM element if needed.
        // This allows the consecutive message logic to find and remove it later.
        const shouldShowAvatar = !senderClass.includes('user') && !senderClass.includes('system-message') && options.avatarUrl;
        
        if (shouldShowAvatar) {
            // Create the avatar image element
            const avatarElement = document.createElement('img');
            const placeholderBase = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
            const safePlaceholderBase = placeholderBase.endsWith('/') ? placeholderBase : placeholderBase + '/';
            const placeholderAvatarSrc = `${safePlaceholderBase}images/placeholder_avatar.png`;
        
            // FIX is applied in the line below
            avatarElement.src = currentPolyglotHelpers.sanitizeTextForDisplay(options.avatarUrl || '');
            avatarElement.alt = currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName || 'Partner');
            avatarElement.className = 'chat-bubble-avatar left-avatar'; 
            avatarElement.onerror = () => { if(avatarElement) { avatarElement.onerror = null; avatarElement.src = placeholderAvatarSrc; }};
        
            // Make the avatar clickable if it has an ID
            let avatarConnectorId = options.connectorId || options.speakerId || '';
            if (avatarConnectorId) {
                avatarElement.classList.add('clickable-chat-avatar');
                avatarElement.dataset.connectorId = currentPolyglotHelpers.sanitizeTextForDisplay(avatarConnectorId);
            }
        
            // Add the avatar to the wrapper.
            messageWrapper.appendChild(avatarElement);
            messageWrapper.classList.add('has-avatar-left');
        }
        
        // Add the message bubble next to the avatar (or by itself).
        messageWrapper.appendChild(messageDiv);
    }

    logElement.appendChild(messageWrapper);

    // --- FINAL: Update state and scroll ---
    if (currentSpeakerId && !options.isThinking) {
        lastSpeakerPerLog.set(logElement, currentSpeakerId);
    }
    
    requestAnimationFrame(() => {
        if (isScrolledToBottom && logElement) {
            logElement.scrollTop = logElement.scrollHeight;
        }
    });
    return messageWrapper;
} // End of appendChatMessage

        function scrollChatLogToBottom(chatLogElement: HTMLElement | null): void {
            if (chatLogElement) requestAnimationFrame(() => { chatLogElement.scrollTop = chatLogElement.scrollHeight; });
        }
        const scrollEmbeddedChatToBottom = (): void => scrollChatLogToBottom(getDepsLocal().domElements.embeddedChatLog);
        const scrollMessageModalToBottom = (): void => scrollChatLogToBottom(getDepsLocal().domElements.messageChatLog);

        function showImageInActivityArea(activityAreaEl: HTMLElement | null, imgDisplayEl: HTMLImageElement | null, logToScrollEl: HTMLElement | null, imageUrl: string | null | undefined): void {
            if (!activityAreaEl || !imgDisplayEl || !logToScrollEl) return;
            if (imageUrl) {
                imgDisplayEl.src = imageUrl; activityAreaEl.style.display = 'block';
                requestAnimationFrame(() => { logToScrollEl.scrollTop = logToScrollEl.scrollHeight; });
            } else { imgDisplayEl.src = ''; activityAreaEl.style.display = 'none'; }
        }

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
            appendChatMessage(getDepsLocal().domElements.directCallMainContent, text, senderClass, options); 

        const showImageInVoiceChat = (imageUrl: string | null): void => {
            const { domElements: currentDomElements } = getDepsLocal();
            showImageInActivityArea(currentDomElements.directCallActivityArea, currentDomElements.directCallActivityImageDisplay, currentDomElements.directCallMainContent, imageUrl);
        };

        const updateVoiceChatHeader = (connector: Connector): void => {
            const { domElements: currentDomElements, polyglotHelpers: currentPolyglotHelpers } = getDepsLocal();
            if (!currentDomElements || !currentPolyglotHelpers || !connector) return;
            (currentDomElements.directCallActiveAvatar as HTMLImageElement).src = connector.avatarModern || '/images/placeholder_avatar.png';
            (currentDomElements.directCallActiveName as HTMLElement).textContent = currentPolyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Partner');
        };

        const clearVoiceChatLog = (): void => {
            const { domElements: currentDomElements } = getDepsLocal();
            if (currentDomElements.directCallMainContent) {
                 (currentDomElements.directCallMainContent as HTMLElement).innerHTML = '';
                 lastSpeakerPerLog.delete(currentDomElements.directCallMainContent);
            }
            if (currentDomElements.directCallActivityArea) (currentDomElements.directCallActivityArea as HTMLElement).style.display = 'none';
            if (currentDomElements.directCallActivityImageDisplay) (currentDomElements.directCallActivityImageDisplay as HTMLImageElement).src = '';
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
            const { domElements: currentDomElements, polyglotConnectors: currentConnectors } = getDepsLocal();
            let finalOptions = { ...options };
            if (!senderClass.includes('user') && !senderClass.includes('system-message') && !senderClass.includes('system-call-event')) {
                const connectorId = (currentDomElements.messagingInterface as HTMLElement)?.dataset.currentConnectorId;
                const connector = currentConnectors?.find(c => c.id === connectorId);
                if (connector) { 
                    finalOptions.avatarUrl = connector.avatarModern; 
                    if(options.type !== 'call_event') finalOptions.senderName = connector.profileName; 
                    finalOptions.speakerId = connector.id;
                    finalOptions.connectorId = connector.id;
                }
            }
            return appendChatMessage(currentDomElements.messageChatLog, text, senderClass, finalOptions);
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
            const { domElements: cd } = getDepsLocal();
            if (cd.messageChatLog) {
                cd.messageChatLog.innerHTML = '';
                lastDisplayedTimestamps.delete(cd.messageChatLog);
                lastSpeakerPerLog.delete(cd.messageChatLog);
            }
        };
        const appendToEmbeddedChatLog = (text: string, senderClass: string, options: ChatMessageOptions = {}): HTMLElement | null => {
            const { domElements: cd, polyglotConnectors: pc } = getDepsLocal();
            let finalOptions = { ...options };
         // Use the same robust logic as appendToMessageLogModal
if (!senderClass.includes('user') && !senderClass.includes('system-message') && !senderClass.includes('system-call-event')) {
    const connectorId = cd.embeddedChatContainer?.dataset.currentConnectorId;
    const connector = pc?.find(c => c.id === connectorId);
    if (connector) { 
        finalOptions.avatarUrl = connector.avatarModern; 
        if(options.type !== 'call_event') finalOptions.senderName = connector.profileName;
        finalOptions.speakerId = connector.id;
        finalOptions.connectorId = connector.id;
    }
}
            return appendChatMessage(cd.embeddedChatLog, text, senderClass, finalOptions);
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
            const { domElements: cd } = getDepsLocal();
            if (cd.embeddedChatLog) {
                cd.embeddedChatLog.innerHTML = '<div class="log-is-loading" style="display: none;"></div>';
                lastDisplayedTimestamps.delete(cd.embeddedChatLog);
                lastSpeakerPerLog.delete(cd.embeddedChatLog);
            }
        };

    // <<< REPLACE THE ENTIRE appendToGroupChatLog FUNCTION WITH THIS >>>
// <<< REPLACE THE appendToGroupChatLog FUNCTION >>>
    // <<< REPLACE THE ENTIRE appendToGroupChatLog FUNCTION WITH THIS >>>
// <<< REPLACE THE appendToGroupChatLog FUNCTION >>>
const appendToGroupChatLog = (
    text: string,
    senderNameFromArg: string,
    isUser: boolean,
    speakerId: string, // <<< This is the ground truth for who is speaking
    options: ChatMessageOptions = {}
): HTMLElement | null => {
    const { domElements: cd, polyglotConnectors: pc } = getDepsLocal();
    
    let finalSenderClass = isUser ? 'user' : 'connector group-chat-connector';
    
    // Start with the data passed in for THIS specific message
    let finalChatMessageOptions: ChatMessageOptions = {
        ...options, 
        senderName: senderNameFromArg,
        showSenderName: !isUser,
        speakerId: speakerId, // Use the passed-in speakerId
        connectorId: speakerId, // Also use it for the connectorId
    };

    if (!isUser) {
        // Find the speaker based ONLY on the passed-in speakerId
        const speakerConnector = pc?.find(c => c.id === speakerId);
        
        if (speakerConnector) {
            finalChatMessageOptions.avatarUrl = speakerConnector.avatarModern;
            // You can add more specific logic here if needed (e.g., tutor class)
        } else {
            // Fallback if the speaker can't be found (should be rare)
            console.warn(`UIU.appendToGroupChatLog: Could not find connector data for speakerId: ${speakerId}. Using placeholder avatar.`);
            const placeholderBase = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
            const safePlaceholderBase = placeholderBase.endsWith('/') ? placeholderBase : placeholderBase + '/';
            finalChatMessageOptions.avatarUrl = `${safePlaceholderBase}images/placeholder_avatar.png`;
        }
    }
    
    if (!finalChatMessageOptions.timestamp) {
        finalChatMessageOptions.timestamp = Date.now();
    }

    // Call the master chat message append function with fully resolved data
    return appendChatMessage(cd.groupChatLogDiv, text, finalSenderClass, finalChatMessageOptions);
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
            const { domElements: cd } = getDepsLocal();
            if(cd.groupChatLogDiv) {
                cd.groupChatLogDiv.innerHTML = '';
                lastDisplayedTimestamps.delete(cd.groupChatLogDiv);
                lastSpeakerPerLog.delete(cd.groupChatLogDiv);
            }
        };

        const populateRecapModal = (recapData: RecapData | null): void => {
            const { domElements: cd, polyglotHelpers: ph } = getDepsLocal();
            
            const setText = (el: HTMLElement | null, textVal: string | undefined | null, def = "N/A") => {
                if (el) el.textContent = ph.sanitizeTextForDisplay(textVal || def);
            };
            const safePopulateList = (ul: HTMLUListElement | null, items: Array<string | RecapDataItem> | null | undefined, type: 'simple' | 'vocabulary' | 'improvementArea') => {
                if (ul) populateListInRecap(ul, items, type);
            };
            
            if (cd) {
                if (cd.recapConnectorName) cd.recapConnectorName.textContent = 'Call Debrief';
                setText(cd.recapDate ?? null, null, ''); 
                setText(cd.recapDuration ?? null, null, ''); 
                setText(cd.recapConversationSummaryText ?? null, 'Loading...', 'Loading...');
                safePopulateList(cd.recapTopicsList ?? null, [], 'simple');
                safePopulateList(cd.recapGoodUsageList ?? null, [], 'simple');
                safePopulateList(cd.recapVocabularyList ?? null, [], 'vocabulary');
                safePopulateList(cd.recapFocusAreasList ?? null, [], 'improvementArea');
                safePopulateList(cd.recapPracticeActivitiesList ?? null, [], 'simple');
                setText(cd.recapOverallEncouragementText ?? null, '', '');
            }

            if (!cd?.sessionRecapScreen || !ph || !recapData) {
                if (cd) setText(cd.recapConversationSummaryText ?? null, 'Recap data is unavailable.');
                return;
            }

            try {
                if(cd.recapConnectorName) cd.recapConnectorName.textContent = `With ${ph.sanitizeTextForDisplay(recapData.connectorName || 'Partner')}`;
                setText(cd.recapDate ?? null, recapData.date, 'Not specified');
                setText(cd.recapDuration ?? null, recapData.duration, 'N/A');
                setText(cd.recapConversationSummaryText ?? null, recapData.conversationSummary, "No summary provided.");
                safePopulateList(cd.recapTopicsList ?? null, recapData.keyTopicsDiscussed, 'simple');
                safePopulateList(cd.recapGoodUsageList ?? null, recapData.goodUsageHighlights, 'simple');
                safePopulateList(cd.recapVocabularyList ?? null, recapData.newVocabularyAndPhrases, 'vocabulary');
                safePopulateList(cd.recapFocusAreasList ?? null, recapData.areasForImprovement, 'improvementArea');
                safePopulateList(cd.recapPracticeActivitiesList ?? null, recapData.suggestedPracticeActivities, 'simple');
                setText(cd.recapOverallEncouragementText ?? null, recapData.overallEncouragement, "Keep practicing!");
                if(cd.sessionRecapScreen) (cd.sessionRecapScreen as HTMLElement).dataset.sessionIdForDownload = recapData.sessionId || '';
            } catch (e: any) { 
                console.error("Error populating recap modal sections:", e);
                if (cd) setText(cd.recapConversationSummaryText ?? null, 'Error displaying recap.');
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
      
      
      
      
        return {
            updateVirtualCallingScreen, appendToVoiceChatLog, showImageInVoiceChat, updateVoiceChatHeader,
            clearVoiceChatLog, resetVoiceChatInput, updateVoiceChatTapToSpeakButton, updateDirectCallHeader,
            updateDirectCallStatus, updateDirectCallMicButtonVisual, updateDirectCallSpeakerButtonVisual,
            showImageInDirectCall, clearDirectCallActivityArea, appendToMessageLogModal, showImageInMessageModal,
            updateMessageModalHeader, resetMessageModalInput, clearMessageModalLog, appendToEmbeddedChatLog,
            showImageInEmbeddedChat, updateEmbeddedChatHeader, clearEmbeddedChatInput, toggleEmbeddedSendButton,
            clearEmbeddedChatLog, appendToGroupChatLog, updateGroupChatHeader, /* <<< setGroupTypingIndicatorText REMOVED */
            clearGroupChatInput, clearGroupChatLog, populateRecapModal, displaySummaryInView,
            updateTTSToggleButtonVisual, updateSendPhotoButtonVisibility, showProcessingSpinner,
            removeProcessingSpinner, appendSystemMessage,
            scrollEmbeddedChatToBottom, scrollMessageModalToBottom
        };

    } catch (e: any) {
        console.error("CRITICAL ERROR INSIDE UiUpdater IIFE:", e.message, e.stack);
        const dummyReturn: UiUpdaterModule = {
            updateVirtualCallingScreen: () => {}, appendToVoiceChatLog: () => null, showImageInVoiceChat: () => {},
            updateVoiceChatHeader: () => {}, clearVoiceChatLog: () => {}, resetVoiceChatInput: () => {},
            updateVoiceChatTapToSpeakButton: () => {}, updateDirectCallHeader: () => {}, updateDirectCallStatus: () => {},
            updateDirectCallMicButtonVisual: () => {}, updateDirectCallSpeakerButtonVisual: () => {},
            showImageInDirectCall: () => {}, clearDirectCallActivityArea: () => {}, appendToMessageLogModal: () => null,
            showImageInMessageModal: () => {}, updateMessageModalHeader: () => {}, resetMessageModalInput: () => {},
            clearMessageModalLog: () => {}, appendToEmbeddedChatLog: () => null, showImageInEmbeddedChat: () => {},
            updateEmbeddedChatHeader: () => {}, clearEmbeddedChatInput: () => {}, toggleEmbeddedSendButton: () => {},
            clearEmbeddedChatLog: () => {}, appendToGroupChatLog: () => null, updateGroupChatHeader: () => {},
            clearGroupChatInput: () => {}, clearGroupChatLog: () => {},
            populateRecapModal: () => {}, displaySummaryInView: () => {}, updateTTSToggleButtonVisual: () => {},
            updateSendPhotoButtonVisibility: () => {}, showProcessingSpinner: () => null, removeProcessingSpinner: () => {},
            appendSystemMessage: () => null, scrollEmbeddedChatToBottom: () => {}, scrollMessageModalToBottom: () => {}
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

const dependenciesForUiUpdater = ['domElementsReady', 'polyglotHelpersReady', 'polyglotDataReady', 'groupManagerReady'];
let uiUpdaterDepsMetCount = 0;
const uiUpdaterMetDependenciesLog: { [key: string]: boolean } = {
    'domElementsReady': false,
    'polyglotHelpersReady': false,
    'polyglotDataReady': false,
    'groupManagerReady': false
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