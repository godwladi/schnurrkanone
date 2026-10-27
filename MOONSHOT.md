# 🌙 MOONSHOT – Schnurrkanone groovt

> **Nordstern:** Schnurrkanone ist kein Idle-Shooter mit Musik – es ist eine **Jazz-Band, in der du mitspielst**.
> Jede Kugel ein Ton, jeder Boss ein Solo-Duell, jeder Streifzug ein eigener Song, den es so nur einmal gibt.

Das Spiel hat schon alles, was ein Idle-Shooter braucht (Merge, Bosse, Roguelike, Slots, Gebiete, Erzwächter).
Was ihm fehlt, ist eine **Seele, die man hört und fühlt**. Der Titelbildschirm zeigt es bereits: Die Katze spielt Saxophon,
ein kompletter WebAudio-Swing läuft prozedural. Der Traum: Diese Musik verlässt den Titel und **wird das Spiel**.

---

## Die sechs Säulen

### 1. 🎷 Groove-Engine – der Kampf läuft im Takt
- Eine zentrale **Beat-Uhr** (aus dem Musik-Scheduler) treibt alles: Mündungsfeuer, Wippen der Gegner, Glühwürmchen, Lebensbalken-Pulse.
- **Swing-Pfote:** Pfotenhiebe genau auf dem Schlag sind „Im Takt!“ – mehr Schaden, mehr Schnurr-Meter, Noten steigen auf.
  Eine Serie im Takt zündet den **Groove** (Saxophon-Lick aus der Band, Bonus-Schaden, Farbwelle über den Boden).
- Idle bleibt idle: Wer nicht tippt, verliert nichts. Wer tippt, **spielt mit**.

### 2. 🎼 Adaptive Partitur
- Die Musik folgt dem Kampf in Schichten: Farmen = Trio (Bass, Becken, Klavier) → Combo 20 = Bläser setzen ein → Raserei = volle Big Band → wenig Leben = gedämpfte Ballade mit Herzschlag-Bass.
- Jeder Boss hat ein **Leitmotiv**; Phase 2 moduliert es nach Moll, der Vernichtungsschlag ist ein Crescendo, das man *kommen hört*.
- Jedes Gebiet bekommt einen Stil: Flüsterwald = Bossa, Neon-City = Synth-Funk, Sternenmeer = Ambient-Jazz, Goldene Arena = Big-Band-Finale.

### 3. 🥊 Jam-Duelle (Call & Response)
- Erzwächter „spielen“ eine Phrase (Geschosse im Rhythmus), die Katze **antwortet** – Pariert-Tipps im Rhythmus der Phrase.
- Perfekt nachgespielt = Konter-Solo der Katze (Saxophon, Bildschirm golden, Massenschaden). Rhythmus-Spiel ohne eigenen Modus, eingebettet ins vorhandene Paraden-System.

### 4. 📼 Jeder Streifzug ist ein Song
- Seed + Entscheidungen erzeugen eine **eigene Komposition**: Segen ändern Instrumente (Feuer-Segen = Trompete, Frost = Vibraphon).
- Am Ende: **Schallplatte** mit Cover (Katze, Gebiet, Beste Waffe), abspielbar im „Plattenschrank“, teilbar als kurzer Code (`SK-7F3A-…`) – Freunde hören *und spielen* denselben Lauf, ganz ohne Server.

### 5. 🐈 Die Katze lebt
- Persönlichkeit aus Spielweise (Tipper = „Draufgängerin“, Idler = „Genießerin“), Stimmungen, Lieblingsgebiet.
- **Katzentagebuch:** jeden Tag ein paar Zeilen aus echten Ereignissen („Heute hat mich Brie mit Käse beworfen. Ich habe zurückgeworfen.“), offline erzeugt aus Textbausteinen.
- **Offline-Fortschritt als Geschichte** statt Zahl: „Während du weg warst, hat Mausi drei Ratten verjagt und einen Fisch gefunden.“

