/**
 * Velas con TradingView lightweight-charts 5.0.9 (Apache-2.0).
 * Solo pinta la serie recibida. Si no hay velas, no crea el gráfico.
 */
import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, createChart } from "/assets/vendor/lightweight-charts-5.0.9.mjs";
import { POLL_MS } from "./ohlcv.mjs";

const UP = "#16c784";
const DOWN = "#ea3943";

export function mountLiveChart(host, load, hooks = {}) {
  let dead = false;
  let timer = 0;
  let chart = null;
  let candlesSeries = null;
  let volumeSeries = null;
  let last = null;
  let observer = null;

  const canvas = document.createElement("div");
  canvas.className = "vf-chart-canvas";
  canvas.hidden = true;
  const empty = document.createElement("p");
  empty.className = "vf-skel";
  empty.setAttribute("aria-busy", "true");
  host.replaceChildren(canvas, empty);

  function box() {
    const width = Math.floor(canvas.clientWidth);
    const height = Math.floor(canvas.clientHeight);
    return width >= 20 && height >= 20 ? { width, height } : null;
  }

  function fit() {
    if (!chart || dead) return;
    const size = box();
    if (!size) return;
    chart.resize(size.width, size.height);
    chart.timeScale().fitContent();
  }

  function destroyChart() {
    observer?.disconnect();
    observer = null;
    chart?.remove();
    chart = null;
    candlesSeries = null;
    volumeSeries = null;
  }

  function paint(result) {
    last = result;
    hooks.onStatus?.(result);
    if (!result || !result.candles || result.candles.length === 0) {
      destroyChart();
      canvas.hidden = true;
      empty.hidden = false;
      empty.className = "vf-empty";
      empty.removeAttribute("aria-busy");
      empty.textContent = hooks.emptyText || "sin datos";
      return;
    }
    empty.hidden = true;
    canvas.hidden = false;
    if (!chart) {
      const size = box() || { width: Math.max(320, host.clientWidth || 640), height: Math.max(280, host.clientHeight || 420) };
      chart = createChart(canvas, {
        ...size,
        autoSize: false,
        layout: { background: { type: ColorType.Solid, color: "#10161d" }, textColor: "#e7edf4", fontFamily: "Inter, system-ui, sans-serif" },
        grid: { vertLines: { color: "#243041" }, horzLines: { color: "#243041" } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#8b97a6", labelBackgroundColor: "#102032" }, horzLine: { color: "#8b97a6", labelBackgroundColor: "#102032" } },
        rightPriceScale: { borderColor: "#2a3544" },
        timeScale: { borderColor: "#2a3544", timeVisible: true, secondsVisible: false },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
        kineticScroll: { touch: true, mouse: false },
      });
      candlesSeries = chart.addSeries(CandlestickSeries, {
        upColor: UP,
        downColor: DOWN,
        borderUpColor: UP,
        borderDownColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
      });
      candlesSeries.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: result.volumeKnown ? 0.28 : 0.08 } });
      observer = new ResizeObserver(() => fit());
      observer.observe(canvas);
    }
    candlesSeries.setData(result.candles.map((candle) => ({ time: candle.time, open: candle.open, high: candle.high, low: candle.low, close: candle.close })));
    if (result.volumeKnown) {
      if (!volumeSeries) {
        volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
        chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      }
      volumeSeries.setData(result.candles.filter((candle) => candle.volume != null).map((candle) => ({
        time: candle.time,
        value: candle.volume,
        color: candle.close >= candle.open ? "rgba(22,199,132,0.45)" : "rgba(234,57,67,0.45)",
      })));
    } else if (volumeSeries) {
      chart.removeSeries(volumeSeries);
      volumeSeries = null;
    }
    requestAnimationFrame(() => requestAnimationFrame(fit));
  }

  async function tick() {
    if (dead || document.visibilityState === "hidden") {
      if (!dead && document.visibilityState === "hidden") hooks.onPause?.();
      return;
    }
    try {
      const result = await load();
      if (!dead) paint(result);
    } catch {
      if (!dead) paint({ ok: false, state: "requiere-atencion", candles: last?.candles || [], provider: last?.provider || "", fetchedAt: new Date().toISOString(), scope: last?.scope || "" });
    }
  }

  function onVisible() {
    if (!dead && document.visibilityState === "visible") tick();
  }
  document.addEventListener("visibilitychange", onVisible);
  if (hooks.initial?.candles?.length) paint(hooks.initial);
  tick();
  timer = window.setInterval(tick, POLL_MS);

  return {
    stop() {
      dead = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      destroyChart();
    },
  };
}
