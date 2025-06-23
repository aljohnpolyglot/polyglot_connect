// D:\polyglot_connect\src\js\ui\view_action_coordinator.ts
import type {
    YourDomElements,
    PolyglotHelpersOnWindow,
    UiUpdater,
    ChatOrchestrator,
    GroupManager,
    SessionHistoryManager,
    FilterController,
    ChatUiManager,
    SharedContent,
    Connector, // For group members
    SessionData // For displaySummaryInView
} from '../types/global.d.ts';

console.log('view_action_coordinator.ts: Script loaded, waiting for core dependencies.');

interface ViewActionCoordinatorModule {
    initialize: () => void;
    displaySessionSummaryInMainView: (sessionData: SessionData | null) => void;
    // If updateEmptyListMessages is meant to be public, add it here:
    // updateEmptyListMessages: () => void; 
}

// Placeholder
window.viewActionCoordinator = {
    initialize: () => { throw new Error('VAC placeholder: initialize not implemented.'); },
    displaySessionSummaryInMainView: () => { throw new Error('VAC placeholder: displaySessionSummaryInMainView not implemented.'); }
} as ViewActionCoordinatorModule;
console.log('view_action_coordinator.ts: Placeholder window.viewActionCoordinator assigned.');
document.dispatchEvent(new CustomEvent('viewActionCoordinatorPlaceholderReady'));
console.log('view_action_coordinator.ts: "viewActionCoordinatorPlaceholderReady" event dispatched.');

