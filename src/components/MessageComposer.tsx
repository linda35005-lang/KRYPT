import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Lock,
  Flame,
  Clock,
  Eye,
  Mic,
  Square,
  Image,
  Video,
  VideoOff,
  Sparkles,
  X,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  Volume2,
  RefreshCw,
  Check,
  Camera,
  Maximize2,
} from "lucide-react";
import { EphemeralType } from "../types";

interface MessageComposerProps {
  onSendMessage: (payload: {
    text: string;
    mediaType?: "text" | "image" | "audio" | "video";
    mediaData?: string;
    audioDuration?: number;
    videoDuration?: number;
    videoThumbnail?: string;
    ephemeralType: EphemeralType;
    ephemeralDuration?: number;
  }) => Promise<void>;
  currentEphemeralType: EphemeralType;
  currentDuration: number;
  onSelectEphemeral: (type: EphemeralType, duration: number) => void;
  isSimulatedTarget: boolean;
  targetName: string;
  onTyping?: (isTyping: boolean) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  currentEphemeralType,
  currentDuration,
  onSelectEphemeral,
  isSimulatedTarget,
  targetName,
  onTyping,
}) => {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Attached Image state
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isViewOnceMedia, setIsViewOnceMedia] = useState(false);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([
    15, 25, 40, 60, 30, 75, 90, 45, 60, 80, 50, 30, 65, 40, 20, 35,
  ]);
  const [micError, setMicError] = useState<string | null>(null);

  // Voice Review / Preview state
  const [previewAudioBlob, setPreviewAudioBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewDurationSec, setPreviewDurationSec] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [voiceEphemeralType, setVoiceEphemeralType] = useState<EphemeralType>(
    currentEphemeralType === "off" ? "timed" : currentEphemeralType
  );
  const [voiceEphemeralDuration, setVoiceEphemeralDuration] = useState<number>(
    currentEphemeralType === "off" ? 15 : currentDuration
  );

  // Video Memo Recording state
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordSeconds, setVideoRecordSeconds] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [previewVideoBlob, setPreviewVideoBlob] = useState<Blob | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoDurationSec, setPreviewVideoDurationSec] = useState<number>(0);
  const [previewVideoThumbnail, setPreviewVideoThumbnail] = useState<string | null>(null);
  const [isPlayingVideoPreview, setIsPlayingVideoPreview] = useState(false);
  const [videoEphemeralType, setVideoEphemeralType] = useState<EphemeralType>(
    currentEphemeralType === "off" ? "timed" : currentEphemeralType
  );
  const [videoEphemeralDuration, setVideoEphemeralDuration] = useState<number>(
    currentEphemeralType === "off" ? 15 : currentDuration
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const videoRecordIntervalRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Sync ephemeral settings when global changes
  useEffect(() => {
    setVoiceEphemeralType(currentEphemeralType === "off" ? "timed" : currentEphemeralType);
    setVoiceEphemeralDuration(currentEphemeralType === "off" ? 15 : currentDuration);
    setVideoEphemeralType(currentEphemeralType === "off" ? "timed" : currentEphemeralType);
    setVideoEphemeralDuration(currentEphemeralType === "off" ? 15 : currentDuration);
  }, [currentEphemeralType, currentDuration]);

  // Clean up recording & audio resources on unmount
  useEffect(() => {
    return () => {
      stopRecordingResources();
      stopVideoRecordingResources();
      if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
      if (previewVideoUrl) URL.revokeObjectURL(previewVideoUrl);
    };
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (onTyping) {
      onTyping(e.target.value.length > 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if ((!text.trim() && !attachedImage) || isSending) return;

    setIsSending(true);
    try {
      const ephemeralMode: EphemeralType = isViewOnceMedia
        ? "view_once"
        : currentEphemeralType;

      await onSendMessage({
        text: text.trim(),
        mediaType: attachedImage ? "image" : "text",
        mediaData: attachedImage || undefined,
        ephemeralType: ephemeralMode,
        ephemeralDuration:
          ephemeralMode === "timed"
            ? currentDuration
            : ephemeralMode === "burn_on_read"
            ? 5
            : ephemeralMode === "view_once"
            ? 8
            : undefined,
      });

      setText("");
      setAttachedImage(null);
      setIsViewOnceMedia(false);
      if (onTyping) onTyping(false);
    } catch (err) {
      console.error("Failed to send encrypted message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Image Upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate Sample Confidential Snapshot for instant test
  const handleAttachQuickConfidentialPhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, 500, 320);

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 470, 290);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 24px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CLASSIFIED INTEL", 250, 90);

    ctx.fillStyle = "#22C55E";
    ctx.font = "bold 14px monospace";
    ctx.fillText("STATUS: ZERO-KNOWLEDGE VIEW-ONCE", 250, 140);

    ctx.fillStyle = "#71717A";
    ctx.font = "12px monospace";
    ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 250, 190);
    ctx.fillText("SHREDS IN 8 SECONDS UPON CLOSE", 250, 220);

    setAttachedImage(canvas.toDataURL("image/png"));
    setIsViewOnceMedia(true);
  };

  // ----------------------------------------------------
  // VOICE RECORDING FLOW WITH MediaRecorder API & WebAudio
  // ----------------------------------------------------

  const stopRecordingResources = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    setMicError(null);
    clearPreview();
    stopVideoRecordingResources();
    clearVideoPreview();

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicError("Microphone API is not supported in this browser environment.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVisualizer = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const levels: number[] = [];
              const step = Math.max(1, Math.floor(dataArray.length / 16));
              for (let i = 0; i < 16; i++) {
                const val = dataArray[i * step] || 0;
                const pct = Math.min(100, Math.max(15, Math.round((val / 255) * 100)));
                levels.push(pct);
              }
              setAudioLevels(levels);
            }
            animFrameRef.current = requestAnimationFrame(updateVisualizer);
          };

          animFrameRef.current = requestAnimationFrame(updateVisualizer);
        }
      } catch (audioCtxErr) {
        console.warn("Analyser setup warning:", audioCtxErr);
      }

      recorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 120) {
            stopVoiceRecording(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setMicError(
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
          ? "Microphone access denied. Grant permissions in browser bar."
          : "Unable to initialize audio capture device."
      );
      stopRecordingResources();
    }
  };

  const stopVoiceRecording = (goToPreview = true) => {
    if (!mediaRecorderRef.current || !isRecording) return;

    const recorder = mediaRecorderRef.current;
    const finalSeconds = recordSeconds || 1;

    recorder.onstop = () => {
      const mime = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });

      stopRecordingResources();
      setIsRecording(false);

      if (goToPreview && audioBlob.size > 0) {
        const url = URL.createObjectURL(audioBlob);
        setPreviewAudioBlob(audioBlob);
        setPreviewAudioUrl(url);
        setPreviewDurationSec(finalSeconds);
      }
    };

    recorder.stop();
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    stopRecordingResources();
    setIsRecording(false);
    setRecordSeconds(0);
    audioChunksRef.current = [];
  };

  const clearPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
    }
    setPreviewAudioBlob(null);
    setPreviewAudioUrl(null);
    setPreviewDurationSec(0);
    setIsPlayingPreview(false);
    setPreviewCurrentTime(0);
  };

  const handleTogglePreviewPlay = () => {
    if (!previewAudioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(previewAudioUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewCurrentTime(Math.round(audio.currentTime));
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewCurrentTime(0);
      };
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSendVoiceDispatch = async () => {
    if (!previewAudioBlob || isSending) return;

    setIsSending(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const finalEphemeralType = voiceEphemeralType;
        const finalEphemeralDuration =
          finalEphemeralType === "timed"
            ? voiceEphemeralDuration
            : finalEphemeralType === "burn_on_read"
            ? 5
            : undefined;

        await onSendMessage({
          text: "ENCRYPTED VOICE DISPATCH",
          mediaType: "audio",
          mediaData: base64Audio,
          audioDuration: previewDurationSec,
          ephemeralType: finalEphemeralType,
          ephemeralDuration: finalEphemeralDuration,
        });

        clearPreview();
        setIsSending(false);
      };
      reader.readAsDataURL(previewAudioBlob);
    } catch (err) {
      console.error("Failed to encrypt and send voice memo:", err);
      setIsSending(false);
    }
  };

  const handleDirectSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    const recorder = mediaRecorderRef.current;
    const finalSeconds = recordSeconds || 1;

    recorder.onstop = async () => {
      const mime = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      stopRecordingResources();
      setIsRecording(false);

      if (audioBlob.size > 0) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const finalEphemeralType =
            currentEphemeralType === "off" ? "timed" : currentEphemeralType;
          const finalEphemeralDuration =
            finalEphemeralType === "timed"
              ? currentDuration || 15
              : finalEphemeralType === "burn_on_read"
              ? 5
              : undefined;

          await onSendMessage({
            text: "ENCRYPTED VOICE DISPATCH",
            mediaType: "audio",
            mediaData: base64Audio,
            audioDuration: finalSeconds,
            ephemeralType: finalEphemeralType,
            ephemeralDuration: finalEphemeralDuration,
          });
        };
        reader.readAsDataURL(audioBlob);
      }
    };

    recorder.stop();
  };

  const handleSendSyntheticVoice = async () => {
    setMicError(null);
    setIsSending(true);
    try {
      const sampleRate = 8000;
      const duration = 2;
      const numSamples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + numSamples);
      const view = new DataView(buffer);

      const writeStr = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
      };

      writeStr(0, "RIFF");
      view.setUint32(4, 36 + numSamples, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate, true);
      view.setUint16(32, 1, true);
      view.setUint16(34, 8, true);
      writeStr(36, "data");
      view.setUint32(40, numSamples, true);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const freq = 440 + Math.sin(t * 10) * 60;
        const s = 128 + Math.round(45 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 0.7));
        view.setUint8(44 + i, s);
      }

      let bin = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      const dataUri = "data:audio/wav;base64," + window.btoa(bin);

      await onSendMessage({
        text: "ENCRYPTED VOICE DISPATCH (SYNTHETIC TONE)",
        mediaType: "audio",
        mediaData: dataUri,
        audioDuration: 2,
        ephemeralType: currentEphemeralType === "off" ? "timed" : currentEphemeralType,
        ephemeralDuration: currentEphemeralType === "off" ? 15 : currentDuration,
      });
    } catch (e) {
      console.error("Synthetic audio send error:", e);
    } finally {
      setIsSending(false);
    }
  };

  // ----------------------------------------------------
  // VIDEO MEMO RECORDING FLOW WITH WEBCAM & MEDIARECORDER
  // ----------------------------------------------------

  const stopVideoRecordingResources = () => {
    if (videoRecordIntervalRef.current) {
      clearInterval(videoRecordIntervalRef.current);
      videoRecordIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
  };

  const startVideoRecording = async () => {
    setVideoError(null);
    clearVideoPreview();
    stopRecordingResources();
    clearPreview();

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setVideoError("Camera / Video recording API is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: true,
      });
      videoStreamRef.current = stream;

      if (liveVideoPreviewRef.current) {
        liveVideoPreviewRef.current.srcObject = stream;
        liveVideoPreviewRef.current.play().catch(() => {});
      }

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          mimeType = "video/webm;codecs=vp8,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mimeType = "video/webm";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mimeType = "video/mp4";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      videoMediaRecorderRef.current = recorder;
      videoChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.start(200);
      setIsVideoRecording(true);
      setVideoRecordSeconds(0);

      videoRecordIntervalRef.current = window.setInterval(() => {
        setVideoRecordSeconds((prev) => {
          if (prev >= 60) {
            stopVideoRecording(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setVideoError(
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
          ? "Camera / Microphone permission denied. Please enable camera in your browser."
          : "Unable to connect to camera device."
      );
      stopVideoRecordingResources();
    }
  };

  const stopVideoRecording = (goToPreview = true) => {
    if (!videoMediaRecorderRef.current || !isVideoRecording) return;

    const recorder = videoMediaRecorderRef.current;
    const finalSeconds = videoRecordSeconds || 1;

    recorder.onstop = () => {
      const mime = recorder.mimeType || "video/webm";
      const videoBlob = new Blob(videoChunksRef.current, { type: mime });

      stopVideoRecordingResources();
      setIsVideoRecording(false);

      if (goToPreview && videoBlob.size > 0) {
        const url = URL.createObjectURL(videoBlob);
        setPreviewVideoBlob(videoBlob);
        setPreviewVideoUrl(url);
        setPreviewVideoDurationSec(finalSeconds);
      }
    };

    recorder.stop();
  };

  const cancelVideoRecording = () => {
    if (videoMediaRecorderRef.current && isVideoRecording) {
      videoMediaRecorderRef.current.onstop = null;
      try {
        videoMediaRecorderRef.current.stop();
      } catch (e) {}
    }
    stopVideoRecordingResources();
    setIsVideoRecording(false);
    setVideoRecordSeconds(0);
    videoChunksRef.current = [];
  };

  const clearVideoPreview = () => {
    if (reviewVideoRef.current) {
      reviewVideoRef.current.pause();
    }
    if (previewVideoUrl) {
      URL.revokeObjectURL(previewVideoUrl);
    }
    setPreviewVideoBlob(null);
    setPreviewVideoUrl(null);
    setPreviewVideoDurationSec(0);
    setIsPlayingVideoPreview(false);
    setPreviewVideoThumbnail(null);
  };

  const handleSendVideoDispatch = async () => {
    if (!previewVideoBlob || isSending) return;

    setIsSending(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Video = reader.result as string;
        const finalEphemeralType = videoEphemeralType;
        const finalEphemeralDuration =
          finalEphemeralType === "timed"
            ? videoEphemeralDuration
            : finalEphemeralType === "burn_on_read"
            ? 5
            : finalEphemeralType === "view_once"
            ? 8
            : undefined;

        await onSendMessage({
          text: "ENCRYPTED VIDEO DISPATCH",
          mediaType: "video",
          mediaData: base64Video,
          videoDuration: previewVideoDurationSec,
          ephemeralType: finalEphemeralType,
          ephemeralDuration: finalEphemeralDuration,
        });

        clearVideoPreview();
        setIsSending(false);
      };
      reader.readAsDataURL(previewVideoBlob);
    } catch (err) {
      console.error("Failed to encrypt and send video dispatch:", err);
      setIsSending(false);
    }
  };

  // Synthetic video demo generator (for environments without camera hardware)
  const handleSendSyntheticVideo = async () => {
    setVideoError(null);
    setIsSending(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, 480, 360);

      // Radar rings & tactical graphic
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 440, 320);

      ctx.fillStyle = "#22C55E";
      ctx.font = "900 20px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ENCRYPTED VIDEO CLIP", 240, 100);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px monospace";
      ctx.fillText("AES-256-GCM ZERO-KNOWLEDGE STREAM", 240, 160);
      ctx.fillText("OPUS 48kHz ENCODED AUDIO", 240, 200);

      ctx.fillStyle = "#71717A";
      ctx.font = "12px monospace";
      ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 240, 260);

      const dataUri = canvas.toDataURL("image/png");

      await onSendMessage({
        text: "ENCRYPTED VIDEO DISPATCH (TACTICAL CAPTURE)",
        mediaType: "video",
        mediaData: dataUri,
        videoDuration: 3,
        ephemeralType: currentEphemeralType === "off" ? "timed" : currentEphemeralType,
        ephemeralDuration: currentEphemeralType === "off" ? 15 : currentDuration,
      });
    } catch (e) {
      console.error("Synthetic video send error:", e);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const getBurnRateDisplay = () => {
    if (currentEphemeralType === "off") return "MANUAL";
    if (currentEphemeralType === "burn_on_read") return "00:05";
    if (currentEphemeralType === "view_once") return "VIEW-1";
    const mm = String(Math.floor(currentDuration / 60)).padStart(2, "0");
    const ss = String(currentDuration % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <footer
      id="ghosttext-composer-container"
      className="bg-[#0F0F0F] border-t border-white/10 p-4 sm:p-6 lg:px-8 select-none relative"
    >
      {/* Microphone or Camera Error Banner */}
      {(micError || videoError) && (
        <div className="flex items-center justify-between gap-3 p-3 mb-3 rounded-sm bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-mono animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="truncate uppercase font-bold">{micError || videoError}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {videoError ? (
              <button
                type="button"
                id="btn-video-send-synthetic"
                onClick={handleSendSyntheticVideo}
                className="px-2.5 py-1 rounded-sm bg-white text-black font-black text-[10px] uppercase hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                SEND TEST CLIP
              </button>
            ) : (
              <button
                type="button"
                id="btn-voice-send-synthetic"
                onClick={handleSendSyntheticVoice}
                className="px-2.5 py-1 rounded-sm bg-white text-black font-black text-[10px] uppercase hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                SEND TEST TONE
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMicError(null);
                setVideoError(null);
              }}
              className="p-1 text-red-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Attached Media Preview */}
      {attachedImage && (
        <div className="flex items-center gap-3 p-3 mb-3 rounded-sm bg-[#141414] border border-white/20 animate-fade-in">
          <div className="relative w-14 h-14 rounded-xs overflow-hidden border border-white/30 bg-black flex-shrink-0">
            <img
              src={attachedImage}
              alt="Attachment preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-white">
                ENCRYPTED MEDIA ATTACHMENT
              </span>
              <button
                type="button"
                onClick={() => setIsViewOnceMedia(!isViewOnceMedia)}
                className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase transition-colors border cursor-pointer ${
                  isViewOnceMedia
                    ? "bg-purple-600 text-white border-purple-400"
                    : "bg-black text-zinc-400 border-white/20 hover:text-white"
                }`}
              >
                {isViewOnceMedia ? "VIEW-ONCE ACTIVE" : "SET VIEW-ONCE"}
              </button>
            </div>
            <p className="text-[10px] font-mono uppercase text-zinc-500 truncate mt-0.5">
              {isViewOnceMedia
                ? "SHREDS FROM STORAGE IMMEDIATELY UPON CLOSING VIEWER"
                : "AES-256-GCM ENCRYPTED PAYLOAD"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="p-1.5 rounded-sm text-zinc-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 1. ACTIVE LIVE VIDEO MEMO RECORDING VIEWFINDER              */}
      {/* ----------------------------------------------------------- */}
      {isVideoRecording ? (
        <div
          id="ghosttext-video-recording-panel"
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-sm bg-purple-950/40 border-2 border-purple-500/70 animate-fade-in shadow-2xl"
        >
          {/* Live Camera Viewfinder Thumbnail */}
          <div className="relative w-36 h-28 sm:w-44 sm:h-32 rounded-sm bg-black border-2 border-purple-400 overflow-hidden flex-shrink-0 shadow-lg">
            <video
              ref={liveVideoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600 rounded-xs text-[8px] font-mono font-black text-white uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              <span>REC</span>
            </div>
          </div>

          {/* Center Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-black text-purple-300 uppercase tracking-wider">
                RECORDING ENCRYPTED VIDEO MEMO
              </span>
            </div>
            <div className="text-2xl font-mono font-black text-white tracking-widest">
              {formatTimer(videoRecordSeconds)}
              <span className="text-xs text-zinc-500 font-normal"> / 01:00</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-400 uppercase">
              VP9/VP8 ENCODED WITH OPUS STEREO SOUND
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              id="btn-video-cancel-recording"
              onClick={cancelVideoRecording}
              className="px-3 py-2 rounded-sm bg-[#141414] border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white font-mono font-black text-xs uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DISCARD</span>
            </button>

            <button
              type="button"
              id="btn-video-stop-and-review"
              onClick={() => stopVideoRecording(true)}
              className="px-4 py-2 rounded-sm bg-purple-600 text-white hover:bg-purple-500 font-mono font-black text-xs uppercase transition-all flex items-center gap-1.5 shadow-xl cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>REVIEW & SEND</span>
            </button>
          </div>
        </div>
      ) : previewVideoBlob && previewVideoUrl ? (
        /* ----------------------------------------------------------- */
        /* 2. VIDEO MEMO REVIEW & PREVIEW PANEL                      */
        /* ----------------------------------------------------------- */
        <div
          id="ghosttext-video-preview-panel"
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-sm bg-[#141414] border-2 border-purple-500/60 animate-fade-in shadow-2xl"
        >
          {/* Review Video Element */}
          <div className="relative w-36 h-28 sm:w-44 sm:h-32 rounded-sm bg-black border border-white/20 overflow-hidden flex-shrink-0 shadow-lg group">
            <video
              ref={reviewVideoRef}
              src={previewVideoUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Center Details & Ephemeral Option */}
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">
              <Video className="w-3.5 h-3.5" />
              <span>VIDEO DISPATCH READY ({previewVideoDurationSec}S)</span>
            </span>
            <div className="text-xs font-mono text-zinc-300">
              AES-256-GCM STREAM ENCRYPTION
            </div>

            {/* Per-Video Ephemeral Selector */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setVideoEphemeralType("view_once")}
                className={`px-2 py-1 rounded-xs text-[10px] font-mono font-bold uppercase transition-colors border cursor-pointer ${
                  videoEphemeralType === "view_once"
                    ? "bg-purple-600 text-white border-purple-400"
                    : "bg-black text-zinc-400 border-white/20 hover:text-white"
                }`}
              >
                👁️ VIEW ONCE
              </button>
              <button
                type="button"
                onClick={() => {
                  setVideoEphemeralType("timed");
                  setVideoEphemeralDuration(15);
                }}
                className={`px-2 py-1 rounded-xs text-[10px] font-mono font-bold uppercase transition-colors border cursor-pointer ${
                  videoEphemeralType === "timed" && videoEphemeralDuration === 15
                    ? "bg-white text-black"
                    : "bg-black text-zinc-400 border-white/20 hover:text-white"
                }`}
              >
                ⏱️ 15S BURN
              </button>
              <button
                type="button"
                onClick={() => {
                  setVideoEphemeralType("timed");
                  setVideoEphemeralDuration(60);
                }}
                className={`px-2 py-1 rounded-xs text-[10px] font-mono font-bold uppercase transition-colors border cursor-pointer ${
                  videoEphemeralType === "timed" && videoEphemeralDuration === 60
                    ? "bg-white text-black"
                    : "bg-black text-zinc-400 border-white/20 hover:text-white"
                }`}
              >
                ⏱️ 60S BURN
              </button>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              id="btn-video-discard-preview"
              onClick={clearVideoPreview}
              title="Discard Video"
              className="p-2 rounded-sm bg-[#141414] border border-white/20 text-zinc-400 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-video-rerecord"
              onClick={() => {
                clearVideoPreview();
                startVideoRecording();
              }}
              title="Re-record Video Memo"
              className="p-2 rounded-sm bg-[#141414] border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-video-send-dispatch"
              onClick={handleSendVideoDispatch}
              disabled={isSending}
              className="px-4 py-2 rounded-sm bg-purple-500 hover:bg-purple-400 text-white font-mono font-black text-xs uppercase transition-all flex items-center gap-1.5 shadow-xl disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 fill-white" />
              <span>{isSending ? "ENCRYPTING..." : "SEND VIDEO"}</span>
            </button>
          </div>
        </div>
      ) : isRecording ? (
        /* ----------------------------------------------------------- */
        /* 3. ACTIVE VOICE RECORDING BAR (LIVE WAVEFORM & TIMER)      */
        /* ----------------------------------------------------------- */
        <div
          id="ghosttext-voice-recording-panel"
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-sm bg-red-950/30 border-2 border-red-500/60 animate-fade-in shadow-2xl"
        >
          {/* Left: Recording indicator & Live time */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex items-center justify-center">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping absolute"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 relative"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                <span>RECORDING ENCRYPTED AUDIO</span>
              </span>
              <span className="text-xl font-mono font-black text-white tracking-widest">
                {formatTimer(recordSeconds)}
                <span className="text-xs text-zinc-500 font-normal"> / 02:00</span>
              </span>
            </div>
          </div>

          {/* Center: Live Soundwave Amplitude Visualizer */}
          <div className="flex items-center gap-1 sm:gap-1.5 h-10 px-4 py-1 bg-black/50 border border-white/10 rounded-sm w-full sm:w-auto flex-1 max-w-md justify-center">
            {audioLevels.map((lvl, idx) => (
              <div
                key={idx}
                className="w-1.5 sm:w-2 bg-red-500 rounded-xs transition-all duration-75"
                style={{
                  height: `${lvl}%`,
                  opacity: Math.max(0.4, lvl / 100),
                }}
              ></div>
            ))}
          </div>

          {/* Right: Actions (Cancel, Review, Direct Send) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="btn-voice-cancel-recording"
              onClick={cancelVoiceRecording}
              title="Discard Recording (Zero Memory)"
              className="px-3 py-2 rounded-sm bg-[#141414] border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white font-mono font-black text-xs uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DISCARD</span>
            </button>

            <button
              type="button"
              id="btn-voice-review-recording"
              onClick={() => stopVoiceRecording(true)}
              title="Stop & Listen to Recording Before Encrypting"
              className="px-3 py-2 rounded-sm bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black font-mono font-black text-xs uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>REVIEW</span>
            </button>

            <button
              type="button"
              id="btn-voice-send-direct"
              onClick={handleDirectSendRecording}
              title="Encrypt with AES-GCM & Send Dispatch Immediately"
              className="px-4 py-2 rounded-sm bg-green-500 text-black hover:bg-green-400 font-mono font-black text-xs uppercase transition-all flex items-center gap-1.5 shadow-lg cursor-pointer hover:scale-105"
            >
              <Send className="w-3.5 h-3.5 fill-black" />
              <span>ENCRYPT & SEND</span>
            </button>
          </div>
        </div>
      ) : previewAudioBlob && previewAudioUrl ? (
        /* ----------------------------------------------------------- */
        /* 4. VOICE MEMO REVIEW & PLAYBACK PANEL                     */
        /* ----------------------------------------------------------- */
        <div
          id="ghosttext-voice-preview-panel"
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-sm bg-[#141414] border-2 border-green-500/50 animate-fade-in shadow-2xl"
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              id="btn-voice-preview-toggle-play"
              onClick={handleTogglePreviewPlay}
              title={isPlayingPreview ? "Pause Audio Preview" : "Play Audio Preview"}
              className="w-10 h-10 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center font-bold transition-transform hover:scale-105 cursor-pointer flex-shrink-0"
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-green-400" />
                <span>VOICE NOTE READY ({previewDurationSec}S)</span>
              </span>
              <span className="text-base font-mono font-bold text-white tracking-wider">
                {formatTimer(previewCurrentTime)} / {formatTimer(previewDurationSec)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 h-8 px-4 bg-black/60 border border-white/10 rounded-sm flex-1 max-w-sm justify-center">
            {[35, 60, 85, 50, 25, 75, 95, 45, 65, 90, 40, 70, 80, 55, 30, 60, 40, 20].map(
              (lvl, idx) => {
                const progressRatio =
                  previewDurationSec > 0 ? previewCurrentTime / previewDurationSec : 0;
                const barRatio = idx / 18;
                const isPassed = barRatio <= progressRatio;

                return (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-xs transition-all ${
                      isPassed
                        ? "bg-green-400"
                        : isPlayingPreview
                        ? "bg-zinc-400 animate-pulse"
                        : "bg-zinc-700"
                    }`}
                    style={{ height: `${lvl}%` }}
                  ></div>
                );
              }
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <div className="relative group">
              <button
                type="button"
                id="btn-voice-ephemeral-select"
                title="Configure Ephemeral Destruction Timer for this Voice Dispatch"
                className="px-2.5 py-1.5 rounded-sm bg-black border border-white/20 text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span>
                  {voiceEphemeralType === "burn_on_read"
                    ? "BURN-ON-READ"
                    : voiceEphemeralType === "timed"
                    ? `${voiceEphemeralDuration}S AUTO-BURN`
                    : "NO AUTO-BURN"}
                </span>
              </button>

              <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#0A0A0A] border border-white/20 rounded-sm p-1 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-30 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEphemeralType("burn_on_read");
                    setVoiceEphemeralDuration(5);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors cursor-pointer ${
                    voiceEphemeralType === "burn_on_read"
                      ? "bg-white text-black"
                      : "text-amber-400 hover:bg-white/10"
                  }`}
                >
                  🔥 BURN ON READ (5S)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEphemeralType("timed");
                    setVoiceEphemeralDuration(10);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors cursor-pointer ${
                    voiceEphemeralType === "timed" && voiceEphemeralDuration === 10
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  ⏱️ 10S AUTO-BURN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEphemeralType("timed");
                    setVoiceEphemeralDuration(30);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors cursor-pointer ${
                    voiceEphemeralType === "timed" && voiceEphemeralDuration === 30
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  ⏱️ 30S AUTO-BURN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEphemeralType("timed");
                    setVoiceEphemeralDuration(60);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors cursor-pointer ${
                    voiceEphemeralType === "timed" && voiceEphemeralDuration === 60
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  ⏱️ 60S AUTO-BURN
                </button>
              </div>
            </div>

            <button
              type="button"
              id="btn-voice-discard-preview"
              onClick={clearPreview}
              title="Discard recording"
              className="p-2 rounded-sm bg-[#141414] border border-white/20 text-zinc-400 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-voice-rerecord"
              onClick={() => {
                clearPreview();
                startVoiceRecording();
              }}
              title="Re-record voice note"
              className="p-2 rounded-sm bg-[#141414] border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-voice-send-preview"
              onClick={handleSendVoiceDispatch}
              disabled={isSending}
              title="Encrypt & Transmit Voice Note"
              className="px-4 py-2 rounded-sm bg-white text-black font-mono font-black text-xs uppercase hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-xl disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 fill-black" />
              <span>{isSending ? "ENCRYPTING..." : "SEND ENCRYPTED"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------- */
        /* 5. STANDARD TEXT / ATTACHMENT COMPOSER ROW                */
        /* ----------------------------------------------------------- */
        <div className="flex items-center gap-4 sm:gap-6">
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="text-2xl sm:text-3xl font-black text-zinc-600 select-none">
              &gt;
            </span>

            <input
              id="input-message-text"
              type="text"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="TYPE SECURE MESSAGE..."
              className="bg-transparent border-none outline-none text-lg sm:text-2xl font-bold tracking-tight w-full placeholder:text-zinc-800 uppercase text-white font-sans"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                id="btn-composer-attach-file"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Encrypted Photo/Media"
                className="p-2 rounded-sm bg-[#141414] border border-white/15 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Image className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="btn-composer-quick-snapshot"
                onClick={handleAttachQuickConfidentialPhoto}
                title="Attach Classified Snapshot"
                className="p-2 rounded-sm bg-[#141414] border border-white/15 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Video Memo Record Trigger */}
              <button
                type="button"
                id="btn-composer-video-record"
                onClick={startVideoRecording}
                title="Record Encrypted Video Memo (Webcam & AES-GCM)"
                className="p-2 rounded-sm bg-[#141414] border border-white/15 text-purple-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Video className="w-4 h-4 text-purple-400" />
              </button>

              {/* Voice Record trigger button */}
              <button
                type="button"
                id="btn-composer-voice-record"
                onClick={startVoiceRecording}
                title="Record Ephemeral Voice Memo"
                className="p-2 rounded-sm bg-[#141414] border border-white/15 text-green-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Mic className="w-4 h-4 text-green-400" />
              </button>
            </div>

            {/* Mobile Video Memo Record Trigger */}
            <button
              type="button"
              id="btn-composer-video-record-mobile"
              onClick={startVideoRecording}
              title="Record Video Memo"
              className="sm:hidden p-2 rounded-sm bg-[#141414] border border-white/15 text-purple-400 hover:text-white cursor-pointer"
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Mobile Voice Record trigger */}
            <button
              type="button"
              id="btn-composer-voice-record-mobile"
              onClick={startVoiceRecording}
              title="Record Voice Memo"
              className="sm:hidden p-2 rounded-sm bg-[#141414] border border-white/15 text-green-400 hover:text-white cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Burn Rate Stat Indicator */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase text-zinc-600 tracking-tighter">
                Burn Rate
              </span>
              <span className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
                {getBurnRateDisplay()}
              </span>
            </div>

            {/* Send Button */}
            <button
              type="button"
              id="btn-send-encrypted-message"
              onClick={handleSubmit}
              disabled={isSending || (!text.trim() && !attachedImage)}
              className="h-12 w-12 sm:h-14 sm:w-14 bg-white text-black flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100 shadow-xl flex-shrink-0 cursor-pointer"
              title="Send End-to-End Encrypted Message"
            >
              <Send className="w-5 h-5 fill-black ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
