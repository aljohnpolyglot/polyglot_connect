// =================== START: REPLACEMENT ===================
import '@/css/dev/dev_tools.css';

console.log("Cerebrum Inspector: Dev tool script loaded.");

function initializeCerebrumInspector(): void {
    const inspectorButton = document.createElement('button');
    inspectorButton.id = 'dev-cerebrum-inspector-btn';
    inspectorButton.title = 'Inspect Cerebrum';
    inspectorButton.innerHTML = '🧠';

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'dev-inspector-modal';
    modalOverlay.className = 'dev-modal-overlay';
    
    modalOverlay.innerHTML = `
        <div class="dev-modal-content">
            <button id="dev-inspector-close-btn" class="dev-close-btn">×</button>
            <h3>Cerebrum Memory Ledger Inspector</h3>
            <pre id="dev-inspector-json-output" class="styled-scrollbar"></pre>
        </div>
    `;

    document.body.appendChild(inspectorButton);
    document.body.appendChild(modalOverlay);

    const closeBtn = document.getElementById('dev-inspector-close-btn');
    const jsonOutput = document.getElementById('dev-inspector-json-output');

    if (!closeBtn || !jsonOutput) {
        console.error("Cerebrum Inspector: Could not find modal elements after creation.");
        return;
    }

    function showInspector() {
        const memoryLedgerRaw = localStorage.getItem('polyglotCerebrum_user_default');
        if (memoryLedgerRaw) {
            try {
                const memoryLedgerParsed = JSON.parse(memoryLedgerRaw);
                jsonOutput!.textContent = JSON.stringify(memoryLedgerParsed, null, 2);
            } catch (e) {
                jsonOutput!.textContent = "Error parsing memory ledger from localStorage.";
            }
        } else {
            jsonOutput!.textContent = "No memory ledger found in localStorage.";
        }
        modalOverlay.style.display = 'flex';
    }

    function hideInspector() {
        modalOverlay.style.display = 'none';
    }

    inspectorButton.addEventListener('click', showInspector);
    closeBtn.addEventListener('click', hideInspector);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            hideInspector();
        }
    });

    console.log("Cerebrum Inspector: UI and event listeners initialized.");
}

document.dispatchEvent(new CustomEvent('cerebrumInspectorReady'));

// Expose the initialize function on the window object
(window as any).cerebrumInspector = {
    initialize: initializeCerebrumInspector,
};
// ===================  END: REPLACEMENT  ===================