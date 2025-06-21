// D:\polyglot_connect\src\js\dev\api_key_dashboard_ui.ts
import '@/css/dev/dev_tools.css'; // Use the same stylesheet as your other dev tools

console.log("API Key Dashboard UI: Dev tool script loaded.");

function initializeApiKeyDashboard(): void {
    const healthTracker = (window as any).apiKeyHealthTracker;
    if (!healthTracker) {
        console.error("Dashboard UI: Health tracker not available. Cannot initialize dashboard.");
        return;
    }

    const dashboardButton = document.createElement('button');
    dashboardButton.id = 'dev-api-health-toggle';
    dashboardButton.title = 'API Key Health';
    dashboardButton.innerHTML = '🚀';

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'dev-api-health-dashboard';
    modalOverlay.className = 'dev-modal-overlay'; // Use your existing modal class
    
    modalOverlay.innerHTML = `
        <div class="dev-modal-content">
            <button id="dev-api-health-close-btn" class="dev-close-btn">×</button>
            <h3>API Key Health Status</h3>
            <div class="dev-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Provider</th>
                            <th>Nickname</th>
                            <th>Success Rate</th>
                            <th>Last Check</th>
                            <th>Last Error</th>
                        </tr>
                    </thead>
                    <tbody id="dev-api-health-dashboard-body">
                        <!-- Rows will be injected here -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(dashboardButton);
    document.body.appendChild(modalOverlay);

    const closeBtn = document.getElementById('dev-api-health-close-btn');
    const dashboardBody = document.getElementById('dev-api-health-dashboard-body');

    if (!closeBtn || !dashboardBody) {
        console.error("API Key Dashboard: Could not find modal elements after creation.");
        return;
    }

    function renderDashboard() {
        const data = healthTracker.getHealthData();
        
        // --- THIS IS THE CORRECT FIX: Use a type assertion on the array itself ---
        const sortedData = (Object.values(data) as ApiKeyHealthStatus[]).sort((a, b) => 
            a.provider.localeCompare(b.provider) || a.nickname.localeCompare(b.nickname)
        );

        dashboardBody!.innerHTML = ''; // Clear old content

        if (sortedData.length === 0) {
            dashboardBody!.innerHTML = '<tr><td colspan="6">No API calls recorded yet.</td></tr>';
            return;
        }

        sortedData.forEach((key) => {
            const row = document.createElement('tr');
            row.className = key.lastStatus;

            const successRate = key.successCount + key.failureCount > 0
                ? ((key.successCount / (key.successCount + key.failureCount)) * 100).toFixed(0)
                : 'N/A';

            row.innerHTML = `
                <td><span class="status-indicator">${key.lastStatus === 'success' ? '✅' : '❌'}</span></td>
                <td>${key.provider}</td>
                <td>${key.nickname}</td>
                <td>${successRate}% (${key.successCount}/${key.failureCount})</td>
                <td>${new Date(key.lastChecked).toLocaleTimeString()}</td>
                <td class="error-message">${key.lastError || 'N/A'}</td>
            `;
            dashboardBody!.appendChild(row);
        });
    }

    function showDashboard() {
        renderDashboard();
        modalOverlay.style.display = 'flex';
    }

    function hideDashboard() {
        modalOverlay.style.display = 'none';
    }

    dashboardButton.addEventListener('click', showDashboard);
    closeBtn.addEventListener('click', hideDashboard);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            hideDashboard();
        }
    });

    window.addEventListener('apiKeyHealthUpdated', renderDashboard);

    console.log("API Key Health Dashboard UI and event listeners initialized.");
}

// Expose on window
(window as any).apiKeyDashboardUI = {
    initialize: initializeApiKeyDashboard,
};

document.dispatchEvent(new CustomEvent('apiKeyDashboardUiReady'));