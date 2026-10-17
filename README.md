# Schnurrkanone 🐱🔫

Idle-Katzen-Shooter für den Desktop – inspiriert von *Idle Cat Gunner*, aber ohne In-App-Käufe und ohne Werbung.

## Starten
- **Doppelklick auf `Schnurrkanone starten.bat`** – öffnet das Spiel als eigenes Fenster (Edge-App-Modus).
- Alternativ `index.html` in einem beliebigen Browser öffnen.

## Steuerung
| Taste / Aktion | Wirkung |
|---|---|
| Klick auf Hindernis / `Leertaste` | Pfotenhieb, füllt das Schnurr-Meter |
| `1` `2` `3` `4` | Skills: Laser-Blick, Fischregen, Wildes Fauchen, Schnurr-Schild |
| Tippen auf rot umrandetes Geschoss | Parieren: fliegt zum Werfer zurück |
| `B` | Waffenkiste kaufen |
| `M` | Auto-Merge |
| `N` | Musik an/aus |
| 🔁 Auto-Boss (oben im Spielfeld) | AN: Nach 10 Zerstörungen kommt automatisch der Boss. AUS: Du bleibst auf der Stufe und farmst, bis du „Boss herausfordern“ klickst. |
| Klick auf Glücksballon | Belohnung (Münzen, Gräten, Goldrausch oder Raserei) |
| Drag & Drop | Gleiche Waffen verschmelzen, ausrüsten, verwerten |
| Doppelklick auf Waffe | An-/Ablegen |

## Leben, Boss-Angriffe & Vernichtungsschlag (`js/vitals.js`)
- Die Katze hat **❤️ Leben** (Balken über dem Kopf, nur sichtbar wenn wichtig). Außerhalb von Bosskämpfen erholt sie sich von selbst.
- Ab Stufe 3 **werfen Bosse** passend zum Gebiet (Zapfen, Stacheln, Schneebälle, Lavaregen, Dosen, Meteore). Antippen = **Parade**, das Geschoss trifft den Boss.
- Die letzten 6 s des Boss-Countdowns lädt der Boss den **Vernichtungsschlag** (Warnung oben). Mit 🛡️ **Schnurr-Schild** (Taste 4, ab Stufe 3) gibt es einen **Konter** (Boss betäubt, +8 s). Ohne Schild kostet er 65 % Leben; wer überlebt, bekommt +8 s und 3 s lang +50 % Schaden. Läuft die Zeit danach erneut ab, entkommt der Boss.
- **K.O.** (Leben auf 0): eine Stufe zurück und Farm-Modus. Heilung: Schnurr-Raserei (25 %) und Fischregen (20 %).

## Streifzug – Roguelike-Modus (`js/run.js`)
- Reiter **🗺️ Streifzug** (ab Stufe 8). Start **ganz von vorn**: Stufe 1, nur Miau-Pistole I, 0 Münzen, kein Training, keine Katzen-/Perk-/Minze-/Level-Boni. Unterwegs eigene Münzen für Kisten und Training. Skills und Waffenplätze bleiben freigeschaltet.
- Das Hauptspiel (Stufe, Münzen, Rucksack, Ausrüstung, Training) wird beiseitegelegt und danach unverändert zurückgeholt; Waffen und Münzen aus dem Streifzug verfallen.
- **Pause:** Solange die Menü-Schublade oder ein Fenster offen ist, eine Waffe gezogen wird oder (am PC) die Maus über der Seitenleiste ist, steht der Streifzug still. Im Hauptspiel werfen Bosse dann nicht, der Countdown läuft aber weiter.
- Jeder Raum = neues Gebiet, 10 Gegner + Boss; jeder 20. Raum (20, 40, 60 …) ist ein **Wächter** (×1,6 Leben, wirft öfter, 2 Segen). Entkommt ein Boss, wird der Raum wiederholt. Gegner werfen auch, Leben heilen **nicht** von selbst.
- Nach jedem Boss **1 von 3 Segen**: z. B. Scharfe Krallen, Koffein-Kater, Milchbart, Spiegelpfote, Neuntes Leben, Schrödingers Kiste (Glücksspiel) – oder ein **Pakt** mit Nachteil (Schwarze Katze, Gläserne Krallen).
- **Sonderräume** (ab Raum 3, 30 % Chance, nie zweimal hintereinander), je mit eigenem Hintergrund, zwei neuen Gegnern und eigenem Boss:
  - 🌑 **Die Leere** – Dunkelheit, nur um die Katze herum ist Licht; Gegner-Augen glühen hindurch (Schattenklumpen, Riesenauge · Boss „Das Große Nichts“)
  - 🌀 **Wurmloch** – die Zeit schwankt zwischen 0,7× und 1,3× (Kristall-Splitter, Ufo · Boss „Ereignishorizont“)
  - 🌐 **World Wide Web** – Pop-up-Werbung verdeckt das Feld, Tipp aufs ✕ füllt das Schnurr-Meter (Werbefenster, Bug · Boss „Pop-up-Imperator“)
