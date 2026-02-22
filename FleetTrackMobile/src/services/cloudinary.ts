/**
 * Cloudinary Upload Service (Mobile)
 * Uses unsigned upload (no API secret on mobile)
 * Cloud: dr1ud7cb3
 */

const CLOUD_NAME = 'dr1ud7cb3';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = 'fleettrack_unsigned'; // Must be created in Cloudinary dashboard

export interface UploadResult {
    url: string;
    secureUrl: string;
    publicId: string;
    width: number;
    height: number;
}

/**
 * Upload an image to Cloudinary
 * @param imageUri Local file URI (from expo-image-picker)
 * @param folder Cloudinary folder (e.g. 'trip-confirmations/planId/start')
 */
export async function uploadImage(imageUri: string, folder: string): Promise<UploadResult> {
    const formData = new FormData();

    // Get the file name and type from URI
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
    } as any);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    console.log(`[Cloudinary] Uploading to folder: ${folder}`);

    const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[Cloudinary] Upload failed:', errText);
        throw new Error(`Upload failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log(`[Cloudinary] ✅ Uploaded: ${data.secure_url}`);

    return {
        url: data.url,
        secureUrl: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
    };
}

/**
 * Upload multiple images in parallel
 */
export async function uploadMultiple(
    images: { uri: string; key: string }[],
    folder: string,
    onProgress?: (done: number, total: number) => void
): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    let done = 0;

    for (const img of images) {
        const result = await uploadImage(img.uri, folder);
        results[img.key] = result.secureUrl;
        done++;
        onProgress?.(done, images.length);
    }

    return results;
}

/**
 * Upload a profile image (smaller, different folder)
 */
export async function uploadProfileImage(
    imageUri: string,
    type: 'driver' | 'truck',
    entityId: string
): Promise<string> {
    const folder = `profiles/${type}s`;
    const result = await uploadImage(imageUri, folder);
    return result.secureUrl;
}
