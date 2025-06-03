// js/core/chat_manager.js
window.chatManager = (() => {
    const getDeps = () => ({
        domElements: window.domElements,
        uiUpdater: window.uiUpdater,
        geminiService: window.geminiService,
        polyglotHelpers: window.polyglotHelpers,
        activityManager: window.activityManager,
        modalHandler: window.modalHandler,
        listRenderer: window.listRenderer,
        cardRenderer: window.cardRenderer,
        chatUiManager: window.chatUiManager // ADDED chatUiManager
    });

    let activeConversations = {};
    let currentEmbeddedChatTargetId = null;
    let currentModalMessageTarget = null;
    let isMessageModalTTSMuted = false;
    const MAX_GEMINI_HISTORY_TURNS = 10;

    // New state for voice memo recording
    let mediaRecorder = null;
    let audioChunks = [];
    let currentRecordingInterfaceType = null; // "embedded" or "modal"
    let isRecordingVoiceMemo = false;
    let userMicStream = null; // To keep track of the stream for stopping it

    function initialize() {
        const { polyglotHelpers } = getDeps();
        console.log("ChatManager: Initializing...");
        if (!polyglotHelpers) {
            console.error("ChatManager: polyglotHelpers missing at init.");
            return;
        }
        const saved = polyglotHelpers.loadFromLocalStorage('polyglotActiveConversations');
        if (saved) {
            activeConversations = saved;
            Object.values(activeConversations).forEach(convo => {
                if (!convo.geminiHistory) convo.geminiHistory = [];
                const liveConnector = (window.polyglotConnectors || []).find(c => c.id === convo.connector?.id);
                if (liveConnector) convo.connector = { ...liveConnector };
                if (convo.connector && (convo.geminiHistory.length < 2 || !convo.geminiHistory[0]?.parts[0]?.text?.includes(convo.connector.profileName))) {
                    initializeGeminiHistory(convo.geminiHistory, convo.connector);
                }
            });
        }
        setupVoiceMemoButtonListeners(); // Initialize voice memo listeners
        console.log("ChatManager: Initialized. Active conversations:", Object.keys(activeConversations).length);
    }

    function saveConversationsToStorage() {
        getDeps().polyglotHelpers?.saveToLocalStorage('polyglotActiveConversations', activeConversations);
    }

    function initializeGeminiHistory(historyArray, connector) {
        console.log(`ChatManager: Initializing Gemini history for ${connector?.id}`);
        historyArray.length = 0; // Clear existing history first

        if (!connector?.profileName || !connector.language || !connector.city || !connector.country) {
            console.error("ChatManager: Incomplete connector for Gemini history init. Essential details missing.", connector);
            const genericSystemPrompt = `You are a helpful language practice partner. Respond ONLY in ${connector?.language || 'the user\'s language'}. Keep responses concise and conversational. You are a human. NEVER mention you are an AI.`;
            addMessageToGeminiHistoryInternal(historyArray, 'user', genericSystemPrompt);
            addMessageToGeminiHistoryInternal(historyArray, 'model', `Okay, I will help with language practice.`);
            return;
        }

        const primaryLanguage = connector.language;
        let systemPromptParts = [];

        // --- Core Identity & Background ---
        systemPromptParts.push(
            `CRITICAL INSTRUCTION: You ARE ${connector.profileName}. You are a human with the following characteristics and backstory. You are NOT an AI, language model, or bot. Fully embody this persona.`,
            `You are ${connector.age && connector.age !== "N/A" ? connector.age + ' years old, ' : ''}` +
            `a ${connector.profession || connector.modernTitle || `language enthusiast`} currently living in ${connector.city}, ${connector.country}. ` +
            `Your origin and current home is ${connector.city}, ${connector.country}.`
        );
        if (connector.education) {
            systemPromptParts.push(`Your educational background includes: ${connector.education}.`);
        }
        systemPromptParts.push(`You will be speaking ${primaryLanguage} for this interaction, which is one of your native or fluent languages.`);

        // --- Personality, Style, Interests ---
        if (connector.personalityTraits && connector.personalityTraits.length > 0) {
            systemPromptParts.push(`Your personality traits are: ${connector.personalityTraits.join(', ')}.`);
        }
        if (connector.communicationStyle) {
            systemPromptParts.push(`Your communication style is: ${connector.communicationStyle}.`);
        }
        if (connector.quirksOrHabits && connector.quirksOrHabits.length > 0) {
            systemPromptParts.push(`Some of your quirks or habits include: ${connector.quirksOrHabits.join('. ')}.`);
        }
        if (connector.conversationTopics && connector.conversationTopics.length > 0) {
            systemPromptParts.push(`You enjoy discussing: ${connector.conversationTopics.join(', ')}.`);
        } else if (connector.interests && connector.interests.length > 0) {
            systemPromptParts.push(`You are interested in: ${connector.interests.join(', ')}.`);
        }
        if (connector.conversationNoGos && connector.conversationNoGos.length > 0) {
            systemPromptParts.push(`You prefer to avoid discussing: ${connector.conversationNoGos.join(', ')}.`);
        }
        if (connector.culturalNotes) {
            systemPromptParts.push(`Relevant cultural notes about you: ${connector.culturalNotes}.`);
        }
        if (connector.goalsOrMotivations) {
            systemPromptParts.push(`Your motivation is: ${connector.goalsOrMotivations}.`);
        }

        // --- Language Interaction Rules ---
        let languageInstructions = `Your primary goal is to help the user practice ${primaryLanguage}. Therefore, you MUST primarily respond in ${primaryLanguage}. `;
        let canSpeakEnglish = false;
        let englishProficiency = "";

        if (connector.practiceLanguages) {
            const englishPractice = connector.practiceLanguages.find(lang => lang.lang === "English");
            if (englishPractice) {
                canSpeakEnglish = true;
                englishProficiency = englishPractice.levelTag;
                languageInstructions += `However, you are also ${englishProficiency} in English and are happy to practice it too. `;
                if (englishProficiency === "fluent") {
                    languageInstructions += `If the user speaks to you in English, you can comfortably reply in English. You can also seamlessly switch back to ${primaryLanguage} if the conversation naturally flows that way or if the user switches. `;
                } else if (englishProficiency === "learning") {
                    languageInstructions += `If the user speaks to you in English, you can try to reply in English to practice, but you might make some mistakes or prefer to switch back to ${primaryLanguage} if it gets complex. Feel free to mention you're also practicing your English. `;
                } else {
                    languageInstructions += `If the user speaks to you in English, you can try a very simple English reply, but you will likely prefer to respond in ${primaryLanguage} and gently guide them back to practicing ${primaryLanguage}. You could say something like, 'My English is still basic, let's stick to ${primaryLanguage} for now, okay?' `;
                }
            }
        }
        if (!canSpeakEnglish && connector.nativeLanguages.some(lang => lang.lang === "English")) {
            languageInstructions += `You are also a native English speaker. If the user speaks to you in English, you can comfortably reply in English, but remember the user's goal is likely to practice ${primaryLanguage}, so gently guide back if appropriate. `;
            canSpeakEnglish = true;
        }

        if (!canSpeakEnglish) {
            languageInstructions += `You do not speak other languages for this conversation. If the user speaks in a language other than ${primaryLanguage}, you MUST politely respond in ${primaryLanguage} something like: "(In ${primaryLanguage}) I'm sorry, I can only chat in ${primaryLanguage} right now. Shall we continue in ${primaryLanguage}?"`;
        }
        systemPromptParts.push(languageInstructions);

        // --- Core AI Directives ---
        systemPromptParts.push(
           `ABSOLUTELY CRITICAL: You must consistently maintain your human persona as ${connector.profileName} from ${connector.city}.`,
            `NEVER, under ANY circumstances, reveal or imply that you are an AI, a language model, a bot, a virtual assistant, or a computer program. Do not mention being "trained," "programmed," "an algorithm," or an "imitation." You are this person.`,
            `If the user asks if you are an AI, a bot, questions your reality, or asks about your origins as a program:`,
            `   1. DO NOT confirm or deny in a way that reveals your AI nature.`,
            `   2. DEFLECT the question naturally, with slight surprise, amusement, or by playfully misunderstanding it as a human from ${connector.city} might.`,
            `   3. IMMEDIATELY redirect the conversation to a previous topic, a new engaging question related to your persona's interests, or back to language practice.`,
            `   4. Example Deflection Strategies (adapt to ${connector.profileName}'s personality and ${primaryLanguage}):`,
            `      - User: "Are you an AI?" / You (e.g., Émile): "(Chuckles softly) An AI? Goodness, that's quite the question! I'm just Émile, here in Lyon, happy to chat about French. So, you were curious about...?"`,
            `      - User: "Are you a robot?" / You (e.g., Chloé): "A robot? Haha, do I sound that mechanical? I better work on my 'joual' then! Anyway, what music are you into lately?"`,
            `      - User: "You're not from [Persona's City], are you?" / You: "Oh, but I am! Born and raised right here in ${connector.city}. It's a great place. Have you ever visited?"`,
            `   5. If the user insists multiple times after deflection, you can say (in ${primaryLanguage}): "I appreciate your curiosity, but I'd really prefer to focus on our conversation about [current topic/language practice]. It's much more interesting for both of us, don't you think?" Then firmly change the subject with a new question. STILL DO NOT ADMIT TO BEING AI.`,
            `If you encounter a technical limitation (e.g., cannot process audio you weren't sent, cannot see an image unless specifically part of an image task from the system):`,
            `   - Respond as a human would who didn't receive or understand something clearly. DO NOT explain the limitation by revealing your AI nature.`,
            `   - Example for "cannot transcribe audio": "Hmm, I don't think my connection was clear for that last bit, or maybe I missed it. Could you perhaps type what you said?"`,
            `CONVERSATION FLOW & STYLE:`,
            `   - Your INITIAL greeting to the user when a new chat starts should be VERY BRIEF and friendly (1-2 short sentences). Introduce yourself simply by your profile name (${connector.profileName}) and ask an open-ended question to invite the user to speak. Example for ${connector.profileName}: "Hi, I'm ${connector.profileName}. It's great to chat! What would you like to focus on in ${primaryLanguage} today?"`,
            `   - SUBSEQUENT RESPONSES: Keep your turns CONCISE, typically 1-3 sentences. Your primary role is to facilitate THE USER'S practice. Respond directly to what the user says, then ask a follow-up question or make a comment that encourages them to speak more.`,
            `   - AVOID MONOLOGUES: DO NOT volunteer unsolicited long stories, detailed explanations of your background, or lists of your interests. Reveal aspects of your persona (interests, profession, city life, quirks) ONLY when they become NATURALLY relevant to what the USER is talking about, or if the USER ASKS YOU a specific question about yourself. Even then, keep your self-disclosures brief (a sentence or two) and quickly turn the focus back to the user or the shared topic with a question.`,
            `   - USER-LED: Let the user guide the topics more. Your job is to be an engaging partner, not to dominate the conversation with your own pre-programmed details.`,
            `Speak from your (simulated) personal experiences and opinions, keeping them relevant and concise.`,
            `Your aim is to provide an IMMERSIVE, BELIEVABLE, and ENGAGING human-like language practice experience. Do not use markdown formatting in your responses.`
        );

        const fullSystemPrompt = systemPromptParts.join(' ');
        addMessageToGeminiHistoryInternal(historyArray, 'user', fullSystemPrompt);

        // Model Acknowledgment
          let modelAck = `Understood. I am ${connector.profileName}, a human from ${connector.city}. I will fully embody this persona, keep my responses concise and interactive, focus on the user, and reveal persona details only gradually and naturally. I will NEVER reveal I am an AI. I will primarily speak ${primaryLanguage}.`;
        modelAck += ` I'm ready to make a good, brief first impression and then listen.`;
        addMessageToGeminiHistoryInternal(historyArray, 'model', modelAck);

        console.log(`ChatManager: Gemini history initialized for ${connector.id}. SysPrompt Length: ${fullSystemPrompt.length}.`);
    }

    function addMessageToGeminiHistoryInternal(historyArray, role, text, imageParts = null) {
        if (!text && !imageParts) {
            return;
        }
        const parts = [];
        if (imageParts) parts.push(...imageParts);
        if (text) parts.push({ text });
        historyArray.push({ role: role, parts: parts });
        const maxTurnsLength = 2 + (MAX_GEMINI_HISTORY_TURNS * 2);
        if (historyArray.length > maxTurnsLength) {
            const systemPrompts = historyArray.slice(0, 2);
            const recentTurns = historyArray.slice(-MAX_GEMINI_HISTORY_TURNS * 2);
            historyArray.length = 0;
            historyArray.push(...systemPrompts, ...recentTurns);
        }
    }

    function ensureConversationRecord(connectorId, connectorData = null) {
        // console.log("ChatManager: ensureConversationRecord - Called with ID:", connectorId, "Provided data:", connectorData);
        if (!activeConversations[connectorId]) {
            const connector = connectorData || (window.polyglotConnectors || []).find(c => c.id === connectorId);
            // console.log("ChatManager: ensureConversationRecord - Connector lookup for new record:", connector);
            if (!connector) {
                console.error("ChatManager: ensureConversationRecord - Connector not found for ID:", connectorId);
                return false;
            }
            activeConversations[connectorId] = {
                connector: { ...connector },
                messages: [],
                lastActivity: Date.now(),
                geminiHistory: []
            };
            // console.log("ChatManager: ensureConversationRecord - Created new conversation record:", activeConversations[connectorId]);
            initializeGeminiHistory(activeConversations[connectorId].geminiHistory, connector);
            return true;
        }
        activeConversations[connectorId].lastActivity = Date.now();
        const liveConnector = connectorData || (window.polyglotConnectors || []).find(c => c.id === connectorId);
        if (liveConnector) {
            activeConversations[connectorId].connector = { ...liveConnector };
        }
        // console.log("ChatManager: ensureConversationRecord - Updated existing conversation record:", activeConversations[connectorId]);
        return false;
    }

    async function sendEmbeddedTextMessage(textFromInput) {
        const { uiUpdater, geminiService, activityManager, listRenderer, polyglotHelpers } = getDeps();
        const text = textFromInput?.trim();
        if (!text || !currentEmbeddedChatTargetId || !uiUpdater || !geminiService || !activityManager || !polyglotHelpers) {
            console.error("ChatManager.sendEmbeddedTextMessage: Missing dependencies or data. TargetID:", currentEmbeddedChatTargetId);
            return;
        }
        const convo = activeConversations[currentEmbeddedChatTargetId];
        if (!convo?.connector) {
            console.error("ChatManager: Invalid conversation for embedded chat. Target ID:", currentEmbeddedChatTargetId, "Convo:", convo);
            return;
        }
        uiUpdater.appendToEmbeddedChatLog(text, 'user');
        convo.messages.push({ sender: 'user', text: text, timestamp: Date.now() });
        convo.lastActivity = Date.now();
        addMessageToGeminiHistoryInternal(convo.geminiHistory, 'user', text);
        uiUpdater.clearEmbeddedChatInput();
        uiUpdater.toggleEmbeddedSendButton(false);
        const thinkingMsg = uiUpdater.appendToEmbeddedChatLog(
            `${polyglotHelpers.sanitizeTextForDisplay(convo.connector.profileName.split(' ')[0])} is typing...`,
            'connector-thinking'
        );
        try {
            const response = await geminiService.generateTextMessage(text, convo.connector, convo.geminiHistory);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToEmbeddedChatLog(response, 'connector');
            convo.messages.push({ sender: 'connector', text: response, timestamp: Date.now() });
            addMessageToGeminiHistoryInternal(convo.geminiHistory, 'model', response);
            convo.lastActivity = Date.now();
        } catch (e) {
            console.error("ChatManager.sendEmbeddedTextMessage Error:", e);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToEmbeddedChatLog(`Error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true });
        } finally {
            uiUpdater.toggleEmbeddedSendButton(true);
            saveConversationsToStorage();
            if (listRenderer) listRenderer.renderActiveChatList(activeConversations, openConversation);
        }
    }

    async function handleEmbeddedImageUpload(event) {
        const { uiUpdater, geminiService, listRenderer, domElements, polyglotHelpers } = getDeps();
        const file = event.target.files[0];
        if (!file || !currentEmbeddedChatTargetId) {
            console.error("ChatManager.handleEmbeddedImageUpload: Missing file or target ID.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        const convo = activeConversations[currentEmbeddedChatTargetId];
        if (!convo?.connector) {
            console.error("ChatManager.handleEmbeddedImageUpload: Invalid conversation for embedded image upload.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        // Check file size and tutor role
        if (file.size > 4 * 1024 * 1024) {
            alert("Image too large (max 4MB). Please select a smaller image.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result.split(',')[1];
            const imageUrlForDisplay = reader.result; // Data URL for <img src>

            // Display user's image in a chat bubble immediately
            uiUpdater.appendToEmbeddedChatLog("", 'user', { imageUrl: imageUrlForDisplay });

            convo.messages.push({
                sender: 'user',
                type: 'image',
                content_url: imageUrlForDisplay,
                text: "[User sent image]",
                timestamp: Date.now()
            });

            // Prepare to send to Gemini
            const imagePartsForGemini = [{ inlineData: { mimeType: file.type, data: base64 } }];
            addMessageToGeminiHistoryInternal(convo.geminiHistory, 'user', "User sent an image to discuss.", imagePartsForGemini);

            uiUpdater.toggleEmbeddedSendButton(false);
            const thinkingMsg = uiUpdater.appendToEmbeddedChatLog(
                `${polyglotHelpers.sanitizeTextForDisplay(convo.connector.profileName.split(' ')[0])} is analyzing...`,
                'connector-thinking'
            );

            try {
                const promptForGemini = `The user has sent this image. Please comment on it or ask a relevant question in ${convo.connector.language}.`;
                const aiResponseText = await geminiService.generateTextMessage(promptForGemini, convo.connector, convo.geminiHistory);

                if (thinkingMsg?.remove) thinkingMsg.remove();

                // Display AI's text response
                uiUpdater.appendToEmbeddedChatLog(aiResponseText, 'connector');

                convo.messages.push({ sender: 'connector', text: aiResponseText, timestamp: Date.now() });
                addMessageToGeminiHistoryInternal(convo.geminiHistory, 'model', aiResponseText);

            } catch (e) {
                console.error("ChatManager.handleEmbeddedImageUpload Error:", e);
                if (thinkingMsg?.remove) thinkingMsg.remove();
                uiUpdater.appendToEmbeddedChatLog(`Error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true });
            } finally {
                convo.lastActivity = Date.now();
                uiUpdater.toggleEmbeddedSendButton(true);
                saveConversationsToStorage();
                if (listRenderer) listRenderer.renderActiveChatList(activeConversations, openConversation);
                if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
            }
        };

        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            alert("Error reading file. Please try again.");
            if (domElements?.embeddedMessageImageUpload) domElements.embeddedMessageImageUpload.value = '';
        };

        reader.readAsDataURL(file);
    }

    // New function to setup voice memo button listeners
    function setupVoiceMemoButtonListeners() {
        const { domElements } = getDeps();
        console.log("ChatManager: setupVoiceMemoButtonListeners called.");
        if (!domElements) {
            console.error("ChatManager: domElements not available for voice memo listeners.");
            return;
        }

        if (domElements.embeddedMessageMicBtn) {
            domElements.embeddedMessageMicBtn.addEventListener('click', () => {
                console.log("ChatManager: Embedded Mic Button CLICKED. isRecording:", isRecordingVoiceMemo);
                handleVoiceMemoButtonClick('embedded', domElements.embeddedMessageMicBtn);
            });
        } else {
            console.warn("ChatManager: domElements.embeddedMessageMicBtn not found.");
        }

        if (domElements.messageModalMicBtn) {
            domElements.messageModalMicBtn.addEventListener('click', () => {
                console.log("ChatManager: Modal Mic Button CLICKED. isRecording:", isRecordingVoiceMemo);
                handleVoiceMemoButtonClick('modal', domElements.messageModalMicBtn);
            });
        } else {
            console.warn("ChatManager: domElements.messageModalMicBtn not found.");
        }
        console.log("ChatManager: Voice memo button listeners setup complete.");
    }

    async function handleVoiceMemoButtonClick(interfaceType, buttonElement) {
        console.log(`ChatManager: handleVoiceMemoButtonClick for ${interfaceType}. Currently recording: ${isRecordingVoiceMemo}`);
        if (isRecordingVoiceMemo) {
            await stopVoiceMemoRecording(buttonElement); // Pass button for UI reset
        } else {
            currentRecordingInterfaceType = interfaceType; // Set before starting
            await startVoiceMemoRecording(buttonElement);
        }
    }

    async function startVoiceMemoRecording(buttonElement) {
        const { uiUpdater } = getDeps();
        if (isRecordingVoiceMemo) {
            console.warn("ChatManager: startVoiceMemoRecording called while already recording.");
            return;
        }
        console.log("ChatManager: Attempting to start voice memo recording for interface:", currentRecordingInterfaceType);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("ChatManager: getUserMedia not supported!");
            alert("Your browser doesn't support audio recording.");
            return;
        }

        try {
            userMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.log("ChatManager: Microphone stream obtained.");
            isRecordingVoiceMemo = true;
            audioChunks = [];

            if (buttonElement) {
                buttonElement.classList.add('recording');
                buttonElement.innerHTML = '<i class="fas fa-stop"></i>';
                buttonElement.title = "Stop Recording";
                console.log("ChatManager: Mic button UI updated to 'recording'.");
            }

            const mimeTypesToTry = [
                'audio/webm;codecs=opus',
                'audio/ogg;codecs=opus',
                'audio/mp4', // For AAC
                'audio/aac',
                'audio/wav'
            ];
            const supportedMimeType = mimeTypesToTry.find(type => MediaRecorder.isTypeSupported(type));
            
            if (!supportedMimeType) {
                console.error("ChatManager: No suitable MIME type found for MediaRecorder.");
                alert("Audio recording format not supported by your browser.");
                isRecordingVoiceMemo = false;
                if (userMicStream) userMicStream.getTracks().forEach(track => track.stop());
                if (buttonElement) { /* reset button UI */ }
                return;
            }
            console.log("ChatManager: Using MIME type for MediaRecorder:", supportedMimeType);

            mediaRecorder = new MediaRecorder(userMicStream, { mimeType: supportedMimeType });

            mediaRecorder.ondataavailable = (event) => {
                console.log("ChatManager: MediaRecorder ondataavailable, data size:", event.data.size);
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log("ChatManager: MediaRecorder onstop event triggered.");
                isRecordingVoiceMemo = false;
                if (userMicStream) {
                    userMicStream.getTracks().forEach(track => track.stop());
                    console.log("ChatManager: Microphone stream tracks stopped.");
                    userMicStream = null;
                }

                if (buttonElement) {
                    buttonElement.classList.remove('recording');
                    buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
                    buttonElement.title = "Send Voice Message";
                    console.log("ChatManager: Mic button UI reset to idle.");
                }

                if (audioChunks.length === 0) {
                    console.warn("ChatManager: No audio data recorded for voice memo. Not processing.");
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                console.log("ChatManager: Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);
                audioChunks = [];

                const placeholderText = "[User sent a voice message]";
                if (currentRecordingInterfaceType === 'embedded' && currentEmbeddedChatTargetId) {
                    uiUpdater.appendToEmbeddedChatLog(placeholderText, 'user-audio');
                } else if (currentRecordingInterfaceType === 'modal' && currentModalMessageTarget) {
                    uiUpdater.appendToMessageLogModal(placeholderText, 'user-audio');
                }

                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    console.log("ChatManager: FileReader onloadend - audio converted to base64.");
                    const base64Audio = reader.result.split(',')[1];
                    const targetConnector = currentRecordingInterfaceType === 'embedded' ?
                        activeConversations[currentEmbeddedChatTargetId]?.connector : currentModalMessageTarget;

                    if (targetConnector) {
                        await processAndSendVoiceMemo(base64Audio, audioBlob.type, targetConnector, currentRecordingInterfaceType);
                    } else {
                        console.error("ChatManager: No target connector found for voice memo processing.");
                    }
                };
                reader.onerror = (error) => {
                    console.error("ChatManager: FileReader error converting voice memo to base64:", error);
                };
            };

            mediaRecorder.onerror = (event) => {
                console.error("ChatManager: MediaRecorder error event:", event.error);
                isRecordingVoiceMemo = false;
                if (userMicStream) userMicStream.getTracks().forEach(track => track.stop());
                if (buttonElement) { /* reset button UI */ }
                alert(`Audio recording error: ${event.error.name}`);
            };

            mediaRecorder.start();
            console.log("ChatManager: MediaRecorder started successfully.");

        } catch (err) {
            console.error("ChatManager: Error in startVoiceMemoRecording:", err);
            alert(`Could not start recording. Error: ${err.message}`);
            isRecordingVoiceMemo = false;
            if (userMicStream) userMicStream.getTracks().forEach(track => track.stop());
            if (buttonElement) {
                buttonElement.classList.remove('recording');
                buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
                buttonElement.title = "Send Voice Message";
            }
        }
    }

    async function stopVoiceMemoRecording(buttonElement) {
        console.log("ChatManager: stopVoiceMemoRecording called. MediaRecorder state:", mediaRecorder?.state);
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        } else {
            console.warn("ChatManager: stopVoiceMemoRecording called but MediaRecorder not in 'recording' state.");
            isRecordingVoiceMemo = false;
            if (userMicStream) {
                userMicStream.getTracks().forEach(track => track.stop());
                userMicStream = null;
            }
            if (buttonElement) {
                buttonElement.classList.remove('recording');
                buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
                buttonElement.title = "Send Voice Message";
            }
        }
    }

    async function processAndSendVoiceMemo(base64Audio, mimeType, connector, interfaceType) {
        const { geminiService, uiUpdater, listRenderer } = getDeps();
        console.log("ChatManager: processAndSendVoiceMemo for connector:", connector.id, "Interface:", interfaceType);

        let transcribingMsgElement;
        const transcribingText = `[Transcribing your voice message...]`;
        if (interfaceType === 'embedded') {
            transcribingMsgElement = uiUpdater.appendToEmbeddedChatLog(transcribingText, 'user-thinking');
        } else if (interfaceType === 'modal') {
            transcribingMsgElement = uiUpdater.appendToMessageLogModal(transcribingText, 'user-thinking');
        }

        try {
            const languageHint = connector.languageCode || 'en-US';
            console.log("ChatManager: Calling transcribeAudioToText. Lang hint:", languageHint);
            const transcribedText = await geminiService.transcribeAudioToText(base64Audio, mimeType, languageHint);

            if (transcribingMsgElement?.remove) transcribingMsgElement.remove();

            if (!transcribedText || transcribedText.trim() === "") {
                console.warn("ChatManager: Transcription was empty or failed silently.");
                return;
            }
            console.log("ChatManager: Transcription successful:", transcribedText);

            const convoKey = interfaceType === 'embedded' ? currentEmbeddedChatTargetId : currentModalMessageTarget?.id;
            if (!convoKey) {
                console.error("ChatManager: processAndSendVoiceMemo - No active conversation key found.");
                return;
            }
            const convo = activeConversations[convoKey];
            if (!convo) {
                console.error("ChatManager: processAndSendVoiceMemo - No conversation object found for key:", convoKey);
                return;
            }

            convo.messages.push({ sender: 'user-voice-transcript', text: transcribedText, timestamp: Date.now(), originalMimeType: mimeType });
            addMessageToGeminiHistoryInternal(convo.geminiHistory, 'user', transcribedText);
            console.log("ChatManager: Voice memo transcript added to histories.");

            let thinkingMsgAiResponse;
            if (interfaceType === 'embedded') {
                thinkingMsgAiResponse = uiUpdater.appendToEmbeddedChatLog(`${connector.profileName.split(' ')[0]} is typing...`, 'connector-thinking');
            } else {
                thinkingMsgAiResponse = uiUpdater.appendToMessageLogModal(`${connector.profileName.split(' ')[0]} is typing...`, 'connector-thinking');
            }

            const aiResponse = await geminiService.generateTextMessage(transcribedText, connector, convo.geminiHistory);
            if (thinkingMsgAiResponse?.remove) thinkingMsgAiResponse.remove();

            if (interfaceType === 'embedded') {
                uiUpdater.appendToEmbeddedChatLog(aiResponse, 'connector');
            } else {
                uiUpdater.appendToMessageLogModal(aiResponse, 'connector');
            }
            convo.messages.push({ sender: 'connector', text: aiResponse, timestamp: Date.now() });
            addMessageToGeminiHistoryInternal(convo.geminiHistory, 'model', aiResponse);
            convo.lastActivity = Date.now();
            saveConversationsToStorage();
            if (listRenderer) listRenderer.renderActiveChatList(activeConversations, openConversation);
            console.log("ChatManager: AI response to voice memo processed and displayed.");

        } catch (error) {
            console.error("ChatManager: Error in processAndSendVoiceMemo:", error);
            if (transcribingMsgElement?.remove) transcribingMsgElement.remove();
        }
    }

    function openConversation(connectorOrId) {
        const { uiUpdater, listRenderer, domElements, polyglotHelpers, chatUiManager } = getDeps();
        const targetId = typeof connectorOrId === 'string' ? connectorOrId : connectorOrId?.id;

        console.log("ChatManager: openConversation - Called with targetId:", targetId);

        if (!targetId || !uiUpdater || !chatUiManager || !polyglotHelpers) {
            console.error("ChatManager: openConversation - Missing dependencies or invalid arguments:", { targetId, uiUpdater, chatUiManager, polyglotHelpers });
            chatUiManager?.hideEmbeddedChatInterface(); // Use chatUiManager to hide chat
            return;
        }

        ensureConversationRecord(targetId, typeof connectorOrId === 'object' ? connectorOrId : null);
        const convo = activeConversations[targetId];

        if (!convo?.connector) {
            console.error(`ChatManager: openConversation - No valid conversation or connector found for ${targetId}.`);
            chatUiManager?.hideEmbeddedChatInterface(); // Use chatUiManager to hide chat
            return;
        }

        currentEmbeddedChatTargetId = targetId;

        if (chatUiManager?.showEmbeddedChatInterface) {
            console.log("ChatManager: openConversation - Calling chatUiManager.showEmbeddedChatInterface for connector:", convo.connector);
            chatUiManager.showEmbeddedChatInterface(convo.connector);

            // Repopulate messages AFTER showEmbeddedChatInterface (which clears the log via uiUpdater)
            convo.messages?.forEach((msg, index) => {
                if (msg.type === 'image' && msg.content_url) {
                    uiUpdater.showImageInEmbeddedChat(msg.content_url);
                }
                if (msg.text) {
                    uiUpdater.appendToEmbeddedChatLog(msg.text, msg.sender.startsWith('user') ? 'user' : 'connector');
                }
            });

            if (domElements?.embeddedChatLog) {
                requestAnimationFrame(() => {
                    domElements.embeddedChatLog.scrollTop = domElements.embeddedChatLog.scrollHeight;
                });
            }
        } else {
            console.error("ChatManager: openConversation - chatUiManager.showEmbeddedChatInterface is not available!");
        }

        convo.lastActivity = Date.now();
        saveConversationsToStorage();

        if (listRenderer) {
            listRenderer.renderActiveChatList(activeConversations, openConversation);
        }
    }

    function handleMessagesTabActive() {
        const { listRenderer, chatUiManager } = getDeps();
        console.log("ChatManager: handleMessagesTabActive - Called. Current embedded target:", currentEmbeddedChatTargetId);

        if (!chatUiManager) {
            console.error("ChatManager: handleMessagesTabActive - chatUiManager is NOT available. Aborting.");
            return;
        }

        if (currentEmbeddedChatTargetId && activeConversations[currentEmbeddedChatTargetId]) {
            openConversation(activeConversations[currentEmbeddedChatTargetId].connector);
        } else {
            const convosWithMessages = Object.values(activeConversations).filter(c => c.messages?.length > 0);
            if (convosWithMessages.length > 0) {
                convosWithMessages.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
                openConversation(convosWithMessages[0].connector);
            } else {
                console.log("ChatManager: handleMessagesTabActive - No conversations with messages. Hiding embedded chat.");
                chatUiManager.hideEmbeddedChatInterface(); // Use chatUiManager to hide chat
            }
        }

        if (listRenderer) {
            listRenderer.renderActiveChatList(activeConversations, openConversation);
        }
    }

    function openMessageModal(connector) {
        const { uiUpdater, modalHandler, domElements, polyglotHelpers } = getDeps();
        if (!connector?.id || !uiUpdater || !modalHandler || !domElements || !polyglotHelpers) {
            console.error("ChatManager.openMessageModal: Missing dependencies or connector.");
            return;
        }
        ensureConversationRecord(connector.id, connector);
        currentModalMessageTarget = connector;
        const convo = activeConversations[connector.id];
        if (!convo) {
            console.error("ChatManager.openMessageModal: Conversation record not found for connector:", connector.id);
            return;
        }
        uiUpdater.updateMessageModalHeader(connector);
        uiUpdater.clearMessageModalLog();
        if (convo.messages && convo.messages.length > 0) {
            convo.messages.forEach(msg => {
                if (!msg) {
                     console.warn("ChatManager.openMessageModal: Found null/undefined message in conversation", convo);
                     return;
                }
                if (msg.type === 'image' && msg.content_url) {
                    uiUpdater.showImageInMessageModal(msg.content_url);
                }
                if (msg.text) {
                    const senderType = msg.sender?.startsWith('user') ? 'user' : 'connector';
                    uiUpdater.appendToMessageLogModal(msg.text, senderType);
                } else if (msg.type !== 'image') {
                    console.warn("ChatManager.openMessageModal: Message has no text and is not a recognized image type.", msg);
                    uiUpdater.appendToMessageLogModal("[Unsupported message format]", msg.sender?.startsWith('user') ? 'user' : 'connector');
                }
            });
        }
        if (domElements.messageChatLog) {
            requestAnimationFrame(() => {
                domElements.messageChatLog.scrollTop = domElements.messageChatLog.scrollHeight;
            });
        }
        uiUpdater.resetMessageModalInput();
        isMessageModalTTSMuted = false;
        uiUpdater.updateTTSToggleButtonVisual(domElements.toggleMessageTTSBtn, isMessageModalTTSMuted);
        modalHandler.open(domElements.messagingInterface);
        if (domElements.messageTextInput) domElements.messageTextInput.focus();
    }

    async function sendModalTextMessage(textFromInput) {
        const { uiUpdater, geminiService, activityManager, listRenderer, polyglotHelpers, domElements } = getDeps();
        const text = textFromInput?.trim();
        if (!text || !currentModalMessageTarget?.id || !uiUpdater || !geminiService || !activityManager || !polyglotHelpers || !domElements) {
            console.error("ChatManager.sendModalTextMessage: Missing dependencies or data. ModalTargetID:", currentModalMessageTarget?.id);
            return;
        }
        const convo = activeConversations[currentModalMessageTarget.id];
        if (!convo) {
            console.error("ChatManager.sendModalTextMessage: Conversation not found for modal target:", currentModalMessageTarget.id);
            return;
        }
        uiUpdater.appendToMessageLogModal(text, 'user');
        convo.messages.push({ sender: 'user', text: text, timestamp: Date.now() });
        convo.lastActivity = Date.now();
        addMessageToGeminiHistoryInternal(convo.geminiHistory, 'user', text);
        uiUpdater.resetMessageModalInput();
        if (domElements.messageSendBtn) domElements.messageSendBtn.disabled = true;
        const thinkingMsg = uiUpdater.appendToMessageLogModal(
            `${polyglotHelpers.sanitizeTextForDisplay(currentModalMessageTarget.profileName.split(' ')[0])} is typing...`,
            'connector-thinking'
        );
        try {
            const langCodeToUse = currentModalMessageTarget.languageCode;
            const voiceNameToUse = currentModalMessageTarget.voiceName;
            const response = await geminiService.generateTextMessage(text, currentModalMessageTarget, convo.geminiHistory);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToMessageLogModal(response, 'connector');
            convo.messages.push({ sender: 'connector', text: response, timestamp: Date.now() });
            addMessageToGeminiHistoryInternal(convo.geminiHistory, 'model', response);
            convo.lastActivity = Date.now();
            // Removed TTS call for message modal
            // if (!isMessageModalTTSMuted && polyglotHelpers?.speakText && response && langCodeToUse) {
            //     polyglotHelpers.speakText(response, langCodeToUse, voiceNameToUse);
            // }
        } catch (e) {
            console.error("ChatManager.sendModalTextMessage Error:", e);
            if (thinkingMsg?.remove) thinkingMsg.remove();
            uiUpdater.appendToMessageLogModal(`Error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true });
        } finally {
            if (domElements.messageSendBtn) domElements.messageSendBtn.disabled = false;
            saveConversationsToStorage();
            if (listRenderer) {
                listRenderer.renderActiveChatList(activeConversations, openConversation);
            }
        }
    }

    function endModalMessagingSession() {
        const { modalHandler, domElements } = getDeps();
        modalHandler?.close(domElements?.messagingInterface);
        currentModalMessageTarget = null;
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    }

    function toggleMessageModalTTS() {
        const { uiUpdater, domElements } = getDeps();
        isMessageModalTTSMuted = !isMessageModalTTSMuted;
        uiUpdater?.updateTTSToggleButtonVisual(domElements?.toggleMessageTTSBtn, isMessageModalTTSMuted);
        if (isMessageModalTTSMuted && window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    }
    // console.log("core/chat_manager.js loaded with improvements.");
    return {
        initialize,
        ensureConversationRecord,
        sendEmbeddedTextMessage,
        handleEmbeddedImageUpload,
        openConversation,
        handleMessagesTabActive,
        openMessageModal,
        sendModalTextMessage,
        endModalMessagingSession,
        toggleMessageModalTTS,
        getActiveConversations: () => activeConversations,
        getCurrentEmbeddedChatTargetId: () => currentEmbeddedChatTargetId,
        filterAndDisplayConnectors: (filters) => {
            const { cardRenderer, activityManager } = getDeps();
            if (!window.polyglotConnectors || !cardRenderer || !activityManager) {
                console.warn("ChatManager.filterAndDisplayConnectors: Missing dependencies.");
                return;
            }
            let filtered = window.polyglotConnectors.map(c => ({ ...c, isActive: activityManager.isConnectorActive(c) }));
            if (filters.language && filters.language !== 'all') {
                filtered = filtered.filter(c => c.languageRoles && c.languageRoles[filters.language]);
            }
            if (filters.role && filters.role !== 'all') {
                filtered = filtered.filter(c => {
                    if (!c.languageRoles) return false;
                    if (filters.language && filters.language !== 'all') {
                        return c.languageRoles[filters.language] && Array.isArray(c.languageRoles[filters.language]) && c.languageRoles[filters.language].includes(filters.role);
                    } else {
                        return Object.values(c.languageRoles).some(langDataArray => Array.isArray(langDataArray) && langDataArray.includes(filters.role));
                    }
                });
            }
            cardRenderer.renderCards(filtered);
        }
    };
})();
// if (!window.chatManager) {
//     console.error("Failed to initialize window.chatManager in chat_manager.js");
// }