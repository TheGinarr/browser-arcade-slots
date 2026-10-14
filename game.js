/* ============================================================
   Slots · game.js
   ------------------------------------------------------------
   SO FUNKTIONIERT DIESES SPIEL
   1. Drei Walzen mit je drei sichtbaren Symbolen (3x3-Fenster), aber
      bewusst nur EINE Gewinnlinie: die mittlere Reihe. Das hält die
      Regeln und die Rechnung übersichtlich. Echte Automaten haben
      oft 5, 10 oder 20 Linien, die Mathematik dahinter ist dieselbe,
      nur länger.
   2. Jede Walze ist ein festes Array (das "Walzenband") mit 20 Feldern.
      Wie oft ein Symbol im Array steht, bestimmt seine Wahrscheinlichkeit.
      Das ist der Lernkern dieses Spiels: Die Wahrscheinlichkeiten und
      die Auszahlungsquote (RTP) ergeben sich komplett aus den Bändern
      und der Gewinntabelle, es gibt keine versteckte "Gewinn-Logik".
   3. Ein Dreh: Einsatz abbuchen -> pro Walze einen Stopp-Index würfeln
      -> Gewinnlinie auswerten -> Walzen animiert auslaufen lassen ->
      (bei Gewinn: feiern, Risiko anbieten) -> Auszahlung gutschreiben.
      Das Ergebnis steht also schon fest, bevor sich die Walzen bewegen;
      die Animation ist nur Show.
   4. Die Regeln stehen in reinen Funktionen (gewinnAuswerten,
      zufallsStopps, rtpBerechnen, laufPlanErstellen …). Sie kennen kein
      DOM und lassen sich in Node testen (siehe Simulation unten).
   5. Große Gewinne werden gefeiert (assets/gewinnfeier.js): Stufe nach dem Faktor
      Auszahlung / Einsatz (ab x5, x15, x40). Das ist reine Anzeige NACH der
      Auswertung und ändert nichts an Quoten, RTP oder Konto.
   6. Das Geld läuft NUR über ../assets/wallet.js (gemeinsames Konto aller
      Casino-Spiele). Slots-eigen ist nur die Topliste (Schlüssel "slots")
      und der gemerkte Einsatz.
   7. DRAMATURGIE (Sound, Spannungs-Stopp, "So knapp!", Lauflicht): Echte
      Automaten sind auch Inszenierung. Diese Seite zeigt vier solcher Mittel,
      aber nach zwei festen Regeln:
        a) Das Ergebnis bleibt ehrlich zufällig. spannungPruefen() und
           fastGewinnPruefen() LESEN nur das fertige Ergebnis; sie wählen keinen
           Stopp aus und erzeugen keinen "Beinahe-Treffer". (Manche echten Geräte
           steuern genau das über gewichtete "virtuelle Walzen". Wir dramatisieren
           nur, was der Zufall wirklich geliefert hat.)
        b) Die Netto-Anzeige bleibt ehrlich: ein Verlust von 10 steht als -10 da,
           egal wie laut es vorher geklingelt hat.
      Die Töne kommen aus ../assets/klang.js (Web-Audio, keine Audiodateien).
   8. RISIKO (assets/risiko.js): Nach jedem Gewinn und nach der Gewinnfeier darf der
      Spieler sammeln oder riskieren (Risikoleiter oder Rot/Schwarz, jeweils exakt
      50/50, Obergrenze 5.000). Weil das Risiko-Ergebnis erst NACH dem Dreh entsteht,
      gilt für das Geld:
        - Der Einsatz ist von Anfang an abgebucht.
        - Die Auszahlung wird erst NACH der Entscheidung gutgeschrieben, und zwar der
          ENDBETRAG (0 bei Verlust, der Gewinn bei Sammeln, mehr bei Erfolg).
        - offeneRunde.auszahlung ist stets der aktuell SICHERE Betrag (Start: der
          Gewinn des Drehs). Das Risiko-Modul meldet jede Änderung sofort nach der
          Ziehung (beiAenderung). Verlässt man die Seite mittendrin, bucht pagehide
          genau diesen Betrag: ein gewonnener Schritt bleibt, ein Absturz bleibt ein
          Absturz, und nichts geht durch das Weggehen verloren.
        - Zeit: Reagiert man 20 Sekunden lang nicht, wird automatisch gesammelt.
          Niemand verliert Geld, nur weil er weggegangen ist. (Zum Testen lässt sich die
          Zeit mit ?risikoTimeout=3000 in der Adresse verkürzen.)
        - Die Topliste bekommt den Netto-Gewinn des ENDBETRAGS.

   AUSZAHLUNGSQUOTE (RTP) – EXAKTE RECHNUNG
   Walzenband (je Walze gleiche Zusammensetzung, nur andere Reihenfolge):
     20 Felder = 10 Kirschen, 3 Zitronen, 2 Melonen, 2 Glocken, 2 Sterne, 1 Sieben.
   Die Walzen sind unabhängig, es gibt 20 x 20 x 20 = 8000 gleich
   wahrscheinliche Stopp-Kombinationen. Für Dreier zählt Anzahl hoch 3:
     3 x Sieben     :    1^3 =    1 Kombinationen x  50 =    50
     3 x Stern      :    2^3 =    8                x  25 =   200
     3 x Glocke     :    2^3 =    8                x  15 =   120
     3 x Melone     :    2^3 =    8                x   8 =    64
     3 x Zitrone    :    3^3 =   27                x   6 =   162
     3 x Kirsche    :   10^3 = 1000                x   5 =  5000
     2 Kirschen links (Walze 1+2 Kirsche, Walze 3 KEINE Kirsche):
                       10 x 10 x 10 = 1000          x   2 =  2000
                                                    Summe =  7596
   RTP = 7596 / 8000 = 0,9495 = 94,95 %   (Hausvorteil 5,05 %)
   Trefferquote (irgendein Gewinn): (1+8+8+8+27+1000+1000) / 8000 = 25,65 %

   SIMULATION (Node, 1.000.000 Drehs mit Math.random, pure Funktionen aus
   diesem Modul, Einsatz 1):
     rtpBerechnen()  (exakt, alle 8000 Kombinationen) = 0,9495
     simulierter RTP (erster Lauf)                    = 0,9465
     fünf weitere Läufe                               = 0,9520 / 0,9495 / 0,9486 / 0,9476 / 0,9489
     simulierte Trefferquote                          = 25,66 % (exakt: 25,65 %)
   Alle Läufe liegen im Zielkorridor 0,90 bis 0,97. Der simulierte Wert
   schwankt um den exakten Wert (Gesetz der großen Zahlen): Die Streuung
   eines einzelnen Drehs ist mit etwa 2 Einsätzen groß (selten hohe
   Treffer), bei einer Million Drehs bleibt davon ein Standardfehler von
   rund 0,002 = 0,2 Prozentpunkten.
   ============================================================ */

import { bewegungReduziert, toplisteAnzeigen, stillEintragen } from "./assets/ui.js";
import { gewinnFeiern, stufeBestimmen } from "./assets/gewinnfeier.js";
import { risikoAnbieten, RISIKO_TIMEOUT_MS } from "./assets/risiko.js";
import {
  klangSpinStart,
  klangWalzenStopp,
  klangSpannung,
  klangFastGewinn,
  klangGewinn,
  klangMuenzTick,
  tonKnopf,
} from "./assets/klang.js";
import { lade, speichere, entferne } from "./assets/storage.js";
import {
  STARTGELD,
  kontostand,
  statistik,
  einsatzAbbuchen,
  rundeAbschliessen,
  istPleite,
  pleiteNeustart,
  walletHud,
  walletHudAktualisieren,
} from "./assets/wallet.js";

