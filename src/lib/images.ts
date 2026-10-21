const MAX_EDGE = 768;
const JPEG_QUALITY = 0.62;

function canvasToJpeg(source: CanvasImageSource, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function fit(width: number, height: number): { width: number; height: number } {
  const edge = Math.max(width, height);
  const scale = edge > MAX_EDGE ? MAX_EDGE / edge : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function fileToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = fit(bitmap.width, bitmap.height);
    return canvasToJpeg(bitmap, size.width, size.height);
  } finally {
    bitmap.close();
  }
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("No se pudo leer el video"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    if (Math.abs(video.currentTime - time) < 0.05) {
      cleanup();
      resolve();
      return;
    }
    video.currentTime = time;
  });
}

export async function framesFromVideo(file: File, count = 4): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("El video no se pudo abrir"));
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const times =
      duration > 0.4
        ? Array.from({ length: count }, (_, index) => (duration * (index + 1)) / (count + 1))
        : [0];
    const frames: string[] = [];
    for (const time of times) {
      await seek(video, Math.min(time, Math.max(0, duration - 0.05)));
      const size = fit(video.videoWidth || 640, video.videoHeight || 480);
      frames.push(canvasToJpeg(video, size.width, size.height));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}