- Raum n = Stufe n des normalen Spiels. **K.O. = Lauf vorbei.** Beute: 3 🦴 je Raum plus ein Münzschatz fürs Hauptspiel.

## Auf dem iPhone spielen
Das Spiel ist eine installierbare Web-App (PWA) – kein Mac, kein Xcode nötig.

1. **Adresse:** Das Spiel liegt auf GitHub Pages: **https://godwladi.github.io/schnurrkanone/** (Repo `godwladi/schnurrkanone`).
2. Auf dem iPhone die Adresse in **Safari** öffnen → Teilen-Knopf → **„Zum Home-Bildschirm“**.
3. Das Symbol startet das Spiel im Vollbild ohne Safari-Leisten und funktioniert danach auch **offline** (Service Worker `sw.js`).

Schnelltest ohne Upload: am PC `python -m http.server 8000` im Ordner starten und am iPhone `http://<PC-IP>:8000` öffnen (gleiches WLAN). Das Spiel läuft, aber ohne HTTPS gibt es keinen Offline-Modus.

**Bedienung per Touch:** Waffen mit dem Finger auf andere ziehen (verschmelzen, ausrüsten, auf ♻️ verwerten), **Doppeltipp** legt an/ab, Tippen aufs Spielfeld = Pfotenhieb. Beim Start erscheint das animierte Logo – das Antippen startet zugleich den Ton.

**Menü auf Handy & Tablet:** Das Spielfeld läuft im Vollbild, das Menü ist versteckt. Unten (hochkant) bzw. rechts (quer) liegt eine durchsichtige Symbolleiste mit ⚔️ Waffen, ⬆️ Training, 🐱 Katzen, 🐾 Begleiter und **›** für Aufgaben, Wiedergeburt, Erfolge und Optionen. Antippen öffnet das Menü als Schublade, nochmal antippen, ✕ oder der Griff schließt sie. Rote Punkte zeigen, wo etwas bereitliegt. Am PC (breites Fenster) bleibt die feste Seitenleiste (`js/dock.js`).

**Querformat:** Das Spiel ist fürs Querformat gebaut. Auf dem Handy hochkant erscheint ein „Bitte quer halten“-Hinweis (mit „Trotzdem hochkant spielen“). iOS sperrt die Drehung bei Home-Bildschirm-Apps nicht selbst, deshalb am besten die Ausrichtungssperre im Kontrollzentrum aus- und das iPhone quer halten. Auf dem iPad gehen beide Ausrichtungen.

**Neue Version online stellen:** Doppelklick auf **`Online stellen.bat`**. Das Skript zählt die Cache-Version in `sw.js` hoch, committet alles und lädt es auf GitHub; nach ca. 1 Minute ist es online. Auf dem iPhone die App ganz schließen und **zweimal** starten (beim ersten Start lädt der Service Worker die neuen Dateien im Hintergrund). Neue Dateien müssen in `sw.js` unter `FILES` eingetragen werden.

Der Spielstand auf dem iPhone ist unabhängig vom PC-Spielstand; zum Umziehen *Optionen → Export/Import* nutzen.

