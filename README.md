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
| `P` / ⏸️ oben | Pause-Menü: hält das ganze Spiel an (Musik, Töne, Optionen, Streifzug beenden; `Esc` = weiter) |
| `I` / ✨-Leiste | Streifzug: Segen-Übersicht mit Gesamtwirkung |
| `H` / `?` | Tastenkürzel-Übersicht |
| 🔁 Auto-Boss (oben im Spielfeld) | AN: Nach 10 Zerstörungen kommt automatisch der Boss. AUS: Du bleibst auf der Stufe und farmst, bis du „Boss herausfordern“ klickst. |
| Klick auf Glücksballon | Belohnung (Münzen, Gräten, Goldrausch oder Raserei) |
| Drag & Drop | Gleiche Waffen verschmelzen, ausrüsten, verwerten |
| Doppelklick auf Waffe | An-/Ablegen |

## Leben, Boss-Angriffe & Vernichtungsschlag (`js/vitals.js`)
- Die Katze hat **❤️ Leben** (Balken über dem Kopf, nur sichtbar wenn wichtig). Außerhalb von Bosskämpfen erholt sie sich von selbst.
- Ab Stufe 3 **werfen Bosse** passend zum Gebiet (Zapfen, Stacheln, Schneebälle, Lavaregen, Dosen, Meteore). Antippen = **Parade**, das Geschoss trifft den Boss.
- Die letzten 6 s des Boss-Countdowns lädt der Boss den **Vernichtungsschlag** (Warnung oben). Mit 🛡️ **Schnurr-Schild** (Taste 4, ab Stufe 3) gibt es einen **Konter** (Boss betäubt, +8 s). Ohne Schild schlägt er als **große Explosion** an der Katze ein (Feuerball, Druckwellen, Trümmer, Rauchsäule, Glut; beim Konter eine blaue Eis-Explosion am Boss) und kostet 65 % Leben. Im Hauptspiel gehen außerdem **die Hälfte der Münzen** verloren und es geht **eine Stufe zurück** (Farm-Modus). Im Streifzug gibt es fürs Überleben +8 s und 3 s lang +50 % Schaden. Läuft die Zeit danach erneut ab, entkommt der Boss.
- Nach einem Treffer sind Katzen und Begleiter ein paar Sekunden **geröstet**: schwarz, mit weiß blinzelnden Augen, Rauchfähnchen, Glut und *Hust*.
- **Schattenwesen** (ab Stufe 6, im Streifzug ab Raum 3): drängeln sich nach vorn, eine Blase zeigt, welche Fähigkeit sie einfrieren wollen (Skill, Talent, Geisterkatze oder Begleiter). Nicht in 7 s besiegt → die Fähigkeit ist 15 s eingefroren (Eis auf dem Knopf bzw. Figur wird zu Eis, mit Restzeit). Eine **eingefrorene Geisterkatze** lässt sich nicht umrüsten (Waffenplatz vereist, kein Ziehen/Tauschen/Verwerten, „Beste“ lässt ihn aus). Ein **eingefrorener Begleiter** (Maus-Drohne, Goldfisch, Eule) verliert so lange seinen Bonus; der Begleiter-Reiter zeigt Eis und Restzeit. Kurz vor dem Auftauen flackert das Eis, dann zerspringt es in Splitter. Pfotenhiebe machen 3× Schaden an Schatten; gebannt gibt es Münzen und Schnurr-Meter (`js/shades.js`).
- **Risse** liegen fest auf dem Körper der Gegner (wachsen bei 75/50/25 % Leben, Gesicht bleibt frei, Brocken platzen ab; beim Boss glüht es aus den Rissen).
- **K.O.** (Leben auf 0, Hauptspiel): 6 s **gelähmt** – kein Schießen, keine Skills, keine Pfotenhiebe (Balken mit Restzeit über der Katze), danach 40 % Leben. Heilung: Schnurr-Raserei (25 %) und Fischregen (20 %).

