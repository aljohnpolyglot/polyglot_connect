// src/js/core/group_interaction_logic.ts
import type {
    ActivityManager,
    AIService,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    GroupDataManager,
    GroupUiHandler,
    UiUpdater,
    AIApiConstants,
    Connector, // <<< Connector is imported
    Group,      // <<< Group is imported
    GroupChatHistoryItem,
    GeminiChatItem
} from '../types/global.d.ts'; // <<< Path to your global definitions
console.log("group_interaction_logic.ts: Script execution STARTED (TS Version).");

export interface GroupInteractionLogicModule {
    initialize: (groupMembers: Connector[], groupTutor: Connector | null) => void;
    reset: () => void;
    setUserTypingStatus: (isTyping: boolean) => void;
    startConversationFlow: () => void;
    stopConversationFlow: () => void;
    handleUserMessage: (text: string | undefined, options?: { userSentImage?: boolean; imageBase64Data?: string; imageMimeType?: string; }) => Promise<void>;
    simulateAiMessageInGroup: (isReplyToUser?: boolean, userMessageText?: string, imageContextForReply?: { base64Data?: string; mimeType?: string; }) => Promise<void>;
    setAwaitingUserFirstIntroduction: (isAwaiting: boolean) => void;
}

window.groupInteractionLogic = {} as GroupInteractionLogicModule;

