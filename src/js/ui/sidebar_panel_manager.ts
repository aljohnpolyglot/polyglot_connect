// D:\polyglot_connect\src\js\ui\sidebar_panel_manager.ts
// D:\polyglot_connect\src\js\ui\sidebar_panel_manager.ts
// D:\polyglot_connect\src\js\ui\sidebar_panel_manager.ts
import type {
    YourDomElements,
    TabManagerModule,
    GroupManager,
    ChatOrchestrator // <<< ADD IF NOT PRESENT
} from '../types/global.d.ts';

console.log('sidebar_panel_manager.ts: Script loaded, waiting for core dependencies.');

interface SidebarPanelManagerModule {
    initialize: () => void;
    updatePanelForCurrentTab: () => void; // <<< ADD THIS NEW METHOD
}

// Placeholder (optional, as app.ts might not directly check for it, but good for consistency)
window.sidebarPanelManager = {} as SidebarPanelManagerModule;
console.log('sidebar_panel_manager.ts: Placeholder window.sidebarPanelManager assigned.');

function initializeActualSidebarPanelManager(): void {
    console.log("sidebar_panel_manager.ts: initializeActualSidebarPanelManager() called.");

    type VerifiedDeps = {
        domElements: YourDomElements;
        groupManager?: GroupManager; // Optional: only needed if group tab logic is complex
                                    // For now, let's assume groupManager is ready if its event is a dependency
    };

  // D:\polyglot_connect\src\js\ui\sidebar_panel_manager.ts
// (Inside initializeActualSidebarPanelManager)
const getSafeDeps = (): { domElements: YourDomElements; tabManager: TabManagerModule; groupManager: GroupManager; } | null => {
    const deps = {
        domElements: window.domElements as YourDomElements | undefined,
        tabManager: window.tabManager as TabManagerModule | undefined,
        groupManager: window.groupManager as GroupManager | undefined // <<< ADDED
    };
    const missing: string[] = [];
    if (!deps.domElements) missing.push("domElements");
    if (!deps.tabManager || typeof deps.tabManager.switchToTab !== 'function') missing.push("tabManager or its key methods");
    if (!deps.groupManager || typeof deps.groupManager.getCurrentGroupData !== 'function') missing.push("groupManager or its getCurrentGroupData method"); // <<< ADDED CHECK

    if (missing.length > 0) {
        console.error(`SPM: getSafeDeps - MISSING/INVALID: ${missing.join(', ')}.`);
        return null;
    }
    return deps as { domElements: YourDomElements; tabManager: TabManagerModule; groupManager: GroupManager; };
};

    const resolvedDeps = getSafeDeps();
    if (!resolvedDeps) {
        console.error("sidebar_panel_manager.ts: CRITICAL - domElements.rightSidebarPanels not met. Placeholder remains.");
        // document.dispatchEvent(new CustomEvent('sidebarPanelManagerReady'));
        console.warn('sidebar_panel_manager.ts: "sidebarPanelManagerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('sidebar_panel_manager.ts: Core dependencies appear ready for IIFE.');

    window.sidebarPanelManager = ((): SidebarPanelManagerModule => {
        'use strict';
        const { domElements, tabManager, groupManager } = resolvedDeps!; // <<< ADD groupManager here

      // D:\polyglot_connect\src\js\ui\sidebar_panel_manager.ts
// (Inside the IIFE)

function setActiveRightSidebarPanel(panelIdToShow: string | null): void {
    console.log("SPM: setActiveRightSidebarPanel called with panelId:", panelIdToShow);
    let panelFoundAndActivated = false;
    domElements.rightSidebarPanels.forEach(panel => {
        if (panel.id === panelIdToShow) {
            panel.classList.add('active-panel');
            panelFoundAndActivated = true;
        } else {
            panel.classList.remove('active-panel');
        }
    });

    if (panelIdToShow && !panelFoundAndActivated) {
        console.warn(`SidebarPanelManager: Panel with ID '${panelIdToShow}' NOT FOUND.`);
    }

    // If messagesChatListPanel is the one being shown, ensure its content is up-to-date.
    if (panelIdToShow === 'messagesChatListPanel') {
        const currentChatOrchestrator = window.chatOrchestrator as ChatOrchestrator | undefined;
        if (currentChatOrchestrator && typeof currentChatOrchestrator.renderCombinedActiveChatsList === 'function') {
            console.log("SPM: messagesChatListPanel is active, calling chatOrchestrator.renderCombinedActiveChatsList().");
            currentChatOrchestrator.renderCombinedActiveChatsList();
        } else {
            console.warn("SPM: chatOrchestrator not available or renderCombinedActiveChatsList is not a function.");
        }
    }
}
      // D:\polyglot_connect\src\js\ui\sidebar_panel_manager.ts
// (Inside the IIFE)
function handleTabSwitched(event: Event): void {
    const customEvent = event as CustomEvent; 
    const newTab = customEvent.detail?.newTab as string | undefined;
    console.log(`SPM: 'tabSwitched' (or forced update) event received. New tab: '${newTab}'`);

    if (!newTab) {
        console.log("SPM: newTab is undefined, exiting handleTabSwitched.");
        return;
    }

    let rightPanelIdToShow: keyof YourDomElements | null = null; // Use the specific key type

    if (newTab === 'friends') { // <<< UPDATED FROM 'find'
        rightPanelIdToShow = 'friendsFiltersPanel'; // <<< UPDATED ID
    } else if (newTab === 'groups') {
        console.log("SPM: Handling 'groups' tab.");
        if (!groupManager || typeof groupManager.getCurrentGroupData !== 'function') {
            console.warn("SPM: groupManager or getCurrentGroupData not available. Defaulting to groupsFiltersPanel.");
            rightPanelIdToShow = 'groupsFiltersPanel';
        } else {
            const currentGroupData = groupManager.getCurrentGroupData();
            if (currentGroupData) {
                console.log(`SPM: For 'groups' tab, groupManager.getCurrentGroupData() returned:`, JSON.parse(JSON.stringify(currentGroupData)));
                console.log("SPM: Active group IS present. Setting panel to 'messagesChatListPanel'.");
                rightPanelIdToShow = 'messagesChatListPanel';
            } else {
                console.log(`SPM: For 'groups' tab, groupManager.getCurrentGroupData() returned null/undefined.`);
                console.log("SPM: No active group. Setting panel to 'groupsFiltersPanel'.");
                rightPanelIdToShow = 'groupsFiltersPanel';
            }
        }
    } else if (newTab === 'messages') {
        rightPanelIdToShow = 'messagesChatListPanel';
    } else if (newTab === 'summary') {
        rightPanelIdToShow = 'summaryChatListPanel';
    } else if (newTab === 'home') {
        rightPanelIdToShow = null; 
    } else {
        console.warn(`SPM: Unknown tab '${newTab}' in handleTabSwitched. No panel will be shown.`);
        rightPanelIdToShow = null;
    }

    console.log(`SPM: Determined rightPanelIdToShow: '${String(rightPanelIdToShow)}' for tab '${newTab}'.`);
    setActiveRightSidebarPanel(String(rightPanelIdToShow)); // Ensure string or null
}

      // D:\polyglot_connect\src\js\ui\sidebar_panel_manager.ts
// (Inside the IIFE)
function initialize(): void {
    console.log("SPM: Initializing and listening for 'tabSwitched' event.");
    // document.addEventListener('tabSwitched', handleTabSwitched);

    // // Set initial panel based on the tab active when SPM initializes
    // const initialTab = tabManager.getCurrentActiveTab?.(); // tabManager is from resolvedDeps!
    // if (initialTab) {
    //     console.log(`SPM: Initial panel setup for tab: ${initialTab}`);
    //     // Create a mock event detail to pass to handleTabSwitched
    //     const mockEvent = new CustomEvent('tabSwitched', {
    //         detail: { newTab: initialTab, isInitialLoad: true }
    //     });
    //     handleTabSwitched(mockEvent);
    // } else {
    //     console.warn("SPM: Could not get initial tab from tabManager during initialization. Defaulting panel logic for 'home'.");
    //      const mockEvent = new CustomEvent('tabSwitched', {
    //         detail: { newTab: 'home', isInitialLoad: true }
    //     });
    //     handleTabSwitched(mockEvent); // Show no panel for home
    // }
}

return {
    initialize,
    updatePanelForCurrentTab: () => { // <<< ADD THIS EXPORTED METHOD
        const currentTab = tabManager.getCurrentActiveTab?.();
        if (currentTab) {
            console.log(`SPM_DEBUG: updatePanelForCurrentTab called directly for tab: ${currentTab}`);
            // Create a mock event for handleTabSwitched or call a common internal function
            const mockEvent = new CustomEvent('forcePanelUpdate', {
                detail: { newTab: currentTab } // Use newTab to match handleTabSwitched
            });
            handleTabSwitched(mockEvent); // Reuse existing logic
        } else {
            console.warn("SPM: updatePanelForCurrentTab - Could not get current tab.");
        }
    }
};
    })();

   // ... inside initializeActualSidebarPanelManager() ...

    if (window.sidebarPanelManager && typeof window.sidebarPanelManager.initialize === 'function') {
        console.log("sidebar_panel_manager.ts: SUCCESSFULLY assigned and populated.");
        // Dispatch the ready event now that the module is fully functional
        document.dispatchEvent(new CustomEvent('sidebarPanelManagerReady')); // <<< ENSURE THIS IS HERE
        console.log('sidebar_panel_manager.ts: "sidebarPanelManagerReady" event dispatched.');
    } else {
        console.error("sidebar_panel_manager.ts: CRITICAL ERROR - population FAILED.");
        // Optionally dispatch a failed event, or let app.ts timeout if this module is critical
    }
}

// Dependency Management for SidebarPanelManager
const dependenciesForSPM: string[] = ['domElementsReady', 'tabManagerReady', 'groupManagerReady']; // groupManagerReady for group tab logic
const spmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForSPM.forEach((dep: string) => spmMetDependenciesLog[dep] = false);
let spmDepsMetCount = 0;

function checkAndInitSPM(receivedEventName?: string): void {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'domElementsReady': verified = !!window.domElements?.rightSidebarPanels; break;
            case 'tabManagerReady': verified = !!window.tabManager?.initialize; break;
            case 'groupManagerReady': verified = !!window.groupManager?.getCurrentGroupData; break; // Check a key method
        }
        if (verified && !spmMetDependenciesLog[receivedEventName]) {
            spmMetDependenciesLog[receivedEventName] = true;
            spmDepsMetCount++;
            console.log(`SPM: Dep '${receivedEventName}' met. Count: ${spmDepsMetCount}/${dependenciesForSPM.length}`);
        } else if (!verified) {
            console.warn(`SPM: Event '${receivedEventName}' received but verification failed.`);
        }
    }
    if (spmDepsMetCount === dependenciesForSPM.length) {
        console.log('sidebar_panel_manager.ts: All dependencies met. Initializing SidebarPanelManager.');
        initializeActualSidebarPanelManager();
    }
}