## Gegner-Eigenschaften & Boss-Phasen (`js/traits.js`)
- Ab Stufe 12 (Streifzug ab Raum 2) haben manche Gegner eine Eigenschaft (Plakette am Lebensbalken):
  - **Gepanzert** – Kugeln machen nur 35 %; Pfote, Rakete, Laser und Talente wirken voll („KLONK“)
  - **Flieger** (ab 14) – Bogenschüsse (Wollknäuel, Haarballen) fliegen darunter durch
  - **Teiler** (ab 16) – zerfällt beim Tod in zwei kleine Hälften (zählen nicht als eigene Zerstörung)
  - **Heiler** (ab 20) – heilt die anderen Gegner mit grünen Strahlen
  - **Bombe** (ab 25) – Lunte brennt vorne 7 s; Pfotenhiebe schubsen sie zurück, sonst Explosion an der Katze (Leben, kurz benommen)
- **Boss-Phase 2** (ab Stufe 8, Streifzug ab Raum 3): ab 50 % Leben wird der Boss wütend (rote Aura, wirft schneller) und kündigt **Großangriffe** an – riesige Geschosse mit „ANTIPPEN!“. Pariert: Volltreffer (6 % Boss-Leben) und kurz betäubt; sonst viel Schaden (Schild blockt).
- Beim ersten Auftauchen jeder Neuerung erklärt ein Hinweis (💡) kurz, was zu tun ist.

## Waffen-Varianten (`js/variants.js`)
- Kisten (6 %), Schatztruhen und Händler-Kisten (25 %) liefern manchmal Waffen mit Eigenschaft: **Brennend** (15 % Brand), **Frostig** (12 % Vereisen), **Blitz** (15 % Kettenblitz), **Wuchtig** (+30 % Schaden). Symbol oben links im Waffenfeld, bleibt beim Verschmelzen erhalten.

## Tages-Streifzug & Lauf-Auswertung (`js/daily.js`)
- Im Reiter 🗺️ Streifzug: jeden Tag eine andere Sonderregel (Glaskanone, Pfotentag, Eiltag, Elitetag, Feuertag, Frosttag, Sonderbar), Beute ×1,5 (Eiltag ×2), Bestenliste der letzten 14 Tage (auf diesem Gerät).
- Am Ende jedes Streifzugs: gewählter Weg, Zerstörungen, Dauer und **Schaden nach Quelle** als Balken.

## Titelbildschirm & Jazz (`js/splash.js`, `js/jazz.js`)
- Beim Start: Logo, die eigene Katze spielt Saxophon im Scheinwerferlicht, Noten steigen auf. Erster Tipp startet den Ton (iOS) und zeigt das Menü: **Spielen/Weiterspielen**, Streifzug, Glücksrad, Optionen, Musik an/aus (`Enter` = Spielen).
- Titelmusik: Old-School-Jazz im Swing, komplett per WebAudio – Walking Bass, Ride-Becken, Charleston-Klavier und ein Altsaxophon (Formantfilter, Vibrato, Atem, Gleiten); 16 Takte in F mit Erkennungsmotiv. Solange der Titel offen ist, ruhen Spiel und Spielmusik.

## HUD (`js/hud.js`)
- **≡ Menü** oben links (alle weiteren Reiter, Pause, Musik), daneben Level und Ressourcen-Pillen. Am Handy liegt das HUD durchsichtig über dem Spielfeld.
- **Schnellknöpfe rechts:** Pause, Musik, 🎡 Glücksrad, 📜 Aufgaben, 🎁 Gratis-Katzenkiste (mit Timer); links 🗺️ Streifzug (zeigt den Raum). Rote „!“-Punkte zeigen, wo etwas bereitliegt.
- Unten runde Farbknöpfe für Waffen, Training, Katzen, Begleiter.
- iOS-Home-Bildschirm-App: die fehlende Höhe (weißer Streifen unten) wird gemessen und aufgefüllt.

