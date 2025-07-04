// D:\polyglot_connect\src\js\ui\chat_ui_updater.ts
// This module handles the detailed logic of rendering chat messages.

import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ChatMessageOptions
} from '../types/global.d.ts';

console.log('chat_ui_updater.ts: Script loaded.');

// Define the interface for this module's public methods
export interface ChatUiUpdaterModule {
    initialize(deps: { domElements: YourDomElements, polyglotHelpers: PolyglotHelpers }): void;
    
    appendSystemMessage(
      logEl: HTMLElement | null, 
      text: string, 
      isError?: boolean, 
      isTimestamp?: boolean
    ): HTMLElement | null;
    
    appendChatMessage(
      logElement: HTMLElement | null, 
      text: string, 
      senderClass: string, 
      options?: ChatMessageOptions 
    ): HTMLElement | null;
    
    scrollChatLogToBottom(chatLogElement: HTMLElement | null): void;
    
    clearLogCache(logElement: HTMLElement): void;
  
    // --- NEW METHODS (Ensure these are identical to global.d.ts) ---
    showUnifiedInteractionMenu: (
        triggerBubbleElement: HTMLElement, 
        currentUserReaction?: string 
    ) => void;
  
    hideUnifiedInteractionMenu: () => void;
  
    updateDisplayedReactionOnBubble: (
        messageWrapperElement: HTMLElement, 
        newEmoji: string | null 
    ) => void;
  
    isEventInsideUnifiedInteractionMenu: (event: Event) => boolean;
  
    isUnifiedInteractionMenuVisibleForBubble?: (triggerBubbleElement: HTMLElement) => boolean; 
    
    isUnifiedInteractionMenuVisible?: () => boolean; 
  
    showMenuActionFeedback?: (
        menuButtonElement: HTMLElement, 
        feedbackText: string 
    ) => void;
  
    updateMenuTranslateButtonText?: (
        menuButtonElement: HTMLElement, 
        newButtonText: string 
    ) => void;
  
    showMenuActionInProgress?: (
        menuButtonElement: HTMLElement, 
        progressText: string 
    ) => void;
  
    resetMenuActionInProgress?: (
        menuButtonElement: HTMLElement, 
        defaultTextAfterProgress: string 
    ) => void;
    showLoadingInEmbeddedChatLog: () => void;
    showErrorInEmbeddedChatLog: (errorMessage: string) => void;
    getWrapperForActiveUnifiedMenu?: () => HTMLElement | null; // <<< ADD THIS LINE
  }

