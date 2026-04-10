"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface Participant {
  userId: string;
  name: string;
  image: string | null;
  lastReadAt?: string | null;
}

interface Room {
  id: string;
  name: string | null;
  type: "direct" | "group";
  lastMessageAt: string | null;
  createdAt: string;
  participants: Participant[];
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
    isMine: boolean;
  } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderImage: string | null;
  content: string;
  createdAt: string;
}

function initialsOf(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current user id once
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMeId(d?.user?.id ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/me/chat/rooms");
      const data = await res.json();
      if (res.ok) setRooms(data.rooms || []);
    } catch {
      // ignore
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/me/chat/rooms/${roomId}/messages`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        setParticipants(data.participants || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const markRead = useCallback(async (roomId: string) => {
    try {
      await fetch(`/api/me/chat/rooms/${roomId}/read`, { method: "POST" });
    } catch {
      // ignore
    }
  }, []);

  const updatePresence = useCallback(async () => {
    try {
      await fetch("/api/me/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "online" }),
      });
    } catch {
      // ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRooms();
    updatePresence();
  }, [loadRooms, updatePresence]);

  // Presence every 30s
  useEffect(() => {
    const t = setInterval(updatePresence, 30_000);
    return () => clearInterval(t);
  }, [updatePresence]);

  // Poll rooms every 3s when in list view; poll messages every 3s when in room
  useEffect(() => {
    if (activeRoomId) {
      const t = setInterval(() => loadMessages(activeRoomId), 3_000);
      return () => clearInterval(t);
    }
    const t = setInterval(loadRooms, 3_000);
    return () => clearInterval(t);
  }, [activeRoomId, loadRooms, loadMessages]);

  // On room open: load messages, mark read, scroll to bottom
  useEffect(() => {
    if (!activeRoomId) return;
    loadMessages(activeRoomId).then(() => {
      markRead(activeRoomId);
    });
  }, [activeRoomId, loadMessages, markRead]);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const activeRoom = useMemo(
    () => rooms?.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId]
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoomId || !input.trim() || sending) return;
    const content = input.trim();
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/me/chat/rooms/${activeRoomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        await loadMessages(activeRoomId);
        await markRead(activeRoomId);
      } else {
        const data = await res.json().catch(() => ({}));
        setInput(content);
        alert(data?.error || "Failed to send");
      }
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  // Compute read receipt for each sent message: "read" if any other participant's
  // lastReadAt >= message createdAt
  function readStateFor(msg: Message): "sent" | "read" {
    const others = participants.filter((p) => p.userId !== meId);
    if (others.length === 0) return "sent";
    const msgTime = new Date(msg.createdAt).getTime();
    const allRead = others.every(
      (p) => p.lastReadAt && new Date(p.lastReadAt).getTime() >= msgTime
    );
    return allRead ? "read" : "sent";
  }

  // Room detail view
  if (activeRoom) {
    return (
      <div className="-mx-4 -mt-4 flex flex-col h-[calc(100dvh-3.5rem-4rem)]">
        {/* Chat header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setActiveRoomId(null)}
            className="p-1 -ml-1 rounded-lg hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <Avatar className="w-9 h-9">
            <AvatarImage
              src={activeRoom.participants[0]?.image || undefined}
            />
            <AvatarFallback className="bg-blue-50 text-xs text-[#0057FF] font-medium">
              {initialsOf(
                activeRoom.name || activeRoom.participants[0]?.name
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {activeRoom.name ||
                activeRoom.participants.map((p) => p.name).join(", ") ||
                "Chat"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {activeRoom.type === "group"
                ? `${activeRoom.participants.length + 1} members`
                : "Direct message"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 space-y-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-10 h-10 mb-2" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === meId;
              return (
                <div
                  key={m.id}
                  className={`flex ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm ${
                      mine
                        ? "bg-[#0057FF] text-white rounded-br-md"
                        : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                    }`}
                  >
                    {!mine && activeRoom.type === "group" && (
                      <p className="text-[11px] font-semibold text-[#0057FF] mb-0.5">
                        {m.senderName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                    <div
                      className={`flex items-center gap-1 justify-end mt-0.5 text-[10px] ${
                        mine ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      <span>{formatTime(m.createdAt)}</span>
                      {mine &&
                        (readStateFor(m) === "read" ? (
                          <CheckCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="sticky bottom-0 bg-white border-t border-gray-200 px-3 py-2.5 flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-10 rounded-full bg-gray-50 border-gray-200 text-sm px-4"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-full bg-[#0057FF] text-white flex items-center justify-center disabled:opacity-40"
            aria-label="Send"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    );
  }

  // Room list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
      </div>

      {roomsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : rooms && rooms.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {rooms.map((r) => {
            const title =
              r.name ||
              r.participants.map((p) => p.name).join(", ") ||
              "Chat";
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoomId(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarImage
                    src={r.participants[0]?.image || undefined}
                  />
                  <AvatarFallback className="bg-blue-50 text-sm text-[#0057FF] font-medium">
                    {initialsOf(title)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {title}
                    </p>
                    {r.lastMessage && (
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {formatRelative(r.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 truncate">
                      {r.lastMessage
                        ? (r.lastMessage.isMine ? "You: " : "") +
                          r.lastMessage.content
                        : "No messages yet"}
                    </p>
                    {r.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#0057FF] text-white text-[10px] font-semibold flex items-center justify-center">
                        {r.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">
            No conversations yet
          </p>
          <p className="text-xs text-gray-500">
            Your coach or gym manager will start a chat with you.
          </p>
        </div>
      )}
    </div>
  );
}
