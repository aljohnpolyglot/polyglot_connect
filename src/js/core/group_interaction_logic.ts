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
    // REPLACE THIS ENTIRE SECTION IN YOUR FILE //

async function simulateAiMessageInGroup(
    isReplyToUser: boolean = false,
    userMessageText: string = "",
    imageContextForReply?: { base64Data?: string; mimeType?: string; }
): Promise<void> {
    if (aiResponding) {
        console.log("GIL: AI is already responding, skipping this turn.");
        return;
    }
    aiResponding = true;
    const USER_ID_PLACEHOLDER = "user_player";
    const currentGroupDef = groupDataManager.getCurrentGroupData();
    if (!currentGroupDef || !currentGroupTutorInternal) {
        console.error("GIL: Cannot simulate message, critical group data missing.");
        aiResponding = false;
        return;
    }

    const groupChatHistory = groupDataManager.getLoadedChatHistory() || [];
    const activeAiSpeakers = currentGroupMembersInternal.filter(m => m.id !== "user_player" && polyglotHelpers.isConnectorCurrentlyActive(m));
// ADD THIS LINE
const lastMessageInFullHistory = groupChatHistory.length > 0 ? groupChatHistory[groupChatHistory.length - 1] : null;
    if (activeAiSpeakers.length === 0) {
        aiResponding = false;
        return;
    }

    // This variable will hold our chosen speaker. It starts as undefined.
    let speaker: Connector | undefined;
    const normalizedUserMessage = userMessageText ? polyglotHelpers.normalizeText(userMessageText) : "";

    // --- PRIORITY 1: Explicit @Mention ---
    // User mentions an AI's name directly. This gets top priority.
    if (isReplyToUser && userMessageText) {
        for (const potentialSpeaker of activeAiSpeakers) {
            const firstNamesToMatch = [
                potentialSpeaker.profileName?.split(' ')[0],
                potentialSpeaker.name?.split(' ')[0]
            ].filter(Boolean).map(name => polyglotHelpers.normalizeText(name!));

            const uniqueFirstNames = [...new Set(firstNamesToMatch)];

            for (const firstName of uniqueFirstNames) {
                // Use a regular expression to match the whole word to avoid partial matches (e.g., "Ken" in "Kenji").
                const namePattern = new RegExp(`\\b${firstName}\\b`, 'i');
                if (namePattern.test(normalizedUserMessage)) {
                    speaker = potentialSpeaker;
                    console.log(`GIL: Speaker Priority 1 - User mentioned '${firstName}', selecting ${speaker.profileName}.`);
                    break;
                }
            }
            if (speaker) break; // Exit the outer loop once a speaker is found
        }
    }

    // --- PRIORITY 2: Implicit Follow-up to Last ENGAGED AI ---
    // If no one was explicitly named, check if the user is continuing a direct conversation.
    // This only triggers if an AI has recently replied to the user (`lastAiDirectlyEngagedByUserId` is set).
  // REPLACE WITH THIS FINAL, UPGRADED BLOCK //

    // --- PRIORITY 2: Implicit Follow-up to Last ENGAGED AI ---
    // If no one was explicitly named, check if the user is continuing a direct conversation.
    if (!speaker && lastAiDirectlyEngagedByUserId && isReplyToUser && userMessageText) {
        let isLikelyFollowUp = false;

        // --- KEYWORD LISTS FOR FOLLOW-UP DETECTION ---
    // --- KEYWORD LISTS FOR FOLLOW-UP DETECTION ---
// NOTE: All keywords are pre-normalized (lowercase, accents removed) to match the `normalizedUserMessage` variable.
// This greatly improves matching robustness across different languages and user input styles.

const simpleAffirmations: string[] = [
    // English
    "yes", "yeah", "yep", "yup", "sure", "okay", "ok", "alright", "right", "correct", "exactly", "true", "i agree", "me too", "sounds good", "got it", "understood", "fine", "good", "totally", "for sure", "certainly", "absolutely", "definitely", "you got it", "that's it",
    // Spanish
    "si", "claro", "vale", "bueno", "dale", "de acuerdo", "exacto", "correcto", "verdad", "asi es", "entiendo", "entendido", "ya veo", "perfecto", "cierto", "seguro", "ya", "esta bien", "eso es",
    // French
    "oui", "ouais", "bien sur", "d'accord", "exactement", "c'est ca", "c'est vrai", "entendu", "compris", "parfait", "absolument", "tout a fait", "carrement", "ca marche",
    // German
    "ja", "sicher", "klar", "okay", "ok", "in ordnung", "genau", "richtig", "stimmt", "absolut", "bestimmt", "verstanden", "genau so", "sicherlich", "einverstanden",
    // Italian
    "si", "certo", "va bene", "ok", "d'accordo", "esatto", "giusto", "certo che si", "ho capito", "perfetto", "assolutamente",
    // Portuguese
    "sim", "claro", "ta bom", "esta bem", "certo", "exato", "com certeza", "entendi", "perfeito", "absolutamente", "fechado", "beleza",
    // Dutch
    "ja", "zeker", "tuurlijk", "ok", "oke", "akkoord", "precies", "klopt", "begrepen", "helemaal", "prima",
    // Russian (cyrillic)
    "да", "ага", "конечно", "хорошо", "ладно", "точно", "именно", "правильно", "согласен", "согласна", "понял", "поняла", "понятно", "безусловно",
    // Japanese (hiragana/kanji)
    "はい", "ええ", "うん", "そうです", "そうですね", "その通り", "分かった", "分かりました", "了解", "なるほど", "確かに",
    // Korean (hangul)
    "네", "응", "맞아요", "그럼요", "알았어", "알겠습니다", "이해했어요", "좋아요", "당연하죠",
    // Mandarin Chinese (pinyin/hanzi)
    "shi de", "dui", "hao", "好的", "对", "是的", "没错", "当然", "明白了", "我同意",
    // Arabic
    "نعم", "ايوه", "اكيد", "طبعا", "تمام", "صح", "مضبوط", "بالتاكيد", "موافق", "فهمت",
    // Hindi
    "haan", "theek hai", "sahi hai", "bilkul", "samajh gaya", "samajh gayi", "ji",
    // Indonesian
    "ya", "iya", "tentu", "oke", "baik", "setuju", "paham", "mengerti", "benar", "betul",
    // Polish
    "tak", "pewnie", "oczywiscie", "zgoda", "dobrze", "ok", "racja", "dokladnie", "zrozumialem", "rozumiem",
    // Swedish
    "ja", "visst", "javisst", "okej", "ok", "precis", "exakt", "juste", "jag forstar", "absolut",
    // Thai
    "ใช่", "ค่ะ", "ครับ", "แน่นอน", "โอเค", "เข้าใจแล้ว", "ถูกต้อง",
    // Turkish
    "evet", "tabii", "tamam", "olur", "anlastik", "dogru", "kesinlikle", "anladim",
    // Vietnamese
    "vâng", "dạ", "đúng", "chắc chắn", "được", "ok", "tất nhiên", "hiểu rồi",
    // Tagalog
    "oo", "opo", "sige", "tama", "syempre", "gets ko", "naiintindihan ko",
    // Norwegian
    "ja", "sikkert", "selvfolgelig", "ok", "greit", "riktig", "akkurat", "forstatt",
    "totally" // Universal slang
];

const simpleNegations: string[] = [
    // English
    "no", "nope", "nah", "not really", "i disagree", "i don't think so", "never", "incorrect", "false", "not at all", "certainly not", "absolutely not", "wrong",
    // Spanish
    "no", "claro que no", "para nada", "no estoy de acuerdo", "nunca", "incorrecto", "falso", "jamas", "en absoluto", "que va", "negativo",
    // French
    "non", "pas vraiment", "je ne suis pas d'accord", "jamais", "incorrect", "faux", "pas du tout", "absolument pas", "pas question",
    // German
    "nein", "nicht wirklich", "stimmt nicht", "falsch", "niemals", "auf keinen fall", "ich stimme nicht zu", "uberhaupt nicht", "keinesfalls",
    // Italian
    "no", "non proprio", "non sono d'accordo", "sbagliato", "assolutamente no", "per niente", "mai",
    // Portuguese
    "nao", "de jeito nenhum", "claro que nao", "discordo", "errado", "nunca", "jamais",
    // Dutch
    "nee", "niet echt", "oneens", "niet akkoord", "fout", "absoluut niet", "nooit",
    // Russian (cyrillic)
    "нет", "неа", "не совсем", "я не согласен", "я не согласна", "никогда", "неправильно", "неверно", "ни в коем случае",
    // Japanese (hiragana/kanji)
    "いいえ", "いや", "ううん", "違う", "そうじゃない", "間違っています", "そんなことない",
    // Korean (hangul)
    "아니요", "아니", "틀렸어요", "그렇지 않아요", "절대 아니에요",
    // Mandarin Chinese (pinyin/hanzi)
    "bu", "bushi", "budui", "不是", "不对", "我不同意", "当然不",
    // Arabic
    "لا", "لاء", "ابدا", "غير صحيح", "خطأ", "بالعكس", "مستحيل",
    // Hindi
    "nahin", "bilkul nahin", "galat", "main sahmat nahin hoon",
    // Indonesian
    "tidak", "bukan", "salah", "saya tidak setuju", "enggak",
    // Polish
    "nie", "skad", "zle", "nie sadze", "nie zgadzam sie", "nigdy",
    // Swedish
    "nej", "na", "inte direkt", "fel", "jag haller inte med", "aldrig",
    // Thai
    "ไม่", "ไม่เลย", "ไม่เห็นด้วย", "ผิด",
    // Turkish
    "hayir", "yanlis", "katilmiyorum", "asla", "hic de degil",
    // Vietnamese
    "không", "sai", "tôi không đồng ý", "đâu có",
    // Tagalog
    "hindi", "hindi po", "mali", "hindi ako sang-ayon",
    // Norwegian
    "nei", "ikke egentlig", "uenig", "feil", "aldri", "absolutt ikke"
];

const simpleContinuers: string[] = [
    // English
    "uh-huh", "mm-hmm", "mhm", "go on", "i see", "really", "oh", "interesting", "and", "so", "then", "well", "aha", "and then", "tell me more",
    // Spanish
    "aja", "hmm", "sigue", "continua", "ya veo", "ah si", "de verdad", "interesante", "y...", "entonces", "luego", "pues", "vaya", "cuentame mas",
    // French
    "euh-hein", "hmm", "continue", "vas-y", "je vois", "ah bon", "vraiment", "interessant", "et...", "donc", "alors", "puis", "ben", "dis-m'en plus",
    // German
    "aha", "hm", "mhm", "weiter", "ich verstehe", "ach so", "wirklich", "echt", "interessant", "und...", "also", "dann", "nun", "tja", "erzahl mehr",
    // Italian
    "uhm", "mmh", "continua", "davvero", "interessante", "capisco", "allora", "e poi", "dimmi di piu",
    // Portuguese
    "uhum", "hmm", "continue", "sei", "interessante", "e entao", "me diga mais",
    // Dutch
    "hmm", "mhm", "ga door", "ik snap het", "echt", "interessant", "en", "vertel",
    // Russian (cyrillic)
    "угу", "ага", "хм", "продолжай", "понимаю", "ясно", "правда", "интересно", "и...", "так", "ну",
    // Japanese (hiragana/kanji)
    "ふむふむ", "へえ", "ほう", "それで", "なるほど", "本当", "面白い", "続けて",
    // Korean (hangul)
    "음", "아", "어", "네", "계속하세요", "진짜요", "그래요", "그래서요",
    // Mandarin Chinese (pinyin/hanzi)
    "en", "嗯", "然后呢", "有意思", "真的吗", "我明白了", "继续说",
    // Arabic
    "اها", "هممم", "كمل", "كملي", "فاهم", "بجد", "معقول", "وبعدين",
    // Hindi
    "hmm", "acha", "phir", "aur batao", "sach mein",
    // Indonesian
    "hmm", "oh gitu", "terus", "lanjut", "menarik", "begitu ya",
    // Polish
    "aha", "uhm", "kontynuuj", "naprawde", "ciekawe", "rozumiem", "no i",
    // Swedish
    "jaha", "okej", "hmm", "fortsatt", "jag forstar", "verkligen", "intressant", "och sen da",
    // Thai
    "อืม", "อ๋อ", "แล้วไงต่อ", "จริงเหรอ", "น่าสนใจ", "เล่ามาอีก",
    // Turkish
    "himm", "hı-hı", "devam et", "anliyorum", "gercekten mi", "ilginc", "ee", "sonra",
    // Vietnamese
    "uhm", "vậy à", "rồi sao", "thật hả", "thú vị", "kể tiếp đi",

    // Tagalog
    "tapos", "talaga", "ah talaga", "ganun ba", "kwento mo pa",
    // Norwegian
    "aha", "javel", "hmm", "fortsett", "jeg skjonner", "virkelig", "interessant", "og sa"
];

const questionKeywords: string[] = [
    // English
    "what", "where", "when", "who", "why", "how", "which", "whose", "explain", "question",
    // Spanish
    "que", "cual", "quien", "como", "cuando", "donde", "cuanto", "porque", "por que", "cuyo", "explica", "pregunta",
    // French
    "que", "quoi", "qui", "comment", "quand", "ou", "combien", "pourquoi", "lequel", "laquelle", "explique",
    // German
    "was", "wo", "wann", "wer", "warum", "wieso", "weshalb", "wie", "welche", "wessen", "erklar",
    // Italian
    "cosa", "che", "dove", "quando", "chi", "perche", "come", "quale", "quanto", "spiega",
    // Portuguese
    "o que", "onde", "quando", "quem", "porque", "por que", "como", "qual", "quanto", "explique",
    // Dutch
    "wat", "waar", "wanneer", "wie", "waarom", "hoe", "welke", "wiens", "leg uit",

    // Russian (cyrillic)
    "что", "где", "когда", "кто", "почему", "зачем", "как", "какой", "чей", "объясни",
    // Japanese (hiragana/kanji)
    "何", "どこ", "いつ", "誰", "なぜ", "どうして", "どう", "どの", "誰の", "教えて",
    // Korean (hangul)
    "뭐", "무엇을", "어디", "언제", "누구", "왜", "어떻게", "어떤", "설명해",
    // Mandarin Chinese (pinyin/hanzi)
    "什么", "哪里", "何时", "谁", "为什么", "怎么", "哪个", "解释",
    // Arabic
    "ماذا", "ما", "اين", "متى", "من", "لماذا", "كيف", "اي", "اشرح",
    // Hindi
    "kya", "kahan", "kab", "kaun", "kyon", "kaise", "kaun sa", "samjhao",
    // Indonesian
    "apa", "dimana", "kapan", "siapa", "mengapa", "kenapa", "bagaimana", "yang mana", "jelaskan",
    // Polish
    "co", "gdzie", "kiedy", "kto", "dlaczego", "jak", "ktory", "czyj", "wyjasnij",
    // Swedish
    "vad", "var", "nar", "vem", "varfor", "hur", "vilken", "vilket", "vems", "forklara",
    // Thai
    "อะไร", "ที่ไหน", "เมื่อไหร่", "ใคร", "ทำไม", "อย่างไร", "อันไหน", "อธิบาย",
    // Turkish
    "ne", "nerede", "ne zaman", "kim", "neden", "niye", "nasil", "hangi", "acikla",
    // Vietnamese
    "gì", "đâu", "khi nào", "ai", "tại sao", "sao", "thế nào", "cái nào", "giải thích",
    // Tagalog
    "ano", "saan", "kailan", "sino", "bakit", "paano", "alin", "ipaliwanag",
    // Norwegian
    "hva", "hvor", "nar", "hvem", "hvorfor", "hvordan", "hvilken", "hvis", "forklar"
];

// This list is checked with higher priority. It contains phrases that very strongly
// indicate the user is directly addressing the last speaker.
const directYouPhrases: string[] = [
    // English
    "you", "and you", "what about you", "how about you", "your turn", "you are", "you're", "do you", "are you", "did you", "can you", "will you", "could you", "would you", "have you", "what do you",
    // Spanish
    "tu", "usted", "vos", "y tu", "y usted", "y vos", "que tal tu", "que hay de ti", "a ti", "y a ti", "eres", "estas", "tienes", "puedes", "sabes", "has", "crees que",
    // French
    "toi", "vous", "et toi", "et vous", "ton avis", "votre avis", "tu es", "vous etes", "as-tu", "avez-vous", "peux-tu", "pouvez-vous", "sais-tu", "savez-vous", "penses-tu",
    // German
    "du", "sie", "und du", "und sie", "und dir", "und ihnen", "was ist mit dir", "was meinst du", "du bist", "sind sie", "bist du", "kannst du", "konnen sie", "hast du", "haben sie", "denkst du",
    // Italian
    "tu", "lei", "e tu", "e lei", "che ne dici di te", "secondo te", "tu sei", "lei e", "hai", "puoi", "sai", "pensi che",
    // Portuguese
    "voce", "e voce", "o que me diz de voce", "e tu", "pra voce", "voce e", "voce esta", "tem", "pode", "sabe", "acha que",
    // Dutch
    "jij", "u", "en jij", "en u", "wat vind jij", "jij bent", "ben jij", "heb jij", "kun jij", "kan je",
    // Russian (cyrillic)
    "ты", "вы", "а ты", "а вы", "как насчет тебя", "а у тебя", "у тебя", "ты можешь", "вы можете", "ты думаешь",
    // Japanese (hiragana/kanji)
    "あなた", "君は", "あなたはどう", "どう思いますか", "できますか", "知っていますか", // Note: "you" is often omitted, but these phrases are direct.
    // Korean (hangul)
    "너는", "당신은", "어때요", "어떠세요", "할 수 있어요", "아세요", "생각해요",
    // Mandarin Chinese (pinyin/hanzi)
    "ni", "nin", "你", "您", "你呢", "你怎么看", "你可以", "你知道吗", "你觉得",
    // Arabic
    "انت", "انتي", "حضرتك", "وانت", "وانتي", "شو رايك", "رايك ايه", "تقدر", "تقدرين", "بتعرف", "هل تعتقد",
    // Hindi
    "aap", "tum", "aur aap", "aur tum", "aapke bare me", "aap kya sochte hain", "kya aap",
    // Indonesian
    "kamu", "anda", "kalau kamu", "bagaimana denganmu", "menurutmu", "apakah kamu", "bisa",
    // Polish
    "ty", "pan", "pani", "a ty", "co ty na to", "twoim zdaniem", "czy mozesz", "czy wiesz",
    // Swedish
    "du", "och du", "du da", "vad tycker du", "kan du", "vet du", "tror du",
    // Thai
    "คุณ", "แล้วคุณล่ะ", "คุณคิดว่าไง", "คุณทำได้ไหม", "คุณรู้ไหม",
    // Turkish
    "sen", "siz", "ya sen", "peki ya siz", "sence", "sen ne dusunuyorsun", "yapabilir misin", "biliyor musun",
    // Vietnamese
    "bạn", "còn bạn", "bạn thì sao", "bạn nghĩ sao", "bạn có thể", "bạn có biết",
    // Tagalog
    "ikaw", "eh ikaw", "para sayo", "sa tingin mo", "kaya mo ba", "alam mo ba",
    // Norwegian
    "du", "og du", "hva med deg", "hva synes du", "kan du", "vet du", "tror du"
];

        // --- FOLLOW-UP DETECTION LOGIC ---

        // Check 2a: Is the user's message an exact match for a simple, short response?
        if ([...simpleAffirmations, ...simpleNegations, ...simpleContinuers].includes(normalizedUserMessage)) {
            isLikelyFollowUp = true;
            console.log(`GIL Follow-up Trigger: Matched a simple short response ("${normalizedUserMessage}").`);
        }

        // Check 2b: If not, check for other follow-up signals in order of priority.
        if (!isLikelyFollowUp) {
            if (normalizedUserMessage.endsWith("?")) {
                isLikelyFollowUp = true;
                console.log(`GIL Follow-up Trigger: Message ends with a question mark.`);
            } else {
                // Check for specific "you" phrases first, as they are strong signals.
                for (const phrase of directYouPhrases) {
                    if (normalizedUserMessage.startsWith(phrase + " ") || normalizedUserMessage === phrase) {
                        isLikelyFollowUp = true;
                        console.log(`GIL Follow-up Trigger: Matched a direct 'you' phrase ("${phrase}").`);
                        break;
                    }
                }
                // If still no match, check for general question keywords.
                if (!isLikelyFollowUp) {
                    for (const keyword of questionKeywords) {
                        if (normalizedUserMessage.startsWith(keyword + " ") || normalizedUserMessage === keyword) {
                            isLikelyFollowUp = true;
                            console.log(`GIL Follow-up Trigger: Matched a question keyword ("${keyword}").`);
                            break;
                        }
                    }
                }
            }
        }

        // --- DECISION ---
        if (isLikelyFollowUp) {
            const lastEngagedAI = activeAiSpeakers.find(s => s.id === lastAiDirectlyEngagedByUserId);
            if (lastEngagedAI) {
                speaker = lastEngagedAI;
                console.log(`GIL: Speaker Priority 2 - Follow-up confirmed. Prioritizing last engaged AI: ${speaker.profileName}.`);
            } else {
                lastAiDirectlyEngagedByUserId = null; 
            }
        } else {
            console.log(`GIL: User message ("${normalizedUserMessage.substring(0,30)}...") does not appear to be a direct follow-up. Resetting conversation stickiness.`);
            lastAiDirectlyEngagedByUserId = null;
        }
    }

    // --- PRIORITY 3: Default Round-Robin / Proactive Turn ---
    // This is the fallback if no specific speaker has been chosen by the logic above.
    if (!speaker) {
        console.log(`GIL: Speaker Priority 3 - No specific target detected. Using default round-robin/proactive logic.`);
        const activeNonTutorAISpeakers = activeAiSpeakers.filter(s => s.id !== currentGroupTutorInternal!.id);
        const tutorIsActiveAndPresent = activeAiSpeakers.some(s => s.id === currentGroupTutorInternal!.id);

        if (isReplyToUser) { // AI is replying to a general user message.
            if (activeNonTutorAISpeakers.length > 0) {
                lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % activeNonTutorAISpeakers.length;
                speaker = activeNonTutorAISpeakers[lastAiSpeakerIndex];
                console.log(`GIL: Replying to user (round-robin) with non-tutor: ${speaker?.profileName}`);
            } else if (tutorIsActiveAndPresent) {
                speaker = currentGroupTutorInternal; // Fallback to tutor
                 console.log(`GIL: Replying to user with tutor (only active AI): ${speaker?.profileName}`);
            }
        } else { // This is a proactive turn by an AI (not a direct reply).
            if (tutorIsActiveAndPresent && Math.random() < 0.4) { // 40% chance for tutor to initiate
                speaker = currentGroupTutorInternal;
                console.log(`GIL: Tutor (${speaker?.profileName}) taking a proactive turn (by chance).`);
            } else if (activeNonTutorAISpeakers.length > 0) {
                lastAiSpeakerIndex = (lastAiSpeakerIndex + 1) % activeNonTutorAISpeakers.length;
                speaker = activeNonTutorAISpeakers[lastAiSpeakerIndex];
                 console.log(`GIL: Non-tutor AI (${speaker?.profileName}) taking a proactive turn.`);
            } else if (tutorIsActiveAndPresent) {
                speaker = currentGroupTutorInternal; // Fallback to tutor
                console.log(`GIL: Tutor (${speaker?.profileName}) taking a proactive turn (only active AI).`);
            }
        }
    }

    // Final check to ensure a speaker was selected.
    if (!speaker || !speaker.profileName) {
        console.error("GIL: Could not select a valid AI speaker from active members.", { finalSpeaker: speaker });
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
               // REPLACE WITH THIS
taskSpecifics = `- You are directly replying to the user (${userInstructionHowAIShouldReferToUser}) who just said: "${polyglotHelpers.sanitizeTextForDisplay(userMessageText)}".
1. Acknowledge their point clearly.
2. Add YOUR persona's perspective, a brief related thought, or a short consistent anecdote.
3. THEN, if natural, you might ask an open-ended follow-up question. Avoid just asking "What about you?".`;
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