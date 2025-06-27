// D:\polyglot_connect\public\js\utils\helpers.ts

// Use import type for type-only imports. These are erased at transpile time.
import type { Connector, TranscriptTurn, SleepSchedule, FlagLoader } from '../types/global';

console.log("js/utils/helpers.ts: Script execution STARTED (as ES Module).");
interface HelpersModuleInterface {
    isConnectorCurrentlyActive: (connector: Connector | null | undefined) => boolean;
    calculateAge: (birthdateString?: string | null) => number | null;
    getFlagCdnUrl: (countryCode: string, width?: number | null) => string;
    getFlagEmoji: (countryCode: string) => string;
    saveToLocalStorage: (key: string, data: any) => void;
    loadFromLocalStorage: (key:string) => any | null;
    generateUUID: () => string;
    simulateTypingDelay: (baseDelayMs?: number, messageLength?: number) => number;
    sanitizeTextForDisplay: (text: string) => string;
    debounce: <F extends (...args: any[]) => any>(func: F, delay: number) => (...args: Parameters<F>) => void;
    stripEmojis: (text: string) => string;
    speakText: (text: string, lang?: string, voiceName?: string | null) => void;
    formatRelativeTimestamp: (timestamp: string | number | Date) => string;
    formatTranscriptForLLM: (transcriptArray: TranscriptTurn[], personaName?: string, userName?: string) => string;
    normalizeText: (text: string) => string;
    fileToBase64: (file: File) => Promise<string>;
    formatReadableList: (items?: string[], conjunction?: string, defaultText?: string) => string;
    formatStructuredInterestsForPrompt: (interests?: { [key: string]: string[] | string | undefined }) => string;
    formatKeyLifeEventsForPrompt: (events?: Array<{ event: string; description?: string }>) => string;
    formatCountriesVisitedForPrompt: (countries?: Array<{ country: string; highlights?: string }>) => string;
  }

