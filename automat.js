/* ============================================================
   SLOTS · automat.js – Gehäuse-Leben: Hebel (Klick oder nach
   unten ziehen) löst DREHEN aus, Hebel schwingt bei jedem Dreh,
   Münzen fallen bei Gewinn in die Schale. Reine Zugabe:
   ohne diese Datei läuft das Spiel genauso.
   ============================================================ */
const hebel = document.getElementById("hebel");
const knopf = document.getElementById("dreh-knopf");
const fenster = document.getElementById("fenster");
const schale = document.querySelector(".gewinnschale .muenzen");
const ruhig = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function schwingen() {
  hebel.classList.remove("gezogen");
  void hebel.offsetWidth; // Animation neu starten
  hebel.classList.add("gezogen");
}
hebel.addEventListener("animationend", () => hebel.classList.remove("gezogen"));

function ziehen() {
  if (knopf.disabled || fenster.classList.contains("dreht")) return;
  schwingen();
  setTimeout(() => knopf.click(), ruhig() ? 0 : 160);
}

// Klick/Tastatur = ziehen; Finger/Maus nach unten wischen = ziehen
let start = null;
hebel.addEventListener("pointerdown", (e) => {
  start = e.clientY;
  hebel.setPointerCapture?.(e.pointerId);
});
hebel.addEventListener("pointermove", (e) => {
  if (start == null) return;
  const d = Math.max(0, Math.min(60, e.clientY - start));
  hebel.style.setProperty("--zug", d / 60);
  if (d >= 45) {
    start = null;
    hebel.style.removeProperty("--zug");
    ziehen();
  }
});
const los = () => {
  start = null;
  hebel.style.removeProperty("--zug");
};
hebel.addEventListener("pointerup", los);
hebel.addEventListener("pointercancel", los);
hebel.addEventListener("click", (e) => {
  if (e.detail === 0 || !hebel.dataset.gewischt) ziehen();
});

// Dreh über DREHEN, Leertaste oder Auto-Drehen: Hebel schwingt mit
let warDreh = false,
  warGewinn = false;
new MutationObserver(() => {
  const dreht = fenster.classList.contains("dreht");
  if (dreht && !warDreh && !hebel.classList.contains("gezogen")) schwingen();
  warDreh = dreht;
  const gewinn = fenster.classList.contains("gewinn");
  if (gewinn && !warGewinn) muenzen();
  warGewinn = gewinn;
}).observe(fenster, { attributes: true, attributeFilter: ["class"] });

function muenzen() {
  if (!schale || ruhig()) return;
  schale.replaceChildren();
  for (let i = 0; i < 9; i++) {
    const m = document.createElement("i");
    m.style.setProperty("--x", `${8 + Math.random() * 84}%`);
    m.style.setProperty("--v", `${i * 70 + Math.random() * 60}ms`);
    m.style.setProperty("--r", `${Math.random() * 360}deg`);
    schale.append(m);
  }
}
