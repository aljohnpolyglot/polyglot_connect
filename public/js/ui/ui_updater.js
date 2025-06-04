// js/ui/ui_updater.js
// Contains functions to update specific parts of the UI.

window.uiUpdater = (() => {
    const getDeps = () => ({ // Lazy load dependencies to avoid race conditions
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers
    });

    /**
     * Append a chat message to the provided log element.
     * @param {Element} logElement - The log element to append the message to.
     * @param {string} text - The text of the message to append.
     * @param {string} senderClass - The class to apply to the message (user, connector, system-message).
     * @param {object} options - Optional parameters:
     *   - senderName: The name of the sender (for AI/Connector messages).
     *   - imageUrl: The URL of an image to display with the message.
     *   - isThinking: Whether the message is a thinking indicator.
     *   - isError: Whether the message is an error message.
     *   - avatarUrl: The URL of the avatar to display with the message.
     * @returns {Element} - The newly appended message wrapper.
     */
  function appendChatMessage(logElement, text, senderClass, options = {}) {
        const functionName = "appendChatMessage";
        const { polyglotHelpers, domElements } = getDeps();

        if (!logElement || !polyglotHelpers) {
            console.warn(`UI Updater (${functionName}): Log element or polyglotHelpers not found. Cannot append.`);
            return null;
        }

        const messageWrapper = document.createElement('div');
        const messageDiv = document.createElement('div');

        // --- START: Call Event Message Rendering ---
        if (options.type === 'call_event' || senderClass === 'system-call-event') {
            messageWrapper.classList.add('system-event-wrapper'); // For centering
            messageDiv.classList.add('call-event-message');     // Main styling for the event block

            let eventIconHtml = '';
            let callActionHtml = ''; // For "CALL BACK" or "CALL AGAIN"

            // Determine icon and action based on eventType
            switch (options.eventType) {
                case 'call_started':
                    eventIconHtml = '<i class="fas fa-phone-alt call-event-icon call-started"></i> ';
                    // No action button for "call started" typically
                    break;
                case 'call_ended':
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-ended"></i> ';
                    
                    // Ensure options.callSessionId is available here.
                    // It should be passed from chat_session_handler.js when rendering messages.
                    let sessionIdForButton = options.callSessionId || ''; 

                    callActionHtml = `
                        <button class="call-event-action-btn" data-action="call_back" data-connector-id="${options.connectorId || ''}" data-session-id="${sessionIdForButton}">CALL BACK</button>
                        <button class="call-event-action-btn summary-btn" data-action="view_summary" data-session-id="${sessionIdForButton}">VIEW SUMMARY</button>
                    `;
                    break;
                case 'call_failed_user_attempt': // User tried to call, but it failed to connect or was cancelled by user
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> '; // Using 'missed' style for now
                    // Add "CALL AGAIN" button/link
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorId || ''}">CALL AGAIN</button>`;
                    break;
                case 'call_missed_connector': // Connector didn't pick up (hypothetical, harder to detect client-side)
                    eventIconHtml = '<i class="fas fa-phone-slash call-event-icon call-missed"></i> ';
                    text = `${options.connectorName || 'Partner'} missed your call.`; // Override text
                    callActionHtml = `<button class="call-event-action-btn" data-action="call_again" data-connector-id="${options.connectorId || ''}">CALL AGAIN</button>`;
                    break;
                default:
                    eventIconHtml = '<i class="fas fa-info-circle call-event-icon"></i> '; // Generic event
            }

            let mainText = polyglotHelpers.sanitizeTextForDisplay(text || "Call event occurred.");
            let detailsHtml = '';

            if (options.duration) {
                detailsHtml += `<span class="call-event-detail duration"><i class="far fa-clock"></i> ${polyglotHelpers.sanitizeTextForDisplay(options.duration)}</span>`;
            }

            const eventTime = new Date(options.timestamp || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
           if (detailsHtml && eventTime) { // If duration was added, and we have eventTime
            detailsHtml += ' | '; // Add a separator
            }
            if (eventTime) { // Ensure eventTime is valid before adding
            detailsHtml += `<span class="call-event-detail time">${eventTime}</span>`;
            }

            messageDiv.innerHTML = `
                <div class="call-event-main-text">${eventIconHtml}${mainText}</div>
                <div class="call-event-details-container">${detailsHtml}</div>
                ${callActionHtml ? `<div class="call-event-actions">${callActionHtml}</div>` : ''}
            `;
            
            messageWrapper.appendChild(messageDiv);

        } else { // --- START: Regular Chat Message Rendering ---
            messageWrapper.classList.add('chat-message-wrapper');
            // Determine alignment based on sender
            if (senderClass.includes('user')) {
                messageWrapper.classList.add('user-wrapper');
            } else if (senderClass.includes('system-message')) {
                 messageWrapper.classList.add('system-message-wrapper'); // For centering system messages
            } 
            else {
                messageWrapper.classList.add('connector-wrapper');
            }


            messageDiv.classList.add('chat-message-ui');
            if (senderClass && typeof senderClass === 'string') {
                const classes = senderClass.split(' ').filter(cls => cls.trim() !== '');
                if (classes.length > 0) messageDiv.classList.add(...classes);
            }

            if (options.isThinking) messageDiv.classList.add('connector-thinking');
            if (options.isError) messageDiv.classList.add('error-message-bubble');

            let avatarHtml = '';
            // Add avatar for connector messages, but not for system messages or user messages
            if (!senderClass.includes('user') && !senderClass.includes('system-message') && options.avatarUrl) {
                avatarHtml = `<img src="${polyglotHelpers.sanitizeTextForDisplay(options.avatarUrl)}" 
                                   alt="${polyglotHelpers.sanitizeTextForDisplay(options.senderName || 'Partner')}" 
                                   class="chat-bubble-avatar left-avatar" 
                                   onerror="this.src='${domElements?.placeholderAvatar?.src || 'images/placeholder_avatar.png'}';">`;
                messageWrapper.classList.add('has-avatar-left');
            }

            let contentHtml = '';
            if (options.senderName && !senderClass.includes('user') && !senderClass.includes('system-message') && !senderClass.includes('connector-thinking') && options.showSenderName !== false) {
                contentHtml += `<strong class="chat-message-sender-name">${polyglotHelpers.sanitizeTextForDisplay(options.senderName)}:</strong><br>`;
            }

            if (text) {
                let processedText = polyglotHelpers.sanitizeTextForDisplay(text);
                // Basic markdown for bold and italics
                processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
                contentHtml += `<span class="chat-message-text">${processedText}</span>`;
            }

            if (options.imageUrl) {
                if (text || contentHtml) contentHtml += '<br>'; // Add line break if there's text before image
                contentHtml += `<img src="${polyglotHelpers.sanitizeTextForDisplay(options.imageUrl)}" alt="Chat Image" class="chat-message-image">`;
            }

            messageDiv.innerHTML = contentHtml;

            if (avatarHtml && messageWrapper.classList.contains('has-avatar-left')) {
                messageWrapper.innerHTML = avatarHtml; // Add avatar first
                messageWrapper.appendChild(messageDiv);  // Then add message bubble
            } else {
                messageWrapper.appendChild(messageDiv); // Just the message bubble
            }
            if (options.messageId) messageWrapper.dataset.messageId = options.messageId;
        } // --- END: Regular Chat Message Rendering ---

        logElement.appendChild(messageWrapper);
        // Scroll to bottom
        requestAnimationFrame(() => {
            if (logElement.scrollHeight > logElement.clientHeight) {
                 logElement.scrollTop = logElement.scrollHeight;
            }
        });
        return messageWrapper;
    }
    
function scrollChatLogToBottom(chatLogElement) {
        if (chatLogElement) {
            // Use requestAnimationFrame for smoother scrolling after DOM updates
            requestAnimationFrame(() => {
                chatLogElement.scrollTop = chatLogElement.scrollHeight;
                // console.debug("uiUpdater: Scrolled chat log to bottom:", chatLogElement.id);
            });
        } else {
            console.warn("uiUpdater.scrollChatLogToBottom: Provided chatLogElement is null or undefined.");
        }
    }

    // Specific function for embedded chat (calls the generic one)
    function scrollEmbeddedChatToBottom() {
        const { domElements } = getDeps(); // Or window.domElements
        if (domElements?.embeddedChatLog) {
            scrollChatLogToBottom(domElements.embeddedChatLog);
        } else {
            console.warn("uiUpdater.scrollEmbeddedChatToBottom: domElements.embeddedChatLog not found.");
        }
    }

    // Specific function for modal chat (calls the generic one)
    function scrollMessageModalToBottom() {
        const { domElements } = getDeps(); // Or window.domElements
        if (domElements?.messageChatLog) { // This is the ID for the modal's chat log
            scrollChatLogToBottom(domElements.messageChatLog);
        } else {
            console.warn("uiUpdater.scrollMessageModalToBottom: domElements.messageChatLog not found.");
        }
    }
    function showImageInActivityArea(activityAreaElement, imageDisplayElement, logElementToScroll, imageUrl) {
        if (!activityAreaElement || !imageDisplayElement || !logElementToScroll) {
            console.warn("showImageInActivityArea: Missing one or more DOM elements.");
            return;
        }
        if (imageUrl) {
            imageDisplayElement.src = imageUrl;
            activityAreaElement.style.display = 'block'; // Or 'flex' or your preferred display style
            requestAnimationFrame(() => {
                logElementToScroll.scrollTop = logElementToScroll.scrollHeight;
            });
        } else {
            imageDisplayElement.src = '';
            activityAreaElement.style.display = 'none';
        }
    }

     const populateListInRecap = (ulElement, itemsArray, itemType = 'simple') => {
        const functionName = "populateListInRecap";
        const { polyglotHelpers } = getDeps();

        if (!ulElement) {
            // console.warn(`UI Updater (${functionName}): ulElement is MISSING for itemType '${itemType}'. Cannot populate list.`);
            return; // Silently return if the UL element itself is not found
        }
        if (!polyglotHelpers) {
            console.error(`UI Updater (${functionName}): polyglotHelpers IS MISSING for itemType '${itemType}'. Cannot populate list correctly.`);
            ulElement.innerHTML = '<li>Error: UI Helper missing.</li>';
            return;
        }
        
        ulElement.innerHTML = ''; // Clear previous items FIRST

        if (!itemsArray || !Array.isArray(itemsArray) || itemsArray.length === 0) {
            // Handle empty or invalid itemsArray gracefully
            const li = document.createElement('li');
            li.classList.add('recap-list-placeholder-item'); // Add a class for styling placeholders
            switch (itemType) {
                case 'vocabulary':
                case 'improvementArea':
                    li.textContent = 'None noted for this session.';
                    break;
                case 'simple': // For keyTopics, goodUsage, practiceActivities
                default:
                    li.textContent = 'N/A'; // Or "No specific items noted."
                    break;
            }
            ulElement.appendChild(li);
            // console.log(`UI Updater (${functionName}): Populated placeholder for empty/invalid itemsArray for itemType '${itemType}'.`);
            return;
        }

        // If we reach here, itemsArray is a non-empty array
        // console.log(`UI Updater (${functionName}): Populating list for itemType '${itemType}' with ${itemsArray.length} items.`);
        itemsArray.forEach((itemData, index) => {
            const li = document.createElement('li');
            try {
                if (itemType === 'simple') {
                    if (typeof itemData === 'string') {
                        li.innerHTML = `<i class="fas fa-check-circle recap-item-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(itemData)}`;
                    } else {
                        console.warn(`UI Updater (${functionName}): Expected string for 'simple' item type, got:`, itemData);
                        li.innerHTML = `<i class="fas fa-question-circle recap-item-icon"></i> Invalid data format`;
                    }
                } else if (itemType === 'vocabulary') {
                    if (typeof itemData === 'object' && itemData !== null && itemData.term) {
                        let vocabHtml = `<i class="fas fa-book-open recap-item-icon"></i> <strong>${polyglotHelpers.sanitizeTextForDisplay(itemData.term)}</strong>`;
                        if (itemData.translation) vocabHtml += `: ${polyglotHelpers.sanitizeTextForDisplay(itemData.translation)}`;
                        if (itemData.exampleSentence) vocabHtml += `<br><em class="recap-example">E.g.: "${polyglotHelpers.sanitizeTextForDisplay(itemData.exampleSentence)}"</em>`;
                        li.innerHTML = vocabHtml;
                    } else {
                         // Handle case where itemData might be "N/A - Short conversation" if ai_recap_service wasn't updated
                        if (typeof itemData === 'string') {
                            li.innerHTML = `<i class="fas fa-info-circle recap-item-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(itemData)}`;
                        } else {
                            console.warn(`UI Updater (${functionName}): Invalid format for 'vocabulary' item [${index}]:`, itemData);
                            li.innerHTML = `<i class="fas fa-exclamation-triangle recap-item-icon"></i> Malformed vocabulary entry`;
                        }
                    }
                } else if (itemType === 'improvementArea') {
                     if (typeof itemData === 'object' && itemData !== null && itemData.areaType) {
                        let improvementHtml = `<div class="improvement-item">`;
                        improvementHtml += `<div class="improvement-area-header"><i class="fas fa-pencil-alt recap-item-icon"></i> <strong>${polyglotHelpers.sanitizeTextForDisplay(itemData.areaType)}:</strong></div>`;
                        if (itemData.userInputExample && String(itemData.userInputExample).trim() !== "") improvementHtml += `<div class="recap-user-input">You said: "<em>${polyglotHelpers.sanitizeTextForDisplay(itemData.userInputExample)}</em>"</div>`;
                        if (itemData.coachSuggestion) improvementHtml += `<div class="recap-coach-suggestion">Suggestion: "<strong>${polyglotHelpers.sanitizeTextForDisplay(itemData.coachSuggestion)}</strong>"</div>`;
                        if (itemData.explanation) improvementHtml += `<div class="recap-explanation">Why: ${polyglotHelpers.sanitizeTextForDisplay(itemData.explanation)}</div>`;
                        if (itemData.exampleWithSuggestion) improvementHtml += `<div class="recap-example">Example: "<em>${polyglotHelpers.sanitizeTextForDisplay(itemData.exampleWithSuggestion)}</em>"</div>`;
                        improvementHtml += `</div>`;
                        li.innerHTML = improvementHtml;
                        li.classList.add('improvement-list-item'); // Keep your class for styling
                    } else {
                        // Handle case where itemData might be "N/A - Short conversation"
                        if (typeof itemData === 'string') {
                            li.innerHTML = `<i class="fas fa-info-circle recap-item-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(itemData)}`;
                        } else {
                            console.warn(`UI Updater (${functionName}): Invalid format for 'improvementArea' item [${index}]:`, itemData);
                            li.innerHTML = `<i class="fas fa-exclamation-triangle recap-item-icon"></i> Malformed improvement entry`;
                        }
                    }
                } else { // Fallback for unknown itemType
                    li.textContent = typeof itemData === 'string' ? polyglotHelpers.sanitizeTextForDisplay(itemData) : JSON.stringify(itemData);
                }
            } catch (error) {
                console.error(`UI Updater (${functionName}): Error processing item [${index}] for type '${itemType}':`, error, "Item data:", itemData);
                li.innerHTML = `<i class="fas fa-exclamation-triangle recap-item-icon"></i> Error displaying item`;
            }
            ulElement.appendChild(li);
        });
    };

    function appendSystemMessage(logElement, text, isError = false) {
        if (!logElement) {
            console.warn("uiUpdater.appendSystemMessage: Log element not found.");
            return null;
        }
        const options = { isError: isError }; // No senderName needed for system messages
        // Construct the class string carefully. appendChatMessage will split it.
        let systemClasses = 'system-message';
        if (isError) {
            systemClasses += ' error'; // This will become 'system-message error'
        }
        return appendChatMessage(logElement, text, systemClasses, options);
    }

    // All other UI update functions from your previous complete version:
    return {
        updateVirtualCallingScreen: (connector, sessionTypeAttempt) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers || !connector) return;
            if (domElements.callingAvatar) domElements.callingAvatar.src = connector.avatarModern || 'images/placeholder_avatar.png';
            if (domElements.callingName) domElements.callingName.textContent = `Connecting to ${polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name)}...`;
            if (domElements.callingStatus) domElements.callingStatus.textContent = `Attempting ${sessionTypeAttempt.replace('_modal', '')}... Ringing...`;
        },
        appendToVoiceChatLog: (text, senderClass, options = {}) => {
            const { domElements } = getDeps();
            return appendChatMessage(domElements?.voiceChatLog, text, senderClass, options);
        },
        showImageInVoiceChat: (imageUrl) => {
            const { domElements } = getDeps();
            showImageInActivityArea(domElements?.voiceChatActivityArea, domElements?.voiceChatActivityImageDisplay, domElements?.voiceChatLog, imageUrl);
        },
        updateVoiceChatHeader: (connector) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers || !connector) return;
            if (domElements.voiceChatActiveAvatar) domElements.voiceChatActiveAvatar.src = connector.avatarModern || 'images/placeholder_avatar.png';
            if (domElements.voiceChatActiveName) domElements.voiceChatActiveName.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name);
        },
        clearVoiceChatLog: () => {
            const { domElements } = getDeps();
            if (domElements?.voiceChatLog) domElements.voiceChatLog.innerHTML = '';
            if (domElements?.voiceChatActivityArea) domElements.voiceChatActivityArea.style.display = 'none';
            if (domElements?.voiceChatActivityImageDisplay) domElements.voiceChatActivityImageDisplay.src = '';
        },
        resetVoiceChatInput: () => {
            const { domElements } = getDeps();
            if (!domElements) return;
            if (domElements.voiceChatTextInput) domElements.voiceChatTextInput.value = '';
            if (domElements.voiceChatSendTextBtn) domElements.voiceChatSendTextBtn.style.display = 'none';
            if (domElements.voiceChatTapToSpeakBtn) {
                const btn = domElements.voiceChatTapToSpeakBtn;
                btn.classList.remove('listening', 'processing', 'mic-active');
                btn.innerHTML = '<i class="fas fa-microphone"></i>';
                btn.disabled = false;
                btn.title = "Tap to Speak";
            }
        },
        updateVoiceChatTapToSpeakButton: (state, text = '') => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements?.voiceChatTapToSpeakBtn || !polyglotHelpers) return;
            const btn = domElements.voiceChatTapToSpeakBtn;
            btn.classList.remove('listening', 'processing', 'mic-active');
            btn.disabled = false;
            let buttonText = '';
            switch (state) {
                case 'listening':
                    btn.classList.add('listening', 'mic-active');
                    buttonText = polyglotHelpers.sanitizeTextForDisplay(text) || 'Listening...';
                    btn.innerHTML = `<i class="fas fa-stop"></i> ${buttonText}`;
                    btn.title = "Tap to Stop Recording";
                    break;
                case 'processing':
                    btn.classList.add('processing');
                    buttonText = polyglotHelpers.sanitizeTextForDisplay(text) || 'Processing...';
                    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${buttonText}`;
                    btn.disabled = true;
                    btn.title = "Processing Audio";
                    break;
                default: // idle
                    btn.innerHTML = '<i class="fas fa-microphone"></i>';
                    btn.title = "Tap to Speak";
                    break;
            }
        },
        updateDirectCallHeader: (connector) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers || !connector) return;
            if (domElements.directCallActiveAvatar) domElements.directCallActiveAvatar.src = connector.avatarModern || 'images/placeholder_avatar.png';
            if (domElements.directCallActiveName) domElements.directCallActiveName.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name);
            if (domElements.directCallActivityBtn) {
                let isTutorInPrimary = connector.languageRoles &&
                    connector.languageRoles[connector.language] &&
                    Array.isArray(connector.languageRoles[connector.language]) &&
                    connector.languageRoles[connector.language].includes('tutor');
                domElements.directCallActivityBtn.style.display = isTutorInPrimary && connector.tutorMinigameImageFiles?.length > 0 ? 'inline-flex' : 'none';
            }
        },
        updateDirectCallStatus: (statusText, isError = false) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (domElements?.directCallStatusIndicator && polyglotHelpers) {
                domElements.directCallStatusIndicator.textContent = polyglotHelpers.sanitizeTextForDisplay(statusText);
                domElements.directCallStatusIndicator.style.color = isError ? 'var(--danger-color)' : 'inherit';
            }
        },
        updateDirectCallMicButtonVisual: (isMuted) => {
            const { domElements } = getDeps();
            if (domElements?.directCallMuteBtn) {
                domElements.directCallMuteBtn.classList.toggle('mic-active', !isMuted);
                domElements.directCallMuteBtn.innerHTML = isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
                domElements.directCallMuteBtn.title = isMuted ? "Mic Off (Click to Unmute & Record)" : "Mic On (Click to Mute & Send)";
            }
        },
        updateDirectCallSpeakerButtonVisual: (isMuted) => {
            const { domElements } = getDeps();
            if (domElements?.directCallSpeakerToggleBtn) {
                domElements.directCallSpeakerToggleBtn.classList.toggle('speaker-active', !isMuted);
                domElements.directCallSpeakerToggleBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
                domElements.directCallSpeakerToggleBtn.title = isMuted ? "AI Voice Off" : "AI Voice On";
            }
        },
        showImageInDirectCall: (imageUrl) => {
            const { domElements } = getDeps();
            const mainContentArea = domElements?.directCallMainContent || domElements?.directCallInterface;
            showImageInActivityArea(domElements?.directCallActivityArea, domElements?.directCallActivityImageDisplay, mainContentArea, imageUrl);
        },
        clearDirectCallActivityArea: () => {
            const { domElements } = getDeps();
            if (domElements?.directCallActivityArea) domElements.directCallActivityArea.style.display = 'none';
            if (domElements?.directCallActivityImageDisplay) domElements.directCallActivityImageDisplay.src = '';
        },
        appendToMessageLogModal: (text, senderClass, options = {}) => {
    const { domElements, chatOrchestrator } = getDeps(); // chatOrchestrator might not be needed here if directly using active target
    let finalOptions = { ...options };

    // If it's a connector message, try to get avatar
    if (!senderClass.includes('user') && !senderClass.includes('system-message') && !senderClass.includes('system-call-event')) {
        // const connector = chatOrchestrator?.getCurrentModalMessageTarget(); // Alternative
        const connectorId = domElements.messagingInterface?.dataset.currentConnectorId;
        const connector = window.polyglotConnectors?.find(c => c.id === connectorId);

        if (connector) {
            finalOptions.avatarUrl = connector.avatarModern;
            if (options.type !== 'call_event') {
                finalOptions.senderName = connector.profileName;
            }
        }
    }

    // If it IS a call event, ensure connectorId and connectorName
    if (options.type === 'call_event') {
        const connectorId = domElements.messagingInterface?.dataset.currentConnectorId;
        const connector = window.polyglotConnectors?.find(c => c.id === connectorId);
        if (connector) {
            finalOptions.connectorId = connector.id;
            finalOptions.connectorName = connector.profileName;
        }
    }
    return appendChatMessage(domElements?.messageChatLog, text, senderClass, finalOptions);
},
        showImageInMessageModal: (imageUrl) => {
            const { domElements } = getDeps();
            showImageInActivityArea(domElements?.messageActivityArea, domElements?.messageActivityImageDisplay, domElements?.messageChatLog, imageUrl);
        },
        updateMessageModalHeader: (connector) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers || !connector) return;
            if (domElements.messageModalHeaderAvatar) {
                domElements.messageModalHeaderAvatar.src = connector.avatarModern || 'images/placeholder_avatar.png';
                domElements.messageModalHeaderAvatar.alt = connector.profileName || 'Partner';
            }
            if (domElements.messageModalHeaderName) domElements.messageModalHeaderName.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Chat Partner');
            if (domElements.messageModalHeaderDetails) {
                const ageText = connector.age && connector.age !== "N/A" ? `${connector.age} yrs` : '';
                const locText = connector.city && connector.country ? `${polyglotHelpers.sanitizeTextForDisplay(connector.city)}, ${polyglotHelpers.sanitizeTextForDisplay(connector.country)}` : (connector.country || '');
                let details = locText;
                if (ageText && locText) details += ` | ${ageText}`; else if (ageText) details = ageText;
                domElements.messageModalHeaderDetails.textContent = details || "Details unavailable";
                domElements.messageModalHeaderDetails.style.display = details ? 'block' : 'none';
            }
            if (domElements.messagingInterface) domElements.messagingInterface.dataset.currentConnectorId = connector.id;
            if (domElements.messageModalCallBtn) domElements.messageModalCallBtn.style.display = 'inline-flex';
            if (domElements.messageModalInfoBtn) domElements.messageModalInfoBtn.style.display = 'inline-flex';
        },
        resetMessageModalInput: () => {
            const { domElements } = getDeps();
            if (domElements?.messageTextInput) domElements.messageTextInput.value = '';
            if (domElements?.messageSendBtn) domElements.messageSendBtn.disabled = false;
        },
        clearMessageModalLog: () => {
            const { domElements } = getDeps();
            if (domElements?.messageChatLog) domElements.messageChatLog.innerHTML = '';
            if (domElements?.messageActivityArea) domElements.messageActivityArea.style.display = 'none';
            if (domElements?.messageActivityImageDisplay) domElements.messageActivityImageDisplay.src = '';
        },
       appendToEmbeddedChatLog: (text, senderClass, options = {}) => {
    const { domElements } = getDeps();
    let finalOptions = { ...options }; // Start with whatever options were passed in (type, eventType, duration, etc.)

    // If it's a regular connector message, get avatar and name
    if (senderClass === 'connector') { 
        const connectorId = domElements.embeddedChatContainer?.dataset.currentConnectorId;
        const connector = window.polyglotConnectors?.find(c => c.id === connectorId);
        if (connector) {
            finalOptions.avatarUrl = connector.avatarModern;
            // Only set senderName if it's not a call event, as call events don't typically show sender name
            if (options.type !== 'call_event') { 
                 finalOptions.senderName = connector.profileName;
            }
        }
    }
    
    // If it IS a call event, ensure connectorId and connectorName are set from the active chat context
    // options.type, options.eventType, options.duration should already be on 'options'
    // if the calling code (e.g., chat_session_handler) put them there from the message object.
    if (options.type === 'call_event') {
        const connectorId = domElements.embeddedChatContainer?.dataset.currentConnectorId;
        const currentConnector = window.polyglotConnectors?.find(c => c.id === connectorId);
        if (currentConnector) {
            finalOptions.connectorId = currentConnector.id; // Essential for the button in appendChatMessage
            finalOptions.connectorName = currentConnector.profileName; // For "Chloé missed your call"
        }
    }
    
    return appendChatMessage(domElements?.embeddedChatLog, text, senderClass, finalOptions);
},
        showImageInEmbeddedChat: (imageUrl) => {
            const { domElements } = getDeps();
            showImageInActivityArea(domElements?.embeddedMessageActivityArea, domElements?.embeddedMessageActivityImage, domElements?.embeddedChatLog, imageUrl);
        },
        updateEmbeddedChatHeader: (connector) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers || !connector) return;
            if (domElements.embeddedChatHeaderAvatar) {
                domElements.embeddedChatHeaderAvatar.src = connector.avatarModern || 'images/placeholder_avatar.png';
                domElements.embeddedChatHeaderAvatar.alt = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || 'Partner');
            }
            if (domElements.embeddedChatHeaderName) domElements.embeddedChatHeaderName.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Chat Partner');
            if (domElements.embeddedChatHeaderDetails) {
                const ageText = connector.age && connector.age !== "N/A" ? `${connector.age} yrs` : '';
                const locText = connector.city && connector.country ? `${polyglotHelpers.sanitizeTextForDisplay(connector.city)}, ${polyglotHelpers.sanitizeTextForDisplay(connector.country)}` : (connector.country || '');
                let details = locText;
                if (ageText && locText) details += ` | ${ageText}`; else if (ageText) details = ageText;
                domElements.embeddedChatHeaderDetails.textContent = details || "Details unavailable";
                domElements.embeddedChatHeaderDetails.style.display = details ? 'block' : 'none';
            }
            if (domElements.embeddedChatContainer) domElements.embeddedChatContainer.dataset.currentConnectorId = connector.id;
            if (domElements.embeddedMessageAttachBtn) { // Logic for attach button visibility
                domElements.embeddedMessageAttachBtn.style.display = connector ? 'inline-flex' : 'none'; // Show if connector exists
                domElements.embeddedMessageAttachBtn.title = "Send Image";
            }
            if (domElements.embeddedChatCallBtn) domElements.embeddedChatCallBtn.style.display = 'inline-flex';
            if (domElements.embeddedChatInfoBtn) domElements.embeddedChatInfoBtn.style.display = 'inline-flex';
        },
        clearEmbeddedChatInput: () => {
            const { domElements } = getDeps();
            if (domElements?.embeddedMessageTextInput) domElements.embeddedMessageTextInput.value = '';
        },
        toggleEmbeddedSendButton: (enable) => {
            const { domElements } = getDeps();
            if (domElements?.embeddedMessageSendBtn) domElements.embeddedMessageSendBtn.disabled = !enable;
        },
        clearEmbeddedChatLog: () => {
            const { domElements } = getDeps();
            if (domElements?.embeddedChatLog) domElements.embeddedChatLog.innerHTML = '';
            if (domElements?.embeddedMessageActivityArea) domElements.embeddedMessageActivityArea.style.display = 'none';
            if (domElements?.embeddedMessageActivityImage) domElements.embeddedMessageActivityImage.src = '';
        },
        appendToGroupChatLog: (text, senderNameFromArg, isUser, speakerId, options = {}) => {
            const { domElements, polyglotHelpers } = getDeps();
            let finalSenderClass = isUser ? 'user' : 'connector group-chat-connector'; // group-chat-connector helps target group AI specifically
            let finalOptions = { ...options, senderName: senderNameFromArg, showSenderName: !isUser }; // For group chat, always show AI sender name

            if (!isUser) {
                const speakerConnector = window.polyglotConnectors?.find(c => c.id === speakerId);
                if (speakerConnector) {
                    finalOptions.avatarUrl = speakerConnector.avatarModern;
                    // Override senderName with the definitive connector profileName
                    finalOptions.senderName = speakerConnector.profileName;

                    const currentGroup = window.groupManager?.getCurrentGroupData ? window.groupManager.getCurrentGroupData() : null;
                    if (currentGroup && speakerConnector.languageRoles?.[currentGroup.language]?.includes('tutor')) {
                        finalSenderClass += ' tutor'; // Add tutor class for styling
                    }
                } else {
                    finalOptions.avatarUrl = 'images/placeholder_avatar.png'; // Fallback avatar
                    console.warn(`GroupChatLog: Connector for speakerId ${speakerId} not found. Using placeholder avatar.`);
                }
            }

            return appendChatMessage(domElements?.groupChatLogDiv, text, finalSenderClass, finalOptions);
        },
        updateGroupChatHeader: (groupName, members) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements || !polyglotHelpers) return;
            if (domElements.activeGroupNameHeader) domElements.activeGroupNameHeader.textContent = polyglotHelpers.sanitizeTextForDisplay(groupName);
            if (domElements.groupChatMembersAvatarsDiv) {
                domElements.groupChatMembersAvatarsDiv.innerHTML = '';
                (members || []).slice(0, 5).forEach(member => {
                    if (!member) return;
                    const img = document.createElement('img');
                    img.src = member.avatarModern || 'images/placeholder_avatar.png';
                    img.alt = polyglotHelpers.sanitizeTextForDisplay(member.profileName || 'Member');
                    img.title = polyglotHelpers.sanitizeTextForDisplay(member.profileName || 'Member');
                    img.className = 'member-avatar-small';
                    domElements.groupChatMembersAvatarsDiv.appendChild(img);
                });
                if (members && members.length > 5) {
                    const moreSpan = document.createElement('span');
                    moreSpan.className = 'member-avatar-small more-members';
                    moreSpan.textContent = `+${members.length - 5}`;
                    domElements.groupChatMembersAvatarsDiv.appendChild(moreSpan);
                }
            }
        },
        setGroupTypingIndicatorText: (text) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (domElements?.groupTypingIndicator && polyglotHelpers) {
                domElements.groupTypingIndicator.textContent = polyglotHelpers.sanitizeTextForDisplay(text || '');
                domElements.groupTypingIndicator.style.display = text ? 'block' : 'none';
            }
        },
        clearGroupChatInput: () => {
            const { domElements } = getDeps();
            if (domElements?.groupChatInput) domElements.groupChatInput.value = '';
        },
        clearGroupChatLog: () => {
            const { domElements } = getDeps();
            if (domElements?.groupChatLogDiv) domElements.groupChatLogDiv.innerHTML = '';
        },
        populateRecapModal: (recapData) => {
            const functionName = "populateRecapModal";
            console.log(`UI Updater (${functionName}): Populating recap modal. Data received:`, recapData);
            const { domElements, polyglotHelpers } = getDeps();

            if (!domElements || !domElements.sessionRecapScreen) {
                console.error(`UI Updater (${functionName}): domElements not found or domElements.sessionRecapScreen not found.`); return;
            }
            if (!recapData) {
                console.error(`UI Updater (${functionName}): recapData is null/undefined.`);
                if (domElements.recapConnectorName) domElements.recapConnectorName.textContent = "Error";
                const recapSummaryEl = domElements.sessionRecapScreen.querySelector('#recap-conversation-summary-text');
                if (recapSummaryEl) recapSummaryEl.textContent = "Could not load recap details.";
                return;
            }
            if (!polyglotHelpers) {
                console.error(`UI Updater (${functionName}): polyglotHelpers not found.`);
                if (domElements.recapConnectorName) domElements.recapConnectorName.textContent = "Error (UI helper missing)";
                return;
            }

            try {
                // Populate basic info
                if (domElements.recapConnectorName) domElements.recapConnectorName.textContent = `With ${polyglotHelpers.sanitizeTextForDisplay(recapData.connectorName || 'your Partner')}`;
                if (domElements.recapDate) domElements.recapDate.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.date || new Date().toLocaleDateString());
                if (domElements.recapDuration) domElements.recapDuration.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.duration || 'N/A');
                if (domElements.recapDate) { // You might want a new element for start time specifically
                let displayDate = recapData.date || new Date().toLocaleDateString();
                if (recapData.startTimeISO) {
                    displayDate = new Date(recapData.startTimeISO).toLocaleString(undefined, { 
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });
                }
                domElements.recapDate.textContent = polyglotHelpers.sanitizeTextForDisplay(displayDate);
                }    
                // Populate text content sections
                const recapSummaryEl = domElements.sessionRecapScreen.querySelector('#recap-conversation-summary-text');
                if (recapSummaryEl) recapSummaryEl.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.conversationSummary || "No summary provided.");

                const recapEncouragementEl = domElements.sessionRecapScreen.querySelector('#recap-overall-encouragement-text');
                if (recapEncouragementEl) recapEncouragementEl.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.overallEncouragement || "Keep up the great work!");

                // Populate list sections
                // Ensure domElements provide the correct UL elements directly (e.g., domElements.recapTopicsListUL)
                populateListInRecap(domElements.recapTopicsList, recapData.keyTopicsDiscussed, 'simple');
                populateListInRecap(domElements.sessionRecapScreen.querySelector('#recap-good-usage-list'), recapData.goodUsageHighlights, 'simple');
                populateListInRecap(domElements.recapVocabularyList, recapData.newVocabularyAndPhrases, 'vocabulary');
                populateListInRecap(domElements.recapFocusAreasList, recapData.areasForImprovement, 'improvementArea');
                populateListInRecap(domElements.sessionRecapScreen.querySelector('#recap-practice-activities-list'), recapData.suggestedPracticeActivities, 'simple');
                
                domElements.sessionRecapScreen.dataset.sessionIdForDownload = recapData.sessionId || '';
                console.log(`UI Updater (${functionName}): Recap modal population complete for session ID: ${recapData.sessionId}`);
            } catch (e) {
                console.error(`UI Updater (${functionName}): Error populating recap modal:`, e);
            }
        },
        
        // Inside ui_updater.js
// ...

displaySummaryInView: (sessionData) => {
    const functionName = "displaySummaryInView";
    const { domElements, polyglotHelpers } = getDeps();

    if (!domElements?.summaryViewContent || !domElements.summaryTabHeader || !domElements.summaryPlaceholder || !polyglotHelpers) {
        console.error(`UI Updater (${functionName}): Missing critical DOM elements or helpers.`);
        return;
    }

    if (!sessionData || !sessionData.sessionId) { // Check for sessionId to ensure it's a valid session object
        domElements.summaryTabHeader.textContent = "Learning Summary";
        domElements.summaryPlaceholder.innerHTML = "Select a session from the history to view its detailed debrief.";
        domElements.summaryPlaceholder.style.display = 'block';
        domElements.summaryViewContent.innerHTML = ''; // Clear previous content
        if (domElements.summaryViewContent.firstChild !== domElements.summaryPlaceholder) { // Avoid appending if already there
             domElements.summaryViewContent.appendChild(domElements.summaryPlaceholder);
        }
        console.log(`UI Updater (${functionName}): No session data provided, displaying placeholder.`);
        return;
    }

    // --- Format Date and Time ---
    let displayDateTime = sessionData.date || 'Unknown Date'; // Fallback to existing date
    if (sessionData.startTimeISO) {
        try {
            displayDateTime = new Date(sessionData.startTimeISO).toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            console.warn(`UI Updater (${functionName}): Could not parse startTimeISO '${sessionData.startTimeISO}'. Using fallback date.`);
        }
    }
    // --- End Format Date and Time ---

    domElements.summaryTabHeader.textContent = `Summary: ${polyglotHelpers.sanitizeTextForDisplay(sessionData.connectorName || 'Partner')} (${polyglotHelpers.sanitizeTextForDisplay(displayDateTime)})`;
    domElements.summaryPlaceholder.style.display = 'none';

    let summaryHtml = `<div class="recap-modal-content-embedded styled-scrollbar">`; // Using recap styles, which is fine

    // --- ADD START TIME AND DURATION ---
    summaryHtml += `<p><strong>Session Started:</strong> ${polyglotHelpers.sanitizeTextForDisplay(displayDateTime)}</p>`;
    summaryHtml += `<p><strong>Duration:</strong> ${polyglotHelpers.sanitizeTextForDisplay(sessionData.duration || 'N/A')}</p>`;
    // --- END START TIME AND DURATION ---

    if (sessionData.conversationSummary) {
        summaryHtml += `<div class="recap-section"><h4><i class="fas fa-info-circle"></i> Overview:</h4><p id="emb-recap-summary-text">${polyglotHelpers.sanitizeTextForDisplay(sessionData.conversationSummary)}</p></div>`;
    }
    if (sessionData.keyTopicsDiscussed && Array.isArray(sessionData.keyTopicsDiscussed) && sessionData.keyTopicsDiscussed.length > 0 && !(sessionData.keyTopicsDiscussed.length === 1 && sessionData.keyTopicsDiscussed[0].toLowerCase().includes("n/a")) ) {
        summaryHtml += `<div class="recap-section"><h4><i class="fas fa-list-alt"></i> Topics:</h4><ul id="emb-recap-topics-view"></ul></div>`;
    } else if (sessionData.keyTopicsDiscussed) { // It exists but might be ["N/A - Short conversation"]
         summaryHtml += `<div class="recap-section"><h4><i class="fas fa-list-alt"></i> Topics:</h4><p class="recap-list-placeholder-item">${polyglotHelpers.sanitizeTextForDisplay(sessionData.keyTopicsDiscussed[0] || 'N/A')}</p></div>`;
    }


    if (sessionData.goodUsageHighlights && Array.isArray(sessionData.goodUsageHighlights) && sessionData.goodUsageHighlights.length > 0 && !(sessionData.goodUsageHighlights.length === 1 && sessionData.goodUsageHighlights[0].toLowerCase().includes("n/a")) ) {
        summaryHtml += `<div class="recap-section"><h4><i class="fas fa-thumbs-up"></i> Well Done!:</h4><ul id="emb-recap-good-usage-view"></ul></div>`;
    } else if (sessionData.goodUsageHighlights) {
         summaryHtml += `<div class="recap-section"><h4><i class="fas fa-thumbs-up"></i> Well Done!:</h4><p class="recap-list-placeholder-item">${polyglotHelpers.sanitizeTextForDisplay(sessionData.goodUsageHighlights[0] || 'None noted.')}</p></div>`;
    }

    // For vocabulary and improvement areas, we expect arrays of objects or empty arrays from the consistent recap.
    // The populateListInRecap should handle empty arrays by showing "None noted...".
    summaryHtml += `<div class="recap-section"><h4><i class="fas fa-book-open"></i> Vocabulary:</h4><ul id="emb-recap-vocab-view"></ul></div>`;
    summaryHtml += `<div class="recap-section"><h4><i class="fas fa-pencil-ruler"></i> To Improve:</h4><ul id="emb-recap-focus-view"></ul></div>`;

    if (sessionData.suggestedPracticeActivities && Array.isArray(sessionData.suggestedPracticeActivities) && sessionData.suggestedPracticeActivities.length > 0 && !(sessionData.suggestedPracticeActivities.length === 1 && sessionData.suggestedPracticeActivities[0].toLowerCase().includes("n/a"))) {
        summaryHtml += `<div class="recap-section"><h4><i class="fas fa-dumbbell"></i> Practice:</h4><ul id="emb-recap-practice-view"></ul></div>`;
    } else if (sessionData.suggestedPracticeActivities){
        summaryHtml += `<div class="recap-section"><h4><i class="fas fa-dumbbell"></i> Practice:</h4><p class="recap-list-placeholder-item">${polyglotHelpers.sanitizeTextForDisplay(sessionData.suggestedPracticeActivities[0] || 'None suggested.')}</p></div>`;
    }


    if (sessionData.overallEncouragement) {
        summaryHtml += `<div class="recap-section"><h4><i class="fas fa-comment-dots"></i> Coach's Note:</h4><p id="emb-recap-encouragement-text">${polyglotHelpers.sanitizeTextForDisplay(sessionData.overallEncouragement)}</p></div>`;
    }
    summaryHtml += `<button id="summary-view-download-btn" class="action-btn primary-btn" data-session-id="${polyglotHelpers.sanitizeTextForDisplay(sessionData.sessionId || '')}"><i class="fas fa-download"></i> Download Transcript</button>`;
    summaryHtml += `</div>`; // Close recap-modal-content-embedded

    domElements.summaryViewContent.innerHTML = summaryHtml;

    // Now populate the ULs if they were created
    if (document.getElementById('emb-recap-topics-view')) {
        populateListInRecap(document.getElementById('emb-recap-topics-view'), sessionData.keyTopicsDiscussed, 'simple');
    }
    if (document.getElementById('emb-recap-good-usage-view')) {
        populateListInRecap(document.getElementById('emb-recap-good-usage-view'), sessionData.goodUsageHighlights, 'simple');
    }
    // Vocabulary and Improvement Areas will be populated; populateListInRecap handles empty arrays.
    populateListInRecap(document.getElementById('emb-recap-vocab-view'), sessionData.newVocabularyAndPhrases, 'vocabulary');
    populateListInRecap(document.getElementById('emb-recap-focus-view'), sessionData.areasForImprovement, 'improvementArea');

    if (document.getElementById('emb-recap-practice-view')) {
        populateListInRecap(document.getElementById('emb-recap-practice-view'), sessionData.suggestedPracticeActivities, 'simple');
    }

    const downloadBtn = document.getElementById('summary-view-download-btn');
    if (downloadBtn && window.sessionManager?.downloadTranscriptForSession) {
        // Clone and replace to ensure fresh event listener if this view is re-rendered
        const newBtn = downloadBtn.cloneNode(true);
        if (downloadBtn.parentNode) { // Ensure parent exists before replacing
            downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
            newBtn.addEventListener('click', () => window.sessionManager.downloadTranscriptForSession(sessionData.sessionId));
        } else {
            console.warn(`UI Updater (${functionName}): Download button parent not found for session ${sessionData.sessionId}`);
        }
    } else if (downloadBtn) {
        console.warn(`UI Updater (${functionName}): window.sessionManager.downloadTranscriptForSession not available.`);
    }
    // console.log(`UI Updater (${functionName}): Summary view updated for session ${sessionData.sessionId}`);
}, // End of displaySummaryInView
        updateTTSToggleButtonVisual: (buttonElement, isMuted) => {
            if (buttonElement) {
                buttonElement.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
                buttonElement.title = isMuted ? "AI Voice Off (Click to Enable)" : "AI Voice On (Click to Disable)";
                buttonElement.classList.toggle('active', !isMuted);
            }
        },
        updateSendPhotoButtonVisibility: (connector, buttonElement) => { // This logic was in uiUpdater for embedded chat attach btn
            if (!connector || !buttonElement) return;
            // For 1-on-1 chats, currently allow image sending for everyone if button exists
            // If you want tutor-only for this button as well, re-add the role check.
            buttonElement.style.display = connector ? 'inline-flex' : 'none'; // Show if connector exists
        },
        showProcessingSpinner: (logElement, messageId = null) => {
            const { polyglotHelpers } = getDeps();
            if (!logElement || !polyglotHelpers) return null;
            if (messageId) {
                const existingSpinner = logElement.querySelector(`.processing-spinner[data-message-id="${messageId}"]`);
                if (existingSpinner) existingSpinner.remove();
            }
            const spinnerDiv = document.createElement('div');
            spinnerDiv.classList.add('chat-message-ui', 'processing-spinner');
            spinnerDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            if (messageId) spinnerDiv.dataset.messageId = messageId;
            logElement.appendChild(spinnerDiv);
            requestAnimationFrame(() => { logElement.scrollTop = logElement.scrollHeight; });
            return spinnerDiv;
        },
        removeProcessingSpinner: (logElement, messageId = null) => {
            if (!logElement) return;
            const selector = messageId ? `.processing-spinner[data-message-id="${messageId}"]` : '.processing-spinner';
            const spinner = logElement.querySelector(selector);
            if (spinner) spinner.remove();
        },

        appendSystemMessage // Exported
    };
})();
console.log("ui/ui_updater.js fully loaded with all functions including appendSystemMessage.");