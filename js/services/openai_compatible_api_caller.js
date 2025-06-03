// js/services/openai_compatible_api_caller.js
(function() {
    'use strict';

    window._openaiCompatibleApiCaller = async function callOpenAICompatibleAPI(
        messages, 
        modelIdentifier, 
        provider,
        apiKey, // Now required parameter
        options = {}
    ) {
        if (!apiKey || apiKey.includes('YOUR_') || apiKey.includes('gsk_YOUR_')) {
            throw new Error(`Invalid API key provided for ${provider}`);
        }

        const baseUrl = provider === 'groq' 
            ? "https://api.groq.com/openai/v1"
            : "https://api.together.xyz/v1";

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelIdentifier,
                    messages: messages,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.max_tokens || 1024,
                    stream: options.stream || false
                })
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { 
                        message: `Request to ${provider} failed with status ${response.status}. Response not JSON.`,
                        responseText: await response.text() 
                    };
                }
                const errorDetails = errorData.error || errorData;
                console.error(`Error from ${provider} (${modelIdentifier} - ${response.status}):`, errorDetails);
                throw new Error(errorDetails.message || `Error from ${provider}: ${response.status}`);
            }

            if (options.stream) {
                console.warn("Streaming not yet implemented in this setup.");
                return response.body;
            }

            const responseData = await response.json();

            // Parse response
            if (responseData.choices?.[0]?.message?.content !== undefined) {
                return responseData.choices[0].message.content;
            } else if (responseData.choices?.[0]?.delta?.content !== undefined) {
                return responseData.choices[0].delta.content;
            } else {
                console.error(`Invalid response structure from ${provider}:`, responseData);
                throw new Error(`Invalid response structure from ${provider}`);
            }

        } catch (error) {
            console.error(`Error in openai_compatible_api_caller (${provider}):`, error.message);
            throw error;
        }
    };

    console.log("services/openai_compatible_api_caller.js loaded (explicit key passing).");
})();