// D:\polyglot_connect\src\js\core\chat_orchestrator.ts

// This file contains the ChatOrchestrator module, which is the central
// orchestrator for the chat functionality of the Polyglot Connect application.
// It provides the following functions:
//
// - checkAndInitChatOrchestrator(): Checks if all structural dependencies are
//   met and initializes the ChatOrchestrator if they are.
// - setupChatOrchestrator(): Sets up the ChatOrchestrator by adding event
//   listeners and initializing the ConversationManager, GroupManager, and
//   ChatSessionHandler.
// - handleCurrentSessionChange(): Handler for the currentSessionChange event,
//   which updates the current session and triggers the update of the UI.
// - handleNewMessage(): Handler for the newMessage event, which updates the
//   current session and triggers the update of the UI.
// - handleNewGroupMessage(): Handler for the newGroupMessage event, which
//   updates the current session and triggers the update of the UI.
// - handleChatSessionChange(): Handler for the chatSessionChange event, which
//   updates the current session and triggers the update of the UI.

// D:\polyglot_connect\src\js\core\chat_orchestrator.ts

import type {
    YourDomElements,
    ListRenderer,
    UiUpdater,
    ModalHandler,
    ConversationManager,
    GroupManager,
    GroupDataManager, // <<< ENSURE THIS IS PRESENT
   
    ChatActiveTargetManager,
    TextMessageHandler,
    VoiceMemoHandler,
    PersonaModalManager,
    CardRenderer,
    ActivityManager,
    ChatUiManager,
    Group,  
    Connector,
    PolyglotApp,
    CombinedChatItem,
    ActiveOneOnOneChatItem,
    ActiveGroupListItem,
    ConversationItem,
    GroupChatHistoryItem,
    MessageInStore,
    PolyglotHelpersOnWindow // <<< REPLACE PolyglotHelpers WITH THIS
} from '../types/global'; // Path from src/js/core to src/js/types
// In chat_orchestrator.ts
import type { ChatSessionHandlerModule as ChatSessionHandler } from '../types/global';


console.log('chat_orchestrator.ts: Script loaded, waiting for STRUCTURAL dependencies.');
// --- START: DUPLICATION FIX - Module-scoped lock for handleMessagesTabActive ---
let co_isHandlingMessagesTabActive = false; 
// --- END: DUPLICATION FIX ---
interface ChatOrchestratorModule {
    initialize: () => void;
    openConversation: (connector: Connector) => void;
    openMessageModal: (connector: Connector) => void;
    handleMessagesTabActive: () => void;
    handleGroupsTabActive: () => void; // <<< ADD THIS LINE
    renderCombinedActiveChatsList: () => void;
    notifyNewActivityInConversation: (connectorId: string) => void;
    getTextMessageHandler: () => TextMessageHandler | undefined;
    getVoiceMemoHandler: () => VoiceMemoHandler | undefined;
    getCurrentEmbeddedChatTargetId: () => string | null | undefined;
    getCurrentModalMessageTarget: () => Connector | null | undefined;
    getCombinedActiveChats?: () => CombinedChatItem[]; // Ensure this matches global.d.ts
}

// Define a type for the dependency specifications
type DependencySpec = {
    name: string;
    getter: () => any; // Will be cast later
    keyFn?: string;
};

