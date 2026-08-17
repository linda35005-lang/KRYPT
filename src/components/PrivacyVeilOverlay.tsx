import React from "react";
import { Eye, Shield, Lock, Activity, CloudSun, TrendingUp } from "lucide-react";

interface PrivacyVeilOverlayProps {
  isActive: boolean;
  onDeactivate: () => void;
}

export const PrivacyVeilOverlay: React.FC<PrivacyVeilOverlayProps> = ({
  isActive,
  onDeactivate,
}) => {
  if (!isActive) return null;

  return (
    <div
      id="privacy-camouflage-veil"
      onClick={onDeactivate}
      className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white cursor-pointer select-none animate-fade-in font-sans"
    >
      {/* Decoy Safe Screen */}
      <div className="max-w-md w-full bg-[#0F0F0F] border border-white/20 rounded-sm p-6 shadow-2xl space-y-4 text-center">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono font-bold uppercase text-zinc-400">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span>SYSTEM METRICS OVERVIEW</span>
          </div>
          <span className="text-green-400">ALL SYSTEMS NOMINAL</span>
        </div>

        {/* Decoy weather & market cards */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-4 rounded-sm bg-black border border-white/15 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs uppercase font-bold">WEATHER</span>
              <CloudSun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white font-sans">72°F SUNNY</div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase">HUMIDITY: 42%</div>
          </div>

          <div className="p-4 rounded-sm bg-black border border-white/15 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs uppercase font-bold">MARKET</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xl font-black text-green-400 font-sans">+1.42%</div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase">VOL: 1.2M REQ/S</div>
          </div>
        </div>

        {/* Click to unmask banner */}
        <div className="pt-2">
          <div className="py-3 px-4 rounded-sm bg-white text-black text-xs font-mono font-black uppercase flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all">
            <Eye className="w-4 h-4 text-black" />
            <span>PRIVACY VEIL ACTIVE • CLICK TO UNLOCK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

