// D:\polyglot_connect\src\js\core\convo_store.ts
import type {
    PolyglotHelpersOnWindow,
    Connector,
    GeminiChatItem,
    MessageInStore,               // <<< IMPORT if defined in global.d.ts
    ConversationRecordInStore,    // <<< IMPORT if defined in global.d.ts
    ConvoStoreModule              // <<< IMPORT THIS
} from '../types/global.d.ts';

console.log('convo_store.ts: Script loaded, waiting for core dependencies.');

// --- Internal Type Definitions (can be moved to global.d.ts if widely used) ---

// Placeholder
interface ActiveConversationsStore { // <<< MOVED HERE
    [connectorId: string]: ConversationRecordInStore;
}
window.convoStore = {} as ConvoStoreModule;
console.log('convo_store.ts: Placeholder window.convoStore assigned.');

// --- Actual Initialization ---
function initializeActualConvoStore(): void {
    console.log("convo_store.ts: initializeActualConvoStore() called.");

    type VerifiedDeps = {
        polyglotHelpers: PolyglotHelpersOnWindow;
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = { polyglotHelpers: window.polyglotHelpers };
        if (!deps.polyglotHelpers || typeof deps.polyglotHelpers.loadFromLocalStorage !== 'function') {
            console.error("ConvoStore: getSafeDeps - polyglotHelpers missing or invalid.");
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("convo_store.ts: CRITICAL - polyglotHelpers not ready. Store cannot initialize properly.");
        // Still assign dummy methods and dispatch ready so dependent modules don't hang,
        // but they will operate on an empty/non-functional store.
        const dummyMethods: ConvoStoreModule = {
            initializeStore: () => console.error("ConvoStore dummy: initializeStore called."),
            saveAllConversationsToStorage: () => console.error("ConvoStore dummy: saveAll called."),
            getConversationById: () => { console.error("ConvoStore dummy: getConversationById called."); return null; },
            getAllConversationsAsArray: () => { console.error("ConvoStore dummy: getAllConversationsAsArray called."); return []; },
            createNewConversationRecord: () => { console.error("ConvoStore dummy: createNew called."); return null; },
            updateConversationProperty: () => { console.error("ConvoStore dummy: updateConversationProperty called."); return null;},
            addMessageToConversationStore: () => { console.error("ConvoStore dummy: addMessage called."); return false; },
            getGeminiHistoryFromStore: () => { console.error("ConvoStore dummy: getGeminiHistory called."); return []; },
            updateGeminiHistoryInStore: () => { console.error("ConvoStore dummy: updateGeminiHistory called."); return false; },
            // --- ADD THESE TWO DUMMY FUNCTIONS ---
            getGlobalUserProfile: () => { console.error("ConvoStore dummy: getGlobalUserProfile called."); return ""; },
            updateGlobalUserProfile: () => { console.error("ConvoStore dummy: updateGlobalUserProfile called."); }
        };
        Object.assign(window.convoStore!, dummyMethods);
        document.dispatchEvent(new CustomEvent('convoStoreReady'));
        console.warn('convo_store.ts: "convoStoreReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('convo_store.ts: Core functional dependencies (polyglotHelpers) appear ready.');

    const storeInstance = ((): ConvoStoreModule => {
        'use strict';
        const { polyglotHelpers } = resolvedDeps!;
        
        // 'activeConversations' is now declared in the outer scope of the IIFE,
        // but its type 'ActiveConversationsStore' needs to be visible here.
        let activeConversations: ActiveConversationsStore = {}; // << This should now find the type
        let globalUserProfile: { [userId: string]: string } = {}; // <<< ADD THIS LINE
        const STORAGE_KEY = 'polyglotActiveConversations';
        const USER_PROFILE_STORAGE_KEY = 'polyglotUserProfile'; // <<< ADD THIS LINE
        function initializeStore(): void {
            const saved = polyglotHelpers.loadFromLocalStorage(STORAGE_KEY);
            if (saved && typeof saved === 'object') {
                activeConversations = saved;
                Object.keys(activeConversations).forEach(id => {
                    const convo = activeConversations[id];
                    if (!convo.messages || !Array.isArray(convo.messages)) convo.messages = [];
                    if (!convo.geminiHistory || !Array.isArray(convo.geminiHistory)) convo.geminiHistory = [];
                    if (!convo.id) convo.id = id; // Ensure ID consistency
                });
                console.log(`ConvoStore: Initialized. Loaded ${Object.keys(activeConversations).length} conversations from localStorage.`);
            } else {
                activeConversations = {};
                console.log("ConvoStore: Initialized. No valid saved data. Starting fresh.");
            }
                    // --- ADD THIS NEW BLOCK ---
                    const savedProfile = polyglotHelpers.loadFromLocalStorage(USER_PROFILE_STORAGE_KEY);
                    if (savedProfile && typeof savedProfile === 'object') {
                        globalUserProfile = savedProfile;
                        console.log(`ConvoStore: Initialized. Loaded user profile data.`);
                    } else {
                globalUserProfile = {};
                console.log("ConvoStore: Initialized. No saved user profile found.");
            }
    // --- END NEW BLOCK ---
        }

      // Inside the storeInstance IIFE in convo_store.ts
// Inside the storeInstance IIFE in convo_store.ts

function saveAllConversationsToStorage(): void {
    try {
        // Create a deep copy to modify for localStorage
        // This ensures we don't alter the live 'activeConversations' object
        const conversationsForLocalStorage: ActiveConversationsStore = JSON.parse(JSON.stringify(activeConversations));

        for (const convoId in conversationsForLocalStorage) {
            if (Object.prototype.hasOwnProperty.call(conversationsForLocalStorage, convoId)) {
                const convo = conversationsForLocalStorage[convoId];

                // Prune messages within the conversation
                if (convo.messages && Array.isArray(convo.messages)) {
                    convo.messages = convo.messages.map(msg => {
                        const msgCopy = { ...msg }; // msg is already a copy from the deep clone

                        // Prune ONLY auxiliary image data, NOT the main display URLs (content_url, audioBlobDataUrl)
                        if (msgCopy.type === 'image' || msgCopy.isImageMessage) {
                            if (msgCopy.imagePartsForGemini) {
                                delete msgCopy.imagePartsForGemini;
                            }
                            if ((msgCopy as any).base64ImageDataForAI) { 
                                delete (msgCopy as any).base64ImageDataForAI;
                            }
                            // DO NOT DELETE/MODIFY msgCopy.content_url if it's 'data:image...' here
                            // if you want it to be available on page refresh from localStorage.
                        }

                        // DO NOT DELETE/MODIFY msgCopy.audioBlobDataUrl if it's 'data:audio...' here
                        // if you want it to be available on page refresh from localStorage.
                        
                        return msgCopy;
                    });
                }

                // Prune Gemini history (this is usually safe as it's for AI context, not direct rendering)
                if (convo.geminiHistory && Array.isArray(convo.geminiHistory)) {
                    convo.geminiHistory = convo.geminiHistory.map(turn => {
                        if (turn.parts && Array.isArray(turn.parts)) {
                            const newParts = turn.parts.map(part => {
                                const inlineDataPart = part as { inlineData?: { mimeType: string; data: string } };
                                if (inlineDataPart.inlineData && inlineDataPart.inlineData.data && inlineDataPart.inlineData.data.length > 500) { // Heuristic
                                    return { ...part, inlineData: { mimeType: inlineDataPart.inlineData.mimeType, data: '[omitted_base64_history_part]' } };
                                }
                                return part;
                            });
                            return { ...turn, parts: newParts };
                        }
                        return turn;
                    });
                }
            }
        }
        // Now save this version (with media URLs intact but other large parts pruned) to localStorage
        polyglotHelpers.saveToLocalStorage(STORAGE_KEY, conversationsForLocalStorage);
        // console.log(`ConvoStore: Saved conversations (media URLs retained) to localStorage for key '${STORAGE_KEY}'.`);

    } catch (e: any) {
        console.error(`ConvoStore: Error in saveAllConversationsToStorage for key '${STORAGE_KEY}'. Message: ${e.message}`, e.stack ? e.stack.substring(0, 400) : '');
        if (e.name === 'QuotaExceededError' || (e.message && e.message.toLowerCase().includes('quota'))) {
            console.error("LOCALSTORAGE QUOTA EXCEEDED! Data for 'polyglotActiveConversations' was not saved or was truncated. Images/audio might be lost on next refresh if new data pushes it over.");
        }
    }
}

        function getConversationById(connectorId: string): ConversationRecordInStore | null {
            return activeConversations[connectorId] || null;
        }

        function getAllConversationsAsArray(): ConversationRecordInStore[] {
            return Object.values(activeConversations);
        }

        function createNewConversationRecord(connectorId: string, connectorData: Connector): ConversationRecordInStore | null {
            if (activeConversations[connectorId]) {
                return activeConversations[connectorId];
            }
            const newRecord: ConversationRecordInStore = {
                id: connectorId,
                connector: { ...connectorData }, // Store a copy
                messages: [],
                lastActivity: Date.now(),
                geminiHistory: [], // To be initialized by prompt builder via facade
                userProfileSummary: "" // <<< ADD THIS NEW LINE
            };
            activeConversations[connectorId] = newRecord;
            saveAllConversationsToStorage();
            console.log(`ConvoStore: New conversation record CREATED for ${connectorId}.`);
            return newRecord;
        }

        function updateConversationProperty(
            connectorId: string,
            propertyName: keyof ConversationRecordInStore,
            value: any
        ): ConversationRecordInStore | null {
            if (!activeConversations[connectorId]) return null;
            if (propertyName === 'id') return activeConversations[connectorId]; // ID shouldn't change
            
            (activeConversations[connectorId] as any)[propertyName] = value;
            activeConversations[connectorId].lastActivity = Date.now();
            // Save handled by higher-level functions usually
            return activeConversations[connectorId];
        }

        function addMessageToConversationStore(connectorId: string, messageObject: MessageInStore): boolean {
            if (!activeConversations[connectorId]) return false;
            if (!activeConversations[connectorId].messages) activeConversations[connectorId].messages = [];
            // VVVVV ADD THIS LOG VVVVV
    console.log(`CONVO_STORE_ADD_MSG for ${connectorId}: ID='${messageObject.id}', Text='${messageObject.text?.substring(0,30)}', isVoiceMemo='${messageObject.isVoiceMemo}', audioBlobDataUrl PRESENT='${!!messageObject.audioBlobDataUrl}', Type='${messageObject.type}'`);
    if (messageObject.isVoiceMemo) {
        console.log(`CONVO_STORE_ADD_MSG_VOICE_URL for ${connectorId}: ${messageObject.audioBlobDataUrl?.substring(0,100)}...`);
    }
    // ^^^^^ ADD THIS LOG ^^^^^
            // DEBUG LOG (as per your request)
            console.log("CS_DEBUG addMessageToStore: messageObject being pushed:", JSON.parse(JSON.stringify(messageObject)));

            activeConversations[connectorId].messages.push(messageObject);
            activeConversations[connectorId].lastActivity = messageObject.timestamp || Date.now();
            // Save handled by higher-level functions
            return true;
        }

        function getGeminiHistoryFromStore(connectorId: string): GeminiChatItem[] {
            const convo = activeConversations[connectorId];
            return convo?.geminiHistory ? [...convo.geminiHistory] : []; // Return a copy
        }

        function updateGeminiHistoryInStore(connectorId: string, newHistoryArray: GeminiChatItem[]): boolean {
            if (!activeConversations[connectorId] || !Array.isArray(newHistoryArray)) return false;
            activeConversations[connectorId].geminiHistory = newHistoryArray;
            // Save handled by higher-level functions
            return true;
        }
        
        function getGlobalUserProfile(userId: string = 'default_user'): string {
            const profile = globalUserProfile[userId] || "";
            console.log(`[CONVO_STORE] getGlobalUserProfile called for user '${userId}'. Returning summary:\n---`, profile || "[Empty]", "\n---");
            return profile;
        }
    
        function updateGlobalUserProfile(newSummary: string, userId: string = 'default_user'): void {
            console.log(`[CONVO_STORE] updateGlobalUserProfile called for user '${userId}'. Saving new summary:\n---`, newSummary, "\n---");
            globalUserProfile[userId] = newSummary;
            try {
                polyglotHelpers.saveToLocalStorage(USER_PROFILE_STORAGE_KEY, globalUserProfile);
                console.log(`[CONVO_STORE] Successfully saved global user profile to localStorage.`);
            } catch (e: any) {
                console.error(`[CONVO_STORE] FAILED to save global user profile to localStorage.`, e);
            }
        }
    


        // Call initializeStore when the IIFE runs
        initializeStore();

        return {
            initializeStore, // Expose if re-initialization is ever needed, or make internal
            saveAllConversationsToStorage,
            getConversationById,
            getAllConversationsAsArray,
            createNewConversationRecord,
            updateConversationProperty,
            addMessageToConversationStore,
            getGeminiHistoryFromStore,
            updateGeminiHistoryInStore,
            getGlobalUserProfile,
            updateGlobalUserProfile
        };
    })();

    Object.assign(window.convoStore!, storeInstance);

    if (window.convoStore && typeof window.convoStore.getConversationById === 'function') {
        console.log("convo_store.ts: SUCCESSFULLY assigned and populated window.convoStore.");
    } else {
        console.error("convo_store.ts: CRITICAL ERROR - window.convoStore population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('convoStoreReady'));
    console.log('convo_store.ts: "convoStoreReady" event dispatched.');

} // End of initializeActualConvoStore

// --- Event listening logic & Initialization ---
const dependenciesForConvoStore = ['polyglotHelpersReady']; // Only needs helpers

const csMetDependenciesLog: { [key: string]: boolean } = { 'polyglotHelpersReady': false };
let csDepsMetCount = 0;

function checkAndInitConvoStore(receivedEventName?: string): void {
    if (receivedEventName === 'polyglotHelpersReady') {
        if (!csMetDependenciesLog[receivedEventName]) {
            if (window.polyglotHelpers && typeof window.polyglotHelpers.loadFromLocalStorage === 'function') {
                csMetDependenciesLog[receivedEventName] = true;
                csDepsMetCount++;
                console.log(`CS_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${csDepsMetCount}/${dependenciesForConvoStore.length}`);
            } else {
                console.warn(`CS_EVENT: Event '${receivedEventName}' received, but polyglotHelpers verification FAILED.`);
            }
        }
    }
    if (csDepsMetCount === dependenciesForConvoStore.length) {
        console.log('convo_store.ts: All dependencies met. Initializing actual ConvoStore.');
        initializeActualConvoStore();
    }
}

// --- Initial Pre-Check and Listener Setup ---
console.log('CS_SETUP: Starting initial dependency pre-check for ConvoStore.');
csDepsMetCount = 0;
csMetDependenciesLog['polyglotHelpersReady'] = false; // Reset
let csAllPreloadedAndVerified = true;

if (window.polyglotHelpers && typeof window.polyglotHelpers.loadFromLocalStorage === 'function') {
    console.log(`CS_PRECHECK: Dependency 'polyglotHelpersReady' ALREADY MET AND VERIFIED.`);
    csMetDependenciesLog['polyglotHelpersReady'] = true;
    csDepsMetCount++;
} else {
    csAllPreloadedAndVerified = false;
    console.log(`CS_PRECHECK: Dependency 'polyglotHelpersReady' not ready/verified. Adding listener.`);
    document.addEventListener('polyglotHelpersReady', function anEventListener() {
        checkAndInitConvoStore('polyglotHelpersReady');
    }, { once: true });
}

if (csAllPreloadedAndVerified && csDepsMetCount === dependenciesForConvoStore.length) {
    console.log('convo_store.ts: All dependencies ALREADY MET. Initializing directly.');
    initializeActualConvoStore();
} else if (csDepsMetCount === 0 && !csAllPreloadedAndVerified) {
    console.log(`convo_store.ts: No dependencies pre-verified. Waiting for events.`);
}
console.log("convo_store.ts: Script execution FINISHED.");