/**
 * Camera permission helpers for KYC document / selfie capture.
 * File inputs with `capture` use the OS picker; getUserMedia primes browser permission.
 */

export async function getCameraPermissionState() {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'camera' });
    return status.state; // granted | denied | prompt
  } catch {
    return 'unknown';
  }
}

/** Request camera access once, then release tracks (triggers the browser prompt). */
export async function requestCameraPermission({ facingMode = 'environment' } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, code: 'UNSUPPORTED' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facingMode } },
    });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, code: 'GRANTED' };
  } catch (err) {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { ok: false, code: 'DENIED' };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return { ok: false, code: 'NO_CAMERA' };
    }
    return { ok: false, code: 'ERROR', message: err?.message || String(err) };
  }
}

export const CAMERA_PERMISSION_COPY = {
  DENIED:
    'Camera access is blocked. Enable camera for this site in browser settings, then try again.',
  NO_CAMERA: 'No camera was found on this device. You can upload a photo from your gallery instead.',
  UNSUPPORTED: 'This browser cannot open the camera. Upload a photo from your gallery instead.',
  ERROR: 'Could not open the camera. Try uploading a photo from your gallery.',
};
