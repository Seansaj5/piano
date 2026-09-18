# Woodshed

A practice room for piano, in the browser. No build step, no accounts, works offline once loaded.

- **Today**: a key and a chord of the day (walking the circle of fifths), an 18-minute session plan, streak and practice time.
- **Chords**: every chord as a symbol, a formula, on the staff and on the keys, with inversions and fingering. Type any symbol from a lead sheet (`F#m7b5`, `Bb13/D`, `CΔ9`, `C-7`) or press keys and have the chord named.
- **Keys**: circle of fifths, key signatures on the grand staff, 14 scale types with standard fingering, the chords in each key, and progressions you can hear or open as a lead sheet.
- **Lead sheets**: melody with chord symbols above it. Tap a chord to decode the symbol and see a playable voicing (five left-hand styles, voice-led so the hand barely moves). Play-along transport with loop, click, count-in, melody/chords toggles, transpose, and "simplify to sevenths/triads". Roman numerals and ii–V–I spotting. Write your own charts: `| C | Am7 | Dm7 G7 | % |`.
- **Train**: note reading, key signatures, play-the-chord, name-that-chord, ear training for intervals and chord quality. Drills lean toward what you miss.
- **Tools**: metronome with tap tempo, MIDI keyboard hookup (Chrome/Edge on a computer), practice record.
- **Clef**, the tutor: answers chord/key/scale questions on-device for free. With your own Claude API key it reads a **photo or PDF of sheet music**, breaks the piece down (key, chords, form, hard bars, practice plan) and loads the chords straight into Lead sheets.

## Run it

The real thing is the live site (below). For a local preview while editing:

```
node bin/serve.js --open     # serves http://localhost:8080 and opens it in Chrome
```

Safari with **HTTPS-Only** turned on refuses plain `http://`, even for localhost ("Safari Can't Open the Page … HTTPS-Only enabled"). That's Safari's setting, not a bug in the app. In Safari, use the live HTTPS site, or open `index.html` straight from Finder (that works too, just without the offline cache).

## Put it on your phone

Live at **https://seansaj5.github.io/piano/** (GitHub Pages, built from `main`). Open it in Safari, then Share → Add to Home Screen. Pushing to `main` redeploys in about a minute, and because the service worker is network-first, the installed app picks up changes the next time it opens with signal.

## Clef and the API key

Clef's Claude connection is a plain `fetch` to `api.anthropic.com` with **your own key**, stored only in this browser's localStorage (`ws.clef`) and never in this repo. Make a dedicated key with a low spend limit at platform.claude.com. A page scan costs a few cents. If Home Program is hosted on the same domain and already has a key saved, the settings panel offers to reuse it.

Reading sheet music from a photo is good at titles, key and time signatures, chord symbols and structure, and less reliable at exact note-by-note transcription of dense scores. Clef says how confident it is, and scanned charts land in the editor so you can fix anything it misread.

## Files

| | |
|---|---|
| `js/theory.js` | The music engine: spelling, chord-symbol parser, scales, keys, roman numerals, key detection, voicings. Pure functions; loads in Node. |
| `js/staff.js` + `js/glyphs.js` | SVG notation renderer and the Bravura glyph outlines it draws with. |
| `js/audio.js` | Synthesized piano, metronome click, look-ahead clock. No samples to download. |
| `js/keyboard.js` | The on-screen piano: touch, mouse, computer keys, Web MIDI. |
| `js/songs.js` | Built-in tunes and charts. Add your own here, or in the app. |
| `js/app.js`, `js/view-*.js` | State, routing, and one file per tab. |
| `js/tutor.js` | Clef. |
| `sw.js` | Offline cache. Network-first, so edits show up on the next load. Bump `CACHE_VERSION` only when files are renamed or removed. |
| `fonts/accidentals.otf` | Five glyphs (♭ ♮ ♯ 𝄪 𝄫) sized to sit next to letters, derived from Bravura. |

Progress lives in localStorage under `ws.v1`.

## Credits

Notation glyphs and the accidentals font are derived from [Bravura](https://github.com/steinbergmedia/bravura) by Steinberg, SIL Open Font License 1.1 (`fonts/OFL.txt`). Tunes are public domain.
