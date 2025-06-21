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
            updateConversationProperty: () => { console.error("ConvoStore dummy: updateConversationProperty called."); return null; },
            addMessageToConversationStore: () => { console.error("ConvoStore dummy: addMessage called."); return false; },
            getGeminiHistoryFromStore: () => { console.error("ConvoStore dummy: getGeminiHistory called."); return []; },
            updateGeminiHistoryInStore: () => { console.error("ConvoStore dummy: updateGeminiHistory called."); return false; },
            // --- ADD THESE TWO DUMMY FUNCTIONS ---
            getGlobalUserProfile: () => { console.error("ConvoStore dummy: getGlobalUserProfile called."); return ""; },
            updateGlobalUserProfile: () => { console.error("ConvoStore dummy: updateGlobalUserProfile called."); },
            updateUserProfileSummary: function (groupId: string, summary: string): void {
                throw new Error('Function not implemented.');
            }
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

            // --- Logic to check for and expire old images on load ---
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            let wasImageExpired = false;

            for (const convoId in activeConversations) {
                const convo = activeConversations[convoId];
                if (convo.messages) {
                    for (const msg of convo.messages) {
                        if (msg.content_url?.startsWith('data:image') && msg.timestamp < twentyFourHoursAgo) {
                            console.log(`CS_INIT: Expiring image from msg '${msg.id}' (timestamp: ${new Date(msg.timestamp).toLocaleString()}) because it's older than 24 hours.`);
                            msg.content_url = 'image_expired';
                            wasImageExpired = true;
                        }
                    }
                }
            }
            
            // If we expired an image, we need to re-save the store to persist the change.
            if (wasImageExpired) {
                console.log("CS_INIT: An image was expired, re-saving the conversation store.");
                saveAllConversationsToStorage(); // This will save the now-pruned data
            }




    // --- END NEW BLOCK ---
        }

      // Inside the storeInstance IIFE in convo_store.ts
// Inside the storeInstance IIFE in convo_store.ts


// =================== REPLACE THE ENTIRE FUNCTION WITH THIS ===================

function saveAllConversationsToStorage(): void {
    try {
        const conversationsForStorage: ActiveConversationsStore = JSON.parse(JSON.stringify(activeConversations));

        let latestImage: { timestamp: number, convoId: string, msgId: string } | null = null;
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

        // --- PASS 1: Find the absolute most recent image across ALL conversations ---
        for (const convoId in conversationsForStorage) {
            const convo = conversationsForStorage[convoId];
            if (convo.messages) {
                for (const msg of convo.messages) {
                    if (msg.content_url?.startsWith('data:image') && msg.timestamp > (latestImage?.timestamp || 0)) {
                        // Check if the image is NOT older than 24 hours
                        if (msg.timestamp >= twentyFourHoursAgo) {
                            latestImage = { timestamp: msg.timestamp, convoId, msgId: msg.id! };
                        } else {
                            // This image is already expired, mark it for removal immediately
                            console.log(`CS_SAVE: Expiring old image on save: msg '${msg.id}'`);
                            msg.content_url = 'image_expired';
                        }
                    }
                }
            }
        }

        // --- PASS 2: Prune all other images and clean up ---
        for (const convoId in conversationsForStorage) {
            const convo = conversationsForStorage[convoId];
            if (convo.messages) {
                for (const msg of convo.messages) {
                    // Prune large auxiliary data from ALL messages to save space
                    if (msg.imagePartsForGemini) delete msg.imagePartsForGemini;
                    if ((msg as any).base64ImageDataForAI) delete (msg as any).base64ImageDataForAI;

                    // Now, handle the main image data
                    if (msg.content_url?.startsWith('data:image')) {
                        const isTheOneToKeep = latestImage && convoId === latestImage.convoId && msg.id === latestImage.msgId;
                        if (!isTheOneToKeep) {
                            // This is an older image or one that was just expired.
                            // Mark it as expired for the UI renderer.
                            msg.content_url = 'image_expired';
                        }
                    }
                }
            }
        }

        if (latestImage) {
            console.log(`CS_SAVE: The single image being kept is msg '${latestImage.msgId}' in convo '${latestImage.convoId}'.`);
        } else {
            console.log("CS_SAVE: No recent images found to keep. All Base64 data will be pruned.");
        }

        polyglotHelpers.saveToLocalStorage(STORAGE_KEY, conversationsForStorage);

    } catch (e: any) {
        console.error(`ConvoStore: Critical error in saveAllConversationsToStorage.`, e);
        if (e.name === 'QuotaExceededError') {
            alert("Storage Error: Your browser storage is full, which may cause chat history to be lost. Please try clearing the site data.");
        }
    }
}
// ============================================================================

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

      // D:\polyglot_connect\src\js\core\convo_store.ts

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
        
        // <<< START: THIS IS THE FIX >>>
        // 1. Immediately save the entire state to localStorage. This prevents race conditions.
        saveAllConversationsToStorage();

        // 2. Dispatch a specific event to notify the UI to refresh the chat list.
        document.dispatchEvent(new CustomEvent('polyglot-conversation-updated', {
            detail: {
                type: 'one-on-one',
                id: connectorId
            }
        }));
        console.log(`ConvoStore: Dispatched 'polyglot-conversation-updated' for 1-on-1 chat: ${connectorId}`);
        // <<< END: THIS IS THE FIX >>>
        
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
        function updateUserProfileSummary(connectorId: string, summary: string): void {
            if (activeConversations[connectorId]) {
                activeConversations[connectorId].userProfileSummary = summary;
                console.log(`[CONVO_STORE] Updated user profile summary for conversation: ${connectorId}`);
                // Note: We don't save to storage here. The calling function is responsible
                // for triggering a save after making all necessary updates.
            } else {
                console.warn(`[CONVO_STORE] updateUserProfileSummary: No conversation found for ID: ${connectorId}`);
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
            updateGlobalUserProfile,
            updateUserProfileSummary
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