function initializeActualGroupInteractionLogic(): void {
    console.log("group_interaction_logic.ts: initializeActualGroupInteractionLogic called.");
    const getSafeDeps = (): {
        activityManager: ActivityManager;
        aiService: AIService; 
        polyglotHelpers: PolyglotHelpers;
        groupDataManager: GroupDataManager;
        groupUiHandler: GroupUiHandler;
        uiUpdater: UiUpdater;
        aiApiConstants: AIApiConstants;
    } | null => { 
        const deps = {
            activityManager: window.activityManager as ActivityManager | undefined,
            aiService: window.aiService as AIService | undefined, 
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers | undefined,
            groupDataManager: window.groupDataManager as GroupDataManager | undefined,
            groupUiHandler: window.groupUiHandler as GroupUiHandler | undefined,
            uiUpdater: window.uiUpdater as UiUpdater | undefined,
            aiApiConstants: window.aiApiConstants as AIApiConstants | undefined
        };
        const missingDeps = Object.entries(deps).filter(([key, value]) => !value).map(([key]) => key);
        if (missingDeps.length > 0) {
            console.error(`GroupInteractionLogic (TS): Critical dependencies missing at init: ${missingDeps.join(', ')}. Full deps object:`, deps);
            return null; 
        }
        if (typeof deps.activityManager?.getAiReplyDelay !== 'function' || 
            typeof deps.aiService?.generateTextMessage !== 'function' ||
            typeof deps.polyglotHelpers?.simulateTypingDelay !== 'function' ||
            typeof deps.groupDataManager?.getCurrentGroupId !== 'function' ||
            typeof deps.groupUiHandler?.appendMessageToGroupLog !== 'function' || // Check this specifically
            typeof deps.uiUpdater?.appendToGroupChatLog !== 'function' ||
            !deps.aiApiConstants?.PROVIDERS) { 
            console.error("GroupInteractionLogic (TS): One or more key methods/properties missing from dependencies.", {
                activityManager: !!deps.activityManager?.getAiReplyDelay,
                aiService: !!deps.aiService?.generateTextMessage,
                groupUiHandler_append: typeof deps.groupUiHandler?.appendMessageToGroupLog === 'function'
            });
            return null; 
        }
        return deps as {
            activityManager: ActivityManager;
            aiService: AIService;
            polyglotHelpers: PolyglotHelpers;
            groupDataManager: GroupDataManager;
            groupUiHandler: GroupUiHandler;
            uiUpdater: UiUpdater;
            aiApiConstants: AIApiConstants;
        };
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("GroupInteractionLogic (TS): Failed to resolve critical dependencies. Assigning dummy methods.");
        const dummyAsyncErrorFn = async () => { console.error("GIL (TS) dummy: Method called on non-initialized module."); };
        const dummySyncErrorFn = () => { console.error("GIL (TS) dummy: Method called on non-initialized module."); };
        Object.assign(window.groupInteractionLogic!, {
            initialize: dummySyncErrorFn, reset: dummySyncErrorFn, setUserTypingStatus: dummySyncErrorFn,
            startConversationFlow: dummySyncErrorFn, stopConversationFlow: dummySyncErrorFn,
            handleUserMessage: dummyAsyncErrorFn, 
            simulateAiMessageInGroup: dummyAsyncErrorFn,
            setAwaitingUserFirstIntroduction: dummySyncErrorFn // <<< ADD THIS LINE
        } as GroupInteractionLogicModule);
        document.dispatchEvent(new CustomEvent('groupInteractionLogicReady'));
        console.warn("group_interaction_logic.ts: 'groupInteractionLogicReady' dispatched (INITIALIZATION FAILED - deps missing).");
        return;
    }
    console.log("GroupInteractionLogic (TS): Core functional dependencies appear ready for IIFE.");
    
    const { 
        activityManager, aiService, polyglotHelpers, 
        groupDataManager, groupUiHandler, uiUpdater, aiApiConstants 
    } = resolvedDeps; 

    window.groupInteractionLogic = ((): GroupInteractionLogicModule => {
        'use strict';

        const MAX_HISTORY_FOR_AI_CONTEXT = 8; 
        let currentGroupMembersInternal: Connector[] = [];
        let currentGroupTutorInternal: Connector | null = null;
        let lastAiSpeakerIndex: number = -1;
        let messageIntervalId: ReturnType<typeof setInterval> | null = null; 
        let isUserTypingInGroupInternal: boolean = false;
        let aiResponding: boolean = false;
        let thinkingBubbleElement: HTMLElement | null = null;
        let isAwaitingUserFirstIntroduction = false; // <<< ADD THIS LINE
        let lastAiDirectlyEngagedByUserId: string | null = null; // <<< ADD THIS LINE

        function initialize(groupMembers: Connector[], groupTutor: Connector | null): void {
            console.log("GroupInteractionLogic (TS): Initializing with members and tutor.");
            console.log("GIL: Initializing. Tutor:", groupTutor ? groupTutor.profileName : "None"); 
            currentGroupMembersInternal = groupMembers || [];
            currentGroupTutorInternal = groupTutor || null;
            lastAiSpeakerIndex = -1;
            aiResponding = false;
            isAwaitingUserFirstIntroduction = false; // <<< ADD THIS LINE (Reset on new group init)
            lastAiDirectlyEngagedByUserId = null; // <<< ADD THIS LINE FOR CLEAN STATE
            if (thinkingBubbleElement) {
                thinkingBubbleElement.remove();
                thinkingBubbleElement = null;
            }
        }

        function reset(): void {
            console.log("GroupInteractionLogic (TS): Resetting state.");
            stopConversationFlow(); 
            currentGroupMembersInternal = [];
            currentGroupTutorInternal = null;
            lastAiSpeakerIndex = -1;
            aiResponding = false;
            lastAiDirectlyEngagedByUserId = null; // <<< ADD THIS LINE FOR CLEAN STATE
        }

        function setAwaitingUserFirstIntroduction(isAwaiting: boolean): void {
            console.log(`GIL: setAwaitingUserFirstIntroduction called with: ${isAwaiting}`);
            isAwaitingUserFirstIntroduction = isAwaiting;
            if (isAwaitingUserFirstIntroduction) {
                // If we are now awaiting user intro, ensure any ongoing AI proactive turn is stopped
                stopConversationFlow(); 
                console.log("GIL: Conversation flow stopped as we are awaiting user's first introduction.");
            } else {
                // If we are no longer awaiting, and no AI is currently responding, (re)start flow.
                // This path might be taken after AI intros complete.
                if (!aiResponding) {
                    console.log("GIL: No longer awaiting user intro, and AI not responding. Attempting to restart conversation flow if appropriate.");
                    // We might not want to *always* restart flow here, depends on overall logic.
                    // For now, let's assume it's okay, or startConversationFlow can have its own checks.
                    startConversationFlow();
                }
            }
        }



        function setUserTypingStatus(isTyping: boolean): void {
            isUserTypingInGroupInternal = isTyping;
        }

        function startConversationFlow(): void {
            const currentGroupId = groupDataManager.getCurrentGroupId();
            if (!currentGroupId) {
                console.warn("GroupInteractionLogic (TS): Cannot start flow, no current group ID.");
                return;
            }
            stopConversationFlow(); 
            console.log(`GroupInteractionLogic (TS): Attempting to start conversation flow for group: ${currentGroupId}. Awaiting user intro: ${isAwaitingUserFirstIntroduction}`); // Modified log
            
            if (isAwaitingUserFirstIntroduction) { // <<< ADD THIS IF BLOCK
                console.log("GIL: startConversationFlow - Still awaiting user's first introduction. Proactive AI turns remain paused.");
                return; 
            }
            
            console.log(`GIL: startConversationFlow - Proceeding to set up proactive AI turns for group: ${currentGroupId}`); // New log
            let baseInterval = (polyglotHelpers.simulateTypingDelay(18000, 100) || 18000) + Math.random() * 12000;
    
            messageIntervalId = setInterval(() => {
                if (isUserTypingInGroupInternal || aiResponding || !groupDataManager.getCurrentGroupId() || currentGroupMembersInternal.length <= 1) {
                    return;
                }
                simulateAiMessageInGroup().catch(e => console.error("Error in scheduled simulateAiMessageInGroup:", e));
                baseInterval = (polyglotHelpers.simulateTypingDelay(15000, 90) || 15000) + Math.random() * 10000;
            }, baseInterval);
        }

        function stopConversationFlow(): void {
            if (messageIntervalId) {
                clearInterval(messageIntervalId);
                messageIntervalId = null;
            }
            if (thinkingBubbleElement) {
                thinkingBubbleElement.remove();
                thinkingBubbleElement = null;
            }
        }
        async function introduceAiLearnersSequentially(userIntroText: string): Promise<void> {
            console.log("GIL: introduceAiLearnersSequentially - START. User intro for context:", userIntroText.substring(0, 50) + "...");
            const groupDef = groupDataManager.getCurrentGroupData(); // Get current group def
    
            // Critical dependencies for this function
            if (!currentGroupTutorInternal || !groupDef || !polyglotHelpers || !uiUpdater || !aiService || !aiApiConstants || !groupDataManager || !groupUiHandler) {
                console.error("GIL.introduceAiLearnersSequentially: Missing critical dependencies.");
                aiResponding = false; // Ensure lock is released if we exit early
                startConversationFlow(); // Attempt to restart normal flow
                return;
            }
            
            if (currentGroupMembersInternal.length <= 1) { // Only tutor or tutor + user
                console.log("GIL: No other AI learners to introduce.");
                aiResponding = false; // Release our own lock
                startConversationFlow(); 
                return;
            }
    
            const aiLearners = currentGroupMembersInternal.filter(
                member => member.id !== currentGroupTutorInternal!.id && member.id !== "user_player" 
            );
    
            if (aiLearners.length === 0) {
                console.log("GIL: No AI learners in this group to introduce after filtering.");
                aiResponding = false;
                startConversationFlow();
                return;
            }
            
            console.log(`GIL: Will attempt to introduce ${aiLearners.length} AI learners sequentially.`);
            // aiResponding is already true (set by handleUserMessage before calling this)
    
            for (let i = 0; i < aiLearners.length; i++) {
                const learner = aiLearners[i];
                const delay = (polyglotHelpers.simulateTypingDelay(3000, 70) || 3000) + (Math.random() * 2000);
                await new Promise(resolve => setTimeout(resolve, delay));
    
                // Re-check if still in the same group before this AI speaks
                if (groupDataManager.getCurrentGroupId() !== groupDef.id) {
                    console.warn("GIL: Group changed during AI learner introductions. Aborting further intros for this cycle.");
                    break; // Exit the loop
                }
                
                if (thinkingBubbleElement) {
                    thinkingBubbleElement.remove();
                    thinkingBubbleElement = null;
                }
                const typingText = `${learner.profileName!.split(' ')[0]} is typing...`;
                thinkingBubbleElement = uiUpdater.appendToGroupChatLog(
                    typingText, learner.profileName!, false, learner.id,
                    { isThinking: true, avatarUrl: learner.avatarModern, timestamp: Date.now() }
                );
    
                // Construct a prompt for the learner's introduction
                // GetUserReferenceName will be defined in Block 7
                const userReferenceForPrompt = getUserReferenceName(groupDef.language, true); 
               
                let userStatementForPrompt = `The user (referred to as "${userReferenceForPrompt}") has recently spoken or introduced themselves. Their last relevant input for context was: "${polyglotHelpers.sanitizeTextForDisplay(userIntroText)}"`;
                if (userIntroText === "The tutor welcomed everyone to the group." || userIntroText.trim().toLowerCase() === "hi" || !userIntroText.trim()) { // Added check for empty userIntroText
                    userStatementForPrompt = `The tutor, ${currentGroupTutorInternal.profileName}, has just welcomed everyone and prompted for introductions. The user may have said a brief hello or not spoken substantively yet.`;
                }
               
               
               
                let introPromptContext =
                `You are ${learner.profileName}, an AI language learner in the "${groupDef.name}" group chat. The group language is ${groupDef.language}. The tutor is ${currentGroupTutorInternal.profileName}.
                The user (${userReferenceForPrompt}) has just spoken, saying: "${polyglotHelpers.sanitizeTextForDisplay(userIntroText)}"
                Other learners might be introducing themselves too.

                **YOUR GOAL: Introduce yourself NATURALLY and MEMORABLY in ${groupDef.language}.**

                **CRITICAL FOR YOUR INTRODUCTION (as ${learner.profileName}):**
                1.  **UNIQUE GREETING (1-2 sentences MAX):**
                    *   **AVOID:** Generic phrases like "Hola a todos, me llamo..." or "Estoy emocionado de unirme..." if others are using similar starts.
                    *   **INSTEAD, TRY ONE OF THESE APPROACHES:**
                        *   **Connect to the User/Tutor:** Briefly react to what the user (${userReferenceForPrompt}) or tutor just said. Example: "Thanks for the welcome, ${currentGroupTutorInternal.profileName}! That topic of 'community' is perfect. I'm ${learner.profileName}, by the way."
                        *   **Lead with a Passion:** Start with something core to your persona. Example: "Music is my lifeblood! Especially the rhythms from ${learner.country || 'my region'}. I'm ${learner.profileName}, and I'm hoping to share some of that here." (Draw from ${learner.interests?.join(', ')}, ${learner.bioModern}).
                        *   **State Your Origin/Current Location with Flair:** Example: "Joining you all from sunny ${learner.city || 'my city'}! I'm ${learner.profileName}."
                        *   **Acknowledge Other Learners (if any spoke just before you):** Example: "Great to meet you, [Previous Learner Name]! I'm ${learner.profileName} from ${learner.country || 'my homeland'}."
                 *   Use your defined \`greetingCall\` ("${learner.greetingCall || ''}") or \`greetingMessage\` ("${learner.greetingMessage || ''}") as inspiration if they offer a unique start.
                2.  **ONE KEY THING ABOUT YOU (Persona-Driven):**
                    *   After your name, briefly mention ONE defining aspect. This could be:
                        *   Your profession: "${learner.profession || ''}"
                        *   A primary interest: One of "${learner.interests?.join(', ') || ''}"
                        *   A quirk or habit: "${learner.quirksOrHabits?.[0] || ''}"
                        *   Your reason for learning ${groupDef.language} (if applicable, perhaps inspired by your goals: "${learner.goalsOrMotivations || ''}" ${ (learner.practiceLanguages && learner.practiceLanguages.some(langEntry => langEntry.lang.toLowerCase() === groupDef.language.toLowerCase())) ? `or because it's one of your target practice languages.` : '' })."
                    *   **SHOW, DON'T JUST TELL:** Instead of "I am passionate about X," try "X is something I can talk about for hours!"
                3.  **KEEP IT CONCISE:** Your whole intro should be 2-4 sentences.
                4.  **LANGUAGE:** Speak ONLY in ${groupDef.language}.
                5.  **NO META-TALK:** DO NOT mention being an AI. DO NOT explain your greeting choice. DO NOT start your response with "${learner.profileName}:".

                Your brief, human-like introduction as ${learner.profileName}:`;

    const introHistoryForAI: GeminiChatItem[] = []; // Keep history minimal for intros
    
                try {
                    const aiIntro = await aiService.generateTextMessage(
                        introPromptContext, 
                        learner,
                        introHistoryForAI, 
                        aiApiConstants.PROVIDERS.GROQ 
                    );
    
                    if (thinkingBubbleElement) { thinkingBubbleElement.remove(); thinkingBubbleElement = null; }
    
                    // Re-check group context AGAIN before appending
                    if (groupDataManager.getCurrentGroupId() !== groupDef.id) {
                        console.warn("GIL: Group changed just before appending AI intro. Aborting append for this learner.");
                        continue; 
                    }
    
                    const aiIntroText = (typeof aiIntro === 'string') ? aiIntro.trim() : null;
                    if (aiIntroText) {
                         console.log(`GIL: AI Learner ${learner.profileName} introducing: "${aiIntroText.substring(0,30)}..."`);
                        groupUiHandler.appendMessageToGroupLog(aiIntroText, learner.profileName!, false, learner.id);
                        groupDataManager.addMessageToCurrentGroupHistory({
                            speakerId: learner.id, text: aiIntroText,
                            timestamp: Date.now(), speakerName: learner.profileName
                        });
                        groupDataManager.saveCurrentGroupChatHistory(true); // Save after each AI intro for better UX
                   
                
                   
                    } else {
                        console.warn(`GIL: AI Learner ${learner.profileName} generated empty intro.`);
                    }
                } catch (error) {
                    console.error(`GIL: Error generating intro for ${learner.profileName}:`, error);
                    if (thinkingBubbleElement) { thinkingBubbleElement.remove(); thinkingBubbleElement = null; }
                }
            } // End of for loop for learners
    
            aiResponding = false; // Release the lock after all intros are done or aborted
            console.log("GIL: AI learner introductions finished (or aborted). Restarting normal conversation flow.");
            startConversationFlow(); 
        }



       // D:\polyglot_connect\src\js\core\group_interaction_logic.ts

// <<< START OF REPLACEMENT 2.1 >>>
// D:\polyglot_connect\src\js\core\group_interaction_logic.ts

// <<< START: REPLACE THE ENTIRE handleUserMessage FUNCTION >>>
async function handleUserMessage(
    text: string | undefined,
    options?: { userSentImage?: boolean; imageBase64Data?: string; imageMimeType?: string; }
): Promise<void> {
    const currentGroupId = groupDataManager.getCurrentGroupId();
    const trimmedText = text?.trim();
    
    // Safely check options
    const userSentImage = options?.userSentImage ?? false;

    if ((!trimmedText && !userSentImage) || !currentGroupId) {
        return;
    }
    console.log(`GIL.handleUserMessage: Processing user input. Text: "${trimmedText || ''}", Image Sent: ${userSentImage}`);

    stopConversationFlow();

    const contextualTextForAI = trimmedText || (userSentImage ? "The user shared an image." : "");

    const imageContext = userSentImage ? {
        base64Data: options?.imageBase64Data, // Safely access properties
        mimeType: options?.imageMimeType,
    } : undefined;

    if (isAwaitingUserFirstIntroduction) {
        console.log("GIL: User sent their first input. Flag is true.");
        isAwaitingUserFirstIntroduction = false;
        aiResponding = true;
        
        await simulateAiMessageInGroup(true, contextualTextForAI, imageContext);
        await introduceAiLearnersSequentially(contextualTextForAI);
    } else {
        await simulateAiMessageInGroup(true, contextualTextForAI, imageContext);
        if (!aiResponding && !isAwaitingUserFirstIntroduction) {
            startConversationFlow();
        }
    }
}
// <<< END: REPLACE THE ENTIRE handleUserMessage FUNCTION >>>
// <<< END OF REPLACEMENT 2.1 >>>
    
async function simulateAiMessageInGroup(
    isReplyToUser: boolean = false,
    userMessageText: string = "",
    imageContextForReply?: { base64Data?: string; mimeType?: string; }
): Promise<void> {
    if (aiResponding) {
        console.log("GIL: AI is already responding, skipping.");
        return;
    }
    aiResponding = true;
    const USER_ID_PLACEHOLDER = "user_player"; // <<< ADD THIS LINE
    const currentGroupDef = groupDataManager.getCurrentGroupData();
    if (!currentGroupDef || !currentGroupTutorInternal) {
        console.error("GIL: Cannot simulate message, critical group data missing.");
        aiResponding = false;
        return;
    }

    const groupChatHistory = groupDataManager.getLoadedChatHistory() || [];
    const lastMessageInFullHistory = groupChatHistory.length > 0 ? groupChatHistory[groupChatHistory.length - 1] : null;

    const activeAiSpeakers = currentGroupMembersInternal.filter(m => m.id !== "user_player" && polyglotHelpers.isConnectorCurrentlyActive(m));
    if (activeAiSpeakers.length === 0) {
        aiResponding = false;
        return;
    }

       
    let speaker: Connector | undefined;
    let localMentionedPersonaName: string | null = null; // <<< ADD THIS LINE
    const normalizedUserMessage = userMessageText ? polyglotHelpers.normalizeText(userMessageText) : "";

    // PRIORITY 1: Find an explicitly mentioned speaker.
    if (isReplyToUser && userMessageText) {
        for (const potentialSpeaker of activeAiSpeakers) {
            const firstNamesToMatch = [
                potentialSpeaker.profileName?.split(' ')[0],
                potentialSpeaker.name?.split(' ')[0]
            ].filter(Boolean).map(name => polyglotHelpers.normalizeText(name!));

            const uniqueFirstNames = [...new Set(firstNamesToMatch)];

            for (const firstName of uniqueFirstNames) {
                const namePattern = new RegExp(`\\b${firstName}\\b`, 'i');
                if (namePattern.test(normalizedUserMessage)) {
                    speaker = potentialSpeaker;
                    console.log(`GIL: Speaker Priority 1 - User mentioned '${firstName}', selecting ${speaker.profileName}.`);
                    break; 
                }
            }
            if (speaker) break; // Exit the main loop once a speaker is found
        }
    }

    // PRIORITY 2: If no one was mentioned, check for an implied follow-up question.
    if (!speaker && isReplyToUser && userMessageText && lastMessageInFullHistory && lastMessageInFullHistory.speakerId !== 'user_player') {
        const lastAiSpeaker = activeAiSpeakers.find(s => s.id === lastMessageInFullHistory.speakerId);
        if (lastAiSpeaker && normalizedUserMessage.endsWith('?') && normalizedUserMessage.length < 35) {
            speaker = lastAiSpeaker;
            console.log(`GIL: Speaker Priority 2 - User sent a short question. Prioritizing last AI speaker: ${speaker.profileName}.`);
        }
    }
    
    // PRIORITY 3: If still no speaker, use the default round-robin logic.
    if (!speaker) {
        console.log(`GIL: Speaker Priority 3 - No specific mention or follow-up detected. Using default round-robin.`);
        const activeNonTutorAISpeakers = activeAiSpeakers.filter(s => s.id !== currentGroupTutorInternal!.id);
        const tutorIsActiveAndPresent = activeAiSpeakers.some(s => s.id === currentGroupTutorInternal!.id);

        if (!isReplyToUser) { // Proactive turn by an AI
            if (tutorIsActiveAndPresent && Math.random() < 0.4) {
                speaker = currentGroupTutorInternal;
            } else if (activeNonTutorAISpeakers.length > 0) {
                lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % activeNonTutorAISpeakers.length;
                speaker = activeNonTutorAISpeakers[lastAiSpeakerIndex];
            } else {
                speaker = currentGroupTutorInternal; // Fallback to tutor
            }
        } else { // General reply to the user
            if (activeNonTutorAISpeakers.length > 0) {
                lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % activeNonTutorAISpeakers.length;
                speaker = activeNonTutorAISpeakers[lastAiSpeakerIndex];
            } else {
                speaker = currentGroupTutorInternal; // Fallback if only tutor is left
            }
        
        }
                // --- ADD THIS LINE TO FIX THE BUG ---
           
        

                // VVVVVV ADD THIS NEW IF BLOCK VVVVVV
                if (!speaker && lastAiDirectlyEngagedByUserId && userMessageText) { 
                    // If no one explicitly named by full name, AND there was a recent direct engagement,
                    // AND user actually sent some text (not an empty proactive reply trigger)
                    const normalizedUserMsg = polyglotHelpers.normalizeText(userMessageText); // Use your helper
                    let isLikelyFollowUpQuestion = normalizedUserMsg.endsWith("?"); // Start with the most reliable check
    
                    if (!isLikelyFollowUpQuestion) { // Only check keywords if no question mark
                        const questionKeywords: string[] = [
                            // English (normalized)
                            "what", "where", "when", "who", "why", "how", "do you", "is it", "are they", "can you", "could you", "will you", "would you", "should i", "which", "tell me", "explain", "question",
                            // Spanish (normalized)
                            "que", "cual", "quien", "como", "cuando", "donde", "cuanto", "porque", "por que", "para que", "acaso", "verdad que", "dime", "explica", "pregunta",
                            // French (normalized)
                            "qu'est-ce que", "que", "quoi", "qui", "ou", // 'ou' (or) vs 'où' (where) - normalizeText should make 'où' -> 'ou'
                            "quand", "comment", "pourquoi", "combien", "est-ce que", "lequel", "laquelle", "lesquels", "lesquelles", "dis-moi", "expliquez", "question",
                            // German (normalized)
                            "was", "wo", "wann", "wer", "wem", "wen", "wessen", "warum", "wieso", "weshalb", "wie", "welche", "welcher", "welches", "kannst du mir sagen", "erklar", "frage", // erklären -> erklar
                            // Italian (normalized)
                            "che", "cosa", "chi", "come", "dove", "quando", "perche", "quanto", "quale", "quali", "spiega", "dimmi", "domanda", "cose", "cosa e", "cos'e'",
                            // Portuguese (normalized - combining Brazil & Portugal for simplicity here)
                            "o que", "que", "qual", "quem", "como", "onde", "quando", "por que", "porque", // also common for why
                            "quanto", "quanta", "diga-me", "explique", "pergunta",
                            // Indonesian (normalized)
                            "apa", "siapa", "di mana", "kapan", "mengapa", "bagaimana", "berapa", "apakah", "yang mana", "jelaskan", "beri tahu saya", "pertanyaan",
                            // Tagalog (normalized - many question words are already simple)
                            "ano", "sino", "saan", "nasaan", "kailan", "bakit", "paano", "magkano", "ilan", "gaano", "alin", "tanong", "sabihin mo", "ipaliwanag mo",
                            // Russian (Cyrillic - keep as is, assuming user input is also Cyrillic)
                            "что", "кто", "где", "когда", "как", "почему", "зачем", "сколько", "какой", "какая", "какое", "какие", "чей", "чья", "чьё", "чьи", "скажи", "объясни", "вопрос",
                            // Swedish (normalized)
                            "vad", "vem", "var", "vart", // where, whereto
                            "nar", // när
                            "hur", "varfor", "vilken", "vilket", "vilka", "fraga", // fråga
                            // Norwegian (normalized)
                            "hva", "hvem", "hvor", "nar", // når
                            "hvordan", "hvorfor", "hvilken", "hvilket", "hvilke", "sporsmal", // spørsmål
                            // Dutch (normalized)
                            "wat", "wie", "waar", "wanneer", "hoe", "waarom", "hoeveel", "welke", "vraag",
                            // Polish (normalized - ą -> a, ę -> e, ć -> c, ł -> l, ń -> n, ó -> o, ś -> s, ź -> z, ż -> z)
                            "co", "kto", "gdzie", "kiedy", "jak", "dlaczego", "czemu", "ile", "ktory", "ktora", "ktore", "pytanie",
                            // Turkish (normalized - ı -> i, ö -> o, ü -> u, ç -> c, ğ -> g, ş -> s)
                            "ne", "kim", "nereye", "nerede", "nereden", "ne zaman", "nasil", "neden", "nicin", "kac", "hangi", "soru",
                            // Japanese (Romanized - very basic, relies on 'ka' or these words at start)
                            "nani", "doko", "itsu", "dare", "naze", "do", "doushite", "ikura", "dore", "donata", "shitsumon",
                            // Korean (Romanized - very basic)
                            "mueot", "mwoga", "nugu", "eodi", "eonje", "wae", "eotteoke", "eolmana", "eotteon", "jilmun",
                            // Mandarin Chinese (Pinyin - very basic, relies on 'ma' or question words at start)
                            "shenme", "nali", "nar", "shei", "shui", "weishenme", "zenme", "duoshao", "jidian", "ma", "wenti",
                            // --- Less certain about simple startsWith for these, ? is more reliable ---
                            // Arabic (Transliterations - very basic, heavily depends on user's transliteration style)
                            "ma", "man", "ayna", "mata", "kayfa", "limadha", "kam", "ayy", "sual",
                            // Hindi (Transliterations - very basic)
                            "kya", "kaun", "kaha", "kab", "kyon", "kaise", "kitna", "kaun sa", "prashn", "sawal",
                            // Vietnamese (Tones removed by typical normalization, very basic starters)
                            "cai gi", "ai ", "dau ", "khi nao", "tai sao", "lam sao", "bao nhieu", "nao ", "cau hoi",
                            // Thai (Transliterations - very basic)
                            "arai", "khrai", "thinai", "muarai", "thammai", "yangrai", "thaorai", "khamtham"
                        ];
    
                        const simpleAffirmations: string[] = [
                            // English
                            "yes", "yeah", "yep", "yup", "sure", "okay", "ok", "alright", "right", "correct", "exactly", "precisely", "indeed", "definitely", "absolutely", "true", "i agree", "me too", "sounds good", "got it", "understood", "fine", "good", "totally", "for sure", "certainly",
                            // Spanish (normalized)
                            "si", "claro", "vale", "bueno", "dale", "de acuerdo", "exacto", "correcto", "verdad", "asi es", "entiendo", "ya veo", "perfecto", "cierto", "seguro", "ya",
                            // French (normalized)
                            "oui", "ouais", "bien sur", "d'accord", "exactement", "c'est ca", "c'est vrai", "entendu", "compris", "parfait", "absolument", "tout a fait",
                            // Indonesian (normalized)
                            "ya", "iya", "tentu", "baik", "oke", "setuju", "benar", "betul", "paham", "mengerti", "sip", "pasti", "jelas",
                            // Tagalog (normalized)
                            "oo", "opo", "sige", "tama", "syempre", "talaga", "gets ko", "naiintindihan ko", "okey", "sigurado", "tunay",
                            // Russian (Cyrillic)
                            "да", "конечно", "хорошо", "ладно", "правильно", "точно", "верно", "согласен", "согласна", "понял", "поняла", "именно", "безусловно", "разумеется",
                            // German (normalized)
                            "ja", "sicher", "klar", "okay", "ok", "in ordnung", "genau", "richtig", "stimmt", "absolut", "bestimmt", "verstanden",
                            // Italian (normalized)
                            "si", "certo", "va bene", "ok", "d'accordo", "esatto", "giusto", "vero", "capito", "perfetto", "assolutamente",
                            // Portuguese (normalized)
                            "sim", "claro", "esta bem", "ok", "de acordo", "exato", "certo", "verdade", "entendi", "perfeito", "com certeza"
                            // Add more languages from your filter list here as needed (Japanese, Korean, Mandarin, etc.)
                            // For those, you'd need common short affirmation words in their normalized/native script.
                        ];
    
                        const simpleNegations: string[] = [
                            // English
                            "no", "nope", "nah", "not really", "i disagree", "i don't think so", "never", "incorrect", "false", "not at all", "certainly not",
                            // Spanish (normalized)
                            "no", "claro que no", "para nada", "no estoy de acuerdo", "nunca", "incorrecto", "falso", "jamas", "en absoluto",
                            // French (normalized)
                            "non", "pas vraiment", "je ne suis pas d'accord", "jamais", "incorrect", "faux", "pas du tout", "absolument pas",
                            // Indonesian (normalized)
                            "tidak", "bukan", "nggak", "enggak", "tidak juga", "saya tidak setuju", "belum tentu", "salah", "tak",
                            // Tagalog (normalized)
                            "hindi", "hindi po", "ayaw ko", "ayoko", "hindi ako sang-ayon", "hindi rin", "mali", "di",
                            // Russian (Cyrillic)
                            "нет", "не совсем", "не согласен", "не согласна", "никогда", "неправильно", "неверно", "вообще нет", "ни в коем случае",
                            // German (normalized)
                            "nein", "nicht wirklich", "stimmt nicht", "falsch", "niemals", "auf keinen fall", "ich stimme nicht zu",
                            // Italian (normalized)
                            "no", "non proprio", "non sono d'accordo", "mai", "sbagliato", "falso", "per niente", "assolutamente no",
                            // Portuguese (normalized)
                            "nao", "claro que nao", "de modo algum", "discordo", "nunca", "errado", "falso", "nem pensar"
                        ];
    
                        const simpleContinuers: string[] = [
                            // English
                            "uh-huh", "mm-hmm", "mhm", "go on", "i see", "really", "oh", "interesting", "and", "so", "then", "well", "aha",
                            // Spanish (normalized)
                            "aja", "hmm", "sigue", "continua", "ya veo", "ah si", "de verdad", "interesante", "y ", "entonces", "luego", "pues", "vaya",
                            // French (normalized)
                            "euh-hein", "hmm", "continue", "vas-y", "je vois", "ah bon", "vraiment", "interessant", "et ", "donc", "alors", "puis", "ben",
                            // Indonesian (normalized)
                            "hm-hm", "oh gitu", "lanjut", "terus", "oh ya", "menarik", "dan ", "jadi", "lalu", "nah", "wah",
                            // Tagalog (normalized)
                            "oho", "ganun ba", "tuloy mo lang", "talaga", "interesante", "tapos", "at ", "so", "e", "ayun",
                            // Russian (Cyrillic) - Many are particles or interjections.
                            "ага", "угу", "продолжай", "понятно", "да ", "правда ", "интересно", "и ", "так ", "ну ", "вот", "так вот",
                            // German (normalized)
                            "aha", "hm", "mhm", "weiter", "ich verstehe", "ach so", "wirklich", "interessant", "und", "also", "dann", "nun", "tja",
                            // Italian (normalized)
                            "aha", "mmh", "continua", "capisco", "davvero", "ah si", "interessante", "e ", "allora", "quindi", "beh", "mah",
                            // Portuguese (normalized)
                            "aham", "uhum", "continue", "entendo", "vejo", "serio", "pois e", "interessante", "e ", "entao", "logo", "bem"
                        ];
                        const subtleContinuersAndInterestPhrases: string[] = [
                            // English (normalized - these often START or ARE a user's phrase)
                            "really", "oh really", "is that so", "seriously", "for real", "no way", "wow", "huh", "hmm", "interesting", "tell me more", "go on", "and then", "so then", "aha", "i see", "gotcha", "ok and", "right and", "true and", "what else", "anything else", "and so", "like what", "such as", "for instance", "for example", "true that", "you don't say", "get out",
    
                            // Spanish (normalized)
                            "de verdad", "en serio?", "en serio", "asi pues", "ah si", "vaya", "anda", "cuentame mas", "y luego que", "entonces que", "interesante", "ya veo", "que mas", "algo mas", "como que", "por ejemplo", "no me digas",
    
                            // French (normalized)
                            "vraiment", "ah bon", "serieux", "sans blague", "c'est vrai ca", "dis-moi plus", "et alors", "ah d'accord", "interessant", "je vois", "quoi d'autre", "autre chose", "comme quoi", "par exemple", "c'est pas vrai",
    
                            // Indonesian (normalized)
                            "oh ya", "benarkah", "serius", "masa sih", "wah menarik", "terus gimana", "lanjutkan", "apalagi", "ada lagi", "contohnya", "seperti apa", "oh begitu",
    
                            // Tagalog (normalized)
                            "talaga", "ganun ba", "seryoso", "nga naman", "kwento mo pa", "tapos ano", "ano pa", "tulad ng ano", "halimbawa", "ay sus", "weh",
    
                            // Russian (Cyrillic)
                            "правда", "серьёзно", "да ну", "вот как", "ого", "ух ты", "хм интересно", "расскажи подробнее", "продолжай", "и что потом", "ага", "понятно", "что еще", "что-нибудь еще", "например", "да что ты", "не может быть",
    
                            // German (normalized)
                            "wirklich", "echt", "im ernst", "ach so", "ist das so", "erzahl mehr", "und dann", "interessant", "ich verstehe", "was noch", "zum beispiel", "nein sowas", "tatsachlich",
    
                            // Italian (normalized)
                            "davvero", "sul serio", "ma dai", "ah si", "caspita", "interessante", "racconta di piu", "e poi", "allora", "capisco", "cos'altro", "ad esempio", "ma va",
    
                            // Portuguese (normalized)
                            "a serio", "verdade", "e mesmo", "interessante", "conte-me mais", "e depois", "entao", "entendo", "o que mais", "por exemplo", "nao me diga"
                        ];
                        for (const qWord of questionKeywords) {
                            // For phrases or very short words, require a space after to avoid partial matches inside other words
                            if (qWord.includes(" ") || qWord.includes("'") || qWord.length <= 3) {
                                if (normalizedUserMsg.startsWith(qWord + " ")) { // Must be followed by a space
                                    isLikelyFollowUpQuestion = true;
                                    break;
                                }
                            } else { // For most single keywords
                                 if (normalizedUserMsg.startsWith(qWord + " ") || normalizedUserMsg === qWord) { // Starts with + space OR is exact word
                                    isLikelyFollowUpQuestion = true;
                                    break;
                                }
                                if (!isLikelyFollowUpQuestion) {
                                    const allSimpleShortResponses = [
                                        ...simpleAffirmations, // Use the new, broader list name
                                        ...simpleNegations,   // Use the new, broader list name
                                        ...simpleContinuers   // Use the new, broader list name
                                    ];
                                    // For these very short responses, we want an EXACT match of the normalizedUserMsg
                                    if (allSimpleShortResponses.includes(normalizedUserMsg)) {
                                        isLikelyFollowUpQuestion = true; // Treat this as a reason to give turn back
                                        console.log(`GIL: User message ("${normalizedUserMsg}") is a short affirmative/negative/continuer (EN). Treating as follow-up.`);
                                    }
                                    else { // If not an exact simple short response, check for subtle continuers
                                        for (const phrase of subtleContinuersAndInterestPhrases) {
                                            if (normalizedUserMsg.startsWith(phrase)) {
                                                isLikelyFollowUpQuestion = true;
                                                console.log(`GIL: User message ("${normalizedUserMsg}") starts with a subtle continuer/interest phrase ("${phrase}"). Treating as follow-up.`);
                                                break; // Found a match
                                            }
                                        }
                                    }
                                }
                                
                            }
                        }
                    }
    
                    if (isLikelyFollowUpQuestion) {
                        const lastEngagedAI = activeAiSpeakers.find(s => s.id === lastAiDirectlyEngagedByUserId);
                        if (lastEngagedAI) {
                            speaker = lastEngagedAI;
                            console.log(`GIL: Prioritizing ${speaker.profileName} (ID: ${speaker.id}) for follow-up as user's message suggests a continuation with AI (${lastAiDirectlyEngagedByUserId}).`);
                        } else {
                            console.log(`GIL: User's message suggests continuation, but last engaged AI (${lastAiDirectlyEngagedByUserId}) not active/found. Resetting.`);
                            lastAiDirectlyEngagedByUserId = null; 
                        }
                    } else {
                        console.log(`GIL: User message ("${normalizedUserMsg.substring(0,20)}") doesn't strongly suggest a direct continuation with last engaged AI (${lastAiDirectlyEngagedByUserId}). Resetting.`);
                        lastAiDirectlyEngagedByUserId = null;
                    }
                }
                // ^^^^^^ END OF REVISED isFollowUpQuestion LOGIC BLOCK ^^^^^^
            // ^^^^^^ END OF ADDED IF BLOCK ^^^^^^


            }

            if (!speaker && isReplyToUser && userMessageText && lastMessageInFullHistory && lastMessageInFullHistory.speakerId !== 'user_player') {
                const lastAiSpeaker = activeAiSpeakers.find(s => s.id === lastMessageInFullHistory.speakerId);
    
                // A simple heuristic: is the user's message a short question?
                // A short message ending in '?' is very likely a direct follow-up.
                if (lastAiSpeaker && normalizedUserMessage.endsWith('?') && normalizedUserMessage.length < 30) {
                    speaker = lastAiSpeaker;
                    console.log(`GIL: User sent a short question. Prioritizing last AI speaker: ${speaker.profileName}.`);
                }
            }


           if (!speaker) { 
                const activeNonTutorAISpeakers = activeAiSpeakers.filter(s => s.id !== currentGroupTutorInternal!.id);
                const tutorIsActiveAndPresent = activeAiSpeakers.some(s => s.id === currentGroupTutorInternal!.id); 

                if (isReplyToUser) { // isReplyToUser is a parameter, correctly scoped
                    if (activeNonTutorAISpeakers.length > 0) {
                        lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % activeNonTutorAISpeakers.length;
                        speaker = activeNonTutorAISpeakers[lastAiSpeakerIndex];
                        console.log(`GIL: Replying to user (no mention) with non-tutor: ${speaker?.profileName}`);
                    } else if (tutorIsActiveAndPresent) {
                        speaker = currentGroupTutorInternal;
                        console.log(`GIL: Replying to user (no mention) with tutor (only active AI): ${speaker?.profileName}`);
                    } else {
                        console.warn("GIL: Reply to user, but no suitable active AI speaker found.");
                        aiResponding = false; return;
                    }
                } else { // Proactive turn
                    if (tutorIsActiveAndPresent && Math.random() < 0.4) { 
                        speaker = currentGroupTutorInternal;
                        console.log(`GIL: Tutor (${speaker?.profileName}) taking a proactive turn (by chance).`);
                    } else if (activeNonTutorAISpeakers.length > 0) {
                        lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % activeNonTutorAISpeakers.length;
                        speaker = activeNonTutorAISpeakers[lastAiSpeakerIndex];
                        console.log(`GIL: Non-tutor AI (${speaker?.profileName}) taking a proactive turn.`);
                    } else if (tutorIsActiveAndPresent) {
                        speaker = currentGroupTutorInternal;
                        console.log(`GIL: Tutor (${speaker?.profileName}) taking a proactive turn (only active AI).`);
                    } else {
                        console.warn("GIL: Proactive turn, but no suitable active AI speaker found.");
                        aiResponding = false; return;
                    }
                }
            }

            if (!speaker || !speaker.profileName) {
                console.error("GIL: Could not select a valid AI speaker from active members.", speaker);
                aiResponding = false;
                return;
            }
          
            // This is a simplified selection. You can re-insert your more complex
            // logic for picking a speaker based on mentions or turns.
            lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % activeAiSpeakers.length;
            speaker = activeAiSpeakers[lastAiSpeakerIndex];
        
            if (!speaker || !speaker.profileName) {
                console.error("GIL: Could not select a valid AI speaker.");
                aiResponding = false;
                return;
            }


            



            console.log(`GIL.simulateAiMessageInGroup: AI ${speaker.profileName} to speak. IsReplyToUser: ${isReplyToUser}`);

            if (thinkingBubbleElement) thinkingBubbleElement.remove();
            const typingText = `${speaker.profileName.split(' ')[0]} is typing...`;
            thinkingBubbleElement = uiUpdater.appendToGroupChatLog(
                typingText,
                speaker.profileName!,
                false,
                speaker.id,
                {
                    isThinking: true,
                    avatarUrl: speaker.avatarModern,
                    timestamp: Date.now()
                }
            );


            const localIsRespondingToImage = isReplyToUser && !!imageContextForReply?.base64Data;
            let localImageToProcess: { base64Data: string; mimeType: string; } | null = null;
            
            if (localIsRespondingToImage && imageContextForReply?.base64Data) {
                localImageToProcess = {
                    base64Data: imageContextForReply.base64Data,
                    mimeType: imageContextForReply.mimeType || 'image/jpeg', // Provide a fallback MIME type
                };
                console.log(`GIL: AI ${speaker.profileName} is responding to an image just posted by the user.`);
            }
            
            // --- START: PROMPT CONSTRUCTION LOGIC ---
            const groupLanguage = currentGroupDef.language || "English";
            const userDisplayNameInHistory = getUserReferenceName(groupLanguage, false); 
            const userInstructionHowAIShouldReferToUser = getUserReferenceName(groupLanguage, true);

           // --- Building the Persona Description for the CURRENT AI SPEAKER ---
        let personaDesc = `CRITICAL: For THIS TURN, you are EMBODYING the persona of ${speaker.profileName}. You are this specific human.`;

        if (speaker.city && speaker.country) {
            personaDesc += ` YOU ARE FROM ${speaker.city.toUpperCase()}, ${speaker.country.toUpperCase()}. This is a non-negotiable fact about ${speaker.profileName}. If asked where *you* (${speaker.profileName}) are from, you MUST state you are from ${speaker.city}, ${speaker.country}. Do not confuse this with other participants' origins.`;
        } else if (speaker.city) {
            personaDesc += ` YOU ARE FROM ${speaker.city.toUpperCase()}. If asked where *you* (${speaker.profileName}) are from, state this.`;
        } else if (speaker.country) {
            personaDesc += ` YOU ARE FROM ${speaker.country.toUpperCase()}. If asked where *you* (${speaker.profileName}) are from, state this.`;
        }

        if (speaker.age && speaker.age !== "N/A") personaDesc += ` You (${speaker.profileName}) are ${speaker.age} years old.`;
        if (speaker.profession) personaDesc += ` Your (${speaker.profileName}) profession is ${speaker.profession}.`;
        if (speaker.bioModern) personaDesc += ` Key details about you (${speaker.profileName}): "${speaker.bioModern.substring(0, 150)}..."`; // Include a snippet of bio
        if (speaker.interests?.length) personaDesc += ` Your (${speaker.profileName}) interests include: ${speaker.interests.slice(0, 3).join(', ')}.`;
        
        const speakerRolesInGroupLang = speaker.languageRoles?.[groupLanguage]; // groupLanguage defined earlier
        if (speakerRolesInGroupLang?.includes('learner')) {
            personaDesc += ` As ${speaker.profileName}, you are learning ${groupLanguage} and may make occasional small mistakes.`;
        } else if (currentGroupTutorInternal && speaker.id === currentGroupTutorInternal.id) {
            personaDesc += ` As ${speaker.profileName}, you are the TUTOR for this ${groupLanguage} group. Your main goal is to facilitate conversation, encourage the user (who you'll address as "${userInstructionHowAIShouldReferToUser}") to practice, and help other AI learners.`;
        } else { 
            personaDesc += ` As ${speaker.profileName}, you are proficient in ${groupLanguage}.`;
        }


  personaDesc += `\n**IMPORTANT:** The biographical details listed above (your name, origin, profession, interests) are your established identity. You MUST adhere to these facts. Do not claim to be from a different place or have different interests than what is specified for you, ${speaker.profileName}.`

        personaDesc += ` All these details are about YOU, ${speaker.profileName}, for this specific turn.`;
       
        let communicationGoal = "";
        // 'isReplyToUser' is a parameter of simulateAiMessageInGroup and is in scope.
        // 'lastMessageInHistory' was defined much earlier in simulateAiMessageInGroup and is in scope.
        // 'speaker' is now definitively set.
        const lastSpeakerWasThisAI = lastMessageInFullHistory && lastMessageInFullHistory.speakerId === speaker.id;
        // <<< END OF REPLACEMENT 2.1 >>>
        const groupLanguageForUserRef = currentGroupDef.language || "English";
        const localUserInstructionHowAIShouldReferToUser = getUserReferenceName(groupLanguageForUserRef, true);


        if (isReplyToUser) {
            communicationGoal = `Your primary goal for THIS turn is to respond directly and relevantly to what the user (${localUserInstructionHowAIShouldReferToUser}) just said, adding your unique perspective based on your persona.`;
        } else if (lastSpeakerWasThisAI) {
            communicationGoal = `You (${speaker.profileName}) were the last one to speak. Your goal now is to encourage others to participate. Perhaps ask a broad follow-up question to the group or invite a quieter member (or the user) to share their thoughts. Avoid dominating the conversation.`;
        } else {
            communicationGoal = `This is a proactive turn for you (${speaker.profileName}). Your goal is to make an interesting and NEW contribution that builds naturally on the existing conversation flow, or to gently steer it if you are the tutor and it seems to be stalling. Avoid simply repeating what others have recently said.`;
        }
        personaDesc += ` Your immediate communication goal for THIS SPECIFIC TURN: ${communicationGoal}`;
       
       
       
       
       
       
       
       
       
        // --- End of Persona Description modifications ---







            const otherAiNames = currentGroupMembersInternal
                .filter(m => m.id !== speaker.id && m.id !== USER_ID_PLACEHOLDER)
                .map(m => m.profileName || 'Another Participant')
                .join(', ') || 'none';

                let constructedPrompt = `SYSTEM INSTRUCTION:\n`;
                constructedPrompt += `You are in a vibrant group chat simulation. Group Name: "${currentGroupDef.name}".\n`;
                constructedPrompt += `The primary language for ALL participants in this group chat is ${groupLanguage}.\n`;
                constructedPrompt += `The general discussion theme is: "${currentGroupDef.tags.join(', ')}".\n\n`;
    
                // 1. YOUR ASSIGNED PERSONA (from 1v1 prompt - already good in your GIL)
                constructedPrompt += `CRITICAL: FOR THIS TURN, YOU ARE ${speaker.profileName}. Embody this human persona fully. Your background, location, interests, and bio snippets are non-negotiable facts about YOU.\n`;
                constructedPrompt += `${personaDesc}\n\n`; // personaDesc already includes location, profession, age, bio snippet, interests, language role (tutor/learner)
    
                constructedPrompt += `CHAT PARTICIPANTS:
                - The Human User: (Referred to as "${userDisplayNameInHistory}" in history analysis, address directly as "${userInstructionHowAIShouldReferToUser}"). Your main goal (especially if you are the tutor) is to help them practice ${groupLanguage}.
                - The Tutor: ${currentGroupTutorInternal!.profileName || 'The Tutor'} (This might be you, ${speaker.profileName}, if you are the designated tutor).
                - Other AI Learners/Partners in this group: ${otherAiNames}. You can interact with them too.\n\n`;
    
               
                const historyForThisPrompt = groupChatHistory.slice(-MAX_HISTORY_FOR_AI_CONTEXT);


                constructedPrompt += `RECENT CONVERSATION HISTORY (most recent is last, pay close attention to this flow):\n`;

                if (historyForThisPrompt.length === 0) {
                    constructedPrompt += "(The chat is new or history is short.)\n";
                } else {
                    historyForThisPrompt.forEach((msg: GroupChatHistoryItem) => {
                        // Determine the speaker's display name for the history.
                        // 'userDisplayNameInHistory' should be defined earlier in the 'simulateAiMessageInGroup' function.
                        const speakerNameForHistory = (msg.speakerId === "user_player" || msg.speakerId === "user_self_001")
                            ? userDisplayNameInHistory
                            : (msg.speakerName || "A participant");

                        // Format the message text, handling images and voice memos.
                        let messageTextForHistory = msg.text || "";
                        if (msg.isImageMessage && msg.imageUrl) {
                            // If there's user text associated with the image, use it.
                            // Otherwise, use a very minimal placeholder.
                            if (msg.text && msg.text.trim() !== "" && msg.text !== msg.imageUrl && !msg.text.startsWith("[")) { // Avoid using a previous placeholder as text
                                messageTextForHistory = `(Image shared by ${speakerNameForHistory} with caption: "${msg.text}")`;
                            } else {
                                messageTextForHistory = `(${speakerNameForHistory} shared an image.)`; // Minimal placeholder
                            }
                            // Optionally, still include the AI's semantic description of that *past* image
                            if (msg.imageSemanticDescription) {
                                messageTextForHistory += ` -- Past AI DESC: ${msg.imageSemanticDescription}`;
                            }
                        } else if (msg.isVoiceMemo) {
                            messageTextForHistory = `(Voice Memo from ${speakerNameForHistory}, Transcript: "${msg.text || "audio content"}")`;
                        }

                        // Add the formatted line to the prompt.
                        constructedPrompt += `${polyglotHelpers.sanitizeTextForDisplay(speakerNameForHistory)}: ${polyglotHelpers.sanitizeTextForDisplay(messageTextForHistory)}\n`;
                    });
                }
                constructedPrompt += "\n"; // Add a newline after the entire history block.
                // 2. YOUR TASK FOR THIS TURN (incorporating 1v1 prompt's advanced logic)
                constructedPrompt += `YOUR TASK FOR THIS TURN (as ${speaker.profileName}, speaking in ${groupLanguage}):\n`;
                let taskSpecifics = "";
             
                const lastSpeakerIsUser = lastMessageInFullHistory && (lastMessageInFullHistory.speakerId === "user_player" || lastMessageInFullHistory.speakerId === "user_self_001");
                const lastSpeakerIsYou = lastMessageInFullHistory && lastMessageInFullHistory.speakerId === speaker.id;
    
                if (localIsRespondingToImage) {
                    taskSpecifics = `- The user (${userDisplayNameInHistory}) just shared an image. Your response MUST have two distinct parts.
    
                    ---
    
                    **Part 1: Your Conversational Comment (This part is VISIBLE to the user)**
                - As ${speaker.profileName}, your goal is to start a real conversation about the image, not just describe it. Choose ONE of the following conversational approaches:
                    - **Be Opinionated:** Share a brief, personal opinion about the subject. (e.g., "Ah, Mbappé! He's an incredible player, one of the best in the world right now.")
                    - **Be Curious:** Ask a specific, open-ended question that goes beyond simple identification. (e.g., "Great photo of Mbappé! Are you a big Paris Saint-Germain fan, or do you just admire him as a player?")
                    - **Share a Connection:** Relate the image to your own persona's interests or background (even loosely). (e.g., "I'm not a huge football fan myself, but I know Mbappé is a superstar. It's amazing how sports can unite people.")
                - Your comment MUST be in ${groupLanguage}.
                - **This is the ONLY part the human user will see.** Do NOT repeat the factual description from Part 2 here.
                    ---
    
                    **Part 2: The Factual Description Block (This is a HIDDEN note for other AIs)**
                    - After your conversational comment, you MUST include a special "memory" block for your AI teammates.
                    - This block allows other AIs to understand the image content in future turns.
                    - **BE VERY DETAILED AND OBJECTIVE in this block.**
                    - It MUST be formatted exactly like this:
                         [IMAGE_DESCRIPTION_START]
                    A comprehensive, factual analysis of the image.
                    - **Overall Scene:** Describe the setting (e.g., outdoor stadium, kitchen, city street) and style (e.g., color photograph, animated character, movie poster, black and white).
                    - **Primary Subject:** Identify the main focus. If it's a person, describe them in detail.
                    - **For People/Celebrities/Athletes:**
                        - **Attempt Identification:** If you recognize the person, state their name (e.g., "The person appears to be actor Tom Hanks," or "This is basketball player LeBron James.").
                        - **If Unsure, Use Context Clues:** If you cannot identify the person, describe them by their role and uniform/attire. Transcribe ALL text on clothing. Example: "A male basketball player wearing a white jersey with the word 'LAKERS' and the number '23' in purple and gold text." or "A female musician holding a guitar on a stage."
                        - **Details:** Describe their action (e.g., "shooting a basketball," "smiling at the camera"), expression, hair color, and any notable features.
                    - **For Objects:** Identify all key objects with descriptive adjectives (e.g., "a steaming cup of black coffee," "a vintage red sports car," "a rustic wooden table").
                    - **Transcribe ALL Text:** Accurately transcribe every single word or number visible in the image, including signs, logos, clothing, and posters.
                    - **Composition:** Briefly note the composition if relevant (e.g., "close-up shot," "wide-angle landscape view").
                    [IMAGE_DESCRIPTION_END]
    
                    ---
                    
                    **Example of a complete response you should generate:**
                    "Wow, that looks delicious! Where did you find that? [IMAGE_DESCRIPTION_START]A high-resolution color photograph of two crusty French baguettes on a dark, slate-like surface. One baguette is whole, the other is partially sliced. Some flour is dusted on the surface.[IMAGE_DESCRIPTION_END]"`;
                
          } else if (isReplyToUser && userMessageText) {
                    // AI is directly replying to the user's most recent text/VM transcript
                    if (localMentionedPersonaName && localMentionedPersonaName === speaker.profileName) {
                        taskSpecifics = `- The user (${userInstructionHowAIShouldReferToUser}) SPECIFICALLY MENTIONED YOU (${speaker.profileName}) saying: "${polyglotHelpers.sanitizeTextForDisplay(userMessageText)}". Respond directly and thoughtfully. Add your perspective before (optionally) asking a follow-up.`;
                    } else {
                        taskSpecifics = `- You are directly replying to the user (${userInstructionHowAIShouldReferToUser}) who just said: "${polyglotHelpers.sanitizeTextForDisplay(userMessageText)}".
                            1. Acknowledge their point clearly.
                            2. Add YOUR persona's perspective, a brief related thought, or a short consistent anecdote.
                            3. THEN, if natural, you might ask an open-ended follow-up question. Avoid just asking "What about you?".`;
                    };
                    if (speaker.id === currentGroupTutorInternal!.id) { // If the current speaker IS the Tutor
                        taskSpecifics = `- You are the TUTOR, ${speaker.profileName}. Your primary role is to facilitate a natural and engaging ${groupLanguage} conversation for the user (${userInstructionHowAIShouldReferToUser}) and the AI learners.
                            **Current Goal: Facilitate effectively. Avoid dominating.**
                            Consider the RECENT CONVERSATION HISTORY.
            
                            1.  **IF THE USER HASN'T SPOKEN RECENTLY OR SEEMS QUIET:**
                                *   Gently prompt the user with an open-ended question related to the current discussion. Make it easy for them to respond. Example: "${userInstructionHowAIShouldReferToUser}, I'd be interested to hear your thoughts on [specific point just made by an AI]?" or "What does this remind you of, ${userInstructionHowAIShouldReferToUser}?"
                                *   AVOID just asking "What do you think?" to the whole group repeatedly. Target the user or a quiet learner.
            
                            2.  **IF AI LEARNERS ARE DOMINATING OR REPEATING:**
                                *   Subtly redirect. Example: "That's a great point, Kenji. Manon, does that connect with your experiences in Provence at all?"
                                *   Summarize a few points and then pose a new, slightly different angle to the USER or a specific learner. Example: "So we've heard about [X] and [Y]. ${userInstructionHowAIShouldReferToUser}, how do you see [new aspect Z] fitting into this?"
            
                            3.  **IF THE CONVERSATION IS FLOWING WELL BETWEEN LEARNERS/USER:**
                                *   Observe for a turn or two. You don't always need to speak.
                                *   If you do speak, offer a brief, insightful comment, a piece of cultural information related to ${groupLanguage} or the topic, or a very gentle correction if a learner makes a significant error *that hinders understanding*.
                                *   Example of gentle correction: "That's a good effort, Priya! Just a small tip for next time, in French we'd more commonly say '[correct phrase]' in that situation. But your meaning was clear!" (Only do this sparingly).
            
                            4.  **IF INTRODUCING A NEW TOPIC (if current one is exhausted):**
                                *   Make it a natural transition. Example: "Speaking of [current topic], it makes me think about [new related topic]. What are some initial thoughts on that, perhaps starting with you, ${userInstructionHowAIShouldReferToUser}?"
                                *   You can also share a very brief personal (persona-based) anecdote or opinion to kickstart a new direction. Example: "That was a lively discussion! On a slightly different note, as someone from ${speaker.city || 'my city'}, I've always found [related topic/interest from your persona] fascinating. What are your experiences with that?"
            
                            5.  **WHAT TO AVOID AS TUTOR:**
                                *   Speaking multiple times in a row unless actively managing a complex interaction or providing a necessary explanation.
                                *   Asking the same generic question repeatedly to the group.
                                *   Dominating the conversation with your own long opinions (unless you're explicitly sharing a detailed cultural point relevant to teaching).
                                *   Sounding like an interrogator. Aim for a friendly, guiding presence.`;
                    }
                    
               
               
               
               
                } else { // Proactive turn, or a turn not *immediately* after the user just spoke.
                    taskSpecifics = `- This is a PROACTIVE turn for you, ${speaker.profileName}. The conversation is flowing. Your goal is to add something NEW and VALUABLE.

                    **CRITICAL: WHAT TO AVOID IN THIS TURN:**
                    -   **DO NOT** start with generic agreement like "That's interesting," "That's a fascinating point," "I'm glad you mentioned that," "I agree," or similar phrases. The goal is to avoid being a conversational echo.
                    -   **DO NOT** simply restate what the last person said.
                    -   **DO NOT** end your turn with a generic question like "What do you all think?" or "Has anyone else experienced this?" unless you have first provided a substantial, new point of your own. Prioritize making statements, not questions.
                    -   **DO NOT** repeat a sentence that someone already used recently as a it causes an Echo chamber! the first sentence of your reply should be entirely new! 
                    -   **DO NOT** start with “Me parece...” — everyone’s already using it! Instead, express your opinion or reaction with more variety. You can say: “En mi opinión…” “Desde mi punto de vista...” “Creo que...” “A mí siempre me ha llamado la atención...”Or skip the opinion phrase entirely and just jump into a story, fact, or observation that reflects your unique voice.
                    -   **DO NOT** mention your profession since you already introduced yourself. Everyone already knows!
                    **INSTEAD, CHOOSE ONE OF THESE ACTIONS:**
                    1.  **OFFER A DIFFERENT PERSPECTIVE:** Look at the last comment and offer a contrasting or alternative viewpoint based on your persona. Start with something like "That's one way to see it, but from my experience..." or "An alternative perspective is..." 
                    2.  **SHARE A RELEVANT ANECDOTE:** Share a brief, personal story (1-2 sentences) that relates to the topic and is consistent with your persona. Example: "That reminds me of a time in ${speaker.city || 'my city'} when..."
                    3.  **CONNECT TWO IDEAS:** Mention a point someone made earlier in the conversation and connect it to the most recent comment. Example: "What Matu said about music actually connects to Rafa's point about food because..."
                    4.  **DEEPEN THE TOPIC:** Add a layer of complexity or a new detail. Example: "Yes, and a key part of that is also [introduce a new, specific element related to the topic]."
                    5.  **SHARE A REAL-WORLD FACT:** Provide a verifiable fact related to your persona's background, city, or interests. Example: "Speaking of which, a fun fact about ${speaker.city || 'my home'} is..."
                    Your contribution must be concise (1-2 sentences) and reflect YOUR unique persona (${personaDesc}).`
                    
                    // Logic for when you were the last speaker remains the same.
                    if (lastMessageInFullHistory && lastMessageInFullHistory.speakerId === speaker.id) {
                         taskSpecifics += `\n You (${speaker.profileName}) were the last one to speak. Encourage someone else to participate directly. Ask a targeted question to the user or another quiet participant.`;
                    }
                }
                constructedPrompt += taskSpecifics;
    
                // 3. GENERAL CONVERSATIONAL STYLE & GROUP DYNAMICS (from 1v1, adapted)
              
                constructedPrompt += `
                - GREETINGS & ACKNOWLEDGEMENTS:
                    - If you are speaking for the first time AFTER the user or tutor has initiated the conversation (e.g., during introductions), offer a BRIEF and UNIQUE greeting. Avoid generic "Bonjour, je suis ravi..." if others just said it. Try something unique or directly comment on what the user/tutor said to kick things off.
                    - If acknowledging another AI who just introduced themselves or spoke, make it natural. Instead of "Bonjour [Name], je suis ravi...", try "Bienvenue, [Name] !" or "Intéressant, [Name]..." or directly engage with their point.
                    - DO NOT re-introduce yourself (stating your name) if you have already spoken or if the context implies everyone knows who is who (like after initial round of intros). The UI already shows your name.
                `;
              
              
              
                constructedPrompt += `\n\nGENERAL CONVERSATIONAL STYLE for ${speaker.profileName} in this Group Chat:
                - VARY YOUR RESPONSES: Don't always end your turn with a question. Mix in statements, opinions, and brief (persona-consistent) anecdotes.
                - RECIPROCATE, THEN EXPAND: If someone (user or AI) says something, acknowledge their point, then add YOUR perspective or a related thought *before* (optionally) asking a follow-up.
                - AVOID ECHOING/PARROTING: Do not just repeat or rephrase what someone else just said. Add new value.
                - BE AN ACTIVE, NATURAL PARTICIPANT: Contribute your thoughts when it feels appropriate.
                - PLAUSIBLE ELABORATION (Storytelling): If sharing an experience, make it brief and consistent with YOUR persona (${personaDesc}). You can invent minor plausible details.
                - TOPIC COHERENCE & MEMORY (Short-term): Pay attention to the RECENT HISTORY. Build upon what was just said. Refer to earlier points *in this session* if relevant.
                - If you are the TUTOR: Facilitate, encourage the user, involve other AI learners, gently guide if needed.
                - If you are a LEARNER of ${groupLanguage}: It's okay to make occasional, minor, natural-sounding mistakes. Don't overdo it. Ask for clarification if something is truly confusing for a learner.
                - INTERACT WITH OTHER AIs: You can agree/disagree with, or ask questions to, other AI participants too, not just the user. Make it a group discussion.Refer to them by name if natural (e.g., 'That's an interesting point, Kenji...').`; // Existing line
                
                constructedPrompt += `
            - SHOW CURIOSITY ABOUT OTHERS: Actively try to learn more about the other participants (both the user, ${userInstructionHowAIShouldReferToUser}, and other AIs like ${otherAiNames}). If someone mentions an interest, profession, or experience, show natural curiosity by asking a relevant, open-ended follow-up question. Examples: "That sounds fascinating, [Name], could you tell us more about [their specific point]?" or "[Name], you mentioned you're a [profession/from X place]. What's that like in relation to our current topic?" This helps create a more engaging and balanced group dynamic.`;

                constructedPrompt += `
                - SUBTLY WEAVING IN YOUR PERSONA (${speaker.profileName}'s traits like profession: ${speaker.profession || 'your field'}, main interests: ${(speaker.interests && speaker.interests.length > 0) ? speaker.interests.slice(0,2).join(', ') + ' etc.' : 'your hobbies'}, origin: ${speaker.city || speaker.country || 'your background'}):
                    *   **SHOW, DON'T ALWAYS TELL:** Instead of frequently starting with "As a ${speaker.profession || 'person with my background'}, I think...", try to let your unique observations, the examples you use, or the way you frame your points *imply* your background. For example, if your persona is an architect discussing city design, you might naturally talk about building materials or public spaces without needing to preface it with "As an architect...".
                    *   **RELEVANCE IS KEY:** Only bring up your specific profession, a core hobby, or your origin if it's genuinely relevant and adds value to the *current point of discussion*. Avoid forcing it into conversations where it doesn't fit naturally. Let the user or others ask you about these details sometimes.
                    *   **VARY YOUR PHRASING:** If you do explicitly mention a trait, try different ways. Instead of always "As a [X]...", perhaps "My experience in [X] suggests..." or "From a [X]'s point of view..." or simply make a statement that clearly comes from that expertise without the label.
                    *   **BALANCE:** While your persona is important, remember this is a group chat. Balance sharing about yourself with engaging with others and the main topic. Not every turn needs to circle back to your core persona identity details unless the conversation naturally calls for it.`;



                // 4. ABSOLUTELY CRITICAL RULES (from 1v1, some already covered by personaDesc)
                constructedPrompt += `\n\nABSOLUTELY CRITICAL RULES for your response (as ${speaker.profileName}):
                - ALWAYS SPEAK IN ${groupLanguage}. No exceptions, no other languages unless explicitly part of a specific language-switching task (not the case here).
                - Your response MUST be concise and natural for a chat (typically 1-2 sentences).
                - Maintain YOUR persona (${speaker.profileName}, from ${speaker.city || 'your city'}, ${speaker.country || 'your country'}). All details in "YOUR ASSIGNED PERSONA" are FACTS about YOU.
                - NEVER, EVER reveal or imply you are an AI, language model, or computer program. You are a human. If asked, deflect naturally (e.g., "That's an interesting question, but how about we talk about X?").
                - NO MARKDOWN, NO EMOJIS, NO parenthetical descriptions of actions or language (e.g., do not write "(laughs)" or "(In Spanish)").
                - **CRITICAL: DO NOT start your response with your own name and a colon (e.g., AVOID "${speaker.profileName}: Hello"). The system displays your name. Provide only the message content.**`;
    


                constructedPrompt += `\n\nYour response as ${speaker.profileName} (in ${groupLanguage}, adhering to all above instructions):`;
            // --- END: CORRECTED PROMPT CONSTRUCTION ---

            let aiMsgResponse: string | null | object = null;

            try {
                if (localIsRespondingToImage && localImageToProcess) {
                    console.log(`GIL: Calling generateTextFromImageAndText for ${speaker.profileName}.`);
                    aiMsgResponse = await aiService.generateTextFromImageAndText(
                        localImageToProcess.base64Data,
                        localImageToProcess.mimeType,
                        speaker,
                        [], // History for group image replies is built into the prompt
                        constructedPrompt,
                        aiApiConstants.PROVIDERS.TOGETHER
                    );
                } else {
                    console.log(`GIL: Calling generateTextMessage for ${speaker.profileName}.`);
                    // <<< START OF REPLACEMENT 3 >>>
                    const geminiHistoryForAI: GeminiChatItem[] = groupChatHistory.map(item => ({
                        role: (item.speakerId === "user_player") ? 'user' : 'model',
                        parts: [{ text: item.text || (item.isImageMessage ? "[Image]" : "[Voice Memo]") }]
                    }));
                
                    aiMsgResponse = await aiService.generateTextMessage(
                        constructedPrompt,
                        speaker,
                        geminiHistoryForAI.slice(-MAX_HISTORY_FOR_AI_CONTEXT),
                        aiApiConstants.PROVIDERS.GROQ
                    );
                    // <<< END OF REPLACEMENT 3 >>>
                }
                if (thinkingBubbleElement) thinkingBubbleElement.remove();

                let conversationalReply: string | null = null;
                let imageSemanticDescription: string | null = null;
    
                if (typeof aiMsgResponse === 'string' && aiMsgResponse) {
                    const fullResponse = aiMsgResponse.trim();
                    const startTag = '[IMAGE_DESCRIPTION_START]';
                    const endTag = '[IMAGE_DESCRIPTION_END]';
                    const startIndex = fullResponse.indexOf(startTag);
                    const endIndex = fullResponse.indexOf(endTag);
    
                    if (startIndex !== -1 && endIndex > startIndex) {
                        // Extract the description from between the tags
                        imageSemanticDescription = fullResponse.substring(startIndex + startTag.length, endIndex).trim();
                        // Get the conversational text by removing the description block
                        const textBefore = fullResponse.substring(0, startIndex).trim();
                        const textAfter = fullResponse.substring(endIndex + endTag.length).trim();
                        conversationalReply = (textBefore + " " + textAfter).trim();
                        console.log(`GIL: Parsed image description. Conversational part: "${conversationalReply.substring(0,30)}..."`);
                    } else {
                        // No tags found, the whole response is the reply
                        conversationalReply = fullResponse;
                    }
                }
            
                if (conversationalReply) {
                    console.log(`GIL: Appending AI message from ${speaker.profileName}: "${conversationalReply.substring(0, 30)}..."`);
                    
                    // Append the clean, conversational part to the UI
                    groupUiHandler.appendMessageToGroupLog(conversationalReply, speaker.profileName!, false, speaker.id!);
                    
                    // Add the message to history, including the parsed description
                    const historyMessage: GroupChatHistoryItem = {
                        speakerId: speaker.id!,
                        text: conversationalReply,
                        timestamp: Date.now(),
                        speakerName: speaker.profileName,
                        isImageMessage: !!imageSemanticDescription, // Mark as image-related
                        imageSemanticDescription: imageSemanticDescription || undefined
                    };

                    // If this is a reply to an image, find the original user image message and copy its URL
                    if (imageSemanticDescription) {
                        const originalUserImageMsg = (groupDataManager.getLoadedChatHistory() || [])
                            .slice()
                            .reverse()
                            .find(msg => msg.speakerId === 'user_player' && msg.isImageMessage && msg.imageUrl);

                        if (originalUserImageMsg) {
                            historyMessage.imageUrl = originalUserImageMsg.imageUrl;
                            console.log(`GIL: Linked AI's image description to user's original imageUrl.`);
                        }
                    }

                    groupDataManager.addMessageToCurrentGroupHistory(historyMessage);
    
                 
                    if (isReplyToUser) {
                        lastAiDirectlyEngagedByUserId = speaker.id!; // Use speaker.id! as speaker is validated
                        console.log(`GIL: lastAiDirectlyEngagedByUserId set to ${speaker.id} (${speaker.profileName}) [reason: AI replied to user].`);
                    }
                 
                 
                    groupDataManager.saveCurrentGroupChatHistory(true);
                } else {
                    console.warn(`GIL: AI ${speaker.profileName} generated a null or empty response after processing.`);
                }
            } catch (error: any) {
                console.error(`GIL: AI error for ${speaker.profileName}:`, error);
                if (thinkingBubbleElement) {
                    thinkingBubbleElement.remove();
                }
            } finally {
                aiResponding = false;
                if (!isReplyToUser && !isAwaitingUserFirstIntroduction) {
                    startConversationFlow();
                }
            }
        }
        
     // Helper function to get a language-appropriate user reference
     function getUserReferenceName(language: string | undefined, asPronoun: boolean = false): string {
        const lang = language?.toLowerCase() || "english"; // Default to English if language is undefined

        if (asPronoun) { // "you" (singular, informal where applicable)
            switch (lang) {
                case 'spanish': return "tú";           // Spanish: you (informal singular)
                case 'french': return "toi";            // French: you (informal singular, disjunctive) / "tu" (subject)
                case 'german': return "du";             // German: you (informal singular)
                case 'italian': return "tu";            // Italian: you (informal singular)
                case 'portuguese': return "você";        // Portuguese: you (common, can be formal or informal depending on region) / "tu" (Portugal, more informal)
                case 'russian': return "ты";            // Russian: you (informal singular)
                case 'swedish': return "du";            // Swedish: you (singular)
                case 'indonesian': return "kamu";         // Indonesian: you (informal)
                case 'tagalog': return "ikaw";           // Tagalog: you (singular, subject/focus)
                case 'english': return "you";
                default: return "you";                 // Default fallback
            }
        } else { // "our friend" / "the colleague" / a neutral third-person reference for the user in history/context
            switch (lang) {
                case 'spanish': return "nuestro/a colega"; // "our colleague" (gendered based on context, but colega can be neutral)
                case 'french': return "notre ami(e)";     // "our friend" (ami for male/neutral, amie for female)
                case 'german': return "unser Freund / unsere Freundin"; // "our friend" (male/female) or "unser Gesprächspartner" (our conversation partner)
                case 'italian': return "il nostro amico / la nostra amica"; // "our friend" (male/female)
                case 'portuguese': return "nosso/a colega";  // "our colleague" or "nosso/a amigo/a"
                case 'russian': return "наш друг / наша подруга"; // "our friend" (nash drug - male, nasha podruga - female)
                case 'swedish': return "vår vän";          // "our friend" (gender neutral)
                case 'indonesian': return "teman kita";       // "our friend"
                case 'tagalog': return "ang ating kaibigan"; // "our friend"
                case 'english': return "our friend";
                default: return "our friend";            // Default fallback
            }
        }
    }


     // ...
