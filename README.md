# PXL Thunder

A four-voice percussion instrument by Pixel Records. Play it at **https://tomislavrupic.github.io/PXL-Thunder/**.

Four independent 16-step tracks, 36 synthesis variants, voice filters and drive, modulated delay, compressor, LFO, pattern/kit banks and chains. Runs locally in your browser with AudioWorklet synthesis. No account, server audio, microphone, or upload is needed.

- Press **PLAY**, tap **1–4**, or click the living field. Drag a creature to move P1/P2.
- Each voice's dice generates only that voice's rhythm. **Shift-click** undoes the rhythm; sounds, locks, and track timing stay intact.
- **Pick a step, turn an existing knob.** Its value is saved for that step. Keep turning other controls to add more locks, including algorithm, mode and filter type. Picking an active step keeps its hit on; click the selected step again to toggle its hit. A small dot marks steps with locks.
- **Right-click a knob** to clear only its lock on the selected step. **Click a voice trigger or name** to edit that voice’s base sound across the sequence; other step locks remain intact.
- Click the selected-step label **×** or press Escape to return to the base sound. Right-click a step for velocity, ratchets, probability, odds, copy/paste, and clearing locks.
- Existing FX controls also save shared per-step delay, compressor, output and LFO locks. These use the shared sixteen-step clock. Unlocked steps restore base values.
- **REC** captures taps and knob movements during playback. **SHIFT**, **SHUFFLE**, **LAST** and **MOD** expose track performance modes.
- Pattern and kit banks are separate. Alt-click saved patterns to form a chain; Shift-click recalls immediately.
- Changes save in this browser. Use **FILE → EXPORT** for a portable `.pxlthunder.json` patch containing the bank library, locks and imported samples.
- Optional Web MIDI depends on browser support. Native AU/VST3 project files use a different format.

The sound engine is an independent hardware-inspired reconstruction. It has not been calibrated against hardware measurements, and the supplied cymbal samples are generated substitutes. This is an original PXL interface and artwork, not an official Erica Synths product.

## Develop

No dependencies or build step. `npm test` runs DSP, sequencing and session tests. `npm run serve` serves http://127.0.0.1:4181. AudioWorklet requires HTTPS or localhost. GitHub Pages serves the repository root on main.

Original banner and generation provenance: [assets/BANNER-PROMPT.md](assets/BANNER-PROMPT.md).

Download the macOS Apple silicon AU/VST3 developer build from the banner or [GitHub Releases](https://github.com/tomislavrupic/PXL-Thunder/releases/tag/v0.1.0).
