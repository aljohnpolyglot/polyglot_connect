// D:\polyglot_connect\src\js\core\conversation_manager.ts (Facade)
import type {
    PolyglotHelpersOnWindow,
    ChatOrchestrator,
    Connector,
    ConversationItem,
    GeminiChatItem,
    MessageInStore,
    ConversationRecordInStore,
    ConvoStoreModule
} from '../types/global.d.ts';

// Import utilities from our new modules
// Assuming buildInitialGeminiHistory is now async and returns Promise<GeminiChatItem[]>
import { buildInitialGeminiHistory } from './convo_prompt_builder.js'; 
import { addTurnToGeminiHistory } from './convo_turn_manager.js';

console.log('conversation_manager.ts (Facade): Script loaded, waiting for core dependencies.');

interface ConversationManagerModule {
    initialize: () => Promise<void>; // Now returns Promise
    getActiveConversations: () => ConversationItem[]; // Remains sync for now
    getConversationById: (connectorId: string) => ConversationRecordInStore | null; // Remains sync
    addMessageToConversation: (
        connectorId: string,
        sender: string,
        text: string,
        type?: string,
        timestamp?: number,
        extraData?: Record<string, any>
    ) => Promise<MessageInStore | null>; // Returns Promise
    ensureConversationRecord: (
        connectorId: string,
        connectorData?: Connector | null
    ) => Promise<{ conversation: ConversationRecordInStore | null; isNew: boolean }>; // Returns Promise
  
  
    addSystemMessageToConversation: (connectorId: string, systemMessageObject: Partial<MessageInStore>) => Promise<boolean>; // Returns Promise
 
 
 
    markConversationActive: (connectorId: string) => boolean; // Remains sync
    addModelResponseMessage: (
        connectorId: string, 
        text: string, 
        geminiHistoryRefToUpdate?: GeminiChatItem[] // Likely redundant
    ) => Promise<MessageInStore | null>; // Returns Promise
    getGeminiHistoryForConnector: (connectorId: string) => Promise<GeminiChatItem[]>; // Returns Promise
    clearConversationHistory: (connectorId: string) => Promise<void>; // Returns Promise
}

window.conversationManager = {} as ConversationManagerModule;
console.log('conversation_manager.ts (Facade): Placeholder window.conversationManager assigned.');

