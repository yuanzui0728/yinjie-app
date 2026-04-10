import { useEffect, useRef, useState } from "react";

type CameraPreviewStatus =
  | "idle"
  | "requesting-permission"
  | "ready"
  | "unsupported";

type UseSelfCameraPreviewOptions = {
  enabled: boolean;
};

export function useSelfCameraPreview({ enabled }: UseSelfCameraPreviewOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraPreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const supported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    const stopCurrentStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!supported) {
      stopCurrentStream();
      setStatus("unsupported");
      setError("当前浏览器不支持摄像头预览。");
      return;
    }

    if (!enabled) {
      stopCurrentStream();
      setStatus("idle");
      setError(null);
      return;
    }

    let disposed = false;

    const connect = async () => {
      setStatus("requesting-permission");
      setError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
          audio: false,
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stopCurrentStream();
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => {});
        }

        setStatus("ready");
      } catch (cameraError) {
        if (disposed) {
          return;
        }

        stopCurrentStream();
        setStatus("idle");
        setError(
          cameraError instanceof Error
            ? cameraError.message
            : "无法打开摄像头，请检查浏览器权限。",
        );
      }
    };

    void connect();

    return () => {
      disposed = true;
      stopCurrentStream();
    };
  }, [enabled, supported]);

  return {
    error,
    status,
    supported,
    videoRef,
  };
}