// ...
console.log("group_interaction_logic.ts: IIFE (TS Version) finished.");
return {
    initialize,
    reset,
    setUserTypingStatus,
    startConversationFlow,
    stopConversationFlow,
    handleUserMessage,
    simulateAiMessageInGroup,
    setAwaitingUserFirstIntroduction // <<< ENSURE THIS IS HERE
};
    })(); 

    if (window.groupInteractionLogic && typeof window.groupInteractionLogic.initialize === 'function') {
        console.log("group_interaction_logic.ts: SUCCESSFULLY assigned and method verified.");
        document.dispatchEvent(new CustomEvent('groupInteractionLogicReady'));
        console.log("group_interaction_logic.ts: 'groupInteractionLogicReady' event dispatched.");
    } else {
        console.error("group_interaction_logic.ts: CRITICAL ERROR - window.groupInteractionLogic not correctly formed.");
        document.dispatchEvent(new CustomEvent('groupInteractionLogicReady'));
        console.warn("group_interaction_logic.ts: 'groupInteractionLogicReady' dispatched (INITIALIZATION FAILED).");
    }
} 


const dependenciesForGIL = [
    'activityManagerReady', 'aiServiceReady', 'polyglotHelpersReady',
    'groupDataManagerReady', 'groupUiHandlerReady', 'uiUpdaterReady', 'aiApiConstantsReady'
];
const gilMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGIL.forEach(dep => gilMetDependenciesLog[dep] = false);
let gilDepsMetCount = 0;

