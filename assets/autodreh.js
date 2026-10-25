/* ============================================================
   AUTO-DREHEN (Autoplay) für die Walzen-Automaten
   Slots, Angelglück, Tempelschatz. Spielgeld, kein Echtgeld.

   Echte Automaten bieten „Autoplay“: Man stellt eine Anzahl Drehs ein,
   und der Automat spielt allein weiter. Das erhöht das Tempo, und man
   denkt zwischen den Drehs nicht mehr nach. Deshalb ist Autoplay bei
   virtuellen Automaten in Deutschland (Glücksspielstaatsvertrag 2021)
   und in Großbritannien (seit Oktober 2021) verboten. Hier darf es
   als Anschauungsobjekt laufen, mit den Stopp-Regeln, die seriöse
   Anbieter früher angeboten haben:
     - feste Anzahl Drehs (10 / 25 / 50 / 100)
     - Verlustgrenze: hält an, sobald die Bilanz seit dem Start um den
       Betrag im Minus ist
     - Stopp bei einem großen Einzelgewinn (ab x10 / x25 / x50 Einsatz)
     - Stopp nach Freispielen (nur bei Spielen mit Freispielen)
   Außerdem hält das Auto-Drehen an, wenn ein Dialog aufgeht (z. B. Pleite),
   der Tab in den Hintergrund geht oder das Konto den Einsatz nicht mehr trägt.

   Das Modul ändert NICHTS an Zufall, Quoten oder Auszahlung. Es ruft nur
   die normale Dreh-Funktion des Spiels nacheinander auf.

   Schnittstelle:
     autoDrehEinrichten({
       spiel,          // Schlüssel für storage.js (Einstellungen merken)
       drehKnopf,      // der DREHEN-Knopf; der Auto-Knopf kommt daneben
       drehen,         // async () => { einsatz, auszahlung, netto, freispiele } oder null
       bereit,         // () => true, wenn gerade ein neuer Dreh starten darf
       hatFreispiele,  // true: Option „nach Freispielen anhalten“ anbieten
       melden,         // (text) => Text in der Dreh-Info anzeigen
       beiAenderung,   // () => Steuerung neu zeichnen (Knöpfe sperren/entsperren)
     })
     -> { aktiv(), stoppen(grund) }
   ============================================================ */

import { lade, speichere } from "./storage.js";

/** Zahl mit Tausenderpunkt: 1250 -> "1.250" (wie in den Spielen). */
const zahlText = (n) => n.toLocaleString("de-DE");

export const ANZAHLEN = [10, 25, 50, 100];
export const VERLUSTGRENZEN = [0, 100, 250, 500, 1000]; // 0 = aus
export const GEWINNSTOPPS = [0, 10, 25, 50]; // Vielfaches des Einsatzes, 0 = aus
const PAUSE_MS = 450; // kurze Pause zwischen zwei Drehs (Ergebnis bleibt kurz stehen)

/**
 * Reine Funktion (testbar): Muss das Auto-Drehen nach diesem Dreh anhalten?
 * Liefert den Grund als Text oder null.
 */
export function stoppGrund(stand, einstellung, ergebnis) {
  if (!ergebnis) return "Dreh nicht möglich (Konto reicht nicht)";
  if (einstellung.verlust > 0 && -stand.bilanz >= einstellung.verlust)
    return "Verlustgrenze erreicht";
  if (einstellung.gewinn > 0 && ergebnis.auszahlung >= einstellung.gewinn * ergebnis.einsatz)
    return `Gewinn ab ×${einstellung.gewinn} Einsatz`;
  if (einstellung.freispiele && ergebnis.freispiele) return "Freispiele gespielt";
  if (stand.gespielt >= einstellung.anzahl) return "alle Drehs gespielt";
  return null;
}

