import React, { useRef, useEffect } from "react";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Cpu,
  CornerDownLeft,
} from "lucide-react";

interface ChatSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  matchCount: number;
  currentMatchIndex: number; // 0-based index
  onNextMatch: () => void;
  onPrevMatch: () => void;
  matchCase: boolean;
  onToggleMatchCase: () => void;
  channelName: string;
}

export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  matchCase,
  onToggleMatchCase,
  channelName,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      id="chat-search-bar-container"
      className="px-4 sm:px-6 py-2.5 bg-[#0D0D0D] border-b border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 z-20 shadow-lg text-white animate-in slide-in-from-top-2 duration-150"
    >
      {/* Left / Main Search Input Area */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="w-4 h-4 text-green-400 absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            id="input-thread-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Search encrypted messages in ${channelName}... (Press Esc to exit)`}
            className="w-full pl-9 pr-8 py-1.5 rounded-sm bg-[#161616] border border-white/20 text-white placeholder-zinc-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 uppercase tracking-wide"
          />
          {searchQuery && (
            <button
              id="btn-clear-thread-search"
              onClick={() => {
                onSearchQueryChange("");
                inputRef.current?.focus();
              }}
              title="Clear search query"
              className="absolute right-2.5 p-0.5 text-zinc-400 hover:text-white rounded-xs transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Match Case Toggle */}
        <button
          id="btn-toggle-match-case"
          onClick={onToggleMatchCase}
          title={matchCase ? "Match Case: ON (Exact casing)" : "Match Case: OFF (Case-insensitive)"}
          className={`px-2 py-1.5 rounded-sm text-xs font-mono font-bold uppercase border transition-colors flex items-center gap-1 ${
            matchCase
              ? "bg-green-500/20 border-green-500 text-green-400"
              : "bg-[#161616] border-white/20 text-zinc-400 hover:text-white hover:border-white/40"
          }`}
        >
          <span>Aa</span>
        </button>
      </div>

      {/* Right Navigation & Security Status Area */}
      <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono">
        {/* Match Count Badge */}
        {searchQuery.trim() !== "" ? (
          <div
            id="search-match-count-badge"
            className={`px-2.5 py-1 rounded-sm border font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 ${
              matchCount > 0
                ? "bg-green-950/60 border-green-500/50 text-green-400"
                : "bg-red-950/60 border-red-500/50 text-red-400"
            }`}
          >
            <span>
              {matchCount > 0
                ? `${currentMatchIndex + 1} OF ${matchCount} MATCH${matchCount === 1 ? "" : "ES"}`
                : "0 RESULTS"}
            </span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 border border-white/10 px-2 py-1 rounded-sm bg-[#121212]">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>EPHEMERAL RAM SCAN</span>
          </div>
        )}

        {/* Up / Down Match Jump Controls */}
        <div className="flex items-center gap-1">
          <button
            id="btn-search-prev-match"
            onClick={onPrevMatch}
            disabled={matchCount === 0}
            title="Previous match (Shift+Enter)"
            className="p-1.5 rounded-sm bg-[#161616] border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-search-next-match"
            onClick={onNextMatch}
            disabled={matchCount === 0}
            title="Next match (Enter)"
            className="p-1.5 rounded-sm bg-[#161616] border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Security Pill */}
        <div
          className="hidden lg:flex items-center gap-1 text-[10px] text-zinc-400 uppercase border border-white/10 px-2 py-1 rounded-sm bg-[#121212]"
          title="Search is executed entirely in volatile browser memory on transient decrypted payloads without writing to disk or database"
        >
          <ShieldCheck className="w-3 h-3 text-green-400" />
          <span className="truncate max-w-[150px]">ZERO DISK DECRYPT</span>
        </div>

        {/* Close Search Button */}
        <button
          id="btn-close-thread-search"
          onClick={onClose}
          title="Close search (Esc)"
          className="p-1.5 rounded-sm bg-[#161616] border border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-colors ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
