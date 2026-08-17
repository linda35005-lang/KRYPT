import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  ShieldCheck,
  Lock,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Activity,
  Radio,
  Sparkles,
  Zap,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { ActiveCallSession, Contact, UserIdentity } from "../types";
import {
  playCallConnectedSound,
  playCallEndedSound,
  startCallRingingSound,
  stopCallRingingSound,
} from "../lib/soundFx";

interface VideoCallModalProps {
  session: ActiveCallSession | null;
  currentUser: UserIdentity;
  onEndCall: () => void;
  onAcceptCall: (type?: "video" | "audio") => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  soundAlertsEnabled: boolean;
  soundVolume: number;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  session,
  currentUser,
  onEndCall,
  onAcceptCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  soundAlertsEnabled,
  soundVolume,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [syntheticVisualizerLevels, setSyntheticVisualizerLevels] = useState<number[]>([
    25, 45, 65, 80, 40, 90, 70, 50, 85, 60, 30, 75,
  ]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  if (!session || session.status === "idle") return null;

  // Handle ringing sounds
  useEffect(() => {
    if (session.status === "ringing" || session.status === "dialing") {
      if (soundAlertsEnabled) {
        startCallRingingSound(soundVolume);
      }
    } else {
      stopCallRingingSound();
    }

    if (session.status === "connected") {
      if (soundAlertsEnabled) {
        playCallConnectedSound(soundVolume);
      }
    }

    return () => {
      stopCallRingingSound();
    };
  }, [session.status, soundAlertsEnabled, soundVolume]);

  // Duration Timer for active call
  useEffect(() => {
    let interval: number | null = null;
    if (session.status === "connected") {
      interval = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.status]);

  // Dynamic simulated telemetry frequency visualizer
  useEffect(() => {
    if (session.status !== "connected") return;

    const interval = window.setInterval(() => {
      setSyntheticVisualizerLevels((prev) =>
        prev.map(() => Math.floor(Math.random() * 75 + 20))
      );
    }, 120);

    return () => clearInterval(interval);
  }, [session.status]);

  // Initialize Local Media Stream (Camera & Mic) when active/accepted
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startLocalMedia = async () => {
      setCameraError(null);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera / WebRTC API is restricted in this container.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: session.type === "video" && !session.isVideoOff,
          audio: true,
        });

        activeStream = stream;
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        // Set up real audio analyser for local microphone
        try {
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            const ctx = new AudioCtxClass();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);
            analyserRef.current = analyser;
          }
        } catch (e) {
          // ignore audio context warning
        }
      } catch (err: any) {
        console.warn("Local media stream acquisition notice:", err);
        setCameraError("Local camera preview unavailable. Using simulated zero-knowledge HUD.");
      }
    };

    if (session.status === "connected" || (session.status === "dialing" && session.type === "video")) {
      startLocalMedia();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, [session.status, session.type]);

  // Toggle video track when session.isVideoOff changes
  useEffect(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !session.isVideoOff;
      });
    }
  }, [session.isVideoOff, localStream]);

  // Toggle audio track when session.isMuted changes
  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !session.isMuted;
      });
    }
  }, [session.isMuted, localStream]);

  // Handle Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTimer = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Safe End Call handler
  const handleTerminateCall = () => {
    if (soundAlertsEnabled) {
      playCallEndedSound(soundVolume);
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    onEndCall();
  };

  return (
    <div
      id="modal-active-call-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-2xl animate-fade-in font-sans select-none overflow-hidden"
    >
      <div
        ref={modalContainerRef}
        className="relative w-full max-w-4xl h-[92vh] max-h-[800px] bg-[#0A0A0A] border-2 border-white/20 rounded-sm shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Header HUD Bar */}
        <div className="p-3.5 sm:p-4 bg-[#0F0F0F] border-b border-white/10 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-white text-black flex items-center justify-center font-black flex-shrink-0">
              {session.type === "video" ? (
                <Video className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base text-white tracking-tight uppercase truncate">
                  {session.peerName}
                </span>
                <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30 uppercase flex-shrink-0">
                  E2EE {session.type.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest truncate">
                FP: {session.peerFingerprint?.slice(0, 16) || "AUTHENTICATED ECDH"}...
              </p>
            </div>
          </div>

          {/* Right Status & Fullscreen toggle */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {session.status === "connected" && (
              <div className="flex items-center gap-2 px-3 py-1 bg-black border border-white/10 rounded-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                <span className="font-mono text-xs font-bold text-white tracking-widest">
                  {formatTimer(callDuration)}
                </span>
              </div>
            )}

            <button
              type="button"
              id="btn-call-toggle-fullscreen"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-sm bg-[#141414] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Toggle Fullscreen View"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: INCOMING CALL RINGING SCREEN                */}
        {/* ---------------------------------------------------- */}
        {session.status === "ringing" && session.isIncoming ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 relative overflow-hidden bg-gradient-to-b from-[#0F0F0F] to-[#050505]">
            {/* Animated Radar Pulse Rings */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-44 h-44 rounded-full border-2 border-green-500/20 animate-ping"></div>
              <div className="absolute w-32 h-32 rounded-full border border-green-500/40 animate-pulse"></div>

              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black shadow-2xl relative z-10 border-2 border-white"
                style={{ backgroundColor: session.peerAvatarColor || "#22C55E", color: "#000000" }}
              >
                {session.peerName.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <span className="text-xs font-mono font-bold tracking-widest text-green-400 uppercase flex items-center justify-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                <span>INCOMING ENCRYPTED {session.type.toUpperCase()} CALL</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                {session.peerName}
              </h2>
              <p className="text-xs font-mono text-zinc-400 uppercase">
                ZERO-KNOWLEDGE SRTP MEDIA HANDSHAKE REQUESTED
              </p>
            </div>

            {/* Answer & Decline Action Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <button
                type="button"
                id="btn-call-decline-incoming"
                onClick={handleTerminateCall}
                className="px-6 py-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-mono font-black text-xs uppercase flex items-center gap-2 shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>DECLINE</span>
              </button>

              {session.type === "video" && (
                <button
                  type="button"
                  id="btn-call-accept-audio-only"
                  onClick={() => onAcceptCall("audio")}
                  className="px-5 py-3.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs uppercase flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-green-400" />
                  <span>VOICE ONLY</span>
                </button>
              )}

              <button
                type="button"
                id="btn-call-accept-incoming"
                onClick={() => onAcceptCall(session.type)}
                className="px-8 py-3.5 rounded-full bg-green-500 hover:bg-green-400 text-black font-mono font-black text-xs uppercase flex items-center gap-2 shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 animate-bounce"
              >
                {session.type === "video" ? (
                  <Video className="w-4 h-4 fill-black" />
                ) : (
                  <Phone className="w-4 h-4 fill-black" />
                )}
                <span>ANSWER SECURE CALL</span>
              </button>
            </div>
          </div>
        ) : session.status === "dialing" ? (
          /* ---------------------------------------------------- */
          /* VIEW 2: OUTGOING CALL DIALING & CIPHER HANDSHAKE     */
          /* ---------------------------------------------------- */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-gradient-to-b from-[#0F0F0F] to-[#050505]">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-36 h-36 rounded-full border border-white/20 animate-ping"></div>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black shadow-2xl relative z-10 border-2 border-white/30"
                style={{ backgroundColor: session.peerAvatarColor || "#22C55E", color: "#000000" }}
              >
                {session.peerName.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                <span>NEGOTIATING ZERO-KNOWLEDGE HANDSHAKE...</span>
              </span>
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                CALLING {session.peerName}
              </h2>
              <div className="inline-block px-3 py-1 bg-black border border-white/10 rounded-sm text-[10px] font-mono text-green-400 uppercase">
                DTLS 1.3 / SRTP 256-BIT SESSION SEED GENERATED
              </div>
            </div>

            {/* Abort button */}
            <div className="pt-4">
              <button
                type="button"
                id="btn-call-abort-dialing"
                onClick={handleTerminateCall}
                className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-mono font-black text-xs uppercase flex items-center gap-2 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>CANCEL CALL</span>
              </button>
            </div>
          </div>
        ) : (
          /* ---------------------------------------------------- */
          /* VIEW 3: ACTIVE CONNECTED CALL STAGE                  */
          /* ---------------------------------------------------- */
          <div className="flex-1 relative bg-black flex flex-col justify-between overflow-hidden">
            {/* Main Stage: Remote Video Feed or Tactical Holographic HUD */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              {session.type === "video" ? (
                /* Remote Video Viewfinder / Tactical Simulated Feed */
                <div className="relative w-full h-full bg-[#050505] flex items-center justify-center">
                  {/* Simulated Operative Cyber Wireframe Graphic / Video Stream */}
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-radial from-[#121212] to-black">
                    {/* Tactical Face Box Framing */}
                    <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-sm border-2 border-white/20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs">
                      {/* Corner Target Reticles */}
                      <span className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-green-400"></span>
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-green-400"></span>
                      <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-green-400"></span>
                      <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-green-400"></span>

                      <div
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-black border-2 border-white shadow-2xl mb-3"
                        style={{
                          backgroundColor: session.peerAvatarColor || "#22C55E",
                          color: "#000000",
                        }}
                      >
                        {session.peerName.slice(0, 2).toUpperCase()}
                      </div>

                      <span className="text-xs font-mono font-black text-white uppercase tracking-wider">
                        {session.peerName}
                      </span>
                      <span className="text-[9px] font-mono text-green-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        <span>FEED ENCRYPTED</span>
                      </span>
                    </div>

                    {/* Remote Audio Spectrum Indicator */}
                    <div className="flex items-center gap-1 mt-6 h-8 px-4 bg-black/60 border border-white/10 rounded-sm">
                      {syntheticVisualizerLevels.map((lvl, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 bg-green-400 rounded-xs transition-all duration-75"
                          style={{ height: `${lvl}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Audio Only Stage */
                <div className="flex flex-col items-center justify-center space-y-6 text-center p-6">
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black border-2 border-white shadow-2xl"
                    style={{
                      backgroundColor: session.peerAvatarColor || "#22C55E",
                      color: "#000000",
                    }}
                  >
                    {session.peerName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase text-white tracking-tight">
                      {session.peerName}
                    </h3>
                    <p className="text-xs font-mono text-green-400 uppercase tracking-widest flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-green-400" />
                      <span>AES-256 STEREO OPUS 48kHz TUNNEL</span>
                    </p>
                  </div>

                  {/* Real-time sound wave */}
                  <div className="flex items-center gap-1.5 h-10 px-6 bg-black/60 border border-white/10 rounded-sm">
                    {syntheticVisualizerLevels.map((lvl, idx) => (
                      <div
                        key={idx}
                        className="w-1.5 sm:w-2 bg-green-400 rounded-xs transition-all duration-75"
                        style={{ height: `${lvl}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PiP: Local Self Camera Preview (Bottom-Right or Top-Right) */}
            {session.type === "video" && (
              <div
                id="pip-local-camera-preview"
                className="absolute bottom-24 right-4 sm:right-6 w-32 sm:w-44 h-24 sm:h-32 bg-[#121212] border-2 border-white/30 rounded-sm overflow-hidden shadow-2xl z-30 group"
              >
                {session.isVideoOff ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 text-zinc-500 p-2 text-center">
                    <VideoOff className="w-5 h-5 text-zinc-500 mb-1" />
                    <span className="text-[9px] font-mono uppercase font-bold text-zinc-400">
                      CAMERA OFF
                    </span>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                )}

                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 rounded-xs text-[8px] font-mono font-bold text-white uppercase border border-white/20">
                  YOU ({currentUser.name})
                </div>
              </div>
            )}

            {/* Top Overlay: Telemetry Data */}
            <div className="relative p-4 flex items-center justify-between z-20 pointer-events-none">
              <div className="px-3 py-1.5 bg-black/80 border border-white/15 rounded-sm backdrop-blur-md text-[10px] font-mono space-y-0.5">
                <div className="flex items-center gap-1.5 text-green-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>CIPHER: AES-GCM-256 + ECDH P-256</span>
                </div>
                <div className="text-zinc-400 flex items-center gap-3">
                  <span>RES: 1080p @ 30FPS</span>
                  <span>AUDIO: OPUS 48kHz</span>
                  <span>LOSS: 0.00%</span>
                </div>
              </div>
            </div>

            {/* Bottom Docked Floating Action Bar */}
            <div className="relative p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-center gap-3 sm:gap-4 z-30">
              {/* Mic Mute Button */}
              <button
                type="button"
                id="btn-call-toggle-mute"
                onClick={onToggleMute}
                title={session.isMuted ? "Unmute Microphone" : "Mute Microphone"}
                className={`p-3.5 sm:p-4 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-lg ${
                  session.isMuted
                    ? "bg-red-600 text-white hover:bg-red-500 scale-105"
                    : "bg-[#1C1C1C] text-white hover:bg-white/20 border border-white/20"
                }`}
              >
                {session.isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Camera Video Toggle Button */}
              {session.type === "video" && (
                <button
                  type="button"
                  id="btn-call-toggle-video"
                  onClick={onToggleVideo}
                  title={session.isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                  className={`p-3.5 sm:p-4 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-lg ${
                    session.isVideoOff
                      ? "bg-red-600 text-white hover:bg-red-500 scale-105"
                      : "bg-[#1C1C1C] text-white hover:bg-white/20 border border-white/20"
                  }`}
                >
                  {session.isVideoOff ? (
                    <VideoOff className="w-5 h-5" />
                  ) : (
                    <Video className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Screen Share Button */}
              <button
                type="button"
                id="btn-call-toggle-screenshare"
                onClick={onToggleScreenShare}
                title={session.isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                className={`p-3.5 sm:p-4 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-lg ${
                  session.isScreenSharing
                    ? "bg-purple-600 text-white hover:bg-purple-500"
                    : "bg-[#1C1C1C] text-white hover:bg-white/20 border border-white/20"
                }`}
              >
                <Monitor className="w-5 h-5" />
              </button>

              {/* End Call Button (Big Red) */}
              <button
                type="button"
                id="btn-call-terminate-active"
                onClick={handleTerminateCall}
                title="Disconnect Call & Zero Memory"
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-mono font-black text-xs uppercase transition-all flex items-center gap-2 shadow-2xl cursor-pointer hover:scale-105 active:scale-95"
              >
                <PhoneOff className="w-5 h-5" />
                <span className="hidden sm:inline">END CALL</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