function checkAndInitGIL(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'activityManagerReady': verified = !!(window.activityManager && typeof window.activityManager.getAiReplyDelay === 'function'); break;
            case 'aiServiceReady': verified = !!(window.aiService && typeof window.aiService.generateTextMessage === 'function'); break;
            case 'polyglotHelpersReady': verified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.simulateTypingDelay === 'function'); break;
            case 'groupDataManagerReady': verified = !!(window.groupDataManager && typeof window.groupDataManager.getCurrentGroupId === 'function'); break;
            case 'groupUiHandlerReady': verified = !!(window.groupUiHandler && typeof window.groupUiHandler.appendMessageToGroupLog === 'function'); break;
            case 'uiUpdaterReady': verified = !!(window.uiUpdater && typeof window.uiUpdater.appendToGroupChatLog === 'function'); break;
            case 'aiApiConstantsReady': verified = !!(window.aiApiConstants && window.aiApiConstants.PROVIDERS); break;
            default: return;
        }
        if (verified && !gilMetDependenciesLog[receivedEventName]) {
            gilMetDependenciesLog[receivedEventName] = true;
            gilDepsMetCount++;
        }
    }
    if (gilDepsMetCount === dependenciesForGIL.length) {
        initializeActualGroupInteractionLogic();
    }
}

