// src/js/services/openai_compatible_api_caller.ts
import type { AIApiConstants } from '../types/global.d.ts';
const GROQ_NICKNAMES = [
    'CURRY', 'KOBE', 'JORDAN', 'LEBRON', 'AI', 
    'SHAQ', 'LUKA', 'DUNCAN', 'GIANNIS', 'WEMBY'
];

const TOGETHER_NICKNAMES = [
    'FRANZ', 'NASH', 'KAREEM', 'DURANT', 'PIPPEN', 'SPIDA', 
    'HARDEN', 'DAME', 'PARKER', 'TRAE', 'HAKEEM'
];




console.log("openai_compatible_api_caller.ts: Script execution STARTED (TS Version).");

// Define expected message structure for OpenAI-compatible APIs
interface OpenAIMessage {
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: "low" | "high" | "auto" }; }>;
    // Add name or tool_calls if needed by your models/usage
}

interface OpenAICallOptions {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    response_format?: { type?: "text" | "json_object" };
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    _nickname?: string; // <<< THIS IS THE FIX
}

// Define the function signature that will be on window
export type OpenaiCompatibleApiCallerFn = (
    messages: OpenAIMessage[],
    modelIdentifier: string,
    provider: string, // e.g., 'groq', 'together'
    apiKey: string,
    options?: OpenAICallOptions
) => Promise<string | ReadableStream | null>; // Can return string for text, ReadableStream if stream=true, or null for errors


// --- Start of IIFE ---
(() => {
    'use strict';

    const aiConstants = window.aiApiConstants as AIApiConstants | undefined;

    if (!aiConstants?.PROVIDERS) {
        console.error("OpenAI Compatible Caller (TS): CRITICAL - aiApiConstants or PROVIDERS not found. Caller will be non-functional.");
        (window as any)._openaiCompatibleApiCaller = async (): Promise<null> => {
            const errorMsg = `_openaiCompatibleApiCaller (TS) dummy: aiApiConstants missing.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        };
        document.dispatchEvent(new CustomEvent('openaiCompatibleApiCallerReady'));
        console.warn("openai_compatible_api_caller.ts: 'openaiCompatibleApiCallerReady' dispatched (INITIALIZATION FAILED - aiApiConstants missing).");
        return;
    }
    console.log("OpenAI Compatible Caller (TS): aiApiConstants found.");

    const { PROVIDERS } = aiConstants;
// <<< START: ADD THIS HELPER FUNCTION >>>
async function callWithRetry<T>(
    apiCallFn: () => Promise<T>,
    maxRetries: number = 2,
    initialDelayMs: number = 1000
): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await apiCallFn();
        } catch (error: any) {
            lastError = error;
            // Only retry on rate limits (429) or server errors (5xx)
            if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
                if (i === maxRetries) {
                    console.error(`API call failed after ${maxRetries} retries.`, lastError);
                    break; // Exit loop and throw the last error
                }
                // Exponential backoff with jitter
                const delay = Math.min(initialDelayMs * Math.pow(2, i), 6000) + Math.random() * 500;
                const provider = error.provider || 'API';
                console.warn(`${provider} call failed with status ${error.status}. Retrying in ${delay.toFixed(0)}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Don't retry on other client errors (400, 401, 404, etc.) as they won't succeed.
                console.error(`API call failed with non-retriable status ${error.status}. Not retrying.`, error);
                throw error;
            }
        }
    }
    throw lastError; // Throw the last captured error after all retries fail
}
  // <<< REPLACE THE ENTIRE FUNCTION ASSIGNMENT BLOCK WITH THIS >>>
  (window as any).openaiCompatibleApiCaller = async function callOpenAICompatibleAPI(
    messages: OpenAIMessage[],
    modelIdentifier: string,
    provider: string,
    apiKey: string,
    options: OpenAICallOptions = {},
    abortSignal?: AbortSignal // <<< ADD THIS
): Promise<string | ReadableStream | null> {
    const functionName = "[OpenAI_Compatible_Caller]";
    console.log(`${functionName}: Called for provider [${provider}] with model [${modelIdentifier}]`); // <<< ADD THIS LINE
  // --- 1. Input Validation ---
if (!provider || !PROVIDERS[provider.toUpperCase() as keyof typeof PROVIDERS]) {
    throw new Error(`${functionName}: Invalid or unsupported provider specified: '${provider}'`);
}

// --- NEW: Conditional API Key Validation ---
// Only validate the API key if the provider is NOT Groq, since Groq is proxied.
if (provider !== PROVIDERS.GROQ) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || apiKey.includes('YOUR_')) {
        throw new Error(`${functionName}: Invalid API key for provider '${provider}'`);
    }
}
// --- END NEW VALIDATION ---