function einstellungPruefen(roh) {
  const e = roh && typeof roh === "object" ? roh : {};
  return {
    anzahl: ANZAHLEN.includes(e.anzahl) ? e.anzahl : 25,
    verlust: VERLUSTGRENZEN.includes(e.verlust) ? e.verlust : 250,
    gewinn: GEWINNSTOPPS.includes(e.gewinn) ? e.gewinn : 0,
    freispiele: e.freispiele !== false,
  };
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

export function autoDrehEinrichten({
  spiel,
  drehKnopf,
  drehen,
  bereit,
  hatFreispiele = false,
  melden = () => {},
  beiAenderung = () => {},
}) {
  let einstellung = einstellungPruefen(lade(spiel, "auto", null));
  let aktiv = false;
  let stoppWunsch = null; // Grund, falls der Nutzer oder ein Ereignis anhalten will
  let stand = { gespielt: 0, bilanz: 0 };

  // ----- Knopf neben DREHEN -----
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = "knopf auto-knopf";
  knopf.id = "auto-knopf";
  knopf.setAttribute("aria-haspopup", "dialog");
  drehKnopf.after(knopf);

  const statusZeile = document.createElement("p");
  statusZeile.className = "auto-status klein";
  statusZeile.setAttribute("aria-live", "polite");
  statusZeile.hidden = true;
  drehKnopf.parentElement.after(statusZeile);

  function knopfZeichnen() {
    if (aktiv) {
      knopf.textContent = stoppWunsch
        ? "HÄLT AN …"
        : `STOPP ${stand.gespielt}/${einstellung.anzahl}`;
      knopf.classList.add("laeuft");
      knopf.setAttribute(
        "aria-label",
        `Auto-Drehen stoppen, ${stand.gespielt} von ${einstellung.anzahl} gespielt`,
      );
      knopf.removeAttribute("aria-haspopup");
      knopf.disabled = Boolean(stoppWunsch);
      statusZeile.hidden = false;
      const b = stand.bilanz;
      statusZeile.textContent = `Auto-Drehen: ${stand.gespielt} von ${einstellung.anzahl}, Bilanz ${b > 0 ? "+" : b < 0 ? "−" : "±"}${zahlText(Math.abs(b))}`;
    } else {
      knopf.textContent = "AUTO";
      knopf.classList.remove("laeuft");
      knopf.setAttribute("aria-label", "Auto-Drehen einstellen");
      knopf.setAttribute("aria-haspopup", "dialog");
      knopf.disabled = !bereit();
    }
  }

  // ----- Einstellungs-Dialog -----
  function auswahl(name, titel, werte, aktuell, text) {
    const feld = document.createElement("fieldset");
    feld.className = "auto-feld";
    const legende = document.createElement("legend");
    legende.textContent = titel;
    const reihe = document.createElement("div");
    reihe.className = "chips auto-chips";
    for (const wert of werte) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.wert = String(wert);
      b.textContent = text(wert);
      b.setAttribute("aria-pressed", String(wert === aktuell));
      b.addEventListener("click", () => {
        reihe
          .querySelectorAll(".chip")
          .forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        feld.dataset.wert = String(wert);
      });
      reihe.append(b);
    }
    feld.dataset.wert = String(aktuell);
    feld.dataset.name = name;
    feld.append(legende, reihe);
    return feld;
  }

  function dialogZeigen() {
    if (document.querySelector("dialog[open]") || !bereit()) return;
    const dialog = document.createElement("dialog");
    dialog.className = "spiel-dialog auto-dialog";
    dialog.setAttribute("aria-labelledby", "auto-titel");

    const titel = document.createElement("h2");
    titel.id = "auto-titel";
    titel.textContent = "Auto-Drehen";

    const felder = [
      auswahl("anzahl", "Anzahl Drehs", ANZAHLEN, einstellung.anzahl, (w) => String(w)),
      auswahl("verlust", "Anhalten bei Verlust von", VERLUSTGRENZEN, einstellung.verlust, (w) =>
        w === 0 ? "nie" : zahlText(w),
      ),
      auswahl("gewinn", "Anhalten bei Einzelgewinn ab", GEWINNSTOPPS, einstellung.gewinn, (w) =>
        w === 0 ? "nie" : `×${w}`,
      ),
    ];

    let fsHaken = null;
    const zusatz = [];
    if (hatFreispiele) {
      const label = document.createElement("label");
      label.className = "auto-haken";
      fsHaken = document.createElement("input");
      fsHaken.type = "checkbox";
      fsHaken.checked = einstellung.freispiele;
      label.append(fsHaken, " Nach Freispielen anhalten");
      zusatz.push(label);
    }

    const hinweis = document.createElement("p");
    hinweis.className = "auto-hinweis";
    hinweis.textContent =
      "Wie bei echten Automaten: Es wird weitergedreht, ohne dass du klickst. Genau deshalb ist Autoplay " +
      "an Online-Automaten in Deutschland und Großbritannien verboten. Hier ist es nur Spielgeld. " +
      "Stoppen: Auto-Knopf oder Leertaste." +
      (hatFreispiele ? "" : " Gewinne werden automatisch gesammelt (kein Risiko-Angebot).");

    const aktionen = document.createElement("div");
    aktionen.className = "aktionen";
    const start = document.createElement("button");
    start.type = "button";
    start.className = "knopf primaer";
    start.textContent = "Starten";
    const abbrechen = document.createElement("button");
    abbrechen.type = "button";
    abbrechen.className = "knopf";
    abbrechen.textContent = "Abbrechen";
    aktionen.append(start, abbrechen);

    dialog.append(titel, ...felder, ...zusatz, hinweis, aktionen);
    /** Schließt und entfernt den Dialog (auch bei Esc). Hängt NICHT am close-Ereignis, das nicht überall zuverlässig kommt. */
    function wegraeumen() {
      if (dialog.open) dialog.close();
      if (dialog.isConnected) {
        dialog.remove();
        knopf.focus({ preventScroll: true });
      }
    }
    start.addEventListener("click", () => {
      const wert = (name) => Number(felder.find((f) => f.dataset.name === name).dataset.wert);
      einstellung = einstellungPruefen({
        anzahl: wert("anzahl"),
        verlust: wert("verlust"),
        gewinn: wert("gewinn"),
        freispiele: fsHaken ? fsHaken.checked : false,
      });
      speichere(spiel, "auto", einstellung);
      wegraeumen();
      schleife();
    });
    abbrechen.addEventListener("click", wegraeumen);
    dialog.addEventListener("close", wegraeumen); // Esc
    document.body.append(dialog);
    dialog.showModal();
    start.focus();
  }

  // ----- Die Schleife -----
  async function schleife() {
    if (aktiv || !bereit()) return;
    aktiv = true;
    stoppWunsch = null;
    stand = { gespielt: 0, bilanz: 0 };
    knopfZeichnen();
    beiAenderung();
    let grund = null;
    try {
      while (!grund) {
        if (stoppWunsch) {
          grund = stoppWunsch;
          break;
        }
        if (!bereit()) {
          grund = "Spiel ist beschäftigt";
          break;
        }
        const ergebnis = await drehen();
        if (ergebnis) {
          stand.gespielt++;
          stand.bilanz += ergebnis.netto;
        }
        knopfZeichnen();
        grund = stoppWunsch || stoppGrund(stand, einstellung, ergebnis);
        if (!grund && document.querySelector("dialog[open]")) grund = "Dialog geöffnet";
        if (!grund) await warte(PAUSE_MS);
      }
    } finally {
      aktiv = false;
      stoppWunsch = null;
      const b = stand.bilanz;
      const bilanz = `${b > 0 ? "+" : b < 0 ? "−" : "±"}${zahlText(Math.abs(b))}`;
      const text = `Auto-Drehen beendet (${grund || "gestoppt"}): ${stand.gespielt} Drehs, Bilanz ${bilanz}.`;
      statusZeile.textContent = text;
      statusZeile.hidden = stand.gespielt === 0;
      melden(text);
      knopfZeichnen();
      beiAenderung();
    }
  }

  function stoppen(grund = "von dir gestoppt") {
    if (!aktiv || stoppWunsch) return;
    stoppWunsch = grund;
    knopfZeichnen();
  }

  knopf.addEventListener("click", () => {
    if (aktiv) stoppen();
    else dialogZeigen();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stoppen("Tab im Hintergrund");
  });

  knopfZeichnen();
  return {
    aktiv: () => aktiv,
    stoppen,
    /** Nach jeder Steuerungs-Aktualisierung des Spiels aufrufen (Knopf sperren, solange gedreht wird). */
    aktualisieren: knopfZeichnen,
  };
}
