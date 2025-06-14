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
    displaySessionSummaryInMainView: (sessionData: SessionData | null) => void; // <<< ADD THIS
}

// Placeholder
window.viewActionCoordinator = {} as ViewActionCoordinatorModule;
console.log('view_action_coordinator.ts: Placeholder window.viewActionCoordinator assigned.');
document.dispatchEvent(new CustomEvent('viewActionCoordinatorPlaceholderReady')); // <<< ADD THIS
console.log('view_action_coordinator.ts: "viewActionCoordinatorPlaceholderReady" event dispatched.'); // <<< ADD THIS

function initializeActualViewActionCoordinator(): void {
    console.log("view_action_coordinator.ts: initializeActualViewActionCoordinator() called.");

    type VerifiedDeps = {
        domElements: YourDomElements;
        polyglotHelpers: PolyglotHelpersOnWindow;
        uiUpdater?: UiUpdater; // Optional if only displaySummaryInView uses it heavily
        chatOrchestrator?: ChatOrchestrator;
        groupManager?: GroupManager;
        sessionHistoryManager?: SessionHistoryManager;
        filterController?: FilterController;
        chatUiManager?: ChatUiManager;
        polyglotSharedContent?: SharedContent;
        // No direct dependency on TabManager needed if we just listen to its event
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
        // For tab-specific actions, we check dependencies within the handler,
        // but core ones like domElements and polyglotHelpers are essential for VAC itself.
        
        // Check for existence of modules that will be called.
        // If a module is missing, its specific tab action might fail silently or log an error there.
        if (!deps.filterController?.applyFindConnectorsFilters) console.warn("VAC: filterController.applyFindConnectorsFilters missing, 'find' tab action affected.");
        if (!deps.groupManager?.loadAvailableGroups) console.warn("VAC: groupManager.loadAvailableGroups missing, 'groups' tab action affected.");
        if (!deps.chatOrchestrator?.handleMessagesTabActive) console.warn("VAC: chatOrchestrator.handleMessagesTabActive missing, 'messages' tab action affected.");
        if (!deps.sessionHistoryManager?.updateSummaryListUI) console.warn("VAC: sessionHistoryManager.updateSummaryListUI missing, 'summary' tab action affected.");
        if (!deps.chatUiManager?.showGroupChatView) console.warn("VAC: chatUiManager.showGroupChatView missing, 'groups' tab action affected.");


        if (missing.length > 0) { // Should only be domElements or polyglotHelpers
            console.error(`ViewActionCoordinator: getSafeDeps - MISSING CRITICAL: ${missing.join(', ')}.`);
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();
    if (!resolvedDeps) {
        console.error("view_action_coordinator.ts: CRITICAL - domElements/polyglotHelpers not met. Placeholder remains.");
        document.dispatchEvent(new CustomEvent('viewActionCoordinatorReady'));
        console.warn('view_action_coordinator.ts: "viewActionCoordinatorReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('view_action_coordinator.ts: Core dependencies appear ready for IIFE.');

    window.viewActionCoordinator = ((): ViewActionCoordinatorModule => {
        'use strict';
        const { 
            domElements, polyglotHelpers, uiUpdater, chatOrchestrator, 
            groupManager, sessionHistoryManager, filterController, 
            chatUiManager, polyglotSharedContent 
        } = resolvedDeps;



        function displaySessionSummaryInMainView(sessionData: SessionData | null): void {
    console.log("VAC: displaySessionSummaryInMainView called with sessionData:", sessionData ? sessionData.sessionId : null);
    if (uiUpdater?.displaySummaryInView) { // Check if uiUpdater and its method exist
        uiUpdater.displaySummaryInView(sessionData);
    } else {
        console.error("VAC: uiUpdater.displaySummaryInView is not available to display summary in main view.");
        // Fallback: clear the summary view or show an error directly manipulating DOM
        if (domElements.summaryViewContent) {
            domElements.summaryViewContent.innerHTML = sessionData 
                ? `<p>Error: UI Updater could not display summary for ${sessionData.sessionId}.</p>`
                : '<p>Error: UI Updater unavailable and no session data to display.</p>';
        }
    }
    // This function assumes uiUpdater.displaySummaryInView handles the actual DOM manipulation
    // for the main #summary-view .view-content area.
    }


        // --- Copied and adapted from old view_manager.ts ---
        function populateHomepageTips(): void {
            console.log("VAC: populateHomepageTips() called.");
            if (!domElements.homepageTipsList || !polyglotSharedContent?.homepageTips || !polyglotHelpers) {
                if (domElements.homepageTipsList) domElements.homepageTipsList.innerHTML = "<li>Tips unavailable.</li>";
                return;
            }
            const tips = polyglotSharedContent.homepageTips;
            if (!Array.isArray(tips) || tips.length === 0) {
                domElements.homepageTipsList.innerHTML = "<li>No tips available.</li>"; return;
            }
            domElements.homepageTipsList.innerHTML = tips.map(tip =>
                `<li><i class="fas fa-check-circle tip-icon"></i> ${polyglotHelpers.sanitizeTextForDisplay(tip)}</li>`
            ).join('');
        }

        function updateEmptyListMessages(): void {
            // console.log("VAC: updateEmptyListMessages() called.");
            if (!domElements) return;
            const updateList = (ul: HTMLElement | null, msgEl: HTMLElement | null, defaultMsg: string, filterCheck?: () => boolean, filterMsg?: string) => {
                if (ul && msgEl) {
                    const hasItems = ul.children.length > 0;
                    msgEl.style.display = hasItems ? 'none' : 'block';
                    if (!hasItems) msgEl.textContent = (filterCheck?.() && filterMsg) ? filterMsg : defaultMsg;
                }
            };
            updateList(domElements.chatListUl, domElements.emptyChatListMsg, "No active chats.");
            updateList(domElements.summaryListUl, domElements.emptySummaryListMsg, "No session history.");
            updateList(domElements.availableGroupsUl, domElements.groupLoadingMessage, "No groups available.",
                () => !!(domElements.filterGroupLanguageSelect?.value && domElements.filterGroupLanguageSelect.value !== 'all'),
                "No groups match your current filter."
            );
            if (domElements.connectorHubGrid) {
                const loadingMsgEl = domElements.connectorHubGrid.querySelector('.loading-message') as HTMLElement | null;
                if (loadingMsgEl) {
                    const hasCards = domElements.connectorHubGrid.querySelectorAll('.connector-card').length > 0;
                    loadingMsgEl.style.display = hasCards ? 'none' : 'block';
                    if (!hasCards) {
                        loadingMsgEl.textContent = 'No connectors available. Try adjusting filters.';
                    }
                }
            }
        }
        // --- End of copied functions ---

        function handleTabSwitched(event: Event): void {
            const customEvent = event as CustomEvent;
            const newTab = customEvent.detail?.newTab as string | undefined;
            // const isInitialLoad = customEvent.detail?.isInitialLoad as boolean | undefined;
            console.log(`VAC: 'tabSwitched' event received. New tab: ${newTab}`);

            if (!newTab) return;

            // Re-fetch dependencies or assume they are ready from initial check
            // For safety, it's good to use optional chaining when calling them.
            
            if (newTab === 'home') {
                populateHomepageTips();
            } else if (newTab === 'find') {
                filterController?.applyFindConnectorsFilters?.();
            } else if (newTab === 'groups') {
                const currentGroup = groupManager?.getCurrentGroupData?.();
                // This logic is now data-driven, not based on brittle style checks.
                if (currentGroup) {
                    // A group is active. Ensure the chat interface for it is shown.
                    const members = groupManager?.getFullCurrentGroupMembers?.() || [];
                    chatUiManager?.showGroupChatView?.(currentGroup.name, members as Connector[]);
                } else {
                    // No group is active, so show the list of available groups.
                    chatUiManager?.hideGroupChatView?.();
                    groupManager?.loadAvailableGroups?.();
                }
            } else if (newTab === 'messages') {
                chatOrchestrator?.handleMessagesTabActive?.();
            } else if (newTab === 'summary') {
                sessionHistoryManager?.updateSummaryListUI?.();
                // The main summary view display is handled by clicking an item in the list,
                // or if you want to auto-display the latest summary:
                // const sessions = sessionHistoryManager?.getCompletedSessions?.();
                // if (sessions && sessions.length > 0) {
                //     uiUpdater?.displaySummaryInView?.(sessions[0]);
                // } else {
                     uiUpdater?.displaySummaryInView?.(null); // Show placeholder
                // }
            }
            updateEmptyListMessages(); // Call after any tab-specific list rendering
        }

        function initialize(): void {
            console.log("ViewActionCoordinator: Initializing and listening for 'tabSwitched' event.");
            document.addEventListener('tabSwitched', handleTabSwitched);
            // If tabManager's initial 'tabSwitched' event might be missed because VAC initializes later,
            // explicitly call handleTabSwitched for the current tab.
            const initialTab = window.tabManager?.getCurrentActiveTab?.();
            if(initialTab) {
                console.log("VAC: Triggering initial action for tab:", initialTab);
                handleTabSwitched(new CustomEvent('tabSwitched', {detail: {newTab: initialTab, isInitialLoad: true}}));
            }
        }

        return {
            initialize,
             displaySessionSummaryInMainView // <<< ADD THIS
        };
    })();

    
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