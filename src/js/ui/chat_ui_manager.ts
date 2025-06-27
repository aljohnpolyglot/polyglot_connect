// D:\polyglot_connect\src\js\ui\chat_ui_manager.ts

// --- Placeholder for Two-Phase Initialization ---
interface ChatUiManagerModulePlaceholder { // A minimal interface for the placeholder is often enough
    // Define any methods that might be called *before* full initialization, if any.
    // Or, if it's just a structural placeholder, it can be empty and methods added later.
    // For this case, we expect methods to be populated, so the full interface matches.
    showEmbeddedChatInterface: (connector: Connector) => void;
    hideEmbeddedChatInterface: () => void;
    showGroupChatView: (groupName: string, members: Connector[]) => void;
    hideGroupChatView: () => void;
}

// Assign placeholder and dispatch structural ready event
window.chatUiManager = {} as ChatUiManagerModulePlaceholder; // Assign an empty object
console.log('chat_ui_manager.ts: Placeholder window.chatUiManager assigned.');
document.dispatchEvent(new CustomEvent('chatUiManagerPlaceholderReady')); // STRUCTURAL READY
console.log('chat_ui_manager.ts: "chatUiManagerPlaceholderReady" event dispatched.');
let hasInitializedChatUiManagerActual = false;
// --- Original file content starts below (imports, etc.) ---
import type {
    YourDomElements,
    UiUpdater,
    PersonaModalManager,
    ChatOrchestrator,
    TextMessageHandler,
    VoiceMemoHandler,
    GroupManager,
    Connector,
    PolyglotApp
} from '../types/global.d.ts';

console.log('chat_ui_manager.ts: Script loaded, waiting for core dependencies (after placeholder).');

// This interface should match ChatUiManagerModulePlaceholder and the IIFE's return type
interface ChatUiManagerModule {
    showEmbeddedChatInterface: (connector: Connector) => void;
    hideEmbeddedChatInterface: () => void;
    showGroupChatView: (groupName: string, members: Connector[]) => void;
    hideGroupChatView: () => void;
}

function initializeActualChatUiManager(): void {

    if (hasInitializedChatUiManagerActual) {
        console.warn("ChatUiManager: initializeActualChatUiManager() called again after already initialized. Preventing re-initialization.");
        return;
    }
    hasInitializedChatUiManagerActual = true;


    console.log('chat_ui_manager.ts: initializeActualChatUiManager() called.');

    // Check for essential STRUCTURAL dependencies (object existence)
    // polyglotApp is checked at runtime by methods that use it.
    if (!window.domElements || !window.uiUpdater || !window.chatOrchestrator || !window.polyglotConnectors || !window.personaModalManager || !window.groupManager) {
        console.error("chat_ui_manager.ts: CRITICAL STRUCTURAL CHECK FAILED - One or more core dependencies (domElements, uiUpdater, chatOrchestrator, polyglotConnectors, personaModalManager, groupManager) NOT YET ASSIGNED to window. Halting ChatUiManager full setup. Placeholder remains.", {
            domElements: !!window.domElements,
            uiUpdater: !!window.uiUpdater,
            chatOrchestrator: !!window.chatOrchestrator,
            polyglotConnectors: !!window.polyglotConnectors,
            personaModalManager: !!window.personaModalManager,
            groupManager: !!window.groupManager
        });
        return;
    }
    console.log('chat_ui_manager.ts: Core structural dependencies (object existence) appear ready.');

    // Perform more detailed FUNCTIONAL checks for dependencies whose methods will be called.
    const { uiUpdater, groupManager, personaModalManager, chatOrchestrator /*, polyglotApp */ } = window; // polyglotApp can be removed from destructuring here if only checked by runtime callers
const functionalChecks = {
    domElements: !!window.domElements,
    uiUpdater: !!(uiUpdater && typeof uiUpdater.updateEmbeddedChatHeader === 'function'),
    chatOrchestrator: !!chatOrchestrator, // Structural check is sufficient
    polyglotConnectors: !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)),
    personaModalManager: !!(personaModalManager && typeof personaModalManager.openDetailedPersonaModal === 'function'),
    groupManager: !!groupManager, // Structural check is sufficient
};
const allFunctionalChecksPassed = Object.values(functionalChecks).every(Boolean);

