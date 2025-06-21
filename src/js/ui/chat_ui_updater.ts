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
    appendSystemMessage(logEl: HTMLElement | null, text: string, isError?: boolean, isTimestamp?: boolean): HTMLElement | null;
    appendChatMessage(logElement: HTMLElement | null, text: string, senderClass: string, options?: ChatMessageOptions): HTMLElement | null;
    scrollChatLogToBottom(chatLogElement: HTMLElement | null): void;
    clearLogCache(logElement: HTMLElement): void;
}

const chatUiUpdater: ChatUiUpdaterModule = (() => {
    'use strict';

    // These variables are now privately scoped to this chat rendering module
    let domElements: YourDomElements;
    let polyglotHelpers: PolyglotHelpers;
    const lastDisplayedTimestamps: Map<HTMLElement, Date> = new Map();
    const lastSpeakerPerLog: Map<HTMLElement, string> = new Map();
    const TIME_DIFFERENCE_THRESHOLD_MINUTES = 30;

    function getDepsLocal() {
        return { domElements, polyglotHelpers };
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
      
        console.log('[CHAT_UI_DEBUG] appendChatMessage called for sender:', senderClass);
        // Log a clean snapshot of the options object to see exactly what was passed in.
        console.log('[CHAT_UI_DEBUG] FULL OPTIONS RECEIVED:', JSON.parse(JSON.stringify(options))); 
        if (!options.messageId) {
            console.error('[CHAT_UI_DEBUG] CRITICAL: The `messageId` property is MISSING from the options object passed to appendChatMessage!');
        }
      
        const { polyglotHelpers: currentPolyglotHelpers, domElements: currentDomElements } = getDepsLocal();
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
        
        const messageWrapper = document.createElement('div');

        
        
        
        console.log('[CHAT_UI_DEBUG] Creating message wrapper. Checking for messageId in options...');
        if (options.messageId) {
            messageWrapper.dataset.messageId = options.messageId;
            console.log(`[CHAT_UI_DEBUG] SUCCESS: Set data-message-id to "${options.messageId}" on the wrapper.`);
        } else {
            console.warn('[CHAT_UI_DEBUG] WARNING: No messageId was provided in options, so data-message-id was NOT set on the wrapper.');
        }
        // Let's inspect the dataset immediately after trying to set it.
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
        if (currentSpeakerId) messageWrapper.dataset.speakerId = currentSpeakerId;

        if (options.type === 'call_event' || senderClass === 'system-call-event') {
            messageWrapper.classList.add('system-event-wrapper');
            messageDiv.classList.add('call-event-message');
            let eventIconHtml = '', callActionHtml = '', eventMainText = currentPolyglotHelpers.sanitizeTextForDisplay(text || ""), eventDetailsHtml = '';
            switch (options.eventType) {
                case 'call_started': eventIconHtml = '<i class="fas fa-phone-alt call-event-icon call-started"></i> '; break;
                case 'call_ended':
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-ended"></i> ';
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_back" data-connector-id="${options.connectorIdForButton || ''}" data-session-id="${options.callSessionId || ''}">CALL BACK</button><button class="call-event-action-btn summary-btn" data-action="view_summary" data-session-id="${options.callSessionId || ''}">VIEW SUMMARY</button>`; break;
                case 'call_failed_user_attempt':
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> ';
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorIdForButton || ''}">CALL AGAIN</button>`; break;
                case 'call_missed_connector':
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> ';
                    eventMainText = `${options.connectorNameForDisplay || 'Partner'} missed your call.`;
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorIdForButton || ''}">CALL AGAIN</button>`; break;
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
            
            requestAnimationFrame(() => {
                if (document.getElementById(waveformContainerId) && (window as any).WaveSurfer) {
                    try {
                        const wavesurfer = (window as any).WaveSurfer.create({ container: `#${waveformContainerId}`, waveColor: senderClass.includes('user') ? 'rgba(255, 255, 255, 0.5)' : 'rgba(100, 100, 100, 0.5)', progressColor: senderClass.includes('user') ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)', barWidth: 2, barRadius: 2, cursorWidth: 0, height: 30, barGap: 2, responsive: true, hideScrollbar: true });
                        wavesurfer.load(options.audioSrc);
                        const btnElement = document.getElementById(playButtonId);
                        if(btnElement) {
                            btnElement.onclick = () => wavesurfer.playPause();
                            wavesurfer.on('play', () => { btnElement.innerHTML = '<i class="fas fa-pause"></i>'; });
                            wavesurfer.on('pause', () => { btnElement.innerHTML = '<i class="fas fa-play"></i>'; });
                            wavesurfer.on('finish', () => { btnElement.innerHTML = '<i class="fas fa-play"></i>'; wavesurfer.seekTo(0); });
                        }
                    } catch(e) { /* Fallback to simple audio player */ }
                }
            });

            if (text && text.trim() !== "") {
                const transcriptSpan = document.createElement('span');
                transcriptSpan.className = 'voice-memo-transcript';
                transcriptSpan.textContent = `(Transcript: ${currentPolyglotHelpers.sanitizeTextForDisplay(text)})`;
                messageDiv.appendChild(transcriptSpan);
            }
            messageWrapper.appendChild(messageDiv);

        } else { // Regular text/image message
            messageWrapper.classList.add('chat-message-wrapper');
            messageDiv.classList.add('chat-message-ui');
            if (senderClass.includes('user')) { messageWrapper.classList.add('user-wrapper'); messageDiv.classList.add('user'); } 
            else if (senderClass.includes('system-message')) { messageWrapper.classList.add('system-message-wrapper'); messageDiv.classList.add('system-message'); } 
            else { messageWrapper.classList.add('connector-wrapper'); messageDiv.classList.add('connector'); }
            
            if (options.isThinking) messageDiv.classList.add('connector-thinking');
            if (options.isError) messageDiv.classList.add('error-message-bubble');

            let contentHtml = '';
            const isGroupChatLog = logElement?.id === currentDomElements?.groupChatLogDiv?.id;
            if (options.senderName && !senderClass.includes('user') && !options.isThinking && options.showSenderName !== false && isGroupChatLog) {
                contentHtml += `<strong class="chat-message-sender-name">${currentPolyglotHelpers.sanitizeTextForDisplay(options.senderName)}</strong>`;
            }
            if (options.imageUrl) {
                if (options.imageUrl === 'image_expired') {
                    // This is our special placeholder for an expired image
                    contentHtml += `<div class="chat-message-expired-image">
                                        <i class="fas fa-image-slash"></i>
                                        <span>[Image expired after 24 hours]</span>
                                    </div>`;
                } else {
                    // This is a normal, valid image URL
                    contentHtml += `<img src="${currentPolyglotHelpers.sanitizeTextForDisplay(options.imageUrl)}" alt="Chat Image" class="chat-message-image">`;
                }
            }
            if (text && text.trim() !== "") {
                if (options.imageUrl) contentHtml += '<br>';
                let processedText = currentPolyglotHelpers.sanitizeTextForDisplay(text);
                processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
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

if (!messageWrapper.classList.contains('system-event-wrapper') && !messageWrapper.classList.contains('system-message-wrapper')) {
    
    // The `messageDiv` variable IS the message bubble. We will add the menu directly to it.

    // 1. Create the Reaction Picker (for hover/long-press)
    const reactionPicker = document.createElement('div');
    reactionPicker.className = 'reaction-picker';
    ['👍', '❤️', '😂', '😯', '😢', '😡'].forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'reaction-btn';
        button.type = 'button';
        button.textContent = emoji;
        button.setAttribute('aria-label', `React with ${emoji}`);
        reactionPicker.appendChild(button);
    });
    messageDiv.appendChild(reactionPicker);

    // 2. Create YOUR Action Menu (for right-click)
    const actionMenu = document.createElement('div');
    actionMenu.className = 'action-menu';
    actionMenu.innerHTML = `
        <button class="action-btn-item" data-action="copy" title="Copy message text"><i class="fas fa-copy"></i><span>Copy</span></button>
        <button class="action-btn-item" data-action="translate" title="Translate message"><i class="fas fa-language"></i><span>Translate</span></button>
    `;
    // Append the menu directly to the bubble. This now works correctly.
    messageDiv.appendChild(actionMenu);

    // 3. Create the container for displaying selected reactions
    const reactionsContainer = document.createElement('div');
    reactionsContainer.className = 'message-reactions';

    if (options.reactions) {
        const userReactionEmoji = Object.keys(options.reactions).find(emoji => 
            options.reactions![emoji].includes('user_player')
        );

        if (userReactionEmoji) {
            messageWrapper.dataset.userReaction = userReactionEmoji;
            const reactionEl = document.createElement('button');
            reactionEl.className = 'reaction-item';
            reactionEl.type = 'button';
            const reactionCount = options.reactions[userReactionEmoji].length;
            reactionEl.innerHTML = `${userReactionEmoji} <span class="reaction-count">${reactionCount}</span>`;
            reactionsContainer.appendChild(reactionEl);
        }
    }
    
    messageWrapper.appendChild(reactionsContainer);
}
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

    return {
        initialize,
        appendSystemMessage,
        appendChatMessage,
        scrollChatLogToBottom,
        clearLogCache
    };
})();

window.chatUiUpdater = chatUiUpdater;
document.dispatchEvent(new CustomEvent('chatUiUpdaterReady'));
console.log('chat_ui_updater.ts: "chatUiUpdaterReady" event dispatched.');