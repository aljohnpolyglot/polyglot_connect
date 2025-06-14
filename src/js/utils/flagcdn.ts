// D:\polyglot_connect\src\js\utils\flagcdn.ts

// No specific type imports needed from global.d.ts for this module's internal logic,
// but FlagLoader interface in global.d.ts should match the exported object.

console.log('utils/flagcdn.ts: Module loading...');

const imageCache = new Map<string, 'loaded' | 'error' | 'loading'>();
// Path relative to where index.html is served, assuming images/flags/ is in public/
const effectiveBaseUrl = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
const safeBaseUrl = effectiveBaseUrl.endsWith('/') ? effectiveBaseUrl : effectiveBaseUrl + '/';
const FALLBACK_FLAG_URL = `${safeBaseUrl}images/flags/unknown.png`;

const getFlagUrl = (countryCode: string | null | undefined, _width?: string | number | null): string => {
    // _width parameter is kept for signature compatibility with FlagLoader interface,
    // but this specific implementation doesn't use it for flagcdn.com SVG URLs.
    if (!countryCode || typeof countryCode !== 'string') {
        return FALLBACK_FLAG_URL;
    }
    const sanitizedCode = countryCode.toLowerCase().trim();
    if (sanitizedCode.length !== 2) {
        return FALLBACK_FLAG_URL;
    }
    return `https://flagcdn.com/${sanitizedCode}.svg`;
};

const preloadFlag = (countryCode: string): void => {
    const url = getFlagUrl(countryCode, null); // Pass null for width as it's not used by this getFlagUrl
    if (url === FALLBACK_FLAG_URL || imageCache.has(url)) {
        return; // Don't preload fallback or if already attempted/loaded
    }

    imageCache.set(url, 'loading');
    const img = new Image();
    img.onload = () => {
        imageCache.set(url, 'loaded');
        // console.log(`Flag preloaded: ${countryCode} from ${url}`);
    };
    img.onerror = () => {
        imageCache.set(url, 'error');
        // console.warn(`Failed to preload flag for ${countryCode} from ${url}.`);
    };
    img.src = url;
};

const testFlag = async (countryCode: string): Promise<boolean> => {
    const url = getFlagUrl(countryCode, null); // Pass null for width
    if (url === FALLBACK_FLAG_URL) {
        return false;
    }
    try {
        const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
        return response.ok;
    } catch (e) {
        // console.warn(`flagLoader.testFlag: Network error or CORS issue for ${countryCode} at ${url}:`, e);
        return false;
    }
};

const flagLoaderModuleInstance = {
    getFlagUrl,
    preloadFlag,
    testFlag
};

// Assign the instance to the window object
(window as any).flagLoader = flagLoaderModuleInstance;

// Verify and dispatch ready event
if (window.flagLoader && typeof window.flagLoader.getFlagUrl === 'function') {
    console.log("utils/flagcdn.ts: SUCCESSFULLY assigned to window.flagLoader and key method verified.");
    document.dispatchEvent(new CustomEvent('flagLoaderReady'));
    console.log("utils/flagcdn.ts: 'flagLoaderReady' event dispatched.");
} else {
    console.error("utils/flagcdn.ts: CRITICAL ERROR - window.flagLoader IS UNDEFINED or not correctly formed.");
}

console.log('utils/flagcdn.ts: Module script execution finished. window.flagLoader should be set.');