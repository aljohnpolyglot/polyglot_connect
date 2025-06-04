// js/sessions/live_api_mic_input.js
// Handles user microphone input capture and processing for the Gemini Live API.
// Version: v1.2 - Corrected Resampling

console.log("live_api_mic_input.js: Script execution STARTED (v1.2 - Corrected Resampling).");

window.liveApiMicInput = (() => {
    'use strict';
    console.log("live_api_mic_input.js: IIFE (v1.2 - Corrected Resampling) STARTING.");

    let mainAudioContext = null; // For getUserMedia stream processing
    let userMicrophoneStream = null;
    let microphoneSourceNode = null;
    let scriptProcessorNode = null;

    const TARGET_OUTPUT_SAMPLE_RATE = 16000; // What the API expects

    let geminiLiveApiServiceRef = null;
    let isMicMutedCheckFn = () => true;

    function initialize(liveApiService, isMutedFn) {
        console.log("live_api_mic_input.js: initialize() called.");
        if (!liveApiService || typeof liveApiService.sendRealtimeAudio !== 'function') {
            console.error("MicInput: Init failed - liveApiService invalid.");
            return false;
        }
        if (typeof isMutedFn !== 'function') {
            console.error("MicInput: Init failed - isMutedFn invalid.");
            return false;
        }
        geminiLiveApiServiceRef = liveApiService;
        isMicMutedCheckFn = isMutedFn;
        console.log("live_api_mic_input.js: Initialized. Target output SR:", TARGET_OUTPUT_SAMPLE_RATE);
        return true;
    }

    async function startCapture(onErrorCallback) {
        console.log("live_api_mic_input.js: startCapture() called.");

        if (!geminiLiveApiServiceRef) {
            onErrorCallback?.(new Error("MicInput: Not initialized."));
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            onErrorCallback?.(new Error("MicInput: getUserMedia not supported."));
            return;
        }

        try {
            if (!mainAudioContext || mainAudioContext.state === 'closed') {
                mainAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("live_api_mic_input.js: Main AudioContext created. Actual SR:", mainAudioContext.sampleRate);
            }
            if (mainAudioContext.state === 'suspended') {
                console.log("live_api_mic_input.js: Resuming main AudioContext.");
                await mainAudioContext.resume();
            }

            if (userMicrophoneStream && userMicrophoneStream.active) {
                console.log("live_api_mic_input.js: Reusing active microphone stream.");
            } else {
                console.log("live_api_mic_input.js: Requesting microphone access...");
                userMicrophoneStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                        // Not specifying sampleRate here lets browser pick its best/default
                    },
                    video: false
                });
            }

            const audioTracks = userMicrophoneStream.getAudioTracks();
            if (!audioTracks || audioTracks.length === 0) throw new Error("No audio tracks in stream.");
            
            const captureSettings = audioTracks[0].getSettings();
            // Use mainAudioContext.sampleRate as the definitive capture rate for resampling calculations
            const actualCaptureSampleRate = mainAudioContext.sampleRate;
            console.log("live_api_mic_input.js: Mic stream obtained. Capture SR (from AudioContext):", actualCaptureSampleRate, "Track SR (from settings):", captureSettings.sampleRate);

            if (actualCaptureSampleRate !== TARGET_OUTPUT_SAMPLE_RATE) {
                console.warn(`live_api_mic_input.js: Mic capturing at ${actualCaptureSampleRate}Hz. Will resample to ${TARGET_OUTPUT_SAMPLE_RATE}Hz.`);
            }

            if (scriptProcessorNode) { scriptProcessorNode.disconnect(); scriptProcessorNode = null; }
            if (microphoneSourceNode) { microphoneSourceNode.disconnect(); microphoneSourceNode = null; }

            microphoneSourceNode = mainAudioContext.createMediaStreamSource(userMicrophoneStream);
            const bufferSize = 4096;
            // createScriptProcessor is deprecated, but let's make it work first.
            if (!mainAudioContext.createScriptProcessor) {
                console.error("MicInput: createScriptProcessor is not available. AudioWorklet needed.");
                onErrorCallback?.(new Error("Browser's ScriptProcessorNode for audio is not supported."));
                return;
            }
            scriptProcessorNode = mainAudioContext.createScriptProcessor(bufferSize, 1, 1);

            scriptProcessorNode.onaudioprocess = async (audioProcessingEvent) => {
                if (isMicMutedCheckFn() || !geminiLiveApiServiceRef?.sendRealtimeAudio) return;

                try {
                    const inputDataFloat32_CaptureRate = audioProcessingEvent.inputBuffer.getChannelData(0);
                    let audioDataToSendFloat32_TargetRate;

                    // Use the definitive sample rate of the mainAudioContext for resampling logic
                    const currentCaptureSampleRate = mainAudioContext.sampleRate;

                    if (currentCaptureSampleRate === TARGET_OUTPUT_SAMPLE_RATE) {
                        audioDataToSendFloat32_TargetRate = inputDataFloat32_CaptureRate;
                    } else {
                        const numberOfChannels = 1;
                        const chunkLengthAtCaptureRate = inputDataFloat32_CaptureRate.length;
                        const chunkLengthAtTargetRate = Math.round(chunkLengthAtCaptureRate * (TARGET_OUTPUT_SAMPLE_RATE / currentCaptureSampleRate));

                        // Create a new OfflineAudioContext for each chunk to ensure it's in the correct state
                        const offlineCtx = new OfflineAudioContext(numberOfChannels, chunkLengthAtTargetRate, TARGET_OUTPUT_SAMPLE_RATE);
                        
                        const tempInputBuffer = offlineCtx.createBuffer( // Use offlineCtx to create buffer for consistency with its SR if needed
                            numberOfChannels,
                            chunkLengthAtCaptureRate,
                            currentCaptureSampleRate // Buffer data is at original capture rate
                        );
                        tempInputBuffer.copyToChannel(inputDataFloat32_CaptureRate, 0);

                        const bufferSource = offlineCtx.createBufferSource();
                        bufferSource.buffer = tempInputBuffer;
                        bufferSource.connect(offlineCtx.destination);
                        bufferSource.start(0);

                        const renderedBuffer = await offlineCtx.startRendering();
                        audioDataToSendFloat32_TargetRate = renderedBuffer.getChannelData(0);
                    }

                    const pcm16Data = new Int16Array(audioDataToSendFloat32_TargetRate.length);
                    for (let i = 0; i < audioDataToSendFloat32_TargetRate.length; i++) {
                        let s = Math.max(-1, Math.min(1, audioDataToSendFloat32_TargetRate[i]));
                        pcm16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    // console.debug("MicInput: Sending resampled audio chunk. Length:", pcm16Data.length);
                    geminiLiveApiServiceRef.sendRealtimeAudio(pcm16Data.buffer);

                } catch (e) {
                    console.error("live_api_mic_input.js: Error in onaudioprocess (resampling/conversion):", e.message, e);
                    // To prevent flooding, maybe stop trying after a few errors or call onErrorCallback
                }
            };

            microphoneSourceNode.connect(scriptProcessorNode);
            scriptProcessorNode.connect(mainAudioContext.destination);
            console.log("live_api_mic_input.js: Mic capture and processing node connected.");

        } catch (err) {
            console.error("live_api_mic_input.js: Error in startCapture:", err.message, err);
            onErrorCallback?.(err);
            stopCapture();
        }
    }

    function stopCapture() {
        console.log("live_api_mic_input.js: stopCapture() called.");
        if (scriptProcessorNode) {
            try { scriptProcessorNode.disconnect(); } catch (e) { /* ignore */ }
            scriptProcessorNode.onaudioprocess = null; // Important to remove the handler
            scriptProcessorNode = null;
        }
        if (microphoneSourceNode) {
            try { microphoneSourceNode.disconnect(); } catch (e) { /* ignore */ }
            microphoneSourceNode = null;
        }
        if (userMicrophoneStream) {
            userMicrophoneStream.getTracks().forEach(track => track.stop());
            userMicrophoneStream = null;
        }
        // Do not close mainAudioContext here if it might be used by audio output or managed elsewhere.
        // If this module exclusively owns it, then:
        // if (mainAudioContext && mainAudioContext.state !== 'closed') {
        //     mainAudioContext.close().then(() => console.log("MicInput: Main AudioContext closed on stopCapture."));
        //     mainAudioContext = null;
        // }
        console.log("live_api_mic_input.js: Microphone capture stopped.");
    }

    console.log("live_api_mic_input.js: IIFE (v1.2 - Corrected Resampling) FINISHED.");
    return {
        initialize,
        startCapture,
        stopCapture
    };
})();

if (window.liveApiMicInput && typeof window.liveApiMicInput.initialize === 'function') {
    console.log("live_api_mic_input.js (v1.2 - Corrected Resampling): SUCCESSFULLY assigned.");
} else {
    console.error("live_api_mic_input.js (v1.2 - Corrected Resampling): CRITICAL ERROR - not correctly formed.");
}
console.log("live_api_mic_input.js: Script execution FINISHED (v1.2 - Corrected Resampling).");