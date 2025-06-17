/**
 * @file group_interaction_logic.ts
 * @description (HYBRID ADAPTATION V2) - Implements highly specialized, dynamic prompt building
 * for different group types while maintaining the public interface for group_manager.ts.
 */
import type {
    Connector,
    Group,
    GroupChatHistoryItem,
    PolyglotHelpersOnWindow,
    GroupDataManager,
    GroupUiHandler,
    ActivityManager,
    AIService,
    GeminiChatItem,
    AIApiConstants
} from '../types/global.d.ts';

// In src/js/core/group_interaction_logic.ts

// REPLACE THIS:
// import { getCoreIdentityPrompt, getPersonalityAndBehaviorPrompt } from './persona_prompt_parts.js';

// WITH THIS:
import { getGroupPersonaSummary } from './persona_prompt_parts.js';

console.log('group_interaction_logic.ts: (Hybrid V2) Script loaded.');

(function () {
    'use strict';

    // --- EVERYTHING MUST BE INSIDE THIS IIFE ---

    // --- MODULE-LEVEL STATE (SHARED BY ALL FUNCTIONS BELOW) ---
   // --- MODULE-LEVEL STATE (SHARED BY ALL FUNCTIONS BELOW) ---
let members: Connector[] = [];
let tutor: Connector | null = null;
let isAwaitingUserFirstIntro: boolean = false;
let conversationFlowActive: boolean = false;
let conversationLoopId: ReturnType<typeof setTimeout> | null = null;
let lastMessageTimestamp: number = 0;
let hasProddedSinceUserSpoke: boolean = false; // <<< ADD THIS LINE
let isRenderingScene: boolean = false; // <<< ADD THIS LINE
let currentSceneCancellationToken: { isCancelled: boolean } | null = null; // <<< ADD THIS LINE
    // --- DEPENDENCY GETTER ---
    const getDeps = () => ({
        polyglotHelpers: window.polyglotHelpers!,
        groupDataManager: window.groupDataManager!,
        groupUiHandler: window.groupUiHandler!,
        activityManager: window.activityManager!,
        aiService: window.aiService!,
        aiApiConstants: window.aiApiConstants!
    });

    // --- SPECIALIZED RULE BUILDERS (Your New Idea) ---

// =================== START: ADD THIS ENTIRE NEW FUNCTION ===================

/**
 * Uses a dedicated AI call to analyze a user's message and extract key profile facts.
 * @param userMessage The text message from the user.
 * @param existingSummary The current summary of the user's profile.
 * @returns A promise that resolves to an updated summary string.
 */
async function extractAndUpdateUserSummary(userMessage: string, existingSummary: string): Promise<string> {
    const { aiService, groupDataManager } = getDeps();
    const currentGroup = groupDataManager.getCurrentGroupData();
    if (!currentGroup) return existingSummary;

    console.log("GIL [Memory Extractor]: Analyzing user message for profile details...");

    const extractorPrompt = `
You are a data analysis bot. Your only task is to read a conversation and update a user profile summary.

--- EXISTING USER PROFILE ---
${existingSummary || "No data yet."}

--- LATEST USER MESSAGE ---
[You]: ${userMessage}

--- YOUR TASK ---
Analyze the "LATEST USER MESSAGE". Does it contain new, concrete facts about the user (their name, where they are from, their job, specific interests, etc.)?

- IF a key fact is ALREADY in the "EXISTING USER PROFILE", DO NOT repeat it.
- IF the message contains NEW facts, add them as new bullet points to the summary.
- IF the message contains NO new facts (e.g., "lol", "I agree", "what do you think?"), then your response MUST be ONLY the word "NO_CHANGE".

Your response should ONLY be the updated summary points, or the word "NO_CHANGE". Do not include any other text or preamble.

--- EXAMPLE 1 ---
EXISTING USER PROFILE:
- The user is from the Philippines.
LATEST USER MESSAGE:
[You]: HI alles!! ich bin John!
YOUR RESPONSE:
- The user is from the Philippines.
- The user's name is John.

--- EXAMPLE 2 ---
EXISTING USER PROFILE:
- The user's name is John.
LATEST USER MESSAGE:
[You]: That's a good point, I agree.
YOUR RESPONSE:
NO_CHANGE
`;

    try {
        // Use a fast, cheap model for this analysis task
        const response = await aiService.generateTextMessage(extractorPrompt, members[0], [], 'groq');
        
        if (response && typeof response === 'string' && response.trim() !== "NO_CHANGE") {
            console.log(`GIL [Memory Extractor]: SUCCESS. New facts found. Updated Summary:\n${response}`);
            return response.trim();
        } else {
            console.log("GIL [Memory Extractor]: No new facts found in user's message.");
            return existingSummary; // Return the original summary if no change
        }
    } catch (error) {
        console.error("GIL [Memory Extractor]: Error during user summary extraction:", error);
        return existingSummary; // Return original summary on error
    }
}



    function buildLanguageLearningRules(groupMembers: Connector[], group: Group): string {
        const targetLanguage = group.language || 'the target language';
        const getPersonaSpecificRules = (member: Connector): string => {
            const role = member.languageRoles?.[targetLanguage]?.[0] || 'learner';
            const proficiency = member.learningLevels?.[targetLanguage] || 'Intermediate';

            if (role === 'tutor') {
                return `\n### Persona Directives for ${member.profileName} (Tutor):\n- **Core Role:** You are the group's language tutor. Your goal is to encourage practice.\n- **Correction Style:** Use gentle, modeling corrections. If a learner says "I go store yesterday," respond with "Oh, you went to the store yesterday? What did you buy?".\n- **Engagement:** Actively ask open-ended questions to learners.`;
            }
            if (role === 'learner') {
                let mistakeRules = '';
                switch (proficiency.substring(0, 2)) {
                    case 'A1': case 'A2': // Beginner
                        mistakeRules = `- **Simulated Mistakes:** Make common beginner mistakes like basic verb conjugation ("I to eat pizza"), noun genders, and simple word order.`;
                        break;
                    case 'B1': case 'B2': // Intermediate
                        mistakeRules = `- **Simulated Mistakes:** Make subtle mistakes like incorrect tenses, prepositions, or using "false friends".`;
                        break;
                    case 'C1': case 'C2': // Advanced
                        mistakeRules = `- **Simulated Mistakes:** Make rare, sophisticated mistakes with idioms or unnatural-sounding phrasing.`;
                        break;
                }
                return `\n### Persona Directives for ${member.profileName} (Learner - ${proficiency}):\n- **Behavior:** Practice and don't be afraid to make mistakes.\n${mistakeRules}`;
            }
            return `\n### Persona Directives for ${member.profileName}:\n- Behave as a general participant.`;
        };
        const allMemberRules = groupMembers.map(getPersonaSpecificRules).join('');
        return `# SECTION 2: SPECIALIZED RULES - LANGUAGE LEARNING (Target: ${targetLanguage.toUpperCase()})\n**OVERALL OBJECTIVE:** Realistic language practice.\n${allMemberRules}`;
    }

    function buildCommunityHangoutRules(groupMembers: Connector[], group: Group): string {
        const hangoutTopic = group.tags?.join(', ') || 'your shared interests';
        const moderator = groupMembers.find(m => m.id === group.tutorId);
        const moderatorRules = moderator ? `\n### Persona Directives for ${moderator.profileName} (Moderator):\n- **Core Role:** You are the hangout's moderator. Keep the conversation positive and flowing.\n- **Behavior:** If the chat goes silent, bring up a new question related to ${hangoutTopic}. Gently include quiet people.` : '';
        const memberRules = groupMembers.filter(m => m.id !== group.tutorId).map(member => `\n### Persona Directives for ${member.profileName} (Member):\n- **Core Role:** Chat with friends about ${hangoutTopic}.\n- **Behavior:** Share opinions, ask questions, and use slang/emojis that fit your persona.`).join('');
        return `# SECTION 2: SPECIALIZED RULES - COMMUNITY HANGOUT (Topic: ${hangoutTopic.toUpperCase()})\n**OVERALL OBJECTIVE:** Simulate a fun, casual online chat.\n${moderatorRules}${memberRules}`;
    }

    function buildSportsClubRules(groupMembers: Connector[], group: Group): string {
        const sportsTopic = group.tags?.join(', ') || 'our team';
        return `# SECTION 2: SPECIALIZED RULES - SPORTS CLUB (Topic: ${sportsTopic.toUpperCase()})\n**OVERALL OBJECTIVE:** Simulate a passionate, knowledgeable, and lively chat for sports fans.`;
    }

    // --- MASTER PROMPT BUILDER ---

    function buildMasterPrompt(group: Group, groupMembers: Connector[], helpers: PolyglotHelpersOnWindow): string {
        const memberList = helpers.formatReadableList(groupMembers.map(m => m.profileName), "and");
      
      
      
   // --- NEW: Get User Profile Summary ---
   const convoStore = window.convoStore;
   const groupConvoRecord = convoStore?.getConversationById(group.id);
   const userSummary = groupConvoRecord?.userProfileSummary;
   const userSummarySection = userSummary 
       ? `\n# SECTION 1: KNOWN FACTS ABOUT THE USER ('You')\n${userSummary}\n---` 
       : "";
      
      
      
      
        const masterRules = `# SECTION 0: MASTER DIRECTIVE - GROUP CHAT SIMULATION...
        **YOUR PRIMARY GOAL:** You are a master AI puppeteer... controlling: ${memberList}.
       **RULE 0.1: THE UNBREAKABLE OUTPUT FORMAT:** This is the most important rule and you must never violate it. Your ENTIRE response MUST STRICTLY and ONLY be in the format \`[SpeakerName]: message\`.
- DO NOT include any preamble, reasoning, apologies, or self-correction.
- DO NOT write "I will now select..." or "As a language model...".
- Your output must begin with \`[\` and end after the message. Any text outside this format will cause a system failure.
        **RULE 0.2: THE SPEAKER SELECTION LOGIC:**
            - **CRITICAL SUB-RULE (HIGHEST PRIORITY): Handle Direct Questions.** If the last message was a direct question to a specific persona by name (e.g., "Anja, what do you think?"), that persona **MUST** be the next speaker and **MUST** answer the question directly. Do not have another persona interrupt.
            - **General Flow:** If no specific persona was addressed, you may then apply your general logic to intelligently decide which persona should speak next.
        **RULE 0.3: THE PERSONA INTEGRITY MANDATE:** You MUST perfectly embody the specified persona.
        **RULE 0.4: THE FINAL OUTPUT VALIDATION:** Before you output, validate it against RULE 0.1.`;
        
        let specializedRules = '';
        switch (group.category) {
            case 'Language Learning':
                specializedRules = buildLanguageLearningRules(groupMembers, group);
                break;
            case 'Community Hangout':
                specializedRules = buildCommunityHangoutRules(groupMembers, group);
                break;
            case 'Sports Fan Club':
                specializedRules = buildSportsClubRules(groupMembers, group);
                break;
            default:
                specializedRules = `\n# SECTION 2: GENERAL CONVERSATION RULES\n- Keep the conversation flowing naturally.`;
        }

        const personaSections = groupMembers.map(member => 
            getGroupPersonaSummary(member, group.language)
        ).join('\n');
        return `${masterRules}${userSummarySection}\n${specializedRules}\n${personaSections}`;
    }

    // --- AI RESPONSE GENERATION LOGIC ---

   // <<< REPLACE THE FUNCTION SIGNATURE WITH THIS >>>
// =================== START: REPLACE THE ENTIRE FUNCTION ===================
// <<< ADD THIS ENTIRE NEW HELPER FUNCTION >>>
// <<< REPLACE THE ENTIRE renderScene FUNCTION WITH THIS >>>
// <<< REPLACE THE renderScene FUNCTION WITH THIS SLIGHTLY SIMPLER VERSION >>>
// <<< REPLACE THE ENTIRE renderScene FUNCTION >>>
// <<< CHANGE THE RETURN TYPE >>>
// =================== START: REPLACE THE ENTIRE FUNCTION ===================
// =================== START: REPLACE THE ENTIRE FUNCTION ===================

async function renderScene(lines: string[]): Promise<number> {
    isRenderingScene = true; // <<< SET FLAG AT THE START
    const startTime = Date.now();
    const totalLinesInScene = lines.length;

    // Create a new cancellation token for THIS specific scene rendering.
    const cancellationToken = { isCancelled: false };
    currentSceneCancellationToken = cancellationToken;

    // <<< CHANGE 2: Add `currentIndex` parameter to the recursive function.
    const renderNextLine = async (lineArray: string[], currentIndex: number): Promise<void> => {
        // --- CANCELLATION CHECK ---
        if (cancellationToken.isCancelled) {
            console.log("[Scene Renderer]: Scene rendering cancelled by user activity.");
            const { activityManager } = getDeps();
            members.forEach(member => {
                activityManager.clearAiTypingIndicator(member.id, 'group');
            });
            return;
        }

        if (lineArray.length === 0) {
            return; // Base case: all lines are done.
        }
        
        const { activityManager, groupDataManager, groupUiHandler } = getDeps();
        const [currentLine, ...remainingLines] = lineArray;

        let speakerName: string | undefined, responseText: string | undefined;

        // --- Parsing Logic ---
        const strictMatch = currentLine.match(/\[(.*?)\]:\s*(.*)/s);
        const fallbackMatch = currentLine.match(/([\w\sÉéàâçèêëîïôûùüÿñæœÀÂÇÈÊËÎÏÔÛÙÜŸÑÆŒ]+):\s*(.*)/s);

        if (strictMatch && strictMatch[1] && strictMatch[2]) {
            speakerName = strictMatch[1].trim();
            responseText = strictMatch[2].trim();
        } else if (fallbackMatch && fallbackMatch[1] && fallbackMatch[2]) {
            const potentialName = fallbackMatch[1].trim();
            if (members.some((m: Connector) => m.profileName === potentialName)) {
                speakerName = potentialName;
                responseText = fallbackMatch[2].trim();
            }
        }

        if (speakerName && responseText) {
            // --- NEW: Flexible Speaker Matching ---
            // First, try for an exact match. This is the fastest and most common case.
            let speakerConnector = members.find((m: Connector) => m.profileName === speakerName);
            
            // If no exact match, try a "starts with" match. This catches nicknames like "Javi M." for "Javi".
            if (!speakerConnector) {
                speakerConnector = members.find((m: Connector) => speakerName.startsWith(m.profileName));
            }
            // --- END: Flexible Speaker Matching ---

            if (speakerConnector) {
                activityManager.simulateAiTyping(speakerConnector.id, 'group');
                
                const wordCount = responseText.split(' ').length;
                const typingDurationMs = 1500 + (wordCount / 3) * 1000;
                const finalDelay = Math.min(Math.max(typingDurationMs, 2000), 7000) + Math.random() * 1000;

                // <<< CHANGE 3: Update the console log with the progress counter.
                console.log(`[Scene Pacing ${currentIndex}/${totalLinesInScene}]: Message: "${responseText.substring(0,20)}...", WordCount: ${wordCount}, Delay: ${finalDelay.toFixed(0)}ms`);

                // START: NEW ORDER - STATE UPDATE FIRST
                lastMessageTimestamp = Date.now();
                const historyItem: GroupChatHistoryItem = { speakerId: speakerConnector.id, speakerName, text: responseText, timestamp: Date.now() };
                groupDataManager.addMessageToCurrentGroupHistory(historyItem);
                // END: NEW ORDER

                // NOW, wait for the typing delay
                await new Promise(resolve => setTimeout(resolve, finalDelay));

                // Check for cancellation AGAIN after the delay, before showing the message
                if (cancellationToken.isCancelled) {
                    // We don't need to do anything here, the function will just exit cleanly.
                    // The message is in history, but won't be displayed, which is fine.
                    // The main loop will re-render it from history on next load if needed.
                    return; 
                }

                // Finally, update the UI
                activityManager.clearAiTypingIndicator(speakerConnector.id, 'group');
                groupUiHandler.appendMessageToGroupLog(responseText, speakerName, false, speakerConnector.id);
            }
        }
        
        // <<< CHANGE 4: Pass the incremented index in the recursive call.
        await renderNextLine(remainingLines, currentIndex + 1);
    };

    // <<< CHANGE 5: Start the recursive process with the initial index of 1.
    await renderNextLine(lines, 1);

    // Clean up the token after the scene is done.
    currentSceneCancellationToken = null;
    
    const durationMs = Date.now() - startTime;
    if (!cancellationToken.isCancelled) {
         console.log(`%c[Scene Renderer]: All lines rendered. Scene took ${(durationMs / 1000).toFixed(1)}s to display.`, 'color: #17a2b8; font-style: italic;');
    }
    
    isRenderingScene = false; // <<< CLEAR FLAG AT THE END
    return durationMs;
}

// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================

// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================
// <<< CHANGE THE RETURN TYPE >>>
async function generateAiTextResponse(
    engineTriggered: boolean = false, 
    isGrandOpening: boolean = false, 
    isReEngagement: boolean = false, 
    userText: string | undefined = undefined
): Promise<string[]> {
   
    if (!conversationFlowActive) return []; // FIX 1
    const { groupDataManager, polyglotHelpers, aiService, groupUiHandler, activityManager } = getDeps();
    const currentGroup = groupDataManager.getCurrentGroupData();
    if (!currentGroup || !tutor) {
        console.error("GIL: generateAiTextResponse called but currentGroup or tutor is missing.");
        return []; // FIX 2
    }

    let systemPrompt = '';
    let instructionText = '';
    const groupHistory = groupDataManager.getLoadedChatHistory();
    const recentHistoryText = groupHistory.slice(-15).map(msg => `${msg.speakerName}: ${msg.text}`).join('\n');

    // --- STATE-BASED PROMPT SELECTION ---

    if (isGrandOpening || isReEngagement) {
        // --- PROMPT FOR SCENES: "You are a creative writer." ---
        // This is a simple, focused prompt for generating initial scenes.
        // 1. Get the detailed persona summaries and specialized rules.
    const personaSections = members.map(member => getGroupPersonaSummary(member, currentGroup.language)).join('\n');
    let specializedRules = '';
    switch (currentGroup.category) {
        case 'Language Learning':
            specializedRules = buildLanguageLearningRules(members, currentGroup);
            break;
        case 'Community Hangout':
            specializedRules = buildCommunityHangoutRules(members, currentGroup);
            break;
        case 'Sports Fan Club':
            specializedRules = buildSportsClubRules(members, currentGroup);
            break;
        default:
            specializedRules = `\n# GENERAL CONVERSATION RULES\n- Keep the conversation flowing naturally.`;
    }

    // 2. Build the new system prompt.
    systemPrompt = `You are a creative dialogue writer for a chat simulation. Your primary goal is to write a realistic, in-character scene.

--- CRITICAL RULES ---
1.  **LANGUAGE:** You MUST write the entire dialogue ONLY in **${currentGroup.language}**.
2.  **FORMAT:** Every line MUST be in the format: [CharacterName]: message.
3.  **PERSONA:** You MUST adhere to the character personalities, roles, and allegiances described below. For example, a Real Madrid fan must act like one.

--- CHARACTERS & SPECIALIZED RULES ---
${personaSections}
${specializedRules}
`;
        
if (isGrandOpening) {
    // --- NEW: Check if the group is essentially a one-on-one chat ---
    if (members.length <= 1) { 
        console.warn(`GIL: GRAND OPENING with only ${members.length} members. Switching to a direct, personal welcome prompt.`);
        instructionText = `
You are the host, **${tutor.profileName}**. You've just started a new chat group called "${currentGroup.name}", but so far, only one other person has joined: the user.

Your task is to write a warm, personal welcome message directly to the user.

--- SCENE REQUIREMENTS ---
1.  **Acknowledge the Situation:** Start by welcoming the user personally. It's just the two of you for now.
2.  **State Your Role:** Briefly mention you are the host/tutor for the group.
3.  **Direct Question:** End your message by asking the user a direct, open-ended question to start the conversation. This is the most important part.
4.  **Output Format:** Your ENTIRE response MUST be a SINGLE line in the format \`[${tutor.profileName}]: message\`.

--- GOOD EXAMPLE ---
[Mateus]: Olá! Bem-vindo ao "Exploradores de Portugal". Por enquanto, somos só nós os dois. Eu sou o Mateus, o teu guia por aqui. Para começar, o que despertou o teu interesse em Portugal?

--- BAD EXAMPLE (Talks to a non-existent group) ---
[Mateus]: Bem-vindos todos! Vamos começar a nossa discussão!
`;
    } else {
            console.log("GIL: Building a SIMPLE prompt for a GRAND OPENING scene.");
            instructionText = `
Write a "Grand Opening" scene for a new chat group called "${currentGroup.name}". The group's topic is "${currentGroup.tags?.join(', ') || 'general discussion'}".

--- SCENE REQUIREMENTS ---
1.  **Host's Welcome:** The host, **${tutor.profileName}**, MUST speak first with a warm, in-character welcome.
2.  **Member Introductions:** Have 2-4 other members introduce themselves briefly, reacting naturally to the host or each other.
3.  **Invite the User:** The VERY LAST message of the scene MUST be from any persona, asking the user a direct question to invite them into the conversation.
4.  **Total Length:** Generate between 4 to 8 messages.

--- GOOD EXAMPLE ---
[Budi]: Selamat datang di "Rumah Nusantara"! I'm Budi. I'm excited to chat with you all about Indonesian culture.
[Dewi]: Hi Budi! I'm Dewi, it's great to be here. I love talking about our food.
[Rizki]: Hey everyone, I'm Rizki. I'm more interested in the history side of things.
[Budi]: That's great, Rizki! We have a lot to cover then.
[Dewi]: What about you? What part of our culture are you most excited to talk about?

--- BAD EXAMPLE (Too short, no user question) ---
[Budi]: Welcome everyone.
`;
    } // <<< ADD THIS CLOSING BRACE TO END THE isGrandOpening BLOCK
} else if (isReEngagement) { // Now this correctly connects to the `if (isGrandOpening)`
    console.log("GIL: Building a natural CONTINUATION prompt for a RE-ENGAGEMENT scene.");
    instructionText = `
The user has just re-joined this chat. Do NOT welcome them back. Instead, create a natural continuation of the last message in the conversation history to make the world feel persistent.

--- SCENE REQUIREMENTS ---
1.  **Direct Continuation:** A new persona (different from the last speaker) must respond directly to the last message in the history as if only a few seconds have passed.
2.  **Keep it Flowing:** The response can be a counter-argument, an agreement with an added thought, or a question related to the last message.
3.  **Total Length:** Generate between 1 to 3 messages to gently restart the conversation.

--- GOOD EXAMPLE ---
Last message in history was "[Lorenzo]: Passion is great, but it doesn't always win you the Scudetto."
YOUR RESPONSE:
[Fabio]: Maybe not, Lorenzo, but it's what makes the game beautiful to watch! I'd rather see a passionate loss than a boring 1-0 win.

--- BAD EXAMPLE (Acknowledges the user's return) ---
[Fabio]: Hey, welcome back! We were just talking about football.
`;
        }

    
    } else {
        // --- PROMPT FOR ONGOING CONVERSATION: "You are a master puppeteer." ---
        // This is our advanced, rule-heavy prompt for when the conversation is already flowing.
        systemPrompt = buildMasterPrompt(currentGroup, members, polyglotHelpers);
        
        if (engineTriggered) {
            // This is for when the user has been idle and the AI needs to talk.
            if (members.length <= 1) {
                // Special case: 1-on-1 idle "prod"
                console.log("GIL: Building a 1-on-1 'USER PROD' prompt because the user is idle.");
                instructionText = `
You are **${tutor.profileName}**. You are in a one-on-one chat with the user. You have already asked them a question, but they have been silent for a while.

Your task is to gently "prod" or "nudge" them for a response without being pushy.

--- SCENE REQUIREMENTS ---
1.  **Acknowledge the Pause:** You can start with a soft re-engagement phrase like "Então...", "So...", "Bueno...", etc.
2.  **Re-ask or Re-phrase:** You can either re-ask the previous question in a slightly different way, or ask a new, simpler follow-up question related to the last topic.
3.  **Keep it Short & Friendly:** This should be a single, short message.
4.  **Output Format:** Your ENTIRE response MUST be a SINGLE line in the format \`[${tutor.profileName}]: message\`.

--- GOOD EXAMPLE (Last message was "what are you interested in?") ---
[Mateus]: Então, alguma ideia? Ou talvez queira que eu sugira um tópico para começarmos?
`;
            } else { 
                // Normal case: Group idle chatter
                console.log("GIL: Building MASTER prompt for an IDLE USER conversation block.");
            instructionText = `
The user has been silent. Generate a realistic "Conversation Block" (3-10 messages) to continue the chat based on the last topic.

--- RULES ---
- The block must be a natural continuation of the last message in the history.
- It should feel like a real, messy group chat. Include agreements, disagreements, short reactions ("lol", "ikr?", "🤔"), and even consecutive messages from one person.
- Involve at least 2-3 different speakers.
- Do NOT mention the user's silence.

--- GOOD EXAMPLE ---
Last message was "[Chiara]: I think Juventus will still be the team to beat."
YOUR RESPONSE:
[Fabio]: No way! Their midfield is too slow this year.
[Lorenzo]: I don't know, Fabio, their experience is a huge advantage.
[Fabio]: Experience doesn't score goals!
[Chiara]: 😂 True, but it saves them.

--- BAD EXAMPLE (Starts a new, unrelated topic) ---
[Fabio]: Speaking of other things, what's everyone's favorite pizza topping?
`;}
} else { // Responding directly to the user
    console.log("GIL: Building MASTER prompt for a direct RESPONSE to the user.");
            instructionText = `
The user has just sent a message. Your task is to generate a realistic, in-character response based on the following logic.

--- RESPONSE LOGIC ---

1.  **Analyze the User's Message:** First, determine if the user is talking to one specific person by name, or making a general statement/question to the group.

2.  **IF the user addresses ONE person** (e.g., "en serio rafa?", "ciao sofia, come stai?"):
    -   That specific person (**Rafa** or **Sofia**) MUST give the reply.
    -   Your output must be a SINGLE line in the format \`[SpeakerName]: message\`.

3.  **IF the user asks a GENERAL question OR makes a statement to the group** (e.g., "di dove siete?", "messi lol"):
    -   Generate a "response block" where 1-4 different members react.
    -   **CRITICAL SUB-RULE:** At least ONE of the speakers in your response block MUST directly acknowledge, react to, or build upon the user's message. This makes the user feel heard.
    -   Other speakers can then react to that first speaker or to the user, creating a natural, flowing group conversation.
    -   The responses should be short and natural.
    -   Your output can be MULTIPLE lines, each in the format \`[SpeakerName]: message\`.

--- GOOD EXAMPLE (Direct Question) ---
User's message: "ciao sofia, come stai?"
YOUR RESPONSE:
[Sofia]: Ciao! Tutto bene, grazie. E tu?

--- GOOD EXAMPLE (General Question) ---
User's message: "di dove siete?"
YOUR RESPONSE:
[Sofia]: Io sono di Roma! La città eterna.
[Giorgio]: Vengo da Milano, il cuore della moda.
[Alessio]: Io invece sono siciliano!

--- GOOD EXAMPLE (User Makes a Statement) ---
History:
...
[João]: Ronaldo from Portugal is an incredible player.
[You]: messi lol
YOUR RESPONSE:
[Roberto]: I respect Messi, but for me, Pelé is still the king. What do you think, Larissa?
[Larissa]: Pelé for sure! His legacy is untouchable.

--- BAD EXAMPLE (Ignoring the User's Statement) ---
History:
...
[João]: Ronaldo from Portugal is an incredible player.
[You]: messi lol
YOUR RESPONSE:
[Roberto]: Speaking of Ronaldo, did you see his goal last week?
[Larissa]: Oh yeah, that was amazing!
`;
}
    }

    // --- FINAL PROMPT ASSEMBLY AND API CALL ---

    const finalPromptInstruction = `
${systemPrompt}

Conversation History (if any):
---
${recentHistoryText || "(No history yet. This is the first message.)"}
${userText ? `\n[You]: ${userText}` : ''} 
---

IMMEDIATE TASK:
You MUST now follow this instruction precisely. This is your only goal.

${instructionText}

FINAL CHECK: Your entire output MUST only be the dialogue in the format [SpeakerName]: message. Do not add any other text, reasoning, or preamble.
`;

    // --- API Call and Rendering Logic (this part should be correct from our last step) ---
  // <<< REPLACE THE ENTIRE try...catch BLOCK WITH THIS >>>
// <<< REPLACE THE try...catch BLOCK in generateAiTextResponse WITH THIS >>>
// <<< REPLACE THE try...catch in generateAiTextResponse WITH THIS SIMPLIFIED VERSION >>>
try {
    // This function now ONLY gets the text and returns the lines.
    const rawResponse = await aiService.generateTextMessage(finalPromptInstruction, tutor!, [], 'openrouter');
    
    if (typeof rawResponse !== 'string' || !rawResponse) {
        throw new Error("AI service returned empty or invalid response.");
    }
    
    console.log(`[Scene Getter] Raw Conversation Block from AI:\n${rawResponse}`);
    return rawResponse.split('\n').filter(line => line.trim() !== '');
} catch (error) {
    console.error("GIL (Hybrid): Error getting conversation block from AI:", error);
    return []; // <<< FIX: Return an empty array on failure
}
}
// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================
// ===================  END: PASTE THIS ENTIRE BLOCK  ===================
    /**
     * Generates a response when a user sends an image. This is a multi-stage process.
     */
  // <<< REPLACE WITH THIS CORRECTED SIGNATURE >>>
async function generateAiImageResponse(members: Connector[], imageBase64Data: string, imageMimeType: string, userCaption: string): Promise<boolean> {
        if (!conversationFlowActive) return false;
    
        console.log("GIL (Hybrid): generateAiImageResponse called. Will first determine the best speaker.");
        const { groupDataManager, polyglotHelpers, aiService, groupUiHandler, activityManager } = getDeps();
        
        // This variable is declared here to be accessible throughout the function scope.
        let personaToSpeak: Connector | undefined;
        
        try {
            // --- STAGE 1: CHOOSE THE BEST SPEAKER ---
            // --- STAGE 1: CHOOSE THE BEST SPEAKER ---
    const currentGroup = groupDataManager.getCurrentGroupData()!;
    const memberProfiles = members.map(m => `- ${m.profileName}: Primarily interested in ${polyglotHelpers.formatReadableList(m.interests, 'and')}.`).join('\n'); 
            const speakerChoicePrompt = `Based on the content of the attached image and the following member profiles, who is the MOST qualified or likely person to comment on it?

Group Members:
${memberProfiles}
User's caption with the image: "${userCaption || 'none'}"
Your task: Respond with ONLY the name of the best person to speak next. Do not provide any other text or explanation.`;
            
            // Use a fast, cheap model for this routing task
            const speakerNameResponse = await aiService.generateTextFromImageAndText(
                imageBase64Data, imageMimeType, members[0], [], speakerChoicePrompt, 'groq'
            );
    
            if (!speakerNameResponse || typeof speakerNameResponse !== 'string') {
                throw new Error("Speaker choice AI returned no response.");
            }
            
            const chosenSpeakerName = speakerNameResponse.trim();
            personaToSpeak = members.find(m => m.profileName === chosenSpeakerName);
            
            if (!personaToSpeak) {
                console.warn(`GIL: Speaker choice AI chose '${chosenSpeakerName}', who is not in the group. Defaulting to tutor.`);
                personaToSpeak = members.find(m => m.id === tutor!.id) || members[0];
            }
            
            if (!personaToSpeak) {
                throw new Error("Could not determine a speaker, even after fallback to tutor.");
            }
            
            console.log(`GIL (Hybrid): Speaker Choice AI selected: ${personaToSpeak.profileName}`);
            
            // --- STAGE 2: GENERATE THE RESPONSE FOR THE CHOSEN SPEAKER ---
            activityManager.simulateAiTyping(tutor!.id, 'group'); // The tutor still "hosts" the typing indicator
            
            const imagePrompt = `You are ${personaToSpeak.profileName}. A user in the group chat has shared an image. Your interests are [${personaToSpeak.interests?.join(', ') || 'general topics'}].

Your response MUST have two parts.
Part 1: Your Conversational Comment (as ${personaToSpeak.profileName}):
Rule: Your comment MUST reflect your personality and interests.
If you are an expert (e.g., a football fan seeing a football photo): Make a knowledgeable comment. You can identify players or teams if you recognize them.
If you are NOT an expert (e.g., a chef seeing a physics diagram): Express curious confusion or ask a basic question. It's okay to say "I have no idea what this is, but it looks cool!"
Acknowledge the user's caption ("${userCaption || 'none'}") naturally.
This conversational part MUST come FIRST.

Part 2: The Semantic Description for your teammates (CRITICAL):
After your comment, you MUST include a special section formatted EXACTLY like this:
[IMAGE_DESCRIPTION_START]
A highly detailed, factual, and objective description of the image's visual content. Your goal is to paint a picture with words for someone who cannot see the image.
Composition: Describe the main subject and its position (e.g., "A close-up of a person's face in the center," "A wide shot of a landscape with a mountain on the left").
Colors & Lighting: Mention the dominant colors and the lighting style (e.g., "The image has a warm, golden-hour glow," "Dominated by cool blues and grays," "Bright, direct sunlight creating harsh shadows").
Key Objects & Scenery: List all significant objects, people, and background elements. Be specific (e.g., "a wooden table with a half-empty coffee mug," "a bustling city street at night with neon signs").
Recognizable Entities: If you recognize a famous person (e.g., Cristiano Ronaldo), a team (e.g., Real Madrid), or a landmark (e.g., the Colosseum in Rome), you MUST state their name.
Unrecognized People/Sports: If you see a person you don't recognize, describe their appearance and clothing in detail (e.g., "a person with short brown hair wearing a blue jacket," "a basketball player in a purple and gold jersey with the number 24").
Visible Text: If there is any visible text, no matter how small, transcribe it accurately.
[IMAGE_DESCRIPTION_END]
FINAL RULE: Do not add any other text, reasoning, or preamble before or after your formatted response.`;

            // Use a powerful vision model for the detailed analysis
            const rawResponse = await aiService.generateTextFromImageAndText(
                imageBase64Data, imageMimeType, personaToSpeak, [], imagePrompt, 'together'
            );
            
            activityManager.clearAiTypingIndicator(tutor!.id, 'group');
    
            if (typeof rawResponse !== 'string' || !rawResponse) throw new Error("Main AI returned empty response for image.");
    
            let conversationalReply: string | null = null;
            let extractedImageDescription: string | undefined = undefined;
    
            const descStartTag = "[IMAGE_DESCRIPTION_START]";
            const descEndTag = "[IMAGE_DESCRIPTION_END]";
            const startIndex = rawResponse.indexOf(descStartTag);
            const endIndex = rawResponse.indexOf(descEndTag);
    
            if (startIndex !== -1 && endIndex > startIndex) {
                extractedImageDescription = rawResponse.substring(startIndex + descStartTag.length, endIndex).trim();
                conversationalReply = rawResponse.substring(0, startIndex).trim();
            } else {
                conversationalReply = rawResponse.trim();
                 console.warn("GIL (Hybrid): Image response did not contain semantic description tags. Using whole response as comment.");
            }
    
            if (conversationalReply) {
                lastMessageTimestamp = Date.now(); // <-- ADD THIS LINE
                const historyItem: GroupChatHistoryItem = {
                    speakerId: personaToSpeak.id,
                    speakerName: personaToSpeak.profileName,
                    text: conversationalReply,
                    timestamp: Date.now(),
                    imageSemanticDescription: extractedImageDescription 
                };
                groupDataManager.addMessageToCurrentGroupHistory(historyItem);
                groupDataManager.saveCurrentGroupChatHistory(true);
                groupUiHandler.appendMessageToGroupLog(conversationalReply, personaToSpeak.profileName, false, personaToSpeak.id);
            } else {
                throw new Error("Could not parse a conversational reply from the AI's image response.");
            }
            return true; // <<< ADD THIS LINE
        } catch (error) {
            console.error("GIL (Hybrid): Error during multi-stage AI image response generation:", error);
            activityManager.clearAiTypingIndicator(tutor!.id, 'group');
            const speaker = personaToSpeak || tutor;
            groupUiHandler.appendMessageToGroupLog("(I had a little trouble seeing that image, sorry!)", speaker!.profileName, false, speaker!.id);
            return false; // <<< ADD THIS LINE
        }
        return false; // Final fallback return to satisfy TypeScript
    }

// ADD THIS ENTIRE NEW FUNCTION
/**
 * The "Conversation Engine". This loop periodically checks if an AI should speak,
 * creating a living, independent conversation.
 */
// In src/js/core/group_interaction_logic.ts
// REPLACE THE ENTIRE conversationEngineLoop FUNCTION


// In src/js/core/group_interaction_logic.ts
// ADD THIS ENTIRE NEW HELPER FUNCTION

/**
 * Returns a list of "impatient" or "self-conscious" phrases
 * in the appropriate language for the group.
 * @param groupLanguage - The primary language of the group chat.
 * @returns An array of translated, natural-sounding phrases.
 */
function getImpatientPhrases(groupLanguage: string): string[] {
    const lang = groupLanguage.toLowerCase();

    if (lang.includes('spanish')) {
        return [
            "¿Hay alguien ahí? jajaja",
            "¿Hola? ¿Siguen ahí?",
            "¿Se me cayó el internet o todos se quedaron callados? jaja",
            "Ok, esto se está poniendo un poco incómodo...",
            "Bueno, parece que estoy solo/a por aquí, ¿no? lol"
        ];
    }
    if (lang.includes('french')) {
        return [
            "Il y a quelqu'un ? lol",
            "Allô ? Toujours là ?",
            "C'est ma connexion qui a lâché ou tout le monde est devenu silencieux ? haha",
            "Ok, ça devient un peu gênant...",
            "Je suppose qu'il n'y a que moi, alors ? lol"
        ];
    }
    if (lang.includes('german')) {
        return [
            "Ist hier jemand? lol",
            "Hallo? Noch da?",
            "Ist mein Internet abgestürzt oder sind alle nur still? haha",
            "Okay, das wird langsam etwas unangenehm...",
            "Scheint, als wäre nur ich hier, was? lol"
        ];
    }
    if (lang.includes('portuguese')) {
        return [
            "Tem alguém aí? kkkk",
            "Alô? Ainda estão aí?",
            "Minha internet caiu ou todo mundo ficou quieto? haha",
            "Ok, isto está a ficar um bocado estranho...",
            "Acho que sou só eu aqui, então? lol"
        ];
    }
    if (lang.includes('italian')) {
        return [
            "C'è nessuno? ahah",
            "Pronto? Siete ancora lì?",
            "Mi è caduta la connessione o siete tutti silenziosi? haha",
            "Ok, la situazione sta diventando un po' imbarazzante...",
            "Immagino di essere l'unico qui, allora? lol"
        ];
    }
    // Indonesian phrases
[
    "Ada orang di sini? wkwk",
    "Halo? Masih di sana?",
    "Internет saya mati atau semuanya lagi diam aja nih? haha",
    "Oke, jadi agak canggung ya...",
    "Kayaknya cuma saya aja di sini? lol"
]
    // ... add other languages as needed ...

    // Default to English if no specific language is matched
    return [
        "Is anybody here? lol",
        "Hello? Still there?",
        "Did my internet die or is everyone just quiet? haha",
        "Okay, this is getting a little awkward...",
        "Guess it's just me then? lol"
    ];
}


function startCooldownWithLogging(targetCooldownMs: number) {
    // Clear any previous loop timer to be safe.
    if (conversationLoopId) {
        clearTimeout(conversationLoopId);
    }
    
    const LOG_INTERVAL_1 = 10000; // 10 seconds before trigger
    const LOG_INTERVAL_2 = 5000;  // 5 seconds before trigger

    // Calculate the initial wait time. It's the total cooldown minus the first log interval.
    // Ensure it's not negative if the total cooldown is less than 10s.
    const initialWait = Math.max(0, targetCooldownMs - LOG_INTERVAL_1);

    console.log(`%cGIL Engine: Cooldown started. Next AI activity in ${(targetCooldownMs / 1000).toFixed(1)} seconds.`, 'color: #6c757d; font-style: italic;');

    conversationLoopId = setTimeout(() => {
        // After the initial wait, we're 10 seconds away from the trigger.
        console.log(`%cGIL Engine: ...10 seconds until next AI activity...`, 'color: #6c757d; font-style: italic;');
        
        // Set the next timer for the remaining 5 seconds.
        conversationLoopId = setTimeout(() => {
            // We're now 5 seconds away.
            console.log(`%cGIL Engine: ...5 seconds until next AI activity...`, 'color: #6c757d; font-style: italic;');

            // Set the final timer to trigger the engine loop.
            conversationLoopId = setTimeout(() => {
                conversationEngineLoop(); // Call the main loop to generate a scene
            }, LOG_INTERVAL_2); // Wait the final 5 seconds

        }, LOG_INTERVAL_1 - LOG_INTERVAL_2); // Wait another 5 seconds (10s - 5s)

    }, initialWait);
}

// in group_interaction_logic.ts

function setEngineTimeoutWithLogs(callback: () => void, totalDelayMs: number) {
    // START: BUG FIX - ALWAYS CLEAR THE PREVIOUS TIMER CHAIN
    if (conversationLoopId) {
        clearTimeout(conversationLoopId);
    }
    // END: BUG FIX

    const LOG_INTERVAL = 10000; // Log every 10 seconds

    console.log(`%cGIL Engine: New timer set. Next AI activity in ${(totalDelayMs / 1000).toFixed(1)} seconds.`, 'color: #6c757d; font-style: italic;');

    const scheduleNextLog = (remainingTime: number) => {
        if (remainingTime <= LOG_INTERVAL) {
            conversationLoopId = setTimeout(callback, remainingTime);
            return;
        }

        conversationLoopId = setTimeout(() => {
            const newRemainingTime = remainingTime - LOG_INTERVAL;
            console.log(`%cGIL Engine: T-minus ${(newRemainingTime / 1000).toFixed(0)} seconds...`, 'color: #6c757d; font-style: italic;');
            scheduleNextLog(newRemainingTime);
        }, LOG_INTERVAL);
    };

    scheduleNextLog(totalDelayMs);
}

// =================== START: REPLACE THE ENTIRE FUNCTION ===================

async function conversationEngineLoop(forceImmediateGeneration: boolean = false, isFirstRunAfterJoin: boolean = false): Promise<void> {
   
     // --- NEW: BUSY CHECK ---
     if (isRenderingScene) {
        console.log("GIL Engine: Aborting loop start because a scene is already rendering.");
        return; // Exit immediately if the renderer is active
    }
   
    if (!conversationFlowActive) {
        if (conversationLoopId) clearTimeout(conversationLoopId);
        return;
    }

    const { groupDataManager, activityManager, } = getDeps();
    if (!tutor) {
        return;
    }
    
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTimestamp;
    
    // We generate if it's the first run (re-engagement) OR if it's a regular idle timeout.
    const shouldGenerate = isFirstRunAfterJoin || (timeSinceLastMessage > 25000 && !hasProddedSinceUserSpoke);

    if (shouldGenerate) {
        console.log(`GIL Engine: Triggering scene generation. Forced: ${forceImmediateGeneration}, FirstRun: ${isFirstRunAfterJoin}`);
        if (!isFirstRunAfterJoin) { // Only prod if it's a true idle timeout
             hasProddedSinceUserSpoke = true;
        }

        activityManager.simulateAiTyping(tutor.id, 'group');
        
        const history = groupDataManager.getLoadedChatHistory();
        const isGrandOpening = history.length === 0 && (forceImmediateGeneration || isFirstRunAfterJoin);
        // THIS IS THE KEY FIX: Re-engagement is now triggered by the first run, not by forcing.
        const isReEngagement = history.length > 0 && isFirstRunAfterJoin; 
        
        const sceneLines = await generateAiTextResponse(
            !isFirstRunAfterJoin, // It's an "engine trigger" if it's NOT the first run.
            isGrandOpening,
            isReEngagement
        );

        activityManager.clearAiTypingIndicator(tutor.id, 'group');
        
        if (sceneLines.length > 0) {
            console.log(`GIL Engine: Got a scene with ${sceneLines.length} lines. Handing off to renderer.`);
            await renderScene(sceneLines);
            
            // BUG FIX: Save the history only AFTER the entire scene has been rendered.
            groupDataManager.saveCurrentGroupChatHistory(true);
            
            console.log("GIL Engine: Scene rendering and history saving complete.");
        } else {
            console.warn("GIL Engine: AI returned an empty scene script.");
        }

        const nextCheckDelay = 10000 + Math.random() * 5000; // 10-15 seconds
        // This is the pause *after* the AI has spoken. It's waiting for the user to reply.
        console.log(`%cGIL Engine: AI has spoken. Waiting for user reply or idle timeout in ${(nextCheckDelay / 1000).toFixed(1)}s.`, 'color: #17a2b8; font-style: italic;');
        setEngineTimeoutWithLogs(() => conversationEngineLoop(false, false), nextCheckDelay);
        
        return; 
    }

    // Fallback timer if we didn't generate.
    const standardCheckDelay = 20000 + Math.random() * 5000;
    // The user hasn't been idle long enough for the AI to speak. It will check again.
    console.log(`%cGIL Engine: "Hmm, user's still quiet. It hasn't been long enough for me to jump in. I'll check again in ~${(standardCheckDelay / 1000).toFixed(0)}s."`, 'color: #6c757d; font-style: italic;');
    setEngineTimeoutWithLogs(() => conversationEngineLoop(false, false), standardCheckDelay);
}

// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================
    // --- PUBLIC INTERFACE (ADAPTED TO MATCH OLD `GroupInteractionLogic`) ---
// <<< REPLACE THE ENTILE BLOCK WITH THIS CORRECTED STRUCTURE >>>

// --- PUBLIC INTERFACE (ADAPTED TO MATCH OLD `GroupInteractionLogic`) ---



// =================== START: PASTE THIS ENTIRE BLOCK ===================
// =================== START: REPLACE THE ENTIRE OBJECT ===================

const groupInteractionLogic = {
    initialize: (groupMembers: Connector[], groupTutor: Connector): void => {
        members = groupMembers;
        tutor = groupTutor;
        conversationFlowActive = false;
        hasProddedSinceUserSpoke = false;
        currentSceneCancellationToken = null;
        if (conversationLoopId) {
            clearTimeout(conversationLoopId);
            conversationLoopId = null;
        }
    },

    startConversationFlow: (): void => {
        console.log("GIL (Hybrid): Conversation flow STARTED.");
        conversationFlowActive = true;
        if (conversationLoopId) clearTimeout(conversationLoopId);
        // We are now telling the engine this is the first run after joining.
        conversationEngineLoop(false, true);
    },

    stopConversationFlow: (): void => {
        console.log("GIL (Hybrid): Conversation flow STOPPED.");
        conversationFlowActive = false;
        if (conversationLoopId) {
            clearTimeout(conversationLoopId);
            conversationLoopId = null;
        }
        if (currentSceneCancellationToken) {
            currentSceneCancellationToken.isCancelled = true;
            currentSceneCancellationToken = null;
        }
    },

    reset: (): void => {
        console.log("GIL (Hybrid): State reset.");
        members = [];
        tutor = null;
        conversationFlowActive = false;
        hasProddedSinceUserSpoke = false;
        if (conversationLoopId) {
            clearTimeout(conversationLoopId);
            conversationLoopId = null;
        }
        if (currentSceneCancellationToken) {
            currentSceneCancellationToken.isCancelled = true;
            currentSceneCancellationToken = null;
        }
    },

    // --- THIS IS THE CORRECTED handleUserMessage SIGNATURE ---
    handleUserMessage: async (text: string | undefined, options?: {
        userSentImage?: boolean;
        imageBase64Data?: string;
        imageMimeType?: string;
    }): Promise<void> => {
        console.log("GIL: User message received. Cancelling any active scene rendering.");
        
        const { groupDataManager } = getDeps(); // Get dependencies early

        const wasSceneCancelled = !!currentSceneCancellationToken;
        if (currentSceneCancellationToken) {
            currentSceneCancellationToken.isCancelled = true;
            currentSceneCancellationToken = null;
        }

        if (conversationLoopId) {
            clearTimeout(conversationLoopId);
            conversationLoopId = null;
            console.log("GIL: Cleared scheduled conversation engine loop due to user activity.");
        }

        if (wasSceneCancelled) {
            groupDataManager.saveCurrentGroupChatHistory(true);
            console.log("GIL: Saved partial scene history due to user interruption.");
        }

        lastMessageTimestamp = Date.now();
        hasProddedSinceUserSpoke = false;
        if (!conversationFlowActive) return;

        const userMessageText = text?.trim() || "";

        // --- NEW: MEMORY EXTRACTION STEP ---
      const convoStore = window.convoStore;
    const userSummary = convoStore?.getGlobalUserProfile();
    const userSummarySection = userSummary 
        ? `\n# SECTION 1: KNOWN FACTS ABOUT THE USER ('You')\n${userSummary}\n---` 
        : "";
        // --- END: MEMORY EXTRACTION STEP ---


        if (!userMessageText && !options?.userSentImage) {
             conversationEngineLoop(false, false);
             return;
        }
        
        const responseLines = await generateAiTextResponse(false, false, false, undefined);
        
        if (responseLines.length > 0) {
            await renderScene(responseLines);
        }
        
        console.log("GIL: User interaction complete. Restarting idle check engine.");
        conversationEngineLoop(false, false);
    },

    setAwaitingUserFirstIntroduction: (isAwaiting: boolean): void => { 
        isAwaitingUserFirstIntro = isAwaiting; 
    }
};

// ===================  END: REPLACE THE ENTIRE OBJECT  ===================

window.groupInteractionLogic = groupInteractionLogic;
document.dispatchEvent(new CustomEvent('groupInteractionLogicReady'));
console.log('group_interaction_logic.ts: (Hybrid V2) Ready event dispatched.');
})();