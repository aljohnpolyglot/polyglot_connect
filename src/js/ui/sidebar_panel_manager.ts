import type {
    YourDomElements,
    GroupManager,
    ChatOrchestrator
} from '../types/global.d.ts';

console.log('sidebar_panel_manager.ts: Script loaded, waiting for core dependencies.');

interface SidebarPanelManagerModule {
    initialize: () => void; 
    updatePanelForCurrentTab: (currentTab: string) => void;
}

window.sidebarPanelManager = {} as SidebarPanelManagerModule;
console.log('sidebar_panel_manager.ts: Placeholder window.sidebarPanelManager assigned.');

function initializeActualSidebarPanelManager(): void {
    console.log("sidebar_panel_manager.ts: initializeActualSidebarPanelManager() called.");

    const getSafeDeps = (): { domElements: YourDomElements; groupManager: GroupManager; } | null => {
        const deps = {
            domElements: window.domElements as YourDomElements | undefined,
            groupManager: window.groupManager as GroupManager | undefined
        };
        const missing: string[] = [];
        if (!deps.domElements?.rightSidebarPanels) missing.push("domElements.rightSidebarPanels");
        if (!deps.groupManager?.getCurrentGroupData) missing.push("groupManager.getCurrentGroupData");

        if (missing.length > 0) {
            console.error(`SPM: getSafeDeps - MISSING/INVALID: ${missing.join(', ')}.`);
            return null;
        }
        return deps as { domElements: YourDomElements; groupManager: GroupManager; };
    };

    const resolvedDeps = getSafeDeps();
    if (!resolvedDeps) {
        console.error("sidebar_panel_manager.ts: CRITICAL - Dependencies not met. Placeholder remains.");
        document.dispatchEvent(new CustomEvent('sidebarPanelManagerReady')); // Notify failure
        return;
    }
    console.log('sidebar_panel_manager.ts: Core dependencies appear ready for IIFE.');

    window.sidebarPanelManager = ((): SidebarPanelManagerModule => {
        'use strict';
        const { domElements, groupManager } = resolvedDeps;

        function setActiveRightSidebarPanel(panelIdToShow: string | null): void {
            console.log("SPM: setActiveRightSidebarPanel called with panelId:", panelIdToShow);
            let panelFoundAndActivated = false;
            domElements.rightSidebarPanels.forEach(panel => {
                const isActive = panel.id === panelIdToShow;
                panel.classList.toggle('active-panel', isActive);
                if (isActive) {
                    panelFoundAndActivated = true;
                }
            });

            if (panelIdToShow && !panelFoundAndActivated) {
                console.warn(`SidebarPanelManager: Panel with ID '${panelIdToShow}' NOT FOUND.`);
            }

            if (panelIdToShow === 'messagesChatListPanel') {
                const chatOrchestrator = window.chatOrchestrator as ChatOrchestrator | undefined;
                chatOrchestrator?.renderCombinedActiveChatsList?.();
            }
        }

        function updatePanelForCurrentTab(currentTab: string): void {
            console.log(`%c[SPM] Updating panel for tab: ${currentTab}`, 'color: #198754; font-weight: bold;');
            if (!currentTab) {
                setActiveRightSidebarPanel(null);
                return;
            }

            let rightPanelIdToShow: string | null = null;

            switch (currentTab) {
                case 'friends':
                    rightPanelIdToShow = 'friendsFiltersPanel';
                    break;
                case 'groups':
                    rightPanelIdToShow = groupManager.getCurrentGroupData() ? 'messagesChatListPanel' : 'groupsFiltersPanel';
                    break;
                case 'messages':
                    rightPanelIdToShow = 'messagesChatListPanel';
                    break;
                case 'summary':
                    rightPanelIdToShow = 'summaryChatListPanel';
                    break;
                case 'home':
                default:
                    rightPanelIdToShow = null;
                    break;
            }
            console.log(`SPM: Determined rightPanelIdToShow: '${String(rightPanelIdToShow)}' for tab '${currentTab}'.`);
            setActiveRightSidebarPanel(String(rightPanelIdToShow));
        }

        function initialize(): void {
            console.log("SPM: Module initialized. Awaiting calls from ShellController.");
        }

        return {
            initialize,
            updatePanelForCurrentTab
        };
    })();

    if (window.sidebarPanelManager && typeof window.sidebarPanelManager.updatePanelForCurrentTab === 'function') {
        console.log("sidebar_panel_manager.ts: SUCCESSFULLY assigned and populated.");
        document.dispatchEvent(new CustomEvent('sidebarPanelManagerReady'));
        console.log('sidebar_panel_manager.ts: "sidebarPanelManagerReady" event dispatched.');
    } else {
        console.error("sidebar_panel_manager.ts: CRITICAL ERROR - population FAILED.");
    }
}

// Dependency Management
const dependenciesForSPM: string[] = ['domElementsReady', 'groupManagerReady'];
const spmMetDependenciesLog: Record<string, boolean> = {};

function checkAndInitSPM(receivedEventName: string): void {
    if (!spmMetDependenciesLog[receivedEventName]) {
        spmMetDependenciesLog[receivedEventName] = true;
    }
    
    const allMet = dependenciesForSPM.every(dep => spmMetDependenciesLog[dep]);

    if (allMet) {
        console.log('sidebar_panel_manager.ts: All dependencies met. Initializing.');
        initializeActualSidebarPanelManager();
    }
}

dependenciesForSPM.forEach(eventName => {
    spmMetDependenciesLog[eventName] = false; // Initialize all to false
    let isReadyNow = false;
    switch (eventName) {
        case 'domElementsReady': isReadyNow = !!window.domElements?.rightSidebarPanels; break;
        case 'groupManagerReady': isReadyNow = !!window.groupManager?.getCurrentGroupData; break;
    }

    if (isReadyNow) {
        console.log(`SPM PRECHECK: Dep '${eventName}' ALREADY MET.`);
        checkAndInitSPM(eventName);
    } else {
        console.log(`SPM PRECHECK: Dep '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitSPM(eventName), { once: true });
    }
});

console.log('sidebar_panel_manager.ts: Script execution finished.');