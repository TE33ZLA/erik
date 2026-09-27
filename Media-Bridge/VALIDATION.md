# Validation — 27 September 2026

**Later guided build:** see `FINAL-VALIDATION.json`, `AUDIT.md` and `READ ME.md` for the current prepared visit. The section below preserves the earlier decoder prototype's validation; its original two-button visit instructions are superseded by the guided interface. The current program has 22 internal groups, offline worker tests and guided rehearsals, with provenance recorded separately.

## Passed

- Both Windows executables compile with the laptop's .NET Framework compiler and installed Windows metadata.
- **16 internal test groups**, including all 152 individual raw packet bit errors, every one-symbol flip/deletion/duplication of the 186-symbol test frame, 300 seeded varied payloads, signed limits, bad schema, wrong nonce, sequence replay/wrap, noise, timeouts, missing adapter/data and synthetic helper integration.
- The framing tests initially exposed a dropped-final-bit boundary problem. The format was changed to repeated HDLC-style flags and bit stuffing; the complete fault suite now passes. A valid unchanged packet may survive a disturbance to a redundant delimiter. The suite requires correct values and recovery; it does not claim to detect harmless delimiter changes.
- Independent Python `struct`/`zlib` output matches the .NET 19-byte golden packet. Result: `results/independent-vector.json`.
- Windows media-session initialization and cleanup succeeded.
- Actual Windows media API loopback received Next and Previous. Result: `results/20260927T031343-ba598f/windows-loopback.json`.
- **Full Windows API loopback:** 186 commands at 250 ms spacing returned through the app's SMTC callback in exact order, then decoded synthetic integer **1234**. Result and timestamps: `results/20260927T031513-2bfbd5/`. No global media keys were injected; only the session with this app's explicit identity was controlled.
- The app window was rendered and visually checked: `preview.png`.

The session-manager API was unavailable inside the restricted tool process (Windows reported a missing service). The same local test succeeded in the normal host context. No Windows service configuration was changed. This was not a Bluetooth or car failure.

## Not established

- Bluetooth delivery, its event rate, or attribution of button events to the Golf.
- iPhone implementation, event reliability or app distribution.
- USB installation or communication with the radio.
- A compatible radio executable, firmware update/recovery route, vehicle-data adapter, or radio event emitter.
- Any genuine vehicle reading, diagnostic coverage, accuracy or cross-car compatibility.

The Windows tests exercised our own software, not the Golf's original code. The desktop helper model has no default car-data provider and refuses to emit a reading without explicit adapters. No car software was installed, no firmware was flashed and no vehicle contact was made in this build/test turn.

## Useful next test

The prepared Windows receiver can check whether normal car Next/Previous controls reach this app while the laptop is the Bluetooth audio source. That test can establish the control connection only. A live encoded sensor-reading test remains blocked on a compatible radio-side helper. There is no instruction to connect a laptop's USB host socket directly to the radio's USB host socket using an arbitrary cable, and no USB installer is offered.
