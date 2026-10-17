import { ArcElement, BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, LineController, LineElement, PieController, PointElement, Title, Tooltip } from "chart.js";
import { useEffect, useRef } from "react";

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, PieController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

const PALETTE = ["#ff3070", "#1d4e89", "#0b5d36", "#7a4a00", "#5b2a86", "#102032"];

export function OrvupiChart({
  kind,
  title,
  labels,
  values,
}: {
  kind: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  values: number[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const chart = new Chart(node, {
      type: kind,
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: kind === "pie" ? PALETTE : "#0b5d36",
          borderColor: "#102032",
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: kind === "pie" },
          title: { display: true, text: title, color: "#102032" },
        },
        scales: kind === "pie" ? {} : { x: { ticks: { color: "#102032" } }, y: { ticks: { color: "#102032" } } },
      },
    });
    return () => chart.destroy();
  }, [kind, title, labels.join("|"), values.join("|")]);

  return <canvas ref={ref} role="img" aria-label={title} />;
}
