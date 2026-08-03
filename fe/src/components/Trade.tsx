import { CandlestickSeries, ColorType, createChart, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { OrderEntry } from "./Order"
import { Orderbook } from "./Orderbook"
import { OpenOrders } from "./Open-orders"
import { TradeNavbar } from "./Nav"
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { SignalingManager } from "../utils/SignalingManager";
import { getKlines } from "../utils/http";
import { Check } from "lucide-react";

// this should be dynamic route. means diff orderbook and trades and charts for diff market/symbols
const CHART_HEIGHT = 550;

function OrderSuccessCard({ side }: { side: "buy" | "sell" }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2  text-white text-[13.5px] font-mono px-4 py-2.5 ">
        <Check size={14} className="text-green-400 shrink-0" />
        {side == "buy" ? "Buy" : "Sell"} Successful
      </div>
    </div>
  );
}

export default function Trade() {

  const navigate = useNavigate()
  const chartContainer = useRef<HTMLDivElement>(null)
  const [authStatus, setAuthStatus] = useState("pending")
  const [orderSuccess, setOrderSuccess] = useState<{ success: boolean, side: "buy" | "sell" }>({ success: false, side: "buy" })
  const [currentPrice, setCurrentPrice] = useState<{ price: number, side: "buy" | "sell" }>({ price: 0, side: "buy" })

  const chartInstanceRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { // using this comp if we cant use useNavigate 
      navigate('/login')
      return
    }

    // send auth request first to ws before connecting to any ws stream
    SignalingManager.getInstance().registerCallback("AUTH", (data: any) => {
      setAuthStatus(data.success ? "authorized" : "unauthorized")
    }, "AUTH")

    SignalingManager.getInstance().sendMessage({ type: "AUTH", token })

    return () => {
      SignalingManager.getInstance().deRegisterCallback("AUTH", "AUTH")
    }
  }, []);


  useEffect(() => {
    if (authStatus !== "authorized") return;

    const signalingManager = SignalingManager.getInstance();
    const callbackId = "trade-chart";

    signalingManager.registerCallback("TRADE_PUBLISH", (data: any) => {
      setCurrentPrice({ price: data.trade.price, side: data.trade.side });
    }, callbackId);

    signalingManager.sendMessage({
      type: "SUBSCRIBE",
      params: ["trade@SOL_USDC"],
    });

    return () => {
      signalingManager.sendMessage({ type: "UNSUBSCRIBE", params: ["trade@SOL_USDC"] });
      signalingManager.deRegisterCallback("TRADE_PUBLISH", callbackId);
    };
  }, [authStatus]);


  useEffect(() => {
    if (authStatus !== "authorized") return;

    const container = chartContainer.current;
    if (!container) return;


    const chart = createChart(container, {
      width: container.clientWidth,
      height: CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: '#0F1115' },
        textColor: '#A0AEC0',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.06)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.06)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartInstanceRef.current = chart

    const lineSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00C087',
      borderUpColor: '#00C087',
      wickUpColor: '#00C087',

      // Down candlesticks (Muted Crimson)
      downColor: '#FF3B69',
      borderDownColor: '#FF3B69',
      wickDownColor: '#FF3B69',
    });

    // startime currently is one day ago. endTime is currently current time
    getKlines("SOL_USDC", "1m", Math.floor((new Date().getTime() - 1000 * 60 * 60 * 24) / 1000), Math.floor(new Date().getTime() / 1000)).then((klines) => {
      lineSeries.setData(klines.map(kline => ({
        time: Math.floor(new Date(kline.time).getTime() / 1000) as UTCTimestamp,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close
      })))
    })

    const resize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove()
      chartInstanceRef.current = null
    }
  }, [authStatus])

  const buttonStyle = {
    width: '36px',
    height: '36px',
    backgroundColor: '#1E232D',
    color: '#A0AEC0',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    outline: 'none'
  };

  const handleZoomIn = () => {
    if (chartInstanceRef.current) {
      const timeScale = chartInstanceRef.current.timeScale()
      const currentOptions = timeScale.options();

      // 2. Increment bar spacing to widen bars (zoom in)
      timeScale.applyOptions({
        barSpacing: Math.min(currentOptions.barSpacing + 2, 50) // Cap max zoom at 50px
      });
    }
  };

  const handleZoomOut = () => {
    if (chartInstanceRef.current) {
      const timeScale = chartInstanceRef.current.timeScale()
      const currentOptions = timeScale.options();

      // 2. Increment bar spacing to widen bars (zoom in)
      timeScale.applyOptions({
        barSpacing: Math.max(currentOptions.barSpacing - 2, 1) // Cap max zoom at 50px
      });
    }
  };

  if (authStatus === "pending") {
    // loading
    return <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-emerald-500" />
    </div>
  }

  if (authStatus === "unauthorized") {
    return <Navigate to="/login" />
  }

  const handleOrderSuccess = (side: "buy" | "sell") => {
    setOrderSuccess({ success: true, side })
    setTimeout(() => {
      setOrderSuccess({ success: false, side })
    }, 4000)
  }

  console.log("tradetsx", currentPrice)

  return (
    <div className="flex h-screen flex-col bg-[#17191A]">
      <TradeNavbar />
      {orderSuccess.success && <OrderSuccessCard side={orderSuccess.side} />}
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start">
            <div className="mt-4 flex min-w-0 flex-1 flex-col pl-6 pt-4 pr-4">
              <div className="mb-3 flex items-center gap-10 rounded-xl bg-[#1E1F23] px-5 py-3 font-mono">
                <span className="text-[19px]  text-zinc-100">SOL<span className="text-zinc-400">/USD  </span> </span>
                <span className={`text-lg ${currentPrice.side == "buy" ? 'text-green-400' : 'text-red-400'}`}>{currentPrice.price.toFixed(2)}</span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">24H Change</span>
                  <span className="text-sm text-zinc-300">0%</span>
                </div>
              </div>
              <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#1E1F23] ">
                <div ref={chartContainer} className="w-full" style={{ height: CHART_HEIGHT }} />
                <div className="absolute bottom-3 left-3 z-10 flex gap-2">
                  <button
                    onClick={handleZoomIn}
                    style={buttonStyle}
                    title="Zoom In"
                  >
                    ＋
                  </button>
                  <button
                    onClick={handleZoomOut}
                    style={buttonStyle}
                    title="Zoom Out"
                  >
                    －
                  </button>
                </div>
              </div>
            </div>
            <div className="shrink-0 p-3">
              <Orderbook />
            </div>
          </div>
          <div className="pb-6 pl-6 pr-3 pt-4">
            <OpenOrders />
          </div>
        </div>
        <div className="sticky top-0 shrink-0 self-start p-3">
          <OrderEntry orderSuccessToast={(side) => {
            handleOrderSuccess(side)
          }} />
        </div>
      </div>
    </div>
  );
}
