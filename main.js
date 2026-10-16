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

// The way into Incognito (index.html). As the section scrolls past, its sentence is redacted word
// by word and the page darkens; the bars slide together into one strip that types "ask without
// a trace"; a visibility readout counts it down from 100% to 5% and it's gone; then the Greek
// word behind the name appears letter by letter. Every step is a function of scroll position.
(() => {
  const sec = document.querySelector(".redact");
  if (!sec) return;
  const pin = sec.querySelector(".pin");
  const text = sec.querySelector("[data-redact]");
  const strip = sec.querySelector(".redact-strip");
  const vis = sec.querySelector(".redact-vis");
  const visNum = vis.querySelector("b");
  const tick = sec.querySelector(".redact-tick");
  const letters = [...sec.querySelectorAll(".redact-word span")];
  const gloss = sec.querySelector(".redact-gloss");
  const note = sec.querySelector(".redact-note");
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

  sec._progress = (p) => {
    const flat = still || innerHeight < 640;
    sec.classList.toggle("flat", flat);
    if (flat) { sec.style.backgroundColor = ""; return; }
    if (!sec.classList.contains("ready")) requestAnimationFrame(() => requestAnimationFrame(() => sec.classList.add("ready")));

    // The page darkens into the Incognito section's black.
    const from = rgb(getComputedStyle(document.body).backgroundColor);
    const k = span(p, 0.2, 0.44);
    sec.style.backgroundColor = `rgb(${from.map((c, i) => Math.round(mix(c, DARK[i], k))).join(",")})`;

    const box = pin.getBoundingClientRect();
    const navH = parseFloat(getComputedStyle(pin).paddingTop) || 0;
    const tw = Math.min(560, box.width * 0.84), th = box.width < 600 ? 46 : 54;
    const tx = (box.width - tw) / 2, ty = navH + (box.height - navH) / 2 - th / 2;

    // Strip opacity: solid, then turned down to 5%, then gone.
    const dim = span(p, 0.57, 0.68), gone = span(p, 0.68, 0.71);
    const op = mix(1, 0.05, dim) * (1 - gone);

    const n = spans.length;
    spans.forEach((sp, i) => {
      const r = sp.getBoundingClientRect();
      const s = span(p, 0.05 + i * (0.22 / n), 0.05 + i * (0.22 / n) + 0.05);   // redaction sweep
      const e = ease(span(p, 0.34 + i * 0.003, 0.47 + i * 0.003));                // slide into the strip
      const x = mix(r.left - box.left - 4, tx, e), y = mix(r.top - box.top + r.height * 0.06, ty, e);
      const w = mix(r.width + 8, tw, e), h = mix(r.height * 0.88, th, e);
      const b = bars[i];
      b.style.left = x + "px"; b.style.top = y + "px"; b.style.width = w + "px"; b.style.height = h + "px";
      b.style.borderRadius = mix(3, 10, e) + "px";
      b.style.transform = `scaleX(${e > 0 ? 1 : s})`;
      b.style.opacity = op;
      sp.style.opacity = s >= 1 ? 0 : 1;
    });

    // The merged strip types its line, then fades with the bars.
    const typed = Math.round(STRIP.length * span(p, 0.49, 0.56));
    strip.textContent = STRIP.slice(0, typed);
    strip.classList.toggle("typing", p > 0.48 && p < 0.57);
    Object.assign(strip.style, { left: tx + "px", top: ty + "px", width: tw + "px", height: th + "px", opacity: p > 0.48 ? op : 0 });

    vis.style.top = ty + th + 18 + "px";
    vis.style.opacity = span(p, 0.55, 0.57) * (1 - gone);
    visNum.textContent = Math.round(mix(100, 5, dim)) + "%";

    tick.classList.toggle("on", p > 0.7 && p < 0.79);

    // The word behind the name.
    letters.forEach((l, i) => l.classList.toggle("on", p > 0.8 + i * 0.018));
    gloss.classList.toggle("on", p > 0.9);
    note.classList.toggle("on", p > 0.94);
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
  active: -1,
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
    let a = 0;
    s.steps.forEach((st, i) => { if (st.getBoundingClientRect().top < innerHeight * 0.55) a = i; });
    if (a === s.active) continue;
    s.active = a;
    s.steps.forEach((st, i) => st.classList.toggle("active", i === a));
    if (!s.screen) continue;
    s.screen.dataset.active = a + 1;
    s.steps.forEach((_, i) => s.screen.classList.toggle("s" + (i + 1), s.cumulative ? i <= a : i === a));
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

// ------------------------------------------------------------ the hero's Incognito bar
// Type a question, vanish, show the corner indicator, repeat.
(() => {
  const bar = document.getElementById("demoBar");
  if (!bar) return;
  const text = document.getElementById("demoText");
  const pill = document.getElementById("demoPill");
  const pillText = document.getElementById("demoPillText");

  const examples = [
    { q: "why does this python loop skip the last item?", s: "range stops before the end" },
    { q: "reply: can't do friday, monday instead", s: "suggested Monday" },
    { q: "+1 screenshot  give me a hint for this question", s: "try a set to track repeats" },
    { q: "summarize this PDF in 2 lines", s: "two-line summary" },
  ];

  // With reduced motion the static markup (a typed question and a finished indicator) stays put.
  if (still) { pill.classList.add("show"); return; }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    for (let i = 0; ; i = (i + 1) % examples.length) {
      const { q, s } = examples[i];
      text.textContent = "";
      bar.classList.remove("gone");
      pill.classList.remove("show", "working");
      await wait(500);
      for (const ch of q) {
        text.textContent += ch;
        await wait(38 + Math.random() * 50);
      }
      await wait(650);
      bar.classList.add("gone");
      pillText.textContent = "Thinking";
      pill.classList.add("show", "working");
      await wait(1400);
      pill.classList.remove("working");
      pillText.textContent = "✓ Copied · " + s;
      await wait(2600);
      pill.classList.remove("show");
      await wait(400);
    }
  })();
})();

// ------------------------------------------------------------ "when would I actually use this?"
// Each scene is a list of timed steps acted out on the fake Mac screen. A step can press keys
// (shown big on screen), flash a screenshot, update Calyx's corner indicator, add a state class
// to the scene, type text, or paste text in one go.
(() => {
  const stage = document.getElementById("stage");
  if (!stage) return;
  const tabs = [...document.querySelectorAll(".use-tab")];
  const corner = stage.querySelector(".corner");
  const cornerText = corner.querySelector(".corner-t");
  const keys = stage.querySelector(".kc");
  const flash = stage.querySelector(".flash");
  const title = stage.querySelector(".win-title");
  const app = stage.querySelector(".mbar-app");

  const SCENES = {
    quiz: [
      { at: 900, keys: "⌃ Space", flash: true, corner: "Screenshot 1" },
      { at: 1300, keys: "⌃ ⇧ Space", corner: "Thinking", spin: true },
      { at: 1700, corner: "✓ B · binary search halves the list each step" },
      { at: 1600, cls: "picked" },
    ],
    code: [
      { at: 800, cls: "focused" },
      { at: 800, keys: "⌃ Space", flash: true, corner: "Screenshot 1" },
      { at: 1300, keys: "⌃ ⇧ Space", corner: "Thinking", spin: true },
      { at: 1800, paste: [".ed-fill", "def first_repeat(nums):\n    seen = set()\n    for n in nums:\n        if n in seen:\n            return n\n        seen.add(n)"], corner: "✓ Pasted · remembers each number it has seen" },
      { at: 1300, cls: "submitted" },
    ],
    mail: [
      { at: 900, keys: "⌃ Space", flash: true, corner: "Screenshot 1" },
      { at: 1200, keys: "⌥ Space", cls: "open", corner: "" },
      { at: 600, type: [".cx-type", "say no politely"] },
      { at: 500, keys: "⌃ ⇧ Space", cls: "closed", corner: "Thinking", spin: true },
      { at: 1600, paste: [".ml-fill", "Hi Rachel, thanks for the invite! I can't make it this Saturday, but I'd be glad to catch up on what I missed next week. Best,"], corner: "✓ Pasted · polite no, offers to catch up" },
    ],
    off: [
      { at: 900, keys: "⌥ Space", cls: "open" },
      { at: 600, type: [".cx-type", "18% of 64.50"] },
      { at: 500, keys: "⌃ ⇧ Space", cls: "closed", corner: "Thinking", spin: true },
      { at: 1900, paste: [".nt-fill", "$11.61"], corner: "✓ Pasted · on this Mac" },
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

  function setCorner(text, spin) {
    corner.classList.toggle("show", !!text);
    corner.classList.toggle("working", !!spin);
    if (text) cornerText.textContent = text;
  }

  function reset(scene) {
    scene.className = scene.className.split(" ").filter((c) => c === "scene" || c.startsWith("sc-")).join(" ");
    scene.querySelectorAll("[data-fill]").forEach((el) => { el.textContent = ""; });
    setCorner("");
    keys.classList.remove("show");
    flash.classList.remove("go");
  }

  function apply(scene, step, instant) {
    if (step.cls) scene.classList.add(step.cls);
    if (step.paste) scene.querySelector(step.paste[0]).textContent = step.paste[1];
    if (step.type && instant) scene.querySelector(step.type[0]).textContent = step.type[1];
    if (step.corner !== undefined) setCorner(step.corner, step.spin);
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
