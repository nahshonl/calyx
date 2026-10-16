// Calyx site script, shared by index.html and features.html.
// Swap these two lines when the checkout and the contact address are ready.
const BUY_URL = "#price";
const CONTACT = "hello@example.com";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------ reveals
// Anything marked data-reveal fades up the first time it scrolls into view. The children of a
// data-reveal-group do the same, one after another.
document.querySelectorAll("[data-reveal-group]").forEach((g) => {
  [...g.children].forEach((c, i) => {
    if (!c.hasAttribute("data-reveal")) c.setAttribute("data-reveal", "");
    c.style.setProperty("--i", i);
  });
});
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add("in");
    revealer.unobserve(e.target);
  }
}, { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll("[data-reveal]").forEach((el) => revealer.observe(el));

document.querySelectorAll("[data-buy]").forEach((a) => { a.href = BUY_URL; });
document.querySelectorAll("[data-contact]").forEach((a) => {
  a.href = "mailto:" + CONTACT;
  if (a.textContent.includes("@")) a.textContent = CONTACT;
});

// ------------------------------------------------------------ scroll-driven effects
// Split the statement into words so they can light up one at a time.
document.querySelectorAll("[data-words]").forEach((el) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  for (const t of texts) {
    const frag = document.createDocumentFragment();
    for (const part of t.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(part); continue; }
      const w = document.createElement("span");
      w.className = "w";
      w.textContent = part;
      frag.append(w);
    }
    t.replaceWith(frag);
  }
});

