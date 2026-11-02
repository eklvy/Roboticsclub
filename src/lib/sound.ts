import { readPreference } from "./browser-storage";
let context: AudioContext | undefined;
export function sound(
  kind: "click" | "success" | "error" | "boot" | "warning" = "click",
) {
  if (
    typeof window === "undefined" ||
    readPreference("nexus-muted") !== "false"
  )
    return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    const notes =
      kind === "success"
        ? [440, 660, 880]
        : kind === "error"
          ? [180, 110]
          : kind === "boot"
            ? [220, 330, 440, 660]
            : kind === "warning"
              ? [600, 600]
              : [500];
    notes.forEach((frequency, i) => {
      const osc = context!.createOscillator(),
        gain = context!.createGain(),
        start = context!.currentTime + i * 0.12;
      osc.type = kind === "error" ? "sawtooth" : "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.045, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  } catch {
    /* Sound is optional when a device blocks Web Audio. */
  }
}