const chatUiUpdater: ChatUiUpdaterModule = (() => {
    'use strict';

    // These variables are now privately scoped to this chat rendering module
    let domElements: YourDomElements;
    let polyglotHelpers: PolyglotHelpers;
    const lastDisplayedTimestamps: Map<HTMLElement, Date> = new Map();
    const lastSpeakerPerLog: Map<HTMLElement, string> = new Map();
    let activeUnifiedMenuElement: HTMLElement | null = null;
let currentlyAttachedBubbleForMenu: HTMLElement | null = null; // To know which bubble triggered it
let wrapperForActiveUnifiedMenu: HTMLElement | null = null; // <<< ADD THIS

const TIME_DIFFERENCE_THRESHOLD_MINUTES = 30;

    function getDepsLocal() {
        return { domElements, polyglotHelpers };
    }



    function showLoadingInEmbeddedChatLog(): void {
        const { domElements } = getDepsLocal(); // Use getDepsLocal
        if (domElements?.embeddedChatLog) {
            // This HTML includes a simple Font Awesome spinner.
            // You can style .chat-log-loading-placeholder in your CSS.
            domElements.embeddedChatLog.innerHTML = `
                <div class="chat-log-loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading conversation...</p>
                </div>
            `;
        }
    }
    
    function showErrorInEmbeddedChatLog(errorMessage: string): void {
        const { domElements, polyglotHelpers } = getDepsLocal(); // Use getDepsLocal
        if (domElements?.embeddedChatLog && polyglotHelpers) {
            // This HTML includes a warning icon.
            // You can style .chat-log-error-placeholder in your CSS.
            const sanitizedMessage = polyglotHelpers.sanitizeTextForDisplay(errorMessage);
            domElements.embeddedChatLog.innerHTML = `
                <div class="chat-log-error-placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${sanitizedMessage}</p>
                </div>
            `;
        }
    }


    function initialize(deps: { domElements: YourDomElements, polyglotHelpers: PolyglotHelpers }) {
        console.log("chat_ui_updater.ts: Initializing with dependencies.");
        domElements = deps.domElements;
        polyglotHelpers = deps.polyglotHelpers;
    }
    
    function scrollChatLogToBottom(chatLogElement: HTMLElement | null): void {
        if (chatLogElement) {
            requestAnimationFrame(() => {
                chatLogElement.scrollTop = chatLogElement.scrollHeight;
            });
        }
    }

    function clearLogCache(logElement: HTMLElement): void {
        lastDisplayedTimestamps.delete(logElement);
        lastSpeakerPerLog.delete(logElement);
    }
    
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

    function appendChatMessage(logElement: HTMLElement | null, text: string, senderClass: string, options: ChatMessageOptions = {}): HTMLElement | null {
        if (options.type === 'call_event') {
            console.log('%c[BRUTE FORCE] #4: appendChatMessage RECEIVED a call_event', 'color: #00FFFF; font-weight: bold;', {
                text: text,
                senderClass: senderClass,
                options: JSON.parse(JSON.stringify(options)) // Deep copy to prevent weird console logging issues
            });
        }

        if (senderClass === 'system-call-event' || options.type === 'call_event') {
            console.log(
                '%c[CALL_EVENT_TRACE #4] Final Destination: appendChatMessage received options:', 
                'color: white; background-color: #B22222; padding: 2px;',
                JSON.parse(JSON.stringify(options))
            );
        }
        const { polyglotHelpers: currentPolyglotHelpers, domElements: currentDomElements } = getDepsLocal();
    
        // --- THIS IS THE FIX: Make the function robust by ensuring a messageId always exists. ---
        if (!options.messageId) {
            if (options.isThinking) {
                // This is a "ghost bubble". It's temporary and doesn't need a permanent ID.
                // We'll generate one for the UI element but won't log a scary warning.
                // Creative Debug: We prefix the ID to make it obvious in the DOM inspector.
                options.messageId = `ghost-${polyglotHelpers.generateUUID()}`;
            } else {
                // This is a REAL message that's missing an ID. This is a problem we should be warned about.
                options.messageId = polyglotHelpers.generateUUID();
                console.warn(`[CHAT_UI_DEBUG] A messageId was MISSING from a real message object. A new one was generated: ${options.messageId}`);
            }
        }
        // --- END OF FIX ---
    
        console.log('[CHAT_UI_DEBUG] appendChatMessage called for sender:', senderClass); // LINE 184
        console.log('[CHAT_UI_DEBUG] FULL OPTIONS RECEIVED:', JSON.parse(JSON.stringify(options))); // LINE 186
      
      
        if (!logElement || !currentPolyglotHelpers) {
            console.error("ChatUIU_appendChatMessage: logElement or polyglotHelpers missing.");
            return null;
        }
        const isScrolledToBottom = logElement.scrollHeight - logElement.clientHeight <= logElement.scrollTop + 50;
        const manualPlaceholder = logElement.querySelector('.chat-log-empty-placeholder, .log-is-loading');
        if (manualPlaceholder) {
            logElement.innerHTML = '';
        }

        const messageTimestamp = options.timestamp ? new Date(options.timestamp) : new Date();
        let lastDisplayedDate = lastDisplayedTimestamps.get(logElement);
        let shouldDisplayTimestamp = false;
        const isFirstMessageInLog = logElement.children.length === 0;

        if (isFirstMessageInLog || !lastDisplayedDate) {
            shouldDisplayTimestamp = true;
        } else if (lastDisplayedDate) {
            const timeDiffMinutes = (messageTimestamp.getTime() - lastDisplayedDate.getTime()) / (1000 * 60);
            if (messageTimestamp.toDateString() !== lastDisplayedDate.toDateString() || timeDiffMinutes > TIME_DIFFERENCE_THRESHOLD_MINUTES) {
                shouldDisplayTimestamp = true;
            }
        }
        
        if (shouldDisplayTimestamp && options.type !== 'call_event' && !senderClass.includes('system')) {
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
                        formattedSessionTimestampStr = `${messageTimestamp.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}, ${timePart}`;
                    }
                }
            }
            timestampDiv.textContent = formattedSessionTimestampStr;
            logElement.appendChild(timestampDiv);
            lastDisplayedTimestamps.set(logElement, messageTimestamp);
        }
        
        let messageWrapper: HTMLElement;

        if (options.type === 'call_event') {
            // For call events, the wrapper MUST be an <li> to act as a "twin"
            messageWrapper = document.createElement('li');
            // Add the class and data attribute that the summary list listener expects
            messageWrapper.className = 'summary-list-item system-event-wrapper'; // <<< ADD 'system-event-wrapper' HERE
            if (options.callSessionId) { // Ensure sessionId is only added if it exists
                 messageWrapper.dataset.sessionId = options.callSessionId;
            }
        } else {
            // For all other regular messages, it's a normal div
            messageWrapper = document.createElement('div');
        }

        
        
        
        console.log('[CHAT_UI_DEBUG] Creating message wrapper. Checking for messageId in options...');
        if (options.messageId) { // This is your app's UUID
            messageWrapper.dataset.messageId = options.messageId;
            console.log(`[CHAT_UI_DEBUG] SUCCESS: Set data-message-id (app UUID) to "${options.messageId}" on the wrapper.`);
        } else {
            console.warn('[CHAT_UI_DEBUG] WARNING: No app messageId was provided in options, so data-message-id was NOT set on the wrapper.');
        }

        // --- ADD THIS BLOCK to store Firestore Document ID ---
        if (options.id) { // This 'id' field in options should be the Firestore document ID for historical messages
            messageWrapper.dataset.firestoreMessageId = options.id;
            console.log(`[CHAT_UI_DEBUG] SUCCESS: Set data-firestore-message-id to "${options.id}" on the wrapper.`);
        } else if (options.type !== 'call_event' && !options.isThinking) { // Don't warn for thinking bubbles or call events that might not have it yet
            // For user-sent messages before they hit Firestore, options.id might be missing.
            // This is okay, as reactions can only be added to messages that exist in Firestore.
            // However, if this is a historical message from Firestore, options.id SHOULD exist.
            console.warn('[CHAT_UI_DEBUG] WARNING: No options.id (Firestore document ID) was provided. Reactions might not save for this message if it is historical.');
        }
        // --- END OF ADDED BLOCK ---
        // Let
        // 
        // 
        // 's inspect the dataset immediately after trying to set it.
        console.log('[CHAT_UI_DEBUG] Wrapper dataset immediately after setting:', JSON.parse(JSON.stringify(messageWrapper.dataset)));

        const currentSpeakerId = options.speakerId || options.connectorId;
        if (shouldDisplayTimestamp) {
            lastSpeakerPerLog.delete(logElement);
        } else {
            const lastSpeakerId = lastSpeakerPerLog.get(logElement);
            if (currentSpeakerId && lastSpeakerId === currentSpeakerId && !options.isThinking && !senderClass.includes('user')) {
                messageWrapper.classList.add('is-consecutive');
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

        const messageDiv = document.createElement('div');
        if (options.messageId) messageWrapper.dataset.messageId = options.messageId;
        messageWrapper.title = messageTimestamp.toLocaleString();

        // --- THIS IS THE FIX ---
        // Ensure both speakerId and connectorId are set on the wrapper for consistency.
        // The reaction handler looks for connectorId, while other logic may use speakerId.
        if (currentSpeakerId) {
            messageWrapper.dataset.speakerId = currentSpeakerId;
            messageWrapper.dataset.connectorId = currentSpeakerId; // Use speakerId as the connectorId in a group context
        }

        if (options.type === 'call_event' || senderClass === 'system-call-event') {
            // This is now the ONLY block that will run for a call event.
            messageWrapper.classList.add('system-event-wrapper');
            messageDiv.classList.add('call-event-message');
            let eventIconHtml = '', callActionHtml = '', eventMainText = currentPolyglotHelpers.sanitizeTextForDisplay(text || ""), eventDetailsHtml = '';
            
            switch (options.eventType) {
                case 'call_started': 
                    eventIconHtml = '<i class="fas fa-phone-alt call-event-icon call-started"></i> '; 
                    break;
                case 'call_ended':
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-ended"></i> ';
                    // This now correctly builds the buttons, and they will not be overwritten.
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_back" data-connector-id="${options.connectorIdForButton || ''}" data-session-id="${options.callSessionId || ''}">CALL BACK</button><button class="call-event-action-btn summary-btn" data-action="view_summary" data-session-id="${options.callSessionId || ''}">VIEW SUMMARY</button>`; 
                    break;
                case 'call_failed_user_attempt':
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> ';
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorIdForButton || ''}">CALL AGAIN</button>`; 
                    break;
                case 'call_missed_connector':
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> ';
                    eventMainText = `${options.connectorNameForDisplay || 'Partner'} missed your call.`;
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorIdForButton || ''}">CALL AGAIN</button>`; 
                    break;
            }
        
            if (options.duration) eventDetailsHtml += `<span class="call-event-detail duration"><i class="far fa-clock"></i> ${currentPolyglotHelpers.sanitizeTextForDisplay(options.duration)}</span>`;
            const eventTime = new Date(options.timestamp || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            if (eventDetailsHtml && eventTime) eventDetailsHtml += ' | ';
            if (eventTime) eventDetailsHtml += `<span class="call-event-detail time">${eventTime}</span>`;
            
            messageDiv.innerHTML = `<div class="call-event-main-text">${eventIconHtml}${eventMainText}</div><div class="call-event-details-container">${eventDetailsHtml}</div>${callActionHtml ? `<div class="call-event-actions">${callActionHtml}</div>` : ''}`;
            messageWrapper.appendChild(messageDiv);
        
        } else if (options.isVoiceMemo && options.audioSrc) {
            messageWrapper.classList.add('chat-message-wrapper');
            messageDiv.classList.add('chat-message-ui', 'voice-memo-message');
            messageWrapper.classList.add(senderClass.includes('user') ? 'user-wrapper' : 'connector-wrapper');
            messageDiv.classList.add(senderClass.includes('user') ? 'user' : 'connector');
            
            const playerControlsContainer = document.createElement('div');
            playerControlsContainer.classList.add('voice-memo-player-controls');
            const playButtonId = `playbtn-${options.messageId || currentPolyglotHelpers.generateUUID()}`;
            const playButton = document.createElement('button');
            playButton.id = playButtonId;
            playButton.type = 'button';
            playButton.setAttribute('aria-label', 'Play audio message');
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            playButton.classList.add('voice-memo-play-btn');
            playerControlsContainer.appendChild(playButton);
            const waveformContainerId = `waveform-${options.messageId || currentPolyglotHelpers.generateUUID()}`;
            const waveformDiv = document.createElement('div');
            waveformDiv.id = waveformContainerId;
            waveformDiv.classList.add('voice-memo-waveform-container');
            playerControlsContainer.appendChild(waveformDiv);
            messageDiv.appendChild(playerControlsContainer);
            
            if (options.audioSrc) {
                waveformDiv.dataset.audioSrc = options.audioSrc;
                console.log(`[ChatUIUpdater] Voice memo audioSrc set for lazy loading: ${options.audioSrc} on ${waveformContainerId}`);
            } else {
                console.warn(`[ChatUIUpdater] No audioSrc provided for voice memo ${options.messageId}`);
            }
            waveformDiv.dataset.wavesurferInitialized = "false";
    
            requestAnimationFrame(() => {
                const waveElement = document.getElementById(waveformContainerId);
                const playBtnElement = document.getElementById(playButtonId);
    
                if (waveElement && playBtnElement && (window as any).WaveSurfer) {
                    playBtnElement.onclick = () => {
                        let wavesurfer = (waveElement as any).wavesurferInstance;
                        if (waveElement.dataset.wavesurferInitialized === "false") {
                            const audioUrlToLoad = waveElement.dataset.audioSrc;
                            console.log(`[ChatUIUpdater] Initializing WaveSurfer for ${waveformContainerId} with src: ${audioUrlToLoad}`);
                            if (!audioUrlToLoad) {
                                console.warn(`[ChatUIUpdater] No audioSrc found in dataset for ${waveformContainerId}. Cannot load.`);
                                playBtnElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i>'; // Show error on button
                                const errorSpan = document.createElement('span');
                                errorSpan.className = 'voice-memo-error';
                                errorSpan.textContent = ' Audio unavailable.';
                                messageDiv.appendChild(errorSpan); // Append error to message bubble
                                return;
                            }
                            try {
                                wavesurfer = (window as any).WaveSurfer.create({
                                    container: `#${waveformContainerId}`,
                                    waveColor: senderClass.includes('user') ? 'rgba(255, 255, 255, 0.5)' : 'rgba(100, 100, 100, 0.5)',
                                    progressColor: senderClass.includes('user') ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                                    barWidth: 2, barRadius: 2, cursorWidth: 0, height: 30, barGap: 2,
                                    responsive: true, hideScrollbar: true
                                });
                                (waveElement as any).wavesurferInstance = wavesurfer; // Store instance on the element
    
                                wavesurfer.on('ready', () => {
                                    console.log(`[ChatUIUpdater] WaveSurfer ready for ${waveformContainerId}, playing.`);
                                    wavesurfer.play();
                                });
                                wavesurfer.on('play', () => { playBtnElement.innerHTML = '<i class="fas fa-pause"></i>'; });
                                wavesurfer.on('pause', () => { playBtnElement.innerHTML = '<i class="fas fa-play"></i>'; });
                                wavesurfer.on('finish', () => {
                                    playBtnElement.innerHTML = '<i class="fas fa-play"></i>';
                                    wavesurfer.seekTo(0);
                                });
                                wavesurfer.on('error', (err: any) => {
                                    console.error(`[ChatUIUpdater] WaveSurfer error loading ${waveElement.dataset.audioSrc}:`, err);
                                    playBtnElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                                    const errorSpan = document.createElement('span');
                                    errorSpan.className = 'voice-memo-error';
                                    errorSpan.textContent = ' Error loading audio.';
                                    // Check if an error span already exists to prevent duplicates
                                    if (!messageDiv.querySelector('.voice-memo-error')) {
                                        messageDiv.appendChild(errorSpan);
                                    }
                                });
                                
                                console.log(`[ChatUIUpdater] Loading audio into WaveSurfer: ${audioUrlToLoad}`);
                                wavesurfer.load(audioUrlToLoad);
                                playBtnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Show loading on button
                                waveElement.dataset.wavesurferInitialized = "true";
                            } catch (e) {
                                console.error("[ChatUIUpdater] Error creating WaveSurfer instance:", e);
                                playBtnElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                            }
                        } else if (wavesurfer) {
                            console.log(`[ChatUIUpdater] WaveSurfer already initialized for ${waveformContainerId}, toggling play/pause.`);
                            wavesurfer.playPause();
                        } else {
                             console.warn(`[ChatUIUpdater] WaveSurfer instance not found for ${waveformContainerId} on subsequent click.`);
                             playBtnElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                        }
                    };
                } else {
                    console.warn(`[ChatUIUpdater] Could not find elements for WaveSurfer setup: waveElement=${!!waveElement}, playBtnElement=${!!playBtnElement}`);
                }
            });
            if (text && text.trim() !== "") {
                const transcriptContainerDiv = document.createElement('div');
                // Apply a general class for the container, useful for margin/padding.
                transcriptContainerDiv.className = 'voice-memo-transcript-container'; 
                
                const transcriptTextSpan = document.createElement('span');
                // A more specific class for the text itself, can be styled like regular chat text.
                transcriptTextSpan.className = 'voice-memo-transcript-text'; 

                let transcriptContent = "";
                // For user's voice memos, keep the "(Transcript: ...)" prefix
                if (senderClass.includes('user')) {
                    transcriptContent = `(Transcript: ${currentPolyglotHelpers.sanitizeTextForDisplay(text)})`;
                } else { 
                    // For AI (connector) voice memos, just display the transcribed text directly.
                    // This makes it feel more like the AI is "speaking" that text.
                    transcriptContent = currentPolyglotHelpers.sanitizeTextForDisplay(text);
                }
                transcriptTextSpan.textContent = transcriptContent;
                
                transcriptContainerDiv.appendChild(transcriptTextSpan);
                messageDiv.appendChild(transcriptContainerDiv); // Append the div container to the main message bubble
            }
            // --- END OF REPLACEMENT ---
            
            messageWrapper.appendChild(messageDiv);

        } else { 
            // --- REGULAR TEXT & IMAGE LOGIC ---
            messageWrapper.classList.add('chat-message-wrapper');
            messageDiv.classList.add('chat-message-ui');

            if (senderClass.includes('user')) {
                messageWrapper.classList.add('user-wrapper');
                messageDiv.classList.add('user');
            } else if (senderClass.startsWith('system-')) { // <<< FIX: Broaden to catch 'system-warning', 'system-error', etc.
                messageWrapper.classList.add('system-message-wrapper'); // Use system message styling
                messageDiv.classList.add('system-message');
                // The options.isError check later will handle adding 'error-message-bubble' if isError:true is passed
            } else { // Fallback to connector (e.g., 'connector', 'connector-thinking', 'connector-error')
                messageWrapper.classList.add('connector-wrapper');
                messageDiv.classList.add('connector');
            }

            if (options.isThinking) messageDiv.classList.add('connector-thinking'); // Correct for connector thinking
            if (options.isError) messageDiv.classList.add('error-message-bubble'); // Applies error style

            let contentHtml = '';
            const isGroupChatLog = logElement?.id === currentDomElements?.groupChatLogDiv?.id;
            
            if (options.senderName && !senderClass.includes('user') && !options.isThinking && options.showSenderName !== false && isGroupChatLog) {
                contentHtml += `<strong class="chat-message-sender-name">${currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName)}</strong>`;
            }

            let processedText = '';
            if (text && text.trim() !== "") {
                processedText = currentPolyglotHelpers.sanitizeTextForDisplay(text);
                processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            }

            // Correctly handle image, placeholder, and text content
            if (options.imageUrl) { // This will now be an Imgur URL
                contentHtml += `<img src="${currentPolyglotHelpers.sanitizeTextForDisplay(options.imageUrl)}" alt="Chat Image" class="chat-message-image">`;
                if (processedText) contentHtml += `<br><span class="chat-message-text">${processedText}</span>`;
            } else if (options.type === 'image') { // This is the freemium placeholder
                contentHtml += `<div class="chat-message-expired-image"><i class="fas fa-image"></i><span>Upgrade to Premium to save images.</span></div>`;
                if (processedText) contentHtml += `<br><span class="chat-message-text">${processedText}</span>`;
            } else {
                contentHtml += `<span class="chat-message-text">${processedText}</span>`;
            }
            
            messageDiv.innerHTML = contentHtml;
            messageWrapper.appendChild(messageDiv);
        }

        const shouldShowAvatar = 
        !senderClass.includes('user') && 
        !senderClass.includes('system-message') && 
        !senderClass.includes('system-call-event') && // <<< THIS IS THE KEY FIX
        options.type !== 'call_event' &&               // <<< AND THIS IS A SAFETY CHECK
        options.avatarUrl;
            if (!messageWrapper.classList.contains('system-event-wrapper') && !messageWrapper.classList.contains('system-message-wrapper')) {

            
                
                
                
                
                const timeOnDemandDiv = document.createElement('div');
                timeOnDemandDiv.className = 'message-timestamp-on-click';
                timeOnDemandDiv.textContent = messageTimestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                // Prepend it so it appears above the bubble when made visible.
                messageWrapper.prepend(timeOnDemandDiv);
            }
        if (shouldShowAvatar) {
            const avatarElement = document.createElement('img');
            const placeholderAvatarSrc = `${(window as any).POLYGLOT_CONNECT_BASE_URL || '/'}images/placeholder_avatar.png`;
            
            avatarElement.src = currentPolyglotHelpers.sanitizeTextForDisplay(options.avatarUrl || '');
            avatarElement.alt = currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName || 'Partner');
            avatarElement.className = 'chat-bubble-avatar left-avatar';
            avatarElement.onerror = () => { if(avatarElement) { avatarElement.onerror = null; avatarElement.src = placeholderAvatarSrc; }};
            
            if (options.connectorId || options.speakerId) {
                avatarElement.classList.add('clickable-chat-avatar');
                avatarElement.dataset.connectorId = currentPolyglotHelpers.sanitizeTextForDisplay(options.connectorId || options.speakerId || '');
            }
            
            // Prepend the avatar to the main wrapper and add the class for spacing.
            messageWrapper.prepend(avatarElement); 
            messageWrapper.classList.add('has-avatar-left');
        }

        // Add reaction picker logic
     // =================== REPLACE THE REACTION CONTAINER BLOCK WITH THIS ===================

    
     if (!messageWrapper.classList.contains('system-event-wrapper') && !messageWrapper.classList.contains('system-message-wrapper')) {
        const safetyNet = document.createElement('div');
        safetyNet.className = 'message-safety-net';
        messageWrapper.appendChild(safetyNet);
        
        
        
     // =================== REPLACE THE REACTION CONTAINER BLOCK WITH THIS (CORRECTED) ===================
// =================== REPLACE THE REACTION CONTAINER BLOCK WITH THIS (CORRECTED) ===================

// in src/js/ui/chat_ui_updater.ts, inside appendChatMessage()
// =================== START: REPLACE THE REACTION CONTAINER BLOCK ===================
if (!messageWrapper.classList.contains('system-event-wrapper') && 
    !messageWrapper.classList.contains('system-message-wrapper')) {

    // 1. Create the Desktop-Specific Reaction Picker (for hover interaction)
    // This is appended to `messageDiv` (the bubble itself) and handled by desktop-specific logic.
    const desktopReactionPicker = document.createElement('div');
    desktopReactionPicker.className = 'reaction-picker'; 
    ['👍', '❤️', '😂', '😯', '😢', '😡'].forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'reaction-btn'; // Class for desktop picker buttons
        button.type = 'button';
        button.textContent = emoji;
        button.setAttribute('aria-label', `React with ${emoji}`);
        desktopReactionPicker.appendChild(button);
    });
    messageDiv.appendChild(desktopReactionPicker);

    // 2. Create the Desktop-Specific Action Menu (for right-click interaction)
    // This is appended to `messageDiv` (the bubble itself) and handled by desktop-specific logic.
    const desktopActionMenu = document.createElement('div');
    desktopActionMenu.className = 'action-menu'; 
    desktopActionMenu.innerHTML = `
        <button class="action-btn-item" data-action="copy" title="Copy message text"><i class="fas fa-copy"></i><span>Copy</span></button>
        <button class="action-btn-item" data-action="translate" title="Translate message"><i class="fas fa-language"></i><span>Translate</span></button>
    `;
    messageDiv.appendChild(desktopActionMenu);

    // 3. Create and populate the container for displaying saved reactions from history.
    // This container is appended to `messageWrapper` (typically below the bubble).
    const reactionsDisplayContainer = document.createElement('div');
    reactionsDisplayContainer.className = 'message-reactions'; 

    if (options.reactions && typeof options.reactions === 'object' && Object.keys(options.reactions).length > 0) {
        // A. Determine and set the current user's reaction on the message wrapper.
        // This `data-user-reaction` attribute is used by reaction_handler.ts (for both mobile and desktop unified menus)
        // to pre-select the user's current choice when a menu is opened.
        const userSpecificReactionEmoji = Object.keys(options.reactions).find(emoji => 
            options.reactions![emoji] && Array.isArray(options.reactions![emoji]) && options.reactions![emoji].includes('user_player')
        );
        if (userSpecificReactionEmoji) {
            messageWrapper.dataset.userReaction = userSpecificReactionEmoji;
        }

        // B. Display all unique reactions with their counts in the reactionsDisplayContainer.
        Object.entries(options.reactions).forEach(([emoji, userIds]) => {
            if (userIds && Array.isArray(userIds) && userIds.length > 0) {
                const reactionBadge = document.createElement('button'); 
                reactionBadge.className = 'reaction-item'; // Class for individual reaction badges
                reactionBadge.type = 'button'; 
                // reactionBadge.dataset.emoji = emoji; // Optional: if you need to identify the emoji on click
                
                // Sanitize emoji, though typically standard emojis are safe
                const displayEmoji = currentPolyglotHelpers.sanitizeTextForDisplay(emoji);
                const count = userIds.length;
                
                reactionBadge.innerHTML = `${displayEmoji} <span class="reaction-count">${count}</span>`;
                reactionsDisplayContainer.appendChild(reactionBadge);
            }
        });
    }
    
    // Append the reactions display container to the message wrapper if it has any content.
    if (reactionsDisplayContainer.hasChildNodes()) {
        messageWrapper.appendChild(reactionsDisplayContainer);
    }
}
if (options.id) { // This 'id' field in options should be the Firestore document ID
    messageWrapper.dataset.firestoreMessageId = options.id; // <<< THIS IS THE KEY
    console.log(`[CHAT_UI_DEBUG] SUCCESS: Set data-firestore-message-id to "${options.id}" on the wrapper.`);
} else if (options.type !== 'call_event' && !options.isThinking) { 
    console.warn('[CHAT_UI_DEBUG] WARNING: No options.id (Firestore document ID) was provided. Reactions might not save for this message if it is historical.');
}



