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
    ChatSessionHandler,
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
    GroupChatHistoryItem
} from '../types/global'; // Path from src/js/core to src/js/types



console.log('chat_orchestrator.ts: Script loaded, waiting for STRUCTURAL dependencies.');
// --- START: DUPLICATION FIX - Module-scoped lock for handleMessagesTabActive ---
let co_isHandlingMessagesTabActive = false; 
// --- END: DUPLICATION FIX ---
interface ChatOrchestratorModule {
    initialize: () => void;
    openConversation: (connector: Connector) => void;
    openMessageModal: (connector: Connector) => void;
    handleMessagesTabActive: () => void;
    // filterAndDisplayConnectors is removed
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
            { name: 'groupDataManager', getter: () => window.groupDataManager as GroupDataManager | undefined, keyFn: 'getCurrentGroupId' }, // <<< ADDED THIS LINE
            // --- END OF MODIFICATION CO.FIX.DEPS.1 ---
            { name: 'chatSessionHandler', getter: () => window.chatSessionHandler as ChatSessionHandler | undefined, keyFn: 'openConversationInEmbeddedView' },
            { name: 'chatActiveTargetManager', getter: () => window.chatActiveTargetManager as ChatActiveTargetManager | undefined, keyFn: 'getEmbeddedChatTargetId' },
            { name: 'textMessageHandler', getter: () => window.textMessageHandler as TextMessageHandler | undefined, keyFn: 'sendEmbeddedTextMessage' },
            { name: 'voiceMemoHandler', getter: () => window.voiceMemoHandler as VoiceMemoHandler | undefined, keyFn: 'handleNewVoiceMemoInteraction' },
            { name: 'personaModalManager', getter: () => window.personaModalManager as PersonaModalManager | undefined },
            { name: 'tabManager', getter: () => window.tabManager as import('../types/global').TabManagerModule | undefined, keyFn: 'switchToTab' },
            { name: 'chatUiManager', getter: () => window.chatUiManager as ChatUiManager | undefined, keyFn: 'showEmbeddedChatInterface' }
        ];

        type ResolvedDeps = {
            domElements?: YourDomElements; listRenderer?: ListRenderer; uiUpdater?: UiUpdater; modalHandler?: ModalHandler;
            conversationManager?: ConversationManager; groupManager?: GroupManager; 
            // --- START OF MODIFICATION CO.FIX.DEPS.2 ---
            groupDataManager?: GroupDataManager; // <<< ADDED THIS LINE
            // --- END OF MODIFICATION CO.FIX.DEPS.2 ---
            chatSessionHandler?: ChatSessionHandler;
            chatActiveTargetManager?: ChatActiveTargetManager; textMessageHandler?: TextMessageHandler; voiceMemoHandler?: VoiceMemoHandler;
            personaModalManager?: PersonaModalManager;
            tabManager?: import('../types/global').TabManagerModule;
            chatUiManager?: ChatUiManager;
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
            if (co_isInitialized) { // <<< ADD THIS LINE
                return;               // <<< ADD THIS LINE
            }                         // <<< ADD THIS LINE
            co_isInitialized = true;  // <<< ADD THIS LINE
        
            console.log("ChatOrchestrator: Initialized and event listener attached."); // <<< REPLACE the old console.log with this one
            
            // The listener function officially accepts a generic 'Event'.
            document.addEventListener('polyglot-conversation-updated', (e: Event) => {
        
        // Inside the function, we assert that this specific event IS a CustomEvent.
        // This is a safe and direct way to tell TypeScript the object's true type.
        const customEvent = e as CustomEvent; 

        // Now, we can safely access .detail from our asserted 'customEvent' variable.
        console.log("ChatOrchestrator: Received 'polyglot-conversation-updated' event. Refreshing sidebar.", customEvent.detail);
        
        requestAnimationFrame(() => {
            renderCombinedActiveChatsList();
        });
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
        oneOnOneChatItems = rawConversations.map((convo: ConversationItem): ActiveOneOnOneChatItem => {
            return {
                id: convo.connector.id, 
                isGroup: false,
                connector: convo.connector,
                messages: convo.messages, 
                lastActivity: convo.lastActivity 
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

function handleActiveChatItemClickInternal(itemData: CombinedChatItem): void {
    console.log("CO_DEBUG: handleActiveChatItemClickInternal called with:", JSON.parse(JSON.stringify(itemData)));
    // --- START OF MODIFICATION CO.FIX.DEPS.3 ---
    const { chatSessionHandler, groupManager, tabManager, chatActiveTargetManager, groupDataManager } = getResolvedDeps(); 
    // --- END OF MODIFICATION CO.FIX.DEPS.3 ---

    if (!chatSessionHandler || !groupManager || !tabManager) { // groupDataManager check not strictly needed here if only used in debug logs
        console.error("CO: Critical dependency (CSH, GM, or TabM) missing in handleActiveChatItemClickInternal.");
        return;
    }

    if (itemData.isGroup) {
        const group = itemData as ActiveGroupListItem;
        if (group && group.id) {
            console.error(`CO_DEBUG_PRE_JOIN_GROUP: About to call groupManager.joinGroup for ID: ${group.id}.`);
            console.error(`  Current GDM Group ID: ${groupDataManager?.getCurrentGroupId?.()}`);
            console.error(`  Current Tab: ${tabManager?.getCurrentActiveTab?.()}`);
            console.log("CO: Attempting to join/switch to group:", group.id);
            groupManager.joinGroup(group.id); // This internally calls switchToTab('groups')
        } else {
            console.error("CO: Invalid group data for joining/switching.", group);
            alert("Cannot switch to group: Invalid group information.");
        }
    } else {
        const oneOnOne = itemData as ActiveOneOnOneChatItem;
        if (oneOnOne.connector && oneOnOne.connector.id) {
            
            // --- THIS IS THE FIX ---
            // Before opening a 1v1 chat, check if we are in a group.
            // If so, silently leave it to stop background processing.
            const groupManager = window.groupManager;
            if (groupManager && groupManager.getCurrentGroupData?.()) {
                console.log("ChatOrchestrator: Leaving active group to switch to 1-on-1 chat.");
                // The (false, false) arguments prevent redundant UI changes.
                groupManager.leaveCurrentGroup(false, false);
            }
            // --- END OF FIX ---
    
            console.log("CO: Attempting to open 1-on-1 conversation for connector:", oneOnOne.connector.id);




            console.error(`CO_DEBUG_PRE_OPEN_EMBEDDED: About to call CSH.openConversationInEmbeddedView for ID: ${oneOnOne.connector.id}.`);
            console.error(`  Current CATM Embedded ID: ${chatActiveTargetManager?.getEmbeddedChatTargetId?.()}`);
            console.error(`  Current Tab: ${tabManager?.getCurrentActiveTab?.()}`);
            if (typeof chatSessionHandler.openConversationInEmbeddedView === 'function') {
                 chatSessionHandler.openConversationInEmbeddedView(oneOnOne.connector);
                 console.log("CO: Switching to 'messages' tab for 1-on-1 chat.");
                 tabManager.switchToTab('messages'); // <<< ADD THIS LINE
            } else {
                 console.error("CO: chatSessionHandler.openConversationInEmbeddedView not available.");
                 alert("Cannot open chat: Chat display component is not ready.");
            }
        } else {
            console.error("CO: Invalid connector data for 1-on-1 chat.", oneOnOne);
            alert("Cannot open chat: Invalid contact information.");
        }
    }
}
function renderCombinedActiveChatsList(): void {
    console.log("CO_DEBUG: renderCombinedActiveChatsList CALLED. Timestamp:", Date.now()); // Add timestamp
    const deps = getResolvedDeps();
    
    if (!deps) {
        console.error("CO_ERROR: renderCombinedActiveChatsList - getResolvedDeps() returned null/undefined. Aborting render.");
        return;
    }
    
    console.log("CO_DEBUG: renderCombinedActiveChatsList - Resolved deps. listRenderer functional?:", !!(deps.listRenderer && typeof deps.listRenderer.renderActiveChatList === 'function'));

    if (!deps.listRenderer || typeof deps.listRenderer.renderActiveChatList !== 'function') {
        console.warn("CO_WARN: listRenderer or its renderActiveChatList method is not available. Skipping render.");
        if (deps.listRenderer) {
            console.warn("CO_WARN: deps.listRenderer exists, but renderActiveChatList is type:", typeof deps.listRenderer.renderActiveChatList);
        } else {
            console.warn("CO_WARN: deps.listRenderer itself is undefined.");
        }
        return; // Return if listRenderer isn't ready
    }

    const combinedChats = getCombinedActiveChats(); // This already logs well
    console.log(`CO_INFO: About to call listRenderer.renderActiveChatList with ${combinedChats.length} items.`);
    
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

function handleMessagesTabActive(): void {
    // Use the module-scoped flag 'co_isHandlingMessagesTabActive'
    if (co_isHandlingMessagesTabActive) { // <<< CORRECT FLAG NAME
        console.warn("CO_DEBUG: handleMessagesTabActive - ALREADY PROCESSING. Preventing re-entry.");
        return;
    }
    co_isHandlingMessagesTabActive = true; // <<< CORRECT FLAG NAME - Acquire lock
    console.log("CO_DEBUG: handleMessagesTabActive called and lock acquired.");
    
    const deps = getResolvedDeps();
    
    try {
        if (deps && deps.chatSessionHandler && typeof deps.chatSessionHandler.handleMessagesTabBecameActive === 'function') {
            console.log("CO_DEBUG: Delegating to chatSessionHandler.handleMessagesTabBecameActive()");
            deps.chatSessionHandler.handleMessagesTabBecameActive(); 
        } else {
            console.warn("CO_WARN: handleMessagesTabActive - chatSessionHandler or its method not ready. Falling back to renderCombinedActiveChatsList.");
            if (deps && deps.chatSessionHandler) {
                 console.warn("CO_WARN: deps.chatSessionHandler exists, but handleMessagesTabBecameActive is type:", typeof deps.chatSessionHandler.handleMessagesTabBecameActive);
            } else if (deps) {
                 console.warn("CO_WARN: deps.chatSessionHandler is undefined in handleMessagesTabActive.");
            } else {
                 console.warn("CO_WARN: getResolvedDeps() returned null in handleMessagesTabActive.");
            }
            renderCombinedActiveChatsList(); 
        }
    } finally {
        setTimeout(() => {
            co_isHandlingMessagesTabActive = false; // <<< CORRECT FLAG NAME - Release lock
            console.log("CO_DEBUG: handleMessagesTabActive - Lock released.");
        }, 100); 
    }
}

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
            renderCombinedActiveChatsList,
            notifyNewActivityInConversation, getTextMessageHandler, getVoiceMemoHandler,
            getCurrentEmbeddedChatTargetId, getCurrentModalMessageTarget,
            getCombinedActiveChats // Ensure this is returned if needed publicly
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