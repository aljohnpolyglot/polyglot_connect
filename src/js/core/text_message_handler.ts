
import type {
    UiUpdater,
    AIService,
    ConversationManager,
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ChatOrchestrator,
    AIApiConstants,
    Connector,
    ChatMessageOptions,
    ConversationRecordInStore,
    MessageInStore,
    GeminiChatItem,
    ActivityManager,
    ModalHandler,
    GeminiTtsService 
   
} from '../types/global.d.ts';
import { SEPARATION_KEYWORDS } from '../constants/separate_text_keywords.js';
import { DOTTED_EXCEPTIONS } from '../constants/separate_text_keywords.js';
import { auth } from '../firebase-config';
import { uploadImageToImgur } from '../services/imgur_service'; // <<< ADD THIS IMPORT
// --- THIS IS THE FIX ---
// Import the function directly. This guarantees we have the correct, up-to-date version.
import { getGroupPersonaSummary } from './persona_prompt_parts.js';

import { 
    uploadAudioToSupabase, 
    base64ToBlob, 
    convertL16ToWavBlob // <<< IMPORT THE NEW FUNCTION
} from '../services/supabaseService'; // Adjust path if necessary
console.log('text_message_handler.ts: Script loaded, waiting for core dependencies.');

const getSafeDeps = (functionName: string = "TextMessageHandler internal"): TextMessageHandlerDeps | null => {
    
    // Create the dependency object first, including the imported getGroupPersonaSummary
    const deps = {
        uiUpdater: window.uiUpdater,
        aiService: window.aiService,
        conversationManager: window.conversationManager,
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        chatOrchestrator: window.chatOrchestrator,
        aiApiConstants: window.aiApiConstants,
        activityManager: window.activityManager,
        modalHandler: window.modalHandler,
        getGroupPersonaSummary: getGroupPersonaSummary, // Add the imported function here
    };
    
    // Now, iterate and check if any are missing.
    // Add 'getGroupPersonaSummary' to criticalKeys if you want to explicitly check its presence,
    // though as an import, it will always be available to this module.
    const criticalKeys: (keyof TextMessageHandlerDeps)[] = [
        'uiUpdater', 'aiService', 'conversationManager', 'domElements', 
        'polyglotHelpers', 'aiApiConstants', 'activityManager', 'modalHandler',
        'getGroupPersonaSummary' // Added for completeness in checking against TextMessageHandlerDeps
    ];
 
    for (const key of criticalKeys) {
        // The check needs to correctly access the properties of the `deps` object
        if (!deps[key as keyof typeof deps]) { 
            console.error(`TMH (${functionName}): CRITICAL - Dependency '${key}' is missing.`);
            return null;
        }
    }
    
    // The cast to TextMessageHandlerDeps is now safe as `deps` includes `getGroupPersonaSummary`.
    return deps as TextMessageHandlerDeps;
};

// Map to track ongoing AI generation calls for each conversation.
// Key: targetId (string), Value: AbortController
const activeAiOperations = new Map<string, AbortController>();
const activeTypingIndicators = new Map<string, HTMLElement>();



function showTypingIndicatorFor(targetId: string, context: 'embedded' | 'modal') {
    const { activityManager, conversationManager } = getSafeDeps("showTypingIndicatorFor")!;
    if (!activityManager || !conversationManager) return;

    // First, clear any existing indicator for this chat to prevent duplicates.
    clearTypingIndicatorFor(targetId);

    const connector = conversationManager.getConversationById(targetId)?.connector;
    if (!connector) return;

    const chatTypeForManager = context === 'modal' ? 'modal_message' : 'embedded';
    const indicatorElement = activityManager.simulateAiTyping(connector.id, chatTypeForManager);

    if (indicatorElement) {
        activeTypingIndicators.set(targetId, indicatorElement);
    }
}

function clearTypingIndicatorFor(targetId: string) {
    if (activeTypingIndicators.has(targetId)) {
        const indicatorElement = activeTypingIndicators.get(targetId);
        indicatorElement?.remove();
        activeTypingIndicators.delete(targetId);
    }
}

/**
 * Interrupts any ongoing AI operation for a specific conversation and prepares a new AbortController.
 * This is the core of the responsive cancellation feature.
 * @param {string} targetId The ID of the conversation (e.g., a connector's ID).
 * @returns {AbortController} A new AbortController for the upcoming operation.
 */
function interruptAndTrackAiOperation(targetId: string): AbortController {
    // 1. Check if there's an existing operation for this chat and cancel it.
    if (activeAiOperations.has(targetId)) {
        console.log(`%c[Interrupt] User sent new message. Cancelling previous AI request for conversation ${targetId}.`, 'color: #ff6347; font-weight: bold;');
        const existingController = activeAiOperations.get(targetId);
        existingController?.abort(); // Send the abort signal
        activeAiOperations.delete(targetId); // Clean up immediately
    }

    // 2. Create a new controller for the new operation.
    const newController = new AbortController();

    // 3. Track the new controller.
    activeAiOperations.set(targetId, newController);

    // 4. Return the new controller so its signal can be used by the AI call.
    return newController;
}







export interface TextMessageHandlerModule {
    sendEmbeddedTextMessage: (
        textFromInput: string,
        currentEmbeddedChatTargetId: string | null,
        options?: {
            skipUiAppend?: boolean;
            isVoiceMemo?: boolean;
            audioBlobDataUrl?: string | null;
            messageId?: string;
            timestamp?: number;
            imageFile?: File | null;
            captionText?: string | null;
        }
    ) => Promise<void>;
    handleEmbeddedImageUpload: (event: Event, currentEmbeddedChatTargetId: string | null) => Promise<void>;
    sendModalTextMessage: (
        textFromInput: string,
        currentModalMessageTargetConnector: Connector | null,
        options?: {
            skipUiAppend?: boolean;
            isVoiceMemo?: boolean;
            audioBlobDataUrl?: string | null;
            messageId?: string;
            timestamp?: number;
            imageFile?: File | null;
            captionText?: string | null;
        }
    ) => Promise<void>;
    handleModalImageUpload: (event: Event, currentModalMessageTargetConnector: Connector | null) => Promise<void>;
}

window.textMessageHandler = {
    sendEmbeddedTextMessage: async () => { console.warn("TMH structural: sendEmbeddedTextMessage called before full init."); },
    handleEmbeddedImageUpload: async () => { console.warn("TMH structural: handleEmbeddedImageUpload called before full init."); },
    sendModalTextMessage: async () => { console.warn("TMH structural: sendModalTextMessage called before full init."); },
    handleModalImageUpload: async () => { console.warn("TMH structural: handleModalImageUpload called before full init."); }
} as TextMessageHandlerModule;
console.log('text_message_handler.ts: Placeholder window.textMessageHandler assigned.');