if (!allFunctionalChecksPassed) {
    console.error("chat_ui_manager.ts: CRITICAL FUNCTIONAL CHECK FAILED - One or more core dependencies do not have expected methods. Halting ChatUiManager full setup. Placeholder remains.", functionalChecks); // This log will now show which *other* dep might be failing
    return;
}
console.log('chat_ui_manager.ts: Core functional dependencies (methods) appear ready.');
    // window.chatUiManager is guaranteed to be an object here due to the placeholder
    // assignment at the top of the file and the early returns if critical deps are missing.
    // We use a non-null assertion (!) to inform TypeScript.
  Object.assign(window.chatUiManager!, ((): ChatUiManagerModule => {
        'use strict';
        console.log("chat_ui_manager.ts: IIFE (module definition) STARTING.");

       const getDeps = () => ({
            domElements: window.domElements as YourDomElements,
            uiUpdater: window.uiUpdater as UiUpdater,
            personaModalManager: window.personaModalManager as PersonaModalManager,
            chatOrchestrator: window.chatOrchestrator as ChatOrchestrator,
            // polyglotApp is fetched directly inside listeners when needed
            polyglotConnectors: window.polyglotConnectors as Connector[],
            groupManager: window.groupManager as GroupManager
        });
        
        // --- START: Pasted from chat_view_manager.ts ---
              function showEmbeddedChatInterface(connector: Connector): void {
            const { domElements, uiUpdater } = getDeps();
            if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder || !connector?.id) {
                console.error("ChatUiManager: Missing DOM elements or valid connector for showEmbeddedChat.");
                return;
            }
            // Ensure the header is visible when a chat is active
            const header = domElements.appShell?.querySelector('.embedded-chat-main-header');
            if (header) (header as HTMLElement).style.display = 'flex';

            domElements.messagesPlaceholder.style.display = 'none';
            domElements.embeddedChatContainer.style.display = 'flex';
            uiUpdater.updateEmbeddedChatHeader?.(connector);
        }
              function hideEmbeddedChatInterface(): void {
            const { domElements } = getDeps();
            if (!domElements.embeddedChatContainer || !domElements.messagesPlaceholder) return;

            // Hide the entire header when no chat is active
            const header = domElements.appShell?.querySelector('.embedded-chat-main-header');
            if (header) (header as HTMLElement).style.display = 'none';

            (domElements.embeddedChatContainer as HTMLElement).style.display = 'none';
            (domElements.messagesPlaceholder as HTMLElement).style.display = 'block';
            
            // This logic is now mostly redundant but kept for robustness
            const headerName = domElements.embeddedChatHeaderName as HTMLElement | null;
            if (headerName) headerName.textContent = "Your Conversations";
            const headerDetails = domElements.embeddedChatHeaderDetails as HTMLElement | null;
            if (headerDetails) headerDetails.textContent = "Select a chat or start a new one.";
            const headerAvatar = domElements.embeddedChatHeaderAvatar as HTMLImageElement | null;
            if (headerAvatar) headerAvatar.src = "/images/placeholder_avatar.png";

            const embContainer = domElements.embeddedChatContainer as HTMLElement | null;
            if (embContainer?.dataset.currentConnectorId) {
                delete embContainer.dataset.currentConnectorId;
            }
        }
        function showGroupChatView(groupName: string, members: Connector[]): void {
            const { domElements, uiUpdater } = getDeps();
            if (!domElements.groupListContainer || !domElements.groupChatInterfaceDiv || !groupName || !members) {
                console.error("ChatUiManager: Missing DOM elements, groupName, or members for showGroupChatView.");
                return;
            }
            const groupsHeader = domElements.groupsViewHeader as HTMLElement | null;
            if (groupsHeader && groupsHeader.style.display !== 'none') {
                groupsHeader.style.display = 'none';
            }
            (domElements.groupListContainer as HTMLElement).style.display = 'none';
            (domElements.groupChatInterfaceDiv as HTMLElement).style.display = 'flex';
            uiUpdater.updateGroupChatHeader?.(groupName, members);
        }
        function hideGroupChatView(): void {
            const { domElements } = getDeps();
            if (!domElements.groupListContainer || !domElements.groupChatInterfaceDiv) return;

            (domElements.groupChatInterfaceDiv as HTMLElement).style.display = 'none';
            (domElements.groupListContainer as HTMLElement).style.display = 'block';
            const groupsHeader = domElements.groupsViewHeader as HTMLElement | null;
            if (groupsHeader) {
                groupsHeader.style.display = '';
            }
        }
        // --- END: Pasted from chat_view_manager.ts ---

        function initializeChatUiControlsInternal(): void {
            console.log("chat_ui_manager.ts: initializeChatUiControlsInternal() - START.");
            const deps = getDeps(); // Get fresh deps
            if (!deps.domElements || !deps.personaModalManager || !deps.chatOrchestrator || !deps.groupManager || !deps.polyglotConnectors) {
                console.error("chat_ui_manager.ts: initializeChatUiControlsInternal - Missing one or more dependencies from getDeps(). Aborting listener setup.");
                return;
            }
            const { domElements, personaModalManager, chatOrchestrator, groupManager, polyglotConnectors } = deps;


            const textMessageHandler = chatOrchestrator.getTextMessageHandler?.();
            const voiceMemoHandler = chatOrchestrator.getVoiceMemoHandler?.();

    

            // --- Message Modal Listeners ---
            // if (domElements.messageSendBtn && domElements.messageTextInput) {
            //     const doSendModalText = () => {
            //         const targetConnector = chatOrchestrator.getCurrentModalMessageTarget?.();
            //         const textValue = (domElements.messageTextInput as HTMLInputElement).value;
            //         if (textMessageHandler?.sendModalTextMessage && targetConnector && textValue.trim() !== "") {
            //             (textMessageHandler.sendModalTextMessage as Function)(textValue, targetConnector);
            //         }
            //     };
            //     (domElements.messageSendBtn as HTMLButtonElement).addEventListener('click', doSendModalText);
            //     (domElements.messageTextInput as HTMLInputElement).addEventListener('keypress', (e: KeyboardEvent) => {
            //         if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSendModalText(); }
            //     });
            // }
            // if (domElements.messageModalAttachBtn && domElements.messageModalImageUpload) {
            //      (domElements.messageModalAttachBtn as HTMLButtonElement).addEventListener('click', () => {
            //         const targetConnector = chatOrchestrator.getCurrentModalMessageTarget?.();
            //          if (targetConnector) {
            //             (domElements.messageModalImageUpload as HTMLInputElement).value = '';
            //             (domElements.messageModalImageUpload as HTMLInputElement).click();
            //          } else { alert("Please open a message modal to send an image."); }
            //     });
            // }
            // if (domElements.messageModalMicBtn) {
            //      (domElements.messageModalMicBtn as HTMLButtonElement).addEventListener('click', () => {
            //         const targetConnector = chatOrchestrator.getCurrentModalMessageTarget?.();
            //         if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetConnector?.id) {
            //             voiceMemoHandler.handleNewVoiceMemoInteraction('modal', domElements.messageModalMicBtn as HTMLButtonElement, targetConnector.id);
            //         }
            //     });
            // }

            // --- Group Chat Listeners ---
            if (domElements.sendGroupMessageBtn && domElements.groupChatInput) {
                (domElements.sendGroupMessageBtn as HTMLButtonElement).addEventListener('click', () => {
                    groupManager?.handleUserMessageInGroup?.();
                });
                (domElements.groupChatInput as HTMLInputElement).addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        groupManager?.handleUserMessageInGroup?.();
                    }
                });
                (domElements.groupChatInput as HTMLInputElement).addEventListener('input', () => {
                    groupManager?.userIsTyping?.();
                });
            }
            // if (domElements.leaveGroupBtn) {
            //     (domElements.leaveGroupBtn as HTMLButtonElement).addEventListener('click', () => {
            //         groupManager?.leaveCurrentGroup?.();
            //     });
            // }

            // --- Header Button Listeners ---
            const setupHeaderAction = (
                button: HTMLButtonElement | null,
                datasetContainer: HTMLElement | null,
                actionType: 'call' | 'info',
                interfaceTypeForLog: string
            ) => {
                if (button && datasetContainer) {
                    button.addEventListener('click', () => {
                        // Fetch polyglotApp at the moment of the click, not during initialization
                        const polyglotApp = window.polyglotApp as PolyglotApp | undefined;
                        const connectorId = datasetContainer.dataset.currentConnectorId;

                        if (!polyglotApp?.initiateSession) return;
                        if (connectorId && polyglotConnectors) {
                            const connector = polyglotConnectors.find(c => c.id === connectorId);
                            if (connector) {
                                if (actionType === 'call') {
                                    polyglotApp.initiateSession(connector, 'direct_modal');
                                } else if (actionType === 'info') {
                                    personaModalManager?.openDetailedPersonaModal?.(connector);
                                }
                            }
                        }
                    });
                }
            };
            // setupHeaderAction(domElements.embeddedChatCallBtn, domElements.embeddedChatContainer, 'call', 'Embedded');
            setupHeaderAction(domElements.embeddedChatInfoBtn, domElements.embeddedChatContainer, 'info', 'Embedded');
            // setupHeaderAction(domElements.messageModalCallBtn, domElements.messagingInterface, 'call', 'Message Modal');
            setupHeaderAction(domElements.messageModalInfoBtn, domElements.messagingInterface, 'info', 'Message Modal');

            console.log("chat_ui_manager.ts: initializeChatUiControlsInternal() - FINISHED.");
        }



        initializeChatUiControlsInternal();

        console.log("chat_ui_manager.ts: IIFE (module definition) FINISHED.");
        return {
            showEmbeddedChatInterface,
            hideEmbeddedChatInterface,
            showGroupChatView,
            hideGroupChatView
        };
    })()); // End of IIFE

    // Check if methods were successfully populated onto the placeholder
    if (window.chatUiManager && typeof (window.chatUiManager as ChatUiManagerModule).showEmbeddedChatInterface === 'function') {
        console.log("chat_ui_manager.ts: SUCCESSFULLY populated window.chatUiManager with methods.");
    } else {
        console.error("chat_ui_manager.ts: CRITICAL ERROR - window.chatUiManager method population FAILED or key method missing after Object.assign. Placeholder might be empty or type mismatch.");
    }

   // The structural 'chatUiManagerReady' event was dispatched at the top of the file.
    // Now dispatch the functional ready event.
    document.dispatchEvent(new CustomEvent('chatUiManagerReady'));
    console.log('chat_ui_manager.ts: "chatUiManagerReady" (FUNCTIONAL) event dispatched.');
} // End of initializeActualChatUiManager


