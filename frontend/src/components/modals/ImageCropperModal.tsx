import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "../common/Icon";

interface Props {
  file: File;
  title: string;
  /** "circle" for avatars, "rect" for banners/icons. */
  shape: "circle" | "rect";
  /** width / height of the crop viewport - 1 for a square avatar, 2.5 for the 600x240 banner. */
  aspect: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
// Output resolution multiplier over the on-screen viewport - the backend
// re-encodes/resizes whatever we upload anyway, but starting from a sharper
// source than the CSS viewport avoids visible blur on high-DPI screens.
const EXPORT_SCALE = 3;

// A from-scratch pan/zoom/rotate cropper (no external library) - drag to
// reposition, a slider (plus pinch on touch) to zoom, and 90-degree rotate
// steps. Exports a canvas-rendered PNG blob matching the target aspect
// ratio exactly, so the existing upload endpoints need no changes at all -
// they just receive an already-cropped image instead of a raw photo.
export default function ImageCropperModal({ file, title, shape, aspect, onCancel, onConfirm }: Props) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // degrees, multiple of 90
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchState = useRef<{ startDist: number; startZoom: number } | null>(null);

  const VIEWPORT_W = 280;
  const VIEWPORT_H = Math.round(280 / aspect);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Cover-fit scale for the *current* rotation - a 90/270 rotation swaps
  // which of the image's natural dimensions maps onto the viewport's width
  // vs height, so this has to be recomputed whenever rotation changes, not
  // just once on load.
  const baseScale = useMemo(() => {
    if (!imgEl) return 1;
    const swapped = rotation % 180 !== 0;
    const w = swapped ? imgEl.naturalHeight : imgEl.naturalWidth;
    const h = swapped ? imgEl.naturalWidth : imgEl.naturalHeight;
    return Math.max(VIEWPORT_W / w, VIEWPORT_H / h);
  }, [imgEl, rotation, VIEWPORT_W, VIEWPORT_H]);

  const scale = baseScale * zoom;

  // Re-clamp pan whenever zoom/rotation change the image's on-screen box -
  // otherwise zooming back out (or rotating) can leave the image parked
  // somewhere that now shows empty space past its edge.
  useEffect(() => {
    setPan((p) => clampPan(p, imgEl, scale, rotation, VIEWPORT_W, VIEWPORT_H));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, rotation, imgEl]);

  function clampPan(
    p: { x: number; y: number },
    img: HTMLImageElement | null,
    scale: number,
    rotation: number,
    vw: number,
    vh: number
  ) {
    if (!img) return p;
    const swapped = rotation % 180 !== 0;
    const boxW = (swapped ? img.naturalHeight : img.naturalWidth) * scale;
    const boxH = (swapped ? img.naturalWidth : img.naturalHeight) * scale;
    const maxX = Math.max(0, (boxW - vw) / 2);
    const maxY = Math.max(0, (boxH - vh) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan(clampPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy }, imgEl, scale, rotation, VIEWPORT_W, VIEWPORT_H));
  }
  function onPointerUp() {
    dragState.current = null;
  }

  function touchDist(touches: React.TouchList) {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchState.current = { startDist: touchDist(e.touches), startZoom: zoom };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchState.current) {
      e.preventDefault();
      const ratio = touchDist(e.touches) / pinchState.current.startDist;
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchState.current.startZoom * ratio)));
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchState.current = null;
  }

  function rotateBy(delta: number) {
    setRotation((r) => (r + delta + 360) % 360);
  }

  async function confirm() {
    if (!imgEl) return;
    setExporting(true);
    try {
      const outW = VIEWPORT_W * EXPORT_SCALE;
      const outH = VIEWPORT_H * EXPORT_SCALE;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      const k = EXPORT_SCALE;
      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.translate(pan.x * k, pan.y * k);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * k, scale * k);
      ctx.drawImage(imgEl, -imgEl.naturalWidth / 2, -imgEl.naturalHeight / 2);
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          setExporting(false);
          if (blob) onConfirm(blob);
        },
        "image/png"
      );
    } catch {
      setExporting(false);
    }
  }

  return (
    <div className="cropper-overlay">
      <div className="cropper-card">
        <div className="cropper-header">
          <span>{title}</span>
          <button className="modal-close" onClick={onCancel}><CloseIcon size={14} /></button>
        </div>

        <div
          ref={viewportRef}
          className={`cropper-viewport ${shape === "circle" ? "circle" : ""}`}
          style={{ width: VIEWPORT_W, height: VIEWPORT_H }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imgEl && (
            <img
              src={imgEl.src}
              alt=""
              draggable={false}
              className="cropper-image"
              style={{
                width: imgEl.naturalWidth,
                height: imgEl.naturalHeight,
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})`,
              }}
            />
          )}
        </div>

        <div className="cropper-controls">
          <div className="cropper-zoom-row">
            <span>Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            />
          </div>
          <div className="cropper-rotate-row">
            <button type="button" className="btn btn-secondary" onClick={() => rotateBy(-90)}>Rotate Left</button>
            <button type="button" className="btn btn-secondary" onClick={() => rotateBy(90)}>Rotate Right</button>
          </div>
        </div>

        <div className="cropper-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={exporting}>Cancel</button>
          <button className="btn btn-primary" onClick={confirm} disabled={exporting || !imgEl}>
            {exporting ? "Working…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