if (!modelIdentifier || typeof modelIdentifier !== 'string' || modelIdentifier.trim() === '') {
    throw new Error(`${functionName}: Invalid modelIdentifier for provider '${provider}'`);
}
if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error(`${functionName}: Messages must be a non-empty array for provider '${provider}'`);
}

    // --- 2. Determine Fetch URL and Headers based on Provider ---
    let fetchUrl: string;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (provider === PROVIDERS.GROQ) {
        fetchUrl = 'https://square-bush-5dbc.mogatas-princealjohn-05082003.workers.dev/'; // Your secure bodyguard worker
        headers['X-Target-Endpoint'] = 'chat/completions'; // Header for the bodyguard
    } else if (provider === PROVIDERS.OPENROUTER) {
        fetchUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        // Optional but recommended for OpenRouter stats
        headers['HTTP-Referer'] = `https://your-app-url.com`;
        headers['X-Title'] = `Polyglot Connect`;
    } else if (provider === PROVIDERS.TOGETHER) {
        fetchUrl = 'https://api.together.xyz/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
        throw new Error(`${functionName}: Provider '${provider}' is recognized but has no fetch configuration.`);
    }

    // --- 3. Construct Request Body ---
    const requestBody: any = {
        model: modelIdentifier,
        messages: messages,
        temperature: options.temperature !== undefined ? parseFloat(String(options.temperature)) : 0.7,
        max_tokens: options.max_tokens !== undefined ? parseInt(String(options.max_tokens), 10) : 2048,
    };
    if (options.stream) requestBody.stream = true;
    if (options.response_format) requestBody.response_format = options.response_format;
    if (options.top_p !== undefined) requestBody.top_p = parseFloat(String(options.top_p));

    // --- 4. Execute API Call with Retry Logic ---
    // --- 4. Execute API Call with Retry Logic ---
    const healthTracker = (window as any).apiKeyHealthTracker;
    let playerNickname: string | null = null; // Declare here to be accessible in catch block

    try {
        const apiFetchFn = async () => {
            console.log(`${functionName}: Preparing to fetch from URL: ${fetchUrl}`);

            // Determine nickname
            if (provider === 'groq') {
                playerNickname = options._nickname || GROQ_NICKNAMES[Math.floor(Math.random() * GROQ_NICKNAMES.length)];
                console.log(`%cGroq drafting player: ${playerNickname}...`, 'color: #00D09B; font-weight: bold;');
            } else if (provider === 'together') {
                playerNickname = options._nickname || TOGETHER_NICKNAMES[Math.floor(Math.random() * TOGETHER_NICKNAMES.length)];
                console.log(`%cTogether AI drafting player: ${playerNickname}!`, 'color: #9c27b0; font-weight: bold;');
            } else {
                 playerNickname = 'OpenRouter'; // For OpenRouter
            }
          
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: abortSignal
            });

            if (response.ok) {
                if (playerNickname) {
                    console.log(`%c...with the assist from [${provider.toUpperCase()}] player: ${playerNickname}!`, 'color: #28a745; font-weight: bold;');
                }
            } else {
                if (playerNickname) {
                    console.log(`%c[${provider.toUpperCase()}] player ${playerNickname} was blocked!`, 'color: #dc3545;');
                }
                let errorResponseMessage = `Request to ${provider} API (${modelIdentifier}) failed: ${response.status} ${response.statusText}.`;
                try {
                    const errorData = await response.json();
                    errorResponseMessage = `Status ${response.status}: ${errorData.error?.message || JSON.stringify(errorData)}`;
                } catch (e) { /* ignore JSON parsing error */ }
                
                const apiError = new Error(errorResponseMessage) as any;
                apiError.status = response.status;
                apiError.provider = provider;
                throw apiError;
            }
            return response;
        };

        const successfulResponse = await callWithRetry(apiFetchFn);
        
        if (playerNickname) {
            healthTracker?.reportStatus(playerNickname, provider.charAt(0).toUpperCase() + provider.slice(1), 'success');
        }

        // --- 5. Process Successful Response ---
        if (options.stream && successfulResponse.body) {
            return successfulResponse.body;
        }

        const responseData = await successfulResponse.json();
        const choice = responseData.choices?.[0];

        if (choice?.message?.content !== undefined) {
            return choice.message.content as string;
        } else {
            throw new Error(`Invalid response from ${provider}.`);
        }

    } catch (error: any) {
        if (playerNickname) {
            const providerName = provider.charAt(0).toUpperCase() + provider.slice(1) as any;
            healthTracker?.reportStatus(playerNickname, providerName, 'failure', error.message);
        }
        const keyPreview = apiKey?.slice(-4) || 'N/A';
        console.error(`${functionName} Error (Provider: ${provider}, Model: ${modelIdentifier}, Key ...${keyPreview}): ${error.message}`, error);
        throw error;
    }
};
 console.log("openai_compatible_api_caller.ts: Loaded and openaiCompatibleApiCaller assigned to window.");
    document.dispatchEvent(new CustomEvent('openaiCompatibleApiCallerReady'));
    console.log("openai_compatible_api_caller.ts: 'openaiCompatibleApiCallerReady' event dispatched.");

})(); // End of IIFE

console.log("openai_compatible_api_caller.ts: Script execution FINISHED (TS Version).");