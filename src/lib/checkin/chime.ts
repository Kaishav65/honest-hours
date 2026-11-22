// Short two-note chime for a new check-in while the tab is in the background.
// Browsers only allow sound after the user has interacted with the page, so the audio
// context is created on the first click/key press and reused afterwards.
let ctx: AudioContext | null = null;

function unlock() {
  if (typeof window === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

export function armChime() {
  const events = ["pointerdown", "keydown"] as const;
  const handler = () => {
    unlock();
    events.forEach((e) => window.removeEventListener(e, handler));
  };
  events.forEach((e) => window.addEventListener(e, handler));
  return () => events.forEach((e) => window.removeEventListener(e, handler));
}

export function playChime() {
  if (!ctx || ctx.state !== "running") return;
  const start = ctx.currentTime;
  [880, 1174.66].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const t = start + i * 0.18;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}
