// js/utils/flagcdn.js
// Utility for handling FlagCDN URLs and fallbacks.

window.flagLoader = (() => {
    const imageCache = new Map(); // Simple cache for preloaded images/status
    const FALLBACK_FLAG_URL = 'images/flags/unknown.png'; // Ensure this path is correct

    // Primary method to get SVG flag URL
    const getFlagUrl = (countryCode) => {
        if (!countryCode || typeof countryCode !== 'string') {
            // console.warn('flagLoader.getFlagUrl: Invalid countryCode (must be string):', countryCode);
            return FALLBACK_FLAG_URL;
        }
        const sanitizedCode = countryCode.toLowerCase().trim();
        if (sanitizedCode.length !== 2) {
            // console.warn('flagLoader.getFlagUrl: countryCode not 2 characters:', sanitizedCode, 'Using fallback.');
            return FALLBACK_FLAG_URL;
        }
        // Always return the SVG URL from FlagCDN
        return `https://flagcdn.com/${sanitizedCode}.svg`;
    };

    // Preload flag (useful if you want to ensure flags are cached by browser)
    const preloadFlag = (countryCode) => {
        const url = getFlagUrl(countryCode);
        if (url === FALLBACK_FLAG_URL) return; // Don't try to preload fallback

        if (!imageCache.has(url)) {
            const img = new Image();
            img.onload = () => {
                imageCache.set(url, 'loaded'); // Mark as loaded
                // console.log(`Flag preloaded: ${countryCode}`);
            };
            img.onerror = () => {
                // console.warn(`Failed to preload flag for ${countryCode} from ${url}.`);
                imageCache.set(url, 'error'); // Mark as error
            };
            img.src = url;
        }
    };

    // Test if a flag SVG exists (useful for debugging or conditional display)
    const testFlag = async (countryCode) => {
        const url = getFlagUrl(countryCode);
        if (url === FALLBACK_FLAG_URL) return false; // Fallback means original doesn't exist or invalid code
        try {
            // Fetching HEAD is lighter than GET if only existence check is needed
            const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
            return response.ok; // HTTP 200-299 means it exists
        } catch (e) {
            // console.warn(`flagLoader.testFlag: Network error or CORS issue for ${countryCode} at ${url}:`, e);
            return false; // Network errors or CORS issues mean we can't confirm
        }
    };

    console.log('utils/flagcdn.js (flagLoader) initialized.');

    return {
        getFlagUrl,
        preloadFlag,
        testFlag
        // getFlagEmoji is now in polyglotHelpers to avoid circular dependencies if helpers need flags.
    };
})();