## Grenzbruch & Raritäten (`js/limit.js`)
- Zwei **Omega-Waffen (XV)** gleicher Art verschmelzen zu **Grenzbruch ★1** (bis ★5). Kisten liefern weiterhin höchstens XV.
- Jede Waffe bekommt beim Grenzbruch eine Fähigkeit: Miau-Pistole **Querschläger**, Fellflinte **Drachenschrot** (Brand), Laserpointer **Prismastrahl** (Kettenblitz), Fischrakete **Streubombe** (Mini-Fische), Wollknäuel **Wollnetz** (Vereisen + Rückstoß). Mehr Sterne = stärker.
- **Raritäts-Plakette** oben rechts im Waffenfeld: C (I–III), R (IV–VI), SR (VII–IX), UR (X–XII), LR (XIII–XV), MR (Grenzbruch).

## Waffen-Infokarte (`js/winfo.js`)
- Waffe **antippen** (Touch) bzw. mit der Maus darüberfahren: Karte mit Symbol, Rarität, Stufe und Stufen-Leiste, DPS, Schaden pro Schuss, Schüsse/s, Besonderheit, Eigenschaft, Grenzbruch-Fähigkeit, Set-Fortschritt und Verschmelz-Hinweis. Doppeltippen legt weiterhin an/ab.
- Meldungen und 💡-Hinweise: runde Karten mit farbiger Leiste und Symbol-Plakette.

## Gesicht der Katze bei Treffern
- Getroffen: Augen zugekniffen (> <), aufgerissenes Maul, Tränen, die Katze zuckt zurück; bei harten Treffern (Bombe, Vernichtungsschlag, Großangriff) weiter offenes Maul und kreisende Sterne. Bei wenig Leben (Streifzug/Bosskampf) schaut sie besorgt mit Schweißtropfen.

## Glücksrad (`js/wheel.js`)
- Einmal am Tag gratis, danach 15 🦴: Münzregen, Gräten, Goldrausch, Raserei, Gratis-Katzenkiste, Waffenkiste, selten Katzenminze.

## Symbole & Oberfläche
- **Eigener Symbolsatz** (`js/icons.js`, ~120 SVG-Symbole im Stil der Katzen) statt System-Emojis – sieht auf iPhone, Windows und Android gleich aus. Emojis in Texten werden automatisch ersetzt (HTML per MutationObserver, Leinwand über `fillText`/`measureText`). Neue Symbole: in `ICONS` zeichnen und in `EMOJI_ICON` zuordnen.
- Modernisierte Oberfläche: Glasflächen, runde Systemschrift, Ressourcen-Chips, Reiter mit Akzentlinie, einheitliche Karten/Knöpfe, schwebende Symbolleiste am Handy, Meldungen am Handy oben links. Banner weichen dem Boss-Lebensbalken aus.

## Schüsse, Treffer & Komfort
- Kugeln entstehen genau an der **Mündung** der gezeichneten Waffe (auch bei Geisterkatzen und dem Mini-Blaster der Maus-Drohne) und ziehen einen Leuchtschweif, der anfangs bis zum Lauf reicht. Mündungsfeuer als Flammenzunge mit Rauchwölkchen, Einschläge sprühen Funken-Striche gegen die Flugrichtung.
- Wenig Leben (Streifzug oder Bosskampf): roter Rand pulsiert im Herzschlag.
- *Optionen → Komfort:* Bildschirmwackeln & Zoom-Stöße, Schadenszahlen, helle Bildschirmblitze – jeweils abschaltbar.
- Gegner-Gesichter: T-Rex im Profil (Seitenauge mit Schlitzpupille, Maul klappt auf), Ritter mit glühenden Augen im Visier, Maulwurf/Ratte angepasst; wütende Brauen fallen zur Mitte hin ab.

