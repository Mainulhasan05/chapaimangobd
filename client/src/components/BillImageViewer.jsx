import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6];
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

const touchDistance = (touches) => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
};

/**
 * Full-screen bill slip viewer with zoom and pan.
 *
 * Bill slips are wide spreadsheet screenshots. Fitting one to a phone screen
 * makes the figures unreadable, so at zoom 1 the whole slip is visible as an
 * overview and any zoom above that turns the surface into a scrollable canvas
 * the customer drags around. Pinch, double tap, the on-screen buttons and the
 * keyboard all drive the same zoom value.
 */
const BillImageViewer = ({ images = [], index = 0, onIndexChange, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [showHint, setShowHint] = useState(true);
  const surfaceRef = useRef(null);
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const lastTapRef = useRef(0);

  const count = images.length;
  const src = images[index];
  const isZoomed = zoom > 1.001;

  // Hold the page still behind the viewer
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Changes the zoom while keeping the point the customer is looking at in
   * place. `anchor` is a viewport coordinate (a tap or pinch centre); without
   * one the centre of the screen is held instead.
   */
  const zoomTo = useCallback((next, anchor) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const el = surfaceRef.current;
    if (!el) {
      setZoom(clamped);
      return;
    }

    const focusX = anchor ? anchor.x : el.clientWidth / 2;
    const focusY = anchor ? anchor.y : el.clientHeight / 2;
    const relX = (el.scrollLeft + focusX) / Math.max(1, el.scrollWidth);
    const relY = (el.scrollTop + focusY) / Math.max(1, el.scrollHeight);

    setZoom(clamped);
    requestAnimationFrame(() => {
      const surface = surfaceRef.current;
      if (!surface) return;
      surface.scrollLeft = relX * surface.scrollWidth - focusX;
      surface.scrollTop = relY * surface.scrollHeight - focusY;
    });
  }, []);

  const stepZoom = (direction) => {
    if (direction > 0) {
      const next = ZOOM_STEPS.find((z) => z > zoom + 0.001);
      zoomTo(next || MAX_ZOOM);
    } else {
      const next = [...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.001);
      zoomTo(next || MIN_ZOOM);
    }
  };

  // Moving to another slip starts it as a full overview again
  const goTo = useCallback(
    (nextIndex) => {
      if (count < 2) return;
      setZoom(1);
      const surface = surfaceRef.current;
      if (surface) {
        surface.scrollLeft = 0;
        surface.scrollTop = 0;
      }
      onIndexChange((nextIndex + count) % count);
    },
    [count, onIndexChange]
  );

  // Pinch to zoom. The listener is attached by hand because it has to be
  // non-passive to stop the browser scrolling mid-gesture.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return undefined;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchRef.current = { distance: touchDistance(e.touches), zoom };
        setShowHint(false);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const ratio = touchDistance(e.touches) / pinchRef.current.distance;
      zoomTo(pinchRef.current.zoom * ratio, { x: midX, y: midY });
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [zoom, zoomTo]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === '+' || e.key === '=') stepZoom(1);
      else if (e.key === '-' || e.key === '_') stepZoom(-1);
      else if (e.key === '0') zoomTo(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Double tap / double click toggles between overview and a readable zoom
  const handleTap = (e) => {
    const now = Date.now();
    const rect = surfaceRef.current?.getBoundingClientRect();
    const anchor = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : undefined;
    if (now - lastTapRef.current < 320) {
      lastTapRef.current = 0;
      setShowHint(false);
      zoomTo(isZoomed ? 1 : 3, anchor);
    } else {
      lastTapRef.current = now;
    }
  };

  // Drag to pan with a mouse; touch panning is native scrolling
  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch' || !isZoomed) return;
    const el = surfaceRef.current;
    if (!el) return;
    panRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const el = surfaceRef.current;
    if (!panRef.current || !el) return;
    el.scrollLeft = panRef.current.left - (e.clientX - panRef.current.x);
    el.scrollTop = panRef.current.top - (e.clientY - panRef.current.y);
  };

  const handlePointerUp = (e) => {
    panRef.current = null;
    surfaceRef.current?.releasePointerCapture?.(e.pointerId);
  };

  if (!src) return null;

  const barButton = {
    background: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: 10,
    width: 42,
    height: 42,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
      {/* Zoomable surface */}
      <div
        ref={surfaceRef}
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          // Leaves pinch to the handler above while keeping native pan
          touchAction: 'pan-x pan-y',
          cursor: isZoomed ? 'grab' : 'zoom-in',
        }}
      >
        <div
          style={{
            width: isZoomed ? `${zoom * 100}%` : '100%',
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isZoomed ? 0 : '64px 8px 84px',
            boxSizing: 'border-box',
          }}
        >
          <img
            src={src}
            alt={`Bill slip ${index + 1}`}
            draggable={false}
            style={
              isZoomed
                ? { width: '100%', maxWidth: 'none', height: 'auto', display: 'block' }
                : {
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 148px)',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }
            }
          />
        </div>
      </div>

      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 12px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0))',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: '0.8125rem',
            fontWeight: 700,
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 20,
            padding: '5px 12px',
          }}
        >
          {count > 1 ? `${index + 1} / ${count} • ` : ''}
          {Math.round(zoom * 100)}%
        </span>

        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...barButton, textDecoration: 'none' }}
            title="আসল ছবি নতুন ট্যাবে খুলুন"
            aria-label="Open original image in a new tab"
          >
            <ExternalLink size={19} />
          </a>
          <button type="button" onClick={onClose} style={barButton} aria-label="Close">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Zoom hint, fades on its own */}
      {showHint && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.72)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 12,
            padding: '10px 16px',
            color: '#fff',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textAlign: 'center',
            pointerEvents: 'none',
            lineHeight: 1.5,
            maxWidth: '82vw',
          }}
        >
          দুইবার ট্যাপ করুন বা পিঞ্চ করে জুম করুন
          <div style={{ fontSize: '0.6875rem', fontWeight: 500, opacity: 0.75, marginTop: 2 }}>
            জুম করার পর আঙুল দিয়ে টেনে সরান
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 10px calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
          flexWrap: 'wrap',
        }}
      >
        {count > 1 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            style={barButton}
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <button
          type="button"
          onClick={() => stepZoom(-1)}
          disabled={zoom <= MIN_ZOOM + 0.001}
          style={{ ...barButton, opacity: zoom <= MIN_ZOOM + 0.001 ? 0.35 : 1 }}
          aria-label="Zoom out"
        >
          <ZoomOut size={20} />
        </button>

        <button
          type="button"
          onClick={() => zoomTo(1)}
          style={{ ...barButton, width: 'auto', padding: '0 14px', gap: 6, fontWeight: 700, fontSize: '0.75rem' }}
          aria-label="Fit to screen"
        >
          <Maximize2 size={16} /> পুরোটা
        </button>

        <button
          type="button"
          onClick={() => stepZoom(1)}
          disabled={zoom >= MAX_ZOOM - 0.001}
          style={{ ...barButton, opacity: zoom >= MAX_ZOOM - 0.001 ? 0.35 : 1 }}
          aria-label="Zoom in"
        >
          <ZoomIn size={20} />
        </button>

        {count > 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            style={barButton}
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
};

export default BillImageViewer;
