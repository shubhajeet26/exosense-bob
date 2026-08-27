"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import { FilterValues, DEFAULT_FILTERS } from "@/lib/filterDefaults";
import { ChatMessage } from "@/lib/gemini";
import { Spinner } from "./States";
import HudPanel from "./HudPanel";

interface Props {
  planets: Exoplanet[];
  filters: FilterValues;
  selectedPlanet: Exoplanet | null;
  onSelectPlanet?: (planet: Exoplanet | null) => void;
  disabled?: boolean;
  className?: string;
}

interface DisplayMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

function filterSummary(f: FilterValues): string {
  const parts: string[] = [];
  if (f.yearMin !== DEFAULT_FILTERS.yearMin || f.yearMax !== DEFAULT_FILTERS.yearMax)
    parts.push(`years ${f.yearMin}–${f.yearMax}`);
  if (f.radiusMin > 0 || f.radiusMax < 30)
    parts.push(`radius ${f.radiusMin}–${f.radiusMax} R⊕`);
  if (f.discoveryMethod) parts.push(`method: ${f.discoveryMethod}`);
  if (f.distanceMin > 0 || f.distanceMax < 3000)
    parts.push(`distance ${f.distanceMin}–${f.distanceMax} pc`);
  return parts.length ? parts.join(", ") : "all planets (default parameters)";
}

