export const MIN_INSPECTOR_ZOOM = 1;
export const MAX_INSPECTOR_ZOOM = 6;
export const ZOOM_STEP = 0.5;

export type Size = {
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export function clampInspectorZoom(zoom: number) {
  return Math.min(MAX_INSPECTOR_ZOOM, Math.max(MIN_INSPECTOR_ZOOM, zoom));
}

export function getContainedImageSize(image: Size, stage: Size): Size {
  if (
    image.width <= 0 ||
    image.height <= 0 ||
    stage.width <= 0 ||
    stage.height <= 0
  ) {
    return { width: 0, height: 0 };
  }

  const imageRatio = image.width / image.height;
  const stageRatio = stage.width / stage.height;

  if (imageRatio > stageRatio) {
    return {
      width: stage.width,
      height: stage.width / imageRatio,
    };
  }

  return {
    width: stage.height * imageRatio,
    height: stage.height,
  };
}

export function getMaxPanOffset(displayed: Size, zoom: number): Point {
  const safeZoom = clampInspectorZoom(zoom);
  return {
    x: Math.max(0, (displayed.width * safeZoom - displayed.width) / 2),
    y: Math.max(0, (displayed.height * safeZoom - displayed.height) / 2),
  };
}

export function clampPanOffset(offset: Point, displayed: Size, zoom: number) {
  const bounds = getMaxPanOffset(displayed, zoom);
  return {
    x: Math.min(bounds.x, Math.max(-bounds.x, offset.x)),
    y: Math.min(bounds.y, Math.max(-bounds.y, offset.y)),
  };
}