document.dispatchEvent(new CustomEvent('textMessageHandlerStructuralReady'));
console.log('text_message_handler.ts: "textMessageHandlerStructuralReady" (Placeholder) event dispatched.');
interface TextMessageHandlerDeps {
    uiUpdater: UiUpdater;
    aiService: AIService;
    conversationManager: ConversationManager;
    domElements: YourDomElements;
    polyglotHelpers: PolyglotHelpers;
    chatOrchestrator?: ChatOrchestrator;
    aiApiConstants: AIApiConstants;
    activityManager: ActivityManager;
    modalHandler: ModalHandler; // <<< THIS IS THE FIX
    getGroupPersonaSummary(connector: Connector, language: string): string;
 
}
function initializeActualTextMessageHandler(): void {
    console.log('text_message_handler.ts: initializeActualTextMessageHandler() for FULL method population called.');

   

    const resolvedFunctionalDeps = getSafeDeps("Full TMH Initialization");

    if (!resolvedFunctionalDeps) {
        console.error("text_message_handler.ts: CRITICAL - Functional dependencies not ready for full TMH setup. Methods will remain placeholders.");
        // if (!(window.textMessageHandler as any).__functionalReady) {
        //      document.dispatchEvent(new CustomEvent('textMessageHandlerReady'));
        //      console.warn('text_message_handler.ts: "textMessageHandlerReady" (DUMMY) event dispatched due to missing deps.');
        // }
        return;
    }
    console.log('text_message_handler.ts: Functional dependencies for full method population appear ready.');

    const methods = ((): TextMessageHandlerModule => {
        'use strict';

  // =================== PASTE THIS NEW DEFINITION HERE ===================
    /**
     * Creates a universal, token-efficient preamble for any multimodal prompt.
     * It instructs the AI to use its full context to generate a response.
     */
    const getMultimodalPreamble = (connector: Connector): string => {
        const personaSummary = getGroupPersonaSummary(connector, connector.language);
        
        // This is a static string. We are teaching the AI to look for these sections
        // in the main system prompt it receives, which already contains the memory and time.
        return `
You are about to react to an image or a voice message. To do this perfectly, you MUST use all three parts of your 'brain':

1.  **YOUR CORE IDENTITY:**
    ${personaSummary}

2.  **YOUR LONG-TERM MEMORY:** You must consult the memories you have of this user to make your response personal.

3.  **YOUR CURRENT SITUATION:** You must consider your current time and place to make your response feel grounded and real.

Combine these three elements to inform your reaction.
`;
    };


/**
 * Intelligently inserts newline characters into a single string to create
 * a multi-bubble chat effect, using language-specific keywords and contextual patterns.
 * @param text The single-line text from the AI.
 * @param connector The persona object, used to determine the language.
 * @param options An object containing configuration like probability.
 * @returns A new string with newline characters inserted, or the original string.
 */
function intelligentlySeparateText(
    text: string, 
    connector: Connector,
    options: { probability?: number }
): string {
   
    const CHANCE_TO_BE_A_SINGLE_BUBBLE = 0.25; // 25% chance to do nothing.
    if (Math.random() < CHANCE_TO_BE_A_SINGLE_BUBBLE) {
        // Log that we are intentionally skipping the parse for realism.
        console.log(`[Parser] Intentionally skipping split for realism. Delivering as single bubble.`);
        return text; // Return the original, untouched text.
    }
    
    const { probability = 1.0 } = options; 

    // --- Phase 1: Pre-checks and Setup ---
    if (Math.random() > probability) {
        return text;
    }
    
    if (text.length < 20 && !/[?!…]/.test(text)) {
        return text;
    }

    const language = connector.language?.toLowerCase() || 'default';
    const keywords = SEPARATION_KEYWORDS[language] || SEPARATION_KEYWORDS['default'];
    let processedText = text;
    const DOT_PLACEHOLDER = '___DOT___'; // A unique placeholder

// --- RULE A: Protect dotted exceptions BEFORE splitting ---
// This rule finds words from our exception list followed by a dot and temporarily
// replaces the dot with a placeholder so it won't be split by later rules.
const exceptionPattern = `\\b(${DOTTED_EXCEPTIONS.join('|')})\\.`;
const exceptionRegex = new RegExp(exceptionPattern, 'gi');
processedText = processedText.replace(exceptionRegex, `$1${DOT_PLACEHOLDER}`);
    // --- Phase 2: Apply Splitting Rules (Unicode-Aware) ---

    // RULE B: Split after strong sentence terminators.
    const terminatorRegex = new RegExp('([?!…])(?=\\s+\\p{Lu})', 'gu');
    processedText = processedText.replace(terminatorRegex, '$1\n');

    // RULE C: Split after a period (but not decimals).
    const periodRegex = new RegExp('(?<!\\p{N})\\.(?!\\p{N})(?=\\s+[^\\p{N}])', 'gu');
    processedText = processedText.replace(periodRegex, '.\n');

        // --- RULE D & E: Unified Interjection Handling (with priority) ---
           // --- RULE D & E: Final, Correct Interjection Logic ---
    const interjectionSplitProbability = 0.85;
    if (Math.random() < interjectionSplitProbability) {
        // Combine all interjections into one list.
        const allInterjections = [
            ...(keywords.initialInterjections || []),
            ...(keywords.twoPartInterjections || [])
        ];

        if (allInterjections.length > 0) {
            // Sort by length (longest first) to ensure "mamma mia" is matched before "mamma".
            const sortedInterjections = allInterjections.sort((a, b) => b.length - a.length);
            const interjectionRegex = new RegExp(`^(${sortedInterjections.join('|').replace(/\s/g, '\\s')})\\b`, 'iu');
            
            const match = processedText.match(interjectionRegex);
    
            // If a match is found (e.g., "mamma mia"), treat it as ONE bubble.
            if (match && match[0].length < processedText.length) {
                const matchedPhrase = match[0]; // This is the full "mamma mia"
                let textAfterPhrase = processedText.substring(matchedPhrase.length);
    
                // Handle punctuation like "!" or "," after the phrase.
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
    // New, smarter conjunction rule
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
    
    // --- Phase 3: Final Cleanup and Re-joining ---
    if (processedText === text) {
        return text;
    }
    
    processedText = processedText.replace(/\s*\n\s*/g, '\n').trim();

    const initialLines = processedText.split('\n');
    const finalLines: string[] = [];

    for (const line of initialLines) {
        const isTargetedInterjection = keywords.initialInterjections.includes(line.toLowerCase().replace(/[.,!]/g, ''));
        if (line.length <= 3 && !isTargetedInterjection && finalLines.length > 0) {
            finalLines[finalLines.length - 1] += ` ${line}`;
        } else if (line.trim()) {
            finalLines.push(line);
        }
    }
    const finalString = finalLines.join('\n');
    return finalString.replace(new RegExp(DOT_PLACEHOLDER, 'g'), '.');
}
// ===================  END: REPLACE THE ENTIRE TMH PARSER FUNCTION  ===================


function showTypingIndicatorFor(targetId: string, context: 'embedded' | 'modal') {
    const { activityManager, conversationManager } = getSafeDeps("showTypingIndicatorFor")!;
    if (!activityManager || !conversationManager) return;

    // First, clear any existing indicator for this chat to prevent duplicates.
    clearTypingIndicatorFor(targetId);

    // In a 1-on-1 chat, the "targetId" is the conversation ID, and the connector is part of that record.
    const connector = conversationManager.getConversationById(targetId)?.connector;
    if (!connector) return;

    const chatTypeForManager = context === 'modal' ? 'modal_message' : 'embedded';
    // The activityManager should create the UI element and return it
    const indicatorElement = activityManager.simulateAiTyping(connector.id, chatTypeForManager);

    if (indicatorElement) {
        // We track the element by conversation ID to clear it later
        activeTypingIndicators.set(targetId, indicatorElement);
    }
}

function clearTypingIndicatorFor(targetId: string) {
    if (activeTypingIndicators.has(targetId)) {
        const indicatorElement = activeTypingIndicators.get(targetId);
        indicatorElement?.remove();
        activeTypingIndicators.delete(targetId);
    }
}


/**
 * Renders a sequence of AI messages with realistic, paced delays and typing
 * indicators for each individual message bubble in a 1v1 chat.
 * @param lines The array of message strings from the AI.
 * @param targetId The ID of the connector receiving the messages.
 * @param connector The full Connector object for the AI persona.
 * @param context 'embedded' or 'modal' to direct the UI updates.
 */
async function playAiResponseScene(
    lines: string[],
    conversationId: string, // This is the Firestore document ID
    connector: Connector,
    context: 'embedded' | 'modal'
): Promise<void> {

    const { uiUpdater, conversationManager, polyglotHelpers } = getSafeDeps("playAiResponseScene")!;
    if (!uiUpdater || !conversationManager || !polyglotHelpers) return;

    const appendToLog = context === 'embedded' ? uiUpdater.appendToEmbeddedChatLog : uiUpdater.appendToMessageLogModal;

    for (const [index, line] of lines.entries()) {
        let text = line.trim();
        if (!text) continue;

        // 1. Show the typing indicator.
        showTypingIndicatorFor(conversationId, context);

        // 2. Calculate a realistic typing delay.
        const words = text.trim().split(/\s+/).length;
        const wpm = 40; // average human typing speed
        const wordsPerMs = wpm / 60 / 1000;
        let typingDurationMs = Math.max(1200, Math.min(words / wordsPerMs, 5000)) + (Math.random() * 500);

        console.log(`%c[ScenePlayer] Line ${index + 1} for ${connector.profileName}. Words: ${words}. Typing: ${(typingDurationMs / 1000).toFixed(1)}s`, 'color: #8a2be2;');

        // 3. Wait for the typing to "finish".
        await new Promise(resolve => setTimeout(resolve, typingDurationMs));

        // 4. Clear the indicator right before showing the message.
        clearTypingIndicatorFor(conversationId);

        // 5. Generate a UNIQUE ID for this message bubble.
        const messageId = polyglotHelpers.generateUUID();

        // 6. Append the actual message bubble to the UI with all the data it needs.
        // This will prevent the "messageId was MISSING" warning.
        appendToLog?.(text, 'connector', {
            avatarUrl: connector.avatarModern,
            senderName: connector.profileName,
            timestamp: Date.now(),
            connectorId: connector.id,
            messageId: messageId, // Pass the ID to the UI
        });

        // 7. CRITICAL: Save the AI's message to Firestore.
        await conversationManager.addModelResponseMessage(conversationId, text);
        if (window.memoryService?.processNewUserMessage) {
            console.log(`[CEREBRUM_SELF_WRITE] ✍️ 1-on-1: Sending [${connector.profileName}]'s own message for self-analysis...`);
            // The AI processes its own message to remember its statements.
            window.memoryService.processNewUserMessage(
                text,
                connector.id,
                'ai_invention',
                []
            );
        }
        // 8. Add a short "reading" pause between bubbles.
        if (index < lines.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
        }
    }
    console.log(`%c[ScenePlayer] SCENE FINISHED for ${connector.profileName}.`, 'color: #8a2be2; font-weight: bold;');
}



        console.log("text_message_handler.ts: IIFE for actual methods STARTING.");

        const {
            uiUpdater,
            aiService,
            polyglotHelpers,
            conversationManager,
            aiApiConstants,
            domElements,
            activityManager,// <<< ADD THIS LINE
            modalHandler // Destructure it here
        } = resolvedFunctionalDeps;


// VVVVV ADD THIS HELPER FUNCTION VVVVV
function getHistoryForAiCall(
    fullConversationHistory: GeminiChatItem[] | undefined | null,
    isImageReplyContext: boolean 
): GeminiChatItem[] {
    if (isImageReplyContext) {
        // For image-specific replies (2-part comment + description),
        // send empty history to force focus on the current image and prompt.
        console.log("TMH_HISTORY_BUILDER: IMAGE_REPLY_CONTEXT - Providing EMPTY history.");
        return []; 
    } else {
        // For regular text-to-text conversational replies,
        // send the actual conversation history (which includes the system prompt).
        const historyToReturn = Array.isArray(fullConversationHistory) ? [...fullConversationHistory] : [];
        console.log(`TMH_HISTORY_BUILDER: TEXT_REPLY_CONTEXT - Providing ${historyToReturn.length} turns of history.`);
        return historyToReturn;
    }
}
// ^^^^^^ HELPER FUNCTION DEFINITION ENDS HERE ^^^^^^
// ^^^^^ ADD THIS HELPER FUNCTION ^^^^^

const getChatOrchestrator = (): ChatOrchestrator | undefined => window.chatOrchestrator;


// Target File: src/js/core/text_message_handler.ts

// (Ensure all necessary imports are at the top of the file as previously discussed)
// import { uploadImageToImgur } from '../services/imgur_service';
// import { uploadAudioToSupabase, base64ToBlob } from '../services/supabaseService';
// import type { GeminiTtsService, ChatMessageOptions, Connector, ... } from '../types/global.d.ts';
// import { getMultimodalPreamble, getGroupPersonaSummary } from './persona_prompt_parts';
// import { intelligentlySeparateText } from './yourTextSeparatorLogicFile';
// import { playAiResponseScene, showTypingIndicatorFor, clearTypingIndicatorFor, interruptAndTrackAiOperation, getHistoryForAiCall } from './textMessageHandlerHelpers'; // Assuming these are helpers

async function sendEmbeddedTextMessage(
    textFromInput: string,
    targetIdentifier: string | null, // This can be EITHER conversationId OR connectorId
    options: {
        skipUiAppend?: boolean;
        isVoiceMemo?: boolean;
        audioSrc?: string | null;
        messageId?: string;
        timestamp?: number;
        imageFile?: File | null;
        captionText?: string | null;
    } = {}
): Promise<void> {
    const functionName = "TMH.sendEmbeddedTextMessage";
    const context = 'embedded';

    if (!targetIdentifier) {
        console.warn(`${functionName}: No targetIdentifier provided. Aborting.`);
        // Optionally show UI error if context demands
        return;
    }

    const deps = getSafeDeps(functionName);
    if (!deps) {
        console.error(`${functionName}: Critical dependencies missing for embedded send. Aborting.`);
        return;
    }
    const {
        conversationManager,
        aiService,
        polyglotHelpers,
        uiUpdater,
    } = deps;

    // --- Robust ID Resolution Funnel ---
    let connector: Connector | undefined;
    let conversationId: string | null = null;
    let conversationRecord: ConversationRecordInStore | undefined | null = null;

    // Attempt 1: Assume targetIdentifier is a conversationId
    conversationRecord = conversationManager.getConversationById(targetIdentifier);
    if (conversationRecord && conversationRecord.connector) {
        connector = conversationRecord.connector;
        conversationId = conversationRecord.id;
        console.log(`[TMH] (${context}) Resolved targetIdentifier ("${targetIdentifier}") as ConversationID. Connector: ${connector.profileName}, ConversationID: ${conversationId}`);
    } else {
        // Attempt 2: Assume targetIdentifier is a connectorId
        console.log(`[TMH] (${context}) TargetIdentifier ("${targetIdentifier}") not a direct ConversationID or record incomplete. Attempting as ConnectorID.`);
        const foundConnector = window.polyglotConnectors?.find(c => c.id === targetIdentifier);
        if (foundConnector) {
            connector = foundConnector;
            console.log(`[TMH] (${context}) Resolved targetIdentifier ("${targetIdentifier}") as ConnectorID: ${connector.profileName}. Ensuring conversation record...`);
            const ensuredConvId = await conversationManager.ensureConversationRecord(connector);
            if (ensuredConvId) {
                conversationId = ensuredConvId;
                console.log(`[TMH] (${context}) Ensured/Retrieved ConversationID: ${conversationId} for Connector: ${connector.profileName}`);
            } else {
                console.error(`${functionName}: Successfully found connector for ID "${targetIdentifier}", but failed to ensure/get its conversation ID. Aborting.`);
                uiUpdater.appendToEmbeddedChatLog?.("Error: Could not establish a chat session for this contact.", 'system-error', { isError: true, messageId: polyglotHelpers.generateUUID() });
                return;
            }
        } else {
            console.error(`${functionName}: targetIdentifier ("${targetIdentifier}") is neither a known ConversationID nor a ConnectorID. Aborting.`);
            uiUpdater.appendToEmbeddedChatLog?.("Error: Invalid chat target. Cannot send message.", 'system-error', { isError: true, messageId: polyglotHelpers.generateUUID() });
            return;
        }
    }

    // Final check after resolution attempts
    if (!connector || !conversationId) {
        console.error(`${functionName}: Failed to resolve valid Connector and ConversationID from targetIdentifier ("${targetIdentifier}"). Connector: ${connector?.id}, ConversationID: ${conversationId}. Aborting.`);
        uiUpdater.appendToEmbeddedChatLog?.("Error: Critical problem identifying chat participant or session. Please try refreshing.", 'system-error', { isError: true, messageId: polyglotHelpers.generateUUID() });
        return;
    }
    // --- Connector and ConversationID are now robustly resolved ---

    // --- User's Message Handling ---
    const userMessageText = options.imageFile ? (textFromInput.trim() || (options.captionText || "").trim()) : textFromInput.trim();
    const optimisticMessageId = options.messageId || polyglotHelpers.generateUUID();
    const optimisticTimestamp = options.timestamp || Date.now();

    // --- Optimistic UI Append ---
    // voice_memo_handler.ts calls this with skipUiAppend: true after it handles its own UI.
    // chat_event_listeners.ts (for text/image) calls this with skipUiAppend: false (or undefined).
    if (!options.skipUiAppend) {
        const uiAppendOptions: ChatMessageOptions = {
            messageId: optimisticMessageId,
            timestamp: optimisticTimestamp,
        };
        let messageContentForUI = userMessageText;

        if (options.isVoiceMemo && options.audioSrc) { // This case is less likely if skipUiAppend is false
            uiAppendOptions.isVoiceMemo = true; uiAppendOptions.audioSrc = options.audioSrc;
            messageContentForUI = userMessageText || "[Voice Memo]";
            console.log(`[TMH] (${context}) Appending USER voice memo to UI (TMH, skipUiAppend=false). AppID: ${optimisticMessageId}`);
        } else if (options.imageFile) {
            uiAppendOptions.imageUrl = URL.createObjectURL(options.imageFile); uiAppendOptions.type = 'image';
            messageContentForUI = userMessageText; // Caption
            console.log(`[TMH] (${context}) Appending USER image to UI (TMH, optimistic blob). AppID: ${optimisticMessageId}`);
        } else if (userMessageText.trim()) {
            console.log(`[TMH] (${context}) Appending USER text message to UI (TMH). AppID: ${optimisticMessageId}`);
        } else if (!options.imageFile && !options.isVoiceMemo) {
            console.log(`[TMH] (${context}) User message is empty text, not image/VM. Skipping send.`);
            return; // Don't send empty text messages
        }
        // Only append if there's actual content or it's a media type that implies content
        if (messageContentForUI.trim() || uiAppendOptions.isVoiceMemo || uiAppendOptions.type === 'image') {
           uiUpdater.appendToEmbeddedChatLog?.(messageContentForUI, 'user', uiAppendOptions);
        }
    }

    // --- Process and Send Message (using resolved `connector` and `conversationId`) ---
    if (options.imageFile) {
        // ***** IMAGE SENDING LOGIC *****
        console.log(`${functionName}: Processing user image for ${context} chat ${conversationId}.`);
        let base64DataForAI: string | null = null;
        let mimeTypeForAI: string | null = null;
        let resolvedImgurUrl: string | null = null;

        try {
            base64DataForAI = await polyglotHelpers.fileToBase64(options.imageFile);
            mimeTypeForAI = options.imageFile.type;
        } catch (e) {
            console.error(`${functionName}: Error converting image to base64. AI will not 'see' the image.`, e);
        }

        console.info(`[TMH_Imgur] ${functionName} (${context}): Uploading image "${options.imageFile.name}" to Imgur...`);
        const imgurUploadPromise = uploadImageToImgur(options.imageFile).catch(err => {
            console.error(`[TMH_Imgur] ${functionName} (${context}): Imgur upload failed for "${options.imageFile?.name}".`, err);
            return null;
        });

        showTypingIndicatorFor(conversationId, context);
        const controller = interruptAndTrackAiOperation(connector.id); // Use connector.id for AI operation tracking
        let aiConversationalReply = "I see you sent an image! What's on your mind about it?";
        let aiSemanticDescription = "Image analysis was not performed or an error occurred.";

        if (base64DataForAI && mimeTypeForAI) {
            try {
                const preamble = getMultimodalPreamble(connector);
                let recentChatHistoryText = "";
                // Get fresh conversation messages for AI context
                const currentConversationMessages = conversationManager.getConversationById(conversationId)?.messages;
                if (currentConversationMessages) {
                    const recentMessages = currentConversationMessages.slice(-10);
                    recentChatHistoryText = recentMessages.map(msg => {
                        const speakerName = msg.sender === 'user' ? 'You' : (connector.profileName || 'Partner');
                        const messageText = msg.text || (msg.type === 'image' ? '[image]' : (msg.type === 'voice_memo' ? '[voice memo]' : '[system event]'));
                        return `[${speakerName}]: ${messageText}`;
                    }).join('\n');
                }

                const promptForAI = `
${preamble}
**Recent Conversation Context (Last few messages):**
${recentChatHistoryText || "[No recent messages before this image.]"}
---
A user has now sent you an image.
The user's caption for this new image is: "${userMessageText || 'No caption provided.'}"
**CRITICAL LANGUAGE INSTRUCTION: You MUST speak and respond ONLY in ${connector.language}. Do not use any other language unless told by the user**
**Your Current Task:**
You must respond to this new image and caption. Your response MUST be structured precisely as follows:
1.  First, provide your natural, in-character conversational reply. This reply should be based on the image content you've analyzed and the user's caption. It must reflect what your persona (${connector.profileName}) would actually say in the chat. Consider your persona's interests, personality, and the recent conversation context when crafting this reply.
2.  After your conversational reply, you MUST include a separator line consisting of exactly three hyphens: \`---\`
3.  Immediately following the "---" separator, you MUST provide a detailed, factual, and objective third-person description of the image in ENGLISH. This description is strictly for database and accessibility purposes.
    This factual description MUST be enclosed in special tags: \`[IMAGE_DESCRIPTION_START]\` at the beginning and \`[IMAGE_DESCRIPTION_END]\` at the end.
    Inside these tags, describe: Main Subject, Setting/Background, Key Objects/Elements, Colors & Lighting, and any identifiable People/Characters/Celebrities (e.g., Taylor Swift, Barack Obama, LeBron James, Bugs Bunny).
**Critical Output Language Reminder:** Your conversational reply (Part 1) MUST be ONLY in ${connector.language}. The factual description (Part 3) MUST be in ENGLISH. Adherence to this is paramount.
Example of the required output structure (if language was English):
That's a stunning photo of the Grand Canyon! The way the light hits the canyon walls is just breathtaking. Makes me want to go hiking there. What time of day did you take this?
---
[IMAGE_DESCRIPTION_START]
A wide-angle photograph of the Grand Canyon at what appears to be late afternoon. The canyon walls show layers of red, orange, and brown rock. The sky is mostly clear with some wispy clouds. Shadows are beginning to lengthen across the canyon floor. No people are visible in this shot.
[IMAGE_DESCRIPTION_END]
IMPORTANT: Do NOT include the phrases "PART 1", "PART 2", or any instructional numbering (like "1.", "2.") in your actual output. Just follow the structure: conversational reply, then "---", then the tagged factual description.
                `;

                const rawAiResponse = await aiService.generateTextFromImageAndText(
                    base64DataForAI, mimeTypeForAI, connector,
                    getHistoryForAiCall(await conversationManager.getGeminiHistoryForConnector(conversationId), true),
                    promptForAI,
                    undefined, controller.signal
                );

                if (typeof rawAiResponse === 'string' && rawAiResponse.trim()) {
                    const separator = "---";
                    const separatorIndex = rawAiResponse.indexOf(separator);
                    if (separatorIndex !== -1) {
                        aiConversationalReply = rawAiResponse.substring(0, separatorIndex).trim();
                        const descriptionPart = rawAiResponse.substring(separatorIndex + separator.length).trim();
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const descStartIndex = descriptionPart.indexOf(descStartTag);
                        const descEndIndex = descriptionPart.lastIndexOf(descEndTag);
                        if (descStartIndex !== -1 && descEndIndex > descStartIndex) {
                            aiSemanticDescription = descriptionPart.substring(descStartIndex + descStartTag.length, descEndIndex).trim();
                        } else { aiSemanticDescription = descriptionPart; }
                    } else {
                        aiConversationalReply = rawAiResponse.trim();
                        aiSemanticDescription = "AI did not provide a structured description (no separator).";
                    }
                } else { aiConversationalReply = "I couldn't quite process that image right now."; }
            } catch (error: any) {
                if (error.name === 'AbortError') console.log(`${functionName}: AI image processing aborted.`);
                else {
                    console.error(`${functionName}: Error during AI image processing:`, error);
                    aiConversationalReply = "Sorry, I had a bit of trouble looking at that image.";
                }
            }
        } else { aiConversationalReply = "I couldn't quite make out the image you sent (processing error before AI)."; }

        resolvedImgurUrl = await imgurUploadPromise;
        if (resolvedImgurUrl) console.log(`[TMH_Imgur] (${context}) Imgur upload complete for user image: ${resolvedImgurUrl}`);
        else if (options.imageFile) console.warn(`[TMH_Imgur] (${context}) Imgur upload failed for "${options.imageFile.name}".`);

        await conversationManager.addMessageToConversation(
            conversationId, userMessageText, 'image',
            { imageUrl: resolvedImgurUrl, imageSemanticDescription: aiSemanticDescription, messageIdToUse: optimisticMessageId }
        );
        console.log(`[TMH] (${context}) User's image message (AppID: ${optimisticMessageId}) with caption, Imgur URL, and AI description saved.`);

        clearTypingIndicatorFor(conversationId);
        if (aiConversationalReply) {
            const responseLines = intelligentlySeparateText(aiConversationalReply, connector, { probability: 1.0 }).split('\n').filter(Boolean);
            if (responseLines.length > 0) await playAiResponseScene(responseLines, conversationId, connector, context);
            else if (base64DataForAI) await playAiResponseScene(["Understood.", "Interesting image!"], conversationId, connector, context);
        }
        if (activeAiOperations.get(connector.id) === controller) activeAiOperations.delete(connector.id);
        // ***** END OF IMAGE SENDING LOGIC *****

    } else {
        // ***** TEXT-ONLY or VOICE MEMO LOGIC *****
        // voice_memo_handler.ts calls this function with:
        // - targetIdentifier = connector.id
        // - options.skipUiAppend = true (VMH already appended user's VM to UI)
        // - options.isVoiceMemo = true
        // - options.audioSrc = supabaseUrl (of user's recording)
        // - textFromInput = transcript

        if (!userMessageText.trim() && !options.isVoiceMemo) { // For pure text, don't send if empty
            console.log(`[TMH] (${context}) User sent empty text message. Not saving, not calling AI.`);
            return;
        }
        
        // Save User's Text/Voice Memo Message to Firestore
        // This is important for voice memos too, as VMH only does UI append.
        let messageTypeForSave: 'text' | 'voice_memo' = 'text';
        let extraDataForSave: { messageIdToUse: string; content_url?: string | null } = {
            messageIdToUse: optimisticMessageId, // This links VMH's UI optimistic ID with the Firestore record
        };

        if (options.isVoiceMemo) {
            messageTypeForSave = 'voice_memo';
            if (options.audioSrc) {
                extraDataForSave.content_url = options.audioSrc; // Supabase URL of user's VM
            } else {
                console.warn(`[TMH] (${context}) Voice memo sent but audioSrc missing. Transcript: "${userMessageText.substring(0,30)}"`);
            }
        }

        // Only save if there's actual text content OR if it's a voice memo (which implies content via audioSrc)
        if (userMessageText.trim() || messageTypeForSave === 'voice_memo') {
            await conversationManager.addMessageToConversation(
                conversationId, userMessageText, messageTypeForSave, extraDataForSave
            );
            console.log(`[TMH] (${context}) User's ${messageTypeForSave} (AppID: ${optimisticMessageId}) from TMH context saved to Firestore.`);
        }
        
        if (userMessageText.trim() && window.memoryService?.processNewUserMessage) {
            console.log(`[CEREBRUM_WRITE] ✍️ User spoke in 1-on-1. Sending to Scribe for analysis...`);
            // We use a "fire and forget" approach here. We don't need to wait for the memory
            // to be saved before getting the AI's reply.
            window.memoryService.processNewUserMessage(
                userMessageText,
                connector.id, // The ID of the persona hearing the message
                'one_on_one',
                [] // History is optional for the Scribe's 1-on-1 analysis
            );
        }
        // AI Response for Text/Voice Memo Transcript
        showTypingIndicatorFor(conversationId, context);
        const controller = interruptAndTrackAiOperation(connector.id);
        try {
            const historyForAI = await conversationManager.getGeminiHistoryForConnector(conversationId);
            console.log(`[TMH] (${context}) Calling AI for ${messageTypeForSave}. History: ${historyForAI?.length || 0}, Input: "${userMessageText.substring(0,50)}"`);

            const aiResponseText = await aiService.generateTextMessage(
                userMessageText, connector, getHistoryForAiCall(historyForAI, false),
                undefined, false, 'one-on-one', controller.signal
            );
            clearTypingIndicatorFor(conversationId);

            if (aiResponseText && typeof aiResponseText === 'string') {
                const voiceMsgStartTag = "[VOICE_MESSAGE_START]";
                const voiceMsgEndTag = "[VOICE_MESSAGE_END]";

                if (aiResponseText.includes(voiceMsgStartTag) && aiResponseText.includes(voiceMsgEndTag)) {
                    // AI wants to send a voice message
                    const startIndex = aiResponseText.indexOf(voiceMsgStartTag) + voiceMsgStartTag.length;
                    const endIndex = aiResponseText.indexOf(voiceMsgEndTag);
                    const textForTts = aiResponseText.substring(startIndex, endIndex).trim();
                    console.log(`[TMH] (${context}) AI response is voice intent: "${textForTts.substring(0,50)}..."`);

                    if (textForTts) {
                        const geminiTts = window.geminiTtsService as GeminiTtsService | undefined;
                        if (geminiTts && geminiTts.getTTSAudio) {
                            showTypingIndicatorFor(conversationId, context);
                    
                            // --- MODIFICATION TO DETERMINE LANGUAGE CODE FOR TTS API ---
                            let langCodeForTtsApi = connector.languageCode; // Default to the connector's primary language BCP-47 code
                    
                            // Check if there's a language-specific override for the current connector language
                            if (connector.languageSpecificCodes && connector.languageSpecificCodes[connector.language]) {
                                const langSpecifics = connector.languageSpecificCodes[connector.language];
                                if (langSpecifics.liveApiSpeechLanguageCodeOverride) {
                                    langCodeForTtsApi = langSpecifics.liveApiSpeechLanguageCodeOverride;
                                    console.log(`[TMH] TTS: Using language override for API: ${langCodeForTtsApi} (Original: ${connector.languageCode}) for voice ${connector.liveApiVoiceName || 'default'}`);
                                }
                            }
                            // --- END OF MODIFICATION ---
                    
                            const ttsResult = await geminiTts.getTTSAudio(
                                textForTts, 
                                langCodeForTtsApi, // Pass the potentially overridden language code
                                connector.liveApiVoiceName || undefined // Pass the persona's voice name
                                // stylePrompt is not used in the current Gemini TTS payload, so pass undefined or null
                            );
                            clearTypingIndicatorFor(conversationId);
                    
                            if (ttsResult?.audioBase64 && ttsResult.mimeType) {
                                let audioBlobToUpload: Blob | null = null;
                                let finalMimeTypeForUpload = ttsResult.mimeType;
                                let finalFileExtension = 'bin'; 
                            
                                if (ttsResult.mimeType.toLowerCase().startsWith('audio/l16')) {
                                    console.log(`[TMH] AI TTS returned L16 data. Attempting to convert to WAV. Original Mime: ${ttsResult.mimeType}`);
                                    
                                    // Step 1: Decode base64 to a Blob of L16
                                    const rawL16Blob = base64ToBlob(ttsResult.audioBase64, ttsResult.mimeType); 
                                    
                                    // Step 2: Convert that Blob's ArrayBuffer to Uint8Array
                                    const l16ArrayBuffer = await rawL16Blob.arrayBuffer();
                                    const l16Uint8Array = new Uint8Array(l16ArrayBuffer);
                            
                                    // Step 3: Convert L16 Uint8Array to WAV Blob using the imported function
                                    audioBlobToUpload = convertL16ToWavBlob(l16Uint8Array, ttsResult.mimeType); 
                                    
                                    if (audioBlobToUpload) {
                                        finalMimeTypeForUpload = 'audio/wav';
                                        finalFileExtension = 'wav';
                                        console.log(`[TMH] Successfully converted L16 to WAV. New blob size: ${audioBlobToUpload.size}`);
                                    } else {
                                        console.error("[TMH] L16 to WAV conversion failed. Will attempt to upload raw L16 data.");
                                        audioBlobToUpload = rawL16Blob; // Fallback to original L16 blob
                                        const parts = ttsResult.mimeType.split(';')[0].split('/');
                                        if (parts.length === 2 && parts[1]) finalFileExtension = parts[1].toLowerCase();
                                    }
                                } else {
                                    console.log(`[TMH] AI TTS returned non-L16 data: ${ttsResult.mimeType}. Uploading as is.`);
                                    audioBlobToUpload = base64ToBlob(ttsResult.audioBase64, ttsResult.mimeType);
                                    const parts = ttsResult.mimeType.split(';')[0].split('/');
                                    if (parts.length === 2 && parts[1]) finalFileExtension = parts[1].toLowerCase();
                                }
                            
                                if (!audioBlobToUpload) {
                                    console.error("[TMH] Failed to create audio blob for upload.");
                                    throw new Error("Failed to prepare audio for upload.");
                                }
                            
                                const aiMessageId = polyglotHelpers.generateUUID(); // Ensure polyglotHelpers is in scope
                                const supabaseFilePath = `ai_voice_memos/${context}/${conversationId}/${aiMessageId}.${finalFileExtension}`;
                                
                                // Call uploadAudioToSupabase with the final blob and its explicit mime type
                                const supabaseAudioUrl = await uploadAudioToSupabase(audioBlobToUpload, supabaseFilePath, finalMimeTypeForUpload);
                            
                                if (supabaseAudioUrl) {
                                    console.log(`[TMH] (${context}) AI voice memo uploaded: ${supabaseAudioUrl} (Type: ${finalMimeTypeForUpload})`);
                                    
                                    const appendToLog = context === 'embedded' ? uiUpdater.appendToEmbeddedChatLog : uiUpdater.appendToMessageLogModal; // Ensure uiUpdater is in scope
                                    if (appendToLog) {
                                        const messageOptionsForUi: ChatMessageOptions = {
                                            messageId: aiMessageId,
                                            timestamp: Date.now(),
                                            avatarUrl: connector.avatarModern, // Ensure connector is in scope
                                            senderName: connector.profileName,
                                            connectorId: connector.id,
                                            speakerId: connector.id, 
                                            isVoiceMemo: true,
                                            audioSrc: supabaseAudioUrl,
                                        };
                                        appendToLog(textForTts, 'connector', messageOptionsForUi); // textForTts is the transcript
                                    }
                                    
                                    await conversationManager.addMessageToConversation( // Ensure conversationManager is in scope
                                        conversationId, 
                                        textForTts, 
                                        'voice_memo',
                                        { 
                                            content_url: supabaseAudioUrl, 
                                            senderId: connector.id, 
                                            messageIdToUse: aiMessageId,
                                            mime_type: finalMimeTypeForUpload 
                                        }
                                    );
                                    console.log(`[TMH] (${context}) AI voice memo (AppID: ${aiMessageId}) with transcript and URL saved to Firestore. Mime: ${finalMimeTypeForUpload}`);
                            
                                } else { 
                                    console.error(`[TMH] (${context}) Supabase upload failed for AI voice memo. Sending as text.`);
                                    throw new Error("Supabase upload failed for AI voice memo. Sending as text."); 
                                }
                            } else { 
                                let errorReason = "TTS service did not return audio base64.";
                                if (ttsResult && !ttsResult.mimeType) errorReason = "TTS service returned audio base64 but was missing mimeType.";
                                console.error(`[TMH] (${context}) ${errorReason} Sending as text.`);
                                throw new Error(errorReason); 
                            }
                        } else { // Fallback to text
                            console.warn(`[TMH] (${context}) TTS service not found. Sending AI voice intent as text.`);
                            const processedText = intelligentlySeparateText(textForTts, connector, { probability: 1.0 });
                            await playAiResponseScene(processedText.split('\n').filter(Boolean), conversationId, connector, context);
                        }
                    } else { // Empty voice tag
                        console.warn(`[TMH] (${context}) AI voice message tag was empty. Sending fallback text.`);
                        await playAiResponseScene(["(AI tried to send an empty voice message.)"], conversationId, connector, context);
                    }
                } else { // Regular AI text response
                    const processedText = intelligentlySeparateText(aiResponseText, connector, { probability: 1.0 });
                    const responseLines = processedText.split('\n').filter(Boolean);
                    if (responseLines.length > 0) await playAiResponseScene(responseLines, conversationId, connector, context);
                    else console.log(`[TMH] (${context}) AI returned an empty text response after processing.`);
                }
            } else if (aiResponseText === null && !controller.signal.aborted) {
                console.warn(`${functionName}: AI returned null (not aborted).`);
                uiUpdater.appendToEmbeddedChatLog?.("I'm not quite sure how to respond to that.", 'connector-error', { messageId: polyglotHelpers.generateUUID(), isError: true, avatarUrl: connector.avatarModern, senderName: connector.profileName, connectorId: connector.id });
            } else if (controller.signal.aborted) {
                 console.log(`${functionName}: AI text/voice generation aborted.`);
            }
        } catch (error: any) {
            clearTypingIndicatorFor(conversationId);
            if (error.name !== 'AbortError') {
                console.error(`${functionName}: Error during AI response or TTS (text/voice):`, error);
                await playAiResponseScene([`My apologies, difficulty responding: ${error.message}`], conversationId, connector, context);
            } else { console.log(`${functionName}: AI operation aborted after error or during processing.`); }
        } finally {
            clearTypingIndicatorFor(conversationId); // Final clear
            if (activeAiOperations.get(connector.id) === controller) {
                activeAiOperations.delete(connector.id);
            }
        }
    } // ***** END OF TEXT-ONLY or VOICE MEMO LOGIC *****
}

async function handleEmbeddedImageUpload(event: Event, currentEmbeddedChatTargetId: string | null): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !currentEmbeddedChatTargetId) return;

    console.log("TMH: Image upload for embedded chat is not fully implemented with Firestore storage yet. Placeholder action.");
    // TODO: Implement Firebase Storage upload here.
    // 1. Upload file to Firebase Storage.
    // 2. Get the download URL.
    // 3. Call conversationManager.addMessageToConversation with type 'image' and the URL in extraData.

    // For now, we just show an alert.
    alert("Image upload to Firebase Storage is not yet implemented.");
    target.value = ''; // Reset file input
}

async function handleModalImageUpload(event: Event, currentModalMessageTargetConnector: Connector | null): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !currentModalMessageTargetConnector) return;

    console.log("TMH: Image upload for modal chat is not fully implemented with Firestore storage yet. Placeholder action.");
    alert("Image upload to Firebase Storage is not yet implemented.");
    target.value = ''; // Reset file input
}

async function sendModalTextMessage(
    textFromInput: string,
    currentModalMessageTargetConnector: Connector | null, // Expects a full Connector object
    options: {
        skipUiAppend?: boolean;
        isVoiceMemo?: boolean;
        audioSrc?: string | null;      // URL of the user's voice memo (e.g., from Supabase)
        messageId?: string;
        timestamp?: number;
        imageFile?: File | null;
        captionText?: string | null;
    } = {}
): Promise<void> {
    const functionName = "TMH.sendModalTextMessage";
    const context = 'modal';

    if (!currentModalMessageTargetConnector) {
        console.warn(`${functionName}: No currentModalMessageTargetConnector provided. Aborting.`);
        // deps?.uiUpdater.appendToMessageLogModal?.(/* error */); // If deps are available
        return;
    }

    const deps = getSafeDeps(functionName);
    if (!deps) {
        console.error(`${functionName}: Critical dependencies missing for modal send. Aborting.`);
        return;
    }
    const {
        conversationManager,
        aiService,
        polyglotHelpers,
        uiUpdater,
    } = deps;

    const connector = currentModalMessageTargetConnector; // Already a Connector object
    const conversationId = await conversationManager.ensureConversationRecord(connector);

    if (!conversationId) {
        console.error(`${functionName}: Failed to ensure/get conversation ID for modal chat with ${connector.id}. Aborting.`);
        uiUpdater.appendToMessageLogModal?.("Error: Could not initialize this chat session.", 'system-error', { isError: true, messageId: polyglotHelpers.generateUUID() });
        return;
    }
    console.log(`[TMH] (${context}) Sending message. Connector: ${connector.profileName} (${connector.id}), ConversationID: ${conversationId}`);

    const userMessageText = options.imageFile ? (textFromInput.trim() || (options.captionText || "").trim()) : textFromInput.trim();
    const optimisticMessageId = options.messageId || polyglotHelpers.generateUUID();
    const optimisticTimestamp = options.timestamp || Date.now();

    // Optimistic UI Append (usually handled by modal's own logic, so skipUiAppend might be true)
    if (!options.skipUiAppend) {
        const uiAppendOptions: ChatMessageOptions = { messageId: optimisticMessageId, timestamp: optimisticTimestamp };
        let messageContentForUI = userMessageText;

        if (options.isVoiceMemo && options.audioSrc) {
            uiAppendOptions.isVoiceMemo = true; uiAppendOptions.audioSrc = options.audioSrc;
            messageContentForUI = userMessageText || "[Voice Memo]";
        } else if (options.imageFile) {
            uiAppendOptions.imageUrl = URL.createObjectURL(options.imageFile); uiAppendOptions.type = 'image';
            messageContentForUI = userMessageText;
        } else if (!userMessageText.trim() && !options.imageFile && !options.isVoiceMemo) {
            console.log(`[TMH] (${context}) Modal message is empty text. Skipping UI append by TMH and send.`);
            uiUpdater.resetMessageModalInput?.();
            return;
        }
        if (messageContentForUI.trim() || uiAppendOptions.isVoiceMemo || uiAppendOptions.type === 'image') {
            uiUpdater.appendToMessageLogModal?.(messageContentForUI, 'user', uiAppendOptions);
        }
    }

    if (options.imageFile) {
        // ***** IMAGE SENDING LOGIC for Modal (similar to embedded) *****
        console.log(`${functionName}: Processing user image for ${context} chat ${conversationId}.`);
        let base64DataForAI: string | null = null;
        let mimeTypeForAI: string | null = null;
        let resolvedImgurUrl: string | null = null;

        try {
            base64DataForAI = await polyglotHelpers.fileToBase64(options.imageFile);
            mimeTypeForAI = options.imageFile.type;
        } catch (e) {
            console.error(`${functionName}: Error converting image to base64 (modal).`, e);
            uiUpdater.appendToMessageLogModal?.("Error preparing image. Please try again.", 'system-error', { messageId: polyglotHelpers.generateUUID(), isError: true });
        }

        const imgurUploadPromise = uploadImageToImgur(options.imageFile).catch(err => {
            console.error(`[TMH_Imgur] (${context}): Imgur upload failed for "${options.imageFile?.name}".`, err);
            return null;
        });

        showTypingIndicatorFor(conversationId, context);
        const controller = interruptAndTrackAiOperation(connector.id);
        let aiConversationalReply = "Let me see that image...";
        let aiSemanticDescription = "Image analysis was not performed or an error occurred.";

        if (base64DataForAI && mimeTypeForAI) {
            try {
                // AI Prompt for image analysis (same as embedded)
                const preamble = getMultimodalPreamble(connector);
                let recentChatHistoryText = "";
                const currentConversationMessages = conversationManager.getConversationById(conversationId)?.messages;
                if (currentConversationMessages) {
                    const recentMessages = currentConversationMessages.slice(-10);
                    recentChatHistoryText = recentMessages.map(msg => {
                        const speakerName = msg.sender === 'user' ? 'You' : (connector.profileName || 'Partner');
                        const messageText = msg.text || (msg.type === 'image' ? '[image]' : (msg.type === 'voice_memo' ? '[voice memo]' : '[system event]'));
                        return `[${speakerName}]: ${messageText}`;
                    }).join('\n');
                }
                 const promptForAI = `
${preamble}
**Recent Conversation Context (Last few messages):**
${recentChatHistoryText || "[No recent messages before this image.]"}
---
A user has now sent you an image.
The user's caption for this new image is: "${userMessageText || 'No caption provided.'}"
**CRITICAL LANGUAGE INSTRUCTION: You MUST speak and respond ONLY in ${connector.language}. Do not use any other language unless told by the user**
**Your Current Task:**
You must respond to this new image and caption. Your response MUST be structured precisely as follows:
1.  First, provide your natural, in-character conversational reply. This reply should be based on the image content you've analyzed and the user's caption. It must reflect what your persona (${connector.profileName}) would actually say in the chat. Consider your persona's interests, personality, and the recent conversation context when crafting this reply.
2.  After your conversational reply, you MUST include a separator line consisting of exactly three hyphens: \`---\`
3.  Immediately following the "---" separator, you MUST provide a detailed, factual, and objective third-person description of the image in ENGLISH. This description is strictly for database and accessibility purposes.
    This factual description MUST be enclosed in special tags: \`[IMAGE_DESCRIPTION_START]\` at the beginning and \`[IMAGE_DESCRIPTION_END]\` at the end.
    Inside these tags, describe: Main Subject, Setting/Background, Key Objects/Elements, Colors & Lighting, and any identifiable People/Characters/Celebrities (e.g., Taylor Swift, Barack Obama, LeBron James, Bugs Bunny).
**Critical Output Language Reminder:** Your conversational reply (Part 1) MUST be ONLY in ${connector.language}. The factual description (Part 3) MUST be in ENGLISH. Adherence to this is paramount.
Example of the required output structure (if language was English):
That's a stunning photo of the Grand Canyon! The way the light hits the canyon walls is just breathtaking. Makes me want to go hiking there. What time of day did you take this?
---
[IMAGE_DESCRIPTION_START]
A wide-angle photograph of the Grand Canyon at what appears to be late afternoon. The canyon walls show layers of red, orange, and brown rock. The sky is mostly clear with some wispy clouds. Shadows are beginning to lengthen across the canyon floor. No people are visible in this shot.
[IMAGE_DESCRIPTION_END]
IMPORTANT: Do NOT include the phrases "PART 1", "PART 2", or any instructional numbering (like "1.", "2.") in your actual output. Just follow the structure: conversational reply, then "---", then the tagged factual description.
                `;

                const rawAiResponse = await aiService.generateTextFromImageAndText(
                    base64DataForAI, mimeTypeForAI, connector,
                    getHistoryForAiCall(await conversationManager.getGeminiHistoryForConnector(conversationId), true),
                    promptForAI, undefined, controller.signal
                );
                // ... (parse rawAiResponse for aiConversationalReply and aiSemanticDescription, same as embedded)
                 if (typeof rawAiResponse === 'string' && rawAiResponse.trim()) {
                    const separator = "---";
                    const separatorIndex = rawAiResponse.indexOf(separator);
                    if (separatorIndex !== -1) {
                        aiConversationalReply = rawAiResponse.substring(0, separatorIndex).trim();
                        const descriptionPart = rawAiResponse.substring(separatorIndex + separator.length).trim();
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const descStartIndex = descriptionPart.indexOf(descStartTag);
                        const descEndIndex = descriptionPart.lastIndexOf(descEndTag);
                        if (descStartIndex !== -1 && descEndIndex > descStartIndex) {
                            aiSemanticDescription = descriptionPart.substring(descStartIndex + descStartTag.length, descEndIndex).trim();
                        } else { aiSemanticDescription = descriptionPart; }
                    } else {
                        aiConversationalReply = rawAiResponse.trim();
                        aiSemanticDescription = "AI did not provide a structured description (no separator).";
                    }
                } else { aiConversationalReply = "I couldn't quite process that image (modal)."; }

            } catch (error: any) {
                // ... (error handling, same as embedded)
                if (error.name === 'AbortError') console.log(`${functionName}: AI image processing aborted (modal).`);
                else {
                    console.error(`${functionName}: Error during AI image processing (modal):`, error);
                    aiConversationalReply = "Sorry, had trouble with that image (modal).";
                }
            }
        } else { aiConversationalReply = "Couldn't make out the image (modal processing error)."; }

        resolvedImgurUrl = await imgurUploadPromise;
        // ... (log Imgur URL)

        await conversationManager.addMessageToConversation(
            conversationId, userMessageText, 'image',
            { imageUrl: resolvedImgurUrl, imageSemanticDescription: aiSemanticDescription, messageIdToUse: optimisticMessageId }
        );
        // ... (log save)

        clearTypingIndicatorFor(conversationId);
        if (aiConversationalReply) {
            // ... (playAiResponseScene, same as embedded)
            const responseLines = intelligentlySeparateText(aiConversationalReply, connector, { probability: 1.0 }).split('\n').filter(Boolean);
            if (responseLines.length > 0) await playAiResponseScene(responseLines, conversationId, connector, context);
            else if (base64DataForAI) await playAiResponseScene(["Interesting image!"], conversationId, connector, context);
        }
        if (activeAiOperations.get(connector.id) === controller) activeAiOperations.delete(connector.id);

    } else {
        // ***** TEXT-ONLY or VOICE MEMO LOGIC for Modal (consistent with embedded) *****
        if (!userMessageText.trim() && !options.isVoiceMemo && !options.imageFile) {
            console.log(`[TMH] (${context}) Modal message empty. Aborting.`);
            uiUpdater.resetMessageModalInput?.();
            return;
        }

        let messageTypeForSave: 'text' | 'voice_memo' = 'text';
        let extraDataForSave: { messageIdToUse: string; content_url?: string | null } = { messageIdToUse: optimisticMessageId };

        if (options.isVoiceMemo) {
            messageTypeForSave = 'voice_memo';
            if (options.audioSrc) extraDataForSave.content_url = options.audioSrc;
            else console.warn(`[TMH] (${context}) Modal voice memo no audioSrc.`);
        }

        if (userMessageText.trim() || messageTypeForSave === 'voice_memo') {
            await conversationManager.addMessageToConversation(
                conversationId, userMessageText, messageTypeForSave, extraDataForSave
            );
            console.log(`[TMH] (${context}) User's ${messageTypeForSave} (AppID: ${optimisticMessageId}) saved.`);
        }  if (userMessageText.trim() && window.memoryService?.processNewUserMessage) {
            console.log(`[CEREBRUM_WRITE] ✍️ User spoke in Modal. Sending to Scribe for analysis...`);
            window.memoryService.processNewUserMessage(
                userMessageText,
                connector.id,
                'one_on_one',
                []
            );
        }
        if (userMessageText.trim() && window.memoryService?.processNewUserMessage) {
            console.log(`[CEREBRUM_WRITE] ✍️ User spoke in Modal. Sending to Scribe for analysis...`);
            window.memoryService.processNewUserMessage(
                userMessageText,
                connector.id,
                'one_on_one',
                []
            );
        }
        showTypingIndicatorFor(conversationId, context);
        const controller = interruptAndTrackAiOperation(connector.id);
        try {
            const historyForAI = await conversationManager.getGeminiHistoryForConnector(conversationId);
            const aiResponseText = await aiService.generateTextMessage(
                userMessageText, connector, getHistoryForAiCall(historyForAI, false),
                undefined, false, 'one-on-one', controller.signal
            );
            clearTypingIndicatorFor(conversationId);

            if (aiResponseText && typeof aiResponseText === 'string') {
                const voiceMsgStartTag = "[VOICE_MESSAGE_START]";
                const voiceMsgEndTag = "[VOICE_MESSAGE_END]";

                if (aiResponseText.includes(voiceMsgStartTag) && aiResponseText.includes(voiceMsgEndTag)) {
                    // ... (AI Voice Memo handling: TTS, Supabase, save, same as embedded)
                    const startIndex = aiResponseText.indexOf(voiceMsgStartTag) + voiceMsgStartTag.length;
                    const endIndex = aiResponseText.indexOf(voiceMsgEndTag);
                    const textForTts = aiResponseText.substring(startIndex, endIndex).trim();

                    if (textForTts) {
                        const geminiTts = window.geminiTtsService as GeminiTtsService | undefined;
                        if (geminiTts && geminiTts.getTTSAudio) {
                            showTypingIndicatorFor(conversationId, context);
                    
                            // --- MODIFICATION TO DETERMINE LANGUAGE CODE FOR TTS API ---
                            let langCodeForTtsApi = connector.languageCode; // Default to the connector's primary language BCP-47 code
                    
                            // Check if there's a language-specific override for the current connector language
                            if (connector.languageSpecificCodes && connector.languageSpecificCodes[connector.language]) {
                                const langSpecifics = connector.languageSpecificCodes[connector.language];
                                if (langSpecifics.liveApiSpeechLanguageCodeOverride) {
                                    langCodeForTtsApi = langSpecifics.liveApiSpeechLanguageCodeOverride;
                                    console.log(`[TMH] TTS: Using language override for API: ${langCodeForTtsApi} (Original: ${connector.languageCode}) for voice ${connector.liveApiVoiceName || 'default'}`);
                                }
                            }
                            // --- END OF MODIFICATION ---
                    
                            const ttsResult = await geminiTts.getTTSAudio(
                                textForTts, 
                                langCodeForTtsApi, // Pass the potentially overridden language code
                                connector.liveApiVoiceName || undefined // Pass the persona's voice name
                                // stylePrompt is not used in the current Gemini TTS payload, so pass undefined or null
                            );
                            clearTypingIndicatorFor(conversationId);
                    
                            if (ttsResult?.audioBase64) {
                                const audioBlob = base64ToBlob(ttsResult.audioBase64, ttsResult.mimeType);
                                const aiMessageId = polyglotHelpers.generateUUID();
                                const fileExtension = ttsResult.mimeType.split('/')[1]?.split(';')[0] || 'mp3';
                                const supabaseFilePath = `ai_voice_memos/${context}/${conversationId}/${aiMessageId}.${fileExtension}`;
                                const supabaseAudioUrl = await uploadAudioToSupabase(audioBlob, supabaseFilePath);
                                if (supabaseAudioUrl) {
                                    await conversationManager.addMessageToConversation(
                                        conversationId, textForTts, 'voice_memo',
                                        { content_url: supabaseAudioUrl, senderId: connector.id, messageIdToUse: aiMessageId }
                                    );
                                } else { 
                                    console.error("Supabase upload failed for AI voice memo. Sending as text.");
                                    throw new Error("Supabase upload failed for AI voice (modal)."); }
                            } else { throw new Error("TTS failed for AI voice (modal)."); }
                        } else { // Fallback to text
                            const processedText = intelligentlySeparateText(textForTts, connector, { probability: 1.0 });
                            await playAiResponseScene(processedText.split('\n').filter(Boolean), conversationId, connector, context);
                        }
                    } else { /* Empty tag, play fallback */ await playAiResponseScene(["(AI tried empty voice msg)"], conversationId, connector, context); }
                } else { // Regular AI text response
                    const processedText = intelligentlySeparateText(aiResponseText, connector, { probability: 1.0 });
                    const responseLines = processedText.split('\n').filter(Boolean);
                    if (responseLines.length > 0) await playAiResponseScene(responseLines, conversationId, connector, context);
                }
            } else if (aiResponseText === null && !controller.signal.aborted) {
                // ... (handle null AI response, same as embedded)
                 uiUpdater.appendToMessageLogModal?.("Not sure how to reply (modal).", 'connector-error', { /* ... */ });
            } else if (controller.signal.aborted) { console.log(`${functionName}: AI modal text/voice aborted.`); }

        } catch (error: any) {
            // ... (error handling, same as embedded)
            clearTypingIndicatorFor(conversationId);
            if (error.name !== 'AbortError') {
                await playAiResponseScene([`Apologies, error responding (modal): ${error.message}`], conversationId, connector, context);
            }
        } finally {
            clearTypingIndicatorFor(conversationId);
            if (activeAiOperations.get(connector.id) === controller) activeAiOperations.delete(connector.id);
        }
    }
    uiUpdater.resetMessageModalInput?.();
}


     

        console.log("text_message_handler.ts: IIFE for actual methods FINISHED.");
        return {
            sendEmbeddedTextMessage,
            handleEmbeddedImageUpload,
            sendModalTextMessage,
            handleModalImageUpload
        };
    })(); 

    if (window.textMessageHandler) {
        Object.assign(window.textMessageHandler, methods);
        (window.textMessageHandler as any).__functionalReady = true;
        console.log("text_message_handler.ts: SUCCESSFULLY populated window.textMessageHandler with real methods.");
    } else {
        console.error("text_message_handler.ts: CRITICAL ERROR - window.textMessageHandler placeholder was unexpectedly missing.");
        window.textMessageHandler = methods;
         (window.textMessageHandler as any).__functionalReady = true;
    }
    document.dispatchEvent(new CustomEvent('textMessageHandlerReady'));
    console.log('text_message_handler.ts: "textMessageHandlerReady" (FULLY FUNCTIONAL) event dispatched.');
}