// The way into Calypso, the incognito mode (index.html). As the section scrolls past, its sentence
// is redacted word by word and the page darkens; the bars slide together into one strip, which
// asks "what does calypso mean?" and is turned down to almost nothing. Return sends it and the
// strip goes, the corner says the answer is copied, ⌘V, and the answer is pasted in as a
// dictionary page, one line at a time. Every step is a function of scroll position, so it all
// runs backwards when you scroll up.
(() => {
  const sec = document.querySelector(".redact");
  if (!sec) return;
  const pin = sec.querySelector(".pin");
  const text = sec.querySelector("[data-redact]");
  const strip = sec.querySelector(".redact-strip");
  const vis = sec.querySelector(".redact-vis");
  const visNum = vis.querySelector("b");
  const key = sec.querySelector(".redact-key");
  const tick = sec.querySelector(".redact-tick");
  const tickText = tick.querySelector(".redact-tick-t");
  const dict = sec.querySelector(".dict");
  const lines = [...dict.querySelectorAll(".ln")];
  const STRIP = strip.dataset.text;
  const DARK = [19, 17, 26];

  const words = text.textContent.trim().split(/\s+/);
  text.textContent = "";
  const spans = words.map((w, i) => {
    const sp = document.createElement("span");
    sp.className = "rw";
    sp.textContent = w;
    text.append(sp);
    if (i < words.length - 1) text.append(" ");
    return sp;
  });
  const bars = spans.map(() => sec.querySelector(".redact-bars").appendChild(document.createElement("i")));

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rgb = (c) => (c.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
  const LINE_AT = [0.7, 0.72, 0.74, 0.77, 0.8, 0.83, 0.86];   // guide words, headword, … next entry

  sec._progress = (p) => {
    const flat = still || innerHeight < 640;
    sec.classList.toggle("flat", flat);
    if (flat) { sec.style.backgroundColor = ""; return; }
    if (!sec.classList.contains("ready")) requestAnimationFrame(() => requestAnimationFrame(() => sec.classList.add("ready")));

    // The page darkens into the Calypso section's black.
    const from = rgb(getComputedStyle(document.body).backgroundColor);
    const k = span(p, 0.14, 0.32);
    sec.style.backgroundColor = `rgb(${from.map((c, i) => Math.round(mix(c, DARK[i], k))).join(",")})`;

    const box = pin.getBoundingClientRect();
    const navH = parseFloat(getComputedStyle(pin).paddingTop) || 0;
    const tw = Math.min(560, box.width * 0.84), th = box.width < 600 ? 46 : 54;
    const tx = (box.width - tw) / 2, ty = navH + (box.height - navH) / 2 - th / 2;

    // The strip: solid, turned down to 10%, then gone once Return sends it.
    const dim = span(p, 0.44, 0.52), gone = span(p, 0.54, 0.56);
    const op = mix(1, 0.1, dim) * (1 - gone);

    const n = spans.length;
    spans.forEach((sp, i) => {
      const r = sp.getBoundingClientRect();
      const s = span(p, 0.03 + i * (0.15 / n), 0.03 + i * (0.15 / n) + 0.035);  // redaction sweep
      const e = ease(span(p, 0.25 + i * 0.002, 0.34 + i * 0.002));                // slide into the strip
      const x = mix(r.left - box.left - 4, tx, e), y = mix(r.top - box.top + r.height * 0.06, ty, e);
      const w = mix(r.width + 8, tw, e), h = mix(r.height * 0.88, th, e);
      const b = bars[i];
      b.style.left = x + "px"; b.style.top = y + "px"; b.style.width = w + "px"; b.style.height = h + "px";
      b.style.borderRadius = mix(3, 10, e) + "px";
      b.style.transform = `scaleX(${e > 0 ? 1 : s})`;
      b.style.opacity = op;
      sp.style.opacity = s >= 1 ? 0 : 1;
    });

    // The strip types the question.
    strip.textContent = STRIP.slice(0, Math.round(STRIP.length * span(p, 0.355, 0.43)));
    strip.classList.toggle("typing", p > 0.35 && p < 0.54);
    Object.assign(strip.style, { left: tx + "px", top: ty + "px", width: tw + "px", height: th + "px", opacity: p > 0.35 ? op : 0 });

    vis.style.top = ty + th + 18 + "px";
    vis.style.opacity = span(p, 0.42, 0.44) * (1 - span(p, 0.53, 0.55));
    visNum.textContent = Math.round(mix(100, 10, dim)) + "%";

    // Return sends it; the corner works, then says it's copied; ⌘V pastes the answer.
    const keyText = p > 0.52 && p < 0.57 ? "Return" : p > 0.66 && p < 0.71 ? "⌘ V" : "";
    if (keyText) key.textContent = keyText;
    key.classList.toggle("on", !!keyText);
    tick.classList.toggle("on", p > 0.56 && p < 0.71);
    tick.classList.toggle("working", p < 0.6);
    tickText.textContent = p < 0.6 ? "Thinking" : "✓ Copied · she who conceals";

    dict.classList.toggle("on", p > 0.69);
    lines.forEach((l, i) => l.classList.toggle("on", p > LINE_AT[i]));
  };
})();

// ------------------------------------------------------------ the island
// Calyx's black pseudo Dynamic Island at the top of the screen. island() drives the full one (How
// it works, the examples): "shot" with a count, "work" while it thinks, "done" with a few words
// about the answer and a one-word caption, or "" to fold it away. quiet() drives the quiet one
// Calypso uses: a symbol ("ok", "dots", "bud") and one line of text, or nothing to hide it.
function island(el) {
  const n = el.querySelector(".isl-n"), msg = el.querySelector(".isl-msg"), cap = el.querySelector(".isl-cap");
  return (state = "", a = "", b = "") => {
    if (state === "shot") n.textContent = a;
    if (state === "done") { msg.textContent = a; cap.textContent = b; }
    el.dataset.s = state;
  };
}
function quiet(el) {
  const icon = el.querySelector(".qi-ico"), text = el.querySelector(".qi-t");
  return (symbol, line) => {
    if (!symbol) { el.classList.remove("on"); return; }
    icon.dataset.i = symbol;
    text.textContent = line;
    el.classList.remove("swap");
    void el.offsetWidth;   // restart the quick fade
    el.classList.add("swap", "on");
  };
}

// How it works: step 1 counts the screenshot, step 2 thinks for a moment and then shows the answer,
// which stays up while step 3 pastes it. (Story screens get _step(n) when the step changes.)
(() => {
  const screen = document.querySelector(".how-screen");
  if (!screen) return;
  const set = island(screen.querySelector(".isl"));
  const answer = () => set("done", "range stops before the end", "Copied");
  let t;
  screen._step = (n) => {
    clearTimeout(t);
    if (n === 1) set("shot", 1);
    else if (n === 2 && !still) { set("work"); t = setTimeout(answer, 1500); }
    else if (n >= 2) answer();
    else set();
  };
})();

// Calypso: step 1 plays the flower (styles.css); once the bud has tucked into the island, the island
// says "Calypso on" and the menu-bar icon turns into sunglasses. Step 4 sends the question and the
// quiet island reports back.
(() => {
  const screen = document.querySelector(".inc-screen");
  if (!screen) return;
  const say = quiet(screen.querySelector(".qi"));
  let timers = [];
  const later = (ms, f) => timers.push(setTimeout(f, still ? 0 : ms));
  screen._step = (n) => {
    timers.forEach(clearTimeout);
    timers = [];
    say();
    screen.classList.toggle("cal", n > 1);
    if (n === 1) later(2050, () => { screen.classList.add("cal"); say("bud", "Calypso on"); });
    if (n === 4) { say("dots", "Thinking"); later(1600, () => say("ok", "cut it to two sentences")); }
  };
})();

// [data-progress] elements get --p from 0 to 1:
//   exit  - 0 while the element sits at the top of the window, 1 once it has scrolled off
//   enter - 0 as the element's top reaches the bottom of the window, 1 when it's 30% from the top
//   pin   - how far through a tall section with a sticky child the reader is
// Inside them, [data-at] gets .on and [data-done] gets .done once --p passes their value.
const tracked = [...document.querySelectorAll("[data-progress]")].map((el) => ({
  el,
  kind: el.dataset.progress,
  at: [...el.querySelectorAll("[data-at]")],
  done: [...el.querySelectorAll("[data-done]")],
  words: [...el.querySelectorAll(".w")],
  p: -1,
}));

// [data-steps]: a sticky screen beside steps that scroll past. The step nearest the middle of
// the window is active, and the screen gets data-active and s1, s2… classes to match.
const stories = [...document.querySelectorAll("[data-steps]")].map((g) => ({
  steps: [...g.querySelectorAll("[data-step]")],
  screen: g.querySelector("[data-step-screen]"),
  cumulative: g.hasAttribute("data-cumulative"),
  active: -2,   // forces the first update to set the screen's starting state
}));

// The features page's sticky section links highlight the section you're reading.
const subnav = document.querySelector(".subnav-in");
const spy = subnav
  ? [...subnav.querySelectorAll("a")].map((a) => ({ a, target: document.querySelector(a.hash) })).filter((s) => s.target)
  : [];
let spyCurrent = -2;

const nav = document.querySelector(".nav");
const clamp = (v) => Math.min(1, Math.max(0, v));

function progressOf(t) {
  const r = t.el.getBoundingClientRect(), vh = innerHeight;
  if (t.kind === "exit") return still ? 0 : clamp(-r.top / r.height);
  if (t.kind === "enter") return still ? 1 : clamp((vh - r.top) / (vh * 0.7));
  if (still || vh < 640) return 1;   // pinned sections don't pin in these cases (see styles.css)
  return clamp(-r.top / (r.height - vh));
}

function update() {
  queued = false;
  nav?.classList.toggle("scrolled", scrollY > 4);

  for (const t of tracked) {
    const p = progressOf(t);
    if (p === t.p) continue;
    t.p = p;
    t.el.style.setProperty("--p", p.toFixed(4));
    if (t.el._progress) t.el._progress(p);
    for (const c of t.at) c.classList.toggle("on", p >= +c.dataset.at);
    for (const c of t.done) c.classList.toggle("done", p >= +c.dataset.done);
    if (t.words.length) {
      const lit = Math.ceil(clamp(p * 1.2) * t.words.length);
      t.words.forEach((w, i) => w.classList.toggle("lit", i < lit));
    }
  }

  for (const s of stories) {
    // Nothing is active until the first step reaches the middle of the window, so step 1's
    // animation (the screenshot flash) plays while you're looking at it, not on page load.
    let a = -1;
    s.steps.forEach((st, i) => { if (st.getBoundingClientRect().top < innerHeight * 0.55) a = i; });
    if (a === s.active) continue;
    s.active = a;
    s.steps.forEach((st, i) => st.classList.toggle("active", i === a));
    if (!s.screen) continue;
    s.screen.dataset.active = a + 1;
    s.steps.forEach((_, i) => s.screen.classList.toggle("s" + (i + 1), s.cumulative ? i <= a : i === a));
    s.screen._step?.(a + 1);
  }

  if (spy.length) {
    let cur = -1;
    spy.forEach((s, i) => { if (s.target.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
    if (cur !== spyCurrent) {
      spyCurrent = cur;
      spy.forEach((s, i) => s.a.classList.toggle("current", i === cur));
      if (cur >= 0) {
        const a = spy[cur].a;
        subnav.scrollTo({ left: a.offsetLeft - subnav.clientWidth / 2 + a.offsetWidth / 2, behavior: still ? "auto" : "smooth" });
      }
    }
  }
}
let queued = false;
const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
addEventListener("scroll", queue, { passive: true });
addEventListener("resize", () => { tracked.forEach((t) => { t.p = -1; }); queue(); });
update();

// ------------------------------------------------------------ the hero's Calypso bar
// Type a question, vanish, and let the quiet island at the top of the screen report back. Repeat.
// Attached files show as a dim "+1 file" in the bar, as they do in the app.
(() => {
  const bar = document.getElementById("demoBar");
  if (!bar) return;
  const text = document.getElementById("demoText");
  const tag = document.getElementById("demoTag");
  const say = quiet(document.getElementById("demoIsl"));

  const examples = [
    { q: "why does this python loop skip the last item?", s: "range stops before the end" },
    { q: "reply: can't do friday, monday instead", s: "suggested Monday" },
    { q: "give me a hint for this question", files: "+1 file", s: "try a set to track repeats" },
    { q: "summarize this PDF in 2 lines", files: "+1 file", s: "two-line summary" },
  ];

  // With reduced motion the static markup (a typed question and a finished answer) stays put.
  if (still) return;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    for (let i = 0; ; i = (i + 1) % examples.length) {
      const { q, s, files = "" } = examples[i];
      text.textContent = "";
      tag.textContent = files;
      bar.classList.remove("gone");
      say();
      await wait(500);
      for (const ch of q) {
        text.textContent += ch;
        await wait(38 + Math.random() * 50);
      }
      await wait(650);
      bar.classList.add("gone");
      say("dots", "Thinking");
      await wait(1400);
      say("ok", s);
      await wait(2600);
      say();
      await wait(400);
    }
  })();
})();

// ------------------------------------------------------------ "when would I actually use this?"
// Each scene is a list of timed steps acted out on the fake Mac screen. A step can press keys
// (shown big on screen), flash a screenshot, set the island (see island() above), add a state
// class to the scene, type text, or paste text in one go.
(() => {
  const stage = document.getElementById("stage");
  if (!stage) return;
  const tabs = [...document.querySelectorAll(".use-tab")];
  const isl = island(stage.querySelector(".isl"));
  const keys = stage.querySelector(".kc");
  const flash = stage.querySelector(".flash");
  const title = stage.querySelector(".win-title");
  const app = stage.querySelector(".mbar-app");

  const SCENES = {
    quiz: [
      { at: 900, keys: "⌃ Space", flash: true, isl: ["shot", 1] },
      { at: 1300, keys: "⌃ ⇧ Space", isl: ["work"] },
      { at: 1700, isl: ["done", "B · binary search halves the list each step", "Copied"] },
      { at: 1600, cls: "picked" },
    ],
    code: [
      { at: 800, cls: "focused" },
      { at: 800, keys: "⌃ Space", flash: true, isl: ["shot", 1] },
      { at: 1300, keys: "⌃ ⇧ Space", isl: ["work"] },
      { at: 1800, paste: [".ed-fill", "def first_repeat(nums):\n    seen = set()\n    for n in nums:\n        if n in seen:\n            return n\n        seen.add(n)"], isl: ["done", "remembers each number it has seen", "Pasted"] },
      { at: 1300, cls: "submitted" },
    ],
    mail: [
      { at: 900, keys: "⌃ Space", flash: true, isl: ["shot", 1] },
      { at: 1200, keys: "⌥ Space", cls: "open", isl: [""] },
      { at: 600, type: [".cx-type", "say no politely"] },
      { at: 500, keys: "⌃ ⇧ Space", cls: "closed", isl: ["work"] },
      { at: 1600, paste: [".ml-fill", "Hi Rachel, thanks for the invite! I can't make it this Saturday, but I'd be glad to catch up on what I missed next week. Best,"], isl: ["done", "polite no, offers to catch up", "Pasted"] },
    ],
    off: [
      { at: 900, keys: "⌥ Space", cls: "open" },
      { at: 600, type: [".cx-type", "18% of 64.50"] },
      { at: 500, keys: "⌃ ⇧ Space", cls: "closed", isl: ["work"] },
      { at: 1900, paste: [".nt-fill", "$11.61"], isl: ["done", "18% of $64.50 is $11.61 · on this Mac", "Pasted"] },
    ],
  };
  const ORDER = Object.keys(SCENES);

  let run = 0;          // bumps on every new play, so an old timeline stops itself
  let visible = true;   // pause while the stage is scrolled out of view
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function wait(ms, id) {
    await sleep(ms);
    while (!visible && id === run) await sleep(250);
    return id === run;
  }

  function reset(scene) {
    scene.className = scene.className.split(" ").filter((c) => c === "scene" || c.startsWith("sc-")).join(" ");
    scene.querySelectorAll("[data-fill]").forEach((el) => { el.textContent = ""; });
    isl();
    keys.classList.remove("show");
    flash.classList.remove("go");
  }

  function apply(scene, step, instant) {
    if (step.cls) scene.classList.add(step.cls);
    if (step.paste) scene.querySelector(step.paste[0]).textContent = step.paste[1];
    if (step.type && instant) scene.querySelector(step.type[0]).textContent = step.type[1];
    if (step.isl) isl(...step.isl);
    if (instant) return;
    if (step.keys) {
      keys.textContent = step.keys;
      keys.classList.remove("show");
      void keys.offsetWidth; // restart the animation
      keys.classList.add("show");
    }
    if (step.flash) {
      flash.classList.remove("go");
      void flash.offsetWidth;
      flash.classList.add("go");
    }
  }

  async function play(name, instant = still) {
    if (!SCENES[name]) name = ORDER[0];   // a page and script from different versions
    const id = ++run;
    tabs.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.scene === name)));
    stage.dataset.active = name;
    const scene = stage.querySelector(`.scene[data-scene="${name}"]`);
    stage.querySelectorAll(".scene").forEach((s) => s.classList.remove("on"));
    title.textContent = scene.dataset.title;
    app.textContent = scene.dataset.app;
    reset(scene);
    scene.classList.add("on");

    if (instant) {
      SCENES[name].forEach((step) => apply(scene, step, true));
      return;
    }
    for (const step of SCENES[name]) {
      if (!(await wait(step.at, id))) return;
      apply(scene, step, false);
      if (step.type) {
        const el = scene.querySelector(step.type[0]);
        for (const ch of step.type[1]) {
          if (!(await wait(35 + Math.random() * 45, id))) return;
          el.textContent += ch;
        }
      }
    }
    if (!(await wait(3200, id))) return;
    play(ORDER[(ORDER.indexOf(name) + 1) % ORDER.length]);
  }

  tabs.forEach((t) => t.addEventListener("click", () => play(t.dataset.scene)));
  play(ORDER[0]);
})();