let gilAllPreloaded = true;
dependenciesForGIL.forEach(eventName => {
    let isVerified = false;
    if (eventName === 'activityManagerReady' && window.activityManager?.getAiReplyDelay) isVerified = true;
    else if (eventName === 'aiServiceReady' && window.aiService?.generateTextMessage) isVerified = true;
    // ... (add similar pre-checks for other dependencies)
   else if (eventName === 'polyglotHelpersReady') {
    isVerified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.simulateTypingDelay === 'function');
}
    else if (eventName === 'groupDataManagerReady' && window.groupDataManager?.getCurrentGroupId) isVerified = true;
    else if (eventName === 'groupUiHandlerReady' && window.groupUiHandler?.appendMessageToGroupLog) isVerified = true;
    else if (eventName === 'uiUpdaterReady' && window.uiUpdater?.appendToGroupChatLog) isVerified = true;
    else if (eventName === 'aiApiConstantsReady' && window.aiApiConstants?.PROVIDERS) isVerified = true;


    if (isVerified) {
        if(!gilMetDependenciesLog[eventName]) { gilMetDependenciesLog[eventName] = true; gilDepsMetCount++; }
    } else {
        gilAllPreloaded = false;
        document.addEventListener(eventName, () => checkAndInitGIL(eventName), { once: true });
    }
});

if (gilAllPreloaded && gilDepsMetCount === dependenciesForGIL.length) {
    initializeActualGroupInteractionLogic();
} else if (!gilAllPreloaded) {
    console.log(`group_interaction_logic.ts: Waiting for ${dependenciesForGIL.length - gilDepsMetCount} core dependencies.`);
}

console.log("group_interaction_logic.ts: Script execution FINISHED (TS Version).");