**Handy wird warm?** *Optionen → Grafik → Akku sparen* (30 Bilder/s, 1,5× statt 3× Pixeldichte, weniger Teilchen, ruhende Knopf-Animationen). „Auto“ wählt auf Handy/Tablet „Ausgeglichen“ (2× Pixeldichte).

## Fehler melden / Feedback 🐞
Rechts oben schwebt der **🐞-Knopf** (am PC auch Taste **F8**), auch über offenen Fenstern wie der Glückskiste.
- Macht sofort ein Bild vom Spielfeld und merkt sich, was gerade offen ist (bei der Glückskiste auch die Karte unter der Nadel).
- Optional: **📷 Bildschirmfoto anhängen** (iPhone: vorher Seitentaste + Lauter drücken) – für Fenster und Menüs, die das Spielfeld-Bild nicht zeigt.
- Art wählen (Fehler / Grafik / Idee), kurz beschreiben, **Teilen / Speichern**.
- iPhone: im Teilen-Menü **„In Dateien sichern“ → iCloud Drive › Schnurrkanone Feedback**. Am PC liegt der Bericht dann unter `C:\Users\Nutzer\iCloudDrive\Schnurrkanone Feedback\` – Claude Bescheid sagen, der Bericht lässt sich dort direkt lesen.
- PC: die Dateien landen im Download-Ordner.

Der Bericht (`schnurrkanone-<art>-<datum>.json`) enthält Beschreibung, Gerät/Bildschirm, Version, Spielstand sowie ein Protokoll der letzten Fehlermeldungen und Spiel-Ereignisse (`js/feedback.js`).

## Aufbau
- `js/engine.js` – Hilfsfunktionen, Sound (WebAudio), Speichern
- `js/data.js` – Waffen, Katzen, Biome, Upgrades, Perks, Erfolge
- `js/logic.js` – Spielstand, Werte-Berechnung, Aktionen
- `js/draw.js` – prozedurale Grafik (Katze, Mimik je nach Feuerrate, Geisterkatzen für Waffenplatz 2–4)
- `js/battle.js` – Kampfszene, Partikel, Bosse
- `js/ui.js` – Oberfläche, Reiter, Kisten-Animation
- `js/main.js` – Start, Spielschleife, Offline-Ertrag
- `js/feedback.js` – 🐞 Fehlerberichte mit Spielfeld-Bild, Foto-Anhang, Protokoll und Spielstand
- `js/dock.js` – Symbolleiste und Menü-Schublade für Handy/Tablet
- `js/vitals.js` – Katzen-Leben, Boss-Geschosse und Parade, Vernichtungsschlag, Schild, Heilung
- `js/run.js` – Streifzug (Roguelike) mit Segen, Pakten, Wächter-Räumen und Pause beim Verwalten
- `js/foes.js` – lebendige Gegner: Atmen, Wiegen, Hüpfen, Ausholen vor dem Wurf, Gesichter mit Stimmungen, Treffer-Reaktionen (Rückstoß, Kippen, Aufblitzen, Splitter)
- `js/rooms.js` – Sonderräume im Streifzug: Die Leere, Wurmloch, World Wide Web
- `js/perf.js` – Grafik-Stufen (Hoch / Ausgeglichen / Akku sparen): Leinwand-Auflösung (iPhone sonst 3×), Bildrate, Teilchenzahl; hinter Menüs automatisch 30 Bilder/s
- `js/combo.js` – Combo-Anzeige: Abzeichen mit Zeit-Ring, Stufen (Nett!, Super!, Wahnsinn!, Schnurrtastisch!, Legendär!), Funken, Flammen, „Kette gerissen“
- `js/splash.js` – Startbildschirm mit Logo-Animation, Querformat-Hinweis
- `js/touch.js` – Touch-Drag & Doppeltipp im Rucksack, Zoom-Sperre, Audio-Fortsetzung, Service-Worker-Registrierung
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA (Home-Bildschirm, Offline)

Der Spielstand liegt im `localStorage` des Fensters (Profil `%LOCALAPPDATA%\Schnurrkanone`).
