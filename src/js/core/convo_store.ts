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
            clearCache: () => console.error("ConvoStore dummy: clearCache called."),
            cacheConversation: () => console.error("ConvoStore dummy: cacheConversation called."),
            cacheMessage: () => console.error("ConvoStore dummy: cacheMessage called."),
            removeConversationFromCache: () => console.error("ConvoStore dummy: removeConversationFromCache called."),
            getConversationById: () => { console.error("ConvoStore dummy: getConversationById called."); return null; },
            getAllConversationsAsArray: () => { console.error("ConvoStore dummy: getAllConversationsAsArray called."); return []; },
            getGeminiHistoryFromStore: () => { console.error("ConvoStore dummy: getGeminiHistory called."); return []; },
            updateGeminiHistoryInStore: () => { console.error("ConvoStore dummy: updateGeminiHistory called."); return false; },
            getGlobalUserProfile: () => { console.error("ConvoStore dummy: getGlobalUserProfile called."); return ""; },
            updateGlobalUserProfile: () => { console.error("ConvoStore dummy: updateGlobalUserProfile called."); },
            updateUserProfileSummary: () => { console.error("ConvoStore dummy: updateUserProfileSummary called."); },
            addOptimisticMessage: () => console.error("ConvoStore dummy: addOptimisticMessage called."),
            saveAllConversationsToStorage: () => console.error("ConvoStore dummy: saveAll called."),
        };
        Object.assign(window.convoStore!, dummyMethods);
        document.dispatchEvent(new CustomEvent('convoStoreReady'));
        console.warn('convo_store.ts: "convoStoreReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('convo_store.ts: Core functional dependencies (polyglotHelpers) appear ready.');
const storeInstance = ((): ConvoStoreModule => {
    'use strict';
    console.log("ConvoStore: IIFE executing (Firestore-backed cache version).");

    // This is now just an in-memory map. No more localStorage keys.
    let conversationCache: { [conversationId: string]: ConversationRecordInStore } = {};
    let userProfileCache: { [userId: string]: string } = {};

    function initializeStore(): void {
        // When initializing, we start with a clean slate.
        conversationCache = {};
        userProfileCache = {};
        console.log("ConvoStore: In-memory cache initialized (cleared). Waiting for data from Firestore listener.");
    }
    
    // Clears all data from the cache. Called on logout.
    function clearCache(): void {
        conversationCache = {};
        userProfileCache = {};
        console.log("ConvoStore: Cache cleared successfully.");
    }

    // --- Cache Management Functions (called by ConversationManager) ---

    function cacheConversation(conversationId: string, data: Partial<ConversationRecordInStore>): void {
        if (!conversationCache[conversationId]) {
            // If it's the first time we're seeing this convo, create a default record.
            conversationCache[conversationId] = {
                id: conversationId,
                messages: [],
                lastActivity: 0,
                geminiHistory: [],
                ...data,
            };
             console.log(`ConvoStore: NEW conversation cached: ${conversationId}`);
        } else {
            // Otherwise, merge the new data into the existing cached record.
            Object.assign(conversationCache[conversationId], data);
            console.log(`ConvoStore: UPDATED cached conversation: ${conversationId}`);
        }
    }

    function cacheMessage(conversationId: string, message: MessageInStore): void {
        if (!conversationCache[conversationId]) {
            console.warn(`ConvoStore: Tried to cache message for non-existent conversation ${conversationId}.`);
            // Optionally, you could create a placeholder convo here, but it's better if convos are cached first.
            return;
        }
        const existingMessages = conversationCache[conversationId].messages;
        const messageExists = existingMessages.some(m => m.id === message.id);

        if (!messageExists) {
            existingMessages.push(message);
            // Sort messages by timestamp just in case they arrive out of order
            existingMessages.sort((a, b) => a.timestamp - b.timestamp);
        }
    }
    
    function removeConversationFromCache(conversationId: string): void {
        if (conversationCache[conversationId]) {
            delete conversationCache[conversationId];
            console.log(`ConvoStore: Removed conversation ${conversationId} from cache.`);
        }
    }
    
    // --- Synchronous Getters for UI ---
    
    function getConversationById(conversationId: string): ConversationRecordInStore | null {
        return conversationCache[conversationId] || null;
    }

    function getAllConversationsAsArray(): ConversationRecordInStore[] {
        return Object.values(conversationCache);
    }
    
    // --- Gemini History and Profile (remain local for now) ---
    
    function getGeminiHistoryFromStore(conversationId: string): GeminiChatItem[] {
        return conversationCache[conversationId]?.geminiHistory ? [...conversationCache[conversationId].geminiHistory] : [];
    }

    function updateGeminiHistoryInStore(conversationId: string, newHistoryArray: GeminiChatItem[]): boolean {
        if (conversationCache[conversationId]) {
            conversationCache[conversationId].geminiHistory = newHistoryArray;
            return true;
        }
        return false;
    }
    
    function updateUserProfileSummary(conversationId: string, summary: string): void {
         if (conversationCache[conversationId]) {
            conversationCache[conversationId].userProfileSummary = summary;
        }
    }
    
    function getGlobalUserProfile(userId: string = 'default_user'): string {
        return userProfileCache[userId] || "";
    }

    function updateGlobalUserProfile(newSummary: string, userId: string = 'default_user'): void {
        userProfileCache[userId] = newSummary;
    }


    // PASTE THIS NEW FUNCTION inside the convo_store.ts IIFE

function addOptimisticMessage(conversationId: string, message: MessageInStore): void {
    const conversation = conversationCache[conversationId];
    if (!conversation) {
        console.warn(`ConvoStore: Tried to add optimistic message to non-existent conversation ${conversationId}.`);
        return;
    }

    // Add the new message to the start of the UI, but also to our local data model
    conversation.messages.push(message);

    // Also update the last activity and preview for immediate sorting
    conversation.lastActivity = message.timestamp;
    conversation.lastMessagePreview = `You: ${message.text}`; // Assuming it's a user message
    
    console.log(`ConvoStore: Optimistically added message and updated activity for ${conversationId}.`);
}

    // OBSOLETE, but kept to satisfy the old interface during transition. Does nothing.
    function saveAllConversationsToStorage(): void {
        // This function is now intentionally left blank.
        // console.log("ConvoStore: `saveAllConversationsToStorage` called, but it's obsolete. Firestore is the source of truth.");
    }

    // Run the initializer
    initializeStore();

    return {
        initializeStore,
        clearCache,
        cacheConversation,
        cacheMessage,
        removeConversationFromCache,
        getConversationById,
        getAllConversationsAsArray,
        getGeminiHistoryFromStore,
        updateGeminiHistoryInStore,
        updateUserProfileSummary,
        getGlobalUserProfile,
        updateGlobalUserProfile,
        addOptimisticMessage, // <<< ADD THIS LINE
        saveAllConversationsToStorage // Keep for now to prevent breaking other files
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