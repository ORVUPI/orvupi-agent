import { ArcElement, BarController, BarElement, CategoryScale, Chart, Legend, LinearScale } from "chart.js";

Chart.register(BarController, BarElement, ArcElement, CategoryScale, LinearScale, Legend);

export function chartPng(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 260;
  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Uno", "Dos", "Tres"],
      datasets: [{ data: [4, 7, 3], backgroundColor: ["#ff3070", "#1d4e89", "#0b5d36"], borderWidth: 0 }],
    },
    options: { animation: false, responsive: false, plugins: { legend: { display: false } } },
  });
  const url = canvas.toDataURL("image/png");
  chart.destroy();
  return url;
}

export function drawingPng(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#fff8ec";
  ctx.fillRect(0, 0, 360, 200);
  ctx.fillStyle = "#ff3070";
  ctx.fillRect(28, 48, 110, 72);
  ctx.strokeStyle = "#1d4e89";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(150, 84);
  ctx.lineTo(250, 84);
  ctx.stroke();
  ctx.fillStyle = "#0b5d36";
  ctx.beginPath();
  ctx.arc(286, 84, 28, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/png");
}
