import { useEffect, useId, useRef, useState } from 'react';
import {
  CAMERA_PERMISSION_COPY,
  requestCameraPermission,
} from '../lib/camera-permission.js';

/** Mobile / tablet: camera + upload. Desktop: file upload only. */
function useMobileDocCapture() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px), (pointer: coarse)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile;
}

/**
 * KYC image picker
 * - Desktop: file upload only
 * - Mobile: Take photo (camera) or Upload from gallery
 * @param {'environment'|'user'} facing — rear for ID docs, front for selfie
 */
export function KycDocField({
  id,
  label,
  file,
  onChange,
  facing = 'environment',
  required = false,
  accept = 'image/jpeg,image/png,image/webp',
}) {
  const isMobile = useMobileDocCapture();
  const baseId = useId();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [permHint, setPermHint] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (list) => {
    const next = list?.[0] || null;
    onChange(next);
    setPermHint('');
  };

  const openGallery = () => galleryRef.current?.click();

  const openCamera = async () => {
    setPermHint('');
    const result = await requestCameraPermission({ facingMode: facing });
    if (!result.ok && result.code === 'DENIED') {
      setPermHint(CAMERA_PERMISSION_COPY.DENIED);
      return;
    }
    if (!result.ok && result.code === 'NO_CAMERA') {
      setPermHint(CAMERA_PERMISSION_COPY.NO_CAMERA);
      openGallery();
      return;
    }
    cameraRef.current?.click();
  };

  return (
    <div id={id} className="capply-field capply-doc">
      <span className="capply-field__label">
        {label}
        {required ? ' *' : ''}
      </span>

      {previewUrl ? (
        <div className="capply-doc__preview">
          <img src={previewUrl} alt="" className="capply-doc__img" />
          <p className="capply-doc__filename">{file?.name}</p>
          <button
            type="button"
            className="portal-btn-link capply-doc__clear"
            onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      ) : isMobile ? (
        <div className="capply-doc__actions">
          <button type="button" className="portal-btn-secondary capply-doc__btn" onClick={openCamera}>
            Take photo
          </button>
          <button type="button" className="portal-btn-secondary capply-doc__btn" onClick={openGallery}>
            Upload
          </button>
        </div>
      ) : (
        <div className="capply-doc__actions capply-doc__actions--solo">
          <button type="button" className="portal-btn-secondary capply-doc__btn" onClick={openGallery}>
            Choose file
          </button>
        </div>
      )}

      {permHint ? <p className="capply-doc__hint" role="status">{permHint}</p> : null}

      {isMobile ? (
        <input
          id={`${baseId}-camera`}
          ref={cameraRef}
          className="capply-doc__input"
          type="file"
          accept="image/*"
          capture={facing}
          onChange={(e) => {
            pickFile(e.target.files);
            e.target.value = '';
          }}
        />
      ) : null}

      <input
        id={`${baseId}-gallery`}
        ref={galleryRef}
        className="capply-doc__input"
        type="file"
        accept={accept}
        onChange={(e) => {
          pickFile(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