## Auftritte & Kunststücke der Helfer (`js/anim.js`)
- **Geisterkatzen** erscheinen aus einem Geisterwirbel (eindrehen, wachsen, Funkenring), wackeln ab und zu mit den Ohren und verwirbeln beim Abgang. Auch die **Hauptkatze** wackelt zwischendurch mit den Ohren.
- **Abgänge:** Drohne fliegt davon, Ballon platzt, Eule flattert weg.
- **Maus-Drohne** fliegt mit einer Rolle ein und dreht zwischendurch eine Pirouette.
- **Goldfisch-Ballon** bläst sich auf; der Fisch macht Saltos im Glas, wenn er Münzen bringt.
- **Nachteule** flattert herab und breitet beim Feuerraten-Ruf die Flügel aus.

## Streifzug – Roguelike-Modus (`js/run.js`)
- Reiter **🗺️ Streifzug** (ab Stufe 8). Start **ganz von vorn**: Stufe 1, nur Miau-Pistole I, 0 Münzen, kein Training, keine Katzen-/Perk-/Minze-/Level-Boni. Unterwegs eigene Münzen für Kisten und Training. Skills und Waffenplätze bleiben freigeschaltet.
- Das Hauptspiel (Stufe, Münzen, Rucksack, Ausrüstung, Training, **Begleiter, Fischgräten**) wird beiseitegelegt und danach unverändert zurückgeholt; Waffen und Münzen aus dem Streifzug verfallen.
- **Waffenkisten-Kontingent:** 3 Kisten pro Raum (Elite/Wächter 4), unverbrauchte bis 6 ansparen; wiederholte Räume füllen nicht nach. Die Händler-Maus verkauft ein Kisten-Paket (+2, auch über 6). Anzeige am Kisten-Knopf und im Streifzug-Reiter.
- **Begleiter starten im Streifzug bei null** und werden mit Streifzug-Gräten gekauft (Start mit 0 🦴, jeder Boss bringt 2 + 1 je 15 Räume, Elite/Wächter +2). Nicht ausgegebene Gräten nimmt man am Ende mit nach Hause.
- **Pause:** Solange die Menü-Schublade oder ein Fenster offen ist, eine Waffe gezogen wird oder (am PC) die Maus über der Seitenleiste ist, steht der Streifzug still. Im Hauptspiel werfen Bosse dann nicht, der Countdown läuft aber weiter.
- Jeder Raum = neues Gebiet, 10 Gegner + Boss; jeder 20. Raum (20, 40, 60 …) ist ein **Wächter** (×1,6 Leben, wirft öfter, Segen garantiert). Entkommt ein Boss, wird der Raum wiederholt. Gegner werfen auch, Leben heilen **nicht** von selbst.
- Nach jedem **3. Raum** **1 von 3 Segen** (Elite und Wächter bringen immer einen): z. B. Scharfe Krallen, Koffein-Kater, Milchbart, Spiegelpfote, Neuntes Leben, Schrödingers Kiste (Glücksspiel) – oder ein **Pakt** mit Nachteil (Schwarze Katze, Gläserne Krallen). Bei schon vorhandenen Segen zeigt die Karte die Gesamtwirkung danach.
- **Wegkarte:** Nach jedem Boss (und dem Segen) wählt man den nächsten Weg: ⚔️ **Kampf**, 👑 **Elite** (+40 % Leben, Boss +50 %, werfen öfter – dafür sicher ein Segen und +3 🦴), 🎒 **Händler-Maus** (Fischsuppe, Wundertüte, gute Waffenkiste, Krallen schärfen – gegen Streifzug-Münzen), 💤 **Katzenkorb** (Schläfchen +45 % Leben oder einen Segen +1 Stufe) oder 🔮 **Ereignis** (Kiste, Hexenkatze, Fischbrunnen, Katzenminze-Feld, Kartentrick der Elster – jeweils Risiko oder sicher). Jede Tür zeigt das Gebiet; nach einem Zwischenhalt folgen nur Kampf-Türen, Wächter-Räume sind Pflicht (`js/path.js`).
- **Pfotensturm:** Pfotenhiebe laden ihn auf (5 Hiebe, Stufe 2: 4, ab Stufe 3: 3; Pfotenabdrücke über der Katze). Ausgelöst wird er per rosa Pfoten-Knopf über der Skill-Leiste (Taste `5`) – aufgeladen wartet er, bis man ihn braucht. Die Welle rollt übers Feld: 2 s Dauerfeuer-Schaden je Stufe an jedem Gegner, Rückstoß, zählt als Pfote (Pfotenwirbel, 4× am Boss-Schild).
- **Build-Segen** (`js/build.js`): Feuer (Glutkrallen → Flammenmeer), Eis (Frostkrallen → Splitterfrost), Pfote (Pfotensturm), Parade (Konterkunst), Blitz (Kettenblitz). **Kombis:** Thermoschock (Feuer + Eis), Kampfkatze (Pfote + Parade), Gewitterglück (Blitz + Glückssträhne). Karten zeigen den Build und passende Kombi-Partner; Übersicht und Reiter listen aktive Kombis.
- **Segen-Übersicht:** Die ✨-Leiste über dem Spielfeld zeigt alle gesammelten Segen; Antippen (oder `I`) öffnet die Übersicht mit Gesamtwirkung (Schaden, Feuerrate, Krit, erlittener Schaden …), den gesammelten Segen und einem Lexikon aller Segen & Pakte. Auch im Reiter 🗺️ Streifzug.
- **Sonderräume** (ab Raum 3, 30 % Chance, nie zweimal hintereinander), je mit eigenem Hintergrund, zwei neuen Gegnern und eigenem Boss:
  - 🌑 **Die Leere** – Dunkelheit, einziges Licht ist eine leuchtende Mieze-Lampe neben der Katze; Gegner-Augen glühen hindurch (Schattenklumpen, Riesenauge · Boss „Das Große Nichts“)
  - 🌀 **Wurmloch** – die Zeit schwankt zwischen 0,7× und 1,3× (Kristall-Splitter, Ufo · Boss „Ereignishorizont“)
  - 🌐 **World Wide Web** – Pop-up-Werbung verdeckt das Feld: Fenster wachsen mit dem Bildschirm (am Desktop bis 1,55×), stapeln sich (bis 6) und bleiben offen, bis man sie per ✕ schließt (füllt das Schnurr-Meter); **Fauchen** fegt alle weg (Werbefenster, Bug · Boss „Pop-up-Imperator“)
  - 📺 **Flimmerkiste** – alle 10 s wird umgeschaltet: Sport (+30 % Feuerrate), Krimi (+30 % Schaden), Kochshow (heilt), Testbild (Röhrenfernseher, Fernbedienung · Bosse „Der Quotenkönig“, „Lord Zapper“)
  - ⛏️ **Untergrund** – Tropfsteine fallen auf Gegner und manchmal auf die Katze; Schatten unter der Katze antippen zerschlägt den Stein (Maulwurf, Kanalratte · Bosse „Maulwurf-Baron“, „Rattenkönig“)
  - ⏳ **Zeitreise** – alle 15 s ein Zeitsprung: Urzeit, Mittelalter, Zukunft mit eigenen Gegnern (T-Rex, Ritter, Roboter · Bosse „Tyranno-Max“, „Sir Blechbüchse“, „Omega-Toaster“) – `js/rooms2.js`
