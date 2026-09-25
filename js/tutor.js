/* Clef: the tutor in the corner.
   Two brains. On-device: answers theory questions straight from the engine in theory.js (free, offline).
   Claude: reads a photo or PDF of sheet music, writes out songs you ask for as lead sheets, and holds a real
   conversation. That path talks to api.anthropic.com
   with your own API key, which is kept in this browser's localStorage and sent nowhere else. Plain fetch on purpose:
   no build step, and no third-party script sitting next to the key. */
(function () {
  "use strict";
  const W = self.W, T = W.T, App = W.App, $ = App.$, $$ = App.$$, esc = App.esc;
  const API = "https://api.anthropic.com/v1/messages";
  const MODELS = [
    { id: "claude-opus-5", name: "Claude Opus 5", note: "Best at reading notation" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", note: "Faster and cheaper" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", note: "Cheapest, fine for chat" }
  ];
  const LEVELS = [["new", "Brand new to piano"], ["beginner", "Beginner: simple pieces, hands together slowly"], ["intermediate", "Intermediate: comfortable reading both clefs"], ["advanced", "Advanced"]];

  let cfg = (() => { try { return JSON.parse(localStorage.getItem("ws.clef")) || {}; } catch (e) { return {}; } })();
  const saveCfg = () => { try { localStorage.setItem("ws.clef", JSON.stringify(cfg)); } catch (e) {} };
  const model = () => MODELS.filter(m => m.id === cfg.m)[0] || MODELS[0];
  const aiOn = () => !!cfg.k;

  /* ---------- formatting ---------- */
  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[\[(chord|key|drill|sheet):([^\]]+)\]\]/g, (m, kind, val) => `<button class="act" data-link="${kind}" data-val="${esc(val.trim())}">${kind === "chord" ? "See " : kind === "key" ? "Open " : kind === "drill" ? "Drill: " : ""}${esc(val.trim())}</button>`);
  }
  function fmt(text) {
    const lines = String(text).split(/\n/), out = []; let list = null;
    const close = () => { if (list) { out.push("</" + list + ">"); list = null; } };
    lines.forEach(raw => {
      const l = raw.trim(); let m;
      if (!l) { close(); return; }
      if ((m = /^#{1,4}\s+(.*)$/.exec(l))) { close(); out.push("<h4>" + inline(m[1]) + "</h4>"); }
      else if ((m = /^[-•*]\s+(.*)$/.exec(l))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inline(m[1]) + "</li>"); }
      else if ((m = /^\d+[.)]\s+(.*)$/.exec(l))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inline(m[1]) + "</li>"); }
      else { close(); out.push("<p>" + inline(l) + "</p>"); }
    });
    close(); return out.join("");
  }

  /* ---------- the on-device brain ---------- */
  const GLOSS = [
    [/lead ?sheet|fake ?book/i, "A **lead sheet** is one staff with the melody, and chord symbols written above it. Nothing tells you what the left hand does: you build that from the symbols. Start with the melody in your right hand and just the root of each chord in your left, then grow it into full chords. The Lead sheets tab shows a playable voicing for every symbol."],
    [/slash chord|what does the slash|over [A-G]/i, "A **slash chord** like `C/E` means a C chord with E as the lowest note. The letter after the slash goes in your left hand. If that note belongs to the chord it's an inversion; if not (like `C/D`), it adds its own colour underneath."],
    [/inversion/i, "An **inversion** is the same chord with a different note on the bottom. C–E–G is root position, E–G–C is 1st inversion, G–C–E is 2nd. Inversions let you move between chords with almost no hand travel: pick the one closest to the chord you just played."],
    [/ii.?v.?i|2.?5.?1|two.?five/i, "**ii–V–I** is the most common chord move in jazz and a lot of pop: a minor 7th, then a dominant 7th a 4th higher, then the major chord a 4th above that. In C: `Dm7 → G7 → Cmaj7`. Learn how it feels in your hands in each key and whole lines of a lead sheet become one gesture. [[sheet:251]]"],
    [/circle of fifths/i, "The **circle of fifths** lines the keys up so each step clockwise adds one sharp (C, G, D, A…) and each step anticlockwise adds one flat (F, B♭, E♭…). Neighbours share six of their seven notes, which is why songs drift between them so easily."],
    [/shell/i, "A **shell voicing** is just the root plus the 3rd or 7th: the notes that actually define the chord. Left hand plays root and 7th; the right hand is free for the 3rd and the tune. It sounds open and jazzy, and it's easy to grab."],
    [/rootless/i, "**Rootless voicings** leave the root to the bass player. The left hand plays 3–5–7–9 (or 7–9–3–5). For a ii–V–I the shapes barely move: in C, `F A C E → F A B E → E G B D`."],
    [/\bsus\b|suspended/i, "**sus** means the 3rd is replaced: by the 4th (`sus4`, or plain `sus`) or the 2nd (`sus2`). With no 3rd the chord is neither major nor minor, and it usually resolves back to the normal chord."],
    [/half.?dim|ø|m7b5|m7♭5/i, "**Half-diminished** (`ø` or `m7♭5`) is a minor 7th chord with the 5th lowered. It is the ii chord of a minor key: `Dm7♭5 → G7 → Cm`."],
    [/\bdim|°/i, "**Diminished** (`dim` or `°`) stacks minor 3rds: root, ♭3, ♭5. Add another minor 3rd and you get `dim7`. It sounds tense, and usually slides up a half step to the next chord."],
    [/\baug|\+ chord|augmented/i, "**Augmented** (`aug` or `+`) is a major triad with the 5th raised a half step. It floats, and usually pushes on to the next chord."],
    [/dominant/i, "A **dominant 7th** is a major triad with a flatted 7th: `G7` = G B D F. The B and F form a tritone that wants to resolve, which is why V7 pulls so strongly to I."],
    [/Δ|triangle|maj7|major 7/i, "**maj7** (also `Δ` or `M7`) adds the natural 7th, a half step under the root: `Cmaj7` = C E G B. Don't confuse it with plain `7`, which uses the flatted 7th (B♭)."],
    [/voicing/i, "A **voicing** is how you spread a chord's notes across your hands: which note is on top, which are doubled or left out. The symbol says *what* notes; the voicing is *your* choice of how."],
    [/relative/i, "**Relative** keys share a key signature. The relative minor starts on the 6th note of the major scale (C major → A minor). Same notes, different home."],
    [/arpeggi/i, "An **arpeggio** is a chord played one note at a time. Rolling the left-hand chord up as an arpeggio is the easiest way to make a lead sheet sound like music instead of blocks."],
    [/comping/i, "**Comping** is accompanying: playing the chords in rhythm while someone else (or your own right hand) carries the tune."],
    [/tritone/i, "A **tritone** is six half steps, exactly half an octave (C to F♯). It's the restless interval inside every dominant 7th chord."],
    [/how (should|do) i practice|practice (tips|routine|plan)|get better/i, "Short and daily beats long and rare. A solid 20 minutes: **3** on the scale of the day, **4** on its primary chords in all inversions, **8** on one lead sheet with the click on, **5** on a drill. Go slowly enough to play it right three times running, then nudge the tempo up. The Today tab lays this out for you."]
  ];

  function chordTokens(text) {
    const skip = { A: 1, Do: 1, Am: 1, I: 1, Be: 1, Go: 1, Add: 1 }, out = [];
    (text.match(/[A-G][#b♯♭]?[A-Za-z0-9#b♯♭+\-°øΔ()\/]*/g) || []).forEach(tok => {
      tok = tok.replace(/[?.,!]+$/, "");
      if (skip[tok] && !/chord|notes/i.test(text)) return;
      if (/^[A-G][#b♯♭]?(major|minor|maj|min)$/.test(tok) && / (scale|key)/i.test(text)) return;
      const ch = T.parseChord(tok);
      if (ch && out.every(o => o.ascii !== ch.ascii)) out.push(ch);
    });
    return out;
  }
  function keyIn(text) {
    const m = /\b([A-G](?:#|b|♯|♭| sharp| flat)?)\s*(major|minor|maj|min)?\b/.exec(text);
    if (!m) return null;
    return T.parseKey(m[1].replace(" sharp", "#").replace(" flat", "b") + (m[2] ? " " + m[2] : ""));
  }

  function brain(q) {
    const t = q.trim(), low = t.toLowerCase(); let m;
    // "what key has 3 flats"
    if ((m = /(\d|one|two|three|four|five|six|seven|no)\s+(sharp|flat)/i.exec(t)) && /key|signature|what|which/i.test(t)) {
      const n = { no: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }[m[1].toLowerCase()]; const num = n == null ? +m[1] : n;
      if (num <= 7) { const sig = /sharp/i.test(m[2]) ? num : -num, maj = T.keyFromSig(sig, "major"), min = T.keyFromSig(sig, "minor");
        return { text: `**${T.sigText(sig)}** is **${T.keyName(maj)}** or its relative, **${T.keyName(min)}**.${sig ? " The " + (sig > 0 ? "sharps" : "flats") + " are " + T.sigNotes(sig).map(n => T.name(n)).join(", ") + "." : ""} [[key:${T.keyName(maj)}]]` }; }
    }
    // scales
    const scaleDef = T.SCALES.filter(s => low.indexOf(s.name.toLowerCase()) >= 0 || (s.id === "minor" && /\bminor scale/.test(low)) || (s.id === "major" && /\bmajor scale/.test(low)))[0];
    if (scaleDef && /scale|mode|dorian|lydian|mixolydian|phrygian|locrian|pentatonic|blues/.test(low)) {
      const k = keyIn(t.replace(/scale.*/i, "")) || keyIn(t);
      if (k) { const sc = T.scale(k.tonic, scaleDef.id), f = T.fingering(k.tonic, scaleDef.id);
        return { text: `**${T.name(k.tonic)} ${scaleDef.name.toLowerCase()}**: ${sc.notes.map(n => T.name(n)).join(" – ")}.\n\n${scaleDef.note}${f ? `\n\nFingering going up: right hand \`${f.rh.join(" ")}\`, left hand \`${f.lh.join(" ")}\`.` : ""} [[key:${T.name(k.tonic)} ${/minor|dorian|phrygian|locrian|blues/.test(scaleDef.id + scaleDef.name.toLowerCase()) && scaleDef.id !== "major" ? "minor" : "major"}]]` }; }
    }
    // keys: signature, chords in the key, relative
    if (/\bkey\b|signature|sharps|flats|relative|chords in/.test(low)) {
      const k = keyIn(t.replace(/^.*?(key of|chords in|signature (of|for)|relative (minor|major) of|in)\s+/i, "")) || keyIn(t);
      if (k) { const rel = T.relative(k), dia = T.diatonicChords(k);
        return { text: `**${T.keyName(k)}** has ${T.sigText(k.sig).toLowerCase()}${k.sig ? " (" + T.sigNotes(k.sig).map(n => T.name(n)).join(", ") + ")" : ""}. Its relative ${rel.mode} is **${T.keyName(rel)}**.\n\nChords in the key: ${dia.map(d => "`" + d.chord.symbol + "` (" + d.numeral + ")").join(", ")}. [[key:${T.keyName(k)}]]` }; }
    }
    // chord symbols
    const chords = chordTokens(t);
    if (chords.length === 1) { const ch = chords[0];
      return { text: `**${ch.symbol}** is ${ch.spoken}: **${ch.notes.map(n => T.name(n)).join(" – ")}** (${ch.iv.map(T.degreeText).join(", ")}).\n\n${T.explain(ch).slice(1).map(e => "- `" + e.t + "` " + e.d).join("\n")} [[chord:${ch.ascii}]]` }; }
    if (chords.length > 1) { const key = T.detectKey(chords), cad = T.findCadences(chords);
      return { text: `${chords.map(ch => "- **" + ch.symbol + "** = " + ch.notes.map(n => T.name(n)).join(" ") + "  (" + T.numeral(ch, key) + ")").join("\n")}\n\nThat looks like **${T.keyName(key)}**.${cad.length ? " I can see a " + cad.map(c => c.label).join(", and a ") + "." : ""} [[key:${T.keyName(key)}]]`, chart: "| " + chords.map(c => c.ascii).join(" | ") + " |" }; }
    for (let i = 0; i < GLOSS.length; i++) if (GLOSS[i][0].test(t)) return { text: GLOSS[i][1] };
    return null;
  }

  /* ---------- Claude ---------- */
  const SYSTEM = `You are Clef, the piano tutor inside Woodshed, a practice web app. You're talking with one student at their piano, usually on a phone propped on the music stand, so keep answers short and practical: a few sentences or a short list, never an essay unless asked. Be warm and direct, like a good teacher who plays gigs.

Teach toward the hands. When you explain a chord, give the actual note names and a concrete way to play it (which hand, which fingers, which inversion sits closest to the previous chord). When you explain theory, tie it to something they can try in the next thirty seconds. Match the student's level, given in the app context. Prefer plain words; introduce one term at a time.

Lead sheets are a main goal for this student: reading chord symbols above a melody and turning them into a left-hand part. Useful progressions of difficulty: roots only, then close-position left-hand chords using the nearest inversion, then broken-chord patterns, then shells (root + 7th) and rootless voicings for jazz.

When they share a photo or PDF of sheet music, you can read titles, key and time signatures, chord symbols, lyrics, dynamics and structure reliably. Exact note-by-note reading of dense notation from a photo is error-prone, so say which parts you are sure of and which are a best reading, and never invent bars you cannot see. If the image is blurry or cut off, say what would help (flatter page, more light, one system at a time).

You can link into the app. Write these tokens on their own at the end of a sentence and the app turns them into buttons:
[[chord:Cm7]] opens that chord in the chord explorer. [[key:E♭ major]] opens that key with its scale and chords. [[drill:read]] opens a drill (read, sig, spell, name, interval, quality). Use at most three per answer, and only when the student would really want to go there.

Format with short paragraphs, **bold** for key terms and simple "-" lists. Write chord symbols in backticks. No tables, no headings for short answers.`;

  const SCAN_SCHEMA = {
    type: "object", additionalProperties: false,
    required: ["kind", "title", "composer", "key", "time_signature", "tempo_bpm", "tempo_text", "summary", "chart", "chords_source", "sections", "hard_spots", "practice_plan", "theory_notes", "confidence", "caveats"],
    properties: {
      kind: { type: "string", enum: ["lead_sheet", "piano_score", "chord_chart", "other_music", "not_music"] },
      title: { type: "string" }, composer: { type: "string" },
      key: { type: "string", description: "Like 'Eb major' or 'C minor'. Empty if it cannot be determined." },
      time_signature: { type: "string", description: "Like '4/4'. Empty if not visible." },
      tempo_bpm: { type: "integer", description: "A sensible practice target in bpm if a tempo is marked or implied, else 0." },
      tempo_text: { type: "string" },
      summary: { type: "string", description: "Two or three sentences for the student: what this is, how hard it is for their level, what to notice first." },
      chart: { type: "string", description: "The chord progression in Woodshed chart syntax, or empty if there is no harmony to report." },
      chords_source: { type: "string", enum: ["printed", "inferred", "none"] },
      sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "bars", "note"], properties: { name: { type: "string" }, bars: { type: "string" }, note: { type: "string" } } } },
      hard_spots: { type: "array", items: { type: "object", additionalProperties: false, required: ["where", "why", "tip"], properties: { where: { type: "string" }, why: { type: "string" }, tip: { type: "string" } } } },
      practice_plan: { type: "array", items: { type: "string" } },
      theory_notes: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      caveats: { type: "string", description: "What could not be read or might be wrong. Empty if nothing." }
    }
  };
  const SCAN_PROMPT = `Here is a photo or PDF of sheet music I want to learn. Read it and fill in the structured breakdown.

chart: write the harmony in this exact syntax so the app can load it. Bars go between | characters, four bars per line. Two chords in one bar are separated by a space (| Dm7 G7 |). Use % for a bar that repeats the previous one and N.C. for no chord. Use plain ASCII for accidentals (Bb, F#, Cm7b5). Write each chord exactly as printed. If this is a full piano score with no printed chord symbols, work out the harmony bar by bar from the notes, keep it to simple triads and sevenths, and set chords_source to "inferred". Include only bars you can actually see; do not pad or guess the rest of the song. Write out repeats only if the page does.

practice_plan: four to six concrete steps for this specific piece and my level, in the order I should do them, each one sentence (for example which hand first, which bars to loop, what tempo to start at, which scale or chord shapes to warm up with).
hard_spots: up to four places that will trip me up, with where they are (bar numbers or lyrics), why, and one tip each.
theory_notes: two to four short observations that help me understand what I'm playing (the key and how you can tell, recurring progressions like ii-V-I, borrowed chords, the form).
If the image is not sheet music, set kind to "not_music" and explain in summary.`;

  const WRITER = `You are also Woodshed's sheet-music writer. When the student asks for a song, a part of a song, or something they heard (on TikTok, in a game, anywhere), write it out from memory as a lead sheet in the JSON schema you are given: a melody line with chord symbols, and optionally a simple written left hand.

Rules for the JSON:
- time_signature: "4/4", "3/4", "2/4", "6/8" or "12/8". Beats in every bar are QUARTER notes: a 4/4 bar holds 4, a 3/4 bar 3, a 6/8 bar 3 (each eighth is .5), a 2/4 bar 2.
- bars[].melody: the notes in order, separated by spaces. A note is a pitch and octave like C4, F#4, Bb3 (C4 is middle C) with :length in quarter-note beats when it is not exactly one beat: C4:2 is a half note, C4:.5 an eighth, C4:1.5 a dotted quarter, C4:.25 a sixteenth, C4:.333 a triplet eighth. r:1 is a rest. The lengths in a bar MUST add up to exactly that bar's beats. A pickup bar may be shorter: give its length in "beats" (0 means a full bar).
- bars[].chords: chord symbols in plain ASCII (Bb, F#m7, Cmaj7, G7, Am/C, N.C.), each followed by @beat when it does not start on beat 0: "C G7@2" is C on beat one and G7 on beat three. Empty string when the chord carries on.
- bars[].left_hand: optional, same note syntax, notes struck together joined with +: "C3+E3+G3:2". Keep it simple and playable in octaves 2 and 3: root or root-and-fifth on the beat, or a broken-chord pattern. Fill it in when the student asks for both hands, for a piano part, or for the left hand; otherwise leave it "".
- bars[].lyric: one to four words of the lyric sung in that bar, as a cue for finding the place, or "".
- key like "Eb major" or "C minor". tempo_bpm: the real tempo. part: which section this is, in the student's words ("chorus, from 0:32"). notes: two to five short lines on how to play it: hand position, the tricky bar, how to count the rhythm.
- Write the section the student asked for, and only that. If they don't name one, choose the most recognisable part (usually the hook or chorus) and say so in part. 8 to 32 bars.
- Keep the melody within about C4 to A5 for the right hand even if it is sung elsewhere, and say in notes when you moved it.
- Be exact where you can and honest where you can't: set confidence, and use caveats to say which bars are a best guess. Never pad with invented bars; if you only know the hook, write the hook. You cannot open links, so if they paste one, work from the song name, the artist, or the words they can hear.
- If you don't know the song at all, set kind to "unknown" and say in notes what would help (the artist, the lyrics of the part, a description of the melody).
- When the student sends a correction ("bar 3 should go up", "that's the verse, I wanted the chorus"), return the whole song again with the fix applied.`;
  const SONG_SCHEMA = {
    type: "object", additionalProperties: false,
    required: ["kind", "title", "artist", "key", "time_signature", "tempo_bpm", "part", "bars", "notes", "confidence", "caveats"],
    properties: {
      kind: { type: "string", enum: ["song", "unknown"] },
      title: { type: "string" }, artist: { type: "string" }, key: { type: "string" }, time_signature: { type: "string" },
      tempo_bpm: { type: "integer" }, part: { type: "string" },
      bars: { type: "array", items: { type: "object", additionalProperties: false, required: ["melody", "chords", "left_hand", "lyric", "beats"], properties: { melody: { type: "string" }, chords: { type: "string" }, left_hand: { type: "string" }, lyric: { type: "string" }, beats: { type: "number" } } } },
      notes: { type: "string" }, confidence: { type: "string", enum: ["high", "medium", "low"] }, caveats: { type: "string" }
    }
  };

  function context() {
    const s = App.state, bits = [];
    const lvl = LEVELS.filter(l => l[0] === (cfg.level || "beginner"))[0];
    bits.push("Student level: " + lvl[1] + ".");
    if (cfg.goals) bits.push("Their goals, in their words: " + cfg.goals);
    bits.push("Key of the day in the app: " + T.keyName(App.keyOfDay()) + ". They are on the " + (App.current || "today") + " screen.");
    const sheetTitle = W.Sheet && W.Sheet.titleOf(s.sheet.id);
    if (sheetTitle) bits.push("Lead sheet they have open: " + sheetTitle + " (left-hand style: " + s.sheet.voicing + ").");
    const weak = [];
    (W.DRILLS || []).forEach(d => { const a = App.accuracy(d.id); if (a != null) weak.push(d.name + " " + a + "%" + (App.weakItems(d.id, 3).length ? " (misses: " + App.weakItems(d.id, 3).map(w => w.k).join(", ") + ")" : "")); });
    if (weak.length) bits.push("Drill accuracy so far: " + weak.join("; ") + ".");
    bits.push("Practice streak: " + App.streak() + " days.");
    return bits.join("\n");
  }

  function sseBlock(block) {
    const data = block.split(/\r?\n/).filter(l => l.indexOf("data:") === 0).map(l => l.slice(5).replace(/^ /, "")).join("\n");
    if (!data) return null;
    try { return JSON.parse(data); } catch (e) { return null; }
  }
  // One streaming request. opts: {messages, scan, useFallbacks, signal, onText}
  async function callClaude(opts) {
    const m = model().id;
    const headers = { "content-type": "application/json", "x-api-key": cfg.k, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
    const heavy = opts.scan || opts.write;
    const body = { model: m, max_tokens: heavy ? 16000 : 8000, stream: true, system: [{ type: "text", text: SYSTEM + "\n\n" + WRITER, cache_control: { type: "ephemeral" } }], messages: opts.messages };
    // Haiku 4.5 takes neither adaptive thinking nor effort. Reading a page or recalling a tune deserves more thought than a chat reply.
    if (m !== "claude-haiku-4-5") { body.thinking = { type: "adaptive" }; body.output_config = { effort: heavy ? (cfg.careful ? "high" : "medium") : "low" }; }
    if (heavy && opts.structured) body.output_config = Object.assign(body.output_config || {}, { format: { type: "json_schema", schema: opts.write ? SONG_SCHEMA : SCAN_SCHEMA } });
    // Opus 5 can decline a request outright; this lets the API re-run it on its recommended fallback in the same call.
    if (opts.useFallbacks && m === "claude-opus-5") { headers["anthropic-beta"] = "server-side-fallback-2026-07-01"; body.fallbacks = "default"; }
    const res = await fetch(API, { method: "POST", headers: headers, body: JSON.stringify(body), signal: opts.signal });
    if (!res.ok) { let j = null; try { j = await res.json(); } catch (e) {} throw { status: res.status, message: (j && j.error && j.error.message) || "" }; }
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "", stop = null;
    for (;;) {
      const r = await reader.read(); if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      const parts = buf.split(/\r?\n\r?\n/); buf = parts.pop();
      for (let i = 0; i < parts.length; i++) {
        const ev = sseBlock(parts[i]); if (!ev) continue;
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") opts.onText(ev.delta.text);
        else if (ev.type === "content_block_start" && opts.onPhase) opts.onPhase(ev.content_block && ev.content_block.type);
        else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        else if (ev.type === "error") throw { status: ev.error && ev.error.type === "overloaded_error" ? 529 : 500, message: (ev.error && ev.error.message) || "" };
      }
    }
    return stop;
  }
  // Organisations without the fallback beta get a 400 that names it; ask once more without. Same for structured output.
  async function callWithRetries(opts, produced) {
    try { return await callClaude(Object.assign({ useFallbacks: true, structured: true }, opts)); }
    catch (e) {
      if (e && e.status === 400 && !produced()) {
        if (/anthropic-beta|fallbacks/i.test(e.message || "")) return await callClaude(Object.assign({ useFallbacks: false, structured: true }, opts));
        if ((opts.scan || opts.write) && /output_config|format|schema/i.test(e.message || "")) return await callClaude(Object.assign({ useFallbacks: false, structured: false }, opts));
      }
      throw e;
    }
  }
  function explain(err) {
    if (err && err.name === "AbortError") return null;
    const s = err && err.status;
    if (s === 401) return "Claude rejected that API key. Check it in the settings.";
    if (s === 402) return "Your Anthropic account has a billing problem, probably no credit.";
    if (s === 403) return "That key is not allowed to do this.";
    if (s === 404) return "That model is not available to your account. Pick another in the settings.";
    if (s === 413) return "That was too large to send. Try a smaller photo or a shorter PDF.";
    if (s === 429) return "Rate limited. Give it a minute.";
    if (s >= 500) return "Claude is overloaded right now. Try again in a moment.";
    if (s === 400) return "Claude could not take that request" + (err.message ? ": " + err.message : ".");
    return "No connection to Claude.";
  }

  /* ---------- attachments ---------- */
  let shot = null;   // {kind: "image"|"pdf", media, data (base64), thumb, name}
  const b64 = buf => { let s = ""; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  async function attach(file) {
    if (!file) return;
    if (file.type === "application/pdf") {
      if (file.size > 20 * 1024 * 1024) return App.toast("That PDF is over 20 MB. Try fewer pages.");
      shot = { kind: "pdf", media: "application/pdf", data: b64(await file.arrayBuffer()), name: file.name };
    } else {
      try {
        const url = URL.createObjectURL(file), img = new Image();
        await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
        // sheet music is fine detail: keep up to 2000px on the long edge
        const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const full = c.toDataURL("image/jpeg", 0.88);
        const t = document.createElement("canvas"), tk = 240 / Math.max(c.width, c.height); t.width = Math.round(c.width * tk); t.height = Math.round(c.height * tk);
        t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
        shot = { kind: "image", media: "image/jpeg", data: full.split(",")[1], thumb: t.toDataURL("image/jpeg", 0.7), name: file.name };
      } catch (e) { return App.toast("Couldn't open that image. Try a JPEG, PNG or a screenshot."); }
    }
    paintShot();
    $("#clefQ").placeholder = "Anything specific? Or just press send.";
    $("#clefQ").focus();
  }
  function paintShot() {
    const box = $("#clefShot"); box.hidden = !shot; if (!shot) { $("#clefQ").placeholder = "Ask Clef anything…"; return; }
    box.innerHTML = `${shot.thumb ? `<img src="${shot.thumb}" alt="">` : `<span class="clef-badge" style="border-radius:9px">PDF</span>`}<span>${esc(shot.kind === "pdf" ? shot.name : "Sheet music ready")}. Clef will read it and build a practice plan.</span><button type="button" class="icon-btn" id="shotX" aria-label="Remove"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
    $("#shotX").onclick = () => { shot = null; paintShot(); };
  }

  /* ---------- chat ---------- */
  let history = [], busy = false, ctl = null, lastContext = "", lastScan = null;
  const log = () => $("#clefLog");
  function setBusy(b, stoppable) { busy = b; $("#clefSend").classList.toggle("stop", !!(b && stoppable)); $("#clefSend").setAttribute("aria-label", b && stoppable ? "Stop" : "Send"); }
  function addMsg(who, html) {
    const el = document.createElement("div"), bub = document.createElement("div");
    el.className = "msg " + who; bub.className = "bub";
    bub.innerHTML = html == null ? '<span class="dots"><i></i><i></i><i></i></span>' : html;
    el.appendChild(bub); log().appendChild(el); log().scrollTop = log().scrollHeight;
    return {
      el: el, bub: bub,
      set(htmlNow) { bub.innerHTML = htmlNow; const lg = log(); if (lg.scrollHeight - lg.scrollTop - lg.clientHeight < 140) lg.scrollTop = lg.scrollHeight; },
      done(src, acts) {
        if (src) { const s = document.createElement("div"); s.className = "src"; s.textContent = src; el.appendChild(s); }
        if (acts && acts.length) { const row = document.createElement("div"); row.className = "acts"; row.innerHTML = acts.map(a => `<button class="act" data-link="${a.link}" data-val="${esc(a.val)}">${esc(a.label)}</button>`).join(""); el.appendChild(row); }
        log().scrollTop = log().scrollHeight;
      }
    };
  }
  function greet() {
    log().innerHTML = "";
    const h = addMsg("bot", fmt(aiOn()
      ? "I'm **Clef**. Ask me to **write out a song** (\"the piano part in the chorus of…\", \"that TikTok sound that goes…\") and I'll put it on the staff with chords, ready to learn. Send me a photo of the music on your stand and I'll break it down. Or ask me anything about chords, keys and lead sheets."
      : "I'm **Clef**. I can answer chord, key and scale questions right now, offline. To have me **write out sheet music for songs you like** and **read a photo of your sheet music**, add a Claude API key in the settings."));
    const st = document.createElement("div"); st.className = "starters";
    st.innerHTML = [["Write out a song for me", "write"], ["Scan my sheet music", "scan"], ["What notes are in F#m7b5?", "q"], ["What key has 3 flats?", "q"], ["How do I play from a lead sheet?", "q"], ["Explain ii–V–I", "q"]].map(s => `<button type="button" data-start="${s[1]}">${esc(s[0])}</button>`).join("");
    h.el.appendChild(st);
    if (!aiOn()) h.done(null, [{ link: "cfg", val: "", label: "Add an API key" }]);
  }

  function renderScan(d) {
    const meta = [d.key, d.time_signature, d.tempo_text || (d.tempo_bpm ? d.tempo_bpm + " bpm" : ""), { lead_sheet: "Lead sheet", piano_score: "Piano score", chord_chart: "Chord chart", other_music: "Music" }[d.kind] || ""].filter(Boolean).join(" · ");
    const list = (arr, fn) => arr && arr.length ? arr.map(fn).join("") : "";
    return `<div class="scan"><div class="scan-h"><b>${esc(d.title || "Untitled piece")}</b><span>${esc([d.composer, meta].filter(Boolean).join(" · "))}</span></div><div class="scan-b">
      <p>${inline(d.summary || "")}</p>
      ${d.chart ? `<h4>Chords ${d.chords_source === "inferred" ? "(worked out from the notes)" : "(as printed)"}</h4><div class="chart-mini">${esc(d.chart)}</div>` : ""}
      ${d.practice_plan && d.practice_plan.length ? `<h4>Practice plan</h4><ol>${list(d.practice_plan, s => "<li>" + inline(s) + "</li>")}</ol>` : ""}
      ${d.hard_spots && d.hard_spots.length ? `<h4>Watch out for</h4><ul>${list(d.hard_spots, h => "<li><b>" + esc(h.where) + ":</b> " + inline(h.why) + " " + inline(h.tip) + "</li>")}</ul>` : ""}
      ${d.sections && d.sections.length ? `<h4>Form</h4><ul>${list(d.sections, s => "<li><b>" + esc(s.name) + "</b>" + (s.bars ? " (" + esc(s.bars) + ")" : "") + (s.note ? ": " + inline(s.note) : "") + "</li>")}</ul>` : ""}
      ${d.theory_notes && d.theory_notes.length ? `<h4>What's going on</h4><ul>${list(d.theory_notes, s => "<li>" + inline(s) + "</li>")}</ul>` : ""}
      ${d.caveats || d.confidence !== "high" ? `<h4>How sure I am</h4><p>${esc({ high: "Confident.", medium: "Fairly confident.", low: "Not very confident: check this against the page." }[d.confidence] || "")} ${inline(d.caveats || "")}</p>` : ""}
    </div></div>`;
  }
  function parseScan(text) {
    try { return JSON.parse(text); } catch (e) {}
    const m = /\{[\s\S]*\}/.exec(text); if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
    return null;
  }

  /* ---------- writing out a song ---------- */
  let lastSong = null;   // {data, song, problems}
  const WRITE_RE = /\b(sheet ?music|transcri\w*|notat(e|ion)|lead ?sheet|write (it |this |that |me |the |a )?(out|down|up)|write (me |out |down )?(the |a |an )?(sheet|music|notes|melody|part|chords|piano|intro|chorus|verse|riff|hook|song|arrangement)|(piano|melody|intro|chorus|verse|riff|hook|bridge|solo|vocal) (part|line|section|melody|riff) (of|from|for|in|to)|how (do|can|to|would) (i |you )?play (the |that |this )?(song|part|intro|chorus|riff|melody)|tiktok|make (me )?(a |the )?(lead sheet|sheet|score|arrangement|chart))\b/i;
  const REVISE_RE = /\b(bar|bars|note|notes|wrong|fix|change|higher|lower|octave|faster|slower|instead|should (be|go)|redo|again|shorter|longer|simpler|easier|harder|left hand|both hands|lyrics?|key of|transpose|verse|chorus|intro|whole song|rest of|next part|continue)\b/i;
  function songSvg(song, width) {
    const bars = W.Sheet.parseSong(song), key = T.parseKey(song.key || "") || T.detectKey(bars.reduce((a, b) => a.concat(b.slots.filter(x => x.chord).map(x => x.chord)), [])) || T.parseKey("C");
    const box = document.createElement("div"); box.className = "paper";
    W.Staff.leadSheet(box, { sig: key.sig, time: song.time, bars: bars.map(b => ({ beats: b.beats, notes: b.notes, lh: b.lh, lyric: b.lyric, chords: b.slots.filter(x => x.chord || x.nc).map(x => ({ beat: x.beat, text: x.chord ? x.chord.symbol : "N.C.", i: -1 })) })) }, { width: width, space: width < 420 ? 7 : 8, perLine: width > 620 ? 4 : width > 440 ? 3 : 2 });
    return box.outerHTML;
  }
  function renderSong(d, song, problems) {
    const key = T.parseKey(song.key || ""), meta = [song.by, key ? T.keyName(key) : "", song.time[0] + "/" + song.time[1], song.tempo + " bpm", song.bars.length + " bars", song.lh ? "both hands" : "melody + chords"].filter(Boolean).join(" · ");
    const width = Math.max(300, Math.min(600, log().clientWidth - 44));
    return `<div class="scan"><div class="scan-h"><b>${esc(song.title)}</b><span>${esc(meta)}</span>${song.about ? `<span class="part">${esc(song.about)}</span>` : ""}</div>
      ${songSvg(song, width)}
      <div class="scan-b">
      ${song.notes ? `<h4>How to play it</h4><p>${esc(song.notes).replace(/\n+/g, "<br>")}</p>` : ""}
      <h4>How sure I am</h4><p>${esc({ high: "Confident this is the tune.", medium: "Fairly confident; check the bars I flag.", low: "A best guess from memory: play it against the recording and tell me what's off." }[d.confidence] || "")} ${inline(d.caveats || "")}</p>
      ${problems.length ? `<p class="note">Woodshed mended ${problems.length} bar${problems.length > 1 ? "s" : ""} that didn't add up: ${esc(problems.join(" "))}</p>` : ""}
      <p class="sub">Not quite right? Say which bar and what it should do ("bar 3 goes up to G", "I meant the verse") and I'll rewrite it.</p>
      </div></div>`;
  }
  // req: {free: text} for a request in the student's words, {revise: text} to correct the last song, or {song, artist, part, hands, bars} from the form
  async function writeSong(req) {
    if (!aiOn()) { const h = addMsg("bot", fmt("Writing out a song needs the Claude connection. Add your API key in the settings and ask again.")); h.done(null, [{ link: "cfg", val: "", label: "Open settings" }]); return; }
    if (navigator.onLine === false) { addMsg("bot", fmt("No connection, so I can't write it out right now.")).done("On-device"); return; }
    setBusy(true, true);
    let text;
    if (req.revise) text = "Correction to the song you just wrote: " + req.revise + "\n\nReturn the whole song again as JSON with this fixed.";
    else if (req.free) text = "Write this out for me as sheet music I can learn on the piano: " + req.free;
    else text = "Write out sheet music for me.\nSong: " + req.song + (req.artist ? "\nArtist: " + req.artist : "") + "\nWhich part: " + (req.part || "the most recognisable part") + "\nHands: " + (req.hands === "both" ? "melody with a simple written left hand (both hands)" : "melody line with chord symbols only") + "\nLength: about " + (req.bars || 16) + " bars.";
    const ctxNow = context(), withCtx = ctxNow !== lastContext; lastContext = ctxNow;
    history.push({ role: "user", content: [{ type: "text", text: text + (withCtx ? "\n\n<app_context>\n" + ctxNow + "\n</app_context>" : "") }] });
    const h = addMsg("bot", null); let out = "", stop = null, err = null, phase = "";
    ctl = new AbortController();
    const started = Date.now();
    const ticker = setInterval(() => { h.set(`<span class="dots"><i></i><i></i><i></i></span> <span class="src" style="margin-left:6px">${phase === "thinking" ? "Remembering the tune" : out ? "Writing the bars" : "Working it out"} · ${Math.round((Date.now() - started) / 1000)}s</span>`); }, 1000);
    let dog; const feed = () => { clearTimeout(dog); dog = setTimeout(() => ctl.abort(), 240000); };
    feed();
    try { stop = await callWithRetries({ messages: history, write: true, signal: ctl.signal, onPhase: p => { phase = p; feed(); }, onText: tx => { feed(); out += tx; } }, () => !!out); }
    catch (e) { err = e; }
    clearTimeout(dog); clearInterval(ticker);
    const aborted = err && err.name === "AbortError";
    if (stop === "refusal" || ((err || aborted) && !out)) {
      history.pop();
      h.set(`<span class="note">${esc(stop === "refusal" ? "Claude declined to write that one out. A shorter section, or describing the part in your own words, usually works." : aborted ? "Stopped." : explain(err))}</span>`);
      h.done(null, err && (err.status === 401 || err.status === 404) ? [{ link: "cfg", val: "", label: "Open settings" }] : []);
      setBusy(false); return;
    }
    const data = parseScan(out);
    if (!data || !data.bars) { h.set(fmt(out || "(no answer)")); h.done("Claude · " + model().name); history.push({ role: "assistant", content: out || "(no answer)" }); setBusy(false); return; }
    if (data.kind === "unknown") { h.set(fmt("I don't know that one well enough to write it down. " + (data.notes || ""))); h.done("Claude · " + model().name); history.push({ role: "assistant", content: out }); setBusy(false); return; }
    const r = W.Songs.normalize(data);
    if (!r.song) { h.set(fmt("I wrote something, but none of the bars made sense to the app: " + r.problems.join(" ") + " Ask again with a bit more detail.")); h.done("Claude · " + model().name); history.push({ role: "assistant", content: out }); setBusy(false); return; }
    if (lastSong && lastSong.id && req.revise) r.song.id = lastSong.id;     // a correction replaces the saved copy
    lastSong = { data: data, song: r.song, problems: r.problems, id: lastSong && req.revise ? lastSong.id : null };
    h.set(renderSong(data, r.song, r.problems));
    h.done("Claude · " + model().name, [{ link: "opensong", val: "", label: "Open in Lead sheets" }, { link: "learnsong", val: "", label: "Learn it on the Piano" }, { link: "savesong", val: "", label: "Save to My songs" }]);
    history.push({ role: "assistant", content: out });
    setBusy(false);
  }
  function toggleWriter(show) {
    const box = $("#clefWriter"); box.hidden = show === undefined ? !box.hidden : !show;
    if (box.hidden) return;
    toggleCfg(false);
    box.innerHTML = `
      <span class="eyebrow">Write out a song</span>
      <label class="field">Song<input type="text" id="wrSong" placeholder="Title, or describe it" autocomplete="off"></label>
      <label class="field">Artist<input type="text" id="wrArtist" placeholder="Who sings it (optional)" autocomplete="off"></label>
      <label class="field">Which part<input type="text" id="wrPart" placeholder="the piano intro · the chorus · the bit at 0:32 in the TikTok · where she sings …" autocomplete="off"></label>
      <div class="row"><div class="seg" id="wrHands"><button data-v="melody" class="on">Melody + chords</button><button data-v="both">Both hands written</button></div><div class="seg" id="wrLen"><button data-v="8">8 bars</button><button data-v="16" class="on">16</button><button data-v="32">32</button></div></div>
      <p>Clef writes it from memory: the shape of the tune and the chords are usually right, single notes sometimes need a fix. Tell it what's off and it rewrites the bar.${aiOn() ? "" : " Needs a Claude API key (settings)."}</p>
      <div class="row"><button type="button" class="btn small" id="wrGo">Write it</button><button type="button" class="btn ghost small" id="wrX">Cancel</button></div>`;
    box.querySelectorAll(".seg").forEach(seg => seg.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); }));
    $("#wrX").onclick = () => toggleWriter(false);
    $("#wrGo").onclick = () => {
      const song = $("#wrSong").value.trim(); if (!song) { $("#wrSong").focus(); return; }
      const req = { song: song, artist: $("#wrArtist").value.trim(), part: $("#wrPart").value.trim(), hands: $("#wrHands .on").getAttribute("data-v"), bars: +$("#wrLen .on").getAttribute("data-v") };
      toggleWriter(false);
      addMsg("me", esc("Write out " + song + (req.artist ? " by " + req.artist : "") + (req.part ? ": " + req.part : "") + " (" + (req.hands === "both" ? "both hands" : "melody + chords") + ", about " + req.bars + " bars)"));
      writeSong(req);
    };
    $("#wrSong").focus();
  }

  async function sendClaude(question, attachment, local) {
    setBusy(true, true);
    const ctxNow = context(), withCtx = ctxNow !== lastContext; lastContext = ctxNow;
    const content = [];
    if (attachment) content.push(attachment.kind === "pdf" ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.data } } : { type: "image", source: { type: "base64", media_type: attachment.media, data: attachment.data } });
    const textPart = (attachment ? SCAN_PROMPT + (question ? "\n\nAlso, from me: " + question : "") : question) + (withCtx ? "\n\n<app_context>\n" + ctxNow + "\n</app_context>" : "");
    content.push({ type: "text", text: textPart });
    // cache everything up to and including the newest attachment, so follow-up questions don't pay for the image again
    if (attachment) content[content.length - 1].cache_control = { type: "ephemeral" };
    history.push({ role: "user", content: content });

    const h = addMsg("bot", null); let text = "", stop = null, err = null, phase = "";
    ctl = new AbortController();
    const started = Date.now(); let ticker = 0;
    if (attachment) ticker = setInterval(() => { if (!text) h.set(`<span class="dots"><i></i><i></i><i></i></span> <span class="src" style="margin-left:6px">${phase === "thinking" ? "Studying the page" : "Reading the page"} · ${Math.round((Date.now() - started) / 1000)}s</span>`); else h.set(`<span class="dots"><i></i><i></i><i></i></span> <span class="src" style="margin-left:6px">Writing it up · ${Math.round((Date.now() - started) / 1000)}s</span>`); }, 1000);
    let dog; const feed = () => { clearTimeout(dog); dog = setTimeout(() => ctl.abort(), attachment ? 240000 : 90000); };
    feed();
    try {
      stop = await callWithRetries({ messages: history, scan: !!attachment, signal: ctl.signal, onPhase: p => { phase = p; feed(); }, onText: tx => { feed(); text += tx; if (!attachment) h.set(fmt(text)); } }, () => !!text);
    } catch (e) { err = e; }
    clearTimeout(dog); clearInterval(ticker);
    const aborted = err && err.name === "AbortError";

    if (stop === "refusal" || ((err || aborted) && !text)) {
      history.pop();
      const why = stop === "refusal" ? "Claude declined that one." : aborted ? "Stopped." : explain(err);
      if (local) { h.set(`<span class="note">${esc(why)} Answered on-device.</span>` + fmt(local.text)); h.done("On-device"); }
      else { h.set(`<span class="note">${esc(why)}</span>` + (attachment ? fmt("I couldn't read the page this time. Your photo is still attached, so you can just press send again.") : "")); h.done(null, err && (err.status === 401 || err.status === 404) ? [{ link: "cfg", val: "", label: "Open settings" }] : []); if (attachment) { shot = attachment; paintShot(); } }
      setBusy(false); return;
    }
    if (attachment) {
      const data = parseScan(text);
      if (data && data.kind !== "not_music") {
        lastScan = data; h.set(renderScan(data));
        const acts = [];
        if (data.chart && data.chart.indexOf("|") >= 0) acts.push({ link: "loadchart", val: "", label: "Open in Lead sheets" });
        if (data.key && T.parseKey(data.key.replace(/ major| minor/i, x => / minor/i.test(x) ? "m" : ""))) acts.push({ link: "key", val: data.key, label: "Warm up in " + data.key });
        h.done("Claude · " + model().name, acts);
      } else if (data) { h.set(fmt(data.summary || "That doesn't look like sheet music to me.")); h.done("Claude · " + model().name); }
      else { h.set(fmt(text || "(no answer)")); h.done("Claude · " + model().name); }
    } else {
      if (stop === "max_tokens") text += "\n\n(cut off at the length limit)";
      h.set(fmt(text || "(no answer)")); h.done("Claude · " + model().name + (aborted || err ? " · stopped" : ""));
    }
    history.push({ role: "assistant", content: text || "(no answer)" });
    setBusy(false);
  }

  function send(q) {
    q = String(q || "").trim();
    if (busy) { if (ctl) ctl.abort(); return; }
    if (!q && !shot) return;
    toggleCfg(false); toggleWriter(false);
    const attachment = shot; shot = null; paintShot();
    addMsg("me", (attachment ? (attachment.thumb ? `<img src="${attachment.thumb}" alt="Sheet music photo">` : `<b>${esc(attachment.name)}</b><br>`) : "") + esc(q || "Read this and help me learn it."));
    const local = attachment ? null : brain(q);
    if (!attachment && aiOn() && (WRITE_RE.test(q) || (lastSong && REVISE_RE.test(q) && !local))) return lastSong && !WRITE_RE.test(q) ? writeSong({ revise: q }) : writeSong({ free: q });
    if (!attachment && !aiOn() && WRITE_RE.test(q)) { const h = addMsg("bot", fmt("Writing out a song from memory needs the Claude connection. Add your API key in the settings and ask again, and I'll put it on the staff with chords.")); h.done(null, [{ link: "cfg", val: "", label: "Add an API key" }]); return; }
    if (attachment && !aiOn()) { const h = addMsg("bot", fmt("Reading a photo needs the Claude connection. Add your API key in the settings and send it again: I've kept the photo.")); h.done(null, [{ link: "cfg", val: "", label: "Open settings" }]); shot = attachment; paintShot(); return; }
    if (aiOn() && navigator.onLine !== false) return sendClaude(q, attachment, local);
    const h = addMsg("bot", null);
    setTimeout(() => {
      if (local) { h.set((aiOn() ? '<span class="note">No connection. Answered on-device.</span>' : "") + fmt(local.text)); h.done("On-device", local.chart ? [{ link: "chart", val: local.chart, label: "Open as a lead sheet" }] : []); }
      else { h.set(fmt("That one is beyond my offline brain. I can do chords (`Bbmaj7`, `F#m7b5/A`), keys and signatures, scales with fingering, and lead-sheet terms. With a Claude API key I can take open questions and read your sheet music.")); h.done("On-device", aiOn() ? [] : [{ link: "cfg", val: "", label: "Add an API key" }]); }
    }, 260);
  }

  /* ---------- settings ---------- */
  function toggleCfg(show) {
    const box = $("#clefCfg"); box.hidden = show === undefined ? !box.hidden : !show;
    if (box.hidden) return;
    let other = ""; try { other = (JSON.parse(localStorage.getItem("hp.spot")) || {}).k || ""; } catch (e) {}
    box.innerHTML = `
      <label class="field">Claude API key<input type="password" id="cfgKey" value="${esc(cfg.k || "")}" placeholder="sk-ant-…" autocomplete="off" spellcheck="false"></label>
      <p>Kept in this browser only and sent nowhere except api.anthropic.com. Usage is billed to your Anthropic account, so make a dedicated key with a low spend limit at <a href="https://platform.claude.com" target="_blank" rel="noopener">platform.claude.com</a>. Anyone holding this unlocked device could read it. A page scan typically costs a few cents.</p>
      ${other && other !== cfg.k ? `<button type="button" class="btn ghost small" id="cfgBorrow">Use the key saved in Home Program</button>` : ""}
      <label class="field">Model<select id="cfgModel">${MODELS.map(m => `<option value="${m.id}" ${m.id === model().id ? "selected" : ""}>${esc(m.name)} · ${esc(m.note)}</option>`).join("")}</select></label>
      <label class="switch"><input type="checkbox" id="cfgCareful" ${cfg.careful ? "checked" : ""}> Read pages extra carefully (slower)</label>
      <label class="field">Your level<select id="cfgLevel">${LEVELS.map(l => `<option value="${l[0]}" ${l[0] === (cfg.level || "beginner") ? "selected" : ""}>${esc(l[1])}</option>`).join("")}</select></label>
      <label class="field">What you're working toward<input type="text" id="cfgGoals" value="${esc(cfg.goals || "")}" placeholder="e.g. play pop songs from lead sheets and sing along"></label>
      <div class="row"><button type="button" class="btn small" id="cfgSave">Save</button>${cfg.k ? `<button type="button" class="btn ghost small" id="cfgForget">Forget the key</button>` : ""}</div>`;
    $("#cfgSave").onclick = () => { cfg.k = $("#cfgKey").value.trim(); cfg.m = $("#cfgModel").value; cfg.level = $("#cfgLevel").value; cfg.goals = $("#cfgGoals").value.trim(); cfg.careful = $("#cfgCareful").checked; saveCfg(); toggleCfg(false); paintMode(); App.toast(cfg.k ? "Clef is connected to Claude" : "Saved"); if (!history.length) greet(); };
    if ($("#cfgBorrow")) $("#cfgBorrow").onclick = () => { $("#cfgKey").value = other; };
    if ($("#cfgForget")) $("#cfgForget").onclick = () => { delete cfg.k; saveCfg(); toggleCfg(false); paintMode(); App.toast("Key removed from this browser"); if (!history.length) greet(); };
  }
  function paintMode() { $("#clefMode").textContent = aiOn() ? "Connected · " + model().name : "On-device · add a key to read sheet music"; }

  function follow(link, val) {
    if (link === "cfg") return toggleCfg(true);
    if (link === "write") return toggleWriter(true);
    if ((link === "opensong" || link === "learnsong" || link === "savesong") && lastSong) {
      const rec = W.Songs.save(lastSong.song); lastSong.id = rec.id; lastSong.song.id = rec.id;
      if (link === "savesong") return App.toast("Saved to My songs (Lead sheets and Learn a melody)");
      if (link === "opensong") { App.state.sheet.id = rec.id; App.go("sheet"); return close(true); }
      App.go("piano", { learn: rec.id }); return close(true);
    }
    if (link === "loadchart" && lastScan) { const ts = /^(\d+)\/(\d+)$/.exec(lastScan.time_signature || ""); W.Sheet.open({ title: lastScan.title || "Scanned chart", text: lastScan.chart, time: ts ? [+ts[1] === 6 ? 6 : Math.min(+ts[1], 6), +ts[2]] : [4, 4], tempo: lastScan.tempo_bpm || 92 }); return close(true); }
    if (link === "chart") { W.Sheet.open({ title: "From Clef", text: val }); return close(true); }
    if (link === "chord") { App.go("chords", { ch: val.replace(/♯/g, "#").replace(/♭/g, "b") }); return close(true); }
    if (link === "key") { const k = T.parseKey(val.replace(/♯/g, "#").replace(/♭/g, "b")); if (k) App.go("keys", { key: T.name(k.tonic, true) + (k.mode === "minor" ? "m" : "") }); return close(true); }
    if (link === "drill") { App.go("train", { d: val }); return close(true); }
    if (link === "sheet") { App.state.sheet.id = val; App.go("sheet"); return close(true); }
  }
  // On a phone the tutor covers the screen, so following a link closes it. On a wide screen it can stay open beside the app.
  function close(onlyIfNarrow) { if (onlyIfNarrow && window.innerWidth >= 760) return; $("#clef").hidden = true; $("#clefFab").hidden = false; }

  const Tutor = W.Tutor = {
    start() {
      const g = W.GLYPHS.gClef, tr = 'transform="translate(14.6 23.6) scale(0.016)"';
      $("#clefFabGlyph").innerHTML = `<path ${tr} d="${g.d}"/>`; $("#clefHeadGlyph").innerHTML = `<path ${tr} d="${g.d}"/>`;
      $("#clefFab").addEventListener("click", () => Tutor.open());
      $("#clefClose").addEventListener("click", () => close());
      $("#clefCfgBtn").addEventListener("click", () => toggleCfg());
      $("#clefNew").addEventListener("click", () => { if (busy && ctl) ctl.abort(); history = []; lastContext = ""; lastScan = null; lastSong = null; shot = null; paintShot(); toggleWriter(false); greet(); });
      $("#clefCam").addEventListener("click", () => $("#clefFile").click());
      $("#clefWrite").addEventListener("click", () => toggleWriter());
      $("#clefFile").setAttribute("accept", "image/*,application/pdf");
      $("#clefFile").addEventListener("change", e => { attach(e.target.files[0]); e.target.value = ""; });
      $("#clefForm").addEventListener("submit", e => { e.preventDefault(); const q = $("#clefQ"); const v = q.value; q.value = ""; q.style.height = ""; send(v); });
      $("#clefQ").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && window.innerWidth >= 760) { e.preventDefault(); $("#clefForm").requestSubmit(); } });
      $("#clefQ").addEventListener("input", e => { e.target.style.height = ""; e.target.style.height = Math.min(130, e.target.scrollHeight) + "px"; });
      $("#clefLog").addEventListener("click", e => {
        const a = e.target.closest("[data-link]"); if (a) return follow(a.getAttribute("data-link"), a.getAttribute("data-val"));
        const s = e.target.closest("[data-start]"); if (s) { const k = s.getAttribute("data-start"); if (k === "scan") $("#clefFile").click(); else if (k === "write") toggleWriter(true); else send(s.textContent); }
      });
      // Paste or drop a screenshot straight in.
      $("#clef").addEventListener("paste", e => { const f = Array.from((e.clipboardData || {}).files || []).filter(x => /^image\/|pdf$/.test(x.type))[0]; if (f) { e.preventDefault(); attach(f); } });
      $("#clef").addEventListener("dragover", e => e.preventDefault());
      $("#clef").addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) attach(f); });
      // Keep the input above the iOS keyboard.
      if (window.visualViewport) { const fit = () => { const c = $("#clef"); if (c.hidden || window.innerWidth >= 760) { c.style.height = c.style.top = ""; return; } c.style.height = visualViewport.height + "px"; c.style.top = visualViewport.offsetTop + "px"; c.style.bottom = "auto"; }; visualViewport.addEventListener("resize", fit); visualViewport.addEventListener("scroll", fit); }
      document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#clef").hidden) close(); });
      paintMode();
    },
    open(what) {
      $("#clef").hidden = false; if (window.innerWidth < 760) $("#clefFab").hidden = true;
      if (!log().children.length) greet();
      if (what === "scan") { if (aiOn()) $("#clefFile").click(); else { toggleCfg(true); App.toast("Add a Claude API key to scan sheet music"); } }
      if (what === "write") { if (aiOn()) toggleWriter(true); else { toggleCfg(true); App.toast("Add a Claude API key and Clef can write out songs for you"); } }
    },
    brain: brain,
    write: writeSong,
    _normalizeTest: data => W.Songs.normalize(data)
  };
})();
