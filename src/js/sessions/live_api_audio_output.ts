// src/js/sessions/live_api_audio_output.ts

console.log("live_api_audio_output.ts: Script execution STARTED (TS Barge-In Enhanced).");

// Interface for the module, should match global.d.ts LiveApiAudioOutput
export interface LiveApiAudioOutputModule {
    initialize: (isMutedCheckFunction: () => boolean) => boolean;
    handleReceivedAiAudioChunk: (audioChunkArrayBuffer: ArrayBuffer, mimeType: string) => void;
    clearPlaybackQueue: () => void;
    stopCurrentSound: () => void;
    cleanupAudioContext: () => void;
}

window.liveApiAudioOutput = {} as LiveApiAudioOutputModule; // Placeholder

function initializeActualLiveApiAudioOutput(): void {
    console.log("live_api_audio_output.ts: initializeActualLiveApiAudioOutput called.");

    window.liveApiAudioOutput = ((): LiveApiAudioOutputModule => {
        'use strict';
        const MODULE_VERSION = "TS 1.1.0 (Barge-In Enhanced)";
        console.log(`live_api_audio_output.ts: IIFE (v${MODULE_VERSION}) STARTING.`);

        let audioPlayerContext: AudioContext | null = null;
        const AI_OUTPUT_SAMPLE_RATE = 24000; // Standard for Gemini Live API audio output
        let aiAudioPlaybackQueue: AudioBuffer[] = []; // Queue of AudioBuffer objects
        let isPlayingAiAudio: boolean = false;
        let nextAiAudioPlayTime: number = 0;
        let currentSourceNode: AudioBufferSourceNode | null = null;

        let isGloballyMutedCheckFn: () => boolean = () => false;

        function initialize(isMutedCheckFunction: () => boolean): boolean {
            console.log("AudioOutput (TS): initialize() called.");
            if (typeof isMutedCheckFunction !== 'function') {
                console.error("AudioOutput (TS): Initialization failed - isMutedCheckFunction is not a function.");
                return false;
            }
            isGloballyMutedCheckFn = isMutedCheckFunction;
            resetPlaybackState(); 
            console.log("AudioOutput (TS): Initialized successfully with mute check function.");
            return true;
        }
        
        function resetPlaybackState(): void {
            console.log("AudioOutput (TS): resetPlaybackState() called.");
            stopCurrentSound(); 
            aiAudioPlaybackQueue = [];
            isPlayingAiAudio = false;
            nextAiAudioPlayTime = 0;
            
            if (audioPlayerContext && audioPlayerContext.state !== 'closed') {
                console.log("AudioOutput (TS): Closing existing audioPlayerContext.");
                audioPlayerContext.close().catch(e => console.warn("AudioOutput (TS): Error closing audioPlayerContext during reset:", e));
            }
            audioPlayerContext = null; 
            console.log("AudioOutput (TS): Playback state fully reset.");
        }

        function handleReceivedAiAudioChunk(audioChunkArrayBuffer: ArrayBuffer, mimeType: string): void {
            if (isGloballyMutedCheckFn()) {
                return;
            }
            if (!audioChunkArrayBuffer || audioChunkArrayBuffer.byteLength === 0) {
                return;
            }
            // console.debug(`AudioOutput (TS): Received AI audio chunk. Size: ${audioChunkArrayBuffer.byteLength}, MIME: ${mimeType}`);

            try {
                if (!audioPlayerContext || audioPlayerContext.state === 'closed') {
                    console.log(`AudioOutput (TS): Creating new AudioContext for AI output (SR: ${AI_OUTPUT_SAMPLE_RATE}).`);
                    audioPlayerContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AI_OUTPUT_SAMPLE_RATE });
                    nextAiAudioPlayTime = audioPlayerContext.currentTime;
                }
                if (audioPlayerContext.state === 'suspended') {
                    console.log("AudioOutput (TS): Resuming suspended audioPlayerContext.");
                    audioPlayerContext.resume().catch(e => console.error("AudioOutput (TS): Error resuming audioPlayerContext:", e));
                }
                 if (audioPlayerContext.state === 'closed') { 
                     console.error("AudioOutput (TS): audioPlayerContext is unexpectedly closed after attempting creation/resume.");
                     return;
                }

                // Assuming audio is PCM s16le based on common Gemini Live API outputs.
                // If mimeType indicates something else (e.g., 'audio/mp3', 'audio/ogg; codecs=opus'),
                // you'd use audioPlayerContext.decodeAudioData(audioChunkArrayBuffer).
                // For now, assuming PCM that needs to be converted to Float32 for Web Audio API Buffer.
                
                // This example assumes mimeType implies raw PCM data that needs this conversion.
                // If API sends opus or mp3, decodeAudioData is better.
                // Given the existing JS logic, it seems it was handling raw PCM.
                // --- START OF REPLACEMENT (AUDIO.FIX.1) ---
 const pcmData = new Int16Array(audioChunkArrayBuffer); // Assumes audioChunkArrayBuffer is raw S16LE PCM
    const float32Pcm = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
        float32Pcm[i] = pcmData[i] / 32768.0; // Convert S16 PCM to Float32 range -1.0 to 1.0
    }

// Directly create and use the AudioBuffer, assuming audioPlayerContext is valid here
// (it's checked earlier in the function)
  if (!audioPlayerContext) { // Should have been caught earlier, but as a safeguard
        console.error("AudioOutput (TS): audioPlayerContext is null, cannot create buffer.");
        return;
    }

    try {
        const audioBuffer = audioPlayerContext.createBuffer(1, float32Pcm.length, AI_OUTPUT_SAMPLE_RATE);
        audioBuffer.copyToChannel(float32Pcm, 0);
        
        // Add to queue only if buffer creation was successful
        aiAudioPlaybackQueue.push(audioBuffer);
    } catch (bufferError: any) {
        console.error("AudioOutput (TS): Error creating or populating AudioBuffer:", bufferError.message, bufferError);
        return; // Stop processing this chunk if buffer creation fails
    }
                 if (!isPlayingAiAudio) {
        playNextChunkFromQueue();
    }
} catch (e: any) { 
    console.error("AudioOutput (TS): Error processing/queueing AI audio chunk:", e.message, e);
}
        }
        
        function playNextChunkFromQueue(): void {
            if (isGloballyMutedCheckFn() || aiAudioPlaybackQueue.length === 0 || !audioPlayerContext || audioPlayerContext.state === 'closed') {
                isPlayingAiAudio = false;
                currentSourceNode = null;
                if (audioPlayerContext && audioPlayerContext.state !== 'closed') {
                    nextAiAudioPlayTime = audioPlayerContext.currentTime;
                }
                return;
            }
            isPlayingAiAudio = true;

            if (currentSourceNode) { // Should have been cleared by onended or stopCurrentSound
                try {
                    console.warn("AudioOutput (TS): Previous sourceNode existed. Stopping it.");
                    currentSourceNode.onended = null; 
                    currentSourceNode.stop(0);
                    currentSourceNode.disconnect();
                } catch(e:any) { console.warn("AudioOutput (TS): Error stopping previous source node:", e.message); }
                currentSourceNode = null;
            }

            const audioBufferToPlay = aiAudioPlaybackQueue.shift();
            if (!audioBufferToPlay) { // Should not happen if queue.length > 0 checked
                isPlayingAiAudio = false;
                return;
            }

            currentSourceNode = audioPlayerContext.createBufferSource();
            currentSourceNode.buffer = audioBufferToPlay;
            currentSourceNode.connect(audioPlayerContext.destination);

            const currentTime = audioPlayerContext.currentTime;
            const startTime = Math.max(currentTime, nextAiAudioPlayTime); 
            
            currentSourceNode.start(startTime);
            nextAiAudioPlayTime = startTime + audioBufferToPlay.duration - 0.015; 

            currentSourceNode.onended = () => {
                if (currentSourceNode && currentSourceNode.buffer === audioBufferToPlay) { // Check if it's the same node
                    try {
                        currentSourceNode.disconnect();
                    } catch (e:any) {console.warn("AudioOutput (TS): Error disconnecting source node in onended:", e.message);}
                    currentSourceNode = null;
                }
                playNextChunkFromQueue(); 
            };
          
        }

        function clearPlaybackQueue(): void {
            console.log("AudioOutput (TS): clearPlaybackQueue() called.");
            aiAudioPlaybackQueue = [];
            if (!currentSourceNode) { 
                isPlayingAiAudio = false;
            }
        }

        function stopCurrentSound(): void {
            console.log("AudioOutput (TS): stopCurrentSound() called.");
            if (currentSourceNode) {
                console.log("AudioOutput (TS): Active sourceNode found, stopping.");
                try {
                    currentSourceNode.onended = null; 
                    currentSourceNode.stop(0);      
                    currentSourceNode.disconnect(); 
                } catch (e: any) {
                    console.warn("AudioOutput (TS): Error during stopCurrentSound:", e.message);
                }
                currentSourceNode = null; 
            }
            if (aiAudioPlaybackQueue.length === 0) { // If queue is also empty after stopping
                isPlayingAiAudio = false;
                if (audioPlayerContext && audioPlayerContext.state !== 'closed') {
                    nextAiAudioPlayTime = audioPlayerContext.currentTime; 
                }
            }
        }

        function cleanupAudioContext(): void {
            console.log("AudioOutput (TS): cleanupAudioContext() called.");
            stopCurrentSound();   
            resetPlaybackState(); 
        }

        console.log(`live_api_audio_output.ts: IIFE (v${MODULE_VERSION}) FINISHED.`);
        return {
            initialize,
            handleReceivedAiAudioChunk,
            clearPlaybackQueue,    
            stopCurrentSound,      
            cleanupAudioContext    
        };
    })(); // End of IIFE

    if (window.liveApiAudioOutput && typeof window.liveApiAudioOutput.initialize === 'function') {
        console.log("live_api_audio_output.ts: SUCCESSFULLY assigned and functional.");
        document.dispatchEvent(new CustomEvent('liveApiAudioOutputReady'));
        console.log("live_api_audio_output.ts: 'liveApiAudioOutputReady' event dispatched.");
    } else {
        console.error("live_api_audio_output.ts: CRITICAL ERROR - Not correctly assigned or initialize method missing.");
    }
} // End of initializeActualLiveApiAudioOutput

initializeActualLiveApiAudioOutput(); // Define window.liveApiAudioOutput

console.log("live_api_audio_output.ts: Script execution FINISHED.");