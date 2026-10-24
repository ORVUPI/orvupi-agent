import("./app.mjs").catch(() => {
  const notice = document.getElementById("aviso-navegador");
  if (notice) notice.hidden = false;
});