const dependenciesForChatUiManager = [
   'domElementsReady',
    'uiUpdaterReady',             // Structural (placeholder object exists)
    'personaModalManagerReady',   // Functional (PMM methods should be available)
    'chatManagerReady',           // Functional (ChatOrchestrator methods should be available)
    'groupManagerReady',          // Structural (placeholder object exists)
    'polyglotDataReady'           // For polyglotConnectors
    // 'polyglotAppReady' // REMOVED: This was causing a deadlock.
];

const chatUiManagerMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForChatUiManager.forEach(dep => chatUiManagerMetDependenciesLog[dep] = false);
let chatUiManagerDepsMet = 0;

function checkAndInitChatUiManager(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`CUIM_EVENT: Listener for '${receivedEventName}' was triggered.`);
        if (!chatUiManagerMetDependenciesLog[receivedEventName]) {
            chatUiManagerMetDependenciesLog[receivedEventName] = true;
            chatUiManagerDepsMet++;
            console.log(`CUIM_DEPS: Event '${receivedEventName}' processed. Count updated.`);
        }
    }

    console.log(`CUIM_DEPS: Current count is ${chatUiManagerDepsMet} / ${dependenciesForChatUiManager.length}. Met status:`, JSON.stringify(chatUiManagerMetDependenciesLog));

      if (chatUiManagerDepsMet === dependenciesForChatUiManager.length) {
        console.log('chat_ui_manager.ts: All dependency events received for ChatUiManager. Calling initializeActualChatUiManager directly.');
        initializeActualChatUiManager(); // Call directly without RAF
        // Listeners with { once: true } are removed automatically.
    }
}