const helpersModuleInstance: HelpersModuleInterface = (() => {
   
   
    'use strict';
    console.log("js/utils/helpers.ts: IIFE STARTING.");

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            // This method creates the full Data URL, e.g., "data:image/png;base64,iVBORw0..."
            reader.readAsDataURL(file);
            
            reader.onload = () => {
                const fullDataUrl = reader.result as string;
                
                // --- THIS IS THE FIX ---
                // The APIs need the raw Base64 data, not the entire Data URL.
                // We find the first comma and take everything AFTER it.
                // This reliably removes the "data:[any-mime-type];base64," prefix.
                const base64Data = fullDataUrl.substring(fullDataUrl.indexOf(',') + 1);
                
                resolve(base64Data);
            };
            
            reader.onerror = error => reject(error);
        });
    };       
    const isConnectorCurrentlyActive = (connector: Partial<Connector> | null | undefined): boolean => {
        if (!connector?.sleepSchedule?.wake || !connector.sleepSchedule.sleep) {
            return true;
        }
        try {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            
            const wakeParts = connector.sleepSchedule.wake.split(':').map(Number);
            const sleepParts = connector.sleepSchedule.sleep.split(':').map(Number);

            if (wakeParts.length < 2 || sleepParts.length < 2) {
                console.warn("isConnectorCurrentlyActive: Invalid sleepSchedule format.", connector.sleepSchedule);
                return true;
            }
            const [wakeHour, wakeMinute] = wakeParts;
            const [sleepHour, sleepMinute] = sleepParts;

            if (isNaN(currentHour) || isNaN(currentMinutes) || isNaN(wakeHour) || isNaN(wakeMinute) || isNaN(sleepHour) || isNaN(sleepMinute)) {
                console.warn("isConnectorCurrentlyActive: Invalid time component found.");
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
        } catch (e: any) {
            console.error("polyglotHelpers.isConnectorCurrentlyActive: Error for connector ID", connector?.id, ":", e.message);
            return true;
        }
    };

    const calculateAge = (birthdateString?: string | null): number | null => {
        if (!birthdateString) return null;
        try {
            const birthDate = new Date(birthdateString);
            if (isNaN(birthDate.getTime())) return null; 

            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDifference = today.getMonth() - birthDate.getMonth();

            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 0 ? age : null;
        } catch (e: any) {
            console.error("polyglotHelpers.calculateAge: Error for birthdateString:", birthdateString, e.message);
            return null;
        }
    };

    const getFlagCdnUrl = (countryCode: string, width: number | null = null): string => {
        const flagLoaderInstance = window.flagLoader as FlagLoader | undefined; 
        if (flagLoaderInstance && typeof flagLoaderInstance.getFlagUrl === 'function') {
            return flagLoaderInstance.getFlagUrl(countryCode, width);
        }
        console.warn("polyglotHelpers.getFlagCdnUrl: window.flagLoader.getFlagUrl not available. Returning fallback.");
        return 'images/flags/unknown.png';
    };
    
    const getFlagEmoji = (countryCode: string): string => {
        if (!countryCode || typeof countryCode !== 'string') return '🏳️'; 
        const cc = countryCode.toUpperCase().trim();
        const flagEmojis: Record<string, string> = {
            // Existing
            FR: "🇫🇷", ES: "🇪🇸", MX: "🇲🇽", AR: "🇦🇷", CO: "🇨🇴", DE: "🇩🇪", AT: "🇦🇹",
            CH: "🇨🇭", IT: "🇮🇹", PT: "🇵🇹", BR: "🇧🇷", RU: "🇷🇺", SE: "🇸🇪", ID: "🇮🇩",
            GB: "🇬🇧", US: "🇺🇸", CA: "🇨🇦", AU: "🇦🇺", NZ: "🇳🇿", PH: "🇵🇭", JP: "🇯🇵",
            KR: "🇰🇷", CN: "🇨🇳",
            // Added & Corrected
            AE: "🇦🇪", // UAE for Arabic
            NO: "🇳🇴", // Norway
            IN: "🇮🇳", // India for Hindi
            PL: "🇵🇱", // Poland
            NL: "🇳🇱", // Netherlands
            TR: "🇹🇷", // Turkey
            VN: "🇻🇳", // Vietnam
            TH: "🇹🇭", // Thailand
            FI: "🇫🇮", // Finland
            GLOBE: "🌐" // Fallback
        };
        return flagEmojis[cc] || '🏳️';
    };

    const saveToLocalStorage = (key: string, data: any): void => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e: any) {
            console.error("polyglotHelpers.saveToLocalStorage: Error saving key:", key, e.message);
        }
    };

    const loadFromLocalStorage = (key: string): any | null => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e: any) {
            console.error("polyglotHelpers.loadFromLocalStorage: Error loading key:", key, e.message);
            return null;
        }
    };

    const generateUUID = (): string => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
            const random = Math.random() * 16 | 0;
            const value = char === 'x' ? random : (random & 0x3 | 0x8);
            return value.toString(16);
        });
    };

    const simulateTypingDelay = (baseDelayMs: number = 1500, messageLength: number = 0): number => {
        const lengthFactor = Math.min(Math.floor(messageLength / 15) * 100, 1500);
        const randomFactor = (Math.random() - 0.5) * 400; 
        return Math.max(400, baseDelayMs + lengthFactor + randomFactor); 
    };

    const sanitizeTextForDisplay = (text: string): string => {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const debounce = <F extends (...args: any[]) => any>(func: F, delay: number): ((...args: Parameters<F>) => void) => {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        return function(this: ThisParameterType<F>, ...args: Parameters<F>) {
            const context = this;
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func.apply(context, args);
            }, delay);
        };
    };

    const emojiRegex: RegExp = /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}])\u{FE0F}?/gu;

    const stripEmojis = (text: string): string => {
        if (typeof text !== 'string') return '';
        return text.replace(emojiRegex, '').replace(/\s+/g, ' ').trim();
    };

    const speakText = (text: string, lang: string = 'en-US', voiceName: string | null = null): void => {
        const textWithoutEmojis = stripEmojis(text);
        if (!textWithoutEmojis.trim() || !window.speechSynthesis) {
            if (!window.speechSynthesis) console.warn("Speech synthesis not supported.");
            return;
        }
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);
        utterance.lang = lang;
        const voices = window.speechSynthesis.getVoices();
        let chosenVoice: SpeechSynthesisVoice | undefined = undefined;
        if (voiceName) {
            chosenVoice = voices.find(voice => voice.name === voiceName && (voice.lang === lang || voice.lang.startsWith(lang.substring(0, 2))));
        }
        if (!chosenVoice) {
            chosenVoice = voices.find(voice => voice.lang === lang) || voices.find(voice => voice.lang.startsWith(lang.substring(0, 2)));
        }
        if (chosenVoice) {
            utterance.voice = chosenVoice;
        }
        window.speechSynthesis.speak(utterance);
    };

    const formatRelativeTimestamp = (timestamp: string | number | Date): string => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return ''; 
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (diffSeconds < 5) return 'just now';
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        const diffMinutes = Math.round(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.round(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}`;
        }
    };
    function normalizeText(text: string): string {
        if (!text) return "";
        return text
            .toLowerCase()
            .normalize("NFD") // Normalize to decompose combined graphemes
            .replace(/[\u0300-\u036f]/g, ""); // Remove diacritical marks
    }
    const formatTranscriptForLLM = (
        transcriptArray: TranscriptTurn[],
        personaName: string = "Partner",
        userName: string = "User"
    ): string => {
        if (!Array.isArray(transcriptArray) || transcriptArray.length === 0) {
            return "No conversation took place or transcript is empty.";
        }
        let formattedText: string = "";
        transcriptArray.forEach((turn) => {
            if (!turn || typeof turn.text !== 'string' || turn.text.trim() === "") {
                return;
            }

            let speakerLabel = userName;
            if (turn.sender === 'connector' || turn.sender === 'model' || turn.sender === 'connector-spoken-output' || turn.sender === 'connector-greeting-intent' || turn.sender === personaName) {
                speakerLabel = personaName;
            } else if (turn.sender === 'user-audio-transcript' || turn.sender === 'user-typed' || turn.sender === 'user' || turn.sender === userName) {
                speakerLabel = userName;
            } else if (turn.sender === 'system-activity' || turn.sender === 'system-message' || turn.sender === 'system-call-event') {
                speakerLabel = "System";
            } else {
                speakerLabel = `Unknown (${turn.sender})`;
            }

            let textContent = turn.text.trim();
            // Basic parenthetical removal
            textContent = textContent.replace(/\((?:En|In)\s+[\w\s]+\)\s*:?/gi, '').trim();
            textContent = textContent.replace(/\s\s+/g, ' '); // Normalize multiple spaces

            // Handle specific image text
             if (turn.type === 'image' && textContent.toLowerCase().startsWith("[user sent an image")) {
                textContent = `[${userName} sent an image]${textContent.substring("[user sent an image]".length)}`;
            } else if (turn.type === 'image' && !textContent.toLowerCase().includes('image') && (speakerLabel === userName || speakerLabel.startsWith(userName))) {
                textContent = `[${userName} sent an image: ${textContent}]`;
            }

            if (textContent) {
                formattedText += `${speakerLabel}: ${textContent}\n`;
            }
        });
        return formattedText.trim();
    };

    if (window.speechSynthesis) {
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {};
        }
    } else {
        console.warn("polyglotHelpers.ts: SpeechSynthesis API not available.");
    }



const formatReadableList = (items?: string[], conjunction: string = "and", defaultText: string = "not specified"): string => {
    if (!items || items.length === 0) return defaultText;
    if (items.length === 1) return items[0];
    const itemsCopy = [...items];
    const last = itemsCopy.pop();
    return itemsCopy.join(', ') + ` ${conjunction} ` + last;
  };

  const formatStructuredInterestsForPrompt = (interests?: { [key: string]: string[] | string | undefined }): string => {
      if (!interests || Object.keys(interests).length === 0) return "various topics which you can elaborate on when relevant";
      let parts: string[] = [];
      for (const key in interests) {
          const value = interests[key];
          if (value) {
              const displayValue = Array.isArray(value) ? value.join('/') : String(value);
              if (displayValue.trim()) parts.push(`${key} (e.g., ${displayValue})`);
          }
      }
      return parts.length > 0 ? `including specific aspects like: ${parts.join('; ')}` : "various topics which you can elaborate on when relevant";
  };

  const formatKeyLifeEventsForPrompt = (events?: Array<{ event: string; description?: string }>): string => {
      if (!events || events.length === 0) return "your general life experiences";
      return `key moments such as '${events.slice(0, 2).map(e => e.event).join("', '")}' (you can share brief, relevant anecdotes from these)`;
  };

  const formatCountriesVisitedForPrompt = (countries?: Array<{ country: string; highlights?: string }>): string => {
      if (!countries || countries.length === 0) return "places you know from your background";
      return `experiences from places you've visited like '${countries.slice(0, 2).map(c => c.country).join("', '")}' (mention a relevant detail if it fits the conversation)`;
  };
 // ----- START OF PASTE -----
 const getPersonaLocalTimeDetails = (timezone: string): { 
    localTime: string; 
    localDate: string; 
    dayOfWeek: string; 
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late night' | 'early morning';
  } => {
      try {
          const now = new Date();
          const options: Intl.DateTimeFormatOptions = { timeZone: timezone };

          const localTime = now.toLocaleTimeString('en-GB', { ...options, hour: '2-digit', minute: '2-digit', hour12: false });
          const localDate = now.toLocaleDateString('en-CA', { ...options }); // YYYY-MM-DD format
          const dayOfWeek = now.toLocaleDateString('en-US', { ...options, weekday: 'long' });

          const hour = parseInt(now.toLocaleTimeString('en-GB', { ...options, hour: '2-digit', hour12: false }).split(':')[0], 10);
          
          let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late night' | 'early morning';
          if (hour >= 5 && hour < 12) {
              timeOfDay = 'morning';
          } else if (hour >= 12 && hour < 17) {
              timeOfDay = 'afternoon';
          } else if (hour >= 17 && hour < 22) {
              timeOfDay = 'evening';
          } else if (hour >= 22 || hour < 1) {
              timeOfDay = 'late night';
          } else { // 1 to 4
              timeOfDay = 'early morning';
          }

          return { localTime, localDate, dayOfWeek, timeOfDay };

      } catch (error) {
          console.error(`[getPersonaLocalTimeDetails] Error processing timezone "${timezone}":`, error);
          // Return a sensible default if the timezone is invalid
          return { 
              localTime: '12:00', 
              localDate: '2024-01-01', 
              dayOfWeek: 'Monday',
              timeOfDay: 'afternoon'
          };
      }
  };

// Add this fun
    console.log("js/utils/helpers.ts: IIFE FINISHED, returning exports.");
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
        formatTranscriptForLLM,
        normalizeText,
        fileToBase64,
        formatReadableList,
        formatStructuredInterestsForPrompt,
        formatKeyLifeEventsForPrompt,
        formatCountriesVisitedForPrompt,
        getPersonaLocalTimeDetails
    };
})();

if (helpersModuleInstance) {
    // 1. Assign the created module to the global window object so other scripts can access it.
    (window as any).polyglotHelpers = helpersModuleInstance;
    console.log('js/utils/helpers.ts: SUCCESS - Assigned module to window.polyglotHelpers.');

    // 2. Dispatch the "ready" event that many other modules are waiting for.
    document.dispatchEvent(new CustomEvent('polyglotHelpersReady'));
    console.log('js/utils/helpers.ts: "polyglotHelpersReady" event dispatched.');

} else {
    console.error('js/utils/helpers.ts: CRITICAL FAILURE - The helpersModuleInstance was not created. The application cannot start.');
}




export const polyglotHelpers = helpersModuleInstance;