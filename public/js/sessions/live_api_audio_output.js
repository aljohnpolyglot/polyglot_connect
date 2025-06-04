// js/sessions/live_api_audio_output.js
// Handles playback of AI-generated audio chunks from the Gemini Live API.
// Includes barge-in support (stopping current sound).

console.log("live_api_audio_output.js: Script execution STARTED (Barge-In Enhanced).");

window.liveApiAudioOutput = (() => {
    'use strict';
    const MODULE_VERSION = "1.1.0 (Barge-In Enhanced)";
    console.log(`live_api_audio_output.js: IIFE (module definition v${MODULE_VERSION}) STARTING.`);

    let audioPlayerContext = null;
    const AI_OUTPUT_SAMPLE_RATE = 24000; // Standard for Gemini Live API audio output
    let aiAudioPlaybackQueue = [];
    let isPlayingAiAudio = false;
    let nextAiAudioPlayTime = 0;
    let currentSourceNode = null; // To store the currently playing AudioBufferSourceNode

    let isGloballyMutedCheckFn = () => false; // Function to check if AI speaker is muted globally

    function initialize(isMutedCheckFunction) {
        console.log("live_api_audio_output.js: initialize() called.");
        if (typeof isMutedCheckFunction !== 'function') {
            console.error("live_api_audio_output.js: Initialization failed - isMutedCheckFunction is not a function.");
            return false;
        }
        isGloballyMutedCheckFn = isMutedCheckFunction;
        resetPlaybackState(); // Reset state for a new call session
        console.log("live_api_audio_output.js: Initialized successfully with mute check function.");
        return true;
    }
    
    function resetPlaybackState() {
        console.log("live_api_audio_output.js: resetPlaybackState() called.");
        stopCurrentSound(); // Stop any currently playing sound first
        aiAudioPlaybackQueue = [];
        isPlayingAiAudio = false;
        nextAiAudioPlayTime = 0;
        
        if (audioPlayerContext && audioPlayerContext.state !== 'closed') {
            console.log("live_api_audio_output.js: Closing existing audioPlayerContext.");
            audioPlayerContext.close().catch(e => console.warn("Error closing audioPlayerContext during reset:", e));
        }
        audioPlayerContext = null; // Ensure it's null so it gets recreated
        console.log("live_api_audio_output.js: Playback state fully reset.");
    }

    function handleReceivedAiAudioChunk(audioChunkArrayBuffer, mimeType) {
        // console.debug("live_api_audio_output.js: handleReceivedAiAudioChunk called. Muted:", isGloballyMutedCheckFn());
        if (isGloballyMutedCheckFn()) {
            // console.debug("live_api_audio_output.js: AI Speaker is muted, chunk ignored.");
            return;
        }
        if (!audioChunkArrayBuffer || audioChunkArrayBuffer.byteLength === 0) {
            // console.debug("live_api_audio_output.js: Received empty AI audio chunk, ignoring.");
            return;
        }
        // console.debug("live_api_audio_output.js: Received AI audio chunk. Size:", audioChunkArrayBuffer.byteLength, "MIME Type:", mimeType);

        try {
            if (!audioPlayerContext || audioPlayerContext.state === 'closed') {
                console.log("live_api_audio_output.js: Creating new AudioContext for AI output (SR:", AI_OUTPUT_SAMPLE_RATE + ").");
                audioPlayerContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: AI_OUTPUT_SAMPLE_RATE });
                nextAiAudioPlayTime = audioPlayerContext.currentTime; // Reset next play time for the new context
            }
            if (audioPlayerContext.state === 'suspended') {
                console.log("live_api_audio_output.js: Resuming suspended audioPlayerContext.");
                audioPlayerContext.resume().catch(e => console.error("Error resuming audioPlayerContext for AI audio:", e));
            }
             if (audioPlayerContext.state === 'closed') { 
                 console.error("live_api_audio_output.js: audioPlayerContext is unexpectedly closed, cannot play AI audio.");
                 return;
            }

            const pcmData = new Int16Array(audioChunkArrayBuffer);
            const float32Pcm = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                float32Pcm[i] = pcmData[i] / 32768.0;
            }

            const audioBuffer = audioPlayerContext.createBuffer(1, float32Pcm.length, AI_OUTPUT_SAMPLE_RATE);
            audioBuffer.copyToChannel(float32Pcm, 0);

            aiAudioPlaybackQueue.push(audioBuffer);
            // console.debug("live_api_audio_output.js: AI audio chunk queued. Queue length:", aiAudioPlaybackQueue.length);
            if (!isPlayingAiAudio) {
                playNextChunkFromQueue();
            }
        } catch (e) { 
            console.error("live_api_audio_output.js: Error processing/queueing AI audio chunk:", e);
        }
    }
    
    function playNextChunkFromQueue() {
        // console.debug("live_api_audio_output.js: playNextChunkFromQueue. Muted:", isGloballyMutedCheckFn(), "Queue:", aiAudioPlaybackQueue.length, "Playing:", isPlayingAiAudio);
        if (isGloballyMutedCheckFn() || aiAudioPlaybackQueue.length === 0 || !audioPlayerContext || audioPlayerContext.state === 'closed') {
            isPlayingAiAudio = false;
            currentSourceNode = null; // Ensure no lingering reference if playback stops
            if (audioPlayerContext && audioPlayerContext.state !== 'closed') {
                nextAiAudioPlayTime = audioPlayerContext.currentTime;
            }
            // console.debug("live_api_audio_output.js: Playback conditions not met. Muted:", isGloballyMutedCheckFn(), "Queue empty:", aiAudioPlaybackQueue.length === 0);
            return;
        }
        isPlayingAiAudio = true;

        // Ensure any previous node is fully stopped and disconnected before creating a new one.
        // This is a safeguard; `onended` should handle this, but interruption might bypass onended.
        if (currentSourceNode) {
            try {
                console.warn("live_api_audio_output.js: Previous sourceNode existed when trying to play next. Stopping it.");
                currentSourceNode.onended = null; // Detach old handler
                currentSourceNode.stop(0);
                currentSourceNode.disconnect();
            } catch(e) { console.warn("AudioOutput: Error stopping previous source node in playNextChunk:", e); }
            currentSourceNode = null;
        }

        const audioBufferToPlay = aiAudioPlaybackQueue.shift();
        currentSourceNode = audioPlayerContext.createBufferSource(); // Assign to the module-level variable
        currentSourceNode.buffer = audioBufferToPlay;
        currentSourceNode.connect(audioPlayerContext.destination);

        const currentTime = audioPlayerContext.currentTime;
        const startTime = Math.max(currentTime, nextAiAudioPlayTime); 
        
        // console.debug(`live_api_audio_output.js: Playing AI audio. Scheduled: ${startTime.toFixed(3)}, Duration: ${audioBufferToPlay.duration.toFixed(3)}, Queue: ${aiAudioPlaybackQueue.length}`);
        currentSourceNode.start(startTime);
        nextAiAudioPlayTime = startTime + audioBufferToPlay.duration - 0.015; // Small overlap

        currentSourceNode.onended = () => {
            // console.debug("live_api_audio_output.js: AI audio chunk onended event.");
            // Check if this onended is for the *actual* currentSourceNode, not a stale one.
            // This check might be redundant if stopCurrentSound correctly nullifies onended.
            if (currentSourceNode && currentSourceNode.buffer === audioBufferToPlay) {
                try {
                    currentSourceNode.disconnect();
                } catch (e) {console.warn("AudioOutput: Error disconnecting source node in onended:", e);}
                currentSourceNode = null; // Clear the reference as it's done
            } else {
                // console.debug("live_api_audio_output.js: onended called on a source node that is not the current one, or already cleared.");
            }
            playNextChunkFromQueue(); // Proceed to the next chunk
        };
        currentSourceNode.onerror = (errEvent) => { 
            console.error("live_api_audio_output.js: AudioBufferSourceNode error:", errEvent);
             if (currentSourceNode) {
                try {currentSourceNode.disconnect();} catch(e){}
                currentSourceNode = null;
            }
            playNextChunkFromQueue(); 
        };
    }

    function clearPlaybackQueue() {
        console.log("live_api_audio_output.js: clearPlaybackQueue() called.");
        aiAudioPlaybackQueue = [];
        // Note: This does NOT stop the currently playing sound. Use stopCurrentSound() for that.
        // If the queue is cleared and nothing is playing, make sure isPlayingAiAudio is false.
        if (!currentSourceNode) { // Only if nothing is audibly playing
            isPlayingAiAudio = false;
        }
    }

    function stopCurrentSound() {
        console.log("live_api_audio_output.js: stopCurrentSound() called.");
        if (currentSourceNode) {
            console.log("live_api_audio_output.js: Active sourceNode found, attempting to stop.");
            try {
                currentSourceNode.onended = null; // CRITICAL: Prevent onended from re-triggering playNextChunkFromQueue
                currentSourceNode.stop(0);      // Stop playback immediately
                currentSourceNode.disconnect(); // Disconnect from audio graph
                console.log("live_api_audio_output.js: currentSourceNode stopped and disconnected.");
            } catch (e) {
                console.warn("live_api_audio_output.js: Error during stopCurrentSound:", e);
            }
            currentSourceNode = null; // Clear the reference
        } else {
            // console.log("live_api_audio_output.js: No currentSourceNode to stop.");
        }
        // After stopping the current sound, if the queue is also empty, we are truly not playing.
        if (aiAudioPlaybackQueue.length === 0) {
            isPlayingAiAudio = false;
            if (audioPlayerContext && audioPlayerContext.state !== 'closed') {
                nextAiAudioPlayTime = audioPlayerContext.currentTime; // Reset for next potential play
            }
        }
    }

    function cleanupAudioContext() {
        console.log("live_api_audio_output.js: cleanupAudioContext() called for full cleanup.");
        stopCurrentSound();   // Ensure current sound is stopped
        resetPlaybackState(); // This closes the context and clears everything else
    }

    console.log(`live_api_audio_output.js: IIFE (v${MODULE_VERSION}) FINISHED.`);
    return {
        initialize,
        handleReceivedAiAudioChunk,
        clearPlaybackQueue,    // Clears pending audio
        stopCurrentSound,      // Stops the currently playing audio and clears pending
        cleanupAudioContext    // Full cleanup including AudioContext
    };
})();

if (window.liveApiAudioOutput && typeof window.liveApiAudioOutput.initialize === 'function') {
    console.log("live_api_audio_output.js (Barge-In Enhanced): SUCCESSFULLY assigned to window.liveApiAudioOutput.");
} else {
    console.error("live_api_audio_output.js (Barge-In Enhanced): CRITICAL ERROR - window.liveApiAudioOutput IS UNDEFINED or not correctly formed.");
}
console.log("live_api_audio_output.js: Script execution FINISHED (Barge-In Enhanced).");