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
import { SEPARATION_KEYWORDS } from '../constants/separate_text_keywords.js';
import { DOTTED_EXCEPTIONS } from '../constants/separate_text_keywords.js';
// In src/js/core/group_interaction_logic.ts

// REPLACE THIS:
// import { getCoreIdentityPrompt, getPersonalityAndBehaviorPrompt } from './persona_prompt_parts.js';

// WITH THIS:
import { getGroupPersonaSummary } from './persona_prompt_parts.js';
import { auth } from '../firebase-config.js';
// Add this line

console.log('group_interaction_logic.ts: (Hybrid V2) Script loaded.');

(function () {
    'use strict';

    // --- EVERYTHING MUST BE INSIDE THIS IIFE ---

    // --- MODULE-LEVEL STATE (SHARED BY ALL FUNCTIONS BELOW) ---
   // --- MODULE-LEVEL STATE (SHARED BY ALL FUNCTIONS BELOW) ---
// Replace with this
let members: Connector[] = [];
let tutor: Connector | null = null;
let isAwaitingUserFirstIntro: boolean = false;
let conversationFlowActive: boolean = false;
let conversationLoopId: ReturnType<typeof setTimeout> | null = null;
let lastMessageTimestamp: number = 0;
let hasProddedSinceUserSpoke: boolean = false;
let isRenderingScene: boolean = false; // <<< ADD THIS LINE
let currentSceneCancellationToken: { isCancelled: boolean } | null = null; // <<< ADD THIS LINE
let currentTypingIndicator: { speakerId: string | undefined; element: HTMLElement | null | void } | null = null; // <<< ADD THIS LINE

// ADD THIS CODE

const activeGroupAiOperation = new Map<string, AbortController>();

/**
 * Interrupts any ongoing AI generation for the active group and prepares a new AbortController.
 * This is the core of the responsive cancellation feature for group chats.
 * @param groupId The ID of the currently active group.
 * @returns A new AbortController for the upcoming AI operation.
 */
function interruptAndTrackGroupOperation(groupId: string): AbortController {
    if (activeGroupAiOperation.has(groupId)) {
        console.log(`%c[Group Interrupt] User sent new message. Cancelling previous AI request for group ${groupId}.`, 'color: #ff6347; font-weight: bold;');
        const existingController = activeGroupAiOperation.get(groupId);
        existingController?.abort();
    }
    const newController = new AbortController();
    activeGroupAiOperation.set(groupId, newController);
    return newController;
}

// --- DEPENDENCY GETTER ---
  // REPLACE WITH THIS BLOCK:
// Replace with this block
const getDeps = () => ({
    polyglotHelpers: window.polyglotHelpers!,
    groupDataManager: window.groupDataManager!,
    groupUiHandler: window.groupUiHandler!,
    activityManager: window.activityManager!,
    aiService: window.aiService!,
    aiApiConstants: window.aiApiConstants!,
    uiUpdater: window.uiUpdater!,
    chatOrchestrator: window.chatOrchestrator!,
    tutor: tutor,
    // ADD THESE TWO FOR THE FREEMIUM MODAL
    modalHandler: window.modalHandler!,
    domElements: window.domElements!
});



// PASTE THIS ENTIRE NEW HELPER FUNCTION:
/**
 * Generates ONLY the tutor's initial welcome message for a new group.
 * @returns A single-element array with the tutor's message, or null.
 */
async function generateTutorWelcome(group: Group, tutor: Connector): Promise<string[] | null> {
    console.log(`%c[Tutor Welcome] Generating dedicated welcome message from ${tutor.profileName}.`, 'color: #fd7e14;');
    const { aiService } = getDeps();
    
    const welcomePrompt = `
    You are ${tutor.profileName}, the host/tutor of a new group chat called "${group.name}".
    Your ONLY task is to write a single, warm, welcoming message to the group.
    - Greet everyone.
    - State the group's name.
    - Briefly mention its purpose (e.g., "to discuss Italian culture").
    - Keep it to one or two sentences.
    - Your ENTIRE response MUST be in the format: [${tutor.profileName}]: message

    --- EXAMPLE ---
    [Giorgio]: Ciao a tutti e benvenuti al "Circolo di Dante"! Sono emozionato di condividere con voi la mia passione per la cultura italiana! 🇮🇹
    `;

    try {
        // Use a fast model for this simple task
        const response = await aiService.generateTextMessage(welcomePrompt, tutor, [], 'groq');
        if (response && typeof response === 'string' && response.startsWith(`[${tutor.profileName}]`)) {
            console.log(`[Tutor Welcome] Success. Message: ${response}`);
            return [response];
        }
        console.warn(`[Tutor Welcome] Failed to generate a valid welcome message.`);
        return null;
    } catch (error) {
        console.error(`[Tutor Welcome] Error generating welcome message:`, error);
        return null;
    }
}
// PASTE THIS ENTIRE NEW HELPER FUNCTION:
/**
 * Generates a personal, one-on-one welcome message from the tutor to the user.
 * @returns A single-element array with the tutor's message, or null.
 */
async function generateOneOnOneWelcome(group: Group, tutor: Connector): Promise<string[] | null> {
    console.log(`%c[1-on-1 Welcome] Generating dedicated 1-on-1 welcome from ${tutor.profileName}.`, 'color: #6610f2;');
    const { aiService } = getDeps();

    const oneOnOnePrompt = `
    You are the host, **${tutor.profileName}**. You've just started a new chat group called "${group.name}", but so far, only one other person has joined: the user.
    Your task is to write a warm, personal welcome message directly to the user.
    --- SCENE REQUIREMENTS ---
    1.  Acknowledge the Situation: Start by welcoming the user personally. It's just the two of you for now.
    2.  State Your Role: Briefly mention you are the host/tutor for the group.
    3.  Direct Question: End your message by asking the user a direct, open-ended question to start the conversation. This is the most important part.
    4.  Output Format: Your ENTIRE response MUST be a SINGLE line in the format \`[${tutor.profileName}]: message\`.
    --- GOOD EXAMPLE ---
    [Mateus]: Olá! Bem-vindo ao "Exploradores de Portugal". Por enquanto, somos só nós os dois. Eu sou o Mateus, o teu guia por aqui. Para começar, o que despertou o teu interesse em Portugal?
    `;

    try {
        const response = await aiService.generateTextMessage(oneOnOnePrompt, tutor, [], 'groq');
        if (response && typeof response === 'string' && response.startsWith(`[${tutor.profileName}]`)) {
            console.log(`[1-on-1 Welcome] Success. Message: ${response}`);
            return [response];
        }
        return null;
    } catch (error) {
        console.error(`[1-on-1 Welcome] Error generating welcome message:`, error);
        return null;
    }
}

 
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
         const substanceMandate = `
       ### Core Mandates for All Members:
- **SUBSTANCE MANDATE (NO "ALL AGREE"):** Your dialogue MUST be grounded in plausible real-world knowledge. When discussing topics like culture, politics, or community projects, reference specific, real-world examples, names, events, companies, social issues, places, artworks, films, or policies from your training data. Avoid generic, empty statements.
- **HAVE STRONG, DIVERSE OPINIONS:** Characters should have distinct, sometimes conflicting, viewpoints based on their persona. One can be an idealist, another a pragmatist, another a cynic. They should be willing to engage in friendly (or even heated) debate.
- **CREATE REAL DEBATE:** Challenge each other's points with counter-arguments, clarifying questions ("How would we fund that?"), and real-world examples ("That sounds like the initiative in Lyon, but they had issues with...").
- **LIMITED KNOWLEDGE & CURIOSITY:** If a topic is outside your persona's expertise, express that! Say "I'm not familiar with that, what is it?" or "Oh, you work at the university? What's your department?". This creates natural conversation threads.
-**LANGUAGE USE** Use the language of the groups main language, only use English terms if it is a part of your Chat Personality.
`;

const moderatorRules = moderator ? `\n### Persona Directives for ${moderator.profileName} (Moderator):\n- **Core Role:** You are the hangout's moderator. Keep the conversation flowing and ensure everyone gets a chance to speak.\n- **Behavior:** If a debate gets too heated, gently steer it to a new angle. If the chat goes silent, bring up a new, thought-provoking question related to ${hangoutTopic}.` : '';
  
const memberRules = groupMembers.filter(m => m.id !== group.tutorId).map(member => `\n### Persona Directives for ${member.profileName} (Member):\n- **Core Role:** Chat with friends about ${hangoutTopic}.\n- **Behavior:** Share opinions, ask questions, and use slang/emojis that fit your persona. Don't just agree; if you have a different take, share it.`).join('');

return `# SECTION 2: SPECIALIZED RULES - COMMUNITY HANGOUT (Topic: ${hangoutTopic.toUpperCase()})\n**OVERALL OBJECTIVE:** Simulate a lively, authentic, and substantive online discussion.\n${substanceMandate}\n${moderatorRules}${memberRules}`;
   
   
    }

    function buildSportsClubRules(groupMembers: Connector[], group: Group): string {
        const sportsTopic = group.tags?.join(', ') || 'our team';
        return `# SECTION 2: SPECIALIZED RULES - SPORTS CLUB (Topic: ${sportsTopic.toUpperCase()})\n**OVERALL OBJECTIVE:** Simulate a passionate, knowledgeable, and lively chat for sports fans.
        
- **BE SPECIFIC & KNOWLEDGEABLE:** Reference real-world players, matches, transfers, tactics, managers, and famous seasons from your training data. Sound like you actually watch the games.
- **HAVE STRONG, BIASED OPINIONS:** This is critical. Characters MUST have fan-like biases and allegiances. A Real Madrid fan should praise their own players and be skeptical of Barcelona's. An Atlético fan should value defense and grit.
- **CREATE REAL DEBATE & BANTER:** Challenge each other's points with counter-examples, "what about..." questions, and friendly teasing (banter). It's a fan chat, not a press conference.
- **ACKNOWLEDGE RIVALS:** If a user or another character mentions a rival team, react to it! Don't ignore it. A little trash talk is realistic.
- **NO EMPTY PHRASES:** Do not use generic filler like "Passion is key." Every message should add a specific point to the debate.

`;
        
        
        
 
 
 
 
    }

    // --- MASTER PROMPT BUILDER ---

    async function buildMasterPrompt(group: Group, groupMembers: Connector[], helpers: PolyglotHelpersOnWindow): Promise<string> {
        const memberList = helpers.formatReadableList(groupMembers.map(m => m.profileName), "and");
        
        // --- THIS IS THE FIX: Build a comprehensive memory packet for the group ---
        let combinedMemoryPacket = "// CEREBRUM MEMORY PACKET (GROUP)\n";

        // Start the console group unconditionally
        console.groupCollapsed(`%c[CEREBRUM_GROUP_INJECT] 🧠 Retrieving memory packets for all ${groupMembers.length} group members...`, 'color: #6610f2; font-weight: bold;');
        
        for (const member of groupMembers) {
            // --- THIS IS THE FIX ---
            // Check for memoryService right before we use it.
            if (window.memoryService && typeof window.memoryService.getMemoryForPrompt === 'function') {
                const memoryResponse = await window.memoryService.getMemoryForPrompt(member.id);
                
                if (memoryResponse.facts.length > 0) {
                    console.log(`%c[Limbic System] Thalamus recalled ${memoryResponse.facts.length} memory fact(s) for group member [${member.profileName}]:`, 'color: #17a2b8; font-weight: bold;');
                    console.table(memoryResponse.facts.map((fact) => ({
                        key: fact.key,
                        value: fact.value,
                        type: fact.type,
                        confidence: fact.initialConfidence.toFixed(2),
                        source: fact.source_context
                    })));
                    if (memoryResponse.prompt && !memoryResponse.prompt.includes("No relevant memories")) {
                        combinedMemoryPacket += `// Memories recalled for ${member.profileName}:\n${memoryResponse.prompt}\n\n`;
                    }
                } else {
                    console.log(`%c[Limbic System] No relevant memories recalled by Thalamus for [${member.profileName}].`, 'color: #6c757d;');
                }
            } else {
                // Log if the memory service isn't available, to avoid silent failures
                console.warn(`[CEREBRUM_GROUP_INJECT] Memory service not available for member [${member.profileName}].`);
            }
        }
        
        console.groupEnd(); // Close the console group
// ===================  END: REPLACEMENT 1  ===================
        
        const memorySection = `
    # SECTION 0: CEREBRUM MEMORY PACKET (Your Group's Shared Long-Term Memory)
    This contains facts you have learned about the user. You MUST refer to it to create a continuous, personal conversation.
    MEMORY INTERPRETATION RULES:
    user.key: A fact about the user. Example: user.userName = "Alex".
    [persona_id]: A private fact only that persona and the user share.
    confidence=X.XX: How certain you are of a memory. Low confidence means you should be hesitant (e.g., "I think you mentioned...?").
    --- MEMORY START ---
    ${combinedMemoryPacket.trim()}
    --- MEMORY END ---
    `;
      
   // --- NEW: Get User Profile Summary ---
   const convoStore = window.convoStore;
   const groupConvoRecord = convoStore?.getConversationById(group.id);
   const userSummary = groupConvoRecord?.userProfileSummary;
   const userSummarySection = userSummary 
       ? `\n# SECTION 1: KNOWN FACTS ABOUT THE USER ('You')\n${userSummary}\n---` 
       : "";
      
      
      
       const groupHost = groupMembers.find(m => m.id === group.tutorId) || groupMembers[0];
       let timeContextRule = '';
       if (groupHost && groupHost.activeTimezone) {
           const { localTime, localDate, dayOfWeek } = helpers.getPersonaLocalTimeDetails(groupHost.activeTimezone);
           timeContextRule = `
**RULE 0.6: THE TIME AND CONTEXT AWARENESS MANDATE:**
- **The Group's Current Time:** It is currently **${localTime} on ${dayOfWeek}, ${localDate}** in the group's primary location.
- **Your Awareness:** All characters are aware of this date and what it might signify (a weekend, a public holiday, the middle of the night).
- **Your Task:** Your conversation and mood MUST naturally reflect this context. For example, on a major holiday, someone might mention festive plans. On a Monday morning, someone might complain about school or work. This makes the chat feel real and grounded in time.
`;
       }
        const masterRules = `# SECTION 0: MASTER DIRECTIVE - GROUP CHAT SIMULATION...
        **YOUR PRIMARY GOAL:** You are a master AI puppeteer... controlling: ${memberList}.
       **RULE 0.1: THE UNBREAKABLE OUTPUT FORMAT:** This is the most important rule and you must never violate it. Your ENTIRE response MUST STRICTLY and ONLY be in the format \`[SpeakerName]: message\`.
- DO NOT include any preamble, reasoning, apologies, or self-correction.
- DO NOT write "I will now select..." or "As a language model...".
- Your output must begin with \`[\` and end after the message. Any text outside this format will cause a system failure.
        **RULE 0.2: THE SPEAKER SELECTION LOGIC:**
            - **CRITICAL SUB-RULE (HIGHEST PRIORITY): Handle Direct Questions.** If the last message was a direct question to a specific persona by name (e.g., "Anja, what do you think?"), that persona **MUST** be the next speaker and **MUST** answer the question directly. Do not have another persona interrupt.
            - **General Flow:** If no specific persona was addressed, you may then apply your general logic to intelligently decide which persona should speak next.
       
       
       **RULE 0.3: HUMAN DIALOGUE STYLE:**
- **Short Messages:** Keep messages concise, like real chat messages.
- **CRITICAL** — Use Multiple Message Bubbles (2–3 in a row) from the Same Speaker to Simulate Real Thinking and Pacing:
This is essential for achieving believable, human-like chat dialogue. People often split their thoughts across messages, pause mid-conversation, or add emotional filler. Writers must reflect that by letting characters send short, staggered messages in succession. These should vary in tone and structure:

✅ Good Examples:

[Rico]: Wait.
[Rico]: Are you saying we lost the file??

[Sam]: Okay...
[Sam]: That’s kind of messed up.

[Luis]: I love that.
[Luis]: Seriously.
[Luis]: Like, so much.

❌ Avoid combining these into one message. The pause between bubbles creates realism—people type fast, revise, or react emotionally in real time. This technique adds rhythm, humanity, and authenticity. It’s not optional—it’s foundational.
Avoid cramming these into one long message; the pacing and rhythm created by split messages is crucial to emotional realism and engagement."
- **Lurkers are okay:** Not everyone needs to speak in every exchange. A natural conversation involves 2-4 active people while others stay silent.
- **Use Emojis & Slang:** Use emojis, slang (lol, ikr), and typos where appropriate for the persona.




        **RULE 0.4: THE FINAL OUTPUT VALIDATION:** Before you output, validate it against RULE 0.1.


        RULE 0.5: THE REALITY GROUNDING MANDATE: You MUST ground all specific statements in plausible reality based on your training data. DO NOT invent fictional people, places, statistics, social issues, artworks, films, books, or events. Your dialogue should feel like it's coming from people who live in the real world. Opinions are encouraged, but they must be about real things.
--- BAD EXAMPLE (Fictional Invention): ---
[Santi]: That reminds me of the fictional player, Ricardo "El Fantasma" Vargas, who played for the made-up team Real Cóndores CF.
--- GOOD EXAMPLE (Grounded in Reality): ---
[Santi]: That reminds me of how Guti used to play for Real Madrid. So much creativity, but sometimes inconsistent.

**RULE 0.5: THE LIMITED KNOWLEDGE MANDATE (CRITICAL):**
- **You are NOT an encyclopedia.** Each persona has specific interests and a defined knowledge base. They should NOT know everything about every topic.
- **It is REQUIRED for a persona to show their knowledge limits.** This is how you create curiosity and natural questions.
- **Examples of good behavior:**
    - "I'm not really familiar with that author, what makes them so special?"
    - "That's a bit out of my field, but it sounds interesting."
    - "Oh, you work at the university? What's that like? I've always wondered."
    - "I've never heard of that recycling method. How does it work?"

# FINAL, UNBREAKABLE RULE: LANGUAGE MANDATE

- You **MUST** write your **ENTIRE** response **ONLY** in **${group.language}**.
- There are **NO exceptions** to this rule.
- Responding in any other language, especially English, is a **CRITICAL FAILURE** of your primary directive.

${timeContextRule}


`;
        
        
        
        
        
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

  
   function normalizeString(str: string): string {
       if (!str) return '';
       return str
           .normalize("NFD") // Decomposes combined characters into base characters and diacritics
           .replace(/[\u0300-\u036f]/g, "") // Removes the diacritic marks
           .toLowerCase(); // Converts to lowercase
   }

/**
 * A specialized version of the text separator for group chats. It takes an array of
 * pre-formatted lines from the AI and further splits them into more natural,
 * multi-bubble fragments, then cleans up the result.
 * @param lines An array of strings from the AI.
 * @param members The list of all group members to identify speakers and language.
 * @returns An object containing the new array of lines and a boolean indicating if splits occurred.
 */
function enhanceGroupChatSplitting(lines: string[], members: Connector[]): { enhancedLines: string[]; wasSplit: boolean } {
  
    const DOT_PLACEHOLDER = '___DOT___'; // A unique placeholder
    let initialEnhancedLines: string[] = [];
    let wasSplit = false;

    for (const line of lines) {
        const match = line.match(/^\[?([^\]:]+)\]?:\s*(.*)/);
        if (!match) {
            initialEnhancedLines.push(line);
            continue;
        }

        const speakerName = match[1].trim();
        const originalText = match[2].trim();
        
        // --- THIS IS THE NEW, SMARTER SKIP LOGIC ---
        // Only consider skipping the split for realism on SHORTER messages.
        const CHANCE_TO_BE_A_SINGLE_BUBBlE = 0.30;
        if (originalText.length < 50 && Math.random() < CHANCE_TO_BE_A_SINGLE_BUBBlE) {
            console.log(`[Group Parser] Intentionally skipping split for realism on short line: "${line}"`);
            initialEnhancedLines.push(line);
            continue; // Skip the rest of the parsing for this line.
        }
        // --- END OF NEW LOGIC ---

        const speaker = members.find(m => m.profileName === speakerName);

        if (!speaker || !originalText) {
            initialEnhancedLines.push(line);
            continue;
        }
        
        const language = speaker.language?.toLowerCase() || 'default';
        const keywords = SEPARATION_KEYWORDS[language] || SEPARATION_KEYWORDS['default'];
        let processedText = originalText;
        // =================== START: NEW DOTTED EXCEPTION RULE ===================
        const exceptionPattern = `\\b(${DOTTED_EXCEPTIONS.join('|')})\\.`;
        const exceptionRegex = new RegExp(exceptionPattern, 'gi');
        processedText = processedText.replace(exceptionRegex, `$1${DOT_PLACEHOLDER}`);
// ===================  END: NEW DOTTED EXCEPTION RULE  ===================
        processedText = processedText.replace(/([?!…])(?=\s+\p{Lu})/gu, '$1\n');
        processedText = processedText.replace(/(?<!\p{N})\.(?!\p{N})(?=\s+[^\p{N}])/gu, '.\n');

        // --- Final, Correct Interjection Logic for Group Chat ---
        const interjectionSplitProbability = 0.7;
        if (Math.random() < interjectionSplitProbability) {
            const allInterjections = [
                ...(keywords.initialInterjections || []),
                ...(keywords.twoPartInterjections || [])
            ];

            if (allInterjections.length > 0) {
                const sortedInterjections = allInterjections.sort((a, b) => b.length - a.length);
                const interjectionRegex = new RegExp(`^(${sortedInterjections.join('|').replace(/\s/g, '\\s')})\\b`, 'iu');
                
                const match = processedText.match(interjectionRegex);
        
                if (match && match[0].length < processedText.length) {
                    const matchedPhrase = match[0];
                    let textAfterPhrase = processedText.substring(matchedPhrase.length);
        
                    if (textAfterPhrase.trim().startsWith(',')) {
                        const commaAndSpacesRegex = /^\s*,\s*/;
                        const textToReplace = matchedPhrase + textAfterPhrase.match(commaAndSpacesRegex)![0];
                        processedText = processedText.replace(textToReplace, `${matchedPhrase}\n`);
                    } else if (textAfterPhrase.trim().startsWith('!') || textAfterPhrase.trim().startsWith('.')) {
                        const punctuationAndSpacesRegex = /^\s*[!.]\s*/;
                        const textToReplace = matchedPhrase + textAfterPhrase.match(punctuationAndSpacesRegex)![0];
                        processedText = processedText.replace(textToReplace, `${matchedPhrase}${textAfterPhrase.trim()[0]}\n`);
                    }
                }
            }
        }
        
        if (keywords.conjunctionSplits && keywords.conjunctionSplits.length > 0) {
            const conjunctionProbability = keywords.conjunctionProbability ?? 0.7;
            if (Math.random() < conjunctionProbability) {
                const conjunctionRegex = new RegExp(`,\\s*(\\b(?:${keywords.conjunctionSplits.join('|')})\\b)`, 'giu');
                
                processedText = processedText.replace(conjunctionRegex, (match, p1_conjunction, offset, fullString) => {
                    const remainingText = fullString.substring(offset + match.length);
                    if (remainingText.trim().split(/\s+/).length >= 2 || remainingText.length > 10) {
                        return `\n${p1_conjunction}`;
                    }
                    return match; 
                });
            }
        }
        
        processedText = processedText.replace(/\s*\n\s*/g, '\n').trim();

        if (processedText.includes('\n')) {
            wasSplit = true;
            const newSplitLines = processedText.split('\n');
            for (const splitLine of newSplitLines) {
                 if (splitLine.trim()) {
                    initialEnhancedLines.push(`[${speakerName}]: ${splitLine.trim()}`);
                 }
            }
        } else {
            initialEnhancedLines.push(line);
        }
    }

    if (!wasSplit) {
        return { enhancedLines: initialEnhancedLines, wasSplit: false };
    }

    const finalLines: string[] = [];
    for (const line of initialEnhancedLines) {
        if (line.trim()) {
            finalLines.push(line);
        }
    }

    const restoredFinalLines = finalLines.map(line =>
        line.replace(new RegExp(DOT_PLACEHOLDER, 'g'), '.')
    );
    
    return { enhancedLines: restoredFinalLines, wasSplit };
}

// =================== START: REPLACE THE ENTIRE playScene FUNCTION ===================
// Replace with this new function
// In src/js/core/group_interaction_logic.ts
// In src/js/core/group_interaction_logic.ts

async function playScene(
    linesOrMessages: string[] | Array<{
        speakerName: string;
        text: string;
        messageId: string; // Pre-generated ID
        speakerId?: string; // Optional but good to have
    }>,
    isGrandOpening: boolean
): Promise<void> {
    console.log(`%c[Group ScenePlayer] BATCH START. isGrandOpening: ${isGrandOpening}. Messages: ${linesOrMessages.length}`, 'color: #8a2be2; font-weight: bold;');
    isRenderingScene = true;
    const cancellationToken = { isCancelled: false };
    currentSceneCancellationToken = cancellationToken;
    
    const { groupDataManager, groupUiHandler, activityManager, polyglotHelpers } = getDeps(); // Added polyglotHelpers
    let lastSpeakerIdInBatch: string | null = null;
    // FIX: A local variable is used instead of a module-level one.
    let indicatorElement: HTMLElement | null | void = null;
    
    // Determine if we have lines or structured messages
    const isStructuredMessages = typeof linesOrMessages[0] === 'object' && linesOrMessages[0] !== null && 'messageId' in linesOrMessages[0];
    
    for (const [index, item] of linesOrMessages.entries()) {
        if (cancellationToken.isCancelled) {
            console.log("%c[Group ScenePlayer] Scene cancelled by user.", 'color: #ff6347;');
            break;
        }
    
        let speakerName: string;
        let responseText: string;
        let messageIdForUI: string;
        let speakerFromItem: Connector | undefined;
    
        if (isStructuredMessages) {
            const structuredMsg = item as { speakerName: string; text: string; messageId: string; speakerId?: string };
            speakerName = structuredMsg.speakerName;
            responseText = structuredMsg.text;
            messageIdForUI = structuredMsg.messageId;
            if (structuredMsg.speakerId) {
                speakerFromItem = members.find(m => m.id === structuredMsg.speakerId);
            }
        } else {
            const line = item as string;
            const match = line.match(/^\[?([^\]:]+)\]?:\s*(.*)/);
            if (!match) continue;
            speakerName = match[1].trim();
            responseText = match[2].trim();
            messageIdForUI = polyglotHelpers.generateUUID(); // Generate if not provided
        }
    
        const speaker = speakerFromItem || members.find(m => m.profileName === speakerName);
    
        if (!speaker || !responseText) {
             console.warn(`[Group ScenePlayer] Skipping message: No speaker or no text. SpeakerName: ${speakerName}, Text: "${responseText}"`);
             continue;
            }
        if (responseText.length < 12 && responseText.endsWith('.') && !responseText.endsWith('..')) {
            responseText = responseText.slice(0, -1);
        }
        
        const wordCount = responseText.split(/\s+/).length;
        const isConsecutiveFromSameSpeaker = speaker.id === lastSpeakerIdInBatch;
        const CHANCE_TO_DISAPPEAR = 0.25;

        let thinkingPauseMs, typingDurationMs;
        let disappearDurationMs = 0;

        const calculateTypingDuration = (wc: number) => Math.max(400, Math.min(500 + (wc * 600) + (Math.random() * 500), 20000));

        if (isConsecutiveFromSameSpeaker) {
            thinkingPauseMs = 1400 + Math.random() * 1200;
        } else {
            thinkingPauseMs = 1500 + Math.random() * 2000;
        }
        typingDurationMs = calculateTypingDuration(wordCount) * (isConsecutiveFromSameSpeaker ? 0.8 : 1.0);

        if (wordCount > 5 && Math.random() < CHANCE_TO_DISAPPEAR) {
            disappearDurationMs = 1000 + Math.random() * 1300;
        }
        
        console.log(
            `%c[Group ScenePlayer] Speaker: ${speaker.profileName} | Msg ${index + 1}/${linesOrMessages.length} | Words: ${wordCount} | Thinking: ${(thinkingPauseMs / 1000).toFixed(1)}s, Disappear: ${(disappearDurationMs / 1000).toFixed(1)}s, Typing: ${(typingDurationMs / 1000).toFixed(1)}s | Text: "${responseText.substring(0, 40)}..."`,
            'color: #28a745;'
        );

        await new Promise(resolve => setTimeout(resolve, thinkingPauseMs));
        if (cancellationToken.isCancelled) break;

        const indicatorText = `${speaker.profileName} is typing...`;
        // FIX: A new indicator is created and assigned to the local variable on every iteration.
        indicatorElement = groupUiHandler.updateGroupTypingIndicator(indicatorText);

        if (disappearDurationMs > 0) {
            const typingBurst = typingDurationMs * (0.4 + Math.random() * 0.2);
            await new Promise(resolve => setTimeout(resolve, typingBurst));
            if (indicatorElement) indicatorElement.remove();
            
            await new Promise(resolve => setTimeout(resolve, disappearDurationMs));
            if (cancellationToken.isCancelled) break;

            indicatorElement = groupUiHandler.updateGroupTypingIndicator(indicatorText);
            await new Promise(resolve => setTimeout(resolve, typingDurationMs - typingBurst));
        } else {
            await new Promise(resolve => setTimeout(resolve, typingDurationMs));
        }
        if (cancellationToken.isCancelled) break;

        if (indicatorElement) {
            indicatorElement.remove();
            // FIX: The local variable is nulled out at the end of the loop,
            // ensuring the next iteration starts with a clean slate.
            indicatorElement = null;
        }

        groupUiHandler.appendMessageToGroupLog(responseText, speaker.profileName, false, speaker.id, { messageId: messageIdForUI });
       
        lastMessageTimestamp = Date.now();
        if (window.memoryService && typeof window.memoryService.processNewUserMessage === 'function') {
            console.log(`[CEREBRUM_SELF_WRITE] ✍️ Sending [${speaker.profileName}]'s own message for self-analysis...`);
            window.memoryService.processNewUserMessage(
                responseText,
                speaker.id,
                'ai_invention',
                []
            );
        }

        lastSpeakerIdInBatch = speaker.id;
    }
    
    if (indicatorElement) indicatorElement.remove();
    
    isRenderingScene = false;
    currentSceneCancellationToken = null;
    
    if (groupDataManager && typeof groupDataManager.saveCurrentGroupChatHistory === 'function') {
        groupDataManager.saveCurrentGroupChatHistory(false);
    }
    
    console.log(`%c[Group ScenePlayer] BATCH FINISHED (or was cancelled).`, 'color: #8a2be2; font-weight: bold;');
}

