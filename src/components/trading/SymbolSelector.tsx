import { SYMBOL_LABELS, type CryptoSymbol, CRYPTO_SYMBOLS } from "@/hooks/useBinanceStream";
import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, X, Search, Star } from "lucide-react";

const WATCHLIST_KEY = "falconx_watchlist";

function loadWatchlist(): CryptoSymbol[] {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(list: CryptoSymbol[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

interface SymbolSelectorProps {
  selected: CryptoSymbol;
  onChange: (s: CryptoSymbol) => void;
}

export function SymbolSelector({ selected, onChange }: SymbolSelectorProps) {
  const [watchlist, setWatchlist] = useState<CryptoSymbol[]>(loadWatchlist);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showPicker && searchRef.current) searchRef.current.focus();
  }, [showPicker]);

  // Listen for watchlist changes from TopNav
  useEffect(() => {
    const interval = setInterval(() => {
      const current = loadWatchlist();
      if (JSON.stringify(current) !== JSON.stringify(watchlist)) {
        setWatchlist(current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [watchlist]);

  const visibleSymbols: CryptoSymbol[] = useMemo(() => {
    const list: CryptoSymbol[] = ["BTCUSDT"];
    for (const sym of watchlist) {
      if (sym !== "BTCUSDT" && list.length < 5) list.push(sym);
    }
    // Always include selected if not already there
    if (!list.includes(selected) && selected !== "BTCUSDT") {
      if (list.length >= 5) list.pop();
      list.push(selected);
    }
    return list;
  }, [watchlist, selected]);

  const addToWatchlist = (sym: CryptoSymbol) => {
    if (watchlist.includes(sym)) return;
    const next = [...watchlist, sym];
    setWatchlist(next);
    saveWatchlist(next);
    onChange(sym);
    setShowPicker(false);
    setSearch("");
  };

  const removeFromWatchlist = (sym: CryptoSymbol, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sym === "BTCUSDT") return;
    const next = watchlist.filter(s => s !== sym);
    setWatchlist(next);
    saveWatchlist(next);
    if (selected === sym) onChange("BTCUSDT");
  };

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CRYPTO_SYMBOLS.filter(s => !visibleSymbols.includes(s));
    return CRYPTO_SYMBOLS.filter(s =>
      (s.toLowerCase().includes(q) || SYMBOL_LABELS[s]?.toLowerCase().includes(q)) && !visibleSymbols.includes(s)
    );
  }, [search, visibleSymbols]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibleSymbols.map((sym) => (
        <button
          key={sym}
          onClick={() => onChange(sym)}
          className={`group relative flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono rounded-sm transition-colors ${
            selected === sym
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {SYMBOL_LABELS[sym].split("/")[0]}
          {sym !== "BTCUSDT" && watchlist.includes(sym) && (
            <span
              onClick={(e) => removeFromWatchlist(sym, e)}
              className={`ml-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                selected === sym ? "hover:bg-primary-foreground/20" : "hover:bg-muted"
              }`}
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}
        </button>
      ))}

      {/* Add coin button */}
      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-mono rounded-sm bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30 border border-transparent transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>

        {showPicker && (
          <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-sm shadow-xl z-50 w-[240px] py-1 max-h-[300px] flex flex-col">
            <div className="px-2 py-1.5 border-b border-border">
              <div className="flex items-center gap-1.5 bg-secondary rounded-sm px-2 py-1">
                <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search coin..."
                  className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full font-mono"
                />
              </div>
            </div>
            <div className="overflow-y-auto scrollbar-thin flex-1">
              {watchlist.length >= 5 && (
                <div className="px-3 py-2 text-[10px] text-warning font-mono">
                  <Star className="w-2.5 h-2.5 inline mr-1" />
                  Max 5 coins in watchlist. Remove one to add more.
                </div>
              )}
              {searchResults.map((sym) => (
                <button
                  key={sym}
                  onClick={() => watchlist.length < 5 ? addToWatchlist(sym) : null}
                  disabled={watchlist.length >= 5}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-mono transition-colors ${
                    watchlist.length >= 5 ? "opacity-40 cursor-not-allowed" : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-foreground">{SYMBOL_LABELS[sym]}</span>
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              ))}
              {searchResults.length === 0 && (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">No coins found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
