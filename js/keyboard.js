/* On-screen piano. One component serves both jobs: showing notes (chords, scales, voicings) and taking
   input (touch, mouse, the computer keyboard and a MIDI keyboard). */
(function (root) {
  "use strict";
  var W = root.W = root.W || {};
  var T = W.T;
  var BLACK = { 1: -0.07, 3: 0.07, 6: -0.09, 8: 0, 10: 0.09 };   // pitch class -> nudge, in white-key widths
  function isBlack(m) { return BLACK.hasOwnProperty(T.mod(m, 12)); }

  /* opts:
       from, to     midi range (snapped outward to white keys)
       fit          true: always show the whole range. false: show as many octaves as fit, with shift buttons.
       minKey       narrowest comfortable white key in px when fit is false (default 30)
       labels       "c" (default) | "all" | "none"
       toggle       taps select and deselect keys instead of being momentary
       sound        false to stay silent
       onDown(midi, velocity, source), onUp(midi), onToggle([midi...]) */
  function Keyboard(el, opts) {
    this.el = el; this.o = opts || {};
    this.from = this.o.from == null ? 48 : this.o.from;
    this.to = this.o.to == null ? 84 : this.o.to;
    while (isBlack(this.from)) this.from--;
    while (isBlack(this.to)) this.to++;
    this.winStart = this.from;
    this.marks = []; this.selected = []; this.down = {}; this.pointers = {};
    this.keys = {};
    el.classList.add("kb");
    this.build();
    var self = this;
    if (root.ResizeObserver) { this.ro = new ResizeObserver(function () { self.layout(); }); this.ro.observe(el); }
    this.bind();
  }

  Keyboard.prototype.build = function () {
    this.el.innerHTML = '<div class="kb-bar"><button type="button" class="kb-shift" data-d="-1" aria-label="Lower octave">‹</button><span class="kb-range"></span><button type="button" class="kb-shift" data-d="1" aria-label="Higher octave">›</button></div><div class="kb-keys"></div>';
    this.bar = this.el.querySelector(".kb-bar"); this.body = this.el.querySelector(".kb-keys");
    this.layout(true);
  };

  Keyboard.prototype.window = function () {
    if (this.o.fit) return [this.from, this.to];
    var w = this.el.clientWidth || 360, minKey = this.o.minKey || 30;
    var octs = Math.max(1, Math.min(Math.floor(w / (7 * minKey)), Math.floor((this.to - this.from + 1) / 12)));
    var span = octs * 12;                                   // C..B blocks, plus a closing C when there is room
    var start = Math.max(this.from, Math.min(this.winStart, this.to - span));
    start -= T.mod(start, 12);                              // windows start on C
    if (start < this.from) start = this.from;
    var end = Math.min(this.to, start + span);
    while (isBlack(end)) end--;
    return [start, end];
  };

  Keyboard.prototype.layout = function (force) {
    var win = this.window(), sig = win.join(":");
    if (!force && sig === this.sig) return;
    this.sig = sig; this.lo = win[0]; this.hi = win[1];
    var whites = 0, m, html = "";
    for (m = this.lo; m <= this.hi; m++) if (!isBlack(m)) whites++;
    var wi = 0;
    for (m = this.lo; m <= this.hi; m++) {
      if (isBlack(m)) {
        var left = (wi + BLACK[T.mod(m, 12)]) / whites * 100, bw = 0.6 / whites * 100;
        html += '<div class="bk" data-m="' + m + '" style="left:' + (left - bw / 2).toFixed(3) + '%;width:' + bw.toFixed(3) + '%"><i></i></div>';
      } else {
        html += '<div class="wk" data-m="' + m + '" style="left:' + (wi / whites * 100).toFixed(3) + '%;width:' + (100 / whites).toFixed(3) + '%"><i></i></div>';
        wi++;
      }
    }
    this.body.innerHTML = html;
    this.body.style.setProperty("--whites", whites);
    this.keys = {};
    var nodes = this.body.children;
    for (var i = 0; i < nodes.length; i++) this.keys[nodes[i].getAttribute("data-m")] = nodes[i];
    var canShift = !this.o.fit && (this.lo > this.from || this.hi < this.to);
    this.bar.style.display = canShift ? "" : "none";
    if (canShift) {
      this.bar.querySelector(".kb-range").textContent = T.midiName(this.lo) + " – " + T.midiName(this.hi);
      this.bar.children[0].disabled = this.lo <= this.from;
      this.bar.children[2].disabled = this.hi >= this.to;
    }
    this.paint();
  };

  Keyboard.prototype.shift = function (dir) { this.winStart = this.lo + dir * 12; this.layout(true); };
  // Slide the window so these notes are visible (as far as the width allows).
  Keyboard.prototype.reveal = function (midis) {
    if (this.o.fit || !midis.length) return;
    var lo = Math.min.apply(null, midis), hi = Math.max.apply(null, midis);
    if (lo >= this.lo && hi <= this.hi) return;
    this.winStart = lo - T.mod(lo, 12);
    this.layout(true);
  };

  // marks: [{midi, cls: "rh"|"lh"|"root"|"good"|"bad"|"hint"|"scale", label}]
  Keyboard.prototype.mark = function (marks, reveal) {
    this.marks = marks || [];
    if (reveal !== false) this.reveal(this.marks.map(function (k) { return k.midi; }));
    this.paint();
  };
  Keyboard.prototype.clear = function () { this.marks = []; this.selected = []; this.paint(); };
  Keyboard.prototype.setSelected = function (list) { this.selected = list.slice(); this.paint(); };

  Keyboard.prototype.paint = function () {
    var labels = this.o.labels || "c", self = this, m;
    for (m in this.keys) {
      var k = this.keys[m], base = k.className.split(" ")[0];
      k.className = base + (this.down[m] ? " down" : "") + (this.selected.indexOf(+m) >= 0 ? " sel" : "");
      var txt = "";
      if (labels === "all" && base === "wk") txt = T.midiName(+m).replace(/-?\d+$/, "");
      else if (labels !== "none" && T.mod(+m, 12) === 0) txt = T.midiName(+m);
      k.firstChild.textContent = txt;
      k.firstChild.className = txt ? "kl" : "";
    }
    this.marks.forEach(function (mk) {
      var k = self.keys[mk.midi]; if (!k) return;
      k.className += " on " + (mk.cls || "rh");
      if (mk.label != null) { k.firstChild.textContent = mk.label; k.firstChild.className = "kl mk"; }
    });
  };

  Keyboard.prototype.press = function (midi, vel, source) {
    if (this.down[midi]) return;
    this.down[midi] = true;
    var k = this.keys[midi]; if (k) k.classList.add("down");
    if (this.o.sound !== false && !(source === "midi" && !W.Midi.sound)) W.Audio.noteOn(midi, vel == null ? 0.7 : vel);
    if (this.o.toggle && source !== "midi") {
      var i = this.selected.indexOf(midi);
      if (i >= 0) this.selected.splice(i, 1); else this.selected.push(midi);
      this.paint();
      if (this.o.onToggle) this.o.onToggle(this.selected.slice());
    }
    if (this.o.onDown) this.o.onDown(midi, vel, source || "touch");
  };
  Keyboard.prototype.lift = function (midi, source) {
    if (!this.down[midi]) return;
    delete this.down[midi];
    var k = this.keys[midi]; if (k) k.classList.remove("down");
    if (this.o.sound !== false) W.Audio.noteOff(midi);
    if (this.o.onUp) this.o.onUp(midi, source || "touch");
  };
  Keyboard.prototype.held = function () { return Object.keys(this.down).map(Number).sort(function (a, b) { return a - b; }); };

  Keyboard.prototype.bind = function () {
    var self = this, body = this.body;
    function keyAt(e) {
      var t = document.elementFromPoint(e.clientX, e.clientY);
      while (t && t !== body && !t.hasAttribute("data-m")) t = t.parentNode;
      return t && t !== body && body.contains(t) ? +t.getAttribute("data-m") : null;
    }
    body.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      e.preventDefault();
      W.activeKeyboard = self;
      var m = keyAt(e); if (m == null) return;
      try { body.setPointerCapture(e.pointerId); } catch (x) {}
      self.pointers[e.pointerId] = m;
      // press harder near the front of the key, like a real one
      var r = self.keys[m].getBoundingClientRect(), vel = 0.45 + 0.45 * Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      self.press(m, vel);
    });
    body.addEventListener("pointermove", function (e) {
      if (!(e.pointerId in self.pointers) || self.o.toggle) return;
      var m = keyAt(e), cur = self.pointers[e.pointerId];
      if (m === cur || m == null) return;
      self.lift(cur); self.pointers[e.pointerId] = m; self.press(m, 0.6);
    });
    function end(e) {
      if (!(e.pointerId in self.pointers)) return;
      self.lift(self.pointers[e.pointerId]); delete self.pointers[e.pointerId];
    }
    body.addEventListener("pointerup", end);
    body.addEventListener("pointercancel", end);
    body.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    this.bar.addEventListener("click", function (e) {
      var b = e.target.closest(".kb-shift"); if (b && !b.disabled) self.shift(+b.getAttribute("data-d"));
    });
  };
  Keyboard.prototype.destroy = function () { if (this.ro) this.ro.disconnect(); if (W.activeKeyboard === this) W.activeKeyboard = null; };
  W.Keyboard = Keyboard;

  /* ---------- computer keyboard: A W S E D F T G Y H U J K O L P ; ---------- */
  var ROW = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ";": 16 };
  var typed = {};
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    var kb = W.activeKeyboard; if (!kb || !document.body.contains(kb.el) || !kb.el.offsetParent) return;
    var key = e.key.toLowerCase();
    if (key === "z" || key === "x") { if (!kb.o.fit) kb.shift(key === "z" ? -1 : 1); return; }
    if (!(key in ROW)) return;
    var base = kb.lo + (T.mod(kb.lo, 12) ? 12 - T.mod(kb.lo, 12) : 0);
    if (kb.hi - base >= 24 && kb.o.fit) base += 12;
    var m = base + ROW[key];
    if (m > kb.hi) return;
    typed[key] = m; kb.press(m, 0.7, "keys");
  });
  document.addEventListener("keyup", function (e) {
    var key = e.key.toLowerCase();
    if (typed[key] != null && W.activeKeyboard) { W.activeKeyboard.lift(typed[key], "keys"); delete typed[key]; }
  });

  /* ---------- Web MIDI (Chrome and Edge; Safari has none) ---------- */
  var Midi = W.Midi = { supported: !!navigator.requestMIDIAccess, access: null, inputs: [], sound: false, held: {}, listeners: [] };
  Midi.onChange = function (fn) { Midi.listeners.push(fn); };
  function changed() { Midi.listeners.forEach(function (fn) { fn(); }); }
  Midi.connect = function () {
    if (!Midi.supported) return Promise.reject(new Error("This browser has no Web MIDI. Use Chrome or Edge on a computer."));
    return navigator.requestMIDIAccess().then(function (access) {
      Midi.access = access;
      var hook = function () {
        Midi.inputs = [];
        access.inputs.forEach(function (input) { Midi.inputs.push(input.name || "MIDI input"); input.onmidimessage = onMessage; });
        changed();
      };
      access.onstatechange = hook; hook();
      return Midi.inputs;
    });
  };
  function onMessage(ev) {
    var d = ev.data, cmd = d[0] & 0xf0, note = d[1], vel = d[2];
    var kb = W.activeKeyboard && document.body.contains(W.activeKeyboard.el) ? W.activeKeyboard : null;
    if (cmd === 0x90 && vel > 0) {
      Midi.held[note] = true;
      if (kb) { kb.reveal([note]); kb.press(note, vel / 127, "midi"); }
      else if (Midi.sound) W.Audio.noteOn(note, vel / 127);
      if (Midi.onNote) Midi.onNote(note, true);
    } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
      delete Midi.held[note];
      if (kb) kb.lift(note, "midi"); else W.Audio.noteOff(note);
      if (Midi.onNote) Midi.onNote(note, false);
    }
  }
  Midi.heldNotes = function () { return Object.keys(Midi.held).map(Number).sort(function (a, b) { return a - b; }); };
})(self);