const SPIEL = "slots"; // Schlüssel für storage.js (Topliste, Einsatz)
const SPANNUNG_REDUZIERT_MS = 150; // Spannungs-Pause bei "Bewegung reduzieren" (höchstens 0,3 s erlaubt)
const MUENZ_TICK_ABSTAND_MS = 70; // Münz-Ticks höchstens so oft (gedrosselt, sonst wird es Dauerrattern)
const MINDEST_NETTO_FUER_TOPLISTE = 100; // kleinere Gewinne füllen die Topliste nicht (und öffnen keinen Dialog)
const RISIKO_MAX_BETRAG = 5000; // Obergrenze des Risiko-Features: darüber wird nie ausgezahlt

/* ============================================================
   TEIL 1: REINE SPIELLOGIK (ohne DOM)
   "export" steht nur da, damit Tests in Node die Funktionen
   importieren können. Im Browser wird es nicht gebraucht.
   ============================================================ */

/** Die wählbaren Einsätze (passend zu den Chip-Knöpfen in index.html). */
export const EINSATZSTUFEN = [10, 25, 50, 100];

/** Anzeigenamen der Symbole (für Screenreader und Meldungen). */
export const SYMBOL_NAMEN = {
  sieben: "Neon-7",
  stern: "Stern",
  glocke: "Glocke",
  melone: "Melone",
  zitrone: "Zitrone",
  kirsche: "Kirsche",
};

/*
 * Kurznamen, damit die Walzenbänder unten lesbar bleiben.
 * (Jede Zeile hat genau 20 Einträge – das lässt sich beim Lesen leicht nachzählen.)
 */
const KIR = "kirsche",
  ZIT = "zitrone",
  MEL = "melone",
  GLO = "glocke",
  STE = "stern",
  SIE = "sieben";

/**
 * Die drei Walzenbänder. Das Band ist RINGFÖRMIG gedacht: Nach dem letzten
 * Feld kommt wieder das erste. Steht eine Walze auf Index 5, liegt dieses
 * Symbol auf der Gewinnlinie, Index 4 sieht man oben und Index 6 unten.
 *
 * Zusammensetzung je Walze (identisch): 10x KIR, 3x ZIT, 2x MEL, 2x GLO, 2x STE, 1x SIE.
 * Nur die Reihenfolge unterscheidet sich, damit die Walzen nebeneinander
 * nicht wie Kopien aussehen. Auf die Wahrscheinlichkeiten hat die Reihenfolge
 * keinen Einfluss, weil jeder Stopp-Index gleich wahrscheinlich ist.
 */
export const WALZENBAENDER = [
  [
    KIR,
    KIR,
    ZIT,
    MEL,
    KIR,
    GLO,
    KIR,
    ZIT,
    KIR,
    STE,
    KIR,
    KIR,
    SIE,
    MEL,
    KIR,
    ZIT,
    KIR,
    GLO,
    STE,
    KIR,
  ],
  [
    KIR,
    GLO,
    KIR,
    KIR,
    ZIT,
    KIR,
    STE,
    KIR,
    MEL,
    KIR,
    ZIT,
    KIR,
    SIE,
    STE,
    KIR,
    KIR,
    ZIT,
    MEL,
    KIR,
    GLO,
  ],
  [
    KIR,
    STE,
    KIR,
    MEL,
    KIR,
    ZIT,
    KIR,
    KIR,
    SIE,
    GLO,
    KIR,
    ZIT,
    STE,
    KIR,
    GLO,
    KIR,
    KIR,
    ZIT,
    MEL,
    KIR,
  ],
];

/** Dreier-Quoten: Auszahlung = Quote x Einsatz (bei 3 gleichen Symbolen auf der Linie). */
export const DREIER_QUOTEN = {
  sieben: 50,
  stern: 25,
  glocke: 15,
  melone: 8,
  zitrone: 6,
  kirsche: 5,
};

/** Kleine Quote: Kirsche auf Walze 1 UND 2 (Walze 3 ist keine Kirsche). */
export const KIRSCHPAAR_QUOTE = 2;

/**
 * Wertet die Gewinnlinie aus. `linie` = die drei Symbole der mittleren Reihe,
 * von links nach rechts, z. B. ["kirsche", "kirsche", "glocke"].
 * Rückgabe: { art, symbol, quote, treffer }
 *   art     "dreier" | "kirschpaar" | "nichts"
 *   symbol  das gewinnende Symbol (oder null)
 *   quote   Gewinnfaktor (0 bei "nichts")
 *   treffer Positionen der Gewinnsymbole auf der Linie, z. B. [0, 1, 2]
 *
 * Reihenfolge der Prüfung ist wichtig: Erst der Dreier (also auch drei
 * Kirschen = x5), danach erst das Kirschpaar. Sonst würden drei Kirschen
 * fälschlich nur als Paar (x2) bezahlt.
 */
export function gewinnAuswerten(linie) {
  const [a, b, c] = linie;
  if (a === b && b === c) {
    return { art: "dreier", symbol: a, quote: DREIER_QUOTEN[a], treffer: [0, 1, 2] };
  }
  if (a === "kirsche" && b === "kirsche") {
    return { art: "kirschpaar", symbol: "kirsche", quote: KIRSCHPAAR_QUOTE, treffer: [0, 1] };
  }
  return { art: "nichts", symbol: null, quote: 0, treffer: [] };
}

/** Brutto-Auszahlung eines Drehs (Einsatz x Quote). Bei einer Niete 0. */
export function auszahlungBerechnen(linie, einsatz) {
  return einsatz * gewinnAuswerten(linie).quote;
}

/**
 * Würfelt für jede Walze einen Stopp-Index (0 … Bandlänge-1), alle gleich
 * wahrscheinlich.
 *
 * WARUM Math.random()? Kryptografischer Zufall (crypto.getRandomValues)
 * schützt davor, dass jemand Ergebnisse VORHERSAGT, um echtes Geld zu
 * gewinnen. Hier gibt es nur Spielgeld, also wäre das Overkill.
 * `zufall` ist austauschbar (Standard Math.random) – für Tests.
 */
export function zufallsStopps(baender = WALZENBAENDER, zufall = Math.random) {
  return baender.map((band) => Math.floor(zufall() * band.length));
}

/** Die drei Symbole der Gewinnlinie für gegebene Stopp-Indizes. */
export function linieAusStopps(stopps, baender = WALZENBAENDER) {
  return baender.map((band, i) => band[stopps[i]]);
}

/**
 * Berechnet die Auszahlungsquote (RTP) EXAKT: Alle Stopp-Kombinationen
 * (20 x 20 x 20 = 8000) werden einmal durchgespielt, die Quoten addiert und
 * durch die Anzahl geteilt. Ergebnis = durchschnittliche Auszahlung pro
 * 1 Einsatz, also 0,9495 = 94,95 %.
 * Das ist der "Beweis" für die Handrechnung im Kommentar ganz oben.
 */
export function rtpBerechnen(baender = WALZENBAENDER) {
  let summeQuoten = 0;
  let anzahl = 0;
  let treffer = 0;
  for (let i = 0; i < baender[0].length; i++) {
    for (let j = 0; j < baender[1].length; j++) {
      for (let k = 0; k < baender[2].length; k++) {
        const quote = gewinnAuswerten([baender[0][i], baender[1][j], baender[2][k]]).quote;
        summeQuoten += quote;
        if (quote > 0) treffer++;
        anzahl++;
      }
    }
  }
  return { rtp: summeQuoten / anzahl, trefferquote: treffer / anzahl, kombinationen: anzahl };
}

