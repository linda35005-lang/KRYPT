import React, { useState, useEffect, useRef } from "react";
import { Eye, Clock, ShieldAlert, X, Flame, Lock } from "lucide-react";
import { EncryptedMessage } from "../types";

interface ViewOnceModalProps {
  message: EncryptedMessage | null;
  onClose: (messageId: string) => void;
}

export const ViewOnceModal: React.FC<ViewOnceModalProps> = ({
  message,
  onClose,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(8);
  const totalDuration = 8;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!message) return;

    setSecondsRemaining(totalDuration);
    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [message]);

  if (!message || !message.decrypted?.mediaData) return null;

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose(message.id);
  };

  const progressPercent = (secondsRemaining / totalDuration) * 100;

  return (
    <div
      id="modal-view-once-viewer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in select-none font-sans"
    >
      <div className="relative max-w-2xl w-full flex flex-col items-center text-white">
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between p-5 bg-[#0F0F0F] border border-white/20 rounded-sm mb-3 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-sm bg-white text-black font-black">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white uppercase tracking-tight font-sans">
                VIEW-ONCE EPHEMERAL MEDIA
              </h3>
              <p className="text-xs text-zinc-400 font-mono uppercase">
                WILL BE SHREDDED IMMEDIATELY UPON EXPIRATION
              </p>
            </div>
          </div>

          {/* Countdown badge */}
          <div className="flex items-center gap-2 bg-black border border-white/20 px-3 py-1.5 rounded-sm font-mono text-xs uppercase font-bold text-amber-400">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              {secondsRemaining}S AUTO-DESTRUCT
            </span>
          </div>

          {/* Close button */}
          <button
            id="btn-close-view-once"
            onClick={handleClose}
            className="p-2 rounded-sm bg-[#141414] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Container */}
        <div className="relative w-full rounded-sm overflow-hidden border border-white/20 bg-black shadow-2xl flex items-center justify-center p-2 min-h-[320px]">
          {message.decrypted.mediaType === "video" || message.decrypted.mediaData.startsWith("data:video") ? (
            <video
              src={message.decrypted.mediaData}
              autoPlay
              controls
              playsInline
              className="max-h-[65vh] w-auto object-contain rounded-xs select-none"
            />
          ) : (
            <img
              src={message.decrypted.mediaData}
              alt="View-Once attachment"
              className="max-h-[65vh] w-auto object-contain rounded-xs select-none pointer-events-none"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Overlay Protective Watermark */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
            <span className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-white rotate-[-25deg]">
              GHOSTTEXT VIEW-ONCE
            </span>
          </div>

          {/* Bottom Countdown Progress line */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-zinc-900">
            <div
              className="h-full bg-white transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Destruction warning footnote */}
        <div className="mt-3 flex items-center gap-2 text-xs font-mono uppercase text-zinc-400">
          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>SINGLE-VIEW SESSION: CLOSING OR NAVIGATING AWAY VAPORIZES IMAGE INSTANTLY.</span>
        </div>
      </div>
    </div>
  );
};

