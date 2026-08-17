import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Users,
  KeyRound,
  ShieldCheck,
  X,
  Check,
  Radio,
  MessageSquare,
  Phone,
  Globe,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";
import { Contact, UserIdentity } from "../types";

interface UserDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChatWithUser: (user: {
    id: string;
    username?: string;
    displayName: string;
    phoneNumber?: string;
    publicKeyJwk: string;
    fingerprint: string;
  }) => void;
  onInitiatePhoneChat: (phoneNumber: string, name?: string) => void;
  currentUser: UserIdentity;
  initialTab?: "directory" | "phone";
}

interface RegisteredUser {
  id: string;
  username: string;
  displayName: string;
  phoneNumber?: string;
  publicKeyJwk: string;
  fingerprint: string;
  createdAt: number;
  isOnline: boolean;
}

const COUNTRY_PRESETS = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+41", country: "CH", flag: "🇨🇭" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
];

export const UserDirectoryModal: React.FC<UserDirectoryModalProps> = ({
  isOpen,
  onClose,
  onStartChatWithUser,
  onInitiatePhoneChat,
  currentUser,
  initialTab = "phone",
}) => {
  const [activeTab, setActiveTab] = useState<"directory" | "phone">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [phoneMatchUser, setPhoneMatchUser] = useState<RegisteredUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneSearching, setIsPhoneSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search users across directory
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("krypt_auth_token") || "";
        const query = activeTab === "phone" ? phoneSearchQuery : searchQuery;
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok) {
          setUsers(data.users || []);
        } else {
          setError(data.error || "Failed to search operatives.");
        }
      } catch (err: any) {
        console.error("Failed to query users:", err);
        setError("Network error communicating with relay directory.");
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, phoneSearchQuery, activeTab, isOpen]);

  // Dedicated phone search lookup
  useEffect(() => {
    if (!isOpen || activeTab !== "phone" || !phoneSearchQuery.trim()) {
      setPhoneMatchUser(null);
      return;
    }

    const lookupPhone = async () => {
      setIsPhoneSearching(true);
      try {
        const fullPhone = phoneSearchQuery.startsWith("+")
          ? phoneSearchQuery
          : `${selectedCountryCode} ${phoneSearchQuery}`;
        const res = await fetch(`/api/users/lookup-phone?phone=${encodeURIComponent(fullPhone)}`);
        const data = await res.json();
        if (res.ok && data.found && data.user) {
          setPhoneMatchUser(data.user);
        } else {
          setPhoneMatchUser(null);
        }
      } catch (e) {
        console.warn("Phone lookup error:", e);
      } finally {
        setIsPhoneSearching(false);
      }
    };

    const timer = setTimeout(lookupPhone, 300);
    return () => clearTimeout(timer);
  }, [phoneSearchQuery, selectedCountryCode, activeTab, isOpen]);

  if (!isOpen) return null;

  const getFullEnteredPhone = () => {
    if (phoneSearchQuery.startsWith("+")) return phoneSearchQuery.trim();
    return `${selectedCountryCode} ${phoneSearchQuery}`.trim();
  };

  const handleStartCustomPhoneChat = () => {
    const fullPhone = getFullEnteredPhone();
    if (!fullPhone || fullPhone.length < 5) return;
    onInitiatePhoneChat(fullPhone);
    onClose();
  };

  return (
    <div
      id="modal-user-directory-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in font-sans select-none overflow-y-auto"
    >
      <div className="relative max-w-xl w-full bg-[#0F0F0F] border border-white/20 rounded-sm shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-white text-black flex items-center justify-center font-black">
              {activeTab === "phone" ? (
                <Phone className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Users className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                {activeTab === "phone" ? "GLOBAL PHONE NUMBER SEARCH" : "OPERATIVE DIRECTORY"}
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                DISCOVER & CONNECT WITH ENCRYPTED NODES WORLDWIDE
              </p>
            </div>
          </div>

          <button
            id="btn-close-directory-modal"
            onClick={onClose}
            className="p-2 rounded-sm bg-[#141414] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 border-b border-white/10 bg-[#080808]">
          <button
            id="tab-global-phone-search"
            onClick={() => setActiveTab("phone")}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider font-mono flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "phone"
                ? "border-white bg-[#141414] text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Globe className="w-4 h-4 text-green-400" />
            <span>GLOBAL PHONE SEARCH</span>
          </button>

          <button
            id="tab-directory-search"
            onClick={() => setActiveTab("directory")}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider font-mono flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "directory"
                ? "border-white bg-[#141414] text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Users className="w-4 h-4 text-zinc-400" />
            <span>DIRECTORY & USERNAMES</span>
          </button>
        </div>

        {/* Search Bars */}
        {activeTab === "phone" ? (
          <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0A0A0A] space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center justify-between">
              <span>ENTER ANY GLOBAL PHONE NUMBER TO CONNECT:</span>
              <span className="text-green-400 font-bold">E.164 PROTOCOL</span>
            </div>

            {/* Country Selector & Phone Input */}
            <div className="flex gap-2">
              <select
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="bg-[#141414] border border-white/15 rounded-sm px-2.5 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-white cursor-pointer"
              >
                {COUNTRY_PRESETS.map((c) => (
                  <option key={c.code} value={c.code} className="bg-black text-white">
                    {c.flag} {c.code} ({c.country})
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="input-phone-search"
                  type="text"
                  value={phoneSearchQuery}
                  onChange={(e) => setPhoneSearchQuery(e.target.value)}
                  placeholder="(202) 555-0143 or +44 20 7946 0912..."
                  className="w-full bg-[#141414] border border-white/15 rounded-sm pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono uppercase font-bold"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Country Pill presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono text-zinc-500 uppercase">PRESETS:</span>
              {[
                { label: "+1 (202) 555-0143", name: "Alice (US)" },
                { label: "+44 20 7946 0912", name: "Marcus (UK)" },
                { label: "+41 22 739 8110", name: "Elena (CH)" },
                { label: "+81 3 5555 0184", name: "Kenji (JP)" },
              ].map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setPhoneSearchQuery(sample.label)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#141414] border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0A0A0A]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="input-directory-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH BY @USERNAME, ALIAS, PHONE OR FINGERPRINT..."
                className="w-full bg-[#141414] border border-white/15 rounded-sm pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono uppercase font-bold"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* User Results List */}
        <div className="p-4 sm:p-5 max-h-80 overflow-y-auto space-y-2.5">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-sm text-xs font-mono text-red-300">
              {error}
            </div>
          )}

          {/* If on Phone Tab and user entered a number, show option to initiate instant E2EE line */}
          {activeTab === "phone" && phoneSearchQuery.trim().length >= 4 && (
            <div className="p-3.5 rounded-sm bg-[#1A1A1A] border-2 border-white/40 flex items-center justify-between gap-3 shadow-lg">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="font-black text-sm uppercase tracking-tight text-white">
                    {getFullEnteredPhone()}
                  </span>
                  <span className="text-[9px] font-mono bg-green-500/20 text-green-400 px-1 py-0.5 rounded-xs font-bold">
                    GLOBAL LINE
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">
                  INSTANT SECURE ECDH P-256 ENCRYPTED TUNNEL
                </div>
              </div>

              <button
                id="btn-initiate-global-phone-chat"
                onClick={handleStartCustomPhoneChat}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-white text-black text-xs font-black uppercase hover:bg-zinc-200 transition-colors flex-shrink-0 cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>START E2EE CHAT</span>
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500 uppercase flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>QUERYING REGISTERED GLOBAL DIRECTORY...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500 uppercase space-y-2">
              <div className="font-bold">NO REGISTERED OPERATIVES FOUND</div>
              {activeTab === "phone" ? (
                <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                  Type any international phone number above and click <span className="text-white font-bold">START E2EE CHAT</span> to provision an encrypted tunnel immediately.
                </p>
              ) : (
                <p className="text-[10px] text-zinc-600">
                  Switch to the Global Phone tab or register another account in incognito to test multi-user messaging.
                </p>
              )}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                id={`directory-user-${user.username}`}
                className="p-3 rounded-sm bg-[#141414] border border-white/10 hover:border-white/30 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm uppercase tracking-tight truncate">
                      {user.displayName}
                    </span>
                    <span className="text-[11px] font-mono text-green-400 font-bold uppercase">
                      @{user.username}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 uppercase mt-0.5 flex-wrap">
                    {user.phoneNumber && (
                      <span className="text-white font-bold flex items-center gap-1 bg-black px-1.5 py-0.5 rounded-xs border border-white/15">
                        <Phone className="w-2.5 h-2.5 text-green-400" />
                        {user.phoneNumber}
                      </span>
                    )}
                    <span>FP: {user.fingerprint}</span>
                    <span>•</span>
                    <span className={user.isOnline ? "text-green-400 font-bold" : "text-zinc-500"}>
                      {user.isOnline ? "ONLINE" : "RECENT"}
                    </span>
                  </div>
                </div>

                <button
                  id={`btn-chat-with-${user.username}`}
                  onClick={() => {
                    onStartChatWithUser(user);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white text-black text-xs font-black uppercase hover:bg-zinc-200 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>START CHAT</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
