import { ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler, Legend, LinearScale, LineController, LineElement, PieController, PointElement, ScatterController, Title, Tooltip } from "chart.js";
import { useEffect, useRef } from "react";

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, PieController, DoughnutController, ScatterController, Filler, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

const PALETTE = ["#ff3070", "#1d4e89", "#0b5d36", "#7a4a00", "#5b2a86", "#102032"];

export function OrvupiChart({
  kind,
  title,
  labels,
  values,
}: {
  kind: "bar" | "line" | "pie" | "scatter" | "area" | "gauge";
  title: string;
  labels: string[];
  values: number[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const chartKind = kind === "area" ? "line" : kind === "gauge" ? "doughnut" : kind;
    const gaugeMax = Math.max(100, ...values, 1);
    const gaugeValue = values[0] ?? 0;
    const chart = new Chart(node, {
      type: chartKind,
      data: {
        labels: kind === "gauge" ? [title, ""] : labels,
        datasets: [{
          label: title,
          data: kind === "scatter"
            ? values.map((value, index) => ({ x: index + 1, y: value }))
            : kind === "gauge"
              ? [Math.max(0, Math.min(gaugeMax, gaugeValue)), Math.max(0, gaugeMax - gaugeValue)]
              : values,
          backgroundColor: kind === "pie" || kind === "gauge" ? PALETTE : kind === "area" ? "rgba(11, 93, 54, 0.35)" : "#0b5d36",
          borderColor: "#102032",
          borderWidth: 1,
          fill: kind === "area",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: kind === "pie" || kind === "gauge" },
          title: { display: true, text: title, color: "#102032" },
        },
        scales: kind === "pie" || kind === "gauge" ? {} : { x: { ticks: { color: "#102032" } }, y: { ticks: { color: "#102032" } } },
      },
    });
    return () => chart.destroy();
  }, [kind, title, labels.join("|"), values.join("|")]);

  return <canvas ref={ref} role="img" aria-label={title} />;
}