// ===================  END: REPLACE THE REACTION CONTAINER BLOCK  ===================
// ======================================================================================
// ======================================================================================
    }
// ======================================================================================

        logElement.appendChild(messageWrapper);
        if (currentSpeakerId && !options.isThinking) {
            lastSpeakerPerLog.set(logElement, currentSpeakerId);
        }
               // UNIFIED SCROLL LOGIC:
        // This logic correctly handles multiple scenarios:
        // 1. New Chat: `isScrolledToBottom` (checked before adding content) will be true as history is appended, ensuring the view scrolls down.
        // 2. User Sends Message: The first condition is met, so it always scrolls to show the user's new message.
        // 3. Incoming Message (user at bottom): `isScrolledToBottom` is true, so the chat follows along in real-time.
        // 4. Incoming Message (user scrolled up): Both conditions are false, preserving the user's reading position.
        if (senderClass.includes('user') || isScrolledToBottom) {
            scrollChatLogToBottom(logElement);
        }
        return messageWrapper;
    }

    
    // **** LANDMARK: ADD NEW METHOD PLACEHOLDERS STARTING HERE ****
    // These are the new methods needed by reaction_handler.ts.
    // Add them within the scope of your main IIFE, alongside your existing methods.

     // Inside chat_ui_updater.ts
     const showUnifiedInteractionMenu = (
        triggerBubbleElement: HTMLElement, 
        currentUserReaction?: string
    ): void => {
        // ... (initial checks, hide previous menu) ...

        const wrapper = triggerBubbleElement.closest<HTMLElement>('.chat-message-wrapper');
        if (!wrapper) return;
        wrapperForActiveUnifiedMenu = wrapper; // <<< STORE THE WRAPPER
        
        // Remove any old menu from this specific wrapper
        wrapper.querySelector<HTMLElement>('.unified-context-menu-instance')?.remove();

        activeUnifiedMenuElement = document.createElement('div');
        activeUnifiedMenuElement.className = 'unified-context-menu-instance'; 
        // ... (populate innerHTML with reaction bar and action bar as before) ...
        // (Ensure buttons have data-unified-menu-emoji and data-unified-menu-action)
        let reactionButtonsHTML = "";
        ['👍', '❤️', '😂', '😯', '😢', '😡'].forEach(emoji => {
            const isSelected = currentUserReaction === emoji ? 'selected-reaction' : '';
            reactionButtonsHTML += `<button class="reaction-btn-in-menu ${isSelected}" data-unified-menu-emoji="${emoji}" aria-label="React with ${emoji}">${emoji}</button>`;
        });
        activeUnifiedMenuElement.innerHTML = `
            <div class="reaction-bar-in-menu">
                ${reactionButtonsHTML}
            </div>
            <div class="action-bar-in-menu">
                <button class="action-btn-item-in-menu" data-unified-menu-action="copy"><i class="fas fa-copy"></i> <span>Copy Text</span></button>
                <button class="action-btn-item-in-menu" data-unified-menu-action="translate"><i class="fas fa-language"></i> <span>Translate</span></button>
            </div>
        `;

        // *** KEY CHANGE: Append to the WRAPPER, not the BUBBLE ***
        wrapper.appendChild(activeUnifiedMenuElement); 
        currentlyAttachedBubbleForMenu = triggerBubbleElement; // Still useful to know which bubble triggered it

        // CSS will handle positioning relative to the wrapper/bubble
        requestAnimationFrame(() => {
            if (activeUnifiedMenuElement) {
                activeUnifiedMenuElement.classList.add('visible');
            }
        });
        console.log("[CUU] Unified interaction menu created and appended to wrapper, attempting to make visible.");
    };

    const hideUnifiedInteractionMenu = (): void => {
        if (activeUnifiedMenuElement) {
            console.log("[CUU] Hiding unified interaction menu.");
            activeUnifiedMenuElement.classList.remove('visible');
            // Optional: Remove the element after transition or immediately
            // For dynamically created menus, it's good to remove them:
            const parentBubble = currentlyAttachedBubbleForMenu;
            setTimeout(() => { // Allow fade-out transition
                if (activeUnifiedMenuElement && activeUnifiedMenuElement.parentElement) {
                    activeUnifiedMenuElement.remove();
                }
                if (parentBubble) { // Clean up trigger class from the bubble
                    parentBubble.classList.remove('mobile-menu-trigger');
                }
                activeUnifiedMenuElement = null; 
                currentlyAttachedBubbleForMenu = null;
                wrapperForActiveUnifiedMenu = null; // <<< RESET THE WRAPPER
            }, 200); // Match your CSS transition duration
        }
    };

    const updateDisplayedReactionOnBubble = (
        messageWrapperElement: HTMLElement, 
        newEmoji: string | null
    ): void => {
        if (!domElements || !polyglotHelpers) return; // Ensure deps
    
        let reactionsContainer = messageWrapperElement.querySelector<HTMLElement>('.message-reactions');
    
        // If newEmoji is null, we're clearing the reaction
        if (newEmoji === null) {
            if (reactionsContainer) {
                reactionsContainer.innerHTML = ''; // Clear all reactions
                // Or, if you want to be more specific and only remove the user's reaction
                // while keeping others (e.g., in a group chat where multiple people can react):
                // const userReactionBadge = reactionsContainer.querySelector(`.reaction-item[data-user-reaction="true"]`);
                // if (userReactionBadge) userReactionBadge.remove();
            }
            console.log("[CUU] Cleared displayed reaction badge for wrapper:", messageWrapperElement.dataset.messageId);
            return;
        }
    
        // If we need to display a reaction
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            // Append it. Position depends on your CSS for .message-reactions
            // (e.g., absolute positioned at bottom of wrapper, or after the bubble)
            const bubble = messageWrapperElement.querySelector('.chat-message-ui');
            if (bubble) {
                bubble.insertAdjacentElement('afterend', reactionsContainer); // Common placement
            } else {
                messageWrapperElement.appendChild(reactionsContainer); // Fallback
            }
        }
    
        // For simplicity, this example clears and adds the new one.
        // A more complex version would handle multiple different emojis and counts.
        reactionsContainer.innerHTML = ''; // Clear previous before adding new
    
        const reactionEl = document.createElement('button'); // Use button for accessibility
        reactionEl.className = 'reaction-item';
        reactionEl.type = 'button';
        // reactionEl.dataset.userReaction = "true"; // Mark it as the user's reaction
        
        // For now, assume count is 1 (user's own reaction). 
        // Reaction_handler's updateReactionInData handles data; this is just UI.
        reactionEl.innerHTML = `${polyglotHelpers.sanitizeTextForDisplay(newEmoji)} <span class="reaction-count">1</span>`;
        reactionsContainer.appendChild(reactionEl);
        console.log(`[CUU] Updated displayed reaction badge to ${newEmoji} for wrapper:`, messageWrapperElement.dataset.messageId);
    };

    const isEventInsideUnifiedInteractionMenu = (event: Event): boolean => {
        console.log("[CUU_DEBUG] isEventInsideUnifiedInteractionMenu called. activeUnifiedMenuElement:", activeUnifiedMenuElement, "event.target:", event.target);
        if (!activeUnifiedMenuElement || !event.target) {
            return false;
        }
        const isInside = activeUnifiedMenuElement.contains(event.target as Node);
        console.log("[CUU_DEBUG] isEventInsideUnifiedInteractionMenu result:", isInside);
        return isInside;
    };
    // --- Optional methods (implement fully if you use their specific features) ---
    const isUnifiedInteractionMenuVisibleForBubble = (triggerBubbleElement: HTMLElement): boolean => {
        return !!(activeUnifiedMenuElement && 
                  activeUnifiedMenuElement.classList.contains('visible') &&
                  currentlyAttachedBubbleForMenu === triggerBubbleElement);
    };

    const isUnifiedInteractionMenuVisible = (): boolean => {
        return !!(activeUnifiedMenuElement && activeUnifiedMenuElement.classList.contains('visible'));
    };

    const showMenuActionFeedback = (menuButtonElement: HTMLElement, feedbackText: string): void => {
        console.warn("ChatUiUpdater: showMenuActionFeedback NOT IMPLEMENTED (optional).", { menuButtonElement, feedbackText });
        // Example:
        // const originalContent = menuButtonElement.innerHTML;
        // menuButtonElement.innerHTML = `<span>${feedbackText}</span>`;
        // setTimeout(() => { menuButtonElement.innerHTML = originalContent; }, 1500);
    };

    const updateMenuTranslateButtonText = (
        menuButtonElement: HTMLElement,
        newButtonText: string
    ): void => {
        if (!menuButtonElement) return;
        console.log("[CUU] updateMenuTranslateButtonText for:", menuButtonElement, "New Text:", newButtonText);
    
        const span = menuButtonElement.querySelector('span');
        if (span) {
            span.textContent = polyglotHelpers.sanitizeTextForDisplay(newButtonText);
        } else {
            // Fallback if structure is different, though the above methods should maintain it
            let iconHTML = "";
            const iconElement = menuButtonElement.querySelector('i');
            if (iconElement) {
                iconHTML = iconElement.outerHTML + " ";
            }
            menuButtonElement.innerHTML = `${iconHTML}<span>${polyglotHelpers.sanitizeTextForDisplay(newButtonText)}</span>`;
        }
        // Typically, you might also update a data attribute if the action itself changes
        // e.g., menuButtonElement.dataset.currentActionState = newButtonText;
    };

    const showMenuActionInProgress = (
        menuButtonElement: HTMLElement,
        progressText: string
    ): void => {
        if (!menuButtonElement) return;
        console.log("[CUU] showMenuActionInProgress for:", menuButtonElement, "Text:", progressText);
    
        // Store original content if you want to revert perfectly
        // (Alternative: just reconstruct based on action)
        if (!menuButtonElement.dataset.originalHtml) {
            menuButtonElement.dataset.originalHtml = menuButtonElement.innerHTML;
        }
        // Assuming your button has an icon (<i class="..."></i>) and a <span> for text
        menuButtonElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>${polyglotHelpers.sanitizeTextForDisplay(progressText)}</span>`;
        (menuButtonElement as HTMLButtonElement).disabled = true;
        menuButtonElement.classList.add('action-in-progress'); // Add a class for styling
    };

    const resetMenuActionInProgress = (
        menuButtonElement: HTMLElement,
        defaultTextAfterProgress: string
    ): void => {
        if (!menuButtonElement) return;
        console.log("[CUU] resetMenuActionInProgress for:", menuButtonElement, "Default Text:", defaultTextAfterProgress);
    
        // Reconstruct based on what the defaultTextAfterProgress implies
        // This assumes the action 'translate' is the only one using this complex state.
        let iconClass = "fas fa-language"; // Default for 'Translate'
        if (defaultTextAfterProgress === "Original") {
            // You might want a different icon for "Show Original", or keep it the same.
            // For simplicity, keeping it fas fa-language.
        }
    
        menuButtonElement.innerHTML = `<i class="${iconClass}"></i> <span>${polyglotHelpers.sanitizeTextForDisplay(defaultTextAfterProgress)}</span>`;
        (menuButtonElement as HTMLButtonElement).disabled = false;
        menuButtonElement.classList.remove('action-in-progress');
        // delete menuButtonElement.dataset.originalHtml; // Clean up
    };
    

    // **** ADD THIS FUNCTION DEFINITION ****
    const getWrapperForActiveUnifiedMenu = (): HTMLElement | null => {
        console.log("[CUU_DEBUG] getWrapperForActiveUnifiedMenu called. Returning:", wrapperForActiveUnifiedMenu);
        return wrapperForActiveUnifiedMenu;
    };


    return {
        initialize,
        appendSystemMessage,
        appendChatMessage,
        scrollChatLogToBottom,
        clearLogCache,

        // --- Add the new method names to the returned object ---
        showUnifiedInteractionMenu,
        hideUnifiedInteractionMenu,
        updateDisplayedReactionOnBubble,
        isEventInsideUnifiedInteractionMenu,
        // Add optional ones if you are implementing them right away or want them on the interface
        isUnifiedInteractionMenuVisibleForBubble,
        isUnifiedInteractionMenuVisible,
        showMenuActionFeedback,
        updateMenuTranslateButtonText,
        showMenuActionInProgress,
        resetMenuActionInProgress,
        getWrapperForActiveUnifiedMenu, // <<< ADD THIS LINE
        showLoadingInEmbeddedChatLog,
        showErrorInEmbeddedChatLog,
    };
})(); // End of IIFE

window.chatUiUpdater = chatUiUpdater;
document.dispatchEvent(new CustomEvent('chatUiUpdaterReady'));
console.log('chat_ui_updater.ts: "chatUiUpdaterReady" event dispatched.');

function getDeps(): { domElements: any; polyglotHelpers: any; } {
    throw new Error('Function not implemented.');
}