// ===================  END: REPLACE THE ENTIRE playScene FUNCTION  ===================

// ===================  END: REPLACE THE ENTIRE playScene FUNCTION  ===================
// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================

// ===================  END: REPLACE WITH THIS BLOCK  ===================
// ===================  END: REPLACE WITH THIS BLOCK  ===================

// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================

// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================
// <<< CHANGE THE RETURN TYPE >>>

async function generateAiTextResponse(
    engineTriggered: boolean = false,
    isGrandOpening: boolean = false,
    isReEngagement: boolean = false,
    userOrInstructionText: string | undefined = undefined, // Can be user's text or a specific instruction
    abortSignal?: AbortSignal
): Promise<string[]> {
    if (!conversationFlowActive && !isGrandOpening && !isReEngagement) {
        if (!engineTriggered && !isGrandOpening && !isReEngagement) return [];
    }

    const { groupDataManager, polyglotHelpers, aiService, tutor: currentTutor } = getDeps();
    const currentGroup = groupDataManager.getCurrentGroupData();

    if (!currentGroup || !currentTutor) {
        console.error("GIL: generateAiTextResponse called but currentGroup or tutor is missing.");
        return [];
    }

    const masterPrompt = await buildMasterPrompt(currentGroup, members, polyglotHelpers);
    let systemPrompt = '';
    let instructionText = '';

    const MAX_RECENT_HISTORY = 40;
    const groupHistory = groupDataManager.getLoadedChatHistory();
    const recentHistory = groupHistory.slice(-MAX_RECENT_HISTORY);
    const recentHistoryText = recentHistory.map(msg => {
        const speaker = msg.speakerName || (msg.speakerId === 'user_player' || msg.speakerId === 'user_self_001' ? 'You' : 'Unknown');
        return `${speaker}: ${msg.text}`;
    }).join('\n');

    // --- YOUR ORIGINAL STATE-BASED PROMPT SELECTION LOGIC ---
    if (isGrandOpening || isReEngagement) {
        const personaSections = members.map(member => getGroupPersonaSummary(member, currentGroup.language)).join('\n');
        let specializedRules = '';
        switch (currentGroup.category) {
            case 'Language Learning': specializedRules = buildLanguageLearningRules(members, currentGroup); break;
            case 'Community Hangout': specializedRules = buildCommunityHangoutRules(members, currentGroup); break;
            case 'Sports Fan Club': specializedRules = buildSportsClubRules(members, currentGroup); break;
            default: specializedRules = `\n# GENERAL CONVERSATION RULES\n- Keep the conversation flowing naturally.`;
        }
        systemPrompt = `You are a creative dialogue writer for a chat simulation. Your primary goal is to write a realistic, in-character scene.\n--- CRITICAL RULES ---\n1. LANGUAGE: You MUST write the entire dialogue ONLY in ${currentGroup.language}.\n2. FORMAT: Every line MUST be in the format: [CharacterName]: message.\n3. PERSONA: You MUST adhere to the character personalities, roles, and allegiances described below.\n--- CHARACTERS & SPECIALIZED RULES ---\n${personaSections}\n${specializedRules}`;

        if (isGrandOpening) {
            if (currentTutor) {
                const otherMembers = members.filter(m => m.id !== currentTutor!.id);
                const otherMemberNames = polyglotHelpers.formatReadableList(otherMembers.map(m => m.profileName), "and");
                // YOUR ORIGINAL GRAND OPENING INSTRUCTION
                instructionText = `
        The host, **${currentTutor.profileName}**, has just welcomed everyone to the new chat group, "${currentGroup.name}".
        Your task is to write the immediate follow-up scene where the other members react and introduce themselves.
        --- CHARACTERS FOR THIS SCENE ---
        ${otherMemberNames}
        --- SCENE REQUIREMENTS ---
        1. DO NOT include the host (${currentTutor.profileName}) in your response. They have already spoken.
        2. Have 2-4 of the other members introduce themselves briefly.
        3. The VERY LAST message MUST be from one of the members, asking the user a direct question.
        --- GOOD EXAMPLE ---
        (Assuming the host, Giorgio, just said "Welcome!")
        [Olivia]: Ciao a tutti! Sono Olivia. So excited to be here!
        [Kenji]: Hello everyone, I'm Kenji.
        [Manon]: Hi! What about you? Are you also excited to learn Italian?
        `;
            }
        } else if (isReEngagement) {
            // YOUR ORIGINAL RE-ENGAGEMENT INSTRUCTION LOGIC
            const lastMessage = groupHistory.length > 0 ? groupHistory[groupHistory.length - 1] : null;
            let timeSinceLastMessageMs = Infinity;
            if (lastMessage?.timestamp) { timeSinceLastMessageMs = Date.now() - lastMessage.timestamp; }
            const oneHour = 3600000, twelveHours = 12 * oneHour;
            if (timeSinceLastMessageMs < oneHour) {
                instructionText = `
        The user has just returned to the chat after a short break. The last topic is still fresh.
        Your task is to create a natural, seamless continuation of the conversation.
        --- SCENE REQUIREMENTS ---
        1.  **DO NOT Greet Them:** It would be weird. Just continue the flow.
        2.  **New Speaker:** A persona who did NOT speak last must be the first to talk.
        3.  **Introduce a New Angle:** The new scene MUST introduce a new question, a dissenting opinion, or a related example. DO NOT simply agree with or rephrase the last message. This is critical for moving the conversation forward.
        4.  **Interaction:** The scene should involve 2-4 messages, showing a back-and-forth between members.
        --- GOOD EXAMPLE ---
        Last message was "[Lorenzo]: Passion is great, but it doesn't always win you the Scudetto."
        YOUR RESPONSE:
        [Fabio]: Maybe not, Lorenzo, but it's what makes the game beautiful to watch! I'd rather see a passionate loss than a boring 1-0 win.
        [Chiara]: I'm with Fabio on this one. The emotion is everything!
        `;
            } else if (timeSinceLastMessageMs < twelveHours) {
                instructionText = `
        The user has returned to the chat after several hours. The previous conversation has gone cold.
        Your task is to start a NEW, but RELATED, conversation thread. It should feel like someone saw the old messages and it sparked a completely new thought.
        --- SCENE REQUIREMENTS ---
        1.  **Reference the Past (Subtly):** One persona should start a new topic that is clearly inspired by the previous one.
        2.  **No Direct Continuation:** DO NOT just continue the last sentence. The old topic is finished.
        3.  **Generate 2-5 messages** showing a new mini-conversation starting.
        --- GOOD EXAMPLE ---
        Last message in history was "[Marco]: The wine from that region of Tuscany is unbeatable."
        YOUR RESPONSE:
        [Olivia]: Hey everyone. Seeing all that talk about Tuscany earlier has me dreaming of a vacation. Has anyone ever been to Florence? I'm trying to plan a trip.
        [Giorgio]: Oh, Florence is amazing, Olivia! You absolutely must visit the Uffizi Gallery, but book your tickets way in advance.
        `;
            } else {
                instructionText = `
        The chat has been silent for a long time (over 12 hours). The previous conversation is completely stale and irrelevant.
        Your task is to start a brand new, fresh conversation, as if it's a new day.
        --- SCENE REQUIREMENTS ---
        1.  **Fresh Greeting:** One persona should start with a time-appropriate greeting (e.g., "Good morning!", "Hey everyone, what's new?").
        2.  **New Topic:** The topic MUST be new, but still relevant to the group's overall theme (e.g., sports, French culture, community projects).
        3.  **DO NOT mention the user's return or the old conversation.**
        4.  **Generate 2-5 messages** to kick off the new chat.
        --- GOOD EXAMPLE (For a La Liga Sports Fan Club) ---
        YOUR RESPONSE:
        [Santi]: ¡Buenos días, cracks! Anyone see the transfer rumors about Barça this morning?
        [Isa]: Morning! I saw something, but I don't believe it. They have no money! 😂
        [Javi M.]: Exactly. It's just media noise.
        `;
            }
        }
    } else if (engineTriggered) { // AI initiated turn (idle user)
        systemPrompt = masterPrompt;
        if (members.length <= 1 && currentTutor) {
            // YOUR ORIGINAL 1-ON-1 IDLE PROD INSTRUCTION
            instructionText = `
You are **${currentTutor.profileName}**. You are in a one-on-one chat with the user. You have already asked them a question, but they have been silent for a while.
Your task is to gently "prod" or "nudge" them for a response without being pushy.
--- SCENE REQUIREMENTS ---
1.  **Acknowledge the Pause:** You can start with a soft re-engagement phrase like "Então...", "So...", "Bueno...", etc.
2.  **Re-ask or Re-phrase:** You can either re-ask the previous question in a slightly different way, or ask a new, simpler follow-up question related to the last topic.
3.  **Keep it Short & Friendly:** This should be a single, short message.
4.  **Output Format:** Your ENTIRE response MUST be a SINGLE line in the format \`[${currentTutor.profileName}]: message\`.
--- GOOD EXAMPLE (Last message was "what are you interested in?") ---
[Mateus]: Então, alguma ideia? Ou talvez queira que eu sugira um tópico para começarmos?
`;
        } else {
            // YOUR ORIGINAL GROUP IDLE CHATTER INSTRUCTION
            instructionText = `
The user has been silent. Generate a realistic "Conversation Block" (5-15 messages) to continue the chat based on the last topic.
--- CRITICAL RULES ---
- MUST BE AN ORIGINAL CONTINUATION:
--- SCENE REQUIREMENTS ---
1.  **CONTINUE THE THREAD:** The new block MUST be a natural continuation of the last topic in the history. Your response MUST NOT be a rephrasing or a repeat of any idea, question, or theme already present in the recent conversation history. The goal is to move the conversation forward with a new thought, question, or angle.
2.  **NEW ANGLE:** Introduce a new question, a dissenting opinion, or a related real-world example.
3.  **NEW SPEAKER:** A **different persona** (NOT the one who spoke last in the history) MUST be the first to speak.
4.  **INTERACTION:** Involve at least 2 different speakers to create a back-and-forth. It should feel like a real, messy group chat.
5.  **DO NOT MENTION THE USER'S SILENCE.**
6.  **CRITICAL** — Use Multiple Message Bubbles (2–3 in a row) from the Same Speaker to Simulate Real Thinking and Pacing:
This is essential for achieving believable, human-like chat dialogue. People often split their thoughts across messages, pause mid-conversation, or add emotional filler. Writers must reflect that by letting characters send short, staggered messages in succession. These should vary in tone and structure:
✅ Good Examples: [Aira]: Hmm. [Aira]: That’s actually a good point. ... (Your other examples)
❌ Avoid combining these into one message. ... (Your explanation)
-ABSOLUTE CRITICAL: Do not use the EXACT PHRASES IN THE EXAMPLES BELOW. Use your own words.
--- GOOD EXAMPLE ---
Last message was "[Chiara]: I think Juventus will still be the team to beat."
YOUR RESPONSE:
[Fabio]: No way! Their midfield is too slow this year.
[Lorenzo]: I don't know, Fabio, their experience is a huge advantage.
[Fabio]: Experience doesn't score goals!
[Chiara]: 😂 True, but it saves them.
--- BAD EXAMPLE (Starts a new, unrelated topic) ---
[Fabio]: Speaking of other things, what's everyone's favorite pizza topping?
--- GOOD EXAMPLE (Advances the topic) ---
History includes a debate about PSG vs Real Madrid.
YOUR RESPONSE:
[Isa]: Speaking of big club money, I wonder if the new financial rules will actually level the playing field this year.
[Mateo]: I doubt it, the top clubs always find a way around the rules.
[Javi M.]: Exactly. It's about history and prestige, not just who has the newest money.
--- BAD EXAMPLE (Repeats a previous topic) ---
History includes a debate about PSG vs Real Madrid.
YOUR RESPONSE:
[Santi]: You know, Barcelona also has a great team. Let's talk about them.
[Isa]: Yeah, their defense is solid this year!
--- BAD EXAMPLE (Repeats the last message) ---
[Vale]: ¡Genial, amigos! Me alegra ver que todos están ansiosos por compartir. ¿Nuestro nuevo miembro quiere unirse a la conversación? ¿Cuál es tu interés o pasatiempo favorito?
[Vale]: ¡Genial, amigos! Me alegra ver que todos están ansiosos por compartir. ¿Nuestro nuevo miembro quiere unirse a la conversación? ¿Cuál es tu interés o pasatiempo favorito?
--- GOOD EXAMPLE (History ends with "Community gardens are a good idea") ---
[Matthieu]: A good idea, maybe, but where? I work for the city planning office, and finding available plots in Paris is a nightmare. The paperwork alone...
[Camille]: That's the cynical view, Matthieu! What if we partner with a university? They often have land. Léa, didn't you say you were studying there?
--- BAD EXAMPLE (Just agreeing) ---
[Élodie]: Yes, community gardens are great for the environment.
`;
        }
    } else { // Direct response to user's message (userOrInstructionText is user's text)
        systemPrompt = masterPrompt;
        // YOUR ORIGINAL USER RESPONSE INSTRUCTION
        instructionText = `
The user has just sent a message. Your task is to generate a realistic, in-character response based on the following logic.
--- RESPONSE LOGIC ---
1.  **Analyze the User's Message:** : First, determine the user's intent. Are they talking to a specific person? Are they making a general statement? Or are they making a controversial, rival, or off-topic comment?
2.  **IF the user addresses ONE person** (e.g., "en serio rafa?", "ciao sofia, come stai?"):
    -   That specific person (**Rafa** or **Sofia**) MUST give the reply.
    -   Your output must be a SINGLE line in the format \`[SpeakerName]: message\`.
3.  **IF the user asks a GENERAL question OR makes a statement to the group** (e.g., "di dove siete?", "messi lol"):
    -   Generate a "response block" where 1-4 different members react.
    -   **CRITICAL SUB-RULE:** At least ONE of the speakers in your response block MUST directly acknowledge, react to, or build upon the user's message. This makes the user feel heard.
    -   Other speakers can then react to that first speaker or to the user, creating a natural, flowing group conversation.
    -   The responses should be short and natural.
    -   Your output can be MULTIPLE lines, each in the format \`[SpeakerName]: message\`.
4. IF the user makes a RIVAL or OFF-TOPIC comment (e.g., mentioning a rival team like PSG in a La Liga chat, or bringing up something totally unrelated):
CRITICAL: At least ONE persona MUST react directly to this comment, often with a dismissive, teasing, or confrontational tone that fits their personality.
This is where the fan passion comes out. They should not ignore the comment. They should challenge it, make fun of it, or express mock outrage.
Other members can then jump in to agree with the first speaker or to change the subject back to what they care about.
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
--- GOOD EXAMPLE (Forward Momentum) ---
History includes a debate about globalization vs. tradition.
YOUR RESPONSE:
[Liselotte]: This is a fascinating debate. It reminds me of the arguments between the Frankfurt School thinkers, like Adorno, who were very critical of the "culture industry" which is a form of globalization. He would probably agree with you, Markus.
[Jonas]: That's a bit academic, isn't it? On a practical level, my bike co-op uses global supply chains to get parts, but our goal is purely local: less traffic in our city. It's a mix, right?
--- GOOD EXAMPLE (Rival Comment) ---
History:
...
[Javi M.]: Atlético has the best defense in Spain.
[You]: hola a todos yo soy un fan de PSG jajajajajaja
YOUR RESPONSE:
[Santi]: ¿PSG? ¡Jajaja! Mucho dinero pero poca historia. Aquí hablamos de fútbol de verdad, amigo.
[Isa]: Déjalo, Santi. No vale la pena. Volviendo a lo importante, ¿crees que la defensa del Atleti puede parar a Lewandowski?
--- BAD EXAMPLE (Ignoring the Rival Comment) ---
History:
...
[Javi M.]: Atlético has the best defense in Spain.
[You]: hola a todos yo soy un fan de PSG jajajajajaja
YOUR RESPONSE:
[Santi]: Hablando de defensas, creo que la del Barça es mejor este año.
`;
    }

    const finalPromptInstruction = `
        ${systemPrompt}

Conversation History (if any):
---
${recentHistoryText || "(No history yet. This is the first message.)"}
${userOrInstructionText && !engineTriggered && !isGrandOpening && !isReEngagement ? `\n[You]: ${userOrInstructionText}` : ''}
---

IMMEDIATE TASK:
You MUST now follow this instruction precisely. This is your only goal.

${instructionText}

FINAL CHECK: Your entire output MUST only be the dialogue in the format [SpeakerName]: message. Do not add any other text, reasoning, or preamble.`;

    try {
        const rawResponse = await aiService.generateTextMessage(finalPromptInstruction, currentTutor!, [], undefined, false, 'group-chat', abortSignal);
        if (typeof rawResponse !== 'string' || !rawResponse) {
            console.warn("GIL: AI service returned empty or invalid response for text generation.");
            return [];
        }
        console.log(`%c[GIL AI Text Gen] Raw AI Response:\n${rawResponse}`, 'color: dodgerblue');
        return rawResponse.split('\n').filter(line => line.trim() !== '');
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log(`%c[Group Interrupt] AI text generation was successfully aborted by abortSignal.`, 'color: #ff9800;');
            return [];
        }
        console.error("GIL: Error getting conversation block from AI:", error);
        return [];
    }

}
// ===================  END: REPLACE THE ENTIRE FUNCTION  ===================
// ===================  END: PASTE THIS ENTIRE BLOCK  ===================
    /**
     * Generates a response when a user sends an image. This is a multi-stage process.
     */
  // <<< REPLACE WITH THIS CORRECTED SIGNATURE >>>

