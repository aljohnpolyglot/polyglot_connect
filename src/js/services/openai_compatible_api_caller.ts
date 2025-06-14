// src/js/services/openai_compatible_api_caller.ts
import type { AIApiConstants } from '../types/global.d.ts';

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
    response_format?: { type?: "text" | "json_object" }; // OpenAI specific
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
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
  (window as any).openaiCompatibleApiCaller = async function callOpenAICompatibleAPI(
        messages: OpenAIMessage[],
        modelIdentifier: string,
        provider: string,
        apiKey: string,
        options: OpenAICallOptions = {}
    ): Promise<string | ReadableStream | null> { // Return type based on potential stream
        
        // --- Input Validation ---
        if (!provider || (provider !== PROVIDERS.GROQ && provider !== PROVIDERS.TOGETHER)) { /* ... error ... */ throw new Error(`Invalid provider: ${provider}`); }
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || apiKey.includes('YOUR_') || (provider === PROVIDERS.GROQ && apiKey.includes('gsk_YOUR_'))) { /* ... error ... */ throw new Error(`Invalid API key for ${provider}`); }
        if (!modelIdentifier || typeof modelIdentifier !== 'string' || modelIdentifier.trim() === '') { /* ... error ... */ throw new Error(`Invalid modelIdentifier for ${provider}`); }
        if (!Array.isArray(messages) || messages.length === 0) { /* ... error ... */ throw new Error(`Messages must be a non-empty array for ${provider}`); }
        // Add more detailed message structure validation if needed
        // --- End Validation ---

        const baseUrl = provider === PROVIDERS.GROQ
            ? "https://api.groq.com/openai/v1"
            : "https://api.together.xyz/v1"; 

        const requestBody: any = { // Use 'any' for flexibility with optional params
            model: modelIdentifier,
            messages: messages,
            temperature: options.temperature !== undefined ? parseFloat(String(options.temperature)) : 0.7,
            max_tokens: options.max_tokens !== undefined ? parseInt(String(options.max_tokens), 10) : 2048,
        };

        if (options.stream) requestBody.stream = true;
        if (options.response_format) requestBody.response_format = options.response_format;
        if (options.top_p !== undefined) requestBody.top_p = parseFloat(String(options.top_p));
        if (options.frequency_penalty !== undefined) requestBody.frequency_penalty = parseFloat(String(options.frequency_penalty));
        if (options.presence_penalty !== undefined) requestBody.presence_penalty = parseFloat(String(options.presence_penalty));
        
        try {
            // Define the specific fetch call as a function to pass to the retry helper
            const apiFetchFn = async () => {
                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
        
                if (!response.ok) {
                    let errorResponseMessage = `Request to ${provider} API (${modelIdentifier}) failed: ${response.status} ${response.statusText}.`;
                    let errorDetailsObject: any = { message: errorResponseMessage, code: String(response.status) };
                    try {
                        const errorData = await response.json();
                        errorDetailsObject = errorData.error || errorData;
                        errorResponseMessage = errorDetailsObject.message || JSON.stringify(errorDetailsObject);
                    } catch (e) { /* ignore */ }
                    
                    const apiError = new Error(`Error from ${provider} (${modelIdentifier}): ${response.status} - ${errorResponseMessage}`) as any;
                    apiError.status = response.status;
                    apiError.providerDetails = errorDetailsObject;
                    apiError.provider = provider; // Add provider for the retry logic
                    throw apiError;
                }
                return response; // Return the successful response
            };
        
            // Execute the fetch using the retry wrapper
            const successfulResponse = await callWithRetry(apiFetchFn);
        
            // Process the successful response
            if (options.stream && successfulResponse.body) {
                return successfulResponse.body;
            }
        
            const responseData = await successfulResponse.json();
            const choice = responseData.choices?.[0];
        
            if (choice?.message?.content !== undefined) {
                return choice.message.content as string;
            } else {
                console.error(`OpenAI Compatible Caller (TS): Invalid response structure from ${provider}. No content.`, responseData);
                throw new Error(`Invalid response from ${provider}.`);
            }
        
        } catch (error: any) {
            const keyPreview = apiKey?.slice(-4) || 'N/A';
            let errorLogMessage = `OpenAI Compatible Caller (TS) Error (Provider: ${provider}, Model: ${modelIdentifier}, Key ...${keyPreview}): ${error.message}`;
            console.error(errorLogMessage, error);
        
            const enrichedError = new Error(error.message || "Unknown error in OpenAI compatible caller") as any;
            enrichedError.status = error.status || 500;
            enrichedError.providerDetails = error.providerDetails || { message: "Details unavailable from caller" };
            enrichedError.provider = provider;
            enrichedError.model = modelIdentifier;
            throw enrichedError;
        }
    };
 console.log("openai_compatible_api_caller.ts: Loaded and openaiCompatibleApiCaller assigned to window.");
    document.dispatchEvent(new CustomEvent('openaiCompatibleApiCallerReady'));
    console.log("openai_compatible_api_caller.ts: 'openaiCompatibleApiCallerReady' event dispatched.");

})(); // End of IIFE

console.log("openai_compatible_api_caller.ts: Script execution FINISHED (TS Version).");