// Dependency checking logic is now correctly INSIDE the initializeActualTextMessageHandler function
const dependenciesForTMH_Functional = [
    'uiUpdaterReady',
    'aiServiceReady',
    'conversationManagerReady',
    'domElementsReady',
    'polyglotHelpersReady',
    'aiApiConstantsReady',
    'activityManagerReady',
    'modalHandlerReady'
];
const tmhMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForTMH_Functional.forEach((dep: string) => tmhMetDependenciesLog[dep] = false);
let tmhDepsMet = 0;

function checkAndInitTMH(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'uiUpdaterReady': 
                verified = !!(window.uiUpdater && typeof window.uiUpdater.appendToEmbeddedChatLog === 'function'); 
                break;
            case 'aiServiceReady': 
                verified = !!(window.aiService && typeof window.aiService.generateTextMessage === 'function'); 
                break;
            case 'conversationManagerReady': 
                verified = !!(window.conversationManager && typeof window.conversationManager.ensureConversationRecord === 'function'); 
                break;
            case 'domElementsReady': 
                verified = !!window.domElements; 
                break;
            case 'polyglotHelpersReady': 
                verified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function'); 
                break;
            case 'aiApiConstantsReady': 
                verified = !!(window.aiApiConstants && window.aiApiConstants.PROVIDERS); 
                break;
            case 'activityManagerReady': 
                verified = !!(window.activityManager && typeof window.activityManager.simulateAiTyping === 'function'); 
                break;
            case 'modalHandlerReady': 
                verified = !!(window.modalHandler && typeof window.modalHandler.open === 'function'); 
                break;
            default: 
                console.warn(`TMH_EVENT: Unknown event ${receivedEventName}`); 
                return;
        }

        if (verified && !tmhMetDependenciesLog[receivedEventName]) {
            tmhMetDependenciesLog[receivedEventName] = true;
            tmhDepsMet++;
            console.log(`TMH_DEPS: Event '${receivedEventName}' VERIFIED. Count: ${tmhDepsMet}/${dependenciesForTMH_Functional.length}`);
        } else if(!verified){
            console.warn(`TMH_DEPS: Event '${receivedEventName}' FAILED verification.`);
        }
    }

    if (tmhDepsMet === dependenciesForTMH_Functional.length) {
        console.log('text_message_handler.ts: All core functional dependencies met. Initializing actual TextMessageHandler.');
        initializeActualTextMessageHandler();
    }
}