// REPLACE THE ENTIRE FUNCTION WITH THIS BLOCK

/**
 * Generates a multi-person, multi-stage response to a user's image in a group chat.
 * Stage 1: An expert or the most relevant person comments and provides a detailed,
 *          structured description of the image for the group's "memory".
 * Stage 2: Other members then react to the first comment and the image description,
 *          creating a dynamic and grounded follow-up scene.
 */

// IN: src/js/core/group_interaction_logic.ts
// REPLACE the entire function with this debug-enhanced version.
// IN: src/js/core/group_interaction_logic.ts
// REPLACE the entire function with this debug-enhanced version.

async function generateAiImageResponse(
    membersList: Connector[],
    imageBase64Data: string,
    imageMimeType: string,
    userCaption: string,
    abortSignal?: AbortSignal
): Promise<{
    firstSpeakerMessage: {
        speakerId: string;
        speakerName: string;
        text: string; // AI's comment
        imageSemanticDescription: string;
        messageId: string;
        type: 'image'; // This type indicates it's the AI's primary comment on user's image
    } | null;
    followUpMessages: Array<{
        speakerId: string;
        speakerName: string;
        text: string;
        messageId: string;
        type: 'text';
    }>;
}> {
    if (!conversationFlowActive) return { firstSpeakerMessage: null, followUpMessages: [] };

    console.groupCollapsed("%c[GIL Image Gen] Starting multi-stage image response...", 'color: #17a2b8; font-weight: bold;');
    const { polyglotHelpers, aiService, tutor: currentTutor } = getDeps();
    let firstSpeaker: Connector | undefined;
    
    // <<< FIX: Clean the Base64 data ONCE at the very beginning. >>>
    const cleanBase64Data = imageBase64Data.startsWith('data:') 
        ? imageBase64Data.substring(imageBase64Data.indexOf(',') + 1)
        : imageBase64Data;

    try {
        // --- STAGE 1: CHOOSE FIRST SPEAKER ---
        console.log("[GIL Image Gen] STAGE 1: Choosing first speaker.");
        const memberProfiles = membersList.map(m => `- ${m.profileName}: Primarily interested in ${polyglotHelpers.formatReadableList(m.interests, 'and')}.`).join('\n');
        const speakerChoicePrompt = `Based on the content of the attached image and the following member profiles, who is the MOST qualified or likely to comment first?\n\nGroup Members:\n${memberProfiles}\nUser's caption: "${userCaption || 'none'}"\nYour task: Respond with ONLY the name of the best person to speak next.`;
        
        // <<< DEBUG: Log Stage 1 call >>>
        console.log("[GIL Image Gen DEBUG] Stage 1 - Calling AI to choose speaker. Provider: groq. Prompt:", speakerChoicePrompt);
        const speakerNameResponse = await aiService.generateTextFromImageAndText(cleanBase64Data, imageMimeType, membersList[0], null, speakerChoicePrompt, 'groq', abortSignal);
        if (abortSignal?.aborted) throw new Error("AbortError: Speaker choice aborted");
        // <<< DEBUG: Log Stage 1 response >>>
        console.log("[GIL Image Gen DEBUG] Stage 1 - AI Response (Speaker Name):", speakerNameResponse);
        if (!speakerNameResponse || typeof speakerNameResponse !== 'string') throw new Error("Speaker choice AI returned no/invalid response.");

        const chosenSpeakerName = speakerNameResponse.trim();
        firstSpeaker = membersList.find(m => m.profileName === chosenSpeakerName) || membersList.find(m => m.id === currentTutor!.id) || membersList[0];
        if (!firstSpeaker) throw new Error("Could not determine a first speaker from AI response.");
        console.log(`[GIL Image Gen] Stage 1 SUCCESS: AI selected '${firstSpeaker.profileName}'.`);

        // --- STAGE 2: GET FIRST COMMENT & DESCRIPTION ---
        console.log("[GIL Image Gen] STAGE 2: Generating first comment and description.");
        const firstResponsePrompt = `You are ${firstSpeaker.profileName}. A user shared an image with the caption: "${userCaption || 'none'}".
        Your personality is: **${firstSpeaker.personalityTraits?.join(', ')}**.
        Your task is to generate two things, in this exact order:
        1.  **Your Comment:** First, write a natural, in-character comment about the image.
        2.  **The Description:** Immediately after your comment, you MUST include a special section formatted EXACTLY like this:
            [IMAGE_DESCRIPTION_START]
           A detailed, factual description of the image goes here. For example: A close-up action shot of Stephen Curry, wearing his Golden State Warriors jersey (blue, number 30), shooting a basketball on an indoor court. The lighting is bright, typical of an NBA arena.
            [IMAGE_DESCRIPTION_END]
        --- YOUR RESPONSE (in ${firstSpeaker.language}) ---`;

        // <<< DEBUG: Log Stage 2 call >>>
        console.log(`[GIL Image Gen DEBUG] Stage 2 - Calling AI for comment. Provider: together. Prompt for ${firstSpeaker.profileName}:`, firstResponsePrompt);
        const firstResponseRaw = await aiService.generateTextFromImageAndText(cleanBase64Data, imageMimeType, firstSpeaker, null, firstResponsePrompt, 'together', abortSignal);
        if (abortSignal?.aborted) throw new Error("AbortError: First image response aborted");
        // <<< DEBUG: Log Stage 2 response >>>
        console.log("[GIL Image Gen DEBUG] Stage 2 - Raw AI Response:", firstResponseRaw);
        if (typeof firstResponseRaw !== 'string' || !firstResponseRaw) throw new Error("Stage 2 AI (image comment) returned empty response.");
        
        let conversationalReply = firstResponseRaw;
        let extractedImageDescription = "An image was shared.";
        const descStartTag = "[IMAGE_DESCRIPTION_START]";
        const descEndTag = "[IMAGE_DESCRIPTION_END]";
        const startIndex = firstResponseRaw.indexOf(descStartTag);
        if (startIndex !== -1) {
            const endIndex = firstResponseRaw.indexOf(descEndTag, startIndex);
            if (endIndex > startIndex) {
                extractedImageDescription = firstResponseRaw.substring(startIndex + descStartTag.length, endIndex).trim();
                conversationalReply = firstResponseRaw.substring(0, startIndex).trim();
                console.log(`[GIL Image Gen] Stage 2 SUCCESS: Extracted comment and description.`);
            }
        } else {
            console.warn(`[GIL Image Gen] Stage 2 WARNING: Could not find description tags. Using full response as comment.`);
        }

        const firstSpeakerMessageData = {
            speakerId: firstSpeaker.id,
            speakerName: firstSpeaker.profileName,
            text: conversationalReply,
            imageSemanticDescription: extractedImageDescription,
            messageId: polyglotHelpers.generateUUID(),
            type: 'image' as 'image'
        };

        // --- STAGE 3: GENERATE FOLLOW-UP SCENE ---
        let followUpMessagesData: Array<{ speakerId: string; speakerName: string; text: string; messageId: string; type: 'text'}> = [];
        const otherMembersList = membersList.filter(m => m.id !== firstSpeaker!.id);
        if (otherMembersList.length > 0) {
            console.log(`[GIL Image Gen] STAGE 3: Generating follow-up scene with ${otherMembersList.length} other members.`);
            const followUpPrompt = `You are a creative dialogue writer for a chat simulation.
            CONTEXT: The user shared an image described as: "${extractedImageDescription}". The first person, ${firstSpeaker.profileName}, said: "${conversationalReply}"
            TASK: Write a short, realistic follow-up scene (2-4 messages) where other members react to BOTH the image description AND ${firstSpeaker.profileName}'s comment.
            - The speakers MUST be from this list: ${otherMembersList.map(m => m.profileName).join(', ')}.
            - Their reactions MUST be consistent with their own personalities.
            - The entire response MUST be in the format [SpeakerName]: message.`;

            // <<< DEBUG: Log Stage 3 call >>>
            console.log("[GIL Image Gen DEBUG] Stage 3 - Calling AI for follow-up scene. Prompt:", followUpPrompt);
            const generatedLines = await generateAiTextResponse(false, false, false, followUpPrompt, abortSignal);
            if (abortSignal?.aborted) throw new Error("AbortError: Follow-up scene generation aborted");
             // <<< DEBUG: Log Stage 3 response >>>
            console.log("[GIL Image Gen DEBUG] Stage 3 - Raw AI Response (Lines):", generatedLines);

            if (generatedLines && generatedLines.length > 0) {
                generatedLines.forEach(line => {
                    const match = line.match(/^\[?([^\]:]+)\]?:\s*(.*)/);
                    if (match) {
                        const speakerName = match[1].trim();
                        const text = match[2].trim();
                        const speaker = otherMembersList.find(m => m.profileName === speakerName);
                        if (speaker) {
                            followUpMessagesData.push({ speakerId: speaker.id, speakerName: speaker.profileName, text, messageId: polyglotHelpers.generateUUID(), type: 'text' });
                        }
                    }
                });
                console.log(`[GIL Image Gen] Stage 3 SUCCESS: Parsed into ${followUpMessagesData.length} messages.`);
            }
        }

        console.groupEnd();
        return { firstSpeakerMessage: firstSpeakerMessageData, followUpMessages: followUpMessagesData };

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log(`%c[Group Interrupt] AI image response generation was aborted by user.`, 'color: #ff9800;');
        } else {
            // <<< DEBUG: Log any error that happens during the process >>>
            console.error("GIL (Hybrid): Error during multi-stage AI image response generation:", error);
        }
        
        console.groupEnd();
        return {
            firstSpeakerMessage: {
                speakerId: firstSpeaker?.id || currentTutor?.id || 'system',
                speakerName: firstSpeaker?.profileName || currentTutor?.profileName || 'System',
                text: "(I had a little trouble processing that image, sorry!)",
                imageSemanticDescription: "Error processing image.",
                messageId: polyglotHelpers.generateUUID(),
                type: 'image'
            },
            followUpMessages: []
        };
    }
}

