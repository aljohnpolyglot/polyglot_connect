// D:\polyglot_connect\src\js\dev\dev_panel.ts
import '@/css/dev/dev_tools.css';
import type { ApiKeyHealthStatus, ApiKeyHealthTrackerModule, DevPanelModule } from '../types/global.d.ts';

// Use a self-invoking function (IIFE) to create a private scope
const devPanelController = ((): DevPanelModule => {
    'use strict';

    // === ALL VARIABLES ARE DECLARED HERE, ACCESSIBLE TO ALL FUNCTIONS BELOW ===
    let isInitialized = false; // <<< ADD THIS LINE
    let panelContainer: HTMLElement | null = null;
    let apiHealthBody: HTMLElement | null = null;
    let cerebrumOutput: HTMLElement | null = null;
    let tabsContainer: HTMLElement | null = null;
    let header: HTMLElement | null = null;

    // This is the function that will be called by the cheat code
    function showToggleButton() {
        const toggleButton = window.domElements?.devPanelToggleButton;
        if (!toggleButton) {
            console.error("Dev Panel: Could not find the dev-panel-toggle-btn in domElements.");
            return;
        }

        toggleButton.style.display = 'flex'; // Make the button visible
        
        // Attach listener only once
        if (!(toggleButton as any)._hasDevPanelListener) {
            toggleButton.addEventListener('click', () => {
                panelContainer?.classList.toggle('visible');
                if (panelContainer?.classList.contains('visible')) {
                    const activeTab = (tabsContainer?.querySelector('.active') as HTMLElement)?.dataset.tab;
                    if (activeTab === 'api-health') renderApiHealth();
                    if (activeTab === 'cerebrum') renderCerebrum();
                }
            });
            (toggleButton as any)._hasDevPanelListener = true;
        }
        console.log("Dev Panel: Toggle button is now visible and functional.");
    }
    
    // Renderer for API Health Tab
      // Renderer for API Health Tab
      function renderApiHealth() {
        const healthTracker = (window as any).apiKeyHealthTracker as ApiKeyHealthTrackerModule;
        // --- THIS IS THE FIX ---
        // Add a safety check to ensure apiHealthBody is not null before using it.
        if (!healthTracker || !apiHealthBody) return;
        
        const data = healthTracker.getHealthData();
        const sortedData = (Object.values(data) as ApiKeyHealthStatus[]).sort((a, b) => 
            a.provider.localeCompare(b.provider) || a.nickname.localeCompare(b.nickname)
        );

        apiHealthBody.innerHTML = ''; // This line is now safe
        if (sortedData.length === 0) {
            apiHealthBody.innerHTML = '<tr><td colspan="6">No API calls recorded yet.</td></tr>';
            return;
        }

        sortedData.forEach(key => {
            const row = document.createElement('tr');
            row.className = key.lastStatus;
            const successRate = key.successCount + key.failureCount > 0 ? ((key.successCount / (key.successCount + key.failureCount)) * 100).toFixed(0) : 'N/A';
            row.innerHTML = `<td><span class="status-indicator">${key.lastStatus === 'success' ? '✅' : '❌'}</span></td><td>${key.provider}</td><td>${key.nickname}</td><td>${successRate}% (${key.successCount}/${key.failureCount})</td><td>${new Date(key.lastChecked).toLocaleTimeString()}</td><td class="error-message">${key.lastError || 'N/A'}</td>`;
            apiHealthBody!.appendChild(row); // <<< THIS IS THE FIX
        });
    }

    // Renderer for Cerebrum Tab
    function renderCerebrum() {
        if (!cerebrumOutput) return;
        const memoryLedgerRaw = localStorage.getItem('polyglotCerebrum_user_default');
        if (memoryLedgerRaw) {
            try {
                cerebrumOutput.textContent = JSON.stringify(JSON.parse(memoryLedgerRaw), null, 2);
            } catch (e) {
                cerebrumOutput.textContent = "Error parsing memory ledger.";
            }
        } else {
            cerebrumOutput.textContent = "No memory ledger found.";
        }
    }

    // Drag-and-drop logic
    function initializeDragAndDrop() {
        if (!header || !panelContainer) return;
        let isDragging = false, offsetX = 0, offsetY = 0;
        const onMouseDown = (event: Event) => {
            const e = event as MouseEvent;
            if ((e.target as HTMLElement).tagName !== 'H3') return;
            isDragging = true;
            offsetX = e.clientX - panelContainer!.offsetLeft;
            offsetY = e.clientY - panelContainer!.offsetTop;
            document.body.classList.add('no-select');
            (e.target as HTMLElement).style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            const boundaryPadding = 10;
            const maxX = window.innerWidth - panelContainer!.offsetWidth - boundaryPadding;
            const maxY = window.innerHeight - panelContainer!.offsetHeight - boundaryPadding;
            newX = Math.max(boundaryPadding, Math.min(newX, maxX));
            newY = Math.max(boundaryPadding, Math.min(newY, maxY));
            panelContainer!.style.left = `${newX}px`;
            panelContainer!.style.top = `${newY}px`;
            panelContainer!.style.bottom = 'auto';
            panelContainer!.style.right = 'auto';
        };
        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.classList.remove('no-select');
            const h3 = header!.querySelector('h3');
            if (h3) h3.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        header.addEventListener('mousedown', onMouseDown);
    }
    
    // The main initialization function for the module
    function initialize() {
        if (isInitialized) return; // <<< ADD THIS LINE
        console.log("Dev Panel: Initializing...");
        
        panelContainer = document.createElement('div');
        panelContainer.id = 'polyglot-dev-panel';
        panelContainer.className = 'dev-panel-container';
        panelContainer.innerHTML = `
            <div class="dev-panel-header"><h3>Polyglot Dev Panel</h3><div class="dev-panel-tabs"><button class="dev-tab-btn active" data-tab="api-health">API Health</button><button class="dev-tab-btn" data-tab="cerebrum">Cerebrum</button></div><button id="dev-panel-close-btn" class="dev-close-btn">×</button></div>
            <div class="dev-panel-content"><div id="dev-tab-api-health" class="dev-tab-content active"><div class="dev-table-container styled-scrollbar"><table><thead><tr><th>Status</th><th>Provider</th><th>Nickname</th><th>Success Rate</th><th>Last Check</th><th>Last Error</th></tr></thead><tbody id="dev-api-health-dashboard-body"></tbody></table></div></div><div id="dev-tab-cerebrum" class="dev-tab-content"><pre id="dev-inspector-json-output" class="styled-scrollbar"></pre></div></div>`;
        document.body.appendChild(panelContainer);

        // Get references to all elements now that they exist
        apiHealthBody = panelContainer.querySelector('#dev-api-health-dashboard-body');
        cerebrumOutput = panelContainer.querySelector('#dev-inspector-json-output');
        tabsContainer = panelContainer.querySelector('.dev-panel-tabs');
        header = panelContainer.querySelector('.dev-panel-header');
        const closeBtn = panelContainer.querySelector('#dev-panel-close-btn');

        // Attach listeners
        initializeDragAndDrop();
        closeBtn?.addEventListener('click', () => panelContainer!.classList.remove('visible'));
        tabsContainer?.addEventListener('click', (e) => {
            const clickedTab = (e.target as HTMLElement).closest<HTMLElement>('.dev-tab-btn');
            if (!clickedTab) return;
            const tabName = clickedTab.dataset.tab;
            tabsContainer!.querySelectorAll('.dev-tab-btn').forEach(btn => btn.classList.remove('active'));
            clickedTab.classList.add('active');
            panelContainer!.querySelectorAll('.dev-tab-content').forEach(content => (content as HTMLElement).classList.remove('active'));
            panelContainer!.querySelector(`#dev-tab-${tabName}`)?.classList.add('active');
            if (tabName === 'api-health') renderApiHealth();
            if (tabName === 'cerebrum') renderCerebrum();
        });
        window.addEventListener('apiKeyHealthUpdated', () => {
            if (panelContainer!.classList.contains('visible')) renderApiHealth();
        });
        
        console.log("Dev Panel UI Initialized and ready.");
        isInitialized = true; // <<< ADD THIS LINE
    }

    // Return the public methods for this module
      // This is a new function we'll expose publicly
      function toggleVisibility() {
        if (!isInitialized) initialize(); // <<< THIS IS THE CORE FIX
        if (panelContainer) {
            const isVisible = panelContainer.classList.toggle('visible');
             if (isVisible) {
                // When opening, refresh the content of the active tab
                const activeTab = (tabsContainer?.querySelector('.active') as HTMLElement)?.dataset.tab;
                if (activeTab === 'api-health') renderApiHealth();
                if (activeTab === 'cerebrum') renderCerebrum();
            }
            console.log(`Dev Panel visibility toggled. Now visible: ${isVisible}`);
        }
    }

    // Return the public methods for this module
    return {
        initialize,
        showToggleButton,
        toggle: toggleVisibility // <<< ADD THIS LINE
    };
})();

// Assign the controller to the window and dispatch ready event
// --- This is the new, simpler initialization block ---

// We just export the controller now. app.ts will handle initialization.
(window as any).devPanel = devPanelController;

// Dispatch the ready event immediately so app.ts knows the code has loaded.
document.dispatchEvent(new CustomEvent('devPanelReady'));