function getTimeStamp(): string {
  const now = new Date();
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(
    now.getUTCMinutes()
  ).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`;
}

export default function AiMissionCopilot({
  planets,
  filters,
  selectedPlanet,
  disabled = false,
  className = "",
}: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "init",
      role: "model",
      text: "Exosense Copilot online. Telemetry uplink verified. Select any candidate world or issue an analytical directive regarding the active dataset.",
      timestamp: getTimeStamp(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copilotStatus, setCopilotStatus] = useState<"READY" | "ANALYZING" | "ERROR">("READY");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (textToSend: string) => {
      const trimmed = textToSend.trim();
      if (!trimmed || isLoading || disabled) return;

      const userMsg: DisplayMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmed,
        timestamp: getTimeStamp(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage("");
      setIsLoading(true);
      setErrorMsg(null);
      setCopilotStatus("ANALYZING");

      // Extract conversation history
      const history: ChatMessage[] = messages
        .filter((m) => m.id !== "init")
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      try {
        const res = await fetch("/api/ai/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            planets: planets.slice(0, 150), // Send relevant sample subset
            filterSummary: filterSummary(filters),
            selectedPlanet,
          }),
        });

        const data = await res.json();

        if (data.error) {
          setErrorMsg(data.error);
          setCopilotStatus("ERROR");
          const errorMsgObj: DisplayMessage = {
            id: `err-${Date.now()}`,
            role: "model",
            text: `⚠ ${data.error}`,
            timestamp: getTimeStamp(),
          };
          setMessages((prev) => [...prev, errorMsgObj]);
        } else if (data.reply) {
          setCopilotStatus("READY");
          const modelMsg: DisplayMessage = {
            id: `model-${Date.now()}`,
            role: "model",
            text: data.reply,
            timestamp: getTimeStamp(),
          };
          setMessages((prev) => [...prev, modelMsg]);
        }
      } catch {
        setErrorMsg("Telemetry connection to AI Copilot interrupted.");
        setCopilotStatus("ERROR");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, disabled, messages, planets, filters, selectedPlanet]
  );

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputMessage);
  }

  function handleClearLog() {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: "model",
        text: "Mission log cleared. Awaiting operator directive.",
        timestamp: getTimeStamp(),
      },
    ]);
    setErrorMsg(null);
    setCopilotStatus("READY");
  }

  // Quick Directives
  const globalDirectives = [
    "Which planets currently look most interesting?",
    "Summarize the active filtered dataset.",
    "What are the closest worlds in this view?",
    "Which detection method dominates these results?",
  ];

  const targetDirectives = selectedPlanet
    ? [
        `Explain ${selectedPlanet.pl_name}'s characteristics.`,
        `Why did ${selectedPlanet.pl_name} receive its score?`,
        `Are there similar worlds to ${selectedPlanet.pl_name}?`,
        `How does ${selectedPlanet.pl_name} compare to Earth?`,
      ]
    : [];

  return (
    <HudPanel
      title="AI Mission Copilot"
      moduleCode="COPILOT-AI"
      badge={{
        text: copilotStatus,
        variant: copilotStatus === "ANALYZING" ? "amber" : copilotStatus === "ERROR" ? "amber" : "violet",
      }}
      headerRight={
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearLog}
            className="font-mono text-[0.58rem] tracking-wider uppercase text-[var(--muted-light)] hover:text-white px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent-violet)] transition-colors cursor-pointer"
            title="Clear conversation log"
          >
            CLEAR LOG
          </button>
        </div>
      }
      cornerAccent="cyan"
      className={`flex flex-col overflow-hidden ${className || "h-[540px]"}`}
      noPadding
    >
      {/* ── Cognitive Focus Subheader ── */}
      <div className="px-3.5 py-2 bg-[#04081c]/90 border-b border-[var(--border)]/70 flex items-center justify-between text-xs font-mono select-none shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="text-[var(--muted)] text-[0.62rem] uppercase">FOCUS:</span>
          {selectedPlanet ? (
            <span className="text-[var(--accent-violet-bright)] font-semibold truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-violet-bright)] animate-pulse" />
              {selectedPlanet.pl_name} ({selectedPlanet.sy_dist != null ? `${selectedPlanet.sy_dist.toFixed(1)} pc` : "Dist ?"})
            </span>
          ) : (
            <span className="text-slate-300 text-[0.68rem]">
              SECTOR DATASET ({planets.length} WORLDS)
            </span>
          )}
        </div>

        <span className="text-[0.58rem] font-mono text-[var(--muted-light)] uppercase">
          GROUNDED INTEL
        </span>
      </div>

      {/* ── Quick Directives Bar ── */}
      <div className="px-3 py-2 bg-[#030616]/60 border-b border-[var(--border)]/40 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto shrink-0">
        {(selectedPlanet ? targetDirectives : globalDirectives).map((dir) => (
          <button
            key={dir}
            onClick={() => sendMessage(dir)}
            disabled={isLoading || disabled}
            className="text-[0.6rem] font-mono px-2 py-1 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] hover:border-[var(--accent-violet)] text-[var(--muted-light)] hover:text-white transition-all disabled:opacity-40 cursor-pointer text-left truncate"
          >
            ⚡ {dir}
          </button>
        ))}
      </div>

      {/* ── Conversation & Intelligence Stream (Scrollable) ── */}
      <div
        ref={chatScrollRef}
        className="flex-1 min-h-0 p-3.5 space-y-3 overflow-y-auto overscroll-contain font-mono text-xs"
        style={{ background: "rgba(2, 5, 16, 0.75)" }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
            >
              {/* Telemetry metadata tag */}
              <div className="flex items-center gap-1.5 text-[0.58rem] text-[var(--muted)] px-1">
                <span>{isUser ? "OPERATOR DIRECTIVE" : "COPILOT INTELLIGENCE"}</span>
                <span>·</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message bubble */}
              <div
                className={`p-3 rounded-lg max-w-[90%] font-sans text-xs leading-relaxed ${
                  isUser
                    ? "bg-[#0c1638] border border-[var(--accent-blue)]/40 text-slate-100 font-mono"
                    : "bg-[#070e28]/90 border border-[var(--border)] text-slate-200"
                }`}
                style={
                  !isUser
                    ? {
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                        borderLeft: "2px solid #a78bfa",
                      }
                    : {}
                }
              >
                <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
              </div>
            </div>
          );
        })}

        {/* Loading Radar Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-[#060c24] border border-[var(--accent-violet)]/30 text-xs font-mono text-[var(--accent-violet-bright)]"
          >
            <Spinner size={14} />
            <span className="text-[0.65rem] tracking-wider uppercase animate-pulse">
              Synthesizing mission intelligence from telemetry context…
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Directive Input Deck ── */}
      <div className="p-3 bg-[#030614]/95 border-t border-[var(--border)] space-y-1.5">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              selectedPlanet
                ? `Ask Copilot about ${selectedPlanet.pl_name}...`
                : "Ask Copilot to analyze active exoplanet dataset..."
            }
            disabled={isLoading || disabled}
            maxLength={500}
            className="flex-1 bg-[#05091a] border border-[var(--border)] rounded px-3 py-2 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-violet)] transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || disabled}
            className="px-4 py-2 rounded text-xs font-mono font-bold tracking-wider uppercase disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            style={{
              background: inputMessage.trim()
                ? "rgba(139, 92, 246, 0.25)"
                : "rgba(139, 92, 246, 0.08)",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              color: "#c4b5fd",
            }}
          >
            {isLoading ? <Spinner size={12} /> : "TRANSMIT"}
          </button>
        </form>

        {/* Transparency Verification Tag */}
        <div className="flex items-center justify-between text-[0.56rem] font-mono text-[var(--muted)] pt-0.5 px-0.5">
          <span>DATA GROUNDED: NASA ARCHIVE & EXOSENSE METRICS</span>
          <span>DOES NOT INVENT FACTS</span>
        </div>
      </div>
    </HudPanel>
  );
}