/* ------------------------------------------------------------
   Animationsplanung (auch rein rechnerisch, ohne DOM)
   ------------------------------------------------------------
   Eine Walze "rollt" mit konstantem Tempo und bremst am Ende mit
   easeOutBack ab, das kurz übers Ziel hinausschwingt und zurückfedert.
   Positionen werden in FELDERN gerechnet (1.0 = ein Symbol weiter).
   "vorschub" ist die Strecke, die das Band seit dem Start nach unten
   gelaufen ist. Das Symbol auf der Gewinnlinie ist dann Index
   (start - vorschub) modulo Bandlänge. */

const BREMS_WEG = 2.5; // so viele Felder legt die Walze in der Bremsphase zurück
const BREMS_ZEIT = 0.5; // Sekunden für die Bremsphase
const BOUNCE = 1.3; // Stärke des Überschwingens (0 = gar nicht, 1,7 = deutlich)
/* Ableitung (= Anfangsgeschwindigkeit) von easeOutBack bei x=0 ist BOUNCE+3.
   Rollt die Walze genau so schnell, geht sie ohne Ruck in die Bremsphase über. */
const LAUF_TEMPO = (BREMS_WEG * (BOUNCE + 3)) / BREMS_ZEIT; // Felder pro Sekunde (hier 21,5)
const ERSTE_WALZE_MINDESTLAUF = 0.4; // Sekunden Rollen, bevor die erste Walze bremst
const WALZEN_ABSTAND = 0.25; // jede weitere Walze rollt mindestens so viel länger

/** easeOutBack: läuft von 0 nach 1, überschwingt kurz über 1 und federt zurück. */
function easeOutBack(x, bounce = BOUNCE) {
  const c = bounce + 1;
  return 1 + c * Math.pow(x - 1, 3) + bounce * Math.pow(x - 1, 2);
}

/* ------------------------------------------------------------
   Dramaturgie: Spannungs-Stopp und "So knapp!" (reine Funktionen)
   ------------------------------------------------------------
   WICHTIG, damit das Spiel ehrlich bleibt: Beide Prüfungen bekommen das
   FERTIGE Ergebnis (die Stopp-Indizes sind längst gewürfelt) und liefern
   nur eine Information für die Inszenierung zurück. Sie verändern keinen
   Stopp, kein Walzenband und keine Wahrscheinlichkeit. Der Spannungs-Stopp
   verändert allein die ZEIT, in der die dritte Walze ausläuft. */

export const SPANNUNG_EXTRA_MIN = 0.8; // Sekunden, die Walze 3 länger braucht als ohne Spannung (untere Grenze)
export const SPANNUNG_EXTRA_MAX = 1.2; // ... und obere Grenze
const SPANNUNG_PAUSE = 0.08; // Walze 3 bremst erst, wenn Walze 2 so lange ruht (das Paar soll sichtbar stehen)
const SPANNUNG_BOUNCE = 0.5; // sanfteres Zurückfedern bei der langen Bremsphase (sonst schwingt sie zu weit)

/**
 * Spannungs-Stopp ("noch eins!"): Stehen nach Walze 1 und 2 zwei GLEICHE Symbole
 * auf der Gewinnlinie? Dann lässt die Inszenierung Walze 3 länger auslaufen.
 * Zwei Kirschen sind ein Sonderfall davon (dort ist ein Gewinn sogar schon sicher).
 * Auf dieser Seite trifft das etwa 30 % aller Drehs: (10² + 3² + 2² + 2² + 2² + 1²) / 20² = 122 / 400.
 */
export function spannungPruefen(linie) {
  return linie[0] === linie[1];
}

/** Würfelt die Zusatzzeit des Spannungs-Stopps. Reine Optik: Das Ergebnis hängt nicht davon ab. */
export function spannungExtraWuerfeln(zufall = Math.random) {
  return SPANNUNG_EXTRA_MIN + zufall() * (SPANNUNG_EXTRA_MAX - SPANNUNG_EXTRA_MIN);
}

/**
 * "So knapp!": Ergibt der Dreh KEINEN Gewinn, stehen aber Walze 1 und 2 auf dem
 * gleichen Symbol, und dieses Symbol liegt auf Walze 3 direkt über oder unter der
 * Gewinnlinie (also sichtbar im Fenster), dann war es "knapp".
 * Das ist reine Beobachtung: Walze 3 ist unabhängig gewürfelt, und wir schauen nur
 * nachträglich auf ihre Nachbarfelder. Es gibt keine Regel, die solche Stopps
 * häufiger macht (das wäre die Manipulation, die echte Geräte teils einbauen).
 * Rückgabe: null oder { symbol, oben, unten, richtung: "oben" | "unten" | "beide" }
 */
export function fastGewinnPruefen(stopps, baender = WALZENBAENDER) {
  const linie = linieAusStopps(stopps, baender);
  if (gewinnAuswerten(linie).art !== "nichts") return null; // bei einem Gewinn gibt es nichts zu bedauern
  if (linie[0] !== linie[1]) return null;
  const symbol = linie[0];
  const band = baender[2];
  const n = band.length;
  const oben = band[(stopps[2] - 1 + n) % n] === symbol; // Ringband: vor Index 0 kommt der letzte
  const unten = band[(stopps[2] + 1) % n] === symbol;
  if (!oben && !unten) return null;
  return { symbol, oben, unten, richtung: oben && unten ? "beide" : oben ? "oben" : "unten" };
}

/**
 * Baut den Lauf-Plan der Spannungs-Walze aus ihrem normalen Plan. Gesucht sind
 * Rolltempo, Bremsweg und Bremszeit, sodass
 *   - die Walze exakt auf demselben Ziel landet (gleiche Gesamtstrecke),
 *   - sie erst bremst, wenn die Walze davor ruht (Paar ist sichtbar),
 *   - sie `extra` Sekunden SPÄTER ruht als ohne Spannung,
 *   - sie ohne Ruck in die Bremsphase übergeht (Bremsstart-Tempo = Rolltempo).
 * Aus "strecke = tempo * laufzeit + bremsWeg" und "bremsWeg = tempo * bremsZeit / (bounce + 3)"
 * folgt direkt: tempo = strecke / (laufzeit + bremsZeit / (bounce + 3)).
 * Die Walze rollt dadurch etwas langsamer als die anderen und bremst dann
 * 1 bis 2 Sekunden lang aus, statt in 0,5 Sekunden.
 */
function spannungsPlanErstellen(normal, davor, extra) {
  const bounce = SPANNUNG_BOUNCE;
  const laufzeit = Math.max(normal.laufzeit, davor.ende + SPANNUNG_PAUSE);
  const ende = normal.ende + extra;
  const bremsZeit = ende - laufzeit;
  const tempo = normal.strecke / (laufzeit + bremsZeit / (bounce + 3));
  const bremsWeg = (tempo * bremsZeit) / (bounce + 3);
  return {
    start: normal.start,
    strecke: normal.strecke,
    laufzeit,
    ende,
    tempo,
    bremsWeg,
    bremsZeit,
    bounce,
  };
}

/**
 * Plant den Lauf aller Walzen. `start` und `ziel` sind Stopp-Indizes,
 * `laengen` die Bandlängen. Für jede Walze:
 *   strecke   Gesamtweg in Feldern (ganzzahlig + passt exakt aufs Ziel)
 *   laufzeit  Sekunden Rollen, danach beginnt die Bremsphase
 *   ende      Sekunde, in der die Walze ruht
 *   tempo, bremsWeg, bremsZeit, bounce   Rolltempo und Form der Bremsphase
 *
 * Idee: Ein Band mit 20 Feldern wiederholt sich nach 20 Feldern. Der Weg muss
 * also ein Rest ("rest") plus ein Vielfaches von 20 sein. Wir nehmen das
 * kleinste Vielfache, das die Walze lang genug rollen lässt. Weil jede Walze
 * mindestens WALZEN_ABSTAND länger rollt als die davor, stoppen sie garantiert
 * von links nach rechts.
 *
 * `spannung` (optional) = { walze, extra }: Die LETZTE Walze läuft dann `extra`
 * Sekunden länger aus (siehe spannungsPlanErstellen). Das Ziel bleibt dasselbe.
 */
