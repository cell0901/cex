import { useState, useEffect } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function useOrderBook() {
  // Book is generated once and never re-rolled — a static snapshot, not a live feed.
  // Size grows with distance from mid: row 0 (best bid / best ask, closest to mid)
  // is the smallest, and depth increases as price moves away from mid in either
  // direction, same as a real cumulative depth ladder.
  const [book] = useState(() => {
    const mid = 68420;
    const asks = Array.from({ length: 7 }, (_, i) => ({
      price: mid + i * (2.2 + Math.random() * 1.5) + Math.random() * 2,
      size: 0.15 + i * 0.35 + Math.random() * 0.15,
    }));
    const bids = Array.from({ length: 7 }, (_, i) => ({
      price: mid - i * (2.2 + Math.random() * 1.5) - Math.random() * 2,
      size: 0.15 + i * 0.35 + Math.random() * 0.15,
    }));
    return { mid, asks, bids };
  });


  useEffect(() => {
    const matchInt = setInterval(() => {
    }, 3200);

    return () => clearInterval(matchInt);
  }, [book.mid]);

  return { bids: book.bids, asks: book.asks, mid: book.mid, };
}

function OrderBookHero() {
  const { bids, asks, mid, } = useOrderBook();
  const maxSize = 2.6;

  return (
    <div className="relative w-full max-w-md rounded border border-[#232830] bg-[#0F1318] font-mono text-xs shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between border-b border-[#232830] px-4 py-2.5">
        <span className="text-[#6B7280] tracking-wide">BTC/USDT</span>
      </div>
      <div className="px-4 pt-3">
        {asks
          .slice()
          .sort((a, b) => b.price - a.price)
          .map((a, i) => (
            <div key={`a-${i}`} className="relative flex items-center justify-between py-[3px]">
              <div
                className="absolute right-0 top-0 h-full  border-left rounded-xs bg-[#c06f5a]/10"
                style={{ width: `${Math.min(100, (a.size / maxSize) * 100)}%` }}
              />
              <span className="relative z-10 text-[#c06f5a]">{fmt(a.price)}</span>
              <span className="relative z-10 text-[#6B7280]">{fmt(a.size, 3)}</span>
            </div>
          ))}
      </div>

      <div className="relative my-1 flex items-center justify-between border-y border-dashed border-[#232830] px-4 py-2">
        <span className="text-[#F5F5F5] font-medium">{fmt(mid)}</span>
        <span className="text-[#6B7280]">spread 0.4</span>
      </div>

      <div className="px-4 pb-3">
        {bids.map((b, i) => (
          <div key={`b-${i}`} className="relative flex items-center justify-between py-[3px]">
            <div
              className="absolute right-0 top-0 h-full border-left rounded-xs bg-[#9dc049]/10"
              style={{ width: `${Math.min(100, (b.size / maxSize) * 100)}%` }}
            />
            <span className="relative z-10 text-[#9dc049]">{fmt(b.price)}</span>
            <span className="relative z-10 text-[#6B7280]">{fmt(b.size, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {

  const navigate = useNavigate()

  const specs = [
    { k: "order-types", v: "limit, market" },
    { k: "api", v: "REST + WebSocket" },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B0E11] font-mono text-[#E6E6E6] antialiased ">
      <style>{`
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-[#1A1F26] bg-[#0B0E11]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-1.5 text-sm tracking-tight">
            <span className="text-yellow-300">MATCH</span>
            <span className="text-yellow-300">_X</span>
          </div>
          <nav className="hidden items-center gap-8 text-xs text-[#8B8F99] md:flex">
            <a href="#" className="hover:text-[#E6E6E6]">Markets</a>
            <a href="#" className="hover:text-[#E6E6E6]">Trade</a>
          </nav>
          <button
            onClick={() => {
              const token = localStorage.getItem("token")
              if (!token) {
                navigate('/login')
                return
              }
              navigate('/trade/SOL_USDC')
            }}
            className="rounded-sm border border-[#FFB020]/50 bg-[#FFB020]/10 px-4 py-1.5 text-xs text-[#FFB020] transition hover:bg-[#FFB020]/20">
            Login
          </button>
        </div>
      </header >

      {/* Hero */}
      < section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28" >
        <div>
          <h1 className="text-4xl leading-tight text-[#F5F5F5] md:text-5xl">
            Every order
            <br />
            finds its <span className="text-[#81c049]">match</span>.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#8B8F99]">
            An order book that actually books. Limit and market orders, matched in real time, no black box in between.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={
                () => {
                  const token = localStorage.getItem('token')
                  if (!token) {
                    navigate('/signup')
                    return
                  }
                  navigate('/trade/SOL_USDC')
                }
              }
              className="flex items-center gap-2 rounded-sm bg-[#F5F5F5] px-5 py-2.5 text-xs font-medium text-[#0B0E11] transition hover:bg-white">
              Create account
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button className="flex items-center gap-2 rounded-sm border border-[#232830] px-5 py-2.5 text-xs text-[#E6E6E6] transition hover:border-[#3A414C]">
              View markets
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <OrderBookHero />
        </div>
      </section >

      {/* Engine specs — terminal style */}
      < section id="specs" className="mx-auto max-w-6xl px-6 py-14" >
        <div className="mb-8 max-w-lg">
          <h2 className="text-xl text-[#F5F5F5]">Engine</h2>
        </div>
        <div className="overflow-hidden rounded">

          <div className="px-2 text-xs leading-7">
            {specs.map((s) => (
              <div key={s.k} className="flex flex-wrap gap-2">
                <span className="text-[#00D68F]">{`>`} {s.k.padEnd(12, " ")}</span>
                <span className="text-[#B8BCC4]">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer className="border-t border-[#1A1F26] px-6 py-10" >
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 text-xs text-[#6B7280] md:flex-row md:items-center">
          <a href="#" className="hover:text-[#E6E6E6]">Architecture</a>
          <div>© {new Date().getFullYear()} MatchX</div>
        </div>
      </footer >
    </div >
  );
}