function initializeActualChatOrchestrator(): void {
    console.log('chat_orchestrator.ts: initializeActualChatOrchestrator() called.');

    // STRUCTURAL_DEPENDENCIES_SPEC as defined in your JS
    // These are needed for the IIFE to even define its structure.
    const STRUCTURAL_DEPENDENCIES_SPEC: DependencySpec[] = [
        { name: 'textMessageHandler', getter: () => window.textMessageHandler },
        { name: 'voiceMemoHandler', getter: () => window.voiceMemoHandler },
    ];

    let allStructuralDepsMet = true;
    const missingStructuralDeps: string[] = [];
    STRUCTURAL_DEPENDENCIES_SPEC.forEach(spec => {
        const dep = spec.getter();
        if (!dep) {
            console.error(`ChatOrchestrator: STRUCTURAL DEPENDENCY MISSING - window.${spec.name}.`);
            missingStructuralDeps.push(spec.name);
            allStructuralDepsMet = false;
        }
    });

    if (!allStructuralDepsMet) {
        const errorMsgBase = `ChatOrchestrator cannot be defined (missing STRUCTURAL deps: ${missingStructuralDeps.join(', ')}). Dummy returned.`;
        console.error(errorMsgBase);
        const dummy: Partial<ChatOrchestratorModule> = {}; // Use Partial for dummy
        ['initialize', 'openConversation', /* ... other methods ... */ 'getCurrentModalMessageTarget']
        .forEach(methodName => {
            (dummy as any)[methodName] = () => console.error(`${errorMsgBase} Method '${methodName}' called.`);
        });
        window.chatOrchestrator = dummy as ChatOrchestratorModule; // Cast to satisfy window type
        window.chatManager = window.chatOrchestrator; // Alias
        document.dispatchEvent(new CustomEvent('chatOrchestratorReady')); // Dispatch even on failure
        document.dispatchEvent(new CustomEvent('chatManagerReady'));    // Dispatch for alias too
        console.warn('chat_orchestrator.ts: "chatOrchestratorReady" / "chatManagerReady" events dispatched (initialization failed).');
        return;
    }
    console.log('chat_orchestrator.ts: All STRUCTURAL dependencies appear ready.');



    console.log("CO_PRE_IIFE_DEBUG: window.chatSessionHandler at this point:", window.chatSessionHandler);
    console.log("CO_PRE_IIFE_DEBUG: typeof window.chatSessionHandler?.openConversationInEmbeddedView:", typeof window.chatSessionHandler?.openConversationInEmbeddedView);


    window.chatOrchestrator = ((): ChatOrchestratorModule => {
        'use strict';
        console.log("chat_orchestrator.ts: IIFE (module definition) STARTING.");

        const METHOD_DEPENDENCIES_SPEC: DependencySpec[] = [
            { name: 'domElements', getter: () => window.domElements as YourDomElements | undefined },
            { name: 'listRenderer', getter: () => window.listRenderer as ListRenderer | undefined },
            { name: 'uiUpdater', getter: () => window.uiUpdater as UiUpdater | undefined },
            { name: 'modalHandler', getter: () => window.modalHandler as ModalHandler | undefined },
            { name: 'conversationManager', getter: () => window.conversationManager as ConversationManager | undefined, keyFn: 'getActiveConversations' },
            { name: 'groupManager', getter: () => window.groupManager as GroupManager | undefined, keyFn: 'getAllGroupDataWithLastActivity' },
            // --- START OF MODIFICATION CO.FIX.DEPS.1 ---
            { name: 'groupDataManager', getter: () => window.groupDataManager as GroupDataManager | undefined, keyFn: 'getCurrentGroupId' }, // <<< ADD THIS LINE
            // --- END OF MODIFICATION CO.FIX.DEPS.1 ---
            { name: 'chatSessionHandler', getter: () => window.chatSessionHandler as ChatSessionHandler | undefined, keyFn: 'openConversationInEmbeddedView' },
            { name: 'chatActiveTargetManager', getter: () => window.chatActiveTargetManager as ChatActiveTargetManager | undefined, keyFn: 'getEmbeddedChatTargetId' },
            { name: 'textMessageHandler', getter: () => window.textMessageHandler as TextMessageHandler | undefined, keyFn: 'sendEmbeddedTextMessage' },
            { name: 'voiceMemoHandler', getter: () => window.voiceMemoHandler as VoiceMemoHandler | undefined, keyFn: 'handleNewVoiceMemoInteraction' },
            { name: 'personaModalManager', getter: () => window.personaModalManager as PersonaModalManager | undefined },
            { name: 'tabManager', getter: () => window.tabManager as import('../types/global').TabManagerModule | undefined, keyFn: 'switchToTab' },
            { name: 'chatUiManager', getter: () => window.chatUiManager as ChatUiManager | undefined, keyFn: 'showEmbeddedChatInterface' },
       
            { name: 'tabManager', getter: () => window.tabManager as import('../types/global').TabManagerModule | undefined, keyFn: 'switchToTab' },
            { name: 'polyglotHelpers', getter: () => window.polyglotHelpers as PolyglotHelpersOnWindow | undefined },
        ];

        type ResolvedDeps = {
            domElements?: YourDomElements; listRenderer?: ListRenderer; uiUpdater?: UiUpdater; modalHandler?: ModalHandler;
            conversationManager?: ConversationManager; groupManager?: GroupManager;
            groupDataManager?: GroupDataManager;
            chatSessionHandler?: ChatSessionHandler;
            chatActiveTargetManager?: ChatActiveTargetManager; textMessageHandler?: TextMessageHandler; voiceMemoHandler?: VoiceMemoHandler;
            personaModalManager?: PersonaModalManager;
            tabManager?: import('../types/global').TabManagerModule;
            chatUiManager?: ChatUiManager;
            polyglotHelpers?: PolyglotHelpersOnWindow; // <<< Use the correct imported type name
        };
       // Inside ChatOrchestrator's IIFE
          // --- START OF MODIFICATION (CO.DEBUG.1a) ---
          const getResolvedDeps = (): ResolvedDeps => {
            const resolved: Partial<ResolvedDeps> = {};
            // console.log("CO_DEBUG: getResolvedDeps - Fetching dependencies from window..."); 
            METHOD_DEPENDENCIES_SPEC.forEach(spec => {
                const dep = spec.getter();
                (resolved as any)[spec.name] = dep;
                // if (spec.name === 'conversationManager') {
                //     console.log(`CO_DEBUG: getResolvedDeps - window.conversationManager fetched. Exists: ${!!dep}, Has getActiveConversations: ${typeof (dep as any)?.getActiveConversations === 'function'}`);
                // }
            });
            return resolved as ResolvedDeps;
        };
// --- END OF MODIFICATION (CO.DEBUG.1a) ---

        // --- PASTE ALL YOUR ORIGINAL IIFE FUNCTIONS HERE ---
        // (initialize, getCombinedActiveChats, handleActiveChatItemClickInternal, etc.)
        // Update them to use 'deps.dependencyName' and add types.

     
        let co_isInitialized = false; // <<< ADD THIS LINE just before the function

        function initialize(): void {
            if (co_isInitialized) {
                return;
            }
            co_isInitialized = true;
            console.log("ChatOrchestrator: Initializing event listeners for UI updates.");
        
            // This listener now redraws the chat list whenever a conversation
            // is added, modified, or removed from the Firestore-backed cache.
            document.addEventListener('polyglot-conversation-updated', (e: Event) => {
                const detail = (e as CustomEvent).detail;
                console.log(`ChatOrchestrator: 'polyglot-conversation-updated' event received. Detail:`, detail);
                setTimeout(() => { // Give cache a moment to settle
                    requestAnimationFrame(renderCombinedActiveChatsList);
                }, 50); // Small delay, e.g., 50ms
            });
        }

   function getCombinedActiveChats(): CombinedChatItem[] {
    console.log("CO_DEBUG: getCombinedActiveChats - START."); // <<< DEBUG LOG
    const deps = getResolvedDeps(); 
    if (!deps) {
        console.error("CO.getCombinedActiveChats: getResolvedDeps failed unexpectedly (returned null/undefined).");
        return [];
    }
    const { conversationManager, groupManager } = deps;

    console.log("CO_DEBUG: getCombinedActiveChats - conversationManager object from deps:", conversationManager); // <<< DEBUG LOG
    console.log("CO_DEBUG: getCombinedActiveChats - typeof conversationManager.getActiveConversations:", typeof conversationManager?.getActiveConversations); // <<< DEBUG LOG

    let oneOnOneChatItems: ActiveOneOnOneChatItem[] = [];
    if (conversationManager && typeof conversationManager.getActiveConversations === 'function') {
        console.log("CO_DEBUG: getCombinedActiveChats - Calling conversationManager.getActiveConversations()."); // <<< DEBUG LOG
        const rawConversations: ConversationItem[] = conversationManager.getActiveConversations();
        console.log("CO_DEBUG: getCombinedActiveChats - Raw conversations received:", JSON.parse(JSON.stringify(rawConversations || []))); // <<< DEBUG LOG
      // in chat_orchestrator.ts


      
      oneOnOneChatItems = rawConversations.map((convo: ConversationItem): ActiveOneOnOneChatItem => {
        // Ensure lastActivity is always a number.
        const numericLastActivity = typeof convo.lastActivity === 'string'
            ? parseInt(convo.lastActivity, 10)
            : convo.lastActivity || 0;
    
        // Sanitize the messages array to conform to the strict MessageInStore type.
        const cleanedMessages: MessageInStore[] = (convo.messages || []).map(msg => ({
            ...msg,
            id: msg.id || `fallback-id-${Math.random()}`,
            messageId: msg.messageId || msg.id,
            sender: msg.sender || 'unknown',
            type: msg.type || 'text',
            // This line ensures the timestamp is always a number.
            timestamp: typeof msg.timestamp === 'string' ? parseInt(msg.timestamp, 10) : (msg.timestamp || 0),
            text: msg.text || '',
        }));
    
        // Construct the final, type-safe object.
        return {
            id: convo.connector.id,
            isGroup: false,
            connector: convo.connector,
            messages: cleanedMessages, // Use the sanitized array
            lastActivity: numericLastActivity,
            lastMessage: (convo as any).lastMessage,
            lastMessagePreview: convo.lastMessagePreview
        };
    });
    } else {
        console.warn("CO.getCombinedActiveChats: conversationManager or conversationManager.getActiveConversations not available at time of call."); // <<< IMPORTANT WARNING
        if (conversationManager) {
             console.warn(`CO_DEBUG: conversationManager existed, but getActiveConversations was type: ${typeof conversationManager.getActiveConversations}`); // <<< DEBUG LOG
        } else {
             console.warn("CO_DEBUG: conversationManager itself was undefined/null."); // <<< DEBUG LOG
        }
    }

    const groupChatItems: ActiveGroupListItem[] = groupManager?.getAllGroupDataWithLastActivity?.() || [];
    const combined: CombinedChatItem[] = [...oneOnOneChatItems, ...groupChatItems];
    const validCombined = combined.filter(chat => chat && chat.id && (chat.lastActivity !== undefined && chat.lastActivity !== null));
    validCombined.sort((a, b) => {
        const activityA = typeof a.lastActivity === 'string' ? parseInt(a.lastActivity, 10) : a.lastActivity || 0;
        const activityB = typeof b.lastActivity === 'string' ? parseInt(b.lastActivity, 10) : b.lastActivity || 0;
        return activityB - activityA;
    });
    console.log("CO_DEBUG: getCombinedActiveChats - Final data being returned for list:", JSON.parse(JSON.stringify(validCombined)));
    return validCombined;
}
// D:\polyglot_connect\src\js\core\chat_orchestrator.ts
// ... (inside the IIFE) ...
// D:\polyglot_connect\src\js\core\chat_orchestrator.ts
// ... (inside the IIFE)



// PASTE THIS ENTIRE FUNCTION INTO chat_orchestrator.ts, REPLACING THE OLD ONE

// REPLACE with this new function:
// In D:\polyglot_connect\src\js\core\chat_orchestrator.ts
// ... inside the IIFE for window.chatOrchestrator ...

// REPLACE this entire function
// =================== START: REPLACEMENT ===================

function handleActiveChatItemClickInternal(itemData: CombinedChatItem): void {
    console.log("CO_DEBUG: handleActiveChatItemClickInternal called with:", JSON.parse(JSON.stringify(itemData)));
    // <<<< ADD auth to the destructured dependencies if you get it via getResolvedDeps,
    // otherwise, access window.auth directly if available globally.
    // For this example, let's assume window.auth is available and configured.
    const { chatSessionHandler, groupManager, tabManager, conversationManager } = getResolvedDeps();
    console.log("CO_DEBUG: chatSessionHandler from getResolvedDeps():", chatSessionHandler);
    console.log("CO_DEBUG: typeof chatSessionHandler?.openConversationInEmbeddedView:", typeof chatSessionHandler?.openConversationInEmbeddedView);
    if (!chatSessionHandler || !groupManager || !tabManager || !conversationManager) {
        console.error("CO: Critical dependency missing in handleActiveChatItemClickInternal.");
        return;
    }

    if (itemData.isGroup) {
        const group = itemData as ActiveGroupListItem;
        console.log("CO: Delegating group join/switch to GroupManager for:", group.id);
        groupManager.joinGroup(group.id);

    } else {
        // This is the updated logic for a 1-on-1 chat
        const oneOnOne = itemData as ActiveOneOnOneChatItem;
        const partnerConnector = oneOnOne.connector;
    
        const user = window.auth?.currentUser;
        const firebaseDisplayName = user?.displayName || undefined;
    
        if (firebaseDisplayName && window.memoryService && typeof window.memoryService.seedInitialUserFact === 'function') {
            console.log(`[ChatOrchestrator] Seeding initial user fact (registeredUsername: ${firebaseDisplayName}) for persona ${partnerConnector.id}`);
            window.memoryService.seedInitialUserFact(partnerConnector.id, 'user.registeredUsername', firebaseDisplayName)
                .catch(err => console.error("Error seeding initial user fact:", err));
        }
    
        conversationManager.ensureConversationRecord(partnerConnector).then(conversationId => {
            if (!conversationId) {
                console.error(`Failed to ensure conversation record for ${partnerConnector.id}`);
                return;
            }
        
            tabManager.switchToTab('messages');
            // MODIFIED CALL HERE
            chatSessionHandler.openConversationInEmbeddedView(partnerConnector, firebaseDisplayName);
        });
    }}
// ===================  END: REPLACEMENT  ===================


// AFTER
function renderCombinedActiveChatsList(): void {
    console.log("CO_DEBUG: renderCombinedActiveChatsList CALLED. Timestamp:", Date.now());
    const deps = getResolvedDeps();
    
    if (!deps || !deps.listRenderer || typeof deps.listRenderer.renderActiveChatList !== 'function') {
        console.warn("CO_WARN: listRenderer or its renderActiveChatList method is not available. Skipping render.");
        return;
    }

    // Get the full list of chats
    let combinedChats = getCombinedActiveChats();

    // Get the search term from the new input field
    const searchTerm = deps.domElements?.searchActiveChatsInput?.value.trim().toLowerCase() || '';

    // If there's a search term, filter the list
// AFTER
if (searchTerm) {
    combinedChats = combinedChats.filter(item => {
        // If it's a group, check item.name
        if (item.isGroup) {
            return item.name?.toLowerCase().includes(searchTerm);
        }
        // If it's a 1-on-1 chat, check the connector's name
        else {
            const oneOnOneItem = item as ActiveOneOnOneChatItem;
            return oneOnOneItem.connector?.profileName?.toLowerCase().includes(searchTerm) ||
                   oneOnOneItem.connector?.name?.toLowerCase().includes(searchTerm);
        }
    });
}
    
    console.log(`CO_INFO: About to call listRenderer.renderActiveChatList with ${combinedChats.length} items (filtered by '${searchTerm}').`);
    
    try {
        deps.listRenderer.renderActiveChatList(combinedChats, handleActiveChatItemClickInternal);
        console.log("CO_INFO: listRenderer.renderActiveChatList call completed.");
    } catch (e: any) {
        console.error("CO_ERROR: Error during listRenderer.renderActiveChatList call:", e.message, e);
    }
}
       function openConversation(connector: Connector): void {
            const deps = getResolvedDeps();
            deps?.chatSessionHandler?.openConversationInEmbeddedView?.(connector);
        }
        function openMessageModal(connector: Connector): void {
            const deps = getResolvedDeps();
            deps?.chatSessionHandler?.openMessageModalForConnector?.(connector);
        }
       // chat_orchestrator.ts
// chat_orchestrator.ts
// chat_orchestrator.ts
       // This function is INSIDE the IIFE returned by initializeActualChatOrchestrator

       // chat_orchestrator.ts
       // This function is INSIDE the IIFE returned by initializeActualChatOrchestrator
// =================== START: REPLACEMENT 3 ===================

// PASTE THIS NEW, SIMPLER FUNCTION in chat_orchestrator.ts

function handleMessagesTabActive(): void {
    console.log("CO: 'Messages' tab became active. Triggering a refresh of the sidebar list.");
    
    // This function's ONLY job should be to re-render the list of active chats.
    // It should not interfere with the main chat view at all.
    renderCombinedActiveChatsList();
}
// ===================  END: REPLACEMENT 3  ===================

// =================== START: ADD NEW FUNCTION ===================
function handleGroupsTabActive(): void {
    const { groupManager, groupDataManager } = getResolvedDeps();
    if (!groupManager || !groupDataManager) {
        console.error("CO: Cannot handle groups tab, groupManager or groupDataManager is missing.");
        return;
    }

    // Check if a group was active before a refresh or tab switch.
    const lastActiveGroupId = localStorage.getItem('polyglotLastActiveGroupId');

    if (lastActiveGroupId) {
        // If so, immediately rejoin that group to restore the view and trigger the Thalamus.
        console.log(`[ChatOrchestrator] Groups tab active. Restoring last active group: ${lastActiveGroupId}`);
        groupManager.joinGroup(lastActiveGroupId);
    } else {
        // If not, this is a normal tab switch. Show the list of joined groups.
        console.log(`[ChatOrchestrator] Groups tab active. No last active group found, showing 'my-groups' list.`);
        groupManager.loadAvailableGroups(null, null, null, { viewType: 'my-groups' });
    }
}
// ===================  END: ADD NEW FUNCTION  ===================





        function notifyNewActivityInConversation(connectorId: string): void {
              console.log("CO_DEBUG: notifyNewActivityInConversation called for connectorId:", connectorId); // DEBUG
            // renderCombinedActiveChatsList();
        }

        // These are structural deps, should be available
        const getTextMessageHandler = (): TextMessageHandler | undefined => window.textMessageHandler as TextMessageHandler | undefined;
        const getVoiceMemoHandler = (): VoiceMemoHandler | undefined => window.voiceMemoHandler as VoiceMemoHandler | undefined;
        
        const getCurrentEmbeddedChatTargetId = (): string | null | undefined => getResolvedDeps()?.chatActiveTargetManager?.getEmbeddedChatTargetId();
        const getCurrentModalMessageTarget = (): Connector | null | undefined => getResolvedDeps()?.chatActiveTargetManager?.getModalMessageTargetConnector();

        // --- END OF PASTED FUNCTIONS ---

        console.log("chat_orchestrator.ts: IIFE (module definition) FINISHED.");
        return {
            initialize, openConversation, openMessageModal, handleMessagesTabActive,
            handleGroupsTabActive, // <<< ADD THIS LINE
            renderCombinedActiveChatsList,
            notifyNewActivityInConversation, getTextMessageHandler, getVoiceMemoHandler,
            getCurrentEmbeddedChatTargetId, getCurrentModalMessageTarget,
            getCombinedActiveChats
        };
    })(); // End of IIFE

    window.chatManager = window.chatOrchestrator; // Alias

    if (window.chatOrchestrator && typeof window.chatOrchestrator.initialize === 'function') {
        console.log("chat_orchestrator.ts: SUCCESSFULLY assigned to window.chatOrchestrator (and chatManager).");
        
        // --- THIS IS THE FIX ---
        // Activate the chat orchestrator's internal event listeners.
        window.chatOrchestrator.initialize();
        // --- END OF FIX ---
    
    } else {
        console.error("chat_orchestrator.ts: CRITICAL ERROR - assignment FAILED or method missing.");
    }
    
    document.dispatchEvent(new CustomEvent('chatOrchestratorReady'));
    document.dispatchEvent(new CustomEvent('chatManagerReady')); // For the alias

    if (window.chatOrchestrator && typeof window.chatOrchestrator.initialize === 'function' && window.chatManager && typeof window.chatManager.initialize === 'function') {
    console.log("CO_VERIFY_FULL_INIT: chatOrchestrator and chatManager window objects look functionally populated before dispatching ready events.");
} else {
    console.error("CO_VERIFY_FULL_INIT: CRITICAL! chatOrchestrator or chatManager NOT functionally populated before dispatching ready events. This is a problem!");
    if (window.chatOrchestrator) console.log("CO_VERIFY_FULL_INIT: typeof window.chatOrchestrator.initialize:", typeof window.chatOrchestrator.initialize);
    if (window.chatManager) console.log("CO_VERIFY_FULL_INIT: typeof window.chatManager.initialize:", typeof window.chatManager.initialize);
}


    console.log('chat_orchestrator.ts: "chatOrchestratorReady" and "chatManagerReady" events dispatched.');

} // End of initializeActualChatOrchestrator

