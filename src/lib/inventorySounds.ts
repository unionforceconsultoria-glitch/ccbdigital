// Sons leves via Web Audio API (sem arquivos externos, funciona offline e em celular)
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = "sine",
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Som curto e nítido de confirmação de item/grupo conferido */
export function playConfirmSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    scheduleTone(ctx, 880, 0, 0.075, 0.16, "triangle");
    scheduleTone(ctx, 1318.5, 0.06, 0.11, 0.18, "sine");
  } catch {
    // ignora silenciosamente caso o dispositivo bloqueie áudio
  }
}

/** Som celebratório de conclusão do inventário */
export function playCompletionSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const isLast = idx === notes.length - 1;
      scheduleTone(ctx, freq, idx * 0.085, isLast ? 0.32 : 0.14, isLast ? 0.2 : 0.15, "triangle");
    });
  } catch {
    // ignora silenciosamente caso o dispositivo bloqueie áudio
  }
}