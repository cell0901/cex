import { CandlestickSeries, ColorType, createChart, type IChartApi } from "lightweight-charts";
import { OrderEntry } from "./order"
import { Orderbook } from "./orderbook"
import { OpenOrders } from "./open-orders"
import { TradeNavbar } from "./nav"
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { SignalingManager } from "../utils/SignalingManager";

// this should be dynamic route. means diff orderbook and trades and charts for diff market/symbols
const CHART_HEIGHT = 550;

export default function Trade() {


  const navigate = useNavigate()
  const chartContainer = useRef<HTMLDivElement>(null)
  const [authStatus, setAuthStatus] = useState("pending")

  const chartInstanceRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { // using this comp if we cant use useNavigate 
      navigate('/login')
      return
    }

    // send auth request first to ws before connecting to any ws stream
    SignalingManager.getInstance().registerCallback("AUTH", (data: any) => {
      console.log(data)
      setAuthStatus(data.success ? "authorized" : "unauthorized")
    }, "AUTH")

    SignalingManager.getInstance().sendMessage({ type: "AUTH", token })

    return () => {
      SignalingManager.getInstance().deRegisterCallback("AUTH", "AUTH")
    }
  }, []);


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

    lineSeries.setData([
      { time: '2026-06-15', open: 142.10, high: 145.40, low: 141.00, close: 144.80 },
      { time: '2026-06-16', open: 144.80, high: 148.90, low: 143.20, close: 147.10 },
      { time: '2026-06-17', open: 147.10, high: 147.50, low: 139.10, close: 140.30 },
      { time: '2026-06-18', open: 140.30, high: 143.00, low: 138.50, close: 142.50 },
      { time: '2026-06-19', open: 142.50, high: 146.20, low: 141.80, close: 145.90 },
      { time: '2026-06-22', open: 145.90, high: 152.00, low: 145.50, close: 151.20 },
      { time: '2026-06-23', open: 151.20, high: 153.40, low: 149.00, close: 149.80 },
      { time: '2026-06-24', open: 149.80, high: 150.50, low: 144.20, close: 145.10 },
      { time: '2026-06-25', open: 145.10, high: 148.30, low: 143.90, close: 147.60 },
      { time: '2026-06-26', open: 147.60, high: 155.00, low: 147.00, close: 153.90 }
    ]);

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

  return (
    <div className="flex h-screen flex-col bg-[#17191A]">
      <TradeNavbar />
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start">
            <div className="mt-4 flex min-w-0 flex-1 flex-col pl-6 pt-4 pr-4">
              <div className="mb-2 text-md font-mono text-zinc-200">
                <p className="pt-2">
                  Chart
                </p>
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
              <Orderbook
                currentPrice="0.5691"
              />
            </div>
          </div>
          <div className="pb-6 pl-6 pr-3 pt-4">
            <OpenOrders />
          </div>
        </div>
        <div className="sticky top-0 shrink-0 self-start p-3">
          <OrderEntry />
        </div>
      </div>
    </div>
  );
}
