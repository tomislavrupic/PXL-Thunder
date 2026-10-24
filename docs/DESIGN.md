# PXL Thunder web instrument

User direction: publish the existing personal PXL Thunder instrument as a playable web app on GitHub Pages. Retain the dark minimal/psychedelic interface and animated interactive four-voice field. Add an original banner and compact icon-only per-voice random generation beside the trigger controls.

Implementation choice: static HTML/CSS/ES modules, dependency-free Web Audio AudioWorklet DSP. No server, account, paid API or user tracking. GitHub repository tomislavrupic/PXL-Thunder, Pages branch main/root. Do not publish the native plugin source or unrelated projects. Web sources are public because they are the browser application.

Port the independent native reconstruction's 36 synthesis variants, per-voice filter/drive, delay, compressor, seven-wave LFO, four sixteen-step lanes, timing/rates, shuffle/groove, ratchets/odds/probability, locks and record gestures. Keep sound equivalence claims limited: this is an independent reconstruction, not a calibrated hardware emulation or bit-identical native port.

Browser-local library and JSON patch export/import; 64 kit/pattern slots per bank, 64 banks. Chain snapshots with explicit beat deadlines. Optional Web MIDI after user request. Safe audio startup from an explicit gesture, no automatic playback on page load. Audio and animation remain independent; motion can be disabled, reduced motion respected. Mobile controls wrap while sequencer lanes scroll horizontally.

Four voice colors: cyan #31d7cb, gold #e4cb73, coral #ee8c9e, violet #a59af4. Original imagegen banner, left title space, minimal psychedelic organic contour energy. Native vector dice icons, with tooltips and accessible labels. Preserve all unrelated voices and sound/pattern data when randomizing a single voice.

Validation: Node behavior tests before DSP/model implementation, real browser AudioWorklet audio output and controls, state persistence, responsive views, no console errors, then actual deployed HTTPS Pages asset and audio checks. No custom-domain changes or installation of unrelated services.

Step editing remains on existing controls: click a step, turn a knob to save its lock; right-click the knob to clear only that lock. Click the voice trigger/name to edit base values across the sequence while preserving other step locks. No added lock lane or sliders. The banner provides a direct macOS Apple silicon AU/VST3 binary download hosted in GitHub Releases; native source remains local.

iPhone Safari audio: request navigator.audioSession.type="playback" synchronously on Play/voice gestures before AudioContext creation/resume. Web Audio otherwise defaults to ambient, which iOS can mute via Silent Mode despite running clocks. Feature-detect and tolerate unsupported/restricted APIs; no microphone or extra media element. Physical iPhone speaker acceptance remains user-verified. References: https://w3c.github.io/audio-session/#audiocontext and https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type .