export function laufPlanErstellen(start, ziel, laengen, spannung = null) {
  const plaene = [];
  for (let i = 0; i < ziel.length; i++) {
    const n = laengen[i];
    const rest = (((start[i] - ziel[i]) % n) + n) % n; // Rest-Strecke bis zum Ziel (immer 0 … n-1)
    const mindestLauf = i === 0 ? ERSTE_WALZE_MINDESTLAUF : plaene[i - 1].laufzeit + WALZEN_ABSTAND;
    let strecke = rest;
    while ((strecke - BREMS_WEG) / LAUF_TEMPO < mindestLauf) strecke += n;
    const laufzeit = (strecke - BREMS_WEG) / LAUF_TEMPO;
    let plan = {
      start: start[i],
      strecke,
      laufzeit,
      ende: laufzeit + BREMS_ZEIT,
      tempo: LAUF_TEMPO,
      bremsWeg: BREMS_WEG,
      bremsZeit: BREMS_ZEIT,
      bounce: BOUNCE,
    };
    if (spannung && spannung.walze === i && i === ziel.length - 1 && i > 0) {
      plan = spannungsPlanErstellen(plan, plaene[i - 1], spannung.extra);
    }
    plaene.push(plan);
  }
  return plaene;
}

/** Zurückgelegte Strecke (in Feldern) einer Walze zum Zeitpunkt t (Sekunden seit Start). */
export function vorschubZurZeit(plan, t) {
  if (t <= plan.laufzeit) return plan.tempo * Math.max(t, 0); // Phase 1: gleichmäßig rollen
  const x = Math.min((t - plan.laufzeit) / plan.bremsZeit, 1); // Phase 2: Fortschritt 0 … 1
  return plan.strecke - plan.bremsWeg + plan.bremsWeg * easeOutBack(x, plan.bounce);
}

/** Zahl mit Tausenderpunkt: 1250 -> "1.250". */
function zahlText(n) {
  return n.toLocaleString("de-DE");
}

/** Zeilen der Gewinntabelle (sichtbar auf der Seite). Reihenfolge = Anzeigereihenfolge. */
export const TABELLE_ZEILEN = [
  { id: "sieben", symbole: ["sieben", "sieben", "sieben"], quote: DREIER_QUOTEN.sieben },
  { id: "stern", symbole: ["stern", "stern", "stern"], quote: DREIER_QUOTEN.stern },
  { id: "glocke", symbole: ["glocke", "glocke", "glocke"], quote: DREIER_QUOTEN.glocke },
  { id: "melone", symbole: ["melone", "melone", "melone"], quote: DREIER_QUOTEN.melone },
  { id: "zitrone", symbole: ["zitrone", "zitrone", "zitrone"], quote: DREIER_QUOTEN.zitrone },
  { id: "kirsche", symbole: ["kirsche", "kirsche", "kirsche"], quote: DREIER_QUOTEN.kirsche },
  { id: "kirschpaar", symbole: ["kirsche", "kirsche", null], quote: KIRSCHPAAR_QUOTE }, // null = egal (keine Kirsche)
];

/* ============================================================
   TEIL 2: DOM-HELFER
   ============================================================ */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Baut ein Symbol als <svg><use href="#sym-…"/></svg>. Die eigentliche Zeichnung
 * liegt einmal als <symbol> im Sprite in index.html; hier wird sie nur
 * "eingesetzt". SVG-Elemente brauchen createElementNS (mit Namensraum),
 * normales createElement würde sie nicht als Grafik erkennen.
 */
function symbolElement(id) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#sym-${id}`);
  svg.append(use);
  return svg;
}

/** Wartet `ms` Millisekunden – als Promise, damit man "await warte(…)" schreiben kann. */
function warte(ms) {
  return new Promise((fertig) => setTimeout(fertig, ms));
}

/** Startet eine CSS-Animation (über eine Klasse) garantiert NEU (Klasse weg, Reflow, Klasse dran). */
function animationNeuStarten(element, klasse) {
  element.classList.remove(klasse);
  void element.offsetWidth;
  element.classList.add(klasse);
}

/**
 * Ruft einen Klang auf und fängt jeden Fehler ab. Der Ton ist Beiwerk: Ein
 * blockierter oder fehlender AudioContext darf nie den Spielablauf (Abrechnung,
 * Entsperren der Knöpfe) stören. Ob der Ton überhaupt an ist, prüft klang.js selbst.
 */
function klingen(klang, ...argumente) {
  try {
    klang(...argumente);
  } catch {
    /* absichtlich leer: dann bleibt das Spiel eben stumm */
  }
}

/**
 * Zeit bis zum Auto-Sammeln im Risiko-Overlay. Standard: 20 Sekunden (RISIKO_TIMEOUT_MS).
 * Testhilfe: ?risikoTimeout=3000 in der Adresse verkürzt sie (erlaubt: 0,5 bis 60 Sekunden).
 * Das ist ungefährlich: Es geht nur um Spielgeld, und ein kürzerer Wert sammelt eher früher.
 */
function risikoTimeoutLesen() {
  try {
    const wert = Number(new URLSearchParams(window.location.search).get("risikoTimeout"));
    if (Number.isFinite(wert) && wert >= 500 && wert <= 60000) return wert;
  } catch {
    /* absichtlich leer: dann gilt der Standard */
  }
  return RISIKO_TIMEOUT_MS;
}

/* ============================================================
   TEIL 3: DAS SPIEL IM BROWSER
   ============================================================ */

