# Schnurrkanone 🐱🔫

Idle-Katzen-Shooter für den Desktop – inspiriert von *Idle Cat Gunner*, aber ohne In-App-Käufe und ohne Werbung.

## Starten
- **Doppelklick auf `Schnurrkanone starten.bat`** – öffnet das Spiel als eigenes Fenster (Edge-App-Modus).
- Alternativ `index.html` in einem beliebigen Browser öffnen.

## Steuerung
| Taste / Aktion | Wirkung |
|---|---|
| Klick auf Hindernis / `Leertaste` | Pfotenhieb, füllt das Schnurr-Meter |
| `1` `2` `3` | Skills: Laser-Blick, Fischregen, Wildes Fauchen |
| `B` | Waffenkiste kaufen |
| `M` | Auto-Merge |
| `N` | Musik an/aus |
| 🔁 Auto-Boss (oben im Spielfeld) | AN: Nach 10 Zerstörungen kommt automatisch der Boss. AUS: Du bleibst auf der Stufe und farmst, bis du „Boss herausfordern“ klickst. |
| Klick auf Glücksballon | Belohnung (Münzen, Gräten, Goldrausch oder Raserei) |
| Drag & Drop | Gleiche Waffen verschmelzen, ausrüsten, verwerten |
| Doppelklick auf Waffe | An-/Ablegen |

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
- `js/splash.js` – Startbildschirm mit Logo-Animation, Querformat-Hinweis
- `js/touch.js` – Touch-Drag & Doppeltipp im Rucksack, Zoom-Sperre, Audio-Fortsetzung, Service-Worker-Registrierung
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA (Home-Bildschirm, Offline)

Der Spielstand liegt im `localStorage` des Fensters (Profil `%LOCALAPPDATA%\Schnurrkanone`).