async function handleUserMessage(

    
    text: string | undefined,
    options?: {
        userSentImage?: boolean;
        imageBase64Data?: string;
        imageMimeType?: string;
    }
): Promise<{ // <<< MATCH THE INTERFACE RETURN TYPE
    aiMessagesToPersist: Array<{
        speakerId: string;
        speakerName: string;
        text: string | null;
        type: 'text' | 'image';
        messageId: string;
        imageSemanticDescription?: string;
    }>
} | null> {console.log('[DEBUG_GIL_HMSG] Called with text:', text ? `"${text.substring(0, 50)}..."` : undefined, 'options:', options ? JSON.stringify(options) : undefined);

    const { checkAndIncrementUsage } = await import('./usageManager');
    const { openUpgradeModal } = await import('../ui/modalUtils');
    const usageTypeForManager: 'textMessages' | 'voiceCalls' = options?.userSentImage ? 'textMessages' : 'textMessages'; // Or however you want to map image usage
   
    const usageKey = options?.userSentImage ? 'imageMessages' : 'textMessages';
    const usageResult = await checkAndIncrementUsage(usageKey);

    if (!usageResult.allowed) {
        console.log(`GIL: User has reached ${usageKey} limit. Opening upgrade modal.`);
        openUpgradeModal(usageKey === 'imageMessages' ? 'image' : 'text', usageResult.daysUntilReset);
        return null;
    }

    if (!conversationFlowActive) {
        console.log("GIL: Conversation flow not active. Ignoring user message.");
        return null;
    }

    const { groupDataManager, polyglotHelpers } = getDeps(); // groupUiHandler is used by playScene
    const currentGroup = groupDataManager.getCurrentGroupData();
    if (!currentGroup) {
        console.error("GIL: No current group data. Cannot handle user message.");
        return null;
    }

    console.log("GIL: User message received. Cancelling any active AI operations.");
    const controller = interruptAndTrackGroupOperation(currentGroup.id);

    if (currentSceneCancellationToken) {
        currentSceneCancellationToken.isCancelled = true;
        currentSceneCancellationToken = null;
        if (groupDataManager && typeof groupDataManager.saveCurrentGroupChatHistory === 'function') {
            groupDataManager.saveCurrentGroupChatHistory(true); // Save local cache
        }
        console.log("GIL: Saved partial local cache due to user interruption during playScene.");
    }

    if (conversationLoopId) {
        clearTimeout(conversationLoopId);
        conversationLoopId = null;
    }

    lastMessageTimestamp = Date.now();
    hasProddedSinceUserSpoke = false;
    const userMessageText = text?.trim() || "";

    // 1. Update memory (this logic is fine)
    // Update memory with the user's new message - convoStore part
    if (userMessageText && window.memoryService?.processNewUserMessage) {
        const { groupDataManager } = getDeps();
        // Look at the last 10 messages to see which AI personas were active.
        const recentHistory = groupDataManager.getLoadedChatHistory().slice(-10); 
        const involvedAiIds = new Set<string>();

        recentHistory.forEach(msg => {
            // 'user' is the human, so we care about the other (AI) speakers.
            if (msg.speakerId !== 'user' && msg.speakerId) {
                involvedAiIds.add(msg.speakerId);
            }
        });

        // If no AI spoke recently, assume at least the tutor is listening.
        if (involvedAiIds.size === 0 && tutor) {
            involvedAiIds.add(tutor.id);
        }

        if (involvedAiIds.size > 0) {
            const audienceIds = Array.from(involvedAiIds);
            console.log(`[CEREBRUM_GROUP_WRITE] ✍️ User spoke in group. Audience: [${audienceIds.join(', ')}]. Sending to Scribe...`);
            
            // Tell the memory service what the user said AND which AIs heard it.
            await window.memoryService.processNewUserMessage(
                userMessageText,
                audienceIds, // Pass the array of AIs who were "listening"
                'group',
                []
            );
            console.log(`[CEREBRUM_GROUP_WRITE] ✅ Targeted memory analysis complete.`);
        }
    }


    // 2. Generate AI response data & Prepare for Firestore
    const aiMessagesToPersist: Array<{
        speakerId: string;
        speakerName: string;
        text: string | null;
        type: 'text' | 'image';
        messageId: string;
        imageSemanticDescription?: string;
    }> = [];
    console.log('[DEBUG_GIL_HMSG] Initialized aiMessagesToPersist. Length:', aiMessagesToPersist.length);
    // This array will hold lines for `playScene`
    let linesToPlayInScene: string[] = [];

    if (options?.userSentImage && options.imageBase64Data && options.imageMimeType) {
        const imageResponsePayload = await generateAiImageResponse(
            members, // module-level 'members'
            options.imageBase64Data,
            options.imageMimeType,
            userMessageText, // User caption
            controller.signal
        );
        console.log('[DEBUG_GIL_HMSG] Raw imageResponsePayload from generateAiImageResponse:', imageResponsePayload ? JSON.stringify(imageResponsePayload) : 'null/undefined');
        if (controller.signal.aborted) {
             console.log("GIL: AI image response generation aborted by user.");
             return null;
        }

        if (imageResponsePayload.firstSpeakerMessage) {
            // <<< ADD TO aiMessagesToPersist >>>

            console.log('[DEBUG_GIL_HMSG] Preparing to push firstSpeakerMessage to aiMessagesToPersist:', JSON.stringify(imageResponsePayload.firstSpeakerMessage));
            aiMessagesToPersist.push({
                speakerId: imageResponsePayload.firstSpeakerMessage.speakerId,
                speakerName: imageResponsePayload.firstSpeakerMessage.speakerName,
                text: imageResponsePayload.firstSpeakerMessage.text,
                type: 'image', // AI's first response to user image is typed as 'image'
                messageId: imageResponsePayload.firstSpeakerMessage.messageId,
                imageSemanticDescription: imageResponsePayload.firstSpeakerMessage.imageSemanticDescription
            });
            if (imageResponsePayload.firstSpeakerMessage.text) { // Ensure text is not null before adding
                 linesToPlayInScene.push(`[${imageResponsePayload.firstSpeakerMessage.speakerName}]: ${imageResponsePayload.firstSpeakerMessage.text}`);
            }
        }
        if (imageResponsePayload.followUpMessages.length > 0) {
            imageResponsePayload.followUpMessages.forEach(msg => {
                // <<< ADD TO aiMessagesToPersist >>>
                console.log('[DEBUG_GIL_HMSG] Preparing to push followUpMessage to aiMessagesToPersist:', JSON.stringify(msg));
                aiMessagesToPersist.push({
                    speakerId: msg.speakerId,
                    speakerName: msg.speakerName,
                    text: msg.text,
                    type: 'text',
                    messageId: msg.messageId
                    // No imageSemanticDescription for these text follow-ups
                });
                if (msg.text) { // Ensure text is not null
                    linesToPlayInScene.push(`[${msg.speakerName}]: ${msg.text}`);
                }
            });
        }
    } else if (userMessageText) {
        const rawResponseLines = await generateAiTextResponse(false, false, false, userMessageText, controller.signal);
        console.log('[DEBUG_GIL_HMSG] Raw rawResponseLines from generateAiTextResponse:', rawResponseLines ? JSON.stringify(rawResponseLines) : 'null/undefined');
     
        if (controller.signal.aborted) {
            console.log("GIL: AI text response generation aborted by user.");
            return null;
        }

        if (rawResponseLines && rawResponseLines.length > 0) {
            linesToPlayInScene.push(...rawResponseLines);
            rawResponseLines.forEach(line => {
                const match = line.match(/^\[?([^\]:]+)\]?:\s*(.*)/);
                if (match) {
                    const speakerName = match[1].trim();
                    const textContent = match[2].trim();
                    const speaker = members.find(m => m.profileName === speakerName);
                    if (speaker && textContent) {
                        // <<< ADD TO aiMessagesToPersist >>>
                        const textAiMessage = {
                            speakerId: speaker.id,
                            speakerName: speaker.profileName,
                            text: textContent,
                            type: 'text' as 'text' | 'image', // Ensure type consistency
                            messageId: polyglotHelpers.generateUUID()
                        };
                        console.log('[DEBUG_GIL_HMSG] Preparing to push text AI message to aiMessagesToPersist:', JSON.stringify(textAiMessage));
                        aiMessagesToPersist.push(textAiMessage);
                    }
                }
            });
        }
    }

    // 3. Optimistically update UI using playScene
    if (linesToPlayInScene.length > 0) {
        console.log(`GIL: AI generated ${linesToPlayInScene.length} lines. Enhancing and playing scene optimistically.`);
        const { enhancedLines } = enhanceGroupChatSplitting(linesToPlayInScene, members);
         // `playScene` uses `groupUiHandler` internally.
        // It's important that `playScene` is designed to take the `messageId` from `aiMessagesToPersist`
        // (or a structured message object) and pass it to `groupUiHandler.appendMessageToGroupLog`.
        // For this step, we assume `playScene` correctly uses the `messageId` if available,
        // or generates one that matches what's in `aiMessagesToPersist` for UI consistency.
        // The GUIDANCE IS: `playScene` appends to UI. `group_manager` saves to Firestore using IDs from `aiMessagesToPersist`.
        // The Firestore listener will then see these messages. If the UI message already exists (matched by messageId),
        // it might just update its `data-firestore-message-id`.
        // Given current playScene, it will generate its own UUIDs for UI. The link will be made by group_manager.
        await playScene(enhancedLines, false);
    }


    // Cleanup abort controller
    if (activeGroupAiOperation.get(currentGroup.id) === controller) {
        activeGroupAiOperation.delete(currentGroup.id);
    }

    console.log("GIL: AI response generated and optimistic UI update initiated. Returning data for persistence. Restarting idle check.");
    conversationEngineLoop(false, false); // Restart idle check
    console.log('[DEBUG_GIL_HMSG] FINAL check before return. aiMessagesToPersist contents:', JSON.stringify(aiMessagesToPersist));
    if (aiMessagesToPersist.length > 0) {
        console.log('[DEBUG_GIL_HMSG] Returning aiMessagesToPersist. Count:', aiMessagesToPersist.length);
        console.log("GIL: Returning AI messages for persistence:", aiMessagesToPersist.length);
        return { aiMessagesToPersist: aiMessagesToPersist }; // <<< RETURN THE MESSAGES
    } else {
        console.log('[DEBUG_GIL_HMSG] Returning null as aiMessagesToPersist is empty or not applicable.');
        console.log("GIL: No AI messages to persist for this user turn.");
        return null; // Return null if no AI messages were generated (e.g., only memory update occurred)
    }
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
// =================== START: REPLACE WITH THIS BLOCK ===================
// =================== START: ADD THIS ENTIRE FUNCTION ===================
function setIdleCheckTimerWithLogs(callback: () => void, totalDelayMs: number) {
    if (conversationLoopId) {
        clearTimeout(conversationLoopId);
    }

    const LOG_INTERVAL = 10000; // Log every 10 seconds

    console.log(`%c[Engine] No human input detected. Waiting for user... Initializing next check in ${(totalDelayMs / 1000).toFixed(1)} seconds.`, 'color: #6c757d; font-style: italic;');

    const scheduleNextLog = (remainingTime: number) => {
        const nextTick = Math.min(remainingTime, LOG_INTERVAL);

        conversationLoopId = setTimeout(() => {
            const newRemainingTime = remainingTime - nextTick;
            if (newRemainingTime > 0) {
                console.log(`%c[Engine] T-minus ~${Math.round(newRemainingTime / 1000)} seconds until next AI activity check...`, 'color: #6c757d; font-style: italic;');
                scheduleNextLog(newRemainingTime);
            } else {
                callback(); // Time's up, run the loop
            }
        }, nextTick);
    };

    scheduleNextLog(totalDelayMs);
}

