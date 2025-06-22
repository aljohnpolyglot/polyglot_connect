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
    ModalHandler // <<< THIS IS THE FIX. WE ARE NOW IMPORTING THE TYPE.
} from '../types/global.d.ts';
import { SEPARATION_KEYWORDS } from '../constants/separate_text_keywords.js';
import { DOTTED_EXCEPTIONS } from '../constants/separate_text_keywords.js';
console.log('text_message_handler.ts: Script loaded, waiting for core dependencies.');

// =================== START: NEW CANCELLATION LOGIC ===================
// in text_message_handler.ts at the very top

// =================== ADD THIS IMPORT LINE ===================
import { getGroupPersonaSummary, getTimeAwarenessAndReasonPrompt } from './persona_prompt_parts';
// ============================================================
// Map to track ongoing AI generation calls for each conversation.
// Key: targetId (string), Value: AbortController
const activeAiOperations = new Map<string, AbortController>();
const activeTypingIndicators = new Map<string, HTMLElement>();


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
}
function initializeActualTextMessageHandler(): void {
    console.log('text_message_handler.ts: initializeActualTextMessageHandler() for FULL method population called.');

    const getSafeDeps = (functionName: string = "TextMessageHandler internal"): TextMessageHandlerDeps | null => {
        const deps = {
            uiUpdater: window.uiUpdater,
            aiService: window.aiService,
            conversationManager: window.conversationManager,
            domElements: window.domElements,
            polyglotHelpers: window.polyglotHelpers,
            chatOrchestrator: window.chatOrchestrator,
            aiApiConstants: window.aiApiConstants,
            activityManager: window.activityManager,
            modalHandler: window.modalHandler // <<< ADD THIS
        };
        // This line assumes you added `modalHandler` to the TextMessageHandlerDeps interface in global.d.ts
        const criticalKeys: (keyof Omit<TextMessageHandlerDeps, 'chatOrchestrator'>)[] = ['uiUpdater', 'aiService', 'conversationManager', 'domElements', 'polyglotHelpers', 'aiApiConstants', 'activityManager', 'modalHandler']; // <<< AND ADD IT HERE
     
        for (const key of criticalKeys) {
            if (!deps[key]) {
                console.error(`TMH (${functionName}): CRITICAL MISSING window.${key}.`);
                return null;
            }
        }
        if (!deps.chatOrchestrator) {
            console.warn(`TMH (${functionName}): chatOrchestrator not yet available. Methods may need to fetch it dynamically.`);
        }
        return deps as TextMessageHandlerDeps; // This correctly returns deps even if chatOrchestrator is missing (as it's optional)
    };

    const resolvedFunctionalDeps = getSafeDeps("Full TMH Initialization");

    if (!resolvedFunctionalDeps) {
        console.error("text_message_handler.ts: CRITICAL - Functional dependencies not ready for full TMH setup. Methods will remain placeholders.");
        if (!(window.textMessageHandler as any).__functionalReady) {
             document.dispatchEvent(new CustomEvent('textMessageHandlerReady'));
             console.warn('text_message_handler.ts: "textMessageHandlerReady" (DUMMY) event dispatched due to missing deps.');
        }
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

// ===================  END: REPLACE WITH THIS LANGUAGE-AWARE FUNCTION  ===================
// ===================  END: ADD THIS ENTIRE NEW HELPER FUNCTION  ===================
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
 * Renders a sequence of AI messages with realistic, word-count-based delays
 * and typing indicators, specifically for 1v1 chats. It also removes trailing
 * periods from very short messages for naturalism.
 * @param lines The array of message strings from the AI.
 * @param targetId The ID of the connector receiving the messages.
 * @param connector The full Connector object for the AI persona.
 * @param context 'embedded' or 'modal' to direct the UI updates.
 */
// Replace with this new, simplified version
// REPLACE WITH THIS BLOCK

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
    targetId: string,
    connector: Connector,
    context: 'embedded' | 'modal'
): Promise<void> {
    const { uiUpdater, conversationManager } = getSafeDeps("playAiResponseScene")!;
    const appendToLog = context === 'embedded' ? uiUpdater.appendToEmbeddedChatLog : uiUpdater.appendToMessageLogModal;

    for (const [index, line] of lines.entries()) {
        let text = line.trim();
        if (!text) continue;

        // 1. Show the typing indicator. The helper handles clearing any previous one.
        showTypingIndicatorFor(targetId, context);

       // 2. Calculate a realistic typing delay for the current line.
const words = text.trim().split(/\s+/).length;

// Use realistic human WPM to compute base delay
const wpm = 40; // average human typing speed
const wordsPerMs = wpm / 60 / 1000;
let typingDurationMs = words / wordsPerMs;

// Add subtle randomness to avoid robotic timing
typingDurationMs += Math.random() * 500;

// Clamp duration to reasonable min/max
typingDurationMs = Math.max(1200, Math.min(typingDurationMs, 5000));

        
        console.log(`%c[ScenePlayer] Line ${index + 1} for ${connector.profileName}. Words: ${words}. Typing: ${(typingDurationMs / 1000).toFixed(1)}s`, 'color: #8a2be2;');

        // 3. Wait for the typing to "finish".
        await new Promise(resolve => setTimeout(resolve, typingDurationMs));

        // 4. Clear the typing indicator right before showing the message.
        clearTypingIndicatorFor(targetId);

     // 5. Clean up text for naturalism ...
if (text.length < 12 && text.endsWith('.') && !text.endsWith('..')) {
    text = text.slice(0, -1);
}

// 6. Generate a UNIQUE ID and timestamp for this specific message bubble.
const messageId = polyglotHelpers.generateUUID();
const timestamp = Date.now();

// 7. Append the actual message bubble to the UI, passing the new ID.
appendToLog?.(text, 'connector', {
    avatarUrl: connector.avatarModern,
    senderName: connector.profileName,
    timestamp: timestamp,
    connectorId: connector.id,
    messageId: messageId // Pass the ID to the UI
});

// 8. Save the message to history, also passing the SAME ID and timestamp.
await conversationManager.addModelResponseMessage(targetId, text, messageId, timestamp);

// 9. Add a short "reading" pause ...
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

        async function sendEmbeddedTextMessage(
            textFromInput: string,
            currentEmbeddedChatTargetId: string | null,
            options: {
                skipUiAppend?: boolean;
                isVoiceMemo?: boolean;
                audioBlobDataUrl?: string | null;
                messageId?: string;
                timestamp?: number;
                imageFile?: File | null;
                captionText?: string | null;
            } = {}
        ): Promise<void> {

            const { checkAndIncrementUsage } = await import('./usageManager');
            const { openUpgradeModal } = await import('../ui/modalUtils');
            const usageResult = await checkAndIncrementUsage('textMessages');
            if (!usageResult.allowed) {
                console.log("TMH: User has reached text message limit. Showing upgrade modal.");
                const { modalHandler, domElements } = getSafeDeps("Upgrade Modal Trigger")!;
                if (modalHandler && domElements?.upgradeLimitModal) {
                    modalHandler.open(domElements.upgradeLimitModal);
                } else {
                    alert(`You've reached your monthly message limit for the ${usageResult.plan} plan. Please upgrade for unlimited messages!`);
                }
                // IMPORTANT: Re-enable the send button and stop execution
                if (uiUpdater && !options.skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                openUpgradeModal('text', usageResult.daysUntilReset); // We will create this function next
                return; 
            }




            const { imageFile, captionText, isVoiceMemo, audioBlobDataUrl: optionsAudioBlobUrl, skipUiAppend, messageId: optionsMessageId, timestamp: optionsTimestamp } = options;
            if (currentEmbeddedChatTargetId) clearTypingIndicatorFor(currentEmbeddedChatTargetId); // <<< ADD THIS LINE
            const functionName = "sendEmbeddedTextMessage";

           
            
            const text = textFromInput?.trim() || "";

            const userMessageTimestamp = optionsTimestamp || Date.now();
            const userMessageId = optionsMessageId || polyglotHelpers.generateUUID();

            if (!currentEmbeddedChatTargetId) {
                console.warn(`TMH.${functionName}: Missing targetId.`);
                if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                return;
            }

            if (!isVoiceMemo && !imageFile && !text) {
                console.warn(`TMH.${functionName}: Empty message (not voice memo, no image).`);
                if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                return;
            }

            const record = await conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
            const convo = record.conversation as ConversationRecordInStore | null;

            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or missing connector for ID: ${currentEmbeddedChatTargetId}`);
                if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                return;
            }
            const currentConnector: Connector = convo.connector;

            let imageUrlForDisplay: string | undefined = undefined;
            let imagePartsForGemini: Array<{ inlineData: { mimeType: string; data: string; } }> | undefined = undefined;
            let imageSemanticDescriptionForStore: string | undefined = undefined;

            if (imageFile) {
                console.log(`TMH.${functionName}: Processing image "${imageFile.name}" with caption "${captionText || text}"`);
                let base64StringForStore: string; // Declare here

                try {
                    base64StringForStore = await polyglotHelpers.fileToBase64(imageFile); // Assign here
                    const base64DataForApi = base64StringForStore.split(',')[1];
                    imagePartsForGemini = [{ inlineData: { mimeType: imageFile.type, data: base64DataForApi } }];
                    console.log(`TMH.${functionName}: Image converted to base64 for AI. MimeType: ${imageFile.type}`);
                    
                    // imageUrlForDisplay will now be the base64 string for storage purposes.
                    // If skipUiAppend is true (which it is for images from chat_event_listeners),
                    // TMH doesn't need its own temporary blob for UI.
                    imageUrlForDisplay = base64StringForStore;
                    // The user's actual text (caption or message text if image sent with text input field)
                    const userProvidedTextForContext = captionText || text || "";

                    if (aiService.generateTextFromImageAndText && convo.connector) {
                        // --- NEW, MORE FOCUSED PROMPT FOR INITIAL DESCRIPTION ---
                        const specificDescriptionPrompt = `You are an image analysis AI. 
                        Your ONLY task is to provide a concise, factual, and objective description of the visual content of the image itself. 
                        Speak in ${convo.connector.language || 'English'}.
                        Describe only what you visually see in THIS SPECIFIC IMAGE. 
                        If there are recognizable people, landmarks, or specific types of places or famous persons, try to identify them if you are reasonably confident. 
                        Do NOT add any conversational elements, greetings, or refer to the user.
                        If the user provided any text with the image ("${userProvidedTextForContext || 'none'}"), use it as minor context if it helps identify an object, but your primary focus is the visual content.
                        Keep the description to 1-2 sentences.`;
                        // --- END NEW PROMPT ---

                        console.log(`TMH.${functionName}: Calling AI for initial semantic description with focused prompt.`);
                        const desc = await aiService.generateTextFromImageAndText(
                            base64DataForApi,
                            imageFile.type,
                            convo.connector, // Connector is still useful for language context
                            [], // Empty history for a clean description
                            specificDescriptionPrompt, // Use the new, focused prompt
                            aiApiConstants.PROVIDERS.TOGETHER // Or your preferred provider for this task
                        );

                        if (desc && typeof desc === 'string' && !desc.startsWith("[") && !desc.toLowerCase().includes("hearing you") && !desc.toLowerCase().includes("trouble understanding")) {
                            imageSemanticDescriptionForStore = desc.trim();
                            console.log(`TMH.${functionName}: AI generated initial image description: "${imageSemanticDescriptionForStore}"`);
                        } else if (desc && typeof desc === 'string') {
                            console.warn(`TMH.${functionName}: AI description was a placeholder, error, or irrelevant: "${desc}"`);
                            imageSemanticDescriptionForStore = undefined; // Explicitly set to undefined if bad
                        } else {
                            console.warn(`TMH.${functionName}: AI description was not a string or was null.`);
                            imageSemanticDescriptionForStore = undefined;
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.error(`TMH.${functionName}: Error processing image:`, error);
                    if (!skipUiAppend) {
                         uiUpdater.appendToEmbeddedChatLog?.("Error processing image.", 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                    }
                    if (imageUrlForDisplay) URL.revokeObjectURL(imageUrlForDisplay);
                    if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                    return;
                }
            }

            let textForDisplayAndStore: string;
            let typeForStore: string = 'text';
            const messageExtraData: Partial<MessageInStore> = { // Explicitly typed if MessageInStore is available
                id: userMessageId,
                timestamp: userMessageTimestamp
            };

            if (imageFile) {
                typeForStore = 'image';
                
                let userProvidedTextForImage: string | null = null;
                if (captionText) {
                    userProvidedTextForImage = captionText.trim();
                } else if (text && imageFile) {
                    userProvidedTextForImage = text.trim();
                }
                
                textForDisplayAndStore = userProvidedTextForImage || ""; // <<< FIX: Default to empty string if null
            
                messageExtraData.content_url = imageUrlForDisplay;
                messageExtraData.imagePartsForGemini = imagePartsForGemini;
                if (imageSemanticDescriptionForStore) {
                    messageExtraData.imageInitialDescription = imageSemanticDescriptionForStore;
                }
            } else if (isVoiceMemo) {
                typeForStore = 'voice_memo';
                textForDisplayAndStore = text; // text is already string ("" if empty)
                messageExtraData.isVoiceMemo = true;
                messageExtraData.audioBlobDataUrl = optionsAudioBlobUrl;
            } else { // Plain text message
                textForDisplayAndStore = text; // text is already string ("" if empty)
            }

            if (!skipUiAppend) { // This condition is key
                console.log(`TMH.${functionName}: Appending user message to UI. Text: "${textForDisplayAndStore.substring(0, 30)}", Image: ${!!imageUrlForDisplay}`);
                uiUpdater.appendToEmbeddedChatLog?.(
                    textForDisplayAndStore,
                    'user',
                    {
                        timestamp: userMessageTimestamp,
                        messageId: userMessageId,
                        imageUrl: imageUrlForDisplay // This comes from the image processing block earlier
                    }
                );
            } else {
                console.log(`TMH.${functionName}: Skipping UI append for user message as requested by options.`);
            }

            await conversationManager.addMessageToConversation(
                currentEmbeddedChatTargetId!,
                'user',
                textForDisplayAndStore,
                typeForStore,
                userMessageTimestamp,
                messageExtraData
            );
            
            // This is now the main UI feedback block, triggered for text, voice, and images
            // when the user's message has been handled locally.
            if (!skipUiAppend && uiUpdater) {
                uiUpdater.toggleEmbeddedSendButton?.(false); // Disable send button while AI thinks
            }
          // =================== TWIN TAG: EMBEDDED-USER ===================
          
      
          
          if (window.memoryService && window.memoryService.processNewUserMessage) {
                const userTextToProcess = textForDisplayAndStore || (captionText || "");
                if (userTextToProcess.trim()) {
                    console.log(`[CEREBRUM_WRITE] ✍️ Sending USER'S message to memory service for analysis...`);
                    // We now AWAIT this, forcing it to complete before proceeding.
                 
                    if (window.conversationManager) { // <<< SAFETY CHECK
                        const convoRecord = await window.conversationManager.getConversationById(currentEmbeddedChatTargetId);
                        const recentHistory = convoRecord?.messages.slice(-10) || []; // Increased slice for better context
                        await window.memoryService.processNewUserMessage(
                            userTextToProcess,
                            currentEmbeddedChatTargetId,
                            'one_on_one',
                            recentHistory
                        );
                    }
                    console.log(`[CEREBRUM_WRITE] ✅ USER'S message analysis complete.`);
                }
            }
          
          
          
          
            let aiRespondedSuccessfully = false; // <<< ADD THIS LINE// --- NEW: Show an immediate "thinking" indicator while we wait for the AI ---
            const controller = interruptAndTrackAiOperation(currentEmbeddedChatTargetId);
          
          
          
          
            try {
          
                let promptForAI: string;
                let aiResponseObject: string | null | object; // Declare response object here

                if (imageFile) { // User sent an image (with or without caption)
                    const userProvidedTextWithImage = captionText || textFromInput?.trim() || "";
                    const simplifiedPersonaContext = `You are ${currentConnector.profileName}.
                    You are a native of the Philippines. Your primary language is Tagalog.
                    Your interests include: ${currentConnector.interests?.join(', ') || 'NBA, online games, basketball'}.
                    Your personality traits are: ${currentConnector.personalityTraits?.join(', ') || 'chill, sarcastic, direct'}.
                    You are currently interacting with a user who sent an image.`;
                    
                                        promptForAI = `${simplifiedPersonaContext}
                    
                    The user has shared an image with the caption: "${userProvidedTextWithImage || 'none'}".
                    
                    Your response MUST have two distinct parts, spoken ONLY in Tagalog.
                    
                    Part 1: Your Conversational Comment (as ${currentConnector.profileName}):
                    - React to this image based on YOUR specific personality and interests as defined above.
                    - AVOID generic phrases like "That's a cool picture."
                    - INSTEAD, try one of these persona-driven approaches:
                        - Make a creative observation that reflects your personality.
                        - Ask a question driven by your curiosity and interests.
                        - Share a brief, relevant memory or thought from your own life experiences.
                    - If the user wrote a caption ("${userProvidedTextWithImage || 'none'}"), weave it into your comment naturally.
                    
                    Part 2: CRITICAL - After your conversational comment, you MUST include a special section formatted EXACTLY like this:
                    [IMAGE_DESCRIPTION_START]
                    A concise, factual, and objective description of the visual content of the image itself. Describe only what you visually see in THIS SPECIFIC IMAGE. If there are recognizable people, landmarks, or specific types of places or famous person (e.g., "a Parisian cafe," "Times Square," "a basketball court", "Barack Obama"), try to identify them if you are reasonably confident. Do NOT refer to the user's caption or my previous description (if any) within this factual description part.
                    [IMAGE_DESCRIPTION_END]
                    
                    Example of your full response structure:
                    "Ayos to ah! Mukhang masarap yang laro niyo. [IMAGE_DESCRIPTION_START]Isang larawan ng mga taong naglalaro ng basketball sa isang outdoor court.[IMAGE_DESCRIPTION_END]"
                    
                    Your conversational comment (Part 1) MUST come before the [IMAGE_DESCRIPTION_START] tag. Do not add any text after the [IMAGE_DESCRIPTION_END] tag.
                    `;
                    // =================================== END OF STRIKE 1 =================================== 
                    
                    if (imagePartsForGemini && imagePartsForGemini[0]?.inlineData?.data) {
                        console.log(`TMH.${functionName}: Calling AI (generateTextFromImageAndText) for IMAGE reply.`);
                        aiResponseObject = await (aiService.generateTextFromImageAndText as any)(
                            imagePartsForGemini[0].inlineData.data,
                            imageFile.type,
                            currentConnector,
                            getHistoryForAiCall(undefined, true),    // EMPTY HISTORY for image reply
                            promptForAI,
                            aiApiConstants.PROVIDERS.TOGETHER,
                            controller.signal // <<< ADD THIS
                        );
                    } else {
                        console.error(`TMH.${functionName}: imageFile present but imagePartsForGemini data missing.`);
                        throw new Error("Missing image data for AI call."); // Or handle gracefully
                    }
                } else { // User sent TEXT-ONLY
                    promptForAI = textForDisplayAndStore; // This is the user's text message
                    console.log(`TMH.${functionName}: Calling AI (generateTextMessage) for TEXT reply.`);
                
                    // --- THIS IS THE FIX: Rebuild history right before the AI call ---
                    console.log(`%c[TMH Pre-AI] 🧠 Rebuilding prompt with latest memories for [${currentEmbeddedChatTargetId}]...`, 'color: #6610f2; font-weight: bold;');
                    let historyForAiCall = await conversationManager.getGeminiHistoryForConnector(currentEmbeddedChatTargetId);
                    console.log(`%c[TMH Pre-AI] ✅ Prompt rebuild complete.`, 'color: #28a745; font-weight: bold;');
                
                    // Check if the PREVIOUS message in the store was a call event.
                    // The user's current message is at index (length - 1), so we check (length - 2).
                    if (convo.messages.length >= 2) {
                        const secondToLastMessage = convo.messages[convo.messages.length - 2];
                        if (secondToLastMessage && secondToLastMessage.type === 'call_event') {
                            console.log("TMH: Call event detected as the PREVIOUS message. Injecting context into AI history.");
                            historyForAiCall.push({
                                role: 'user',
                                parts: [{ text: "[A voice call took place between you and the user.]" }]
                            });
                        }
                    }
                // Check if the PREVIOUS message in the store was a call event.
                // The user's current message is at index (length - 1), so we check (length - 2).
                if (convo.messages.length >= 2) {
                    const secondToLastMessage = convo.messages[convo.messages.length - 2];
                    if (secondToLastMessage && secondToLastMessage.type === 'call_event') {
                        console.log("TMH: Call event detected as the PREVIOUS message. Injecting context into AI history.");
                        historyForAiCall.push({
                            role: 'user',
                            parts: [{ text: "[A voice call took place between you and the user.]" }]
                        });
                    }
                }
                    // --- END: CONTEXT INJECTION FOR CALLS ---
    
                    aiResponseObject = await (aiService.generateTextMessage as any)(
                        promptForAI,
                        currentConnector,
                        historyForAiCall,
                        null, // <<< THE FIX. Pass null to be explicit.
                        false,
                        'one-on-one',
                        controller.signal
                    );
                }

                const aiResponseText = typeof aiResponseObject === 'string'
                ? aiResponseObject
                : (typeof aiResponseObject === 'object' && aiResponseObject !== null
                    ? JSON.stringify(aiResponseObject)
                    : null);


                    console.log(`TMH (Embedded): Received main AI response. Raw aiResponseObject type: ${typeof aiResponseObject}`);
                    if (aiResponseText !== null) {
                        console.log(`TMH (Embedded): Main AI response (stringified): "${aiResponseText.substring(0, 200)}..."`);
                    } else {
                        console.log(`TMH (Embedded): Main AI response was NULL.`);
                    }





                    let isConsideredErrorForThisContext = false;
                    const isBlockedResponse = typeof aiResponseText === 'string' && aiResponseText.startsWith("(My response was blocked:");
    
                    if (aiResponseText === null) {
                        isConsideredErrorForThisContext = true;
                        if (!skipUiAppend) uiUpdater.appendToEmbeddedChatLog?.("Sorry, I couldn't generate a response right now.", 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                        console.warn("TMH (Embedded): AI response was null.");
                    } else if (isBlockedResponse) {
                        isConsideredErrorForThisContext = true;
                        if (!skipUiAppend) uiUpdater.appendToEmbeddedChatLog?.(aiResponseText, 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                        console.warn(`TMH (Embedded): AI response was a blocked response: "${aiResponseText}"`);
                    } else if (imageFile) {
                        // For image replies, we are more tolerant of "human-like errors" initially,
                        // because we want to attempt parsing for [IMAGE_DESCRIPTION_START] anyway.
                        // The parsing logic itself will handle if the content is bad.
                        // We only consider it a "human-like error" here if it's one of the *very generic* confused replies
                        // AND our parsing fails to find the description tags.
                        console.log(`TMH (Embedded): Image file present. Will proceed to parsing. Raw AI response: "${aiResponseText.substring(0,100)}..."`);
                    } else {
                        // For TEXT-ONLY replies, the original isHumanError check is fine.
                        const isTextReplyHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseText || "");
                        if (isTextReplyHumanError) {
                            isConsideredErrorForThisContext = true;
                            if (!skipUiAppend) uiUpdater.appendToEmbeddedChatLog?.(aiResponseText, 'connector-error', { isError: true, isSystemLikeMessage: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                            console.warn(`TMH (Embedded): AI TEXT response was a human-like error: "${aiResponseText}"`);
                        }
                    }
    
                    if (isConsideredErrorForThisContext) {
                        // Nothing more to do if we've decided it's an error we can't recover from here.
                    } else {
                        // This is where the successful AI response is handled (or attempted parsing for images)
                        if (imageFile && typeof aiResponseText === 'string') {
        console.log(`TMH (Embedded): Processing successful AI response for IMAGE.`);
        // --- IMAGE RESPONSE PATH FOR EMBEDDED CHAT ---
        let conversationalReply = aiResponseText; // Initial assignment
        let extractedImageDescription: string | undefined = undefined;
        const descStartTag = "[IMAGE_DESCRIPTION_START]";
        const descEndTag = "[IMAGE_DESCRIPTION_END]";
        const startIndex = aiResponseText.indexOf(descStartTag);
        const endIndex = aiResponseText.indexOf(descEndTag);

        if (startIndex !== -1 && endIndex > startIndex) {
            extractedImageDescription = aiResponseText.substring(startIndex + descStartTag.length, endIndex).trim();
            conversationalReply = aiResponseText.substring(0, startIndex).trim();
            console.log(`TMH (Embedded): Parsed image response. Conversational: "${conversationalReply.substring(0,30)}...", Description: "${(extractedImageDescription || "").substring(0,50)}..."`);
        } else {
            conversationalReply = aiResponseText.trim(); // Treat whole response as conversational if no tags
            console.warn(`TMH (Embedded): Image description tags not found in AI response. Full response treated as conversational: "${aiResponseText.substring(0,50)}..."`);
        }

        // --- NEW FALLBACK LOGIC ---
        let textToDisplayForScene = conversationalReply; 

        if (!textToDisplayForScene && extractedImageDescription) {
            console.warn(`TMH (Embedded): AI provided an image description but no conversational comment. Using description as the reply text.`);
            textToDisplayForScene = extractedImageDescription; 
        }
        // --- END NEW FALLBACK LOGIC ---

        // Update the original user message in the store with the extracted description (if any)
        if (extractedImageDescription && userMessageId) {
            const convoRecordForUpdate = conversationManager.getConversationById(currentEmbeddedChatTargetId);
            if (convoRecordForUpdate?.messages) {
                const msgIndex = convoRecordForUpdate.messages.findIndex((m: MessageInStore) => m.id === userMessageId);
                if (msgIndex !== -1) {
                    convoRecordForUpdate.messages[msgIndex].imageSemanticDescription = extractedImageDescription;
                    window.convoStore?.updateConversationProperty(currentEmbeddedChatTargetId, 'messages', [...convoRecordForUpdate.messages]);
                    window.convoStore?.saveAllConversationsToStorage(); // Ensure it's saved
                    console.log(`TMH (Embedded): Updated user image message ${userMessageId} with semantic description in store.`);
                } else {
                    console.warn(`TMH (Embedded): Could not find original user image message ${userMessageId} to update description.`);
                }
            }
        }
        
        // Use textToDisplayForScene (which might be the conversational part or the description)
        const processedText = intelligentlySeparateText(textToDisplayForScene, currentConnector, { probability: 1.0 });
        const responseLines = processedText.split('\n').filter(line => line.trim());
        
        if (responseLines.length > 0) {
            await playAiResponseScene(responseLines, currentEmbeddedChatTargetId, currentConnector, 'embedded');
        } else {
            // If after all fallbacks, there are still no lines to display, show a generic message.
            console.warn("TMH (Embedded): No valid lines to display after processing AI response for image, even after fallback. Displaying generic AI ack.");
            const genericAckId = polyglotHelpers.generateUUID();
            const genericAckTimestamp = Date.now();
            uiUpdater.appendToEmbeddedChatLog?.("I've received your image.", 'connector', {
                avatarUrl: currentConnector.avatarModern,
                senderName: currentConnector.profileName,
                timestamp: genericAckTimestamp,
                connectorId: currentConnector.id,
                messageId: genericAckId
            });
            // Also save this generic acknowledgment to conversation history
            await conversationManager.addModelResponseMessage(currentEmbeddedChatTargetId, "I've received your image.", genericAckId, genericAckTimestamp);
        }
        aiRespondedSuccessfully = true; // Mark success after handling the image reply

    } else if (aiResponseText) { // This is for TEXT-ONLY responses
        // --- TEXT-ONLY RESPONSE PATH FOR EMBEDDED CHAT ---
        // =================== TWIN TAG: EMBEDDED-AI ===================
        if (window.memoryService && window.memoryService.processNewUserMessage) {
            console.log(`[CEREBRUM_WRITE] ✍️ Sending AI's own response to memory service for analysis...`);
            window.memoryService.processNewUserMessage(
                aiResponseText,
                currentEmbeddedChatTargetId,
                'ai_invention'
            );
       }
        console.log(`[Auto-Separator] Raw AI Text (Embedded): "${aiResponseText}"`);
        const processedText = intelligentlySeparateText(aiResponseText, currentConnector, { probability: 1.0 });
        console.log(`[Auto-Separator] Processed Text (Embedded): "${processedText.replace(/\n/g, '\\n')}"`);
        
        const responseLines = processedText.split('\n').filter(line => line.trim());
        await playAiResponseScene(responseLines, currentEmbeddedChatTargetId, currentConnector, 'embedded');
        aiRespondedSuccessfully = true; // Mark success after handling the text reply
    }
}
// --- END OF REPLACEMENT BLOCK ---
// ...

} catch (e: any) {
    clearTypingIndicatorFor(currentEmbeddedChatTargetId); // <<< ADD THIS LINE
    if (e.name === 'AbortError') {
        // This is not a real error. It's the expected result of our cancellation.
        console.log(`%c[Interrupt] AI request for ${currentEmbeddedChatTargetId} was successfully aborted by a new message.`, 'color: #ff9800;');
    } else {
        // This is a real, unexpected error.
        console.error(`TMH.${functionName}: Error during AI response generation:`, e);
        const displayError = polyglotHelpers.sanitizeTextForDisplay(e.message) || "An unexpected error occurred.";
        if (!skipUiAppend) uiUpdater.appendToEmbeddedChatLog?.(displayError, 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
    }
} finally {
    // Clean up the controller from the map if it's the one we created for this operation.
    if (activeAiOperations.get(currentEmbeddedChatTargetId) === controller) {
        activeAiOperations.delete(currentEmbeddedChatTargetId);
    }

    // The rest of your existing finally block
    if (domElements.embeddedMessageSendBtn) {
        domElements.embeddedMessageSendBtn.disabled = false;
    }
    if (aiRespondedSuccessfully) {
        const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
        if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && currentEmbeddedChatTargetId) {
            try {
                await window.memoryService.markInteraction(currentEmbeddedChatTargetId, currentUserId);
            } catch (e) {
                console.error(`TMH.${functionName}: Error marking interaction for ${currentEmbeddedChatTargetId}:`, e);
            }
        }
    }
    getChatOrchestrator()?.notifyNewActivityInConversation?.(currentEmbeddedChatTargetId);
}
        } // End of sendEmbeddedTextMessage

        async function handleEmbeddedImageUpload(event: Event, currentEmbeddedChatTargetId: string | null): Promise<void> {
            const functionName = "handleEmbeddedImageUpload";
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];

            if (!file) { if (target) target.value = ''; return; }
            if (!currentEmbeddedChatTargetId) { console.error(`TMH.${functionName}: Missing targetId.`); if (target) target.value = ''; return; }

            const record = await conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
            const convo = record.conversation as ConversationRecordInStore | null;
            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or connector for ID: ${currentEmbeddedChatTargetId}`);
                if (target) target.value = ''; return;
            }
            const currentConnector: Connector = convo.connector;

            if (file.size > 4 * 1024 * 1024) { alert("Image too large (max 4MB)."); if (target) target.value = ''; return; }

            // Outer scope aiRespondedSuccessfully is not strictly needed here if all logic is within onloadend
            // let aiRespondedSuccessfullyOuter = false; 
            const reader = new FileReader();

            reader.onloadend = async () => {
                const resultString = reader.result as string;
                const base64DataForApi = resultString.split(',')[1];
                const dataUrlForDisplay = resultString;
                const imagePlaceholderTextForStore = "[User sent an image]"; // Or derive a better placeholder

                const imageMessageId = polyglotHelpers.generateUUID();
                const imageTimestamp = Date.now();

                // First, display the user's image in the UI with its unique ID.
                uiUpdater.appendToEmbeddedChatLog?.("", 'user', { 
                    imageUrl: dataUrlForDisplay, 
                    timestamp: imageTimestamp,
                    messageId: imageMessageId 
                });
        
                // Then, save the message to the conversation history with all its data.
                await conversationManager.addMessageToConversation(
                    currentEmbeddedChatTargetId, // <<< FIX: Use the correct variable passed into the function.
                    'user',
                    "[User sent an image]",
                    'image',
                    imageTimestamp,
                    {
                        id: imageMessageId,
                        content_url: dataUrlForDisplay,
                        imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }]
                    }
                );
                uiUpdater.toggleEmbeddedSendButton?.(false);

                const thinkingMsgOptions: ChatMessageOptions = {
                    senderName: currentConnector.profileName?.split(' ')[0],
                    avatarUrl: currentConnector.avatarModern,
                    isThinking: true,
                    connectorId: currentConnector.id
                };
                const thinkingMsg = uiUpdater.appendToEmbeddedChatLog?.(`${thinkingMsgOptions.senderName || 'Partner'} is looking at the image...`, 'connector-thinking', thinkingMsgOptions);
                let aiRespondedSuccessfully = false; // Scoped to onloadend
        
                try {
                    const preamble = getMultimodalPreamble(currentConnector);

                    const PromptForImageAndDescription = `${preamble}
                    
                    The user has just sent an image with no accompanying text. Your response MUST have two distinct parts. Speak ONLY in ${currentConnector.language}.
                    
                    Part 1: Your Conversational Comment (as ${currentConnector.profileName}):
                    - React to this image based on YOUR specific personality. You are: **${currentConnector.personalityTraits?.join(', ') || 'a unique individual'}**.
                    - Let your interests (**${currentConnector.interests?.join(', ') || 'your passions'}**) guide your reaction. For example, if you like history, notice historical details. If you like food, comment on the meal.
                    - AVOID generic phrases like "What's this?" or "Nice photo."
                    - Your goal is to start a conversation. Try one of these persona-driven approaches:
                      - Make a creative observation that reflects your personality (e.g., an 'adventurous' person might say "This looks like it was taken somewhere exciting!").
                      - Ask an open-ended question driven by your curiosity and interests.
                      - Share a brief, relevant memory or thought from your own life experiences that the image sparks.
                    
                    Part 2: CRITICAL - After your conversational comment, you MUST include a special section formatted EXACTLY like this:
                    [IMAGE_DESCRIPTION_START]
                    A concise, factual, and objective description of the visual content of the image itself. Describe only what you visually see in THIS SPECIFIC IMAGE. If there are recognizable people, landmarks, or specific types of places or famous person (e.g., "a Parisian cafe," "Times Square," "a basketball court", "Barack Obama"), try to identify them if you are reasonably confident. Do NOT refer to the user's caption or my previous description (if any) within this factual description part.
                    [IMAGE_DESCRIPTION_END]
                    
                    Example: "Oh, I love the atmosphere in this photo! It feels so calming. [IMAGE_DESCRIPTION_START]A photo of a misty forest path with tall trees.[IMAGE_DESCRIPTION_END]"
                    Your conversational comment (Part 1) MUST come before the [IMAGE_DESCRIPTION_START] tag.`;

const relevantHistoryForAi = getHistoryForAiCall(undefined, true);
// ^^^^^^ relevantHistoryForAi DEFINED ^^^^^^

const aiMsgResponse = await (aiService.generateTextFromImageAndText as any)(
    base64DataForApi,                       // 1
    file.type,                              // 2
    currentConnector,                       // 3
    relevantHistoryForAi,                   // 4. history (now correctly using the helper)
    PromptForImageAndDescription,     // 5. prompt
    aiApiConstants.PROVIDERS.TOGETHER       // 6. preferredProvider
);
                    if (thinkingMsg?.remove) thinkingMsg.remove();
                    let conversationalReply: string | null = null;
                    let extractedImageDescription: string | undefined = undefined;

                    if (typeof aiMsgResponse === 'string') {
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const startIndex = aiMsgResponse.indexOf(descStartTag);
                        const endIndex = aiMsgResponse.indexOf(descEndTag);

                        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                            extractedImageDescription = aiMsgResponse.substring(startIndex + descStartTag.length, endIndex).trim();
                            conversationalReply = aiMsgResponse.substring(0, startIndex).trim();
                            console.log(`TMH.${functionName}: Parsed image response. Conversational: "${(conversationalReply||"").substring(0,30)}...", Description: "${(extractedImageDescription||"").substring(0,50)}..."`);
                        } else {
                            conversationalReply = aiMsgResponse.trim();
                            console.warn(`TMH.${functionName}: Image description tags not found in AI response. Full response treated as conversational.`);
                        }
                    }
                    const aiResponseTextForDisplay = conversationalReply;
                    const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseTextForDisplay || "");
    
                    if (aiResponseTextForDisplay === null) {
                        uiUpdater.appendToEmbeddedChatLog?.("Sorry, I couldn't process the image right now.", 'connector-error', { isError:true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                    } else if (isHumanError) {
                        uiUpdater.appendToEmbeddedChatLog?.(aiResponseTextForDisplay, 'connector-error', { isError:true, isSystemLikeMessage:true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                    } else {
                        const processedText = intelligentlySeparateText(aiResponseTextForDisplay, currentConnector, { probability: 1.0 });
                        const responseLines = processedText.split('\n').filter(line => line.trim());
                        await playAiResponseScene(responseLines, currentEmbeddedChatTargetId, currentConnector, 'embedded');
                        aiRespondedSuccessfully = true;
                    }
    
                    if (extractedImageDescription) {
                        const userImageMessageOriginalId = imageMessageId;
                        console.log(`TMH.${functionName}: Attempting to update original user image message (ID: ${userImageMessageOriginalId}) with description.`);
                        const currentConvoRecord = conversationManager.getConversationById(currentEmbeddedChatTargetId!); // Re-fetch or use existing 'record' if safe
                        if (currentConvoRecord && currentConvoRecord.messages) { // Ensure messages array exists
                            const originalMsgIndex = currentConvoRecord.messages.findIndex(m => m.id === userImageMessageOriginalId);
                            if (originalMsgIndex !== -1) {
                                currentConvoRecord.messages[originalMsgIndex].imageSemanticDescription = extractedImageDescription;
                                if (window.convoStore?.updateConversationProperty && window.convoStore.saveAllConversationsToStorage) {
                                     window.convoStore.updateConversationProperty(currentEmbeddedChatTargetId!, 'messages', [...currentConvoRecord.messages]); // Send a new array to trigger updates if needed
                                     window.convoStore.saveAllConversationsToStorage();
                                     console.log(`TMH.${functionName}: Updated user image message ${userImageMessageOriginalId} with description in store.`);
                                } else {
                                    console.warn(`TMH.${functionName}: convoStore update methods not available to save image description.`);
                                }
                            } else {
                                console.warn(`TMH.${functionName}: Could not find original user image message with ID ${userImageMessageOriginalId} to update description.`);
                            }
                        }
                    }
                } catch (e: any) {
                    if (thinkingMsg?.remove) thinkingMsg.remove();
                    uiUpdater.appendToEmbeddedChatLog?.(`Error with image: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                } finally {
                    if (aiRespondedSuccessfully) {
                        const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
                        if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && currentEmbeddedChatTargetId) {
                            try {
                                console.log(`TMH.${functionName}: Marking interaction (after successful AI image response) for ${currentEmbeddedChatTargetId} with user ${currentUserId}.`);
                                await window.memoryService.markInteraction(currentEmbeddedChatTargetId, currentUserId);
                            } catch (e) {
                                console.error(`TMH.${functionName}: Error marking interaction for ${currentEmbeddedChatTargetId}:`, e);
                            }
                        }
                    }
                    uiUpdater.toggleEmbeddedSendButton?.(true);
                    getChatOrchestrator()?.notifyNewActivityInConversation?.(currentEmbeddedChatTargetId!);
                    if (target) target.value = '';
                }
            }; 
        
            reader.onerror = () => {
                alert("Error reading image.");
                if (target) target.value = '';
                uiUpdater.toggleEmbeddedSendButton?.(true);
            };
        
            reader.readAsDataURL(file);
        }

        async function sendModalTextMessage(
            textFromInput: string,
            currentModalMessageTargetConnector: Connector | null,
            options: {
                skipUiAppend?: boolean;
                isVoiceMemo?: boolean;
                audioBlobDataUrl?: string | null;
                messageId?: string;
                timestamp?: number;
                imageFile?: File | null;
                captionText?: string | null;
            } = {}
        ): Promise<void> {


          const { checkAndIncrementUsage } = await import('./usageManager');
const { openUpgradeModal } = await import('../ui/modalUtils');

const usageResult = await checkAndIncrementUsage('textMessages');
if (!usageResult.allowed) {
    console.log("TMH (Modal): User has reached text message limit. Showing upgrade modal.");
    openUpgradeModal('text', usageResult.daysUntilReset);
    if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
    return;
}
    // ==========================================================
    // === FREEMIUM USAGE GATE - END ===
    // ==========================================================
            const { imageFile, captionText, isVoiceMemo, audioBlobDataUrl: optionsAudioBlobUrl, skipUiAppend } = options;
            if (currentModalMessageTargetConnector?.id) clearTypingIndicatorFor(currentModalMessageTargetConnector.id); // <<< ADD THIS LINE
        
            const functionName = "sendModalTextMessage";
            const text = textFromInput?.trim() || ""; // Ensure text is always a string
    
            const userMessageTimestamp = options.timestamp || Date.now();
            const userMessageId = options.messageId || polyglotHelpers.generateUUID();
    
            if (!currentModalMessageTargetConnector?.id) {
                console.error(`TMH.${functionName}: Missing targetConnector.id.`);
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                return;
            }
            const targetId = currentModalMessageTargetConnector.id;
        
            if (!isVoiceMemo && !imageFile && !text) {
                console.warn(`TMH.${functionName}: Empty message (not voice memo, no image).`);
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                return;
            }

            const existingConvoCheck = conversationManager.getConversationById(targetId);
            const isFirstMessageEver = !existingConvoCheck || (existingConvoCheck.messages?.length || 0) === 0;

            if (isFirstMessageEver) {
                console.log(`%cTMH: First message in modal for ${targetId}. This will make the conversation official.`, 'color: #17a2b8; font-weight: bold;');
            }



            const record = await conversationManager.ensureConversationRecord(targetId, currentModalMessageTargetConnector);
            const convo = record.conversation as ConversationRecordInStore | null;
            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or connector for ID: ${targetId}`);
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                return;
            }
            const currentConnector: Connector = convo.connector;
    
            // --- Image processing for Modal ---
            let imageUrlForDisplay_modal: string | undefined = undefined;
            let imagePartsForGemini_modal: Array<{ inlineData: { mimeType: string; data: string; } }> | undefined = undefined;
            let imageSemanticDescriptionForStore_modal: string | undefined = undefined;
  
            if (imageFile) {
                console.log(`TMH.${functionName}: Processing image "${imageFile.name}" with caption "${captionText || ''}" for modal.`);
                let base64StringForStore_modal: string; // Declare here

                try {
                    base64StringForStore_modal = await polyglotHelpers.fileToBase64(imageFile); // Assign here
                    const base64DataForApi = base64StringForStore_modal.split(',')[1];
                    imagePartsForGemini_modal = [{ inlineData: { mimeType: imageFile.type, data: base64DataForApi } }];
                    console.log(`TMH.${functionName}: Modal image converted to base64 for AI. MimeType: ${imageFile.type}`);

                    // imageUrlForDisplay_modal will now be the base64 string for storage.
                    imageUrlForDisplay_modal = base64StringForStore_modal;
                    // Generate description if no caption, similar to embedded version
                    const descriptionPromptText = captionText || text || "Describe this image concisely.";
                    if (aiService.generateTextFromImageAndText && convo.connector) {
                        const desc = await aiService.generateTextFromImageAndText(
                            base64DataForApi, 
                            imageFile.type, 
                            convo.connector, 
                            [], 
                            `Describe this image concisely in one sentence for context. Speak in ${convo.connector.language || 'English'}. Based on the image and the user's text: "${descriptionPromptText}"`,
                            aiApiConstants.PROVIDERS.TOGETHER
                        );
                        if (desc && typeof desc === 'string' && !desc.startsWith("[")) {
                            imageSemanticDescriptionForStore_modal = desc.trim();
                            console.log(`TMH.${functionName}: AI generated image description (modal): "${imageSemanticDescriptionForStore_modal}"`);
                        } else if (desc && typeof desc === 'string' && desc.startsWith("[")){
                           console.warn(`TMH.${functionName}: AI description (modal) was a placeholder/error: "${desc}"`);
                        }
                      
                    }
                    console.log(`TMH.${functionName}: Adding a short delay before main AI reply to avoid rate limits...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2000 ms = 2 seconds

                } catch (error) {
                    console.error(`TMH.${functionName}: Error processing modal image:`, error);
                    uiUpdater.appendToMessageLogModal?.("Error processing image.", 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                    if (imageUrlForDisplay_modal) URL.revokeObjectURL(imageUrlForDisplay_modal);
                    if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                    return;
                }
            }
          
            // --- Define final content for UI and Store for Modal ---
            let textForDisplayAndStore: string;
            let typeForStore: string = 'text';
            const finalMessageExtraData: Partial<MessageInStore> = { // Use a single, well-defined extraData object
                id: userMessageId,
                timestamp: userMessageTimestamp
            };

            if (imageFile) {
                typeForStore = 'image';
            
                let userProvidedTextForImage_modal: string | null = null;
                if (captionText) {
                    userProvidedTextForImage_modal = captionText.trim();
                } else if (text && imageFile) {
                    userProvidedTextForImage_modal = text.trim();
                }
                
                textForDisplayAndStore = userProvidedTextForImage_modal || ""; // <<< FIX: Default to empty string if null
            
                finalMessageExtraData.content_url = imageUrlForDisplay_modal;
                finalMessageExtraData.imagePartsForGemini = imagePartsForGemini_modal;
                if (imageSemanticDescriptionForStore_modal) {
                    finalMessageExtraData.imageInitialDescription = imageSemanticDescriptionForStore_modal;
                }
            } else if (isVoiceMemo) {
                typeForStore = 'voice_memo';
                textForDisplayAndStore = text; // text is already string ("" if empty)
                finalMessageExtraData.isVoiceMemo = true;
                finalMessageExtraData.audioBlobDataUrl = optionsAudioBlobUrl;
            } else { // Plain text message
                textForDisplayAndStore = text; // text is already string ("" if empty)
            }
        
            // Append User's Message to Modal UI (if not skipped)
            if (!skipUiAppend) {
                console.log(`TMH.${functionName}: Appending user message to UI (Modal). Text: "${textForDisplayAndStore.substring(0,30)}", Image: ${!!imageUrlForDisplay_modal}`);
                uiUpdater.appendToMessageLogModal?.( // Corrected to appendToMessageLogModal
                    textForDisplayAndStore,
                    'user',
                    {
                        timestamp: userMessageTimestamp,
                        messageId: userMessageId,
                        imageUrl: imageUrlForDisplay_modal // Use modal specific image URL
                    }
                );
            }
    
            // Add User's Message to Conversation Store
            await conversationManager.addMessageToConversation(
                targetId, // Correct target ID for modal
                'user',
                textForDisplayAndStore,
                typeForStore,
                userMessageTimestamp,
                finalMessageExtraData // Use the consolidated extra data
            );
            if (isFirstMessageEver) {
                console.log(`%cTMH: First message sent. Rendering active chat list to include new conversation.`, 'color: #28a745; font-weight: bold;');
                getChatOrchestrator()?.renderCombinedActiveChatsList();
            }
            // UI updates for modal input (only if this function initiated the send)
            if (!skipUiAppend) {
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = true;
                uiUpdater.resetMessageModalInput?.();
            }
    
            const thinkingMsgOptions: ChatMessageOptions = {
                senderName: currentConnector.profileName?.split(' ')[0], avatarUrl: currentConnector.avatarModern, isThinking: true
            };
            // Ensure thinking message is appended to modal log
            const thinkingMsg = uiUpdater.appendToMessageLogModal?.(`${thinkingMsgOptions.senderName || 'Partner'} is typing...`, 'connector-thinking', thinkingMsgOptions);

            // =================== TWIN TAG: MODAL-USER ===================
            if (window.conversationManager && window.memoryService?.processNewUserMessage) {
                const userTextToProcess = textForDisplayAndStore || (captionText || "");
                if (userTextToProcess.trim()) {
                    console.log(`[CEREBRUM_WRITE] ✍️ Sending USER'S message to memory service for analysis (modal)...`);
                    
                    // Fetch history for modal context
                    const convoRecord = await window.conversationManager.getConversationById(targetId);
                    const recentHistory = convoRecord?.messages.slice(-10) || []; // Increased slice for better context
            
                    await window.memoryService.processNewUserMessage(
                        userTextToProcess,
                        targetId,
                        'one_on_one',
                        recentHistory
                    );
                    console.log(`[CEREBRUM_WRITE] ✅ USER'S message analysis complete (modal).`);
                }
            }




            let aiRespondedSuccessfully = false;
            const controller = interruptAndTrackAiOperation(targetId);
            try {
                // Determine prompt for AI, considering potential image context
                let promptForAI_modal: string;
                let aiResponse: string | null | object; // Declare response object here

                if (imageFile) { // User sent an image (with or without caption)
                    const userProvidedTextWithImage_modal = captionText || text || "";
                    const preamble = getMultimodalPreamble(currentConnector);
                    
                    // Construct promptForAI_modal for the 2-part image reply
                    promptForAI_modal = `${preamble}
                    
                    The user has shared an image in our chat. Your response MUST have two distinct parts. Speak ONLY in ${currentConnector.language}.
                    
                    Part 1: Your Conversational Comment (as ${currentConnector.profileName}):
                    - React to this image based on YOUR specific personality. You are: **${currentConnector.personalityTraits?.join(', ') || 'a unique individual'}**.
                    - Let your interests (**${currentConnector.interests?.join(', ') || 'your passions'}**) guide your reaction.
                    - AVOID generic phrases like "That's a cool picture."
                    - INSTEAD, try one of these persona-driven approaches:
                      - Make a creative observation that reflects your personality.
                      - Ask a question driven by your curiosity and interests.
                      - Share a brief, relevant memory or thought from your own life experiences.
                    - If the user wrote a caption ("${userProvidedTextWithImage_modal || 'none'}"), weave it into your comment naturally.
                    
                    Part 2: CRITICAL - After your conversational comment, you MUST include a special section formatted EXACTLY like this:
                    [IMAGE_DESCRIPTION_START]
                 A concise, factual, and objective description of the visual content of the image itself. Describe only what you visually see in THIS SPECIFIC IMAGE. If there are recognizable people, landmarks, or specific types of places or famous person (e.g., "a Parisian cafe," "Times Square," "a basketball court", "Barack Obama"), try to identify them if you are reasonably confident. Do NOT refer to the user's caption or my previous description (if any) within this factual description part.
                    [IMAGE_DESCRIPTION_END]
                    
                    Your conversational comment (Part 1) MUST come before the [IMAGE_DESCRIPTION_START] tag.`;
                    if (imagePartsForGemini_modal && imagePartsForGemini_modal[0]?.inlineData?.data) {
                        console.log(`TMH.${functionName}: Calling AI (generateTextFromImageAndText) for IMAGE reply (modal).`);
                        aiResponse = await (aiService.generateTextFromImageAndText as any)(
                            imagePartsForGemini_modal[0].inlineData.data,
                            imageFile.type,
                            currentConnector,
                            getHistoryForAiCall(undefined, true),    // EMPTY HISTORY for image reply
                            promptForAI_modal,
                            aiApiConstants.PROVIDERS.TOGETHER,
                            controller.signal // <<< ADD THIS
                        );
                    } else {
                        console.error(`TMH.${functionName}: imageFile present but imagePartsForGemini_modal data missing.`);
                        throw new Error("Missing image data for AI call (modal)."); // Or handle gracefully
                    }
                } else { // User sent TEXT-ONLY
                    promptForAI_modal = textForDisplayAndStore; // This is the user's text message
                    console.log(`TMH.${functionName}: Calling AI (generateTextMessage) for TEXT reply (modal).`);
                
                    // --- THIS IS THE FIX: Rebuild history right before the AI call ---
                    console.log(`%c[TMH Pre-AI] 🧠 Rebuilding prompt with latest memories for [${targetId}] (modal)...`, 'color: #6610f2; font-weight: bold;');
                    let historyForAiCall = await conversationManager.getGeminiHistoryForConnector(targetId);
                    console.log(`%c[TMH Pre-AI] ✅ Prompt rebuild complete (modal).`, 'color: #28a745; font-weight: bold;');
                
                    // Check if the PREVIOUS message in the store was a call event.
                    if (convo.messages.length >= 2) {
                        const secondToLastMessage = convo.messages[convo.messages.length - 2];
                        if (secondToLastMessage && secondToLastMessage.type === 'call_event') {
                            console.log("TMH (Modal): Call event detected as the PREVIOUS message. Injecting context into AI history.");
                            historyForAiCall.push({
                                role: 'user', 
                                parts: [{ text: "[A voice call took place between you and the user.]" }]
                            });
                        }
                    }
                    // --- END: CONTEXT INJECTION FOR CALLS ---
    
                   // Change it to this in BOTH places
aiResponse = await (aiService.generateTextMessage as any)(
    promptForAI_modal,
    currentConnector,
    historyForAiCall,
    null    , // <<< THE FIX. The coach is now in control.
    false,
    'one-on-one',
    controller.signal
);
                }
                const aiResponseText = typeof aiResponse === 'string' ? aiResponse : null;
    
                if (thinkingMsg?.remove) thinkingMsg.remove();
    
                const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseText || "");
                const isBlockedResponse = typeof aiResponseText === 'string' && aiResponseText.startsWith("(My response was blocked:");
    
                if (aiResponseText === null) {
                     uiUpdater.appendToMessageLogModal?.("Sorry, I couldn't get a response.", 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                } else if (isHumanError || isBlockedResponse) {
                    uiUpdater.appendToMessageLogModal?.(aiResponseText, 'connector-error', { isError: true, isSystemLikeMessage: isHumanError, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                } else { // This is where the successful AI response is handled
                    // Check if the user's message included an image file.
                    if (imageFile && typeof aiResponseText === 'string') {
                        // --- MODAL IMAGE PATH ---
                        let conversationalReply_modal = aiResponseText;
                        let extractedImageDescription_modal: string | undefined = undefined;
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const startIndex = aiResponseText.indexOf(descStartTag);
                        const endIndex = aiResponseText.indexOf(descEndTag);
                        
                        if (startIndex !== -1 && endIndex > startIndex) {
                            extractedImageDescription_modal = aiResponseText.substring(startIndex + descStartTag.length, endIndex).trim();
                            conversationalReply_modal = aiResponseText.substring(0, startIndex).trim();
                        }
                
                        const processedText = intelligentlySeparateText(conversationalReply_modal, currentConnector, { probability: 1.0 });
                        const responseLines = processedText.split('\n').filter(line => line.trim());
                        await playAiResponseScene(responseLines, currentConnector.id, currentConnector, 'modal');
                
                        // <<< FIX: All logic for updating the message is now self-contained and uses 'currentConnector.id'
                        if (extractedImageDescription_modal && userMessageId) {
                            const convoRecordForUpdate = conversationManager.getConversationById(currentConnector.id);
                            if (convoRecordForUpdate?.messages) {
                                // <<< FIX: Added explicit type 'MessageInStore' for parameter 'm'
                                const msgIndex = convoRecordForUpdate.messages.findIndex((m: MessageInStore) => m.id === userMessageId);
                                if (msgIndex !== -1) {
                                    convoRecordForUpdate.messages[msgIndex].imageSemanticDescription = extractedImageDescription_modal;
                                    window.convoStore?.updateConversationProperty(currentConnector.id, 'messages', [...convoRecordForUpdate.messages]);
                                    window.convoStore?.saveAllConversationsToStorage();
                                }
                            }
                        }
                    } else if (aiResponseText) {

                        //  =================== TWIN TAG: MODAL-AI ===================
                        if (window.memoryService && window.memoryService.processNewUserMessage) {
                            console.log(`[CEREBRUM_WRITE] ✍️ Sending AI's own response to memory service for analysis (modal)...`);
                            window.memoryService.processNewUserMessage(
                                aiResponseText,
                                targetId, // Correct ID for modal
                                'ai_invention'
                            );
                       }



                        // --- MODAL TEXT-ONLY PATH ---
                        console.log(`[Auto-Separator] Raw AI Text (Modal): "${aiResponseText}"`);
                        const processedText = intelligentlySeparateText(aiResponseText, currentConnector, { probability: 1.0 });
                        console.log(`[Auto-Separator] Processed Text (Modal): "${processedText.replace(/\n/g, '\\n')}"`);
                        
                        const responseLines = processedText.split('\n').filter(line => line.trim());
                    
                        // CORRECT: Use the connector's ID and 'modal' context
                        await playAiResponseScene(responseLines, currentConnector.id, currentConnector, 'modal');
                    }
                
                    aiRespondedSuccessfully = true;
                }
            } catch (e: any) {
                clearTypingIndicatorFor(targetId); // <<< ADD THIS LINE
                if (e.name === 'AbortError') {
                    console.log(`%c[Interrupt] AI request for modal chat ${targetId} was successfully aborted.`, 'color: #ff9800;');
                } else {
                    console.error(`TMH.${functionName}: Error during AI response generation (modal):`, e);
                    uiUpdater.appendToMessageLogModal?.(`Error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                }
                if (thinkingMsg?.remove) thinkingMsg.remove(); // Remove thinking message in both cases
            } finally {
                // Clean up the controller from the map
                if (activeAiOperations.get(targetId) === controller) {
                    activeAiOperations.delete(targetId);
                }

                // The rest of your existing finally block
                if (!skipUiAppend) {
                    if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                }
                if (aiRespondedSuccessfully) {
                    const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
                    if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && targetId) {
                        try {
                            await window.memoryService.markInteraction(targetId, currentUserId);
                        } catch (e) { console.error(`TMH.${functionName}: Error marking interaction for ${targetId}:`, e); }
                    }
                }
                getChatOrchestrator()?.notifyNewActivityInConversation?.(targetId);
            }
        } // End of sendModalTextMessage

        async function handleModalImageUpload(event: Event, currentModalMessageTargetConnector: Connector | null): Promise<void> {
            const functionName = "handleModalImageUpload";
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            const targetId = currentModalMessageTargetConnector?.id;

            if (!file) { if (target) target.value = ''; return; }
            if (!targetId || !currentModalMessageTargetConnector) { console.error(`TMH.${functionName}: Missing targetId or connector.`); if (target) target.value = ''; return; }

            const record = await conversationManager.ensureConversationRecord(targetId, currentModalMessageTargetConnector);
            const convo = record.conversation as ConversationRecordInStore | null;
            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or connector for ID: ${targetId}`);
                if (target) target.value = ''; return;
            }
            const currentConnector: Connector = convo.connector;

            if (file.size > 4 * 1024 * 1024) { alert("Image too large (max 4MB)."); if (target) target.value = ''; return; }

            const reader = new FileReader();

            reader.onloadend = async () => {
                const resultString = reader.result as string;
                const base64DataForApi = resultString.split(',')[1];
                const dataUrlForDisplay = resultString;
                const imagePlaceholderTextForStore = "[User sent an image via direct upload]"; // Or similar

                uiUpdater.appendToMessageLogModal?.("", 'user', { imageUrl: dataUrlForDisplay, timestamp: Date.now() });
                
                const imageMessageId = polyglotHelpers.generateUUID(); // ID for the user's image message being processed
                const imageTimestamp = Date.now(); // Timestamp for the user's image message being processed

                await conversationManager.addMessageToConversation(
                    targetId, 'user', imagePlaceholderTextForStore, 'image', imageTimestamp,
                    { 
                        id: imageMessageId, // ensure 'id' field is used
                        content_url: dataUrlForDisplay, 
                        imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }] 
                    }
                );
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = true;
                const thinkingMsgOptions: ChatMessageOptions = {
                    senderName: currentConnector.profileName?.split(' ')[0], avatarUrl: currentConnector.avatarModern, isThinking: true
                };
                const thinkingMsg = uiUpdater.appendToMessageLogModal?.(`${thinkingMsgOptions.senderName || 'Partner'} is looking...`, 'connector-thinking', thinkingMsgOptions);
                let aiRespondedSuccessfully = false; // Scoped to onloadend

                try {
                    // Re-using the detailed prompt from handleEmbeddedImageUpload for consistency and better descriptions
                  // REPLACE WITH THIS BLOCK

                  const preamble = getMultimodalPreamble(currentConnector);

                  const PromptForImageAndDescription = `${preamble}
                  
                  The user has just sent an image with no accompanying text. Your response MUST have two distinct parts. Speak ONLY in ${currentConnector.language}.
                  
                  Part 1: Your Conversational Comment (as ${currentConnector.profileName}):
                  - React to this image based on YOUR specific personality. You are: **${currentConnector.personalityTraits?.join(', ') || 'a unique individual'}**.
                  - Let your interests (**${currentConnector.interests?.join(', ') || 'your passions'}**) guide your reaction.
                  - AVOID generic phrases like "What's this?" or "Nice photo."
                  - Your goal is to start a conversation. Try one of these persona-driven approaches:
                    - Make a creative observation that reflects your personality.
                    - Ask an open-ended question driven by your curiosity and interests.
                    - Share a brief, relevant memory or thought from your own life experiences.

Part 2: CRITICAL - After your conversational comment, you MUST include a special section formatted EXACTLY like this:
[IMAGE_DESCRIPTION_START]
A concise, factual, and objective description of the visual content of the image itself. Describe only what you visually see in THIS SPECIFIC IMAGE. If there are recognizable people, landmarks, or specific types of places or famous person (e.g., "a Parisian cafe," "Times Square," "a basketball court", "Barack Obama"), try to identify them if you are reasonably confident. Do NOT refer to the user's caption or my previous description (if any) within this factual description part.
[IMAGE_DESCRIPTION_END]

Example: "Oh, I love the atmosphere in this photo! It feels so calming. [IMAGE_DESCRIPTION_START]A photo of a misty forest path with tall trees.[IMAGE_DESCRIPTION_END]"
Your conversational comment (Part 1) MUST come before the [IMAGE_DESCRIPTION_START] tag.`;
                    const relevantHistoryForAi = getHistoryForAiCall(undefined, true); // <<< CORRECTED
                    const aiResponse = await (aiService.generateTextFromImageAndText as any)(
                        base64DataForApi, 
                        file.type, 
                        currentConnector, 
                        relevantHistoryForAi, 
                        PromptForImageAndDescription, 
                        aiApiConstants.PROVIDERS.TOGETHER
                    );
                    if (thinkingMsg?.remove) thinkingMsg.remove();

                    let conversationalReply: string | null = null;
                    let extractedImageDescription: string | undefined = undefined;

                    if (typeof aiResponse === 'string') {
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const startIndex = aiResponse.indexOf(descStartTag);
                        const endIndex = aiResponse.indexOf(descEndTag);

                        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                            extractedImageDescription = aiResponse.substring(startIndex + descStartTag.length, endIndex).trim();
                            conversationalReply = aiResponse.substring(0, startIndex).trim();
                        } else {
                            conversationalReply = aiResponse.trim();
                        }
                    }

                    const aiResponseTextForDisplay = conversationalReply;
                    const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseTextForDisplay || "");

                    if (aiResponseTextForDisplay === null) {
                        uiUpdater.appendToMessageLogModal?.("Sorry, I couldn't process the image.", 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName});
                    } else if (isHumanError) {
                        uiUpdater.appendToMessageLogModal?.(aiResponseTextForDisplay, 'connector-error', { isError: true, isSystemLikeMessage: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                    } else {
                        const processedText = intelligentlySeparateText(aiResponseTextForDisplay, currentConnector, { probability: 1.0 });
                        const responseLines = processedText.split('\n').filter(line => line.trim());
                        await playAiResponseScene(responseLines, targetId, currentConnector, 'modal');
                        aiRespondedSuccessfully = true;
                    }

                    // Update original user image message with AI description (if extracted)
                    if (extractedImageDescription) {
                        const userImageMessageOriginalId = imageMessageId;
                        const currentConvoRecord = conversationManager.getConversationById(targetId);
                         if (currentConvoRecord && currentConvoRecord.messages) {
                            const originalMsgIndex = currentConvoRecord.messages.findIndex(m => m.id === userImageMessageOriginalId);
                            if (originalMsgIndex !== -1) {
                                currentConvoRecord.messages[originalMsgIndex].imageSemanticDescription = extractedImageDescription;
                                if (window.convoStore?.updateConversationProperty && window.convoStore.saveAllConversationsToStorage) {
                                     window.convoStore.updateConversationProperty(targetId, 'messages', [...currentConvoRecord.messages]);
                                     window.convoStore.saveAllConversationsToStorage();
                                     console.log(`TMH.${functionName}: Updated user image message ${userImageMessageOriginalId} with description in store (modal).`);
                                } else {
                                    console.warn(`TMH.${functionName}: convoStore update methods not available to save image description (modal).`);
                                }
                            } else {
                                 console.warn(`TMH.${functionName}: Could not find original user image message with ID ${userImageMessageOriginalId} to update description (modal).`);
                            }
                        }
                    }

                } catch (e: any) {
                    if (thinkingMsg?.remove) thinkingMsg.remove();
                    uiUpdater.appendToMessageLogModal?.(`Error with image: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                } finally {
                    if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                    if(aiRespondedSuccessfully) {
                        const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
                        if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && targetId) {
                             try {
                                console.log(`TMH.${functionName}: Marking interaction (after successful AI image response) for ${targetId} with user ${currentUserId}.`);
                                await window.memoryService.markInteraction(targetId, currentUserId);
                            } catch (e) {
                                console.error(`TMH.${functionName}: Error marking interaction for ${targetId}:`, e);
                            }
                        }
                    }
                    getChatOrchestrator()?.notifyNewActivityInConversation?.(targetId);
                    if (target) target.value = '';
                }
            }; 

            reader.onerror = () => {
                alert("Error reading image.");
                if (target) target.value = '';
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
            };

            reader.readAsDataURL(file);
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
