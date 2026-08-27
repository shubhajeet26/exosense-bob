"use client";

import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import HudPanel from "./HudPanel";

type SortKey = keyof Exoplanet;
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

const COLUMNS: { key: SortKey; label: string; unit?: string; fmt?: (v: unknown) => string }[] = [
  { key: "pl_name",         label: "PLANET DESIGNATION" },
  { key: "hostname",        label: "HOST STAR" },
  { key: "disc_year",       label: "YEAR",       fmt: (v) => String(v ?? "—") },
  { key: "discoverymethod", label: "METHOD" },
  { key: "pl_rade",         label: "RADIUS",     unit: "R⊕", fmt: (v) => v != null ? (v as number).toFixed(2) : "—" },
  { key: "pl_masse",        label: "MASS",       unit: "M⊕", fmt: (v) => v != null ? (v as number).toFixed(2) : "—" },
  { key: "pl_orbper",       label: "PERIOD",     unit: "d",  fmt: (v) => v != null ? (v as number).toFixed(2) : "—" },
  { key: "pl_orbsmax",      label: "AXIS",       unit: "AU", fmt: (v) => v != null ? (v as number).toFixed(3) : "—" },
  { key: "sy_dist",         label: "DISTANCE",   unit: "pc", fmt: (v) => v != null ? (v as number).toFixed(1) : "—" },
];

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="opacity-20 ml-1 font-mono text-[0.65rem]">↕</span>;
  return <span className="ml-1 text-[var(--accent-cyan-bright)] font-mono">{dir === "asc" ? "▲" : "▼"}</span>;
}

interface Props {
  planets: Exoplanet[];
  selectedName: string | null;
  onSelect: (planet: Exoplanet) => void;
}

function DataTableInner({ planets, selectedName, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("disc_year");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage]       = useState(1);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    return [...planets].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [planets, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const slice      = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <HudPanel
      title="Exoplanet Database // Discovered Worlds"
      moduleCode="DATA-MAT"
      badge={{ text: `${planets.length} RECORDS`, variant: "blue" }}
      cornerAccent="cyan"
      noPadding
    >
      {/* Table Subheader */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#040818]/60 border-b border-[var(--border)]/70 text-[0.62rem] font-mono text-[var(--muted)]">
        <span>CLICK RECORD TO INITIATE 3D TARGET ANALYSIS</span>
        <span>DISPLAYING {slice.length} OF {planets.length} WORLDS</span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[#050a22]/80">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2.5 text-left text-[0.62rem] tracking-widest uppercase text-[var(--muted-light)] cursor-pointer select-none hover:text-[var(--accent-cyan)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.unit && <span className="text-[var(--muted)]">({col.unit})</span>}
                    <SortIcon dir={sortKey === col.key ? sortDir : null} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <AnimatePresence mode="wait">
            <motion.tbody
              key={`${sortKey}-${sortDir}-${safePage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {slice.map((planet) => {
                const isSelected = planet.pl_name === selectedName;
                return (
                  <motion.tr
                    key={planet.pl_name}
                    onClick={() => onSelect(planet)}
                    className="border-b border-[var(--border)]/40 cursor-pointer select-none transition-colors"
                    style={
                      isSelected
                        ? {
                            background: "rgba(139, 92, 246, 0.15)",
                            borderLeft: "3px solid #a78bfa",
                          }
                        : { borderLeft: "3px solid transparent" }
                    }
                    whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.08)" }}
                    transition={{ duration: 0.08 }}
                  >
                    {COLUMNS.map((col) => {
                      const raw = planet[col.key];
                      const display = col.fmt ? col.fmt(raw) : (raw as string | null) ?? "—";
                      return (
                        <td key={col.key} className="px-3 py-2 text-xs whitespace-nowrap text-[var(--foreground)]">
                          {col.key === "pl_name" ? (
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-violet-bright)] animate-pulse" />
                              )}
                              <span
                                className="font-semibold"
                                style={{ color: isSelected ? "#c4b5fd" : "var(--accent-cyan-bright)" }}
                              >
                                {display}
                              </span>
                            </div>
                          ) : col.key === "discoverymethod" ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[0.6rem] tracking-wide"
                              style={{
                                background: "rgba(59, 130, 246, 0.12)",
                                color: "#93c5fd",
                                border: "1px solid rgba(59, 130, 246, 0.25)",
                              }}
                            >
                              {display}
                            </span>
                          ) : (
                            <span className="tabular-nums text-slate-300">{display}</span>
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* Futuristic Pagination Deck */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[#040818]/70 font-mono">
        <span className="text-[0.65rem] text-[var(--muted-light)]">
          PAGE <span className="text-[var(--accent-cyan-bright)]">{safePage}</span> OF {totalPages}
        </span>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1 rounded text-xs border border-[var(--border)] text-[var(--muted-light)] hover:text-white hover:border-[var(--accent-cyan)] transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer"
            whileHover={safePage <= 1 ? {} : { scale: 1.04 }}
            whileTap={safePage <= 1 ? {} : { scale: 0.96 }}
          >
            ‹ PREV
          </motion.button>
          <motion.button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1 rounded text-xs border border-[var(--border)] text-[var(--muted-light)] hover:text-white hover:border-[var(--accent-cyan)] transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer"
            whileHover={safePage >= totalPages ? {} : { scale: 1.04 }}
            whileTap={safePage >= totalPages ? {} : { scale: 0.96 }}
          >
            NEXT ›
          </motion.button>
        </div>
      </div>
    </HudPanel>
  );
}

const DataTable = memo(DataTableInner);
export default DataTable;
