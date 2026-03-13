"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  CircleX,
  Crosshair,
  Minus,
  Plus,
  ScanSearch,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clampInspectorZoom,
  clampPanOffset,
  getContainedImageSize,
  type Point,
  type Size,
  MIN_INSPECTOR_ZOOM,
  ZOOM_STEP,
} from "./post-image-inspector-utils";

type PostImageInspectorProps = {
  alt: string;
  className?: string;
  src: string;
};

const MAGNIFIER_SIZE = 180;
const MAGNIFIER_ZOOM = 2.5;
const KEYBOARD_PAN_STEP = 40;

export function PostImageInspector({
  alt,
  className,
  src,
}: PostImageInspectorProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<Point | null>(null);
  const dragOriginRef = useRef<Point>({ x: 0, y: 0 });

  const [displayedSize, setDisplayedSize] = useState<Size>({
    width: 0,
    height: 0,
  });
  const [imageSize, setImageSize] = useState<Size>({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState<Size>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isPrecisePointer, setIsPrecisePointer] = useState(false);
  const [magnifierEnabled, setMagnifierEnabled] = useState(true);
  const [pointerPosition, setPointerPosition] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_INSPECTOR_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const updatePointerPrecision = () =>
      setIsPrecisePointer(mediaQuery.matches);

    updatePointerPrecision();
    mediaQuery.addEventListener("change", updatePointerPrecision);
    return () =>
      mediaQuery.removeEventListener("change", updatePointerPrecision);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updateDisplayedSize = () => {
      const stage = stageRef.current;
      if (!stage || imageSize.width === 0 || imageSize.height === 0) return;

      const rect = stage.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
      setDisplayedSize(
        getContainedImageSize(imageSize, {
          width: rect.width,
          height: rect.height,
        })
      );
    };

    updateDisplayedSize();
    window.addEventListener("resize", updateDisplayedSize);
    return () => window.removeEventListener("resize", updateDisplayedSize);
  }, [imageSize, isOpen]);

  useEffect(() => {
    setOffset((currentOffset) =>
      clampPanOffset(currentOffset, displayedSize, zoom)
    );
  }, [displayedSize, zoom]);

  const openInspector = () => {
    setIsOpen(true);
    setZoom(MIN_INSPECTOR_ZOOM);
    setOffset({ x: 0, y: 0 });
    setIsPointerInside(false);
  };

  const closeInspector = () => {
    setIsOpen(false);
    setIsDragging(false);
  };

  const updateZoom = (nextZoom: number) => {
    const clamped = clampInspectorZoom(nextZoom);
    setZoom(clamped);
    if (clamped === MIN_INSPECTOR_ZOOM) {
      setOffset({ x: 0, y: 0 });
    } else {
      setOffset((currentOffset) =>
        clampPanOffset(currentOffset, displayedSize, clamped)
      );
    }
  };

  const updatePointerPosition = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    setPointerPosition({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleStagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom <= MIN_INSPECTOR_ZOOM) return;
    event.preventDefault();
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragOriginRef.current = offset;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleStagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    updatePointerPosition(event.clientX, event.clientY);

    if (!isDragging || !dragStartRef.current) return;

    const delta = {
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    };
    setOffset(
      clampPanOffset(
        {
          x: dragOriginRef.current.x + delta.x,
          y: dragOriginRef.current.y + delta.y,
        },
        displayedSize,
        zoom
      )
    );
  };

  const handleStagePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeInspector();
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      updateZoom(zoom + ZOOM_STEP);
      return;
    }

    if (event.key === "-") {
      event.preventDefault();
      updateZoom(zoom - ZOOM_STEP);
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      updateZoom(MIN_INSPECTOR_ZOOM);
      return;
    }

    if (zoom <= MIN_INSPECTOR_ZOOM) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setOffset((currentOffset) =>
        clampPanOffset(
          { x: currentOffset.x + KEYBOARD_PAN_STEP, y: currentOffset.y },
          displayedSize,
          zoom
        )
      );
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setOffset((currentOffset) =>
        clampPanOffset(
          { x: currentOffset.x - KEYBOARD_PAN_STEP, y: currentOffset.y },
          displayedSize,
          zoom
        )
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOffset((currentOffset) =>
        clampPanOffset(
          { x: currentOffset.x, y: currentOffset.y + KEYBOARD_PAN_STEP },
          displayedSize,
          zoom
        )
      );
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOffset((currentOffset) =>
        clampPanOffset(
          { x: currentOffset.x, y: currentOffset.y - KEYBOARD_PAN_STEP },
          displayedSize,
          zoom
        )
      );
    }
  };

  const magnifierVisible =
    isOpen &&
    magnifierEnabled &&
    isPrecisePointer &&
    !isDragging &&
    zoom === MIN_INSPECTOR_ZOOM &&
    isPointerInside &&
    displayedSize.width > 0 &&
    displayedSize.height > 0;

  const imageFrame = {
    left: (stageSize.width - displayedSize.width) / 2,
    top: (stageSize.height - displayedSize.height) / 2,
    width: displayedSize.width,
    height: displayedSize.height,
  };
  const pointerWithinImage =
    pointerPosition.x >= imageFrame.left &&
    pointerPosition.x <= imageFrame.left + imageFrame.width &&
    pointerPosition.y >= imageFrame.top &&
    pointerPosition.y <= imageFrame.top + imageFrame.height;
  const magnifierActive = magnifierVisible && pointerWithinImage;
  const relativePointer = {
    x: pointerPosition.x - imageFrame.left,
    y: pointerPosition.y - imageFrame.top,
  };

  return (
    <>
      <div className={cn(className)}>
        <figure className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          <img
            src={src}
            alt={alt}
            className="max-h-[70vh] w-full object-contain"
            onLoad={(event) =>
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
          />
        </figure>
        <div className="mt-3 flex flex-col gap-3 rounded-[1.3rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <Search className="h-4 w-4 text-sky-300" />
            Inspect star shapes, gradients, and noise without leaving the page.
          </p>
          <Button
            ref={triggerRef}
            type="button"
            onClick={openInspector}
            className="bg-sky-500 text-slate-950 hover:bg-sky-400"
          >
            <ScanSearch className="h-4 w-4" />
            Inspect Image
          </Button>
        </div>
      </div>

      {isOpen && (
        <div
          aria-label="Image inspection"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md"
          role="dialog"
          onKeyDown={handleDialogKeyDown}
        >
          <div className="flex h-full flex-col px-4 py-4 sm:px-6 sm:py-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)]">
              <div>
                <p className="font-medium text-white">Inspection mode</p>
                <p className="text-slate-400">
                  Use +/- to zoom, arrow keys to pan, and Escape to close.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={magnifierEnabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setMagnifierEnabled((current) => !current)}
                  disabled={!isPrecisePointer}
                >
                  <Crosshair className="h-4 w-4" />
                  Magnifier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => updateZoom(zoom - ZOOM_STEP)}
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-16 text-center font-mono text-sm text-white">
                  {zoom.toFixed(1)}x
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => updateZoom(zoom + ZOOM_STEP)}
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateZoom(1)}
                >
                  Reset
                </Button>
                <Button
                  ref={closeButtonRef}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeInspector}
                >
                  <CircleX className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>

            <div
              ref={stageRef}
              className={cn(
                "relative flex-1 overflow-hidden rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]",
                zoom > MIN_INSPECTOR_ZOOM
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-crosshair"
              )}
              onPointerDown={handleStagePointerDown}
              onPointerEnter={(event) => {
                setIsPointerInside(true);
                updatePointerPosition(event.clientX, event.clientY);
              }}
              onPointerLeave={() => setIsPointerInside(false)}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerCancel={handleStagePointerUp}
            >
              {displayedSize.width > 0 && displayedSize.height > 0 && (
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: displayedSize.width,
                    height: displayedSize.height,
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                >
                  <img
                    src={src}
                    alt={alt}
                    className="h-full w-full select-none object-contain"
                    draggable={false}
                  />
                </div>
              )}

              {magnifierActive && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute overflow-hidden rounded-full border border-sky-300/60 shadow-[0_0_0_1px_rgba(10,15,30,0.8),0_18px_50px_-24px_rgba(56,189,248,0.75)]"
                  style={{
                    width: MAGNIFIER_SIZE,
                    height: MAGNIFIER_SIZE,
                    left: pointerPosition.x - MAGNIFIER_SIZE / 2,
                    top: pointerPosition.y - MAGNIFIER_SIZE / 2,
                    backgroundColor: "rgba(2,6,23,0.82)",
                    backgroundImage: `url(${src})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${displayedSize.width * MAGNIFIER_ZOOM}px ${displayedSize.height * MAGNIFIER_ZOOM}px`,
                    backgroundPositionX:
                      MAGNIFIER_SIZE / 2 - relativePointer.x * MAGNIFIER_ZOOM,
                    backgroundPositionY:
                      MAGNIFIER_SIZE / 2 - relativePointer.y * MAGNIFIER_ZOOM,
                  }}
                />
              )}

              <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
                {zoom > MIN_INSPECTOR_ZOOM
                  ? "Drag or use arrow keys to pan the zoomed frame."
                  : isPrecisePointer
                    ? "Hover for the magnifier, or zoom in for manual panning."
                    : "Tap zoom controls, then drag to inspect local detail."}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
