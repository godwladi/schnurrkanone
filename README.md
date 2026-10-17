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

1. **Online stellen (HTTPS):** den Ordner z. B. auf GitHub Pages oder Netlify (Drag & Drop des Ordners auf app.netlify.com/drop) hochladen. Ein Build-Schritt ist nicht nötig.
2. Auf dem iPhone die Adresse in **Safari** öffnen → Teilen-Knopf → **„Zum Home-Bildschirm“**.
3. Das Symbol startet das Spiel im Vollbild ohne Safari-Leisten und funktioniert danach auch **offline** (Service Worker `sw.js`).

Schnelltest ohne Upload: am PC `python -m http.server 8000` im Ordner starten und am iPhone `http://<PC-IP>:8000` öffnen (gleiches WLAN). Das Spiel läuft, aber ohne HTTPS gibt es keinen Offline-Modus.

**Bedienung per Touch:** Waffen mit dem Finger auf andere ziehen (verschmelzen, ausrüsten, auf ♻️ verwerten), **Doppeltipp** legt an/ab, Tippen aufs Spielfeld = Pfotenhieb. Hoch- und Querformat werden unterstützt; Ton startet mit der ersten Berührung.

**Updates:** Der Service Worker liefert zuerst die gespeicherte Version und lädt im Hintergrund nach – neue Dateien sind also beim *zweiten* Start da. Für sofortige Updates in `sw.js` die Konstante `CACHE` hochzählen (neue Dateien dort auch in `FILES` eintragen).

Der Spielstand auf dem iPhone ist unabhängig vom PC-Spielstand; zum Umziehen *Optionen → Export/Import* nutzen.

## Aufbau
- `js/engine.js` – Hilfsfunktionen, Sound (WebAudio), Speichern
- `js/data.js` – Waffen, Katzen, Biome, Upgrades, Perks, Erfolge
- `js/logic.js` – Spielstand, Werte-Berechnung, Aktionen
- `js/draw.js` – prozedurale Grafik (Katze, Mimik je nach Feuerrate, Geisterkatzen für Waffenplatz 2–4)
- `js/battle.js` – Kampfszene, Partikel, Bosse
- `js/ui.js` – Oberfläche, Reiter, Kisten-Animation
- `js/main.js` – Start, Spielschleife, Offline-Ertrag
- `js/touch.js` – Touch-Drag & Doppeltipp im Rucksack, Zoom-Sperre, Audio-Fortsetzung, Service-Worker-Registrierung
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA (Home-Bildschirm, Offline)

Der Spielstand liegt im `localStorage` des Fensters (Profil `%LOCALAPPDATA%\Schnurrkanone`).
