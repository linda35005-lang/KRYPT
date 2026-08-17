import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Radio,
  UserCheck,
  Users,
  Search,
  Key,
  Copy,
  Check,
  Plus,
  Flame,
  Lock,
  Sparkles,
  Phone,
} from "lucide-react";
import { Contact, UserIdentity, RoomInfo } from "../types";

interface ContactSidebarProps {
  contacts: Contact[];
  activeContactId: string;
  onSelectContact: (contactId: string) => void;
  activeRoom: RoomInfo | null;
  onSelectLiveRoom: () => void;
  onOpenNewLiveRoom: () => void;
  userIdentity: UserIdentity;
  onOpenSafetyNumber: (contact: Contact) => void;
  liveRoomPeerCount: number;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenDirectory: () => void;
  onOpenPhoneSearch?: () => void;
}

export const ContactSidebar: React.FC<ContactSidebarProps> = ({
  contacts,
  activeContactId,
  onSelectContact,
  activeRoom,
  onSelectLiveRoom,
  onOpenNewLiveRoom,
  userIdentity,
  onOpenSafetyNumber,
  liveRoomPeerCount,
  onOpenAuth,
  onOpenProfile,
  onOpenDirectory,
  onOpenPhoneSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  const cleanDigits = searchQuery.replace(/\D/g, "");

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(q);
    const roleMatch = c.roleDescription.toLowerCase().includes(q);
    const usernameMatch = c.username ? c.username.toLowerCase().includes(q) : false;
    const phoneMatch = c.phoneNumber
      ? c.phoneNumber.toLowerCase().includes(q) ||
        (cleanDigits.length >= 3 && c.phoneNumber.replace(/\D/g, "").includes(cleanDigits))
      : false;
    return nameMatch || roleMatch || usernameMatch || phoneMatch;
  });

  const handleCopyPublicKey = () => {
    navigator.clipboard.writeText(userIdentity.publicKeyJwk);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <aside
      id="ghosttext-contact-sidebar"
      className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-[#0A0A0A] border-r border-white/10 flex flex-col h-full select-none"
    >
      {/* Sidebar Header & Search */}
      <div className="p-4 sm:p-5 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              ENCRYPTED NODES
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-sidebar-phone-search"
              onClick={onOpenPhoneSearch || onOpenDirectory}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm bg-[#141414] border border-white/20 text-green-400 hover:bg-white/10 hover:text-white transition-colors font-black uppercase tracking-wider cursor-pointer"
              title="Global phone number search & E2EE connect"
            >
              <Phone className="w-3 h-3 text-green-400" />
              <span>PHONE</span>
            </button>
            <button
              id="btn-sidebar-directory"
              onClick={onOpenDirectory}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm bg-[#141414] border border-white/20 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors font-black uppercase tracking-wider cursor-pointer"
              title="Search & discover registered operatives"
            >
              <Key className="w-3 h-3 text-zinc-400" />
              <span>FIND</span>
            </button>
            <button
              id="btn-sidebar-new-room"
              onClick={onOpenNewLiveRoom}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm bg-white text-black hover:bg-zinc-200 transition-colors font-black uppercase tracking-wider cursor-pointer"
              title="Create or join real-time encrypted room relay"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>RELAY</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="input-search-contacts"
            type="text"
            placeholder="SEARCH BY NAME, @USER, PHONE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-sm pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white uppercase font-mono"
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {/* Multi-User Live Relay Room Channel */}
        <div className="mb-3">
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em] px-2 py-1 flex items-center justify-between">
            <span>LIVE RELAY</span>
            <span className="flex items-center gap-1 text-green-400 font-mono text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {liveRoomPeerCount > 0 ? `${liveRoomPeerCount} PEERS` : "BROADCAST"}
            </span>
          </div>

          <div
            id="btn-channel-live-room"
            onClick={onSelectLiveRoom}
            className={`group flex items-center justify-between p-3.5 rounded-sm cursor-pointer transition-all ${
              activeContactId === "live-relay-room"
                ? "bg-white text-black shadow-lg"
                : "hover:bg-white/5 border-l-2 border-white/20 text-zinc-400"
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className={`text-xl sm:text-2xl font-black tracking-tight uppercase truncate ${
                  activeContactId === "live-relay-room" ? "text-black" : "text-white"
                }`}>
                  {activeRoom ? activeRoom.name : "LIVE RELAY"}
                </span>
              </div>
              <p className={`text-[10px] font-mono uppercase tracking-wider truncate mt-0.5 ${
                activeContactId === "live-relay-room" ? "text-zinc-700 font-bold" : "text-zinc-500"
              }`}>
                MULTI-DEVICE EPHEMERAL MESH
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {activeContactId === "live-relay-room" ? (
                <div className="h-2.5 w-2.5 bg-black rounded-full"></div>
              ) : (
                <span className="text-[10px] font-mono font-bold text-zinc-500">LIVE</span>
              )}
            </div>
          </div>
        </div>

        {/* Direct Contacts List */}
        <div>
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em] px-2 py-1 mb-1.5">
            DIRECT PEERS (ECDH P-256)
          </div>

          <div className="space-y-1.5">
            {filteredContacts.map((contact) => {
              const isSelected = activeContactId === contact.id;

              return (
                <div
                  key={contact.id}
                  id={`btn-contact-${contact.id}`}
                  onClick={() => onSelectContact(contact.id)}
                  className={`group flex items-center justify-between p-3.5 rounded-sm cursor-pointer transition-all ${
                    isSelected
                      ? "bg-white text-black shadow-lg"
                      : "hover:bg-white/5 border-l-2 border-white/20 text-zinc-400"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xl sm:text-2xl font-black tracking-tight uppercase truncate ${
                          isSelected ? "text-black" : "text-zinc-300 group-hover:text-white"
                        }`}
                      >
                        {contact.name}
                      </span>
                      {contact.unreadCount > 0 && (
                        <span
                          className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded-xs ${
                            isSelected
                              ? "bg-black text-white"
                              : "bg-green-500 text-black font-bold"
                          }`}
                        >
                          +{contact.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {contact.phoneNumber && (
                        <span
                          className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded-xs flex items-center gap-0.5 ${
                            isSelected
                              ? "bg-black/20 text-black font-black"
                              : "text-green-400 bg-green-500/10 font-bold"
                          }`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                          {contact.phoneNumber}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono truncate uppercase ${
                          isSelected ? "text-zinc-800 font-bold" : "text-zinc-500"
                        }`}
                      >
                        FP: {contact.fingerprint}
                      </span>
                      {contact.safetyNumberVerified && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSafetyNumber(contact);
                          }}
                          className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded-xs ${
                            isSelected
                              ? "bg-black text-white font-bold"
                              : "text-green-400 bg-green-500/10 font-bold"
                          }`}
                          title="Safety verified"
                        >
                          VERIFIED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelected ? (
                      <div className="h-2.5 w-2.5 bg-black rounded-full"></div>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-600 font-bold">
                        {contact.isOnline ? "ONLINE" : "IDLE"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Cryptographic Identity Footer */}
      <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0A0A0A] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div
            id="btn-sidebar-user-profile"
            onClick={userIdentity.isRegistered ? onOpenProfile : onOpenAuth}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            title={userIdentity.isRegistered ? "Manage Authenticated Account" : "Authenticate Enclave"}
          >
            <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] flex-shrink-0"></div>
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wider text-white group-hover:text-zinc-300 truncate">
                {userIdentity.username ? `@${userIdentity.username}` : "ANONYMOUS GUEST"}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase truncate">
                FP: {userIdentity.fingerprint}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="btn-copy-public-key"
              onClick={handleCopyPublicKey}
              className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-1 rounded-sm bg-[#141414] border border-white/15 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Copy ECDH P-256 Public Key (JWK)"
            >
              {copiedKey ? (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-400" />
                  <span>PUBKEY</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