function initializeActualViewActionCoordinator(): void {
    console.log("view_action_coordinator.ts: initializeActualViewActionCoordinator() called.");

    type VerifiedDeps = {
        domElements: YourDomElements;
        polyglotHelpers: PolyglotHelpersOnWindow;
        uiUpdater?: UiUpdater;
        chatOrchestrator?: ChatOrchestrator;
        groupManager?: GroupManager;
        sessionHistoryManager?: SessionHistoryManager;
        filterController?: FilterController;
        chatUiManager?: ChatUiManager;
        polyglotSharedContent?: SharedContent;
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = {
            domElements: window.domElements,
            polyglotHelpers: window.polyglotHelpers,
            uiUpdater: window.uiUpdater,
            chatOrchestrator: window.chatOrchestrator,
            groupManager: window.groupManager,
            sessionHistoryManager: window.sessionHistoryManager,
            filterController: window.filterController,
            chatUiManager: window.chatUiManager,
            polyglotSharedContent: window.polyglotSharedContent
        };
        const missing: string[] = [];
        if (!deps.domElements) missing.push("domElements");
        if (!deps.polyglotHelpers) missing.push("polyglotHelpers");
        
        if (!deps.filterController?.applyFindConnectorsFilters) console.warn("VAC: filterController.applyFindConnectorsFilters missing, 'find' tab action affected.");
        if (!deps.groupManager?.loadAvailableGroups) console.warn("VAC: groupManager.loadAvailableGroups missing, 'groups' tab action affected.");
        if (!deps.chatOrchestrator?.handleMessagesTabActive) console.warn("VAC: chatOrchestrator.handleMessagesTabActive missing, 'messages' tab action affected.");
        if (!deps.sessionHistoryManager?.updateSummaryListUI) console.warn("VAC: sessionHistoryManager.updateSummaryListUI missing, 'summary' tab action affected.");
        if (!deps.chatUiManager?.showGroupChatView) console.warn("VAC: chatUiManager.showGroupChatView missing, 'groups' tab action affected.");

        if (missing.length > 0) {
            console.error(`ViewActionCoordinator: getSafeDeps - MISSING CRITICAL: ${missing.join(', ')}.`);
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDepsNullable = getSafeDeps(); // Step 1: Get potentially null deps

    if (!resolvedDepsNullable) { // Step 2: Guard against null
        console.error("view_action_coordinator.ts: CRITICAL - domElements/polyglotHelpers not met. Placeholder remains.");
        document.dispatchEvent(new CustomEvent('viewActionCoordinatorReady'));
        console.warn('view_action_coordinator.ts: "viewActionCoordinatorReady" event dispatched (initialization FAILED).');
        return;
    }
    
    // Step 3: Assign to a new const. TypeScript now knows `finalDeps` is of type `VerifiedDeps` (non-null).
    const finalDeps: VerifiedDeps = resolvedDepsNullable; 

    console.log('view_action_coordinator.ts: Core dependencies appear ready. `finalDeps` is confirmed non-null.');
   
    // --- Define the actual implementation functions in this scope ---
    // These functions will close over `finalDeps`, which TypeScript knows is not null.

    function displaySessionSummaryInMainViewImpl(sessionData: SessionData | null): void {
        console.log("VAC: displaySessionSummaryInMainViewImpl called with sessionData:", sessionData ? sessionData.sessionId : null);
        
        // Access properties from the non-null 'finalDeps'
        const localUiUpdater = finalDeps.uiUpdater; 
        const localDomElements = finalDeps.domElements;

        if (localUiUpdater?.displaySummaryInView) {
            localUiUpdater.displaySummaryInView(sessionData);
        } else {
            console.error("VAC: uiUpdater.displaySummaryInView is not available to display summary in main view.");
            if (localDomElements.summaryViewContent) { 
                localDomElements.summaryViewContent.innerHTML = sessionData 
                    ? `<p class="error-message">Error: UI Updater could not display summary for session ${sessionData.sessionId}.</p>`
                    : '<p class="error-message">Error: UI Updater unavailable and no session data to display.</p>';
            }
        }
    }

    function updateEmptyListMessagesImpl(): void {
        // console.log("VAC: updateEmptyListMessagesImpl() called.");
        const localDomElements = finalDeps.domElements; // Use finalDeps

        const updateList = (ul: HTMLElement | null, msgEl: HTMLElement | null, defaultMsg: string, filterCheck?: () => boolean, filterMsg?: string) => {
            if (ul && msgEl) {
                const hasItems = ul.children.length > 0;
                msgEl.style.display = hasItems ? 'none' : 'block';
                if (!hasItems) msgEl.textContent = (filterCheck?.() && filterMsg) ? filterMsg : defaultMsg;
            }
        };
        updateList(localDomElements.chatListUl, localDomElements.emptyChatListMsg, "No active chats.");
        updateList(localDomElements.summaryListUl, localDomElements.emptySummaryListMsg, "No session history.");
        updateList(localDomElements.availableGroupsUl, localDomElements.groupLoadingMessage, "No groups available.",
            () => !!(localDomElements.filterGroupLanguageSelect?.value && localDomElements.filterGroupLanguageSelect.value !== 'all'),
            "No groups match your current filter."
        );
        if (localDomElements.connectorHubGrid) {
            const loadingMsgEl = localDomElements.connectorHubGrid.querySelector('.loading-message') as HTMLElement | null;
            if (loadingMsgEl) {
                const hasCards = localDomElements.connectorHubGrid.querySelectorAll('.connector-card').length > 0;
                loadingMsgEl.style.display = hasCards ? 'none' : 'block';
                if (!hasCards) {
                    loadingMsgEl.textContent = 'No connectors available. Try adjusting filters.';
                }
            }
        }
    }
        
    function initializeVacImpl(): void {
        console.log("ViewActionCoordinator: initialize() called by VAC itself.");
        // ...
    }

    // Assign to window.viewActionCoordinator using an IIFE that just returns references
    window.viewActionCoordinator = ((): ViewActionCoordinatorModule => {
        'use strict';
        return {
            initialize: initializeVacImpl,
            displaySessionSummaryInMainView: displaySessionSummaryInMainViewImpl
            // updateEmptyListMessages: updateEmptyListMessagesImpl 
        };
    })();
    // ... (rest of the file: if (window.viewActionCoordinator...) etc.)

    
// REMOVE THE FOLLOWING LINE IF IT EXISTS - IT'S THE SOURCE OF THE ERROR
// Object.assign(window.viewActionCoordinator!, eventListenerMethods); 

// This check is now on the directly assigned window.viewActionCoordinator
if (window.viewActionCoordinator && typeof window.viewActionCoordinator.initialize === 'function') {
    console.log("view_action_coordinator.ts: SUCCESSFULLY assigned and populated.");
} else {
    console.error("view_action_coordinator.ts: CRITICAL ERROR - population FAILED.");
}
document.dispatchEvent(new CustomEvent('viewActionCoordinatorReady'));
console.log('view_action_coordinator.ts: "viewActionCoordinatorReady" event dispatched.');

} // End of initializeActualViewActionCoordinator

// Dependencies: Needs domElements & polyglotHelpers for its own functions,
// and tabManagerReady to know when to start listening.
// Other module ready events (filterControllerReady, groupManagerReady etc.) ensure those modules
// are available when viewActionCoordinator tries to call their methods.
const dependenciesForVAC: string[] = [
    'domElementsReady', 
    'polyglotHelpersReady',
    'tabManagerReady', // To listen for tabSwitched
    'uiUpdaterReady',
    'chatOrchestratorReady',
    'groupManagerReady',
    'sessionHistoryManagerReady',
    'filterControllerReady',
    'polyglotSharedContentReady' 
];

const vacMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForVAC.forEach((dep: string) => vacMetDependenciesLog[dep] = false);
let vacDepsMetCount = 0;

function checkAndInitVAC(receivedEventName?: string): void {
    if (receivedEventName) {
        let verified = false;
        // Simple verification: just check if the window object exists
        // More robust: check for key methods like in getSafeDeps
        switch(receivedEventName) {
            case 'domElementsReady': verified = !!window.domElements; break;
            case 'polyglotHelpersReady': verified = !!window.polyglotHelpers; break;
            case 'tabManagerReady': verified = !!window.tabManager?.initialize; break;
            case 'uiUpdaterReady': verified = !!window.uiUpdater?.displaySummaryInView; break;
            case 'chatOrchestratorReady': verified = !!window.chatOrchestrator?.handleMessagesTabActive; break;
            case 'groupManagerReady': verified = !!window.groupManager?.loadAvailableGroups; break;
            case 'sessionHistoryManagerReady': verified = !!window.sessionHistoryManager?.updateSummaryListUI; break;
            case 'filterControllerReady': verified = !!window.filterController?.applyFindConnectorsFilters; break;
          
            case 'polyglotSharedContentReady': verified = !!window.polyglotSharedContent; break; // Add if shared_content.ts dispatches this
            default: console.warn(`VAC_EVENT: Unknown event ${receivedEventName}`); return;
        }
        if (verified && !vacMetDependenciesLog[receivedEventName]) {
            vacMetDependenciesLog[receivedEventName] = true;
            vacDepsMetCount++;
            console.log(`VAC_DEPS: Event '${receivedEventName}' met. Count: ${vacDepsMetCount}/${dependenciesForVAC.length}`);
        } else if(!verified){
             console.warn(`VAC_DEPS: Event '${receivedEventName}' received but FAILED verification.`);
        }
    }
    if (vacDepsMetCount === dependenciesForVAC.length) {
        console.log('view_action_coordinator.ts: All dependencies met. Initializing.');
        initializeActualViewActionCoordinator();
    }
}

console.log('VAC_SETUP: Starting pre-check.');
vacDepsMetCount = 0; Object.keys(vacMetDependenciesLog).forEach(k=>vacMetDependenciesLog[k]=false);
let vacAllPreloaded = true;
dependenciesForVAC.forEach((eventName: string) => {
    let isVerified = false;
    // Pre-check logic (similar to switch statement in checkAndInitVAC)
    switch(eventName) {
        case 'domElementsReady': isVerified = !!window.domElements; break;
        case 'polyglotHelpersReady': isVerified = !!window.polyglotHelpers; break;
        case 'tabManagerReady': isVerified = !!window.tabManager?.initialize; break;
        case 'uiUpdaterReady': isVerified = !!window.uiUpdater?.displaySummaryInView; break;
        case 'chatOrchestratorReady': isVerified = !!window.chatOrchestrator?.handleMessagesTabActive; break;
        case 'groupManagerReady': isVerified = !!window.groupManager?.loadAvailableGroups; break;
        case 'sessionHistoryManagerReady': isVerified = !!window.sessionHistoryManager?.updateSummaryListUI; break;
        case 'filterControllerReady': isVerified = !!window.filterController?.applyFindConnectorsFilters; break;
        // case 'chatUiManagerReady': isVerified = !!window.chatUiManager?.showGroupChatView; break;
        case 'polyglotSharedContentReady': isVerified = !!window.polyglotSharedContent; break;
        default: isVerified = true; // Assume unknown are optional or checked elsewhere
    }
    console.log(`VAC_PRECHECK: For '${eventName}': Verified? ${isVerified}`);
    if (isVerified) {
        if(!vacMetDependenciesLog[eventName]) { vacMetDependenciesLog[eventName] = true; vacDepsMetCount++; }
    } else {
        vacAllPreloaded = false;
        console.log(`VAC_PRECHECK: Dep '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitVAC(eventName), { once: true });
    }
});

if (vacAllPreloaded && vacDepsMetCount === dependenciesForVAC.length) {
    console.log('view_action_coordinator.ts: All deps pre-verified. Initializing directly.');
    initializeActualViewActionCoordinator();
} else if (!vacAllPreloaded) {
    console.log('view_action_coordinator.ts: Waiting for some VAC dependency events.');
}
console.log('view_action_coordinator.ts: Script execution finished.');