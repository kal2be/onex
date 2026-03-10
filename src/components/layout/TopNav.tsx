import { ChevronDown, User, LogOut, Sun, Moon, Search, Star } from "lucide-react";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { SYMBOL_LABELS, CRYPTO_SYMBOLS, type CryptoSymbol } from "@/hooks/useBinanceStream";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const SYMBOL_CATEGORIES: Record<string, CryptoSymbol[]> = {
  "Top 10": ["BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "SOLUSDT", "ADAUSDT", "DOGEUSDT", "TRXUSDT", "AVAXUSDT", "DOTUSDT"],
  "Layer 1": ["LTCUSDT", "ETCUSDT", "ATOMUSDT", "NEARUSDT", "APTUSDT", "SUIUSDT", "SEIUSDT", "ICPUSDT", "HBARUSDT", "FTMUSDT", "THETAUSDT", "EGLDUSDT", "FLOWUSDT", "ALGOUSDT", "XLMUSDT", "STXUSDT", "INJUSDT"],
  "Layer 2 / Scaling": ["MATICUSDT", "ARBUSDT", "OPUSDT", "IMXUSDT"],
  "DeFi": ["UNIUSDT", "AAVEUSDT", "LINKUSDT", "LDOUSDT", "CRVUSDT", "MKRUSDT", "SNXUSDT", "COMPUSDT", "RUNEUSDT", "ENAUSDT", "JUPUSDT"],
  "Gaming / Metaverse": ["SANDUSDT", "MANAUSDT", "GALAUSDT", "AXSUSDT", "CHZUSDT", "APEUSDT"],
  "AI / Data": ["FETUSDT", "RENDERUSDT", "TIAUSDT"],
  "Meme": ["SHIBUSDT", "PEPEUSDT", "WIFUSDT", "VETUSDT", "FILUSDT"],
};

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

export function TopNav() {
  const { activeSymbol, setActiveSymbol, tickers } = useLiveData();
  const { user, signOut } = useAuth();
  const [showSymbols, setShowSymbols] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [search, setSearch] = useState("");
  const [watchlist, setWatchlist] = useState<CryptoSymbol[]>(loadWatchlist);
  const symbolRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (symbolRef.current && !symbolRef.current.contains(e.target as Node)) { setShowSymbols(false); setSearch(""); }
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showSymbols && searchRef.current) searchRef.current.focus();
  }, [showSymbols]);

  const toggleWatchlist = useCallback((sym: CryptoSymbol, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist(prev => {
      const next = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym];
      saveWatchlist(next);
      return next;
    });
  }, []);

  const getTickerData = (sym: CryptoSymbol) => tickers.find(t => t.symbol === sym);
  const activeTicker = getTickerData(activeSymbol);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = q
      ? Object.fromEntries(
          Object.entries(SYMBOL_CATEGORIES)
            .map(([cat, syms]) => [cat, syms.filter(s => s.toLowerCase().includes(q) || SYMBOL_LABELS[s]?.toLowerCase().includes(q))])
            .filter(([, syms]) => (syms as CryptoSymbol[]).length > 0)
        )
      : SYMBOL_CATEGORIES;

    // Also filter watchlist by search
    const filteredWatchlist = q
      ? watchlist.filter(s => s.toLowerCase().includes(q) || SYMBOL_LABELS[s]?.toLowerCase().includes(q))
      : watchlist;

    return { watchlist: filteredWatchlist as CryptoSymbol[], categories: base as Record<string, CryptoSymbol[]> };
  }, [search, watchlist]);

  const renderCoinRow = (sym: CryptoSymbol) => {
    const ticker = getTickerData(sym);
    const isActive = sym === activeSymbol;
    const isFav = watchlist.includes(sym);
    return (
      <button
        key={sym}
        onClick={() => { setActiveSymbol(sym); setShowSymbols(false); setSearch(""); }}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-secondary transition-colors group ${isActive ? "bg-primary/5" : ""}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => toggleWatchlist(sym, e)}
            className="shrink-0"
            title={isFav ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star className={`w-3 h-3 transition-colors ${isFav ? "text-warning fill-warning" : "text-muted-foreground/30 group-hover:text-muted-foreground"}`} />
          </button>
          <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {SYMBOL_LABELS[sym].split("/")[0].slice(0, 3)}
          </div>
          <div className={`font-mono text-[11px] ${isActive ? "text-primary font-medium" : "text-foreground"}`}>
            {SYMBOL_LABELS[sym]}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ticker && (
            <>
              <span className="text-[10px] font-mono text-muted-foreground">
                ${ticker.price < 0.01 ? ticker.price.toFixed(6) : ticker.price < 1 ? ticker.price.toFixed(4) : ticker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[9px] font-mono ${ticker.changePct24h >= 0 ? "text-success" : "text-destructive"}`}>
                {ticker.changePct24h >= 0 ? "+" : ""}{ticker.changePct24h.toFixed(1)}%
              </span>
            </>
          )}
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
        </div>
      </button>
    );
  };

  return (
    <header className={`h-12 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 ${isMobile ? "pl-14" : ""}`}>
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none min-w-0">
        <div ref={symbolRef} className="relative shrink-0">
          <button
            onClick={() => setShowSymbols(!showSymbols)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-sm text-sm hover:bg-muted transition-colors"
          >
            <span className="text-foreground font-medium font-mono text-xs sm:text-sm">{SYMBOL_LABELS[activeSymbol]}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showSymbols ? "rotate-180" : ""}`} />
          </button>
          {showSymbols && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-sm shadow-xl z-50 w-[300px] sm:w-[360px] py-1 max-h-[80vh] flex flex-col">
              {/* Search */}
              <div className="px-2 py-1.5 border-b border-border">
                <div className="flex items-center gap-1.5 bg-secondary rounded-sm px-2 py-1.5">
                  <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search coins..."
                    className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full font-mono"
                  />
                </div>
              </div>

              <div className="overflow-y-auto scrollbar-thin flex-1">
                {/* Watchlist section */}
                {filteredCategories.watchlist.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] text-warning uppercase tracking-wider font-medium sticky top-0 bg-card/95 backdrop-blur-sm flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-warning" /> Watchlist
                    </div>
                    {filteredCategories.watchlist.map(renderCoinRow)}
                    <div className="mx-3 border-b border-border my-1" />
                  </div>
                )}

                {/* Categories */}
                {Object.entries(filteredCategories.categories).map(([category, symbols]) => (
                  <div key={category}>
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card/95 backdrop-blur-sm">
                      {category}
                    </div>
                    {symbols.map(renderCoinRow)}
                  </div>
                ))}
                {Object.keys(filteredCategories.categories).length === 0 && filteredCategories.watchlist.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">No coins found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTicker && !isMobile && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-foreground">
              ${activeTicker.price < 0.01 ? activeTicker.price.toFixed(6) : activeTicker.price < 1 ? activeTicker.price.toFixed(4) : activeTicker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-mono ${activeTicker.changePct24h >= 0 ? "text-success" : "text-destructive"}`}>
              {activeTicker.changePct24h >= 0 ? "+" : ""}{activeTicker.changePct24h.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center hover:bg-secondary transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
            className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <User className="w-4 h-4 text-muted-foreground" />
          </button>
          {showUser && (
            <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-sm shadow-xl z-50 min-w-[200px] py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
