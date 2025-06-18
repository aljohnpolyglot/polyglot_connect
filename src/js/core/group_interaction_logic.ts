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
  // REPLACE WITH THIS BLOCK:
const getDeps = () => ({
    polyglotHelpers: window.polyglotHelpers!,
    groupDataManager: window.groupDataManager!,
    groupUiHandler: window.groupUiHandler!,
    activityManager: window.activityManager!,
    aiService: window.aiService!,
    aiApiConstants: window.aiApiConstants!,
    uiUpdater: window.uiUpdater!,
    chatOrchestrator: window.chatOrchestrator!, // <<< ADD THIS LINE
    tutor: tutor // <<< ADD THIS LINE
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
    let initialEnhancedLines: string[] = [];
    let wasSplit = false;

    // --- PHASE 1: Initial Splitting ---
    for (const line of lines) {
      
      
      
      
        const CHANCE_TO_BE_A_SINGLE_BUBBLE = 0.30; // 30% chance for groups, as they have more messages
        if (Math.random() < CHANCE_TO_BE_A_SINGLE_BUBBLE) {
            console.log(`[Group Parser] Intentionally skipping split for realism on line: "${line}"`);
            initialEnhancedLines.push(line);
            continue; // Skip the rest of the parsing for this line and move to the next.
        }
      
      
      
      
        const match = line.match(/^\[?([^\]:]+)\]?:\s*(.*)/);
        if (!match) {
            initialEnhancedLines.push(line);
            continue;
        }

        const speakerName = match[1].trim();
        const originalText = match[2].trim();
        const speaker = members.find(m => m.profileName === speakerName);

        if (!speaker || !originalText) {
            initialEnhancedLines.push(line);
            continue;
        }
        
        const language = speaker.language?.toLowerCase() || 'default';
        const keywords = SEPARATION_KEYWORDS[language] || SEPARATION_KEYWORDS['default'];
        let processedText = originalText;
        
        // <<< The "split before capital letter" rule has been completely REMOVED. >>>

        // Split after strong sentence terminators and periods.
        processedText = processedText.replace(/([?!…])(?=\s+\p{Lu})/gu, '$1\n');
        processedText = processedText.replace(/(?<!\p{N})\.(?!\p{N})(?=\s+[^\p{N}])/gu, '.\n');

        // Split initial and two-part interjections.
        if (keywords.initialInterjections && keywords.initialInterjections.length > 0) {
            // <<< THIS IS THE NEW PROBABILITY CHECK >>>
            const interjectionSplitProbability = 0.7; // High chance (85%) to split, but not 100%
            if (Math.random() < interjectionSplitProbability) {
            
                // This regex now specifically looks for an interjection at the start of the line.
                const interjectionRegex = new RegExp(`^(\\b(?:${keywords.initialInterjections.join('|')})\\b)`, 'iu');
                const match = processedText.match(interjectionRegex);
        
                // We only proceed if we found a match AND there's more text after it.
                if (match && match[0].length < processedText.length) {
                    const matchedWord = match[0];
                    let textAfterWord = processedText.substring(matchedWord.length);
        
                    // Check if the characters immediately following the word are a comma and a space.
                    if (textAfterWord.trim().startsWith(',')) {
                        // This is the "Ah," or "Oui," case.
                        
                        // We will replace the original word and the comma with just the word and a newline.
                        // First, find the comma and any following spaces.
                        const commaAndSpacesRegex = /^\s*,\s*/;
                        const textToReplace = matchedWord + textAfterWord.match(commaAndSpacesRegex)![0];
                        
                        // The replacement is just the word and a newline. The comma is gone.
                        processedText = processedText.replace(textToReplace, `${matchedWord}\n`);
        
                    } else if (textAfterWord.trim().startsWith('!') || textAfterWord.trim().startsWith('.')) {
                        // This handles cases like "Wow!" or "Right."
                        const punctuationAndSpacesRegex = /^\s*[!.]\s*/;
                        const textToReplace = matchedWord + textAfterWord.match(punctuationAndSpacesRegex)![0];
                        processedText = processedText.replace(textToReplace, `${matchedWord}${textAfterWord.trim()[0]}\n`);
                    }
                }
            }
        }
    
        if (keywords.twoPartInterjections && keywords.twoPartInterjections.length > 0) {
            const twoPartRegex = new RegExp(`^(${keywords.twoPartInterjections.join('|')})\\b`, 'iu');
            const twoPartMatch = processedText.match(twoPartRegex);
            if (twoPartMatch) {
                const phrase = twoPartMatch[0];
                processedText = processedText.replace(phrase, phrase.replace(' ', '\n'));
            }
        }
        
        // <<< THIS IS THE NEW, SMARTER CONJUNCTION RULE for group chat >>>
        if (keywords.conjunctionSplits && keywords.conjunctionSplits.length > 0) {
            const conjunctionProbability = keywords.conjunctionProbability ?? 0.7; // Default to 70% chance
            
            // <<< THIS IS THE PROBABILITY CHECK, NOW RESTORED >>>
            if (Math.random() < conjunctionProbability) {
                // This regex finds a comma, optional space, and then one of the conjunction words.
                // Example Match: ", but", ", so", ", alors"
                const conjunctionRegex = new RegExp(`,\\s*(\\b(?:${keywords.conjunctionSplits.join('|')})\\b)`, 'giu');
                
                processedText = processedText.replace(conjunctionRegex, (match, p1_conjunction, offset, fullString) => {
                    // Check if the part *after* the conjunction is long enough to be its own bubble.
                    const remainingText = fullString.substring(offset + match.length);
                    if (remainingText.trim().split(/\s+/).length >= 2 || remainingText.length > 10) {
                        // If it is, replace ", but" with "\nbut". The comma is gone.
                        return `\n${p1_conjunction}`;
                    }
                    // Otherwise, don't split, leave the text as is.
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

    // --- PHASE 2: Final Cleanup (No changes needed here) ---
    if (!wasSplit) {
        return { enhancedLines: initialEnhancedLines, wasSplit: false };
    }

    const finalLines: string[] = [];
    for (const line of initialEnhancedLines) {
        if (line.trim()) {
            finalLines.push(line);
        }
    }

    return { enhancedLines: finalLines, wasSplit };
}

// =================== START: REPLACE THE ENTIRE playScene FUNCTION ===================

async function playScene(lines: string[], isGrandOpening: boolean): Promise<void> {
    console.log(`%c[ScenePlayer V4] STARTING BATCH. isGrandOpening: ${isGrandOpening}. Total Messages: ${lines.length}`, 'color: #8a2be2; font-weight: bold;');
    isRenderingScene = true;
    const cancellationToken = { isCancelled: false };
    currentSceneCancellationToken = cancellationToken;

    const { groupDataManager, groupUiHandler, activityManager } = getDeps();
    let lastSpeakerIdInBatch: string | null = null;
    let lastMessageTextInBatch: string | null = null;
    let currentTypingIndicator: { speakerId: string; element: HTMLElement | null | void } | null = null;

    for (const [index, line] of lines.entries()) {
        if (cancellationToken.isCancelled) break;

        const match = line.match(/^\[?([^\]:]+)\]?:\s*(.*)/);
        if (!match) continue;
        
        const speakerName = match[1].trim();
        const responseText = match[2].trim();
        const speaker = members.find(m => m.profileName === speakerName);

        if (!speaker) continue;
        
        if (responseText === lastMessageTextInBatch && responseText.length < 10) {
            console.log(`%c[ScenePlayer V4] Skipping duplicate short message: "${responseText}"`, 'color: #ffc107;');
            continue;
        }

        console.log(`%c[ScenePlayer V4] ${index + 1}/${lines.length}: Preparing message from ${speaker.profileName}...`, 'color: #17a2b8;');

        // --- FIX #1: Properly create the history item ---
        const historyItem: GroupChatHistoryItem = { 
            speakerId: speaker.id, 
            speakerName: speaker.profileName, 
            text: responseText, 
            timestamp: Date.now() 
        };
        lastMessageTimestamp = historyItem.timestamp;
        
        const wordCount = responseText.split(/\s+/).length;
        const isConsecutiveFromSameSpeaker = speaker.id === lastSpeakerIdInBatch;

        let thinkingPauseMs: number;
        let typingDurationMs: number;
        const calculateTypingDuration = (wc: number) => Math.max(400, Math.min(600 + (wc * 150), 3000));

        if (isConsecutiveFromSameSpeaker) {
            thinkingPauseMs = 500 + Math.random() * 400;
            typingDurationMs = calculateTypingDuration(wordCount) * 0.8;
            console.log(`%c    ...CONSECUTIVE message, short pause.`, 'color: #20c997;');
        } else {
            thinkingPauseMs = 1500 + Math.random() * 2000;
            typingDurationMs = calculateTypingDuration(wordCount);
            console.log(`%c    ...NEW speaker, natural thinking pause.`, 'color: #fd7e14;');
        }
        
        if (index === 0) {
            thinkingPauseMs = 300 + Math.random() * 500;
            console.log(`%c    ...First message of batch, quick reaction override.`, 'color: #6c757d; font-style: italic;');
        }

        // --- FIX #2: Add safe-access checks (?) ---
        if (currentTypingIndicator?.element) {
            activityManager.clearAiTypingIndicator(currentTypingIndicator.speakerId, 'group');
            if (currentTypingIndicator.element.parentNode) {
                currentTypingIndicator.element.remove();
            }
            currentTypingIndicator = null;
        }
        
        if (thinkingPauseMs > 0) {
            await new Promise(resolve => setTimeout(resolve, thinkingPauseMs));
        }
        if (cancellationToken.isCancelled) break;

        const indicatorElement = activityManager.simulateAiTyping(speaker.id, 'group');
        currentTypingIndicator = { speakerId: speaker.id, element: indicatorElement };
        await new Promise(resolve => setTimeout(resolve, typingDurationMs));
        
        if (currentTypingIndicator?.element) {
            activityManager.clearAiTypingIndicator(currentTypingIndicator.speakerId, 'group');
            if (currentTypingIndicator.element.parentNode) {
                currentTypingIndicator.element.remove();
            }
            currentTypingIndicator = null;
        }

        if (cancellationToken.isCancelled) break; // Check for cancellation again after the wait
        
        groupUiHandler.appendMessageToGroupLog(responseText, speaker.profileName, false, speaker.id);
        groupDataManager.addMessageToCurrentGroupHistory(historyItem);
        
        lastSpeakerIdInBatch = speaker.id;
        lastMessageTextInBatch = responseText;
    }
    
    // Final cleanup with safe-access check
    if (currentTypingIndicator?.element) {
        activityManager.clearAiTypingIndicator(currentTypingIndicator.speakerId, 'group');
        if (currentTypingIndicator.element.parentNode) {
            currentTypingIndicator.element.remove();
        }
    }
    isRenderingScene = false;
    currentSceneCancellationToken = null;
    console.log(`%c[ScenePlayer V4] BATCH FINISHED.`, 'color: #8a2be2; font-weight: bold;');
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





    const MAX_RECENT_HISTORY = 25; // <<< Let's set a much smaller limit

    const groupHistory = groupDataManager.getLoadedChatHistory();
    
    // Slice only the last few messages to prevent the echo chamber effect
    const recentHistory = groupHistory.slice(-MAX_RECENT_HISTORY);

    // Now, create the text string from this shorter history
    const recentHistoryText = recentHistory.map(msg => {
        // Fallback for older history items that might be missing a name
        const speaker = msg.speakerName || 'Unknown'; 
        return `${speaker}: ${msg.text}`;
    }).join('\n');

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
    // This block is now ONLY for generating the "other members" introductions.
    // The tutor and 1-on-1 logic is handled by the conversationEngineLoop.
    console.log("GIL: Building prompt for 'other members' Grand Opening introductions.");
    if (tutor) {
        const otherMembers = members.filter(m => m.id !== tutor!.id);
        const otherMemberNames = polyglotHelpers.formatReadableList(otherMembers.map(m => m.profileName), "and");
        
        instructionText = `
        The host, **${tutor.profileName}**, has just welcomed everyone to the new chat group, "${currentGroup.name}".
        Your task is to write the immediate follow-up scene where the other members react and introduce themselves.
        --- CHARACTERS FOR THIS SCENE ---
        ${otherMemberNames}
        --- SCENE REQUIREMENTS ---
        1. DO NOT include the host (${tutor.profileName}) in your response. They have already spoken.
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
    // --- NEW TIME-AWARE RE-ENGAGEMENT LOGIC ---
    const history = groupDataManager.getLoadedChatHistory();
    const lastMessage = history.length > 0 ? history[history.length - 1] : null;
    let timeSinceLastMessageMs = Infinity;

    if (lastMessage?.timestamp) {
        timeSinceLastMessageMs = Date.now() - lastMessage.timestamp;
    }

    const oneHour = 60 * 60 * 1000;
    const twelveHours = 12 * oneHour;

    console.log(`%c[Re-engagement] Time since last message: ${(timeSinceLastMessageMs / 1000 / 60).toFixed(1)} minutes.`, 'color: #17a2b8;');

    if (timeSinceLastMessageMs < oneHour) {
        // --- STRATEGY 1: IMMEDIATE CONTINUATION (Short Break) ---
        console.log(`[Re-engagement] Verdict: Short break. Generating a natural continuation.`);
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
        // --- STRATEGY 2: RELATED NEW TOPIC (Medium Break) ---
        console.log(`[Re-engagement] Verdict: Medium break. Starting a related new topic.`);
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
        // --- STRATEGY 3: FRESH START (Long Break) ---
        console.log(`[Re-engagement] Verdict: Long break. Generating a completely fresh start.`);
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

✅ Good Examples:

[Aira]: Hmm.
[Aira]: That’s actually a good point.

[Jason]: 🤔
[Jason]: Not sure if that would work though.

[Leah]: Yes, I agree.
[Leah]: LOL.
[Leah]: That took me a second.

[Rico]: Wait.
[Rico]: Are you saying we lost the file??

[Sam]: Okay...
[Sam]: That’s kind of messed up.

[Luis]: I love that.
[Luis]: Seriously.
[Luis]: Like, so much.

❌ Avoid combining these into one message. The pause between bubbles creates realism—people type fast, revise, or react emotionally in real time. This technique adds rhythm, humanity, and authenticity. It’s not optional—it’s foundational.
Avoid cramming these into one long message; the pacing and rhythm created by split messages is crucial to emotional realism and engagement."

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



`;}
} else { // Responding directly to the user
    console.log("GIL: Building MASTER prompt for a direct RESPONSE to the user.");
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





async function conversationEngineLoop(forceImmediateGeneration: boolean = false, isFirstRunAfterJoin: boolean = false): Promise<void> {
    if (isRenderingScene || !conversationFlowActive) return;

    // Clear any previously scheduled loop to prevent duplicates
    if (conversationLoopId) clearTimeout(conversationLoopId);

    const { groupDataManager } = getDeps();
    const currentGroup = groupDataManager.getCurrentGroupData();
    if (!tutor || !currentGroup) return;

    // Determine if the AI should speak
    const timeSinceLastMessage = Date.now() - (lastMessageTimestamp || 0);
    const shouldGenerate = isFirstRunAfterJoin || (timeSinceLastMessage > 10000 && !hasProddedSinceUserSpoke);

    if (shouldGenerate) {
        const history = groupDataManager.getLoadedChatHistory();
        const isGrandOpening = history.length === 0 && isFirstRunAfterJoin;

        if (isGrandOpening) {
            console.log(`%c[Engine] Orchestrating Grand Opening... Member count: ${members.length}`, 'color: #fd7e14; font-weight: bold;');
            
            let combinedOpeningScene: string[] = [];
        
            if (members.length <= 1) {
                // --- 1-on-1 Grand Opening ---
                console.log(`[Engine] Taking 1-on-1 chat path.`);
                const oneOnOneWelcome = await generateOneOnOneWelcome(currentGroup, tutor);
                if (oneOnOneWelcome) {
                    combinedOpeningScene.push(...oneOnOneWelcome);
                }
            } else {
                // --- Multi-Member Grand Opening ---
                console.log(`[Engine] Taking multi-member group path.`);
                const tutorWelcomeLine = await generateTutorWelcome(currentGroup, tutor);
                if (tutorWelcomeLine) {
                    combinedOpeningScene.push(...tutorWelcomeLine);
                }
                
                // Generate the members' intros, but don't play them yet.
                const otherMembersScene = await generateAiTextResponse(false, true, false);
                if (otherMembersScene?.length > 0) {
                    combinedOpeningScene.push(...otherMembersScene);
                }
            }
            
            // --- Play the entire combined scene at once ---
            if (combinedOpeningScene.length > 0) {
                await playScene(combinedOpeningScene, true); // The 'true' flag ensures the special intro timing.
            }
        
        } else {
            console.log(`%c[Engine] Generating standard ongoing conversation block...`, 'color: #007bff;');
            if (!isFirstRunAfterJoin) hasProddedSinceUserSpoke = true;
            
            const isReEngagement = history.length > 0 && isFirstRunAfterJoin;

            // --- THIS IS THE NEW LOGIC ---
            // 1. Get the raw lines from the AI
            const rawSceneLines = await generateAiTextResponse(!isFirstRunAfterJoin, false, isReEngagement);
            if (!rawSceneLines || rawSceneLines.length === 0) return; // Exit if AI returns nothing

            // 2. Enhance the lines using our parser
            const { enhancedLines, wasSplit } = enhanceGroupChatSplitting(rawSceneLines, members);
            
            // 3. Log the result
            if (wasSplit) {
                console.log(`%c[Parser] Successfully fragmented AI response. Original lines: ${rawSceneLines.length}, Final Bubbles: ${enhancedLines.length}`, 'color: #28a745; font-weight: bold;');
            }

            // 4. Play the final, enhanced scene
            await playScene(enhancedLines, false);
            // --- END OF NEW LOGIC ---
        }

        groupDataManager.saveCurrentGroupChatHistory(true);
        hasProddedSinceUserSpoke = false; // Reset prod state after AI speaks

        // Set timer for the next check after AI activity
        const nextCheckDelay = 5000 + Math.random() * 5000; 
        console.log(`%c[Engine] Interaction complete. Next idle check in ${(nextCheckDelay / 1000).toFixed(1)} seconds.`, 'color: #6c757d;');
        conversationLoopId = setTimeout(() => conversationEngineLoop(false, false), nextCheckDelay);

    } else {
        // AI decided not to speak, use the T-minus logger to wait for user input.
        const IDLE_THRESHOLD = 30000; // This is a separate value used for the logger. It should generally be a bit higher than the prod threshold.
        const timeUntilNextCheck = IDLE_THRESHOLD - timeSinceLastMessage + 1000; // Check 1s after threshold is passed
        setIdleCheckTimerWithLogs(() => conversationEngineLoop(false, false), timeUntilNextCheck);
    }
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
        
        // Clear any scheduled "engine loop" (the timer for the AI to speak on its own)
        if (conversationLoopId) {
            clearTimeout(conversationLoopId);
            conversationLoopId = null;
        }
    
        // --- THIS IS THE CRITICAL FIX ---
        // If a scene is currently rendering (i.e., looping through messages with timeouts),
        // set its cancellation flag to true. This will cause the loop in `playScene` to break.
        if (currentSceneCancellationToken) {
            currentSceneCancellationToken.isCancelled = true;
            currentSceneCancellationToken = null; // Clear the token
            
            // Also, immediately save any history that was rendered *before* the cancellation.
            getDeps().groupDataManager.saveCurrentGroupChatHistory(true);
            console.log("GIL (stopConversationFlow): Cancelled active scene and saved partial history.");
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
        
        const { groupDataManager } = getDeps();

        const wasSceneCancelled = !!currentSceneCancellationToken;
        if (currentSceneCancellationToken) {
            currentSceneCancellationToken.isCancelled = true;
            currentSceneCancellationToken = null;
        }
        if (wasSceneCancelled) {
            groupDataManager.saveCurrentGroupChatHistory(true);
            console.log("GIL: Saved partial scene history due to user interruption.");
        }
        if (conversationLoopId) {
            clearTimeout(conversationLoopId);
            conversationLoopId = null;
            console.log("GIL: Cleared scheduled conversation engine loop due to user activity.");
        }

        lastMessageTimestamp = Date.now();
        hasProddedSinceUserSpoke = false;
        if (!conversationFlowActive) return;

        const userMessageText = text?.trim() || "";
        
        // --- MEMORY EXTRACTION STEP ---
        if (userMessageText) {
            const convoStore = window.convoStore;
            if (convoStore) {
                const currentGroup = groupDataManager.getCurrentGroupData();
                if (currentGroup) {
                    const groupConvoRecord = convoStore.getConversationById(currentGroup.id);
                    const currentSummary = groupConvoRecord?.userProfileSummary || "";
                    const updatedSummary = await extractAndUpdateUserSummary(userMessageText, currentSummary);

                    if (updatedSummary !== currentSummary) {
                        convoStore.updateUserProfileSummary(currentGroup.id, updatedSummary);
                        console.log("GIL: User profile summary was updated.");
                    }
                }
            }
        }
        // --- END: MEMORY EXTRACTION STEP ---

        if (!userMessageText && !options?.userSentImage) {
             conversationEngineLoop(false, false);
             return;
        }
        
        // --- THIS IS THE NEW LOGIC YOU ARE PASTING IN ---
        // 1. Get the raw lines from the AI
        const rawResponseLines = await generateAiTextResponse(false, false, false, userMessageText);
        if (!rawResponseLines || rawResponseLines.length === 0) {
            // If AI gives no response, restart the idle check
            console.log("GIL: AI generated no response to user. Restarting idle check engine.");
            conversationEngineLoop(false, false);
            return;
        }

        // 2. Enhance the lines using our parser
        const { enhancedLines, wasSplit } = enhanceGroupChatSplitting(rawResponseLines, members);
        
        // 3. Log the result
        if (wasSplit) {
            console.log(`%c[Parser] Successfully fragmented AI response. Original lines: ${rawResponseLines.length}, Final Bubbles: ${enhancedLines.length}`, 'color: #28a745; font-weight: bold;');
        }
        
        // 4. Play the final, enhanced scene
        await playScene(enhancedLines, false);
        // --- END OF NEW LOGIC ---
        
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