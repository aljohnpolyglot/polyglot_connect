// D:\polyglot_connect\src\js\core\api_key_health_tracker.ts

console.log('api_key_health_tracker.ts: Script loaded.');

interface ApiKeyHealthStatus {
    nickname: string;
    provider: 'Gemini' | 'Together' | 'Groq' | 'OpenRouter';
    lastStatus: 'success' | 'failure';
    lastChecked: string; // ISO String
    successCount: number;
    failureCount: number;
    lastError: string;
}

interface HealthStore {
    [nickname: string]: ApiKeyHealthStatus;
}

const STORAGE_KEY = 'polyglotApiKeyHealth';
let healthData: HealthStore = {};

function initialize() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        healthData = JSON.parse(savedData);
    }
    console.log('API Key Health Tracker Initialized.');
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(healthData));
    // Notify the UI that data has changed
    window.dispatchEvent(new CustomEvent('apiKeyHealthUpdated'));
}

function getHealthData(): HealthStore {
    return healthData;
}

function reportStatus(
    nickname: string,
    provider: 'Gemini' | 'Together' | 'Groq' | 'OpenRouter',
    status: 'success' | 'failure',
    error: string = ''
) {
    if (!healthData[nickname]) {
        healthData[nickname] = {
            nickname,
            provider,
            lastStatus: status,
            lastChecked: new Date().toISOString(),
            successCount: 0,
            failureCount: 0,
            lastError: error,
        };
    }

    const entry = healthData[nickname];
    entry.lastStatus = status;
    entry.lastChecked = new Date().toISOString();
    entry.lastError = error;

    if (status === 'success') {
        entry.successCount++;
    } else {
        entry.failureCount++;
    }
    
    saveData();
}

// Expose on window
(window as any).apiKeyHealthTracker = {
    initialize,
    getHealthData,
    reportStatus,
};

// Dispatch ready event
document.dispatchEvent(new CustomEvent('apiKeyHealthTrackerReady'));