// Event listening for STRUCTURAL dependencies only
const structuralDepsForChatOrchestrator = ['textMessageHandlerStructuralReady', 'voiceMemoHandlerStructuralReady'];

// ADD THESE TWO LINES:
const coStructuralMetDependenciesLog: { [key: string]: boolean } = {};
structuralDepsForChatOrchestrator.forEach(dep => coStructuralMetDependenciesLog[dep] = false);

let coStructuralDepsMet = 0;

function checkAndInitChatOrchestrator(receivedEventName?: string) { // Changed argument
    if (receivedEventName) {
        console.log(`CO_STRUCTURAL_EVENT: Listener for '${receivedEventName}' was triggered.`);
        if (!coStructuralMetDependenciesLog[receivedEventName]) {
            coStructuralMetDependenciesLog[receivedEventName] = true;
            coStructuralDepsMet++;
            console.log(`CO_STRUCTURAL_DEPS: Event '${receivedEventName}' processed. Count updated.`);
        } else {
            // console.log(`CO_STRUCTURAL_EVENT: Event '${receivedEventName}' was already logged as met. Count remains.`);
        }
    }
    // If called from pre-check without eventName, count is handled in pre-check loop

    console.log(`CO_STRUCTURAL_DEPS: Current count is ${coStructuralDepsMet} / ${structuralDepsForChatOrchestrator.length}. Met status:`, JSON.stringify(coStructuralMetDependenciesLog));

    if (coStructuralDepsMet === structuralDepsForChatOrchestrator.length) {
        console.log('chat_orchestrator.ts: All STRUCTURAL dependencies met. Performing final checks and initializing actual ChatOrchestrator.');

        // Final detailed check for structural dependencies
         const finalChecks = {
            textMessageHandler: !!window.textMessageHandler, // <<< Just check for existence
            voiceMemoHandler: !!window.voiceMemoHandler    // <<< Just check for existence
    };
    const allFinalChecksPassed = Object.values(finalChecks).every(Boolean);
    console.log('CO_STRUCTURAL_FINAL_CHECK_DETAILS:', finalChecks);

    if (allFinalChecksPassed) {
        initializeActualChatOrchestrator(); // This will assign functional methods to CO
    } else {
        console.error('CO_STRUCTURAL_CRITICAL: All STRUCTURAL dependency EVENTS received, but final object existence check FAILED before init.');
        // Initialize with dummy methods if this critical structural check fails
        const errorMsgBase = `ChatOrchestrator cannot be defined (missing STRUCTURAL deps object on window). Dummy returned.`;
        const dummy: Partial<ChatOrchestratorModule> = {};
        ['initialize', 'openConversation', 'openMessageModal', 'handleMessagesTabActive', 'renderCombinedActiveChatsList', 'notifyNewActivityInConversation', 'getTextMessageHandler', 'getVoiceMemoHandler', 'getCurrentEmbeddedChatTargetId', 'getCurrentModalMessageTarget', 'getCombinedActiveChats']
        .forEach(methodName => {
            (dummy as any)[methodName] = () => console.error(`${errorMsgBase} Method '${methodName}' called.`);
        });
        window.chatOrchestrator = dummy as ChatOrchestratorModule;
        window.chatManager = window.chatOrchestrator;
        document.dispatchEvent(new CustomEvent('chatOrchestratorReady'));
        document.dispatchEvent(new CustomEvent('chatManagerReady'));
        console.warn('chat_orchestrator.ts: "chatOrchestratorReady" / "chatManagerReady" events dispatched (STRUCTURAL init FAILED - objects not on window).');
    }

        structuralDepsForChatOrchestrator.forEach(depEventName => {
            // Listener removal for { once: true } is automatic
        });
    } else {
        // console.log(`chat_orchestrator.ts: Still waiting for ${structuralDepsForChatOrchestrator.length - coStructuralDepsMet} more STRUCTURAL dependencies.`);
    }
}