console.log('SPM_SETUP: Starting pre-check.');
spmDepsMetCount = 0; Object.keys(spmMetDependenciesLog).forEach(k=>spmMetDependenciesLog[k]=false);
let spmAllPreloaded = true;
dependenciesForSPM.forEach((eventName: string) => {
   let isReadyNow = false; // Consistent naming
let isVerifiedNow = false; // Consistent naming

switch (eventName) {
    case 'domElementsReady':
        isReadyNow = !!window.domElements;
        isVerifiedNow = !!(isReadyNow && window.domElements?.rightSidebarPanels);
        break;
    case 'tabManagerReady':
        isReadyNow = !!window.tabManager;
        isVerifiedNow = !!(isReadyNow && typeof window.tabManager?.initialize === 'function');
        break;
    case 'groupManagerReady':
        isReadyNow = !!window.groupManager;
        isVerifiedNow = !!(isReadyNow && typeof window.groupManager?.getCurrentGroupData === 'function');
        break;
    default:
        console.warn(`SPM_PRECHECK: Unknown dependency in pre-check: ${eventName}`);
        break;
}

console.log(`SPM PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
if (isVerifiedNow) { // Use isVerifiedNow
    if(!spmMetDependenciesLog[eventName]) { spmMetDependenciesLog[eventName] = true; spmDepsMetCount++; }
} else {
    spmAllPreloaded = false; // This variable was spmAllPreloadedAndVerified in other modules
    console.log(`SPM PRECHECK: Dep '${eventName}' not ready/verified. Adding listener.`);
    document.addEventListener(eventName, () => checkAndInitSPM(eventName), { once: true });
}
});

if (spmAllPreloaded && spmDepsMetCount === dependenciesForSPM.length) {
    console.log('sidebar_panel_manager.ts: All deps pre-verified. Initializing directly.');
    initializeActualSidebarPanelManager();
} else if (!spmAllPreloaded) {
    console.log('sidebar_panel_manager.ts: Waiting for some SPM dependency events.');
} // Other cases handled by checkAndInitSPM
console.log('sidebar_panel_manager.ts: Script execution finished.');