- Im **Hauptspiel** sind die Sonderräume reguläre Gebiete (je 10 Stufen): Flüsterwald → Sonnenwüste → Wurmloch → Frostgipfel → Untergrund → Lavagrund → Flimmerkiste → Neon-City → World Wide Web → Sternenmeer → Die Leere → Zeitreise. Zusätzlich: ab Stufe 5 ist etwa jede 7. Stufe ein Sonderraum (fest je Stufe, nie zwei hintereinander, nie auf Zehner-Stufen).
- Raum n = Stufe n des normalen Spiels. **K.O. = Lauf vorbei.** Beute: 3 🦴 je Raum plus ein Münzschatz fürs Hauptspiel.
- **Gegnerleben im Streifzug:** bis Raum 30 wie Stufe n (+11 % je Raum). Danach eine weiche Kurve (bis Raum 150 ≈ +7,5 % plus Potenz-Anteil je Raum, später nur noch ≈ Raum^3,4) und ein **Deckel**: ein Gegner braucht höchstens 2,4 s Dauerfeuer der aktuellen Ausrüstung (Boss 15 s), mindestens 0,45 s (Boss 7 s). Früher wuchs das Leben ×1,53 je Raum – ab etwa Raum 70 richteten Treffer nichts mehr aus. Erlittener Schaden: +2 % je Raum bis Raum 50, danach +0,4 %.
- **Meilensteine** (`js/milestones.js`): alle 100 Räume eine kleine Feier, bei **Raum 500** die Halbzeit-Sequenz (Dank, bitte nicht aufgeben, Medaille +15 % Schaden), bei **Raum 1000** das Finale mit Feuerwerk und Abspann (+30 %). Gilt auch für Stufen im Hauptspiel.

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