// --- Initial Pre-Check and Listener Setup for CUIM ---
console.log('CUIM_SETUP: Starting initial dependency pre-check.');
chatUiManagerDepsMet = 0; // Reset count
Object.keys(chatUiManagerMetDependenciesLog).forEach(key => chatUiManagerMetDependenciesLog[key] = false); // Reset log

let cuimAllPreloadedAndVerified = true;

dependenciesForChatUiManager.forEach(eventName => {
    let isReadyNow = false;
    let isVerifiedNow = false;

    switch (eventName) {
        case 'domElementsReady':
            isReadyNow = !!window.domElements;
            isVerifiedNow = isReadyNow;
            break;
        case 'uiUpdaterReady':
            isReadyNow = !!window.uiUpdater;
            isVerifiedNow = isReadyNow; // Check for object existence; functional check is in initializeActual
            break;
        case 'personaModalManagerReady':
            isReadyNow = !!window.personaModalManager;
            isVerifiedNow = !!(isReadyNow && typeof window.personaModalManager?.openDetailedPersonaModal === 'function');
            break;
        case 'chatManagerReady': // Alias for chatOrchestratorReady
            isReadyNow = !!window.chatManager || !!window.chatOrchestrator;
            isVerifiedNow = !!(isReadyNow && typeof (window.chatManager || window.chatOrchestrator)?.initialize === 'function');
            break;
        case 'groupManagerReady':
            isReadyNow = !!window.groupManager;
            isVerifiedNow = isReadyNow; // Check for object existence; functional check is in initializeActual
            break;
        case 'polyglotDataReady': // Implies polyglotConnectors
            isReadyNow = !!window.polyglotConnectors;
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotConnectors));
            break;
        default:
            console.warn(`CUIM_PRECHECK: Unknown dependency event name in pre-check: ${eventName}`);
            break; // Added break for default case
    }

    console.log(`CUIM_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);

    if (isVerifiedNow) {
        console.log(`chat_ui_manager.ts: Pre-check: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!chatUiManagerMetDependenciesLog[eventName]) {
            chatUiManagerMetDependenciesLog[eventName] = true;
            chatUiManagerDepsMet++;
        }
    } else {
        cuimAllPreloadedAndVerified = false;
        const specificEventNameToListenFor = eventName;
        console.log(`chat_ui_manager.ts: Pre-check: Dependency '${specificEventNameToListenFor}' not ready or verified. Adding listener for '${specificEventNameToListenFor}'.`);
        document.addEventListener(specificEventNameToListenFor, function anEventListener(event: Event) {
            checkAndInitChatUiManager(specificEventNameToListenFor);
        }, { once: true });
    }
});