console.log('TMH_SETUP: Starting initial dependency pre-check for functional TextMessageHandler.');
tmhDepsMet = 0;
Object.keys(tmhMetDependenciesLog).forEach(key => tmhMetDependenciesLog[key] = false);
let tmhAllPreloadedAndVerified = true;

dependenciesForTMH_Functional.forEach((eventName: string) => {
    let isVerifiedNow = false;
    switch (eventName) {
        case 'uiUpdaterReady': 
            isVerifiedNow = !!(window.uiUpdater && typeof window.uiUpdater.appendToEmbeddedChatLog === 'function'); 
            break;
        case 'aiServiceReady': 
            isVerifiedNow = !!(window.aiService && typeof window.aiService.generateTextMessage === 'function'); 
            break;
        case 'conversationManagerReady': 
            isVerifiedNow = !!(window.conversationManager && typeof window.conversationManager.ensureConversationRecord === 'function'); 
            break;
        case 'domElementsReady': 
            isVerifiedNow = !!window.domElements; 
            break;
        case 'polyglotHelpersReady': 
            isVerifiedNow = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function'); 
            break;
        case 'aiApiConstantsReady': 
            isVerifiedNow = !!(window.aiApiConstants && window.aiApiConstants.PROVIDERS); 
            break;
         case 'activityManagerReady':
                isVerifiedNow = !!(window.activityManager && typeof window.activityManager.simulateAiTyping === 'function' && !(window.activityManager as any).isPlaceholder);
                break;
        case 'modalHandlerReady': 
            isVerifiedNow = !!(window.modalHandler && typeof window.modalHandler.open === 'function'); 
            break;
        default: 
            console.warn(`TMH_PRECHECK: Unknown functional dependency: ${eventName}`); 
            break;
    }

    if (isVerifiedNow) {
        console.log(`TMH_PRECHECK: Functional Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!tmhMetDependenciesLog[eventName]) {
            tmhMetDependenciesLog[eventName] = true;
            tmhDepsMet++;
        }
    } else {
        tmhAllPreloadedAndVerified = false;
        console.log(`TMH_PRECHECK: Functional Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitTMH(eventName), { once: true });
    }
});

if (tmhAllPreloadedAndVerified && tmhDepsMet === dependenciesForTMH_Functional.length) {
    console.log('text_message_handler.ts: All functional dependencies ALREADY MET during pre-check. Initializing directly.');
    initializeActualTextMessageHandler();
} else if (!tmhAllPreloadedAndVerified && dependenciesForTMH_Functional.length > 0) {
    console.log(`text_message_handler.ts: Waiting for ${dependenciesForTMH_Functional.length - tmhDepsMet} functional dependency event(s).`);
} else if (dependenciesForTMH_Functional.length === 0) {
    console.log('text_message_handler.ts: No functional dependencies listed. Initializing directly.');
    initializeActualTextMessageHandler();
}

console.log("text_message_handler.ts: Script execution finished. Initialization is event-driven or direct.");
// The 'textMessageHandlerReady' event dispatch is now solely handled within initializeActualTextMessageHandler upon success.
