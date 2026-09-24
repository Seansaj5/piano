# Woodshed

A practice room for piano, in the browser. No build step, no accounts, works offline once loaded.

- **Today**: a key and a chord of the day (walking the circle of fifths), an 18-minute session plan, streak and practice time.
- **Piano**: just play. Real recorded pianos (a Yamaha C5 grand and a Kawai upright, each at two strengths), plus bright grand, felt piano, honky-tonk, a tine electric piano and a simple synth. Every note is its own voice, so chords ring together and nothing cuts anything else off. A sustain pedal (tap to latch, hold for momentary, the space bar, or a MIDI piano's own pedal). Woodshed names whatever you hold (note, interval or chord, with its other readings) and writes it on the grand staff. Record a take and play it back. **Learn a melody** lights the next note of a tune and waits for you, playing the chords underneath as you find each one.
- **Chords**: every chord as a symbol, a formula, on the staff and on the keys, with inversions and fingering. Type any symbol from a lead sheet (`F#m7b5`, `Bb13/D`, `CΔ9`, `C-7`) or press keys and have the chord named.
- **Keys**: circle of fifths, key signatures on the grand staff, 14 scale types with standard fingering, the chords in each key, and progressions you can hear or open as a lead sheet.
- **Lead sheets**: melody with chord symbols above it. Tap a chord to decode the symbol and see a playable voicing (five left-hand styles, voice-led so the hand barely moves). Play-along transport with loop, click, count-in, melody/chords toggles, transpose, and "simplify to sevenths/triads". Roman numerals and ii–V–I spotting. Write your own charts: `| C | Am7 | Dm7 G7 | % |`.
- **Train**: note reading, key signatures, play-the-chord, name-that-chord, ear training for intervals and chord quality. Drills lean toward what you miss.
- **Tools**: metronome with tap tempo, the piano sound and room (dry, room, hall), "keep every piano offline", MIDI keyboard hookup (Chrome/Edge on a computer), practice record.
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
| `js/audio.js` | The sound engine: sampled pianos, the electric piano and synth, one voice per note with its own damper, sustain pedal, reverb, a limiter that only catches peaks, metronome click, look-ahead clock. `W.Audio._render` plays into an OfflineAudioContext for testing. |
| `js/keyboard.js` | The on-screen piano: multi-touch, mouse, computer keys, Web MIDI (notes and the sustain pedal). Keys light up when the app plays. |
| `js/view-play.js` | The Piano page: free play, chord naming, recording, Learn a melody. |
| `samples/` | The piano recordings, AAC (`{midi}{p or f}.m4a`), about 3.6 MB for the grand and 2.6 MB for the upright. Only the chosen piano downloads; the service worker keeps it. See `samples/CREDITS.txt`. |
| `js/songs.js` | Built-in tunes and charts. Add your own here, or in the app. |
| `js/app.js`, `js/view-*.js` | State, routing, and one file per tab. |
| `js/tutor.js` | Clef. |
| `sw.js` | Offline cache. Network-first, so edits show up on the next load; piano samples are cache-first in their own cache (`woodshed-samples-1`), which survives app updates. Bump `CACHE_VERSION` only when files are renamed or removed. A changed recording needs a new file name (or a new samples cache name). |
| `fonts/accidentals.otf` | Five glyphs (♭ ♮ ♯ 𝄪 𝄫) sized to sit next to letters, derived from Bravura. |

Progress lives in localStorage under `ws.v1`.

## Credits

Notation glyphs and the accidentals font are derived from [Bravura](https://github.com/steinbergmedia/bravura) by Steinberg, SIL Open Font License 1.1 (`fonts/OFL.txt`). Tunes are public domain.

The grand piano is the [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (a Yamaha C5), Creative Commons Attribution 3.0. The upright is [Upright Piano KW](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) by Gonzalo and Roberto of the FreePats project (a Kawai), CC0. Both were trimmed, faded and re-encoded for the web; `samples/CREDITS.txt` has the details. The level trims in `js/audio.js` even out recordings that came out louder or softer than their neighbours.
