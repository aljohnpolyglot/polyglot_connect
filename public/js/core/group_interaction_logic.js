// js/core/group_interaction_logic.js
// Manages AI interaction flow, prompting, and turn-taking in group chats.

window.groupInteractionLogic = (() => {
    'use strict';

    const getDeps = () => ({
        activityManager: window.activityManager,
        aiService: window.aiService,
        polyglotHelpers: window.polyglotHelpers,
        groupDataManager: window.groupDataManager,
        groupUiHandler: window.groupUiHandler,
        uiUpdater: window.uiUpdater, // <<<< ADDED uiUpdater HERE
        aiApiConstants: window._aiApiConstants
    });

    const MAX_HISTORY_FOR_AI_CONTEXT = 8;
    let currentGroupMembersInternal = [];
    let currentGroupTutorInternal = null;
    let lastAiSpeakerIndex = -1;
    let messageIntervalId = null;
    let isUserTypingInGroupInternal = false;
    let aiResponding = false;
    let thinkingBubbleElement = null; // <<<< ADDED: To keep track of the temporary typing bubble

    function initialize(groupMembers, groupTutor) {
        console.log("GroupInteractionLogic: Initializing with members and tutor.");
        currentGroupMembersInternal = groupMembers || [];
        currentGroupTutorInternal = groupTutor || null;
        lastAiSpeakerIndex = -1;
        aiResponding = false;
        if (thinkingBubbleElement) { // Clear any lingering bubble from a previous group
            thinkingBubbleElement.remove();
            thinkingBubbleElement = null;
        }
    }

    function reset() {
        console.log("GroupInteractionLogic: Resetting state.");
        stopConversationFlow(); // This will also clear thinkingBubbleElement
        currentGroupMembersInternal = [];
        currentGroupTutorInternal = null;
        lastAiSpeakerIndex = -1;
        aiResponding = false;
    }

    function setUserTypingStatus(isTyping) {
        isUserTypingInGroupInternal = isTyping;
    }

    function startConversationFlow() {
        const { polyglotHelpers, groupDataManager } = getDeps(); // Added groupDataManager
        const currentGroupId = groupDataManager.getCurrentGroupId();
        if (!currentGroupId) {
            console.warn("GroupInteractionLogic: Cannot start flow, no current group ID.");
            return;
        }
        stopConversationFlow();
        console.log("GroupInteractionLogic: Starting conversation flow for group:", currentGroupId);
        let baseInterval = polyglotHelpers.simulateTypingDelay(18000, 100) + Math.random() * 12000;

        messageIntervalId = setInterval(() => {
            if (isUserTypingInGroupInternal || aiResponding || !groupDataManager.getCurrentGroupId() || currentGroupMembersInternal.length <= 1) {
                return;
            }
            simulateAiMessageInGroup();
            baseInterval = polyglotHelpers.simulateTypingDelay(15000, 90) + Math.random() * 10000;
        }, baseInterval);
    }

    function stopConversationFlow() {
        if (messageIntervalId) {
            clearInterval(messageIntervalId);
            messageIntervalId = null;
        }
        if (thinkingBubbleElement) { // Clear thinking bubble if flow stops
            thinkingBubbleElement.remove();
            thinkingBubbleElement = null;
        }
        // The dedicated typing indicator div is not used by this module directly anymore for AI typing
        // It was previously cleared by groupUiHandler.updateGroupTypingIndicator('').
        // User typing indicator is handled by groupManager facade.
    }

    async function handleUserMessage(text) {
        const { groupDataManager, groupUiHandler } = getDeps();
        const currentGroupId = groupDataManager.getCurrentGroupId();
        if (!text || !currentGroupId) return;

        console.log(`GroupInteractionLogic: User message in group ${currentGroupId}: "${text}"`);
        groupUiHandler.appendMessageToGroupLog(text, "You", true, "user_player");
        groupDataManager.addMessageToCurrentGroupHistory({ speakerId: "user_player", text: text, timestamp: Date.now() });
        groupDataManager.saveCurrentGroupChatHistory(true); // Explicitly trigger list update
        groupUiHandler.clearGroupInput();

        stopConversationFlow();
        // setUserTypingStatus(false); // This is handled by timeout in groupManager
        // groupUiHandler.updateGroupTypingIndicator(''); // Not needed if we removed "You are typing"

        await simulateAiMessageInGroup(true, text); // Pass user's text
        startConversationFlow();
    }

    async function simulateAiMessageInGroup(isReplyToUser = false, userMessageText = "") {
        if (aiResponding) {
            console.log("GroupInteractionLogic: AI is already responding, skipping.");
            return;
        }
        aiResponding = true;

        const { activityManager, aiService, polyglotHelpers, groupDataManager, uiUpdater, aiApiConstants } = getDeps(); // uiUpdater is now here
        const currentGroupDef = groupDataManager.getCurrentGroupData();

        if (!currentGroupDef || !currentGroupMembersInternal?.length || !aiService || !uiUpdater) { // uiUpdater check is now valid
            console.error("GroupInteractionLogic: Missing critical data for AI message (group, members, AI service, or uiUpdater).");
            aiResponding = false;
            return;
        }

        let aiSpeakers = currentGroupMembersInternal.filter(m => m.id !== "user_player");
        if (aiSpeakers.length === 0) {
            console.log("GroupInteractionLogic: No AI speakers in group.");
            aiResponding = false;
            return;
        }

        let speaker;
        let mentionedPersonaName = null;

        if (isReplyToUser && userMessageText) {
            const mentionMatch = userMessageText.match(/@(\w+)/);
            if (mentionMatch && mentionMatch[1]) {
                const namePart = mentionMatch[1].toLowerCase();
                const mentionedMember = currentGroupMembersInternal.find(
                    m => (m.profileName.toLowerCase().startsWith(namePart) || m.name.toLowerCase().startsWith(namePart)) && m.id !== "user_player"
                );
                if (mentionedMember) {
                    speaker = mentionedMember;
                    mentionedPersonaName = speaker.profileName;
                    console.log(`GroupInteractionLogic: User mentioned ${speaker.profileName}. Prioritizing.`);
                }
            }
        }

        if (!speaker) {
            lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % aiSpeakers.length;
            speaker = aiSpeakers[lastAiSpeakerIndex];
        }

        if (!speaker || !speaker.profileName) {
            console.error("GroupInteractionLogic: Selected AI speaker is invalid.", speaker);
            aiResponding = false;
            return;
        }
        console.log(`GroupInteractionLogic: AI ${speaker.profileName} (ID: ${speaker.id}) is preparing to speak.`);

        // --- Temporary Chat Bubble for Typing Indicator ---
        if (thinkingBubbleElement) thinkingBubbleElement.remove();
        const typingText = `${speaker.profileName.split(' ')[0]} is typing...`;
        thinkingBubbleElement = uiUpdater.appendToGroupChatLog( // Uses uiUpdater directly
            typingText,
            speaker.profileName,
            false,
            speaker.id,
            { isThinking: true, avatarUrl: speaker.avatarModern }
        );
        // --- End Temporary Chat Bubble ---

        const baseDelay = isReplyToUser
            ? activityManager.getAiReplyDelay(speaker, 10) // Short delay for "thinking" bubble display
            : activityManager.getAiReplyDelay(speaker, 80) + Math.random() * 1500; // For spontaneous turn

        // --- Prompt Construction (Ensure this is complete from previous versions) ---
        let personaPrompt = `You are ${speaker.profileName}. Your age is ${speaker.age}. Your profession is ${speaker.profession || 'not specified'}. `;
        if (speaker.interests?.length) personaPrompt += `You are interested in ${speaker.interests.slice(0, 2).join(', ')}. `;
        const groupLanguage = currentGroupDef.language;
        const speakerRolesInGroupLang = speaker.languageRoles?.[groupLanguage];
        if (speakerRolesInGroupLang?.includes('learner')) {
            const practiceLangEntry = speaker.practiceLanguages?.find(lang => lang.lang === groupLanguage);
            if (practiceLangEntry && (practiceLangEntry.levelTag === 'beginner' || practiceLangEntry.levelTag === 'learning')) {
                personaPrompt += `You are learning ${groupLanguage} at a '${practiceLangEntry.levelTag}' level. Use simpler vocabulary and sentences. You might make occasional minor mistakes typical for this level, but try to be understood. Do not make excessive errors. `;
            } else { personaPrompt += `You are participating as a learner of ${groupLanguage}. `; }
        } else if (speaker.id === currentGroupTutorInternal?.id) {
            personaPrompt += `You are the TUTOR for this ${groupLanguage} group. Your role is to facilitate discussion, gently correct major errors if needed, ask engaging questions, and ensure the conversation stays on topic and inclusive. `;
        } else { personaPrompt += `You are proficient in ${groupLanguage}. `; }

        const groupChatHistory = groupDataManager.getLoadedChatHistory();
        let historyString = "Recent messages (most recent is last):\n";
        const humanUserDisplayNameInPrompt = "Our Friend";

        groupChatHistory.slice(-MAX_HISTORY_FOR_AI_CONTEXT).forEach(msg => {
            const member = currentGroupMembersInternal.find(m => m.id === msg.speakerId) ||
                           (msg.speakerId === "user_player" ? { profileName: humanUserDisplayNameInPrompt } : { profileName: msg.speakerName || "Guest" });
            historyString += `${member.profileName}: ${msg.text}\n`;
        });
        if (groupChatHistory.length === 0) historyString += `(No recent messages. If you are the tutor, you can start a topic or greet ${humanUserDisplayNameInPrompt} and the group.)\n`;

        const mainPrompt =
`You are ${speaker.profileName} in a group chat called "${currentGroupDef.name}". Language: ${groupLanguage}. Topic: ${currentGroupDef.tags.join(', ')}.
Your specific persona & role: ${personaPrompt}
Other members: ${currentGroupMembersInternal.filter(m => m.id !== speaker.id && m.id !== "user_player").map(m => m.profileName).join(', ')}, and "${humanUserDisplayNameInPrompt}" (the human user).
Tutor: ${currentGroupTutorInternal?.profileName || 'N/A'}.
RULES:
1. Stay on topic. Listen. Build upon comments.
2. Refer to "${humanUserDisplayNameInPrompt}" using an appropriate friendly term in ${groupLanguage} (e.g., "notre ami(e)", "nuestro amigo/a"). Refer to other AI members by name.
3. Keep responses brief (1-3 sentences).
4. Tutor: Guide, ask questions, ensure participation.
5. Maintain persona. DO NOT say you are AI.
${mentionedPersonaName ? `IMPORTANT: "${humanUserDisplayNameInPrompt}" just mentioned YOU, ${speaker.profileName}, directly saying: "${userMessageText}". Respond directly to their message to you.` : ''}
${historyString}
It is now your turn, ${speaker.profileName}. ${isReplyToUser && !mentionedPersonaName ? `"${humanUserDisplayNameInPrompt}" just spoke. Respond or continue the discussion.` : mentionedPersonaName ? "" : "Contribute."} Speak in ${groupLanguage}.`;

        const historyForAIService = groupChatHistory.slice(-MAX_HISTORY_FOR_AI_CONTEXT * 2).map(msg => {
            const speakingMember = currentGroupMembersInternal.find(m => m.id === msg.speakerId) ||
                               (msg.speakerId === "user_player" ? { profileName: humanUserDisplayNameInPrompt } : { profileName: msg.speakerName || "Guest" });
            return {
                role: msg.speakerId === "user_player" ? "user" : "model",
                parts: [{text: `${speakingMember.profileName}: ${msg.text}`}]
            };
        });
        // --- End Prompt Construction ---

        try {
            const aiMsg = await aiService.generateTextMessage(
                mainPrompt, speaker, historyForAIService, aiApiConstants.PROVIDERS.GROQ
            );

            if (thinkingBubbleElement) {
                thinkingBubbleElement.remove();
                thinkingBubbleElement = null;
            }

            if (aiMsg && aiMsg.trim() !== "") {
                if (groupDataManager.getCurrentGroupId() === currentGroupDef.id) {
                    getDeps().groupUiHandler.appendMessageToGroupLog(aiMsg, speaker.profileName, false, speaker.id);
                    groupDataManager.addMessageToCurrentGroupHistory({ speakerId: speaker.id, text: aiMsg, timestamp: Date.now() });
                    groupDataManager.saveCurrentGroupChatHistory(true); // Explicitly trigger list update
                    console.log(`GroupInteractionLogic: AI ${speaker.profileName} spoke: "${aiMsg.substring(0, 50)}..."`);
                }
            } else {
                console.warn(`GroupInteractionLogic: AI ${speaker.profileName} generated empty message.`);
            }
        } catch (error) {
            console.error(`GroupInteractionLogic: AI error for ${speaker.profileName}:`, error);
            if (thinkingBubbleElement) {
                thinkingBubbleElement.remove();
                thinkingBubbleElement = null;
            }
        } finally {
            aiResponding = false;
        }
    }

    console.log("core/group_interaction_logic.js updated with direct uiUpdater call and bubble typing indicator.");
    return {
        initialize,
        reset,
        setUserTypingStatus,
        startConversationFlow,
        stopConversationFlow,
        handleUserMessage,
        simulateAiMessageInGroup
    };
})();