### 6. 🌍 Das Revier
- Zwischen Läufen ein kleiner, wachsender **Katzen-Club** (Bühne, Bar, Plattenschrank, Album, Schlüsselbund an der Wand), in dem Geisterkatzen und Begleiter herumlungern und auf der Bühne jammen – das Meta-Spiel wird ein Ort statt einer Liste von Reitern.

---

## Warum das der richtige Traum ist
- **Alleinstellung:** Idle-Shooter gibt es tausende; einen, der *groovt*, keinen.
- **Baut auf Vorhandenem auf:** Prozedurale Musik (audio2.js, jazz.js), Paraden, Combo, Kartenfächer, Erzwächter-Phasen – alles ist da und wartet darauf, verbunden zu werden.
- **Kein Server, keine Kosten:** alles WebAudio + Canvas + localStorage, Teilen über Codes.
- **Optional und barrierearm:** Wer Musik aus hat oder nicht im Takt tippen kann, spielt wie bisher.

---

## Phasen

| Phase | Inhalt | Stand |
|---|---|---|
| 1 | Traum spinnen | ✅ |
| 2 | MOONSHOT.md schreiben | ✅ |
| 3 | Ins Projekt einordnen (Code-Bestand prüfen) | ✅ |
| 4 | **Umsetzungsplan:** kleinsten Baustein wählen, der den Nordstern spürbar macht | ✅ |
| 5 | **Bauen:** Groove-Engine v1 | ✅ |
| 6 | **Testen & Festhalten:** im Browser prüfen, README, Obsidian-Notiz | ✅ |

### Phase 4 – Umsetzungsplan (Groove-Engine v1)
Kleinster Baustein mit größter Wirkung: **Säule 1**, weil alle anderen Säulen die Beat-Uhr brauchen.

- **Neues Modul `js/groove.js`**, eingehängt wie die anderen Module (Funktionen umwickeln, keine Kerndatei umbauen).
- **Beat-Uhr:** `Music.playStep` umwickeln, jede Viertel (Schritt 0/4/8/12) mit ihrer Audio-Zeit merken. `Groove.phase()` liefert Abstand zum nächsten hörbaren Schlag (Ausgabe-Latenz berücksichtigt).
- **Swing-Pfote:** Pfotenhieb innerhalb ±90 ms um einen Schlag = „Im Takt!“ (±40 ms = „Perfekt!“): ×2 bzw. ×3 Pfotenschaden, +1 Schnurr-Meter, aufsteigende Noten, Serie zählt hoch. Daneben: Serie reißt (nichts wird bestraft).
- **Groove:** 8 Hiebe im Takt in Folge → 8 s Groove: alle Schäden +25 %, die Band spielt ein Saxophon-Lick (Stimme aus `Jazz.sax`), goldener Takt-Ring.
- **Sichtbarer Puls:** dezenter Ring am Boden unter der Katze auf jedem Schlag, nur wenn Musik läuft; respektiert „Bewegung reduzieren“/Bildschirmblitze-Option über Zurückhaltung (keine Blitze, nur Ring).
- **Nur bei laufender Musik aktiv.** Erster Takt-Treffer zeigt einen 💡-Hinweis.

### Phase 5 – Bauen
`js/groove.js` + Einbindung in `index.html` und `sw.js`.

### Phase 6 – Testen & Festhalten
Im Pane über `schnurrkanone-dev` prüfen (Beat-Uhr läuft, Takt-Treffer werten, Groove zündet, keine Konsolenfehler), README-Abschnitt, Notiz im Vault.

---

## Nächste Monde (nach v1)
1. Adaptive Partitur: Schichten nach Combo/Raserei/Leben (Säule 2).
2. Boss-Leitmotive + hörbares Vernichtungsschlag-Crescendo.
3. Jam-Duell beim Erzwächter (Säule 3).
4. Schallplatte am Ende des Streifzugs + Teil-Code (Säule 4).
5. Katzentagebuch (Säule 5).
