// js/config/api_keys.js

window.GEMINI_API_KEY = 'AIzaSyDfJspAjl93a5PnPENic7AG8yRT9vwRjh4'; // Your 1st Google AI Studio Key
window.GEMINI_API_KEY_ALT = 'AIzaSyDVO5kq1eyZGVOsEV5tl9JwwkOVORvA1YI'; // Your 2nd Google AI Studio Key
window.GROQ_API_KEY = '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'; // Your Groq API Key
window.TOGETHER_API_KEY = '3d69b9e446c2f59e6682d288386a7990318e5e3048726620b553c54e1e91fa76'; // Your Together AI Key

// Placeholder checks (good for reminding yourself or collaborators)
if (window.GEMINI_API_KEY === 'YOUR_ACTUAL_GEMINI_API_KEY_HERE' || !window.GEMINI_API_KEY) {
    console.warn('config/api_keys.js: GEMINI_API_KEY is a placeholder or missing.');
} else {
    console.log('config/api_keys.js: GEMINI_API_KEY is set.');
}
if (window.GEMINI_API_KEY_ALT === 'YOUR_SECOND_GEMINI_KEY_PLACEHOLDER' || !window.GEMINI_API_KEY_ALT) {
    console.warn('config/api_keys.js: GEMINI_API_KEY_ALT is a placeholder or missing.');
} else {
    console.log('config/api_keys.js: GEMINI_API_KEY_ALT is set.');
}
if (window.GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE' || !window.GROQ_API_KEY) {
    console.warn('config/api_keys.js: GROQ_API_KEY is a placeholder or missing.');
} else {
    console.log('config/api_keys.js: GROQ_API_KEY is set.');
}
if (window.TOGETHER_API_KEY === 'YOUR_TOGETHER_API_KEY_HERE' || !window.TOGETHER_API_KEY) {
    console.warn('config/api_keys.js: TOGETHER_API_KEY is a placeholder or missing.');
} else {
    console.log('config/api_keys.js: TOGETHER_API_KEY is set.');
}