function starteSpiel() {
  // ----- Elemente einmal suchen und merken -----
  const buehneElement = document.getElementById("buehne");
  const fensterElement = document.getElementById("fenster");
  const walzenElemente = [...fensterElement.querySelectorAll(".walze")];
  const gewinnAnzeige = document.getElementById("gewinn-anzeige");
  const drehInfo = document.getElementById("dreh-info");
  const hudLetzter = document.getElementById("hud-letzter");
  const drehKnopf = document.getElementById("dreh-knopf");
  const chipKnoepfe = [...document.querySelectorAll(".chip")];
  const tabelleListe = document.getElementById("gewinntabelle");
  const tabelleHinweis = document.getElementById("tabelle-hinweis");
  const toplisteElement = document.getElementById("topliste");
  const resetKnopf = document.getElementById("reset");
  const kontoResetKnopf = document.getElementById("konto-reset");
  const kontoInfo = document.getElementById("konto-info");
  const kopfElement = document.querySelector(".spiel-kopf");

  const laengen = WALZENBAENDER.map((band) => band.length);

  // ----- Spielzustand -----
  let laeuft = false; // true, solange gedreht wird: alles gesperrt
  let stopps = zufallsStopps(); // aktuelle Stopp-Indizes (Startbild: zufällig, hat keinen Einfluss aufs Geld)
  let offeneRunde = null; // { einsatz, auszahlung, abgerechnet } während eines Drehs; auszahlung = aktuell SICHERER Betrag
  const risikoTimeoutMs = risikoTimeoutLesen();
  const gespeicherterEinsatz = lade(SPIEL, "einsatz", EINSATZSTUFEN[0]);
  let gewaehlterEinsatz = EINSATZSTUFEN.includes(gespeicherterEinsatz)
    ? gespeicherterEinsatz
    : EINSATZSTUFEN[0];

  // ---------------------------------------------------------
  // Walzen aufbauen und positionieren
  // ---------------------------------------------------------

  /**
   * Füllt jedes Band mit den Symbolen. Das Walzenband steht DREIMAL
   * hintereinander im DOM (Kopie 0, 1, 2). So kann die sichtbare Position
   * in der mittleren Kopie wandern und nach oben/unten "überlaufen", ohne
   * dass man eine Lücke sieht. Insgesamt 3 x 20 = 60 Felder je Walze.
   */
  function baenderAufbauen() {
    walzenElemente.forEach((walze, i) => {
      const band = walze.querySelector(".band");
      band.replaceChildren();
      for (let kopie = 0; kopie < 3; kopie++) {
        for (const symbolId of WALZENBAENDER[i]) {
          const zelle = document.createElement("div");
          zelle.className = "zelle";
          zelle.append(symbolElement(symbolId));
          band.append(zelle);
        }
      }
    });
  }

  /**
   * Setzt die Position einer Walze. `position` ist der (auch gebrochene)
   * Index des Symbols auf der Gewinnlinie. Beispiel: 5.0 = Index 5 genau in
   * der Mitte, 5.5 = halb zwischen Index 5 und 6.
   *
   * Rechnung: Die mittlere Kopie des Bandes beginnt bei Feld n. Das OBERE
   * sichtbare Feld ist eins vor der Mitte: n + position - 1. Verschoben wird
   * das Band um genau so viele Felder nach oben. translateY in PROZENT bezieht
   * sich auf die Höhe des Bandes selbst (3n Felder), also: Verschiebung / (3n).
   * Das "% n" holt die Position in den Bereich 0 … n zurück (der Doppel-Modulo
   * ist der Trick, damit auch negative Zahlen sauber umbrechen).
   */
  function positionSetzen(walzenNr, position) {
    const n = laengen[walzenNr];
    const m = ((position % n) + n) % n;
    const prozent = ((m + n - 1) / (3 * n)) * 100;
    walzenElemente[walzenNr].querySelector(".band").style.transform =
      `translate3d(0, ${-prozent}%, 0)`;
  }

  function alleWalzenSetzen() {
    stopps.forEach((s, i) => positionSetzen(i, s));
    fensterBeschriften();
  }

  /** Screenreader-Beschriftung des Fensters: nennt die drei Symbole der Gewinnlinie. */
  function fensterBeschriften() {
    const namen = linieAusStopps(stopps).map((id) => SYMBOL_NAMEN[id]);
    fensterElement.setAttribute("aria-label", `Gewinnlinie: ${namen.join(", ")}`);
  }

  // ---------------------------------------------------------
  // Einsatz und Chips
  // ---------------------------------------------------------

  /**
   * Der Einsatz, der wirklich gespielt wird: der gewählte, solange das Konto
   * reicht. Sonst der größte Chip, den man sich noch leisten kann (0 = pleite).
   * Der GEWÄHLTE Wert bleibt dabei unverändert gespeichert; nach einem Gewinn
   * ist er also wieder da.
   */
  function wirksamerEinsatz() {
    if (offeneRunde) return offeneRunde.einsatz; // mitten im Dreh gilt der bereits abgebuchte Einsatz
    const stand = kontostand();
    if (gewaehlterEinsatz <= stand) return gewaehlterEinsatz;
    const leistbar = EINSATZSTUFEN.filter((stufe) => stufe <= stand);
    return leistbar.length ? Math.max(...leistbar) : 0;
  }

  function steuerungAktualisieren() {
    const stand = kontostand();
    const wirksam = wirksamerEinsatz();
    chipKnoepfe.forEach((chip) => {
      const wert = Number(chip.dataset.einsatz);
      chip.setAttribute("aria-pressed", String(wert === wirksam));
      chip.disabled = laeuft || wert > stand; // gesperrt beim Drehen oder wenn zu teuer
    });
    drehKnopf.disabled = laeuft || wirksam === 0;
    resetKnopf.disabled = laeuft;
    kontoResetKnopf.disabled = laeuft;
    tabelleBetraegeAktualisieren();
  }

  function einsatzWaehlen(wert) {
    if (laeuft || !EINSATZSTUFEN.includes(wert) || wert > kontostand()) return;
    gewaehlterEinsatz = wert;
    speichere(SPIEL, "einsatz", wert);
    steuerungAktualisieren();
  }

  // ---------------------------------------------------------
  // Gewinntabelle (wird aus TABELLE_ZEILEN gebaut: eine Quelle der Wahrheit)
  // ---------------------------------------------------------
  const betragElemente = []; // { quote, element } zum späteren Aktualisieren

  function tabelleAufbauen() {
    for (const zeile of TABELLE_ZEILEN) {
      const li = document.createElement("li");
      li.dataset.id = zeile.id;

      const symbole = document.createElement("span");
      symbole.className = "symbole";
      for (const id of zeile.symbole) {
        if (id) {
          symbole.append(symbolElement(id));
        } else {
          const joker = document.createElement("span");
          joker.className = "joker";
          joker.textContent = "?";
          joker.title = "beliebig außer Kirsche";
          symbole.append(joker);
        }
      }

      const quote = document.createElement("span");
      quote.className = "quote";
      quote.textContent = `×${zeile.quote}`;

      const betrag = document.createElement("span");
      betrag.className = "betrag";
      betragElemente.push({ quote: zeile.quote, element: betrag });

      li.append(symbole, quote, betrag);
      // Screenreader sollen "3 mal Kirsche, Quote 5" hören statt dreier leerer Grafiken
      const beschreibung = zeile.symbole
        .map((id) => (id ? SYMBOL_NAMEN[id] : "beliebig"))
        .join(", ");
      li.setAttribute("aria-label", `${beschreibung}: Quote ${zeile.quote}`);
      tabelleListe.append(li);
    }
  }

  /** Rechte Spalte der Tabelle: Auszahlung beim aktuell gewählten Einsatz. */
  function tabelleBetraegeAktualisieren() {
    const einsatz = wirksamerEinsatz() || gewaehlterEinsatz;
    tabelleHinweis.textContent =
      `Auszahlung = Quote × Einsatz. Rechts siehst du sie für deinen Einsatz von ${zahlText(einsatz)} ` +
      `(Netto-Gewinn = Auszahlung minus Einsatz). Gewertet wird nur die mittlere Reihe.`;
    for (const { quote, element } of betragElemente) {
      element.textContent = zahlText(quote * einsatz);
    }
  }

  // ---------------------------------------------------------
  // Anzeigen
  // ---------------------------------------------------------

  function seiteAktualisieren() {
    toplisteAnzeigen(toplisteElement, SPIEL, (p) => `+${zahlText(p)}`);
    const pleiten = statistik().pleiten;
    kontoInfo.textContent =
      `Pleiten bisher: ${pleiten}. „Konto zurücksetzen“ setzt das gemeinsame Spielgeld-Konto auf ${zahlText(STARTGELD)}. ` +
      `Rekorde bleiben erhalten, der Pleiten-Zähler zählt dabei mit.`;
  }

  /** Setzt Text und Farbe (plus/minus) von Gewinn-Anzeige und HUD-Feld. */
  function ergebnisAnzeigen(netto) {
    const text = netto > 0 ? `+${zahlText(netto)}` : `−${zahlText(Math.abs(netto))}`; // echtes Minuszeichen
    const art = netto > 0 ? "plus" : "minus";
    gewinnAnzeige.textContent = text;
    gewinnAnzeige.className = `gewinn-anzeige ${art}`;
    hudLetzter.textContent = text;
    hudLetzter.className = `wert ${art}`;
    if (netto > 0 && !bewegungReduziert()) animationNeuStarten(gewinnAnzeige, "rekord-puls");
  }

  function ergebnisTextBauen(ergebnis) {
    if (ergebnis.art === "dreier") {
      return `Dreimal ${SYMBOL_NAMEN[ergebnis.symbol]}! Quote ×${ergebnis.quote}.`;
    }
    if (ergebnis.art === "kirschpaar") {
      return `Zwei Kirschen nebeneinander. Quote ×${ergebnis.quote}.`;
    }
    return "Leider kein Treffer.";
  }

  /** Entfernt alle Effekte des letzten Drehs (Gewinn, Spannung, "So knapp!"). */
  function effekteLoeschen() {
    fensterElement.classList.remove("gewinn", "gewinn-blinken", "spannung");
    fensterElement
      .querySelectorAll(".zelle.gewinn-blinken, .zelle.spannung, .zelle.knapp")
      .forEach((z) => {
        z.classList.remove("gewinn-blinken", "spannung", "knapp");
      });
    walzenElemente.forEach((w) => w.classList.remove("knapp-wackeln"));
    drehInfo.classList.remove("knapp");
    tabelleListe.querySelectorAll("li.treffer").forEach((li) => li.classList.remove("treffer"));
  }

  /**
   * Zeigt einen Gewinn: Linie leuchtet, Gewinnsymbole pulsieren, Tabellenzeile
   * wird hervorgehoben. Die leuchtende Linie ist statisch; das BLINKEN und
   * Pulsieren sind reine Deko und laufen nur, wenn der Nutzer keine reduzierte
   * Bewegung wünscht.
   */
  function gewinnHervorheben(ergebnis) {
    fensterElement.classList.add("gewinn");
    const tabellenId = ergebnis.art === "dreier" ? ergebnis.symbol : "kirschpaar";
    tabelleListe.querySelector(`li[data-id="${tabellenId}"]`)?.classList.add("treffer");

    if (bewegungReduziert()) return;
    fensterElement.classList.add("gewinn-blinken");
    for (const walzenNr of ergebnis.treffer) {
      // Mittlere Kopie des Bandes beginnt bei Feld n; darin liegt das Gewinnsymbol an Index "stopp".
      const band = walzenElemente[walzenNr].querySelector(".band");
      band.children[laengen[walzenNr] + stopps[walzenNr]]?.classList.add("gewinn-blinken");
    }
  }

  // ---------------------------------------------------------
  // Walzen-Animation
  // ---------------------------------------------------------

  /**
   * Lässt die Walzen von `stopps` zu `ziel` laufen und liefert ein Promise,
   * das erst erfüllt wird, wenn die letzte Walze ruht. Mit requestAnimationFrame
   * wird in jedem Bildschirm-Frame die Position aus der verstrichenen Zeit
   * berechnet (nicht aus "Frames zählen"): So ist der Ablauf auf 60-Hz- und
   * 144-Hz-Bildschirmen gleich lang.
   *
   * `spannung` ({ walze, extra } oder null) verlängert nur den Auslauf der letzten
   * Walze; das Ziel bleibt unberührt. `beiStopp(i)` wird gerufen, sobald Walze i
   * ruht (dort hängen Ton und Effekte dran).
   */
  async function walzenLaufenLassen(ziel, { spannung = null, beiStopp = () => {} } = {}) {
    // Reduzierte Bewegung: kein Lauf, Ergebnis fast sofort. Die Stopp-Ereignisse
    // kommen trotzdem (kurz gestaffelt), der Spannungs-Stopp schrumpft auf 0,15 s.
    if (bewegungReduziert()) {
      stopps = [...ziel];
      alleWalzenSetzen();
      for (let i = 0; i < ziel.length; i++) {
        if (i === ziel.length - 1 && spannung) await warte(SPANNUNG_REDUZIERT_MS);
        beiStopp(i);
        await warte(50);
      }
      return;
    }

    const plaene = laufPlanErstellen(stopps, ziel, laengen, spannung);
    const ruht = plaene.map(() => false);
    walzenElemente.forEach((w) => w.classList.add("laeuft"));

    await new Promise((fertig) => {
      const startZeit = performance.now();
      function bild(jetzt) {
        const t = (jetzt - startZeit) / 1000;
        let nochAktiv = 0;
        plaene.forEach((plan, i) => {
          if (ruht[i]) return;
          if (t >= plan.ende) {
            positionSetzen(i, ziel[i]); // exakt aufs Ziel (keine Rundungsreste)
            walzenElemente[i].classList.remove("laeuft");
            ruht[i] = true;
            beiStopp(i);
            return;
          }
          positionSetzen(i, plan.start - vorschubZurZeit(plan, t));
          nochAktiv++;
        });
        if (nochAktiv > 0) {
          requestAnimationFrame(bild);
        } else {
          stopps = [...ziel];
          alleWalzenSetzen();
          fertig();
        }
      }
      requestAnimationFrame(bild);
    });
  }

  // ---------------------------------------------------------
  // Dramaturgie: Spannung, "So knapp!", Münz-Ticks
  // ---------------------------------------------------------

  /** Das Feld einer Walze, das (nach dem Stopp) `versatz` Zeilen von der Gewinnlinie entfernt liegt (0 = Linie, -1 = oben, +1 = unten). */
  function feldBeiLinie(walzenNr, stoppIndex, versatz = 0) {
    // Mittlere Kopie des Bandes beginnt bei Feld n (siehe positionSetzen).
    const band = walzenElemente[walzenNr].querySelector(".band");
    return band.children[laengen[walzenNr] + stoppIndex + versatz] ?? null;
  }

  let spannungTimer = 0;

  /**
   * Spannungs-Stopp beginnt: Walze 1 und 2 stehen mit gleichem Symbol, Walze 3 läuft noch.
   * Die beiden Symbole pulsieren golden (CSS), der Rahmen läuft schneller und der Ton
   * baut mehrere "Herzschläge" auf, solange Walze 3 ausläuft.
   */
  function spannungStarten(ziel) {
    fensterElement.classList.add("spannung");
    feldBeiLinie(0, ziel[0])?.classList.add("spannung");
    feldBeiLinie(1, ziel[1])?.classList.add("spannung");
    drehInfo.textContent = "Zwei gleiche … kommt noch eins?";
    let wiederholungen = 0;
    (function herzschlag() {
      klingen(klangSpannung); // ein Riser dauert ca. 0,75 s
      if (++wiederholungen < 4) spannungTimer = setTimeout(herzschlag, 750);
    })();
  }

  function spannungBeenden() {
    clearTimeout(spannungTimer);
    fensterElement.classList.remove("spannung");
    fensterElement
      .querySelectorAll(".zelle.spannung")
      .forEach((z) => z.classList.remove("spannung"));
  }

  /** Wird für jede Walze gerufen, sobald sie ruht: Stopp-Tick plus Spannung bzw. "So knapp!". */
  function walzeGestoppt(i, ziel, spannung, knapp) {
    klingen(klangWalzenStopp, i);
    if (i === 1 && spannung) spannungStarten(ziel);
    if (i !== WALZENBAENDER.length - 1) return;

    spannungBeenden();
    if (!knapp) return;
    // Nur Dekoration für einen Dreh, der ohnehin so ausgegangen ist (siehe fastGewinnPruefen).
    const nachbarn = [];
    if (knapp.oben) nachbarn.push(feldBeiLinie(i, ziel[i], -1));
    if (knapp.unten) nachbarn.push(feldBeiLinie(i, ziel[i], 1));
    nachbarn.forEach((feld) => feld?.classList.add("knapp"));
    if (!bewegungReduziert()) animationNeuStarten(walzenElemente[i], "knapp-wackeln");
    setTimeout(() => klingen(klangFastGewinn), 140); // kurz nach dem Stopp-Tick, damit sich beides nicht überdeckt
  }

  /**
   * Münz-Ticks für hochzählende Beträge. Statt in jede Ticker-Funktion einen Ton zu
   * hängen, beobachtet ein MutationObserver die Zahlen (HUD-Kontostand, Betrag der
   * Gewinnfeier): Wächst eine Zahl, gibt es einen Tick, höchstens alle 70 ms.
   * Sinkende Zahlen (der Einsatz wird abgebucht) bleiben stumm.
   */
  function muenzTickGeber() {
    const letzterWert = new Map();
    let letzterTick = 0;
    const lesen = (el) => Number(el.textContent.replace(/\D/g, "")) || 0;
    const beobachter = new MutationObserver((meldungen) => {
      for (const { target } of meldungen) {
        const el = target instanceof Element ? target : target.parentElement;
        if (!el || !letzterWert.has(el)) continue;
        const neu = lesen(el);
        const wuchs = neu > letzterWert.get(el);
        letzterWert.set(el, neu);
        const jetzt = performance.now();
        if (wuchs && jetzt - letzterTick >= MUENZ_TICK_ABSTAND_MS) {
          letzterTick = jetzt;
          klingen(klangMuenzTick);
        }
      }
    });
    return {
      beobachten(el) {
        if (!el || letzterWert.has(el)) return;
        letzterWert.set(el, lesen(el));
        beobachter.observe(el, { childList: true, characterData: true, subtree: true });
      },
      /** Schaltet kurz verzögert ab: Der HUD-Ticker läuft noch ca. 0,45 s nach der Feier. */
      beenden() {
        setTimeout(() => beobachter.disconnect(), 700);
      },
    };
  }

  // ---------------------------------------------------------
  // Abrechnung (Geld)
  // ---------------------------------------------------------

  /**
   * Schreibt die Auszahlung des laufenden Drehs gut. Wird normalerweise nach
   * der Animation (und nach der Risiko-Entscheidung) aufgerufen, aber auch bei
   * "pagehide" (Seite wird verlassen), damit nichts verloren geht, wenn man
   * mitten im Dreh oder mitten im Risiko wegklickt. offeneRunde.auszahlung ist
   * dann der aktuell SICHERE Betrag (der Gewinn des Drehs, oder was das Risiko-
   * Modul zuletzt als sicher gemeldet hat). Das Flag "abgerechnet" verhindert,
   * dass doppelt gutgeschrieben wird.
   */
  function rundeAbrechnen() {
    if (!offeneRunde || offeneRunde.abgerechnet) return;
    offeneRunde.abgerechnet = true;
    rundeAbschliessen(offeneRunde.einsatz, offeneRunde.auszahlung);
  }
  window.addEventListener("pagehide", rundeAbrechnen);

  // ---------------------------------------------------------
  // Pleite-Dialog
  // ---------------------------------------------------------

  /**
   * Eigener Dialog in der Optik von .spiel-dialog (style.css). Es gibt nur
   * eine Möglichkeit: neues Startgeld. Deshalb löst auch das Schließen mit
   * Esc den Neustart aus (Ereignis "close"), niemand bleibt ohne Geld hängen.
   */
  function pleiteDialogZeigen() {
    if (document.getElementById("pleite-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.className = "spiel-dialog";
    dialog.id = "pleite-dialog";

    const titel = document.createElement("h2");
    titel.textContent = "Pleite!";
    const text = document.createElement("p");
    text.textContent = "Du bekommst neues Startgeld.";
    const betrag = document.createElement("p");
    betrag.className = "gross";
    betrag.textContent = zahlText(STARTGELD);
    const aktionen = document.createElement("div");
    aktionen.className = "aktionen";
    const weiter = document.createElement("button");
    weiter.type = "button";
    weiter.className = "knopf primaer";
    weiter.textContent = "Weiterspielen";
    weiter.addEventListener("click", () => dialog.close());
    aktionen.append(weiter);
    dialog.append(titel, text, betrag, aktionen);

    dialog.addEventListener("close", () => {
      pleiteNeustart(); // Konto zurück auf Startgeld, Pleiten-Zähler +1
      walletHudAktualisieren();
      dialog.remove();
      seiteAktualisieren();
      steuerungAktualisieren();
    });

    document.body.append(dialog);
    dialog.showModal();
  }

  // ---------------------------------------------------------
  // Ein Dreh
  // ---------------------------------------------------------

  async function drehen() {
    if (laeuft) return;
    const einsatz = wirksamerEinsatz();
    if (einsatz === 0 || !einsatzAbbuchen(einsatz)) return; // Konto reicht nicht: Dreh startet nicht

    laeuft = true;
    const fokusWar = document.activeElement;
    klingen(klangSpinStart); // der Klick/Tastendruck ist die Nutzer-Geste, die Browser für Audio verlangen
    walletHudAktualisieren(); // der Einsatz verschwindet sofort vom Konto
    steuerungAktualisieren();
    effekteLoeschen();
    fensterElement.classList.add("dreht"); // Lauflicht-Rahmen läuft schneller
    gewinnAnzeige.textContent = "";
    gewinnAnzeige.className = "gewinn-anzeige";
    drehInfo.textContent = "Die Walzen laufen …";

    // 1. Ergebnis auswürfeln und auswerten – BEVOR die Animation startet
    const ziel = zufallsStopps();
    const linie = linieAusStopps(ziel);
    const ergebnis = gewinnAuswerten(linie);
    const auszahlung = einsatz * ergebnis.quote;
    const netto = auszahlung - einsatz;
    offeneRunde = { einsatz, auszahlung, abgerechnet: false };

    // 1b. Inszenierung planen. EHRLICHKEIT: Ab hier steht das Ergebnis fest. Die beiden
    //     Prüfungen lesen es nur und ändern weder `ziel` noch irgendeine Wahrscheinlichkeit.
    //     Der Spannungs-Stopp streckt allein die ZEIT des Auslaufs; "So knapp!" ist eine
    //     Beobachtung, die nur auftritt, wenn der Zufall sie wirklich geliefert hat.
    const spannung = spannungPruefen(linie)
      ? { walze: WALZENBAENDER.length - 1, extra: spannungExtraWuerfeln() }
      : null;
    const knapp = fastGewinnPruefen(ziel);

    // 2. Walzen laufen lassen (stoppen links nach rechts, bei Spannung bremst die dritte lange aus)
    await walzenLaufenLassen(ziel, {
      spannung,
      beiStopp: (i) => walzeGestoppt(i, ziel, spannung, knapp),
    });
    fensterElement.classList.remove("dreht");

    // 3. Anzeigen. Eine Niete (Auszahlung 0) wird sofort verbucht. Ein GEWINN dagegen erst NACH der
    //    Risiko-Entscheidung (Schritt 3c): Bis dahin ist er nur "sicher" (offeneRunde.auszahlung), der
    //    Einsatz ist längst abgebucht, und ein Verlassen der Seite bucht den sicheren Betrag (pagehide).
    const gewinn = auszahlung > 0;
    if (!gewinn) {
      rundeAbrechnen();
      offeneRunde = null;
      walletHudAktualisieren();
    }
    ergebnisAnzeigen(netto); // ehrlich: ein Verlust von 10 bleibt "−10", egal wie es vorher geklungen hat
    drehInfo.textContent = ergebnisTextBauen(ergebnis);
    if (knapp) {
      drehInfo.textContent = `So knapp! Das dritte Symbol lag direkt ${knapp.richtung === "oben" ? "über" : knapp.richtung === "unten" ? "unter" : "über und unter"} der Linie. ${drehInfo.textContent}`;
      drehInfo.classList.add("knapp");
    }
    if (ergebnis.art !== "nichts") gewinnHervorheben(ergebnis);

    // 3a. Gewinn-Jingle. JEDER Linien-Treffer klingelt, auch der kleinste (Stufe 0 = Mini-Jingle),
    //     größere je länger. Die Stufe kommt aus derselben reinen Funktion, die auch gewinnFeiern()
    //     benutzt (und als Ergebnis zurückgibt); sie wird VOR der Feier gebraucht, weil das Promise
    //     von gewinnFeiern erst NACH Ende der Feier erfüllt wird. Verluste bleiben still.
    if (ergebnis.art !== "nichts") klingen(klangGewinn, stufeBestimmen(auszahlung, einsatz));

    // 3b. Große Gewinne feiern (ab x5 vom Einsatz, siehe assets/gewinnfeier.js). Die Feier wird
    //     VOR dem Entsperren abgewartet; ein Klick oder Tastendruck überspringt sie. Gezeigt wird nur,
    //     was oben schon feststeht: an Auszahlung und Konto ändert sie nichts.
    //     gewinnFeiern baut das Overlay synchron auf, deshalb kann der Münz-Tick-Geber den hochzählenden
    //     Betrag gleich beobachten, bevor das Promise abgewartet wird.
    const feierTicks = muenzTickGeber();
    const feier = gewinnFeiern({ buehne: buehneElement, betrag: auszahlung, einsatz });
    feierTicks.beobachten(buehneElement.querySelector(".gf-betrag"));
    await feier;
    feierTicks.beenden();

    // 3c. Risiko: sammeln oder riskieren (assets/risiko.js). Das Promise liefert den ENDBETRAG:
    //     0 bei Verlust, der Gewinn bei "Sammeln" (auch bei Esc, Klick daneben und nach 20 s ohne
    //     Eingabe), mehr bei Erfolg. Währenddessen steht in offeneRunde.auszahlung immer der aktuell
    //     sichere Betrag (Rückruf beiAenderung), den pagehide im Notfall bucht.
    let endbetrag = auszahlung;
    if (gewinn) {
      drehInfo.textContent = `Gewinn ${zahlText(auszahlung)}: sammeln oder riskieren?`;
      endbetrag = await risikoAnbieten({
        buehne: buehneElement,
        betrag: auszahlung,
        einsatz,
        maxBetrag: RISIKO_MAX_BETRAG,
        timeoutMs: risikoTimeoutMs,
        beiAenderung: (sicher) => {
          if (offeneRunde) offeneRunde.auszahlung = sicher;
        },
      });

      // 3d. Jetzt erst gutschreiben: der Endbetrag, nicht der ursprüngliche Gewinn.
      const muenzen = muenzTickGeber();
      muenzen.beobachten(document.querySelector('#wallet-hud [data-w="kontostand"]'));
      if (offeneRunde) offeneRunde.auszahlung = endbetrag;
      rundeAbrechnen();
      offeneRunde = null;
      walletHudAktualisieren();
      muenzen.beenden();

      if (endbetrag !== auszahlung) {
        // Das Risiko hat das Ergebnis verändert: Anzeige und Text auf den Endstand bringen.
        ergebnisAnzeigen(endbetrag - einsatz);
        if (endbetrag === 0) {
          effekteLoeschen(); // die leuchtende Gewinnlinie wäre jetzt irreführend
          drehInfo.textContent = `Risiko verloren: Der Gewinn von ${zahlText(auszahlung)} ist weg.`;
        } else {
          drehInfo.textContent = `Risiko gewonnen! Aus ${zahlText(auszahlung)} wurden ${zahlText(endbetrag)}.`;
        }
        drehInfo.classList.remove("knapp");
      }
    }
    const endNetto = endbetrag - einsatz;

    laeuft = false;
    steuerungAktualisieren();
    // Der Knopf war beim Sperren fokussiert und hat den Fokus verloren: Tastatur-Nutzer zurück an die Stelle holen
    if (
      fokusWar instanceof HTMLButtonElement &&
      document.activeElement === document.body &&
      !fokusWar.disabled
    ) {
      fokusWar.focus({ preventScroll: true });
    }

    // 4. Topliste: Gewinne ab der Mindesthöhe werden STILL eingetragen
    //    (zuletzt benutzte Initialen) – kein Dialog, keine Aufforderung.
    //    Die Gewinn-Anzeige über den Chips feiert schon genug.
    //    Zählt der NETTO-Gewinn des ENDBETRAGS (nach dem Risiko), nicht der des Drehs.
    if (endNetto >= MINDEST_NETTO_FUER_TOPLISTE && stillEintragen(SPIEL, endNetto) !== null) {
      seiteAktualisieren();
    }

    // 5. Pleite? (Konto unter dem kleinsten Einsatz)
    if (istPleite(EINSATZSTUFEN[0])) pleiteDialogZeigen();
  }

  // ---------------------------------------------------------
  // Eingabe
  // ---------------------------------------------------------
  drehKnopf.addEventListener("click", drehen);
  chipKnoepfe.forEach((chip) => {
    chip.addEventListener("click", (e) => {
      einsatzWaehlen(Number(chip.dataset.einsatz));
      // Mit Maus/Finger angeklickt (detail > 0): Fokus loslassen, damit die Leertaste danach
      // dreht. Per Tastatur ausgelöst (detail = 0) bleibt der Fokus auf dem Chip.
      if (e.detail > 0) chip.blur();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; // Browser-Kürzel nicht stören, Dauerdruck ignorieren
    if (document.querySelector("dialog[open]")) return; // Dialog offen -> Tasten gehören ihm
    const tag = e.target instanceof Element ? e.target.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === " ") {
      // Auf einem fokussierten Knopf/Link/Aufklapper macht die Leertaste schon etwas
      // (anklicken). Dort NICHT zusätzlich drehen, sonst würde es doppelt ausgelöst.
      if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return;
      e.preventDefault(); // Seite nicht scrollen
      drehen();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= EINSATZSTUFEN.length) {
      einsatzWaehlen(EINSATZSTUFEN[Number(e.key) - 1]); // Taste 1 = erster Chip, 2 = zweiter …
    }
  });

  // Reset 1: NUR die Slots-Topliste. entferne() löscht gezielt den Schlüssel "topliste";
  // spielZuruecksetzen("slots") wäre zu grob, es würde auch den gemerkten Einsatz löschen.
  resetKnopf.addEventListener("click", () => {
    if (laeuft) return;
    entferne(SPIEL, "topliste");
    seiteAktualisieren();
  });

  // Reset 2: Konto zurücksetzen mit Rückfrage (zweiter Klick innerhalb von 4 Sekunden).
  // Technisch derselbe Weg wie nach einer Pleite: pleiteNeustart() setzt das Konto auf
  // Startgeld, lässt die Rekorde stehen und erhöht den Pleiten-Zähler.
  let kontoResetBereit = false;
  let kontoResetTimer = 0;
  function kontoResetEntschaerfen() {
    kontoResetBereit = false;
    clearTimeout(kontoResetTimer);
    kontoResetKnopf.textContent = "Konto zurücksetzen";
  }
  kontoResetKnopf.addEventListener("click", () => {
    if (laeuft) return;
    if (!kontoResetBereit) {
      kontoResetBereit = true;
      kontoResetKnopf.textContent = "Wirklich zurücksetzen?";
      kontoResetTimer = setTimeout(kontoResetEntschaerfen, 4000);
      return;
    }
    kontoResetEntschaerfen();
    pleiteNeustart();
    walletHudAktualisieren();
    seiteAktualisieren();
    steuerungAktualisieren();
    drehInfo.textContent = `Konto zurückgesetzt auf ${zahlText(STARTGELD)}.`;
  });

  // ----- Start -----
  walletHud(document.getElementById("wallet-hud"));
  tonKnopf(kopfElement); // Ton an/aus, Zustand gilt für alle Casino-Spiele
  baenderAufbauen();
  alleWalzenSetzen();
  tabelleAufbauen();
  steuerungAktualisieren();
  seiteAktualisieren();
  if (istPleite(EINSATZSTUFEN[0])) pleiteDialogZeigen(); // z. B. nach Seitenwechsel mit leerem Konto
}

// Nur im Browser starten. In Node (Tests/Simulation) gibt es kein "document" –
// dort werden nur die reinen Funktionen oben importiert.
if (typeof document !== "undefined") {
  starteSpiel();
}
