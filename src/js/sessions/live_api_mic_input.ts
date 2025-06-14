// src/js/sessions/live_api_mic_input.ts
import type { GeminiLiveApiService } from '../types/global.d.ts'; // Adjust path if needed

console.log("live_api_mic_input.ts: Script execution STARTED (TS v1.0 - Resampling Focus).");

// Interface for the module, should match global.d.ts
export interface LiveApiMicInputModule {
    initialize: (liveApiService: GeminiLiveApiService, isMutedFn: () => boolean) => boolean;
    startCapture: (onErrorCallback: (error: Error) => void) => Promise<void>;
    stopCapture: () => void;
}

window.liveApiMicInput = {} as LiveApiMicInputModule; // Placeholder

function initializeActualLiveApiMicInput(): void {
    console.log("live_api_mic_input.ts: initializeActualLiveApiMicInput called.");

    // No external window dependencies to check before defining the IIFE for this module,
    // as its dependencies (GeminiLiveApiService) are passed in.

    window.liveApiMicInput = ((): LiveApiMicInputModule => {
        'use strict';
        console.log("live_api_mic_input.ts: IIFE (TS v1.0) STARTING.");

        let mainAudioContext: AudioContext | null = null;
        let userMicrophoneStream: MediaStream | null = null;
        let microphoneSourceNode: MediaStreamAudioSourceNode | null = null;
        let scriptProcessorNode: ScriptProcessorNode | null = null;

        const TARGET_OUTPUT_SAMPLE_RATE = 16000;

        let geminiLiveApiServiceRef: GeminiLiveApiService | null = null;
        let isMicMutedCheckFn: () => boolean = () => true; // Default to muted

        function initialize(liveApiService: GeminiLiveApiService, isMutedFn: () => boolean): boolean {
            console.log("MicInput (TS): initialize() called.");
            if (!liveApiService || typeof liveApiService.sendRealtimeAudio !== 'function') {
                console.error("MicInput (TS): Init failed - liveApiService or sendRealtimeAudio method invalid.");
                return false;
            }
            if (typeof isMutedFn !== 'function') {
                console.error("MicInput (TS): Init failed - isMutedFn invalid.");
                return false;
            }
            geminiLiveApiServiceRef = liveApiService;
            isMicMutedCheckFn = isMutedFn;
            console.log("MicInput (TS): Initialized. Target output SR:", TARGET_OUTPUT_SAMPLE_RATE);
            return true;
        }

        async function startCapture(onErrorCallback: (error: Error) => void): Promise<void> {
            console.log("MicInput (TS): startCapture() called.");

            if (!geminiLiveApiServiceRef) {
                onErrorCallback?.(new Error("MicInput (TS): Not initialized. Call initialize() first."));
                return;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                onErrorCallback?.(new Error("MicInput (TS): getUserMedia not supported by this browser."));
                return;
            }

            try {
                if (!mainAudioContext || mainAudioContext.state === 'closed') {
                    mainAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    console.log("MicInput (TS): Main AudioContext created. Actual SR:", mainAudioContext.sampleRate);
                }
                if (mainAudioContext.state === 'suspended') {
                    console.log("MicInput (TS): Resuming main AudioContext.");
                    await mainAudioContext.resume();
                }

                if (userMicrophoneStream && userMicrophoneStream.active) {
                    console.log("MicInput (TS): Reusing active microphone stream.");
                } else {
                    console.log("MicInput (TS): Requesting microphone access...");
                    userMicrophoneStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        },
                        video: false
                    });
                }

                const audioTracks = userMicrophoneStream.getAudioTracks();
                if (!audioTracks || audioTracks.length === 0) {
                    throw new Error("No audio tracks found in the microphone stream.");
                }
                
                const captureSettings = audioTracks[0].getSettings();
                const actualCaptureSampleRate = mainAudioContext.sampleRate; // Use context's rate
                console.log("MicInput (TS): Mic stream obtained. Capture SR (AudioContext):", actualCaptureSampleRate, "Track SR (Settings):", captureSettings.sampleRate);

                if (actualCaptureSampleRate !== TARGET_OUTPUT_SAMPLE_RATE) {
                    console.warn(`MicInput (TS): Mic capturing at ${actualCaptureSampleRate}Hz. Resampling to ${TARGET_OUTPUT_SAMPLE_RATE}Hz.`);
                }

                if (scriptProcessorNode) { scriptProcessorNode.disconnect(); scriptProcessorNode = null; }
                if (microphoneSourceNode) { microphoneSourceNode.disconnect(); microphoneSourceNode = null; }

                microphoneSourceNode = mainAudioContext.createMediaStreamSource(userMicrophoneStream);
                const bufferSize = 4096; // Standard buffer size

                if (!mainAudioContext.createScriptProcessor) {
                    console.error("MicInput (TS): createScriptProcessor is not available on AudioContext. This browser may require AudioWorklet for modern audio processing.");
                    onErrorCallback?.(new Error("Browser's ScriptProcessorNode for audio is not supported."));
                    stopCapture(); // Clean up
                    return;
                }
                scriptProcessorNode = mainAudioContext.createScriptProcessor(bufferSize, 1, 1); // 1 input channel, 1 output channel

                scriptProcessorNode.onaudioprocess = async (audioProcessingEvent: AudioProcessingEvent) => {
                    if (isMicMutedCheckFn() || !geminiLiveApiServiceRef?.sendRealtimeAudio) {
                        return;
                    }

                    try {
                        const inputDataFloat32_CaptureRate = audioProcessingEvent.inputBuffer.getChannelData(0);
                        let audioDataToSendFloat32_TargetRate: Float32Array;
                        const currentCaptureSampleRate = mainAudioContext!.sampleRate; // Non-null assertion as context is checked

                        if (currentCaptureSampleRate === TARGET_OUTPUT_SAMPLE_RATE) {
                            audioDataToSendFloat32_TargetRate = inputDataFloat32_CaptureRate;
                        } else {
                            // Resampling logic (ensure OfflineAudioContext is available or use a library)
                            if (typeof OfflineAudioContext === "undefined") {
                                console.error("MicInput (TS): OfflineAudioContext not available for resampling. Audio will not be sent.");
                                // Consider stopping capture or notifying error prominently
                                return; 
                            }
                            const numberOfChannels = 1;
                            const chunkLengthAtCaptureRate = inputDataFloat32_CaptureRate.length;
                            const chunkLengthAtTargetRate = Math.round(chunkLengthAtCaptureRate * (TARGET_OUTPUT_SAMPLE_RATE / currentCaptureSampleRate));

                            const offlineCtx = new OfflineAudioContext(numberOfChannels, chunkLengthAtTargetRate, TARGET_OUTPUT_SAMPLE_RATE);
                            
                            const tempInputBuffer = offlineCtx.createBuffer(
                                numberOfChannels,
                                chunkLengthAtCaptureRate,
                                currentCaptureSampleRate
                            );
                            tempInputBuffer.copyToChannel(inputDataFloat32_CaptureRate, 0);

                            const bufferSource = offlineCtx.createBufferSource();
                            bufferSource.buffer = tempInputBuffer;
                            bufferSource.connect(offlineCtx.destination);
                            bufferSource.start(0);

                            const renderedBuffer = await offlineCtx.startRendering();
                            audioDataToSendFloat32_TargetRate = renderedBuffer.getChannelData(0);
                        }

                        // Convert Float32 to PCM16
                        const pcm16Data = new Int16Array(audioDataToSendFloat32_TargetRate.length);
                        for (let i = 0; i < audioDataToSendFloat32_TargetRate.length; i++) {
                            let s = Math.max(-1, Math.min(1, audioDataToSendFloat32_TargetRate[i]));
                            pcm16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        geminiLiveApiServiceRef.sendRealtimeAudio(pcm16Data.buffer);

                    } catch (e: any) {
                        console.error("MicInput (TS): Error in onaudioprocess (resampling/conversion):", e.message, e);
                    }
                };

                microphoneSourceNode.connect(scriptProcessorNode);
                scriptProcessorNode.connect(mainAudioContext.destination); // Connect to destination to start processing
                console.log("MicInput (TS): Mic capture and processing node connected.");

            } catch (err: any) {
                console.error("MicInput (TS): Error in startCapture:", err.message, err);
                onErrorCallback?.(err);
                stopCapture(); // Clean up on error
            }
        }

        function stopCapture(): void {
            console.log("MicInput (TS): stopCapture() called.");
            if (scriptProcessorNode) {
                try { scriptProcessorNode.disconnect(); } catch (e) { /* ignore */ }
                scriptProcessorNode.onaudioprocess = null; 
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
            // Consider closing mainAudioContext if it's not shared with audio output
            // if (mainAudioContext && mainAudioContext.state !== 'closed') {
            //     mainAudioContext.close().then(() => console.log("MicInput (TS): Main AudioContext closed."));
            //     mainAudioContext = null;
            // }
            console.log("MicInput (TS): Microphone capture stopped and resources released.");
        }

        console.log("live_api_mic_input.ts: IIFE (TS v1.0) FINISHED.");
        return {
            initialize,
            startCapture,
            stopCapture
        };
    })(); // End of IIFE

    if (window.liveApiMicInput && typeof window.liveApiMicInput.initialize === 'function') {
        console.log("live_api_mic_input.ts: SUCCESSFULLY assigned and functional.");
        document.dispatchEvent(new CustomEvent('liveApiMicInputReady'));
        console.log("live_api_mic_input.ts: 'liveApiMicInputReady' event dispatched.");
    } else {
        console.error("live_api_mic_input.ts: CRITICAL ERROR - Not correctly assigned or initialize method missing.");
    }
} // End of initializeActualLiveApiMicInput


// This module is initialized directly by live_call_handler, so it doesn't need its own complex event-based dependency check.
// It just needs to be loaded. live_call_handler will call initializeActualLiveApiMicInput if needed,
// or more likely, just use the methods if it's assumed to be ready by script order.
// For robustness, let's ensure it's initialized (even if it's a simple call).
// However, its true "readiness" depends on its initialize() method being called by live_call_handler.

// For now, let's just make sure the object is on window.
// The actual initialization of its internal state happens when live_call_handler calls .initialize().
// We can dispatch a "structural" ready event.
initializeActualLiveApiMicInput(); // Call it to define window.liveApiMicInput

console.log("live_api_mic_input.ts: Script execution FINISHED.");