function initializeActualConversationManager(): void {
    console.log("conversation_manager.ts (Facade): initializeActualConversationManager() called.");

    type VerifiedDeps = {
        polyglotHelpers: PolyglotHelpersOnWindow;
        convoStore: ConvoStoreModule;
        chatOrchestrator?: ChatOrchestrator;
        polyglotConnectors: Connector[];
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = {
            polyglotHelpers: window.polyglotHelpers,
            convoStore: window.convoStore,
            chatOrchestrator: window.chatOrchestrator,
            polyglotConnectors: window.polyglotConnectors
        };
        const missing: string[] = [];
        if (!deps.polyglotHelpers?.generateUUID) missing.push("polyglotHelpers");
        if (!deps.convoStore?.getConversationById) missing.push("convoStore");
        if (!deps.polyglotConnectors || !Array.isArray(deps.polyglotConnectors)) missing.push("polyglotConnectors");
        if (deps.chatOrchestrator && !deps.chatOrchestrator.notifyNewActivityInConversation) {
            console.warn("CM (Facade): chatOrchestrator missing notifyNewActivityInConversation.");
        }
        if (missing.length > 0) {
            console.error(`CM (Facade): getSafeDeps - MISSING/INVALID: ${missing.join(', ')}.`);
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("conversation_manager.ts (Facade): CRITICAL - Core functional dependencies not met. Placeholder remains.");
        document.dispatchEvent(new CustomEvent('conversationManagerReady'));
        console.warn('conversation_manager.ts (Facade): "conversationManagerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('conversation_manager.ts (Facade): Core functional dependencies appear ready.');

   const facadeMethods = ((): ConversationManagerModule => {
    'use strict';
    console.log("conversation_manager.ts (Facade): IIFE STARTING.");

    const { polyglotHelpers, convoStore, chatOrchestrator, polyglotConnectors } = resolvedDeps;

        async function initialize(): Promise<void> {
            console.log("ConversationManager (Facade): Initializing...");
            const allConvos = convoStore.getAllConversationsAsArray();
            let changesMade = false;
            for (const storedConvo of allConvos) {
                if (storedConvo.connector?.id) {
                    const liveConnector = polyglotConnectors.find(c => c.id === storedConvo.connector!.id);
                    if (liveConnector && JSON.stringify(storedConvo.connector) !== JSON.stringify(liveConnector)) {
                        console.log(`CM (Facade) Init: Updating stale connector data for ${storedConvo.id}`);
                        convoStore.updateConversationProperty(storedConvo.id, 'connector', { ...liveConnector });
                        changesMade = true;
                        if (storedConvo.connector!.profileName !== liveConnector.profileName) {
                            console.log(`CM (Facade) Init: Rebuilding Gemini history for ${storedConvo.id} due to profileName change.`);
                            const newHistory = await buildInitialGeminiHistory(liveConnector);
                            convoStore.updateGeminiHistoryInStore(storedConvo.id, newHistory);
                        }
                    } else if (!liveConnector) {
                         console.warn(`CM (Facade) Init: Connector for ${storedConvo.id} not found in live data.`);
                    }
                    // Ensure history exists even if connector data was fine
                    if (!storedConvo.geminiHistory || storedConvo.geminiHistory.length < 2) {
                        if (liveConnector) { // Use liveConnector if available, otherwise storedConvo.connector
                             console.log(`CM (Facade) Init: Building missing/short Gemini history for ${storedConvo.id}`);
                            const newHistory = await buildInitialGeminiHistory(liveConnector || storedConvo.connector);
                            convoStore.updateGeminiHistoryInStore(storedConvo.id, newHistory);
                            changesMade = true;
                        }
                    }
                }
            }
            if(changesMade) convoStore.saveAllConversationsToStorage();
            console.log("ConversationManager (Facade): Initialization complete.");
        }

        async function ensureConversationRecord(
            connectorId: string,
            connectorData?: Connector | null
        ): Promise<{ conversation: ConversationRecordInStore | null; isNew: boolean }> {
            let isNew = false;
            let conversation = convoStore.getConversationById(connectorId);

            if (!conversation) {
                const connector = connectorData || polyglotConnectors.find(c => c.id === connectorId);
                if (!connector) {
                    console.error(`CM (Facade) ensureConversationRecord: Connector not found for ID '${connectorId}'.`);
                    return { conversation: null, isNew: false };
                }
                conversation = convoStore.createNewConversationRecord(connectorId, connector);
                if (conversation) {
                    console.log(`CM (Facade) ensureConversationRecord: New record, building Gemini history for ${connectorId}`);
                    conversation.geminiHistory = await buildInitialGeminiHistory(connector);
                    convoStore.updateGeminiHistoryInStore(connectorId, conversation.geminiHistory);
                    isNew = true;
                    convoStore.saveAllConversationsToStorage();
                }
            } else {
                const liveConnector = connectorData || polyglotConnectors.find(c => c.id === connectorId) || conversation.connector;
                let historyNeedsRebuild = !conversation.geminiHistory || conversation.geminiHistory.length < 2;

                if (liveConnector && (!conversation.connector || conversation.connector.profileName !== liveConnector.profileName)) {
                    console.log(`CM (Facade) ensureRecord: Updating connector data for ${connectorId}`);
                    conversation.connector = { ...liveConnector }; // Ensure connector on the object is updated
                    convoStore.updateConversationProperty(connectorId, 'connector', conversation.connector);
                    historyNeedsRebuild = true;
                }
                
                if (historyNeedsRebuild && liveConnector) { // Use liveConnector for building history
                     console.log(`CM (Facade) ensureRecord: Re-initializing short/stale Gemini history for ${connectorId}`);
                    conversation.geminiHistory = await buildInitialGeminiHistory(liveConnector);
                    convoStore.updateGeminiHistoryInStore(connectorId, conversation.geminiHistory);
                    // No need to saveAll here, assume updateGeminiHistoryInStore handles its persistence or it's batched
                }
            }
            return { conversation, isNew };
        }

        async function addMessageToConversation(
            connectorId: string,
            sender: string,
            text: string,
            type: string = 'text',
            timestamp: number = Date.now(),
            extraData: Record<string, any> = {}
        ): Promise<MessageInStore | null> {
            const { conversation: convo, isNew } = await ensureConversationRecord(connectorId);
            if (!convo) return null;

            const messageObject: MessageInStore = { id: polyglotHelpers.generateUUID(), sender, text, type, timestamp, ...extraData };
            convoStore.addMessageToConversationStore(connectorId, messageObject);

            if (!convo.geminiHistory) { // Should have been initialized by ensureConversationRecord
                 console.warn(`CM addMessage: geminiHistory not found on convo object for ${connectorId} after ensure. Re-fetching.`);
                 const updatedConvo = convoStore.getConversationById(connectorId); // Re-fetch
                 if(updatedConvo?.geminiHistory) convo.geminiHistory = updatedConvo.geminiHistory;
                 else if (convo.connector) convo.geminiHistory = await buildInitialGeminiHistory(convo.connector); // Last resort
                 else { console.error("CM addMessage: Cannot update geminiHistory, connector info missing."); return messageObject; }
            }

            if (type === 'text' && (sender === 'user' || sender === 'connector')) {
                addTurnToGeminiHistory(convo.geminiHistory, sender === 'user' ? 'user' : 'model', text);
            } else if (type === 'image' && sender === 'user' && extraData.imagePartsForGemini) {
                let imageContextForLLM = text; // User's caption or placeholder like "[User sent an image]"
                if (extraData.imageSemanticDescription) { // imageSemanticDescription comes from TMH via extraData
                    // This is the AI's *first-pass* description made by TMH when user sent the image.
                    imageContextForLLM = `${text || ""} [Image Description: ${extraData.imageSemanticDescription}]`;
                    console.log(`CM.addMessageToConversation: Adding image with AI description to Gemini history for ${connectorId}.`);
                } else {
                     imageContextForLLM = text || ""; 
                }
                addTurnToGeminiHistory(convo.geminiHistory, 'user', imageContextForLLM, extraData.imagePartsForGemini);
            } else if (sender === 'user-voice-transcript') {
                addTurnToGeminiHistory(convo.geminiHistory, 'user', text);
            }
            convoStore.updateGeminiHistoryInStore(connectorId, convo.geminiHistory); // This already saves the updated history
        // ...
            convoStore.saveAllConversationsToStorage();

            if (chatOrchestrator?.notifyNewActivityInConversation) {
                chatOrchestrator.notifyNewActivityInConversation(connectorId);
            }
            return messageObject;
        }

        async function addModelResponseMessage(
            connectorId: string,
            text: string,
            geminiHistoryRefToUpdate?: GeminiChatItem[] // Often not needed due to ensureConversationRecord
        ): Promise<MessageInStore | null> {
            const { conversation: convo } = await ensureConversationRecord(connectorId);
            if (!convo) return null;
            const cleanText = typeof text === 'string' ? text : String(text || "(AI response was empty)");

            const messageObject: MessageInStore = { id: polyglotHelpers.generateUUID(), sender: 'connector', text: cleanText, type: 'text', timestamp: Date.now() };
            convoStore.addMessageToConversationStore(connectorId, messageObject);
            
            if (!convo.geminiHistory && convo.connector) { // Safety: ensure history exists
                convo.geminiHistory = await buildInitialGeminiHistory(convo.connector);
            }
            if (convo.geminiHistory) {
                let textForModelHistory = cleanText;
                // If this AI's response (cleanText) is a comment on an image AND we managed to embed
                // the [Internal Image Description: ...] directly into cleanText from text_message_handler
                // (which is what the group_interaction_logic does), then cleanText is already fine.
                // If text_message_handler passed imageSemanticDescription in extraData to addModelResponseMessage,
                // we could use it here. Let's assume TMH doesn't do that for model responses yet.
                // So, we rely on the text from the AI already being formatted if it's an image description.
                addTurnToGeminiHistory(convo.geminiHistory, 'model', textForModelHistory);
                convoStore.updateGeminiHistoryInStore(connectorId, convo.geminiHistory);
            }
            convoStore.saveAllConversationsToStorage();

            if (chatOrchestrator?.notifyNewActivityInConversation) {
                chatOrchestrator.notifyNewActivityInConversation(connectorId);
            }
            return messageObject;
        }
        
        // getActiveConversations and getConversationById can remain synchronous
        // as they read from the store which is synchronously updated by other async methods.
        function getActiveConversations(): ConversationItem[] {
            const allConvosInStore = convoStore.getAllConversationsAsArray();
            return allConvosInStore
                .filter(storedConvo => storedConvo.connector && typeof storedConvo.lastActivity !== 'undefined')
                .map(storedConvo => ({
                    id: storedConvo.connector!.id, 
                    name: storedConvo.connector!.profileName || storedConvo.connector!.name || "Unknown Chat",
                    connector: storedConvo.connector!, 
                    messages: storedConvo.messages || [], 
                    lastActivity: storedConvo.lastActivity,
                    isGroup: false as const,
                    geminiHistory: storedConvo.geminiHistory || [] 
                })) as ConversationItem[];
        }

        function getConversationById(connectorId: string): ConversationRecordInStore | null {
            return convoStore.getConversationById(connectorId);
        }

        async function addSystemMessageToConversation(connectorId: string, systemMessageObject: Partial<MessageInStore>): Promise<boolean> {
            // ensureConversationRecord can be called here if there's a chance the convo doesn't exist,
            // but system messages are usually for existing convos. If not, ensure it's called.
            await ensureConversationRecord(connectorId); // Ensure convo and its history scaffold exists

            const messageId = polyglotHelpers.generateUUID();
            const fullMessage: MessageInStore = {
                id: messageId,
                sender: systemMessageObject.sender || 'system',
                text: systemMessageObject.text || '',
                type: systemMessageObject.type || 'system_event',
                timestamp: systemMessageObject.timestamp || Date.now(),
                ...systemMessageObject
            };
            console.log("CM_DEBUG addSystemMessage: fullMessage being stored:", JSON.parse(JSON.stringify(fullMessage)));
            const success = convoStore.addMessageToConversationStore(connectorId, fullMessage);
            if (success) {
                convoStore.saveAllConversationsToStorage();
                chatOrchestrator?.notifyNewActivityInConversation?.(connectorId);
            }
            return success;
        }

        function markConversationActive(connectorId: string): boolean {
            const convo = convoStore.updateConversationProperty(connectorId, 'lastActivity', Date.now());
            if (convo) {
                convoStore.saveAllConversationsToStorage();
                return true;
            }
            return false;
        }

        async function getGeminiHistoryForConnector(connectorId: string): Promise<GeminiChatItem[]> {
            const { conversation: convo } = await ensureConversationRecord(connectorId);
            return convo?.geminiHistory ? [...convo.geminiHistory] : [];
        }

        async function clearConversationHistory(connectorId: string): Promise<void> {
            const convoFromStore = convoStore.getConversationById(connectorId); // Sync read
            if (convoFromStore?.connector) {
                convoStore.updateConversationProperty(connectorId, 'messages', []);
                const newHistory = await buildInitialGeminiHistory(convoFromStore.connector);
                convoStore.updateGeminiHistoryInStore(connectorId, newHistory);
                convoStore.updateConversationProperty(connectorId, 'lastActivity', Date.now());
                convoStore.saveAllConversationsToStorage();
                console.log(`CM (Facade): History cleared for ${connectorId}`);
                chatOrchestrator?.notifyNewActivityInConversation?.(connectorId);
            } else {
                console.warn(`CM (Facade) clearConversationHistory: No connector found for ID ${connectorId} to rebuild history.`);
            }
        }
        function buildRelevantHistoryForImageReply(
            fullConversationHistory: GeminiChatItem[],
            currentUserImageMessageId: string
        ): GeminiChatItem[] {
            // Option 1: Minimal history - just the system prompt from the history (if any)
            // and the user's current image message (which isn't in history yet but its text is in the prompt)
            // This is very clean but might lack some conversational flow.
            // return fullConversationHistory.filter(turn => turn.role === 'system'); // Or however you mark system prompts
        
            // Option 2: Last N turns, but be careful if previous turns were about other images.
            // const relevantTurns = fullConversationHistory.slice(-3); // e.g., last 3 turns
            // return relevantTurns;
        
            // Option 3: More sophisticated - find turns related to *this* user message
            // This is harder. For now, a simpler approach might be better.
        
            // Simplest for now: provide no prior conversational history for this specific image reply task,
            // relying entirely on the current prompt and image.
            console.log("TMH: Providing EMPTY conversational history for AI's image reply generation to ensure focus on current image.");
            return []; 
        }
        console.log("conversation_manager.ts (Facade): IIFE FINISHED.");
        return {
            initialize,
            getActiveConversations,
            getConversationById,
            addMessageToConversation,
            ensureConversationRecord,
            addSystemMessageToConversation,
            markConversationActive,
            addModelResponseMessage,
            getGeminiHistoryForConnector,
            clearConversationHistory
        };
    })();

    Object.assign(window.conversationManager!, facadeMethods);

    if (window.conversationManager?.initialize) {
        console.log("conversation_manager.ts (Facade): SUCCESSFULLY assigned and populated window.conversationManager.");
    } else {
        console.error("conversation_manager.ts (Facade): CRITICAL ERROR - window.conversationManager population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('conversationManagerReady'));
    console.log('conversation_manager.ts (Facade): "conversationManagerReady" event dispatched.');

} // End of initializeActualConversationManager

const dependenciesForCMFacade = [
    'polyglotHelpersReady',
    'convoStoreReady', 
    'polyglotDataReady'
];

const cmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForCMFacade.forEach(dep => cmMetDependenciesLog[dep] = false);
let cmDepsMetCount = 0;

function checkAndInitCMFacade(receivedEventName?: string): void {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'polyglotHelpersReady': verified = !!(window.polyglotHelpers?.generateUUID); break;
            case 'convoStoreReady': verified = !!(window.convoStore?.getConversationById); break;
            case 'polyglotDataReady': verified = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)); break;
            default: console.warn(`CM_FACADE_EVENT: Unknown event ${receivedEventName}`); return;
        }

        if (verified && !cmMetDependenciesLog[receivedEventName]) {
            cmMetDependenciesLog[receivedEventName] = true;
            cmDepsMetCount++;
            console.log(`CM_FACADE_DEPS: Event '${receivedEventName}' VERIFIED. Count: ${cmDepsMetCount}/${dependenciesForCMFacade.length}`);
        } else if (!verified) {
            console.warn(`CM_FACADE_EVENT: Event '${receivedEventName}' FAILED verification.`);
        }
    }

    if (cmDepsMetCount === dependenciesForCMFacade.length) {
        console.log('conversation_manager.ts (Facade): All dependencies met. Initializing.');
        initializeActualConversationManager(); 
    }
}

console.log('CM_FACADE_SETUP: Starting initial dependency pre-check.');
cmDepsMetCount = 0;
Object.keys(cmMetDependenciesLog).forEach(key => cmMetDependenciesLog[key] = false);
let cmAllPreloadedAndVerified = true;

dependenciesForCMFacade.forEach((eventName: string) => {
    let isVerifiedNow = false;
     switch (eventName) {
        case 'polyglotHelpersReady': isVerifiedNow = !!(window.polyglotHelpers?.generateUUID); break;
        case 'convoStoreReady': isVerifiedNow = !!(window.convoStore?.getConversationById); break;
        case 'polyglotDataReady': isVerifiedNow = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)); break;
        default: console.warn(`CM_FACADE_PRECHECK: Unknown dependency: ${eventName}`); break;
    }

    if (isVerifiedNow) {
        console.log(`CM_FACADE_PRECHECK: Dependency '${eventName}' ALREADY MET.`);
        if (!cmMetDependenciesLog[eventName]) {
            cmMetDependenciesLog[eventName] = true;
            cmDepsMetCount++;
        }
    } else {
        cmAllPreloadedAndVerified = false;
        console.log(`CM_FACADE_PRECHECK: Dependency '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitCMFacade(eventName), { once: true });
    }
});

if (cmAllPreloadedAndVerified && cmDepsMetCount === dependenciesForCMFacade.length) {
    console.log('conversation_manager.ts (Facade): All dependencies ALREADY MET. Initializing directly.');
    initializeActualConversationManager();
} else if (!cmAllPreloadedAndVerified) {
    console.log(`conversation_manager.ts (Facade): Waiting for ${dependenciesForCMFacade.length - cmDepsMetCount} dependency event(s).`);
} else if (dependenciesForCMFacade.length === 0) { // Should not happen
    initializeActualConversationManager();
}

console.log("conversation_manager.ts (Facade): Script execution FINISHED.");