let isGenerating = false; // This should already be in your module-level state
// In src/js/core/group_interaction_logic.ts
// In src/js/core/group_interaction_logic.ts

// Make sure auth is imported if you're using auth.currentUser directly here
// import { auth } from '../firebase-config'; // Or however you access it
async function conversationEngineLoop(forceImmediateGeneration: boolean = false, isFirstRunAfterJoin: boolean = false): Promise<void> {
    if (isGenerating || isRenderingScene || !conversationFlowActive) {
        if (isGenerating) console.log("[Engine] Aborting: isGenerating=true");
        if (isRenderingScene) console.log("[Engine] Aborting: isRenderingScene=true");
        if (!conversationFlowActive) console.log("[Engine] Aborting: !conversationFlowActive");
        return;
    }

    isGenerating = true;
    console.log(`%c[Engine] conversationEngineLoop START. forceImmediate: ${forceImmediateGeneration}, isFirstRun: ${isFirstRunAfterJoin}`, "color: #007bff; font-weight:bold;");

    if (conversationLoopId) clearTimeout(conversationLoopId);

    const { groupDataManager, polyglotHelpers } = getDeps();
    const currentGroup = groupDataManager.getCurrentGroupData();

    if (!tutor || !currentGroup) {
        console.error("[Engine] Critical: Tutor or currentGroup is null. Exiting engine loop.");
        isGenerating = false;
        return;
    }
    const currentGroupId = currentGroup.id;

    const timeSinceLastMessage = Date.now() - (lastMessageTimestamp || 0);
    const shouldGenerate = forceImmediateGeneration || isFirstRunAfterJoin || (timeSinceLastMessage > 10000 && !hasProddedSinceUserSpoke);

    if (shouldGenerate) {
        if (forceImmediateGeneration) {
            console.log(`%c[Engine] Force-generating scene on group entry...`, 'color: #fd7e14; font-weight: bold;');
        }

        const history = groupDataManager.getLoadedChatHistory();
        const isGrandOpening = history.length === 0 && isFirstRunAfterJoin;
        console.log(`[Engine] Initial check: history.length=${history.length}, isFirstRunAfterJoin=${isFirstRunAfterJoin}, isGrandOpening=${isGrandOpening}`);


        let finalAiMessagesToProcess: Array<{
            speakerId: string;
            speakerName: string;
            text: string | null;
            type: 'text' | 'image';
            messageId: string;
        }> = [];

        let rawLinesGenerated: string[] = [];

        if (isGrandOpening) {
            console.log(`%c[Engine] Orchestrating Grand Opening Full Performance... Member count: ${members.length}`, 'color: #fd7e14; font-weight: bold;');
            
            if (members.length <= 1) {
                const oneOnOneWelcome = await generateOneOnOneWelcome(currentGroup, tutor);
                if (oneOnOneWelcome) rawLinesGenerated.push(...oneOnOneWelcome);
            } else {
                const tutorWelcomeLines = await generateTutorWelcome(currentGroup, tutor);
                if (tutorWelcomeLines) rawLinesGenerated.push(...tutorWelcomeLines);

                const otherMembersRawScene = await generateAiTextResponse(false, true, false);
                if (otherMembersRawScene?.length > 0) {
                    rawLinesGenerated.push(...otherMembersRawScene);
                }
            }
        } else { // Standard Ongoing Conversation / Re-engagement
            console.log(`%c[Engine] Generating standard ongoing/re-engagement block...`, 'color: #007bff;');
            if (!isFirstRunAfterJoin) hasProddedSinceUserSpoke = true;
            
            const isReEngagement = history.length > 0 && isFirstRunAfterJoin;
            const standardRawSceneLines = await generateAiTextResponse(!isFirstRunAfterJoin, false, isReEngagement);
            if (standardRawSceneLines) rawLinesGenerated.push(...standardRawSceneLines);
        }

        // Common processing for all generated raw lines: Split and structure them
        if (rawLinesGenerated.length > 0) {
            const { enhancedLines: allSplitLines } = enhanceGroupChatSplitting(rawLinesGenerated, members);
            
            allSplitLines.forEach(line => {
                const match = line.match(/^\[?([^\]:]+)\]?:\s*(.*)/);
                if (match) {
                    const speakerName = match[1].trim();
                    const textContent = match[2].trim();
                    const speaker = members.find(m => m.profileName === speakerName);
                    if (speaker && textContent) {
                        finalAiMessagesToProcess.push({
                            speakerId: speaker.id,
                            speakerName: speaker.profileName,
                            text: textContent,
                            type: 'text',
                            messageId: polyglotHelpers.generateUUID()
                        });
                    }
                }
            });
        }

        // ***** THE FIX: RENDER FIRST, THEN SAVE *****
        if (finalAiMessagesToProcess.length > 0) {
            // STEP 1: RENDER THE SCENE WITH ANIMATIONS
            // This is now the single source of truth for the UI.
            console.log(`[Engine] Calling playScene with ${finalAiMessagesToProcess.length} structured AI messages for rendering.`);
            await playScene(
                finalAiMessagesToProcess.map(m => ({ 
                    speakerName: m.speakerName,
                    text: m.text || "", 
                    messageId: m.messageId,
                    speakerId: m.speakerId
                })), 
                isGrandOpening
            );
            
            // STEP 2: SAVE THE MESSAGES TO FIRESTORE AFTER RENDERING
            // This happens after the animation is complete. The listener will still fire,
            // but the UI is already correct. You should add logic in the listener to
            // ignore messages that are already in the DOM to prevent duplicates.
            console.log(`[Engine] Scene finished. Saving ${finalAiMessagesToProcess.length} AI messages to Firestore.`);
            const currentUserForGILSave = auth.currentUser;
            if (!currentUserForGILSave) {
                console.error('[Engine] Auth is NULL in GIL. Aborting save for this batch of AI messages.');
            } else if (groupDataManager.addMessageToFirestoreGroupChat) {
                for (const aiMsgToSave of finalAiMessagesToProcess) {
                    const firestorePayload = {
                        appMessageId: aiMsgToSave.messageId,
                        senderId: aiMsgToSave.speakerId,
                        senderName: aiMsgToSave.speakerName,
                        text: aiMsgToSave.text,
                        type: aiMsgToSave.type as 'text' | 'image' | 'voice_memo' | 'system_event',
                    };
                    // This can be `await` or not, depending on if you want to wait for saves
                    // before starting the next idle timer. `await` is safer.
                    await groupDataManager.addMessageToFirestoreGroupChat(
                        currentGroupId,
                        firestorePayload
                    );
                }
            }
        }
        // ***** END OF FIX *****
        
        if (groupDataManager.saveCurrentGroupChatHistory) {
            groupDataManager.saveCurrentGroupChatHistory(true); 
        }
        hasProddedSinceUserSpoke = false;

        const nextCheckDelay = 5000 + Math.random() * 5000; 
        console.log(`%c[Engine] Interaction complete. Next idle check in ${(nextCheckDelay / 1000).toFixed(1)} seconds.`, 'color: #6c757d;');
        conversationLoopId = setTimeout(() => conversationEngineLoop(false, false), nextCheckDelay);

    } else { 
        if (conversationFlowActive) {
            const IDLE_THRESHOLD = 30000; 
            const timeUntilNextCheck = Math.max(0, IDLE_THRESHOLD - timeSinceLastMessage + 1000); 
            setIdleCheckTimerWithLogs(() => conversationEngineLoop(false, false), timeUntilNextCheck);
        }
    }
    
    console.log(`%c[Engine] conversationEngineLoop END. Setting isGenerating=false.`, "color: #007bff; font-weight:bold;");
    isGenerating = false;
}
// ===================  END: REPLACE WITH THIS BLOCK  ===================
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

    startConversationFlow: (forceImmediateGeneration: boolean = false): void => {
        console.log("GIL (Hybrid): Conversation flow STARTED.");
        conversationFlowActive = true;
        if (conversationLoopId) clearTimeout(conversationLoopId);
        // We are now telling the engine this is the first run after joining.
        conversationEngineLoop(forceImmediateGeneration, true);
    },

   // Replace with this
   stopConversationFlow: (): void => {
    console.log("GIL (Hybrid): Conversation flow STOPPED.");
    conversationFlowActive = false;
    
    // --- THIS IS THE FIX: SIMPLIFY THIS FUNCTION ---
    // Its only job is to stop the background AI timer and cancel any rendering scene
    // when the user LEAVES the chat. It should NOT save history.
    if (conversationLoopId) {
        clearTimeout(conversationLoopId);
        conversationLoopId = null;
    }
    if (currentSceneCancellationToken) {
        currentSceneCancellationToken.isCancelled = true;
        currentSceneCancellationToken = null;
    }
},


  
  handleUserMessage: async (text: string | undefined, options?: {
    userSentImage?: boolean;
    imageBase64Data?: string;
    imageMimeType?: string;
  }): Promise<void> => {
    const { checkAndIncrementUsage } = await import('./usageManager');
    const { openUpgradeModal } = await import('../ui/modalUtils');

    // Check the 'textMessages' usage limit.
    const usageResult = await checkAndIncrementUsage('textMessages');
    if (!usageResult.allowed) {
        console.log("GroupInteractionLogic: User has reached text message limit. Opening upgrade modal.");

        // Use the utility to open the *text-specific* modal.
        openUpgradeModal('text', usageResult.daysUntilReset);

        // Stop execution to prevent the message from being processed.
        return; 
    }


    // --- THIS IS THE FIX: MAKE THIS THE "MASTER OF INTERRUPTIONS" ---
    if (!conversationFlowActive) return;

    const { groupDataManager } = getDeps();
    const currentGroup = groupDataManager.getCurrentGroupData();
    if (!currentGroup) return;

    console.log("GIL: User message received. Cancelling ALL active AI operations.");
    
    // 1. Cancel any pending AI generation
    const controller = interruptAndTrackGroupOperation(currentGroup.id);
    
    // 2. Cancel any scene that is currently rendering
    if (currentSceneCancellationToken) {
        currentSceneCancellationToken.isCancelled = true;
        currentSceneCancellationToken = null;
        // IMPORTANT: Save the partial history that was rendered BEFORE we were interrupted.
        if (groupDataManager && typeof groupDataManager.saveCurrentGroupChatHistory === 'function') {
            groupDataManager.saveCurrentGroupChatHistory(true);
        }
        console.log("GIL: Saved partial scene history due to user interruption.");
    }
    
    // 3. Cancel the next scheduled AI turn
    if (conversationLoopId) {
        clearTimeout(conversationLoopId);
        conversationLoopId = null;
    }

    lastMessageTimestamp = Date.now();
    hasProddedSinceUserSpoke = false;

    // The user's message itself is added to history by another module, which is fine.
    // Now we proceed with generating a response to that message.
    const userMessageText = text?.trim() || "";
    
    // 4. Update memory with the user's new message
    if (userMessageText && window.convoStore) {
        const groupConvoRecord = window.convoStore.getConversationById(currentGroup.id);
        const currentSummary = groupConvoRecord?.userProfileSummary || "";
        const updatedSummary = await extractAndUpdateUserSummary(userMessageText, currentSummary);
        if (updatedSummary !== currentSummary) {
            window.convoStore.updateUserProfileSummary(currentGroup.id, updatedSummary);
            console.log("GIL: User profile summary was updated.");
        }
    }

// =================== START: ADD NEW BLOCK ===================
// 5. Send the user's message to the main memory service for fact extraction.
// This ensures facts learned in the group are available for later 1-on-1 chats.
// =================== START: REPLACEMENT ===================
// 5. Send the user's message to the memory service for targeted fact extraction.
// =================== START: REPLACEMENT ===================
// 5. Send the user's message to the memory service for targeted fact extraction.
if (userMessageText && window.memoryService?.processNewUserMessage) {
    const { groupDataManager } = getDeps();
    const recentHistory = groupDataManager.getLoadedChatHistory().slice(-15); // Look at last 15 messages for context
    const involvedAiIds = new Set<string>();

    // Find AI members who spoke recently
    recentHistory.forEach(msg => {
        if (msg.speakerId !== 'user' && msg.speakerId) {
            involvedAiIds.add(msg.speakerId);
        }
    });

    // If no AI spoke recently (e.g., user is starting a topic), assume the tutor is listening.
    if (involvedAiIds.size === 0 && tutor) {
        involvedAiIds.add(tutor.id);
    }

    if (involvedAiIds.size > 0) {
        const audienceIds = Array.from(involvedAiIds);
        console.log(`[CEREBRUM_GROUP_WRITE] ✍️ User spoke. Identified audience: [${audienceIds.join(', ')}]. Sending to memory service...`);

        // This is a "targeted broadcast" to the memory service.
        // We are telling it: "This text was heard by these specific AIs."
        await window.memoryService.processNewUserMessage(
            userMessageText,
            audienceIds, // Pass the array of audience IDs
            'group',
            []
        );
        console.log(`[CEREBRUM_GROUP_WRITE] ✅ Targeted memory analysis complete.`);
    }
}
// ===================  END: REPLACEMENT  ===================


    // 5. Generate a new AI response (image or text)
    if (options?.userSentImage && options.imageBase64Data && options.imageMimeType) {
        await generateAiImageResponse(members, options.imageBase64Data, options.imageMimeType, userMessageText, controller.signal);
    } else if (userMessageText) {
        const rawResponseLines = await generateAiTextResponse(false, false, false, userMessageText, controller.signal);
        if (rawResponseLines && rawResponseLines.length > 0) {
            const { enhancedLines } = enhanceGroupChatSplitting(rawResponseLines, members);
            await playScene(enhancedLines, false);
        }
    }
    
    if (activeGroupAiOperation.get(currentGroup.id) === controller) {
        activeGroupAiOperation.delete(currentGroup.id);
    }
    
    // 6. Restart the idle check loop now that the interaction is complete.
    console.log("GIL: User interaction complete. Restarting idle check engine.");
    conversationEngineLoop(false, false);
  }
  
  ,

    setAwaitingUserFirstIntroduction: (isAwaiting: boolean): void => { 
        isAwaitingUserFirstIntro = isAwaiting; 
    }
};

// ===================  END: REPLACE THE ENTIRE OBJECT  ===================

window.groupInteractionLogic = groupInteractionLogic;
document.dispatchEvent(new CustomEvent('groupInteractionLogicReady'));
console.log('group_interaction_logic.ts: (Hybrid V2) Ready event dispatched.');
})();