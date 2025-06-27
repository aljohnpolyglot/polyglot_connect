// src/js/services/imgur_service.ts

/**
 * Interface for the relevant part of a successful Imgur API response.
 */
interface ImgurUploadData {
  link: string;
  deletehash?: string;
  id?: string;
  [key: string]: any;
}

/**
* Interface for a successful Imgur API upload response.
*/
interface ImgurUploadSuccessResponse {
  data: ImgurUploadData;
  success: boolean;
  status: number;
}

/**
* Interface for a common Imgur API error response.
*/
interface ImgurErrorResponse {
  data: {
      error: string | { message: string };
      request: string;
      method: string;
      [key: string]: any;
  };
  success: boolean;
  status: number;
}

// --- Imgur Client ID Carousel Logic (Stockton & Malone Pick and Roll) ---
const imgurClientKeys = [
  { name: "STOCKTON", id: import.meta.env.VITE_IMGUR_CLIENT_ID_STOCKTON }, // Your primary
  { name: "MALONE", id: import.meta.env.VITE_IMGUR_CLIENT_ID_MALONE }     // Your alternate
].filter(key => key.id && typeof key.id === 'string' && key.id.trim() !== '' && !key.id.startsWith('your_')); // Filter out invalid/unset keys

let currentKeyIndex = 0; // Index for the next key to use

function selectNextImgurClient(): { name: string, id: string } | null {
  if (imgurClientKeys.length === 0) {
      console.error("[Imgur Pick&Roll] No valid Imgur Client IDs (Stockton or Malone) configured. Upload will fail.");
      return null;
  }

  const selectedKey = imgurClientKeys[currentKeyIndex];
  console.log(`[Imgur Pick&Roll] Stockton (index ${currentKeyIndex}) sets the screen... passing to Malone (actually ${selectedKey.name}) for the upload! ID: ${selectedKey.id.substring(0,7)}...`);

  currentKeyIndex = (currentKeyIndex + 1) % imgurClientKeys.length; // Malone rolls to the hoop (or Stockton gets it back next time)
  return selectedKey;
}
// --- End Imgur Client ID Carousel Logic ---


/**
* Uploads an image to Imgur anonymously, using a rotating Client ID.
*
* @param imageFile - The standard JavaScript `File` object representing the user-uploaded image.
* @returns A Promise that resolves to the direct Imgur image URL string on success, or `null` on failure.
*/
export async function uploadImageToImgur(imageFile: File): Promise<string | null> {
  const activeClientKey = selectNextImgurClient();

  if (!activeClientKey) {
      return null; // No valid client ID to use
  }
  const clientId = activeClientKey.id;
  const clientName = activeClientKey.name; // For logging

  console.log(`[Imgur Upload - ${clientName}] Initiating upload for image: ${imageFile.name}`);

  const formData = new FormData();
  formData.append("image", imageFile);

  // Determine API URL based on environment
  let apiUrl = "https://api.imgur.com/3/image"; // Default: Direct URL for production
  const useProxy = import.meta.env.DEV && import.meta.env.VITE_USE_IMGUR_PROXY_IN_DEV === 'true';

  if (useProxy) {
      apiUrl = "/api/imgur/3/image"; // Dev Mode & Proxy Flag: Use local Vite proxy path
      console.log(`[Imgur Upload - ${clientName}] Using Vite DEV proxy. Target: ${apiUrl}`);
  } else {
      console.log(`[Imgur Upload - ${clientName}] Using direct Imgur API. Target: ${apiUrl}`);
  }

  try {
      const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
              Authorization: `Client-ID ${clientId}`,
              // Do NOT set 'Content-Type': 'multipart/form-data' when using FormData with fetch.
              // The browser will set it correctly, including the boundary.
          },
          body: formData,
      });

      if (!response.ok) {
          const status = response.status;
          const statusText = response.statusText;
          let errorDetails = "No error details provided by Imgur.";
          let rateLimitInfo = "Rate limit headers not found or N/A.";

          // Attempt to get more detailed error and rate limit headers
          try {
              const errorJson: ImgurErrorResponse = await response.json();
              errorDetails = typeof errorJson.data?.error === 'object'
                  ? errorJson.data.error.message
                  : errorJson.data?.error || JSON.stringify(errorJson);

              if (status === 429) {
                  const userLimit = response.headers.get('X-RateLimit-UserLimit');
                  const userRemaining = response.headers.get('X-RateLimit-UserRemaining');
                  const userReset = response.headers.get('X-RateLimit-UserReset');
                  const clientLimit = response.headers.get('X-RateLimit-ClientLimit');
                  const clientRemaining = response.headers.get('X-RateLimit-ClientRemaining');
                  const postLimit = response.headers.get('X-Post-Rate-Limit-Limit');
                  const postRemaining = response.headers.get('X-Post-Rate-Limit-Remaining');
                  const postReset = response.headers.get('X-Post-Rate-Limit-Reset');
                  const retryAfter = response.headers.get('Retry-After');
                  rateLimitInfo = `User: ${userRemaining || 'N/A'}/${userLimit || 'N/A'} (Reset: ${userReset ? new Date(Number(userReset) * 1000) : 'N/A'}), Client: ${clientRemaining || 'N/A'}/${clientLimit || 'N/A'}, Post: ${postRemaining || 'N/A'}/${postLimit || 'N/A'} (Reset in ${postReset}s), Retry-After: ${retryAfter || 'N/A'}s`;
              }
          } catch (e) {
              console.warn(`[Imgur Upload - ${clientName}] Could not parse error JSON from Imgur for status ${status}.`);
              // errorDetails remains default
          }

          console.error(`[Imgur Upload - ${clientName}] Imgur API Error: ${status} ${statusText}. Details: ${errorDetails}. RateLimitInfo: ${rateLimitInfo}`);
          return null;
      }

      const jsonData: ImgurUploadSuccessResponse = await response.json();

      if (jsonData.success && jsonData.data && jsonData.data.link) {
          console.log(`[Imgur Upload - ${clientName}] Upload Successful! Alley-oop complete! URL: ${jsonData.data.link}`);
          return jsonData.data.link;
      } else {
          console.error(`[Imgur Upload - ${clientName}] Imgur API Error: Response indicates failure or link is missing. Data:`, jsonData);
          return null;
      }
  } catch (error: any) {
      console.error(`[Imgur Upload - ${clientName}] Unexpected error during fetch operation. Error:`, error.name, error.message, error);
      return null;
  }
}

/**
* Module object for consistent service access pattern.
*/
export const imgurServiceModule = {
  uploadImageToImgur,
};

// Make it available on the window and dispatch ready event
(window as any).imgurService = imgurServiceModule;
document.dispatchEvent(new CustomEvent('imgurServiceReady'));
console.log('imgur_service.ts: Stockton & Malone (Imgur service) ready for the pick and roll! "imgurServiceReady" event dispatched.');