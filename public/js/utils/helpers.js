// js/utils/helpers.js

console.log("js/utils/helpers.js: Script execution STARTED.");

window.polyglotHelpers = (() => { // Encapsulate in IIFE
    'use strict';
    console.log("js/utils/helpers.js: IIFE STARTING.");

    const isConnectorCurrentlyActive = (connector) => {
        // ... (your existing code for isConnectorCurrentlyActive) ...
        if (!connector || !connector.sleepSchedule || !connector.sleepSchedule.wake || !connector.sleepSchedule.sleep) {
            return true; 
        }
        try {
            const now = new Date(); 
            const currentHour = now.getHours(); 
            const currentMinutes = now.getMinutes(); 
            const [wakeHour, wakeMinute] = connector.sleepSchedule.wake.split(':').map(Number);
            const [sleepHour, sleepMinute] = connector.sleepSchedule.sleep.split(':').map(Number);
            if (isNaN(currentHour) || isNaN(currentMinutes) || isNaN(wakeHour) || isNaN(wakeMinute) || isNaN(sleepHour) || isNaN(sleepMinute)) {
                return true;
            }
            const currentTimeInMinutes = currentHour * 60 + currentMinutes;
            const wakeTimeInMinutes = wakeHour * 60 + wakeMinute;
            let sleepTimeInMinutes = sleepHour * 60 + sleepMinute;
            if (sleepTimeInMinutes < wakeTimeInMinutes) { 
                return (currentTimeInMinutes >= wakeTimeInMinutes || currentTimeInMinutes < sleepTimeInMinutes);
            } else { 
                return (currentTimeInMinutes >= wakeTimeInMinutes && currentTimeInMinutes < sleepTimeInMinutes);
            }
        } catch (e) {
            console.error("polyglotHelpers.isConnectorCurrentlyActive: Error for", connector?.id, ":", e);
            return true;
        }
    };

    const calculateAge = function(birthdateString) {
        // ... (your existing code for calculateAge) ...
        if (!birthdateString) return null;
        try {
            const birthDate = new Date(birthdateString);
            if (isNaN(birthDate.getTime())) return null;
            const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            return age >= 0 ? age : null;
        } catch (e) { console.error("polyglotHelpers.calculateAge: Error for:", birthdateString, e); return null; }
    };

    const getFlagCdnUrl = (countryCode, width = null) => {
        // ... (your existing code for getFlagCdnUrl) ...
        if (window.flagLoader && typeof window.flagLoader.getFlagUrl === 'function') {
            return window.flagLoader.getFlagUrl(countryCode);
        }
        console.warn("polyglotHelpers.getFlagCdnUrl: flagLoader not available. Returning fallback.");
        return 'images/flags/unknown.png';
    };

    const getFlagEmoji = (countryCode) => {
        // ... (your existing code for getFlagEmoji) ...
        if (!countryCode || typeof countryCode !== 'string') return '🏳️';
        const cc = countryCode.toUpperCase().trim();
        const flagEmojis = { FR: "🇫🇷", ES: "🇪🇸", MX: "🇲🇽", AR: "🇦🇷", CO: "🇨🇴", DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", IT: "🇮🇹", PT: "🇵🇹", BR: "🇧🇷", RU: "🇷🇺", SE: "🇸🇪", ID: "🇮🇩", GB: "🇬🇧", US: "🇺🇸", CA: "🇨🇦", AU: "🇦🇺", NZ: "🇳🇿", PH: "🇵🇭", JP: "🇯🇵", KR: "🇰🇷", CN: "🇨🇳"};
        return flagEmojis[cc] || '🏳️';
    };

    const saveToLocalStorage = (key, data) => {
        // ... (your existing code for saveToLocalStorage) ...
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error("polyglotHelpers.saveToLocalStorage: Error saving key:", key, e); }
    };

    const loadFromLocalStorage = (key) => {
        // ... (your existing code for loadFromLocalStorage) ...
        try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : null; } catch (e) { console.error("polyglotHelpers.loadFromLocalStorage: Error loading key:", key, e); return null; }
    };

    const generateUUID = () => {
        // ... (your existing code for generateUUID) ...
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
    };

    const simulateTypingDelay = (baseDelayMs = 1500, messageLength = 0) => {
        // ... (your existing code for simulateTypingDelay) ...
        const lengthFactor = Math.min(Math.floor(messageLength / 15) * 100, 1500);
        const randomFactor = (Math.random() - 0.5) * 400;
        return Math.max(400, baseDelayMs + lengthFactor + randomFactor);
    };

    const sanitizeTextForDisplay = (text) => {
        // ... (your existing code for sanitizeTextForDisplay) ...
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const debounce = (func, delay) => {
        // ... (your existing code for debounce) ...
        let timeoutId;
        return function(...args) { const context = this; clearTimeout(timeoutId); timeoutId = setTimeout(() => func.apply(context, args), delay); };
    };

    const emojiRegex = /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}])\u{FE0F}?/gu;

    const stripEmojis = (text) => {
        // ... (your existing code for stripEmojis) ...
        if (typeof text !== 'string') return '';
        return text.replace(emojiRegex, '').replace(/\s+/g, ' ').trim();
    };

    const speakText = (text, lang = 'en-US', voiceName = null) => {
        // ... (your existing code for speakText, ensuring it uses the module-scoped stripEmojis) ...
        const textWithoutEmojis = stripEmojis(text);
        if (!textWithoutEmojis.trim() || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);
        utterance.lang = lang;
        const voices = window.speechSynthesis.getVoices();
        let chosenVoice = null;
        if (voiceName) chosenVoice = voices.find(voice => voice.name === voiceName && (voice.lang === lang || voice.lang.startsWith(lang.substring(0,2))));
        if (!chosenVoice) chosenVoice = voices.find(voice => voice.lang === lang) || voices.find(voice => voice.lang.startsWith(lang.substring(0,2)));
        if (chosenVoice) utterance.voice = chosenVoice;
        window.speechSynthesis.speak(utterance);
    };

    const formatRelativeTimestamp = (timestamp) => {
        // ... (your existing code for formatRelativeTimestamp) ...
        if (!timestamp) return ''; const now = new Date(); const date = new Date(timestamp);
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (isNaN(diffSeconds)) return '';
        const diffMinutes = Math.round(diffSeconds / 60); const diffHours = Math.round(diffMinutes / 60);
        const diffDays = Math.round(diffHours / 24);
        if (diffSeconds < 5) return 'just now'; if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffMinutes < 60) return `${diffMinutes}m ago`; if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) { const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; return days[date.getDay()]; }
        else { const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${months[date.getMonth()]} ${date.getDate()}`; }
    };

    // --- NEW FUNCTION ---
    function formatTranscriptForLLM(transcriptArray, personaName = "Partner", userName = "User") {
        console.log(`polyglotHelpers.formatTranscriptForLLM: Formatting ${transcriptArray?.length || 0} turns. Persona: ${personaName}, User: ${userName}`);
        if (!Array.isArray(transcriptArray) || transcriptArray.length === 0) {
            console.warn("polyglotHelpers.formatTranscriptForLLM: Empty or invalid transcriptArray.");
            return "No conversation took place or transcript is empty.";
        }

        let formatted = "";
        transcriptArray.forEach((turn, index) => {
            if (!turn || typeof turn.text !== 'string') { // Skip turns without text
                console.warn(`polyglotHelpers.formatTranscriptForLLM: Skipping turn ${index} due to missing text. Turn:`, turn);
                return; 
            }

            let speakerLabel = userName; // Default to User
            
            // Determine speaker label based on 'sender' field
            // This needs to match the 'sender' values used in sessionStateManager.addTurnToTranscript
            if (turn.sender === 'connector' || turn.sender === 'connector-spoken-output' || turn.sender === 'connector-greeting-intent' || turn.sender === personaName) { // Added direct personaName check
                speakerLabel = personaName;
            } else if (turn.sender === 'user-audio-transcript' || turn.sender === 'user-typed' || turn.sender === 'user' || turn.sender === userName) { // Added direct userName check
                speakerLabel = userName;
            } else if (turn.sender === 'system-activity' || turn.sender === 'system-message') {
                speakerLabel = "System";
            } else {
                // Fallback for unknown senders, but log it
                console.warn(`polyglotHelpers.formatTranscriptForLLM: Unknown sender type '${turn.sender}' in turn ${index}. Defaulting to 'Unknown'. Turn:`, turn);
                speakerLabel = `Unknown (${turn.sender})`; 
            }
            
            let textContent = turn.text; // Already confirmed to be a string
            
            // If it's an image type from user and no text, use placeholder.
            // This assumes 'type' field is present on transcript objects.
            if (turn.type === 'image' && textContent.trim() === "[User sent an image]" && (speakerLabel === userName || speakerLabel.startsWith(userName))) {
                textContent = `[${userName} sent an image]`; // Keep placeholder if it was already that
            } else if (turn.type === 'image' && !textContent.toLowerCase().includes('image') && (speakerLabel === userName || speakerLabel.startsWith(userName))) {
                // If it's an image type but text doesn't mention image, use placeholder
                textContent = `[${userName} sent an image: ${textContent}]`; 
            }


            // Basic sanitization (you might have a more complex one)
            // This is crucial to prevent injection if the transcript text itself could contain HTML/script
            // For LLM prompts, often minimal sanitization is needed unless the text contains characters
            // that would break the prompt structure (like too many newlines or special sequences the LLM interprets).
            // For now, let's assume text is relatively clean for the LLM prompt.
            // const sanitizedText = sanitizeTextForDisplay(textContent); // Using your existing helper

            formatted += `${speakerLabel}: ${textContent}\n`;
        });
        const finalFormatted = formatted.trim();
        console.log(`polyglotHelpers.formatTranscriptForLLM: Final formatted transcript (first 300 chars): ${finalFormatted.substring(0,300)}...`);
        return finalFormatted;
    }
    // --- END NEW FUNCTION ---


    if (window.speechSynthesis) {
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                // console.log("polyglotHelpers: Speech synthesis voices loaded/changed.");
            };
        }
    }

    console.log("js/utils/helpers.js: IIFE FINISHED, returning exports.");
    return {
        isConnectorCurrentlyActive,
        calculateAge,
        getFlagCdnUrl,
        getFlagEmoji,
        saveToLocalStorage,
        loadFromLocalStorage,
        generateUUID,
        simulateTypingDelay,
        sanitizeTextForDisplay,
        debounce,
        stripEmojis,
        speakText,
        formatRelativeTimestamp,
        formatTranscriptForLLM // <-- EXPORT THE NEW FUNCTION
    };
})();

if (window.polyglotHelpers && typeof window.polyglotHelpers.formatTranscriptForLLM === 'function') {
    console.log("js/utils/helpers.js: SUCCESSFULLY assigned to window.polyglotHelpers and formatTranscriptForLLM is present.");
} else if (window.polyglotHelpers) {
    console.error("js/utils/helpers.js: CRITICAL ERROR - window.polyglotHelpers IS ASSIGNED, but formatTranscriptForLLM method IS MISSING.");
} else {
    console.error("js/utils/helpers.js: CRITICAL ERROR - window.polyglotHelpers IS UNDEFINED after IIFE execution.");
}
console.log("js/utils/helpers.js: Script execution FINISHED.");