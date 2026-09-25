# Woodshed

A practice room for piano (and trombone), in the browser. No build step, no accounts, works offline once loaded.

- **Today**: a key and a chord of the day (walking the circle of fifths), an 18-minute session plan, streak and practice time.
- **Piano**: just play. Eighteen sounds in three families: eleven pianos (a recorded Yamaha C5 grand and a Kawai upright, each at two strengths, and the concert, jazz, bright, stage, felt, dream, lo-fi tape, honky-tonk and toy pianos derived from them), a tine electric piano, harpsichord, celesta, music box, vibraphone and a simple synth, and a real tenor trombone that holds its note for as long as you hold the key. Every note is its own voice, so chords ring together and nothing cuts anything else off. A sustain pedal (tap to latch, hold for momentary, the space bar, or a MIDI piano's own pedal). Woodshed names whatever you hold (note, interval or chord, with its other readings) and writes it on the grand staff. Record a take and play it back. **Learn a melody** lights the next note of a tune and waits for you, playing the chords underneath as you find each one.
- **Chords**: every chord as a symbol, a formula, on the staff and on the keys, with inversions and fingering. Type any symbol from a lead sheet (`F#m7b5`, `Bb13/D`, `CΔ9`, `C-7`) or press keys and have the chord named.
- **Keys**: circle of fifths, key signatures on the grand staff, 14 scale types with standard fingering, the chords in each key, and progressions you can hear or open as a lead sheet.
- **Study**: the quiet tab; everything on it works with the sound off, and a speaker button at the top mutes the whole app. **Chord school** takes every chord type (major, minor, dim, aug, sus4 and sus2 as written C4 and C2, power chords, all the sevenths, sixths, adds, ninths and altered dominants) from the ground up: the formula, how to get it from a chord you already know, then build it note by note on the keys and play it from memory in all twelve keys, with a mastery bar per key. Thirteen short lessons with notation figures (the staff, rhythm, key signatures, intervals, scales, triads, sevenths and symbols, Roman numerals, lead sheets, hands, terms, the pedal, practice). Eleven flashcard decks that remember what you know. A glossary.
- **Lead sheets**: melody with chord symbols above it. Songs Clef writes out (or that you paste in) live here too, with a written left hand on a bass staff when there is one, lyrics as cues, and a text editor to fix any bar. Tap a chord to decode the symbol and see a playable voicing (five left-hand styles, voice-led so the hand barely moves). Play-along transport with loop, click, count-in, melody/chords toggles, transpose, and "simplify to sevenths/triads". Roman numerals and ii–V–I spotting. Write your own charts: `| C | Am7 | Dm7 G7 | % |`.
- **Train**: note reading, key signatures, play-the-chord, name-that-chord, ear training for intervals and chord quality, plus a silent group: written intervals, Roman numerals, scale degrees, rhythm values and trombone positions. Drills lean toward what you miss.
- **Trombone**: any note's slide position (with alternates and the flat partials flagged), a tuner that listens through the microphone and says how many cents you're off, long-tone drones from the real trombone, scales with positions on a bass staff, the position chart, and bass-clef reading.
- **Tools**: metronome with tap tempo, the piano sound and room (dry, room, hall), "keep every piano offline", MIDI keyboard hookup (Chrome/Edge on a computer), practice record.
- **Clef**, the tutor: answers chord/key/scale questions on-device for free. With your own Claude API key it **writes out songs as sheet music** ("the piano part in the chorus of…", "that TikTok sound that goes…"): a melody with chords and, if you ask, a simple left hand, drawn on the staff right in the chat, checked so every bar adds up, and one tap away from Lead sheets or Learn a melody. Say what's wrong ("bar 3 goes up") and it rewrites. It also reads a **photo or PDF of sheet music**, breaks the piece down (key, chords, form, hard bars, practice plan) and loads the chords straight into Lead sheets.

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

Reading sheet music from a photo is good at titles, key and time signatures, chord symbols and structure, and less reliable at exact note-by-note transcription of dense scores. Writing a song out from memory is the same: the shape of the tune and the chords are usually right, single notes sometimes need a fix. Clef says how confident it is, and everything lands in an editor so you can fix what it got wrong (or tell Clef which bar to redo).

## Files

| | |
|---|---|
| `js/theory.js` | The music engine: spelling, chord-symbol parser, scales, keys, roman numerals, key detection, voicings. Pure functions; loads in Node. |
| `js/staff.js` + `js/glyphs.js` | SVG notation renderer and the Bravura glyph outlines it draws with. |
| `js/audio.js` | The sound engine: sampled pianos, the electric piano and synth, one voice per note with its own damper, sustain pedal, reverb, a limiter that only catches peaks, metronome click, look-ahead clock. `W.Audio._render` plays into an OfflineAudioContext for testing. |
| `js/keyboard.js` | The on-screen piano: multi-touch, mouse, computer keys, Web MIDI (notes and the sustain pedal). Keys light up when the app plays. |
| `js/view-play.js` | The Piano page: free play, chord naming, recording, Learn a melody. |
| `js/view-study.js` | The Study tab: Chord school, lessons and their figures, flashcards, glossary. |
| `js/view-trombone.js` + `js/tuner.js` | The Trombone page, and the microphone pitch detector behind its tuner. |
| `samples/` | The recordings: pianos as AAC (`{midi}{p or f}.m4a`, 3.6 MB grand, 2.6 MB upright), the trombone (`{midi}.m4a`, 0.7 MB, looped while a key is held), and the soundfont keys as MP3 (`{midi}.mp3`, about 0.3 MB each). Only the chosen sound downloads; the service worker keeps it. See `samples/CREDITS.txt`. |
| `js/songs.js` | Built-in tunes and charts, and `W.Songs`: your own songs, the text form for editing them, and the checks that mend a bar that doesn't add up. |
| `js/app.js`, `js/view-*.js` | State, routing, and one file per tab. |
| `js/tutor.js` | Clef. |
| `sw.js` | Offline cache. Network-first, so edits show up on the next load; piano samples are cache-first in their own cache (`woodshed-samples-1`), which survives app updates. Bump `CACHE_VERSION` only when files are renamed or removed. A changed recording needs a new file name (or a new samples cache name). |
| `fonts/accidentals.otf` | Five glyphs (♭ ♮ ♯ 𝄪 𝄫) sized to sit next to letters, derived from Bravura. |

Progress lives in localStorage under `ws.v1`.

## Credits

Notation glyphs and the accidentals font are derived from [Bravura](https://github.com/steinbergmedia/bravura) by Steinberg, SIL Open Font License 1.1 (`fonts/OFL.txt`). Tunes are public domain.

The harpsichord, celesta, music box and vibraphone are rendered from the [FluidR3 General MIDI soundfont](https://github.com/gleitz/midi-js-soundfonts) (CC BY 3.0). The trombone is the tenor trombone from [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) by Versilian Studios (CC0). The grand piano is the [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (a Yamaha C5), Creative Commons Attribution 3.0. The upright is [Upright Piano KW](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) by Gonzalo and Roberto of the FreePats project (a Kawai), CC0. Both were trimmed, faded and re-encoded for the web; `samples/CREDITS.txt` has the details. The level trims in `js/audio.js` even out recordings that came out louder or softer than their neighbours.
