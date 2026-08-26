"use client";

import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";

type SortKey = keyof Exoplanet;
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

const COLUMNS: { key: SortKey; label: string; fmt?: (v: unknown) => string }[] = [
  { key: "pl_name",         label: "Planet" },
  { key: "hostname",        label: "Host Star" },
  { key: "disc_year",       label: "Year",       fmt: (v) => String(v ?? "—") },
  { key: "discoverymethod", label: "Method" },
  { key: "pl_rade",         label: "R (R⊕)",     fmt: (v) => v != null ? (v as number).toFixed(2) : "—" },
  { key: "pl_masse",        label: "M (M⊕)",     fmt: (v) => v != null ? (v as number).toFixed(2) : "—" },
  { key: "pl_orbper",       label: "Period (d)",  fmt: (v) => v != null ? (v as number).toFixed(2) : "—" },
  { key: "pl_orbsmax",      label: "a (AU)",      fmt: (v) => v != null ? (v as number).toFixed(3) : "—" },
  { key: "sy_dist",         label: "Dist (pc)",   fmt: (v) => v != null ? (v as number).toFixed(1) : "—" },
];

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="opacity-20 ml-1">↕</span>;
  return <span className="ml-1 text-[var(--accent-blue)]">{dir === "asc" ? "↑" : "↓"}</span>;
}

// ─── Micro-interaction button ─────────────────────────────────────────────────

function MotionBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 rounded text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent-blue)] transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer"
      whileHover={disabled ? {} : { scale: 1.04 }}
      whileTap={disabled   ? {} : { scale: 0.96 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  planets: Exoplanet[];
  selectedName: string | null;
  onSelect: (planet: Exoplanet) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  const thCls =
    "px-3 py-2.5 text-left text-[0.65rem] tracking-widest uppercase text-[var(--muted)] cursor-pointer select-none hover:text-[var(--foreground)] transition-colors whitespace-nowrap";
  const tdCls = "px-3 py-2 text-xs text-[var(--foreground)] whitespace-nowrap";

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: "rgba(11,14,31,0.8)", backdropFilter: "blur(10px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Planets</h3>
          <p className="text-[0.62rem] text-[var(--muted)] mt-0.5">
            Click a row to view 3D model
          </p>
        </div>
        <span className="text-[0.68rem] text-[var(--muted)]">
          {planets.length.toLocaleString()} result{planets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {COLUMNS.map((col) => (
                <th key={col.key} className={thCls} onClick={() => handleSort(col.key)}>
                  {col.label}
                  <SortIcon dir={sortKey === col.key ? sortDir : null} />
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
              transition={{ duration: 0.18 }}
            >
              {slice.map((planet) => {
                const isSelected = planet.pl_name === selectedName;
                return (
                  <motion.tr
                    key={planet.pl_name}
                    onClick={() => onSelect(planet)}
                    className="border-b border-[var(--border)] border-opacity-40 cursor-pointer select-none"
                    style={
                      isSelected
                        ? {
                            background: "rgba(139,92,246,0.12)",
                            borderLeft: "2px solid #8b5cf6",
                          }
                        : { borderLeft: "2px solid transparent" }
                    }
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    transition={{ duration: 0.1 }}
                  >
                    {COLUMNS.map((col) => {
                      const raw     = planet[col.key];
                      const display = col.fmt
                        ? col.fmt(raw)
                        : (raw as string | null) ?? "—";
                      return (
                        <td key={col.key} className={tdCls}>
                          {col.key === "pl_name" ? (
                            <span
                              className="font-medium"
                              style={{ color: isSelected ? "#c4b5fd" : "var(--accent-cyan)" }}
                            >
                              {display}
                            </span>
                          ) : col.key === "discoverymethod" ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[0.62rem] tracking-wide"
                              style={{
                                background: "rgba(139,92,246,0.15)",
                                color: "#c4b5fd",
                                border: "1px solid rgba(139,92,246,0.25)",
                              }}
                            >
                              {display}
                            </span>
                          ) : (
                            display
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
        <span className="text-[0.68rem] text-[var(--muted)]">
          Page {safePage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <MotionBtn
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            ‹ Prev
          </MotionBtn>
          <MotionBtn
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next ›
          </MotionBtn>
        </div>
      </div>
    </div>
  );
}

// Re-renders only when planets array, selectedName, or onSelect changes
const DataTable = memo(DataTableInner);
export default DataTable;
