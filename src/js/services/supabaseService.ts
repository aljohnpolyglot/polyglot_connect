// src/js/services/supabaseService.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const audioBucket = import.meta.env.VITE_SUPABASE_AUDIO_BUCKET as string;

if (!supabaseUrl || !supabaseAnonKey || !audioBucket) {
    console.error("Supabase environment variables (URL, Anon Key, or Audio Bucket) are not defined.");
    // You might want to throw an error here or handle it gracefully
    // For now, we'll let it proceed but uploads will fail.
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
// Helper function to convert raw L16 PCM data to a WAV Blob
// Adapted from the Google Apps Script example for client-side JavaScript
export function convertL16ToWavBlob(
    inputDataBytes: Uint8Array, // Raw L16 PCM byte array
    mimeTypeFromApi: string,    // e.g., "audio/L16;codec=pcm;rate=24000"
    numChannels: number = 1     // Assuming mono for TTS
): Blob | null {
    try {
        const parts = mimeTypeFromApi.split(';').map(e => e.trim());
        const audioTypePart = parts.find(p => p.toLowerCase().startsWith('audio/'));
        const codecPart = parts.find(p => p.toLowerCase().startsWith('codec='));
        const ratePart = parts.find(p => p.toLowerCase().startsWith('rate='));

        if (!audioTypePart || !codecPart || !ratePart) {
            console.error("[L16toWAV] Invalid MIME type for L16 conversion:", mimeTypeFromApi);
            return null;
        }

        const audioType = audioTypePart.split('/')[1]?.toLowerCase(); // Should be "l16"
        const codec = codecPart.split('=')[1]?.toLowerCase();         // Should be "pcm"
        const sampleRateStr = ratePart.split('=')[1];
        
        if (audioType !== "l16" || codec !== "pcm" || !sampleRateStr) {
            console.error(`[L16toWAV] Unsupported format for L16->WAV: Type=${audioType}, Codec=${codec}. Original: ${mimeTypeFromApi}`);
            return null; 
        }
        const sampleRate = parseInt(sampleRateStr, 10);
        if (isNaN(sampleRate)) {
            console.error("[L16toWAV] Could not parse sample rate from MIME type:", mimeTypeFromApi);
            return null;
        }

        const bitsPerSample = 16; // L16 means 16-bit
        const blockAlign = numChannels * (bitsPerSample / 8);
        const byteRate = sampleRate * blockAlign;
        const dataSize = inputDataBytes.length;
        const fileSize = 36 + dataSize; // Standard WAV header is 44 bytes, but the data chunk itself starts after 36 bytes of main header

        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        // RIFF chunk descriptor
        view.setUint8(0, 'R'.charCodeAt(0)); view.setUint8(1, 'I'.charCodeAt(0)); view.setUint8(2, 'F'.charCodeAt(0)); view.setUint8(3, 'F'.charCodeAt(0));
        view.setUint32(4, fileSize, true); // fileSize
        view.setUint8(8, 'W'.charCodeAt(0)); view.setUint8(9, 'A'.charCodeAt(0)); view.setUint8(10, 'V'.charCodeAt(0)); view.setUint8(11, 'E'.charCodeAt(0));
        
        // "fmt " sub-chunk
        view.setUint8(12, 'f'.charCodeAt(0)); view.setUint8(13, 'm'.charCodeAt(0)); view.setUint8(14, 't'.charCodeAt(0)); view.setUint8(15, ' '.charCodeAt(0));
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
        view.setUint16(22, numChannels, true); // NumChannels
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, byteRate, true);   // ByteRate
        view.setUint16(32, blockAlign, true); // BlockAlign
        view.setUint16(34, bitsPerSample, true); // BitsPerSample
        
        // "data" sub-chunk
        view.setUint8(36, 'd'.charCodeAt(0)); view.setUint8(37, 'a'.charCodeAt(0)); view.setUint8(38, 't'.charCodeAt(0)); view.setUint8(39, 'a'.charCodeAt(0));
        view.setUint32(40, dataSize, true); // Subchunk2Size (data size)

        const wavBytes = new Uint8Array(header.byteLength + inputDataBytes.length);
        wavBytes.set(new Uint8Array(header), 0);
        wavBytes.set(inputDataBytes, header.byteLength);

        return new Blob([wavBytes], { type: 'audio/wav' });

    } catch (e: any) {
        console.error("[L16toWAV] Error during L16 to WAV conversion:", e.message, e);
        return null;
    }
}
/**
 * Uploads an audio blob to Supabase Storage.
 * @param audioBlob The audio blob to upload.
 * @param filePath The desired path in the bucket (e.g., 'user_id/message_id.webm').
 * @returns The public URL of the uploaded file, or null on error.
 */

export async function uploadAudioToSupabase(
    audioBlob: Blob,
    filePath: string,
    explicitContentType?: string // <<< ADD THIS OPTIONAL PARAMETER
): Promise<string | null> {
    if (!supabaseUrl || !supabaseAnonKey || !audioBucket) {
        console.error("Supabase client not initialized due to missing env vars. Cannot upload.");
        return null;
    }
    try {
        // Use the explicitContentType if provided, otherwise fallback to blob.type, then a generic default
        const contentTypeToUse = explicitContentType || audioBlob.type || 'application/octet-stream';
        
        console.log(`[SupabaseService] Attempting to upload to bucket '${audioBucket}', path '${filePath}', size: ${audioBlob.size} bytes, ContentType: ${contentTypeToUse}`);
        
        const { data, error } = await supabase.storage
            .from(audioBucket)
            .upload(filePath, audioBlob, {
                cacheControl: '3600',
                upsert: true,        
                contentType: contentTypeToUse, // <<< USE THE DETERMINED contentTypeToUse
            });

        if (error) {
            console.error('[SupabaseService] Upload error:', error);
            throw error;
        }

        if (data) {
            // Make sure getPublicUrl().data exists before trying to destructure publicUrl
            const publicUrlData = supabase.storage.from(audioBucket).getPublicUrl(filePath).data;
            if (publicUrlData && publicUrlData.publicUrl) {
                console.log('[SupabaseService] Upload successful. Public URL:', publicUrlData.publicUrl);
                return publicUrlData.publicUrl;
            } else {
                console.warn('[SupabaseService] Upload successful but could not retrieve public URL.');
                return null;
            }
        }
        console.warn('[SupabaseService] Upload completed but no data object returned from Supabase.');
        return null;
    } catch (e) {
        console.error('[SupabaseService] Exception during uploadAudioToSupabase:', e);
        return null;
    }
}

/**
 * Converts a base64 string to a Blob.
 * @param base64 The base64 encoded string.
 * @param contentType The MIME type of the content.
 * @returns A Blob object.
 */
export function base64ToBlob(base64: string, contentType: string = 'audio/mpeg'): Blob {
     const byteCharacters = atob(base64);
     const byteNumbers = new Array(byteCharacters.length);
     for (let i = 0; i < byteCharacters.length; i++) {
         byteNumbers[i] = byteCharacters.charCodeAt(i);
     }
     const byteArray = new Uint8Array(byteNumbers);
     return new Blob([byteArray], { type: contentType });
}