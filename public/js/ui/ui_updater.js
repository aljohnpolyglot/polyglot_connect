// js/ui/ui_updater.js
// Contains functions to update specific parts of the UI.

window.uiUpdater = (() => {
    const getDeps = () => ({ // Lazy load dependencies to avoid race conditions
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers
    });

    function appendChatMessage(logElement, text, senderClass, options = {}) {
        // options can now include: senderName, imageUrl, isThinking, isError, avatarUrl
        const { polyglotHelpers, domElements } = getDeps(); // domElements for placeholder
        if (!logElement || !polyglotHelpers) {
            console.warn("appendChatMessage: Log element or polyglotHelpers not found.");
            return null;
        }

        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('chat-message-wrapper', senderClass.includes('user') ? 'user-wrapper' : 'connector-wrapper');

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message-ui'); // Base bubble style

        // Add specific sender classes to the bubble itself
        if (senderClass && typeof senderClass === 'string') {
            const classes = senderClass.split(' ').filter(cls => cls.trim() !== '');
            if (classes.length > 0) {
                messageDiv.classList.add(...classes);
            }
        }

        if (options.isThinking) messageDiv.classList.add('connector-thinking');
        if (options.isError) {
            // Simplified error class directly on the bubble
            messageDiv.classList.add('error-message-bubble');
        }

        let avatarHtml = '';
        if (!senderClass.includes('user') && !senderClass.includes('system-message') && options.avatarUrl) {
            // AI/Connector message - Avatar on the left
            avatarHtml = `<img src="${polyglotHelpers.sanitizeTextForDisplay(options.avatarUrl)}" alt="${polyglotHelpers.sanitizeTextForDisplay(options.senderName || 'Partner')}" class="chat-bubble-avatar left-avatar" onerror="this.src='${domElements?.placeholderAvatar?.src || 'images/placeholder_avatar.png'}';">`;
            messageWrapper.classList.add('has-avatar-left');
        }

        let contentHtml = '';
        if (options.senderName && !senderClass.includes('user') && !senderClass.includes('system-message') && !senderClass.includes('connector-thinking')) {
            contentHtml += `<strong class="chat-message-sender-name">${polyglotHelpers.sanitizeTextForDisplay(options.senderName)}:</strong><br>`;
        }
        if (text) {
            let processedText = polyglotHelpers.sanitizeTextForDisplay(text);
            processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            contentHtml += `<span class="chat-message-text">${processedText}</span>`;
        }

        if (options.imageUrl) {
            if (text) contentHtml += '<br>';
            contentHtml += `<img src="${polyglotHelpers.sanitizeTextForDisplay(options.imageUrl)}" alt="Chat Image" class="chat-message-image">`;
        }

        messageDiv.innerHTML = contentHtml;

        if (avatarHtml && messageWrapper.classList.contains('has-avatar-left')) {
            messageWrapper.innerHTML = avatarHtml; // Add avatar first
            messageWrapper.appendChild(messageDiv); // Then add message bubble
        } else {
            messageWrapper.appendChild(messageDiv); // Just the message bubble
        }

        if (options.messageId) messageWrapper.dataset.messageId = options.messageId; // Apply to wrapper
        logElement.appendChild(messageWrapper);

        requestAnimationFrame(() => { logElement.scrollTop = logElement.scrollHeight; });
        return messageWrapper; // Return the wrapper
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
        const { polyglotHelpers } = getDeps();
        if (!ulElement || !polyglotHelpers) {
            console.warn("populateListInRecap: Missing ulElement or polyglotHelpers");
            if (ulElement) ulElement.innerHTML = '<li>Error loading details.</li>'; // Provide feedback in UI
            return;
        }
        ulElement.innerHTML = ''; // Clear previous items

        if (itemsArray && itemsArray.length > 0) {
            itemsArray.forEach(itemData => {
                const li = document.createElement('li');
                if (itemType === 'simple' && typeof itemData === 'string') {
                    li.innerHTML = `<i class="fas fa-check-circle recap-item-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(itemData)}`;
                } else if (itemType === 'vocabulary' && typeof itemData === 'object' && itemData.term) {
                    let vocabHtml = `<i class="fas fa-book-open recap-item-icon"></i> <strong>${polyglotHelpers.sanitizeTextForDisplay(itemData.term)}</strong>`;
                    if (itemData.translation) {
                        vocabHtml += `: ${polyglotHelpers.sanitizeTextForDisplay(itemData.translation)}`;
                    }
                    if (itemData.exampleSentence) {
                        vocabHtml += `<br><em class="recap-example">E.g.: "${polyglotHelpers.sanitizeTextForDisplay(itemData.exampleSentence)}"</em>`;
                    }
                    li.innerHTML = vocabHtml;
                } else if (itemType === 'improvementArea' && typeof itemData === 'object' && itemData.areaType) {
                    let improvementHtml = `<div class="improvement-item">`;
                    improvementHtml += `<div class="improvement-area-header"><i class="fas fa-pencil-alt recap-item-icon"></i> <strong>${polyglotHelpers.sanitizeTextForDisplay(itemData.areaType)}:</strong></div>`;
                    if (itemData.userInputExample && itemData.userInputExample.trim() !== "") { // Check if not empty
                        improvementHtml += `<div class="recap-user-input">You said: "<em>${polyglotHelpers.sanitizeTextForDisplay(itemData.userInputExample)}</em>"</div>`;
                    }
                    if (itemData.coachSuggestion) {
                        improvementHtml += `<div class="recap-coach-suggestion">Suggestion: "<strong>${polyglotHelpers.sanitizeTextForDisplay(itemData.coachSuggestion)}</strong>"</div>`;
                    }
                    if (itemData.explanation) {
                        improvementHtml += `<div class="recap-explanation">Why: ${polyglotHelpers.sanitizeTextForDisplay(itemData.explanation)}</div>`;
                    }
                    if (itemData.exampleWithSuggestion) {
                        improvementHtml += `<div class="recap-example">Example: "<em>${polyglotHelpers.sanitizeTextForDisplay(itemData.exampleWithSuggestion)}</em>"</div>`;
                    }
                    improvementHtml += `</div>`;
                    li.innerHTML = improvementHtml;
                    li.classList.add('improvement-list-item');
                } else {
                    li.textContent = typeof itemData === 'string' ? polyglotHelpers.sanitizeTextForDisplay(itemData) : JSON.stringify(itemData);
                }
                ulElement.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = itemType === 'improvementArea' ? 'No specific areas for improvement noted this time. Great job!' : 'None noted.';
            li.style.fontStyle = 'italic';
            ulElement.appendChild(li);
        }
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
            const { domElements, chatOrchestrator } = getDeps();
            let finalOptions = { ...options };
            if (!senderClass.includes('user') && !senderClass.includes('system-message')) {
                const connector = chatOrchestrator?.getCurrentModalMessageTarget();
                if (connector) {
                    finalOptions.avatarUrl = connector.avatarModern;
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
            let finalOptions = { ...options };
            if (!senderClass.includes('user') && !senderClass.includes('system-message')) {
                const connectorId = domElements.embeddedChatContainer?.dataset.currentConnectorId;
                const connector = window.polyglotConnectors?.find(c => c.id === connectorId);
                if (connector) {
                    finalOptions.avatarUrl = connector.avatarModern;
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
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements?.sessionRecapScreen || !recapData || !polyglotHelpers) return;
            if (domElements.recapConnectorName) domElements.recapConnectorName.textContent = `With ${polyglotHelpers.sanitizeTextForDisplay(recapData.connectorName || 'your Partner')}`;
            if (domElements.recapDate) domElements.recapDate.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.date || new Date().toLocaleDateString());
            if (domElements.recapDuration) domElements.recapDuration.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.duration || 'N/A');
            const recapSummaryEl = domElements.sessionRecapScreen.querySelector('#recap-conversation-summary-text');
            if (recapSummaryEl) recapSummaryEl.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.conversationSummary || "No summary.");
            populateListInRecap(domElements.recapTopicsList, recapData.keyTopicsDiscussed, 'simple');
            const recapGoodUsageEl = domElements.sessionRecapScreen.querySelector('#recap-good-usage-list');
            if (recapGoodUsageEl) populateListInRecap(recapGoodUsageEl, recapData.goodUsageHighlights, 'simple');
            populateListInRecap(domElements.recapVocabularyList, recapData.newVocabularyAndPhrases, 'vocabulary');
            populateListInRecap(domElements.recapFocusAreasList, recapData.areasForImprovement, 'improvementArea');
            const recapPracticeEl = domElements.sessionRecapScreen.querySelector('#recap-practice-activities-list');
            if (recapPracticeEl) populateListInRecap(recapPracticeEl, recapData.suggestedPracticeActivities, 'simple');
            const recapEncouragementEl = domElements.sessionRecapScreen.querySelector('#recap-overall-encouragement-text');
            if (recapEncouragementEl) recapEncouragementEl.textContent = polyglotHelpers.sanitizeTextForDisplay(recapData.overallEncouragement || "Keep practicing!");
            domElements.sessionRecapScreen.dataset.sessionIdForDownload = recapData.sessionId || '';
        },
        displaySummaryInView: (sessionData) => {
            const { domElements, polyglotHelpers } = getDeps();
            if (!domElements?.summaryViewContent || !domElements.summaryTabHeader || !domElements.summaryPlaceholder || !polyglotHelpers) return;
            if (!sessionData) {
                domElements.summaryTabHeader.textContent = "Learning Summary";
                domElements.summaryPlaceholder.innerHTML = "Select a session from the history to view its detailed debrief.";
                domElements.summaryPlaceholder.style.display = 'block';
                domElements.summaryViewContent.innerHTML = '';
                domElements.summaryViewContent.appendChild(domElements.summaryPlaceholder);
                return;
            }
            domElements.summaryTabHeader.textContent = `Summary: ${polyglotHelpers.sanitizeTextForDisplay(sessionData.connectorName)} (${polyglotHelpers.sanitizeTextForDisplay(sessionData.date)})`;
            domElements.summaryPlaceholder.style.display = 'none';
            let summaryHtml = `<div class="recap-modal-content-embedded styled-scrollbar">`;
            summaryHtml += `<p><strong>Duration:</strong> ${polyglotHelpers.sanitizeTextForDisplay(sessionData.duration || 'N/A')}</p>`;
            if (sessionData.conversationSummary) summaryHtml += `<div class="recap-section"><h4><i class="fas fa-info-circle"></i> Overview:</h4><p id="emb-recap-summary-text">${polyglotHelpers.sanitizeTextForDisplay(sessionData.conversationSummary)}</p></div>`;
            summaryHtml += `<div class="recap-section"><h4><i class="fas fa-list-alt"></i> Topics:</h4><ul id="emb-recap-topics-view"></ul></div>`;
            if (sessionData.goodUsageHighlights?.length) summaryHtml += `<div class="recap-section"><h4><i class="fas fa-thumbs-up"></i> Well Done!:</h4><ul id="emb-recap-good-usage-view"></ul></div>`;
            summaryHtml += `<div class="recap-section"><h4><i class="fas fa-book-open"></i> Vocabulary:</h4><ul id="emb-recap-vocab-view"></ul></div>`;
            summaryHtml += `<div class="recap-section"><h4><i class="fas fa-pencil-ruler"></i> To Improve:</h4><ul id="emb-recap-focus-view"></ul></div>`;
            if (sessionData.suggestedPracticeActivities?.length) summaryHtml += `<div class="recap-section"><h4><i class="fas fa-dumbbell"></i> Practice:</h4><ul id="emb-recap-practice-view"></ul></div>`;
            if (sessionData.overallEncouragement) summaryHtml += `<div class="recap-section"><h4><i class="fas fa-comment-dots"></i> Coach's Note:</h4><p id="emb-recap-encouragement-text">${polyglotHelpers.sanitizeTextForDisplay(sessionData.overallEncouragement)}</p></div>`;
            summaryHtml += `<button id="summary-view-download-btn" class="action-btn primary-btn" data-session-id="${polyglotHelpers.sanitizeTextForDisplay(sessionData.sessionId)}"><i class="fas fa-download"></i> Download</button></div>`;
            domElements.summaryViewContent.innerHTML = summaryHtml;
            populateListInRecap(document.getElementById('emb-recap-topics-view'), sessionData.keyTopicsDiscussed, 'simple');
            populateListInRecap(document.getElementById('emb-recap-good-usage-view'), sessionData.goodUsageHighlights, 'simple');
            populateListInRecap(document.getElementById('emb-recap-vocab-view'), sessionData.newVocabularyAndPhrases, 'vocabulary');
            populateListInRecap(document.getElementById('emb-recap-focus-view'), sessionData.areasForImprovement, 'improvementArea');
            populateListInRecap(document.getElementById('emb-recap-practice-view'), sessionData.suggestedPracticeActivities, 'simple');
            const downloadBtn = document.getElementById('summary-view-download-btn');
            if (downloadBtn && window.sessionManager?.downloadTranscriptForSession) {
                const newBtn = downloadBtn.cloneNode(true);
                downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
                newBtn.addEventListener('click', () => window.sessionManager.downloadTranscriptForSession(sessionData.sessionId));
            }
        },
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