**Handy wird warm?** *Optionen → Grafik → Akku sparen* (30 Bilder/s, 1,5× statt 3× Pixeldichte, weniger Teilchen, ruhende Knopf-Animationen). „Auto“ wählt auf Handy/Tablet „Ausgeglichen“ (1,75× Pixeldichte) und senkt die Auflösung zusätzlich, sobald ein Bild zu lange rechnet. Schadenszahlen werden je Gegner zusammengezählt (weniger Text zu zeichnen), Dauer-Animationen der Knöpfe sind auf Touch aus.

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
- `js/path.js` – Wegkarte des Streifzugs: Kampf, Elite, Händler-Maus, Katzenkorb, Ereignisse
- `js/build.js` – Build-Segen (Feuer, Eis, Pfote, Parade, Blitz) und Kombis
- `js/icons.js` – eigener SVG-Symbolsatz, ersetzt Emojis in Oberfläche und Leinwand
- `js/traits.js` – Gegner-Eigenschaften, Boss-Phase 2, Hinweise beim ersten Mal
- `js/variants.js` – Waffen-Varianten
- `js/daily.js` – Tages-Streifzug, Lauf-Auswertung, Töne der neuen Elemente
- `js/foes.js` – lebendige Gegner: Atmen, Wiegen, Hüpfen, Ausholen vor dem Wurf, Gesichter mit Stimmungen, Treffer-Reaktionen (Rückstoß, Kippen, Aufblitzen, Splitter)
- `js/shades.js` – Schattenwesen mit Frost-Fluch (friert Skills, Talent oder Geisterkatzen ein)
- `js/rooms.js` – Sonderräume im Streifzug: Die Leere, Wurmloch, World Wide Web
- `js/perf.js` – Grafik-Stufen (Hoch / Ausgeglichen / Akku sparen): Leinwand-Auflösung (iPhone sonst 3×), Bildrate, Teilchenzahl; hinter Menüs automatisch 30 Bilder/s
- `js/combo.js` – Combo-Anzeige: Abzeichen mit Zeit-Ring, Stufen (Nett!, Super!, Wahnsinn!, Schnurrtastisch!, Legendär!), Funken, Flammen, „Kette gerissen“
- `js/splash.js` – Titelbildschirm (Katze mit Saxophon, Menü), Querformat-Hinweis
- `js/jazz.js` – Jazz-Titelmusik (WebAudio)
- `js/hud.js` – ≡-Menü, Schnellknöpfe, HUD über dem Spielfeld, iOS-Höhen-Fix
- `js/limit.js` – Grenzbruch-Waffen und Raritäten
- `js/milestones.js` – Meilensteine, Raum 500/1000
- `js/wheel.js` – Glücksrad
- `js/winfo.js` – Waffen-Infokarte
- `js/touch.js` – Touch-Drag & Doppeltipp im Rucksack, Zoom-Sperre, Audio-Fortsetzung, Service-Worker-Registrierung
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA (Home-Bildschirm, Offline)

Der Spielstand liegt im `localStorage` des Fensters (Profil `%LOCALAPPDATA%\Schnurrkanone`).
