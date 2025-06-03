// js/services/openai_compatible_api_caller.js
(function() {
    'use strict';

    // Ensure _aiApiConstants is loaded, otherwise log an error and define a no-op caller
    if (!window._aiApiConstants) {
        console.error("CRITICAL: _aiApiConstants not found for openai_compatible_api_caller.js. Provider names and other constants will be undefined. Calls will likely fail validation or behave unexpectedly.");
        window._openaiCompatibleApiCaller = async (messages, modelIdentifier, provider, apiKey, options) => {
            const errorMsg = `_openaiCompatibleApiCaller cannot operate: _aiApiConstants was not loaded. Attempted call for provider ${provider}, model ${modelIdentifier}.`;
            console.error(errorMsg, "Messages:", messages, "Options:", options);
            throw new Error(errorMsg);
        };
        return; // Stop further execution of this IIFE
    }
    
    const { PROVIDERS } = window._aiApiConstants; // Destructure after ensuring it exists

    window._openaiCompatibleApiCaller = async function callOpenAICompatibleAPI(
        messages,
        modelIdentifier,
        provider, // 'groq' or 'together'
        apiKey,   // Specific API key for the provider
        options = {} // { temperature, max_tokens, stream, response_format, top_p, etc. }
    ) {
        // --- Robust Input Validation ---
        if (!provider || (provider !== PROVIDERS.GROQ && provider !== PROVIDERS.TOGETHER)) {
            const errorMsg = `_openaiCompatibleApiCaller: Invalid provider: '${provider}'. Must be '${PROVIDERS.GROQ}' or '${PROVIDERS.TOGETHER}'.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || apiKey.includes('YOUR_') || (provider === PROVIDERS.GROQ && apiKey.includes('gsk_YOUR_'))) {
            const keyPreview = apiKey ? `${apiKey.substring(0, provider === PROVIDERS.GROQ ? 4 : 5)}...${apiKey.slice(-4)}` : 'undefined/empty';
            const errorMsg = `_openaiCompatibleApiCaller: Invalid or missing API key for ${provider}. Key preview: ${keyPreview}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        if (!modelIdentifier || typeof modelIdentifier !== 'string' || modelIdentifier.trim() === '') {
            const errorMsg = `_openaiCompatibleApiCaller: Invalid or missing modelIdentifier for ${provider}. Model: '${modelIdentifier}'`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        if (!Array.isArray(messages) || messages.length === 0) {
            const errorMsg = `_openaiCompatibleApiCaller: Messages must be a non-empty array for ${provider}. Received: ${JSON.stringify(messages)}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        messages.forEach((msg, index) => {
            let contentIsValid = typeof msg.content === 'string' || 
                                 (Array.isArray(msg.content) && msg.content.every(part => part && typeof part.type === 'string'));
            if (!msg || typeof msg.role !== 'string' || !contentIsValid) {
                const errorMsg = `_openaiCompatibleApiCaller: Invalid message structure at index ${index} for ${provider}. Message: ${JSON.stringify(msg)}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        });
        // --- End Validation ---

        const baseUrl = provider === PROVIDERS.GROQ
            ? "https://api.groq.com/openai/v1"
            : "https://api.together.xyz/v1"; // Confirm this base URL for TogetherAI

        const requestBody = {
            model: modelIdentifier,
            messages: messages,
            temperature: options.temperature !== undefined ? parseFloat(options.temperature) : 0.7,
            max_tokens: options.max_tokens !== undefined ? parseInt(options.max_tokens, 10) : 2048,
        };

        // Conditionally add optional parameters to avoid sending them if not specified (some APIs are strict)
        if (options.stream) requestBody.stream = true;
        if (options.response_format) requestBody.response_format = options.response_format; // e.g., { "type": "json_object" }
        if (options.top_p !== undefined) requestBody.top_p = parseFloat(options.top_p);
        if (options.frequency_penalty !== undefined) requestBody.frequency_penalty = parseFloat(options.frequency_penalty);
        if (options.presence_penalty !== undefined) requestBody.presence_penalty = parseFloat(options.presence_penalty);
        
        // console.debug(`Calling ${provider} (${modelIdentifier}): ${baseUrl}/chat/completions with payload:`, JSON.stringify(requestBody).substring(0, 350) + "...");

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorResponseMessage = `Request to ${provider} API (${modelIdentifier}) failed with status ${response.status}.`;
                let errorDetailsObject = { // Initialize with a default structure
                    message: errorResponseMessage,
                    type: 'api_error',
                    param: null,
                    code: String(response.status) 
                };
                try {
                    const errorData = await response.json(); // Try to parse structured error response
                    errorDetailsObject = errorData.error || errorData; // Use the 'error' sub-object if present
                    errorResponseMessage = errorDetailsObject.message || JSON.stringify(errorDetailsObject);
                } catch (e) {
                    // If error response is not JSON, try to get text
                    try {
                        const textResponse = await response.text();
                        errorResponseMessage += ` Raw Response: ${textResponse.substring(0, 200)}`;
                        errorDetailsObject.rawResponse = textResponse.substring(0, 500); // Add raw part for debugging
                    } catch (textErr) { /* ignore if can't read text either */ }
                }
                console.error(`Error from ${provider} API (${modelIdentifier} - Status: ${response.status}):`, errorResponseMessage, errorDetailsObject);
                
                const apiError = new Error(`Error from ${provider} (${modelIdentifier}): ${response.status} - ${errorResponseMessage}`);
                apiError.status = response.status;
                apiError.providerDetails = errorDetailsObject;
                // Check for common API key related HTTP status codes
                apiError.isApiKeyError = (response.status === 401 || response.status === 403 || 
                                         (response.status === 400 && errorResponseMessage.toLowerCase().includes('api key')));
                throw apiError;
            }

            if (options.stream) {
                console.warn(`Streaming response requested from ${provider}. Full client-side stream handling is the responsibility of the caller for this raw ReadableStream body.`);
                return response.body;
            }

            const responseData = await response.json();
            const choice = responseData.choices?.[0];

            if (choice?.message?.content !== undefined) {
                return choice.message.content;
            } else if (choice?.delta?.content !== undefined) { // For some non-streamed single responses that use delta (less common but good to check)
                return choice.delta.content;
            } else {
                console.error(`Invalid or unexpected response structure from ${provider} (${modelIdentifier}). No content found in choices. Response:`, responseData);
                throw new Error(`Invalid response structure from ${provider} (${modelIdentifier}). No content found.`);
            }

        } catch (error) { // Catches fetch network errors and errors deliberately thrown from !response.ok block
            const keyPreview = apiKey.slice(-4);
            console.error(`_openaiCompatibleApiCaller Error (Provider: ${provider}, Model: ${modelIdentifier}, Key ...${keyPreview}):`, error.message);
            if (!(error instanceof Error)) { // Ensure a proper Error object is thrown
                 const newError = new Error(String(error.message || error));
                 if(error.status) newError.status = error.status;
                 if(error.providerDetails) newError.providerDetails = error.providerDetails;
                 if(error.isApiKeyError !== undefined) newError.isApiKeyError = error.isApiKeyError;
                 throw newError;
            }
            throw error; // Re-throw to allow facade/service layer to handle (e.g., for fallback)
        }
    };
    console.log("services/openai_compatible_api_caller.js loaded with comprehensive validation, error handling, and conditional parameter inclusion.");
})();