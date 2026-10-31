/**
 * Velas con TradingView lightweight-charts 5.0.9 (Apache-2.0).
 * Solo pinta la serie recibida. Si no hay velas, no crea el gráfico.
 */
import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, createChart } from "/assets/vendor/lightweight-charts-5.0.9.mjs";
import { POLL_MS } from "./ohlcv.mjs";

const UP = "#0b5d36";
const DOWN = "#a3123f";

export function mountLiveChart(host, load, hooks = {}) {
  let dead = false;
  let timer = 0;
  let chart = null;
  let candlesSeries = null;
  let volumeSeries = null;
  let last = null;

  const canvas = document.createElement("div");
  canvas.className = "vf-chart-canvas";
  const empty = document.createElement("p");
  empty.className = "vf-empty";
  host.replaceChildren(canvas, empty);

  function destroyChart() {
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
      empty.textContent = hooks.emptyText || "sin datos";
      return;
    }
    empty.hidden = true;
    canvas.hidden = false;
    if (!chart) {
      chart = createChart(canvas, {
        autoSize: true,
        layout: { background: { type: ColorType.Solid, color: "#fffdf8" }, textColor: "#102032", fontFamily: "Inter, system-ui, sans-serif" },
        grid: { vertLines: { color: "#f3e3ea" }, horzLines: { color: "#f3e3ea" } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#ff3070", labelBackgroundColor: "#102032" }, horzLine: { color: "#ff3070", labelBackgroundColor: "#102032" } },
        rightPriceScale: { borderColor: "#102032" },
        timeScale: { borderColor: "#102032", timeVisible: true, secondsVisible: false },
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
      chart.subscribeCrosshairMove((param) => {
        const point = param?.seriesData?.get(candlesSeries);
        hooks.onCrosshair?.(point && point.open != null ? point : null);
      });
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
        color: candle.close >= candle.open ? "rgba(11,93,54,0.45)" : "rgba(163,18,63,0.45)",
      })));
    } else if (volumeSeries) {
      chart.removeSeries(volumeSeries);
      volumeSeries = null;
    }
    chart.timeScale().fitContent();
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