// PREVIOUS LINE OF CODE MIGHT BE:
// } // This could be the closing brace of your checkAndInitChatOrchestrator function

// --- START OF REPLACEMENT BLOCK for chat_orchestrator.ts (STRUCTURAL DEPS) ---

// --- Initial Pre-Check and Listener Setup for CO (STRUCTURAL DEPS) ---
console.log('CO_STRUCTURAL_SETUP: Starting initial dependency pre-check.');
coStructuralDepsMet = 0; // Reset count
Object.keys(coStructuralMetDependenciesLog).forEach(key => coStructuralMetDependenciesLog[key] = false); // Reset log

let coAllStructuralPreloadedAndVerified = true;

// Inside chat_orchestrator.ts -> structural pre-check loop

structuralDepsForChatOrchestrator.forEach((eventName: string) => { // Added type for eventName
    let isReadyNow = false;
    let isVerifiedNow = false; 

    switch (eventName) {
        case 'textMessageHandlerStructuralReady': // <<< ADDED/CORRECTED CASE
           isReadyNow = !!window.textMessageHandler;
           isVerifiedNow = isReadyNow; // Existence of the object is the structural requirement
           break;
        case 'voiceMemoHandlerStructuralReady': // <<< ADDED/CORRECTED CASE
            isReadyNow = !!window.voiceMemoHandler;
            // For placeholder, existence is enough. Functional check is stricter.
            isVerifiedNow = isReadyNow; 
            break;
        default:
            console.warn(`CO_STRUCTURAL_PRECHECK: Unknown dependency event name in switch: ${eventName}`);
            isVerifiedNow = false; // Important to set for unknown cases
    }

    console.log(`CO_STRUCTURAL_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified (for structural needs)? ${isVerifiedNow}`);

    if (isVerifiedNow) {
        console.log(`chat_orchestrator.ts: Pre-check: STRUCTURAL Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!coStructuralMetDependenciesLog[eventName]) {
            coStructuralMetDependenciesLog[eventName] = true;
            coStructuralDepsMet++;
        }
    } else {
        coAllStructuralPreloadedAndVerified = false;
        const specificEventNameToListenFor = eventName;
        console.log(`chat_orchestrator.ts: Pre-check: STRUCTURAL Dependency '${specificEventNameToListenFor}' not ready or verified. Adding listener for '${specificEventNameToListenFor}'.`);
        document.addEventListener(specificEventNameToListenFor, function anEventListener() { // Removed event: Event
            checkAndInitChatOrchestrator(specificEventNameToListenFor);
        }, { once: true });
    }
});

console.log(`CO_STRUCTURAL_SETUP: Initial pre-check dep count: ${coStructuralDepsMet} / ${structuralDepsForChatOrchestrator.length}. Met:`, JSON.stringify(coStructuralMetDependenciesLog));

if (coAllStructuralPreloadedAndVerified && coStructuralDepsMet === structuralDepsForChatOrchestrator.length) {
    console.log('chat_orchestrator.ts: All STRUCTURAL dependencies ALREADY MET AND VERIFIED during pre-check. Initializing directly.');
    initializeActualChatOrchestrator();
} else if (coStructuralDepsMet > 0 && coStructuralDepsMet < structuralDepsForChatOrchestrator.length) {
    console.log(`chat_orchestrator.ts: Some STRUCTURAL dependencies pre-verified (${coStructuralDepsMet}/${structuralDepsForChatOrchestrator.length}), waiting for remaining events.`);
} else if (coStructuralDepsMet === 0 && !coAllStructuralPreloadedAndVerified) {
    console.log(`chat_orchestrator.ts: No STRUCTURAL dependencies pre-verified. Waiting for all ${structuralDepsForChatOrchestrator.length} events.`);
} else if (structuralDepsForChatOrchestrator.length === 0) {
    console.log('chat_orchestrator.ts: No STRUCTURAL dependencies listed. Initializing directly.');
    initializeActualChatOrchestrator();
}

console.log("chat_orchestrator.ts: Script execution finished. Initialization is event-driven or direct.");
// --- END OF REPLACEMENT BLOCK for chat_orchestrator.ts ---