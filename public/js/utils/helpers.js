// js/utils/helpers.js

window.polyglotHelpers = (() => { // Encapsulate in IIFE

    const isConnectorCurrentlyActive = (connector) => {
        if (!connector || !connector.sleepSchedule || !connector.sleepSchedule.wake || !connector.sleepSchedule.sleep) {
            // console.warn("polyglotHelpers.isConnectorCurrentlyActive: Missing sleep schedule for", connector?.id, "- assuming active.");
            return true; // Default to active if no schedule
        }
        try {
            const now = new Date(); // Current time in user's local timezone
            // We need to interpret wake/sleep times in the persona's *activeTimezone*

            // For simplicity if not using a library:
            // This basic approach doesn't handle timezone conversions robustly if user's timezone differs greatly
            // from persona's activeTimezone AND the times cross midnight in a complex way.
            // A proper solution would use a date library like Moment Timezone or Intl.DateTimeFormat with timeZone option.

            // Simple approach (assumes times are relative to a conceptual day in persona's timezone):
            const currentHour = now.getHours(); // This is user's local hour
            const currentMinutes = now.getMinutes(); // User's local minute

            // To make this more accurate, one would need to get current time IN the persona's activeTimezone.
            // This is complex without a library. For now, this logic is a rough approximation.
            // The prompt for Gemini about persona availability could include activeTimezone.

            const [wakeHour, wakeMinute] = connector.sleepSchedule.wake.split(':').map(Number);
            const [sleepHour, sleepMinute] = connector.sleepSchedule.sleep.split(':').map(Number);

            if (isNaN(currentHour) || isNaN(currentMinutes) || isNaN(wakeHour) || isNaN(wakeMinute) || isNaN(sleepHour) || isNaN(sleepMinute)) {
                console.warn("polyglotHelpers.isConnectorCurrentlyActive: Invalid time format for", connector.id);
                return true;
            }

            const currentTimeInMinutes = currentHour * 60 + currentMinutes;
            const wakeTimeInMinutes = wakeHour * 60 + wakeMinute;
            let sleepTimeInMinutes = sleepHour * 60 + sleepMinute;

            if (sleepTimeInMinutes < wakeTimeInMinutes) { // Sleep time is on the next day
                // Active if current time is after wake time OR before sleep time (on the next day portion)
                return (currentTimeInMinutes >= wakeTimeInMinutes || currentTimeInMinutes < sleepTimeInMinutes);
            } else { // Sleep time is on the same day
                // Active if current time is after wake time AND before sleep time
                return (currentTimeInMinutes >= wakeTimeInMinutes && currentTimeInMinutes < sleepTimeInMinutes);
            }
        } catch (e) {
            console.error("polyglotHelpers.isConnectorCurrentlyActive: Error for", connector?.id, ":", e);
            return true; // Default to active on error
        }
    };

    const calculateAge = function(birthdateString) {
        if (!birthdateString) return null;
        try {
            const birthDate = new Date(birthdateString);
            if (isNaN(birthDate.getTime())) {
                // console.warn("polyglotHelpers.calculateAge: Invalid date:", birthdateString);
                return null;
            }
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 0 ? age : null;
        } catch (e) {
            console.error("polyglotHelpers.calculateAge: Error for:", birthdateString, e);
            return null;
        }
    };

    const getFlagCdnUrl = (countryCode, width = null) => {
        if (window.flagLoader && typeof window.flagLoader.getFlagUrl === 'function') {
            return window.flagLoader.getFlagUrl(countryCode);
        }
        console.warn("polyglotHelpers.getFlagCdnUrl: flagLoader not available. Returning fallback.");
        return 'images/flags/unknown.png';
    };

    const getFlagEmoji = (countryCode) => {
        if (!countryCode || typeof countryCode !== 'string') return '🏳️';
        const cc = countryCode.toUpperCase().trim();
        // Consider a more comprehensive mapping or a small library if you need many more
        const flagEmojis = {
            FR: "🇫🇷", ES: "🇪🇸", MX: "🇲🇽", AR: "🇦🇷", CO: "🇨🇴", DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭",
            IT: "🇮🇹", PT: "🇵🇹", BR: "🇧🇷", RU: "🇷🇺", SE: "🇸🇪", ID: "🇮🇩", GB: "🇬🇧",
            US: "🇺🇸", CA: "🇨🇦", AU: "🇦🇺", NZ: "🇳🇿", PH: "🇵🇭", JP: "🇯🇵", KR: "🇰🇷", CN: "🇨🇳",
            // Add more as needed
        };
        return flagEmojis[cc] || '🏳️'; // Default to white flag
    };

    const saveToLocalStorage = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("polyglotHelpers.saveToLocalStorage: Error saving key:", key, e);
        }
    };

    const loadFromLocalStorage = (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("polyglotHelpers.loadFromLocalStorage: Error loading key:", key, e);
            return null;
        }
    };

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const simulateTypingDelay = (baseDelayMs = 1500, messageLength = 0) => {
        const lengthFactor = Math.min(Math.floor(messageLength / 15) * 100, 1500); // Max 1.5s for length
        const randomFactor = (Math.random() - 0.5) * 400; // +/- 200ms
        return Math.max(400, baseDelayMs + lengthFactor + randomFactor); // Minimum 400ms
    };

    const sanitizeTextForDisplay = (text) => {
        if (typeof text !== 'string') {
            // console.warn("sanitizeTextForDisplay: Input was not a string, returning empty string. Input:", text);
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return function(...args) {
            const context = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    };

    // Regex to match a wide range of emojis. This is a common, fairly comprehensive one.
    // It covers many Unicode blocks for emojis.
    const emojiRegex = /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}])\u{FE0F}?/gu;

    const stripEmojis = (text) => {
        if (typeof text !== 'string') return '';
        return text.replace(emojiRegex, '').replace(/\s+/g, ' ').trim(); // Remove emojis and clean up resulting multiple spaces
    };

    const speakText = (text, lang = 'en-US', voiceName = null) => {
        const textWithoutEmojis = stripEmojis(text); // STRIP EMOJIS HERE

        // console.log(`POLYGLOT_HELPER_SPEAKTEXT (No Emojis): Text: "${textWithoutEmojis.substring(0, 30)}...", Lang: ${lang}, VoiceName: ${voiceName}`);

        if (!textWithoutEmojis.trim() || !window.speechSynthesis) { // Check non-empty trimmed text
            // console.warn("speakText: No text to speak after stripping emojis, or speech synthesis not available.");
            return;
        }

        window.speechSynthesis.cancel(); // Cancel any ongoing speech from this app
        const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);
        utterance.lang = lang;

        // Voice selection logic
        const voices = window.speechSynthesis.getVoices(); // Get voices each time, as list can update
        if (voices.length === 0) {
            console.warn("speakText: No voices available in window.speechSynthesis.getVoices(). Speech might use system default.");
            // Fallback to system default if no voices listed yet (can happen on some browsers initially)
        }

        let chosenVoice = null;
        if (voiceName) {
            chosenVoice = voices.find(voice => voice.name === voiceName && (voice.lang === lang || voice.lang.startsWith(lang.substring(0,2))));
            if (!chosenVoice) {
                // console.warn(`speakText: Voice name "${voiceName}" for lang "${lang}" not found. Trying lang match.`);
            }
        }

        if (!chosenVoice) { // If specific voiceName not found or not provided, try to find best match for lang
            chosenVoice = voices.find(voice => voice.lang === lang); // Exact lang match
            if (!chosenVoice) {
                chosenVoice = voices.find(voice => voice.lang.startsWith(lang.substring(0, 2))); // Base lang match (e.g., "en" for "en-US")
            }
        }

        if (chosenVoice) {
            utterance.voice = chosenVoice;
            // console.log(`speakText: Using voice: ${chosenVoice.name} for lang: ${lang}`);
        } else {
            // console.warn(`speakText: No suitable voice found for lang "${lang}" or name "${voiceName}". Using browser default for the utterance lang.`);
        }

        window.speechSynthesis.speak(utterance);
    };

    const formatRelativeTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const date = new Date(timestamp);
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

        if (isNaN(diffSeconds)) {
            // console.warn("formatRelativeTimestamp: Invalid timestamp provided.", timestamp);
            return '';
        }

        const diffMinutes = Math.round(diffSeconds / 60);
        const diffHours = Math.round(diffMinutes / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffSeconds < 5) return 'just now';
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}`;
        }
    };

    // Ensure voices are loaded for reliable voice selection, especially on some browsers.
    // This is a common pattern, though onvoiceschanged isn't universally fired or needed.
    if (window.speechSynthesis) {
        if (window.speechSynthesis.getVoices().length === 0) { // If voices not immediately available
            window.speechSynthesis.onvoiceschanged = () => {
                // console.log("polyglotHelpers: Speech synthesis voices loaded/changed via onvoiceschanged.");
                // You could potentially re-trigger something here if needed, but usually getVoices() inside speakText is sufficient.
            };
        }
    }


    console.log("utils/helpers.js loaded with emoji stripping in speakText.");
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
        stripEmojis, // Exporting stripEmojis in case it's needed elsewhere directly
        speakText,
        formatRelativeTimestamp
    };
})();