console.log(`CUIM_SETUP: Initial pre-check dep count: ${chatUiManagerDepsMet} / ${dependenciesForChatUiManager.length}. Met:`, JSON.stringify(chatUiManagerMetDependenciesLog));

if (cuimAllPreloadedAndVerified && chatUiManagerDepsMet === dependenciesForChatUiManager.length) {
    console.log('chat_ui_manager.ts: All dependencies ALREADY MET AND VERIFIED during pre-check. Initializing directly.');
    initializeActualChatUiManager(); // Call directly
} else if (chatUiManagerDepsMet > 0 && chatUiManagerDepsMet < dependenciesForChatUiManager.length) {
    console.log(`chat_ui_manager.ts: Some dependencies pre-verified (${chatUiManagerDepsMet}/${dependenciesForChatUiManager.length}), waiting for remaining events.`);
} else if (chatUiManagerDepsMet === 0 && !cuimAllPreloadedAndVerified) {
    console.log(`chat_ui_manager.ts: No dependencies pre-verified. Waiting for all ${dependenciesForChatUiManager.length} events.`);
} else if (dependenciesForChatUiManager.length === 0) {
    console.log('chat_ui_manager.ts: No dependencies listed. Initializing directly.');
    initializeActualChatUiManager(); // Call directly
}
console.log("chat_ui_manager.ts: Script execution FINISHED. Initialization is event-driven or direct.");