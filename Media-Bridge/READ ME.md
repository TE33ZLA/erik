# Next Golf test

Double-click **Open Media Bridge.cmd** in this folder (or **START GOLF TEST.cmd** in the project folder). The guided Windows window is the current test interface; the older browser scanner is a separate prototype.

1. **At home:** click **Check laptop**. It checks the files, Windows media session and saved Golf pairing. It does not open the Golf's serial service.
2. **At the parked car:** switch the radio on, connect this laptop through Bluetooth and select it as the radio's Bluetooth audio source. Pause other media apps. **No USB cable is needed.**
3. Tick the confirmation, then click **Begin media test**. Select the car's audio output from the list, play the quiet test tone, and confirm only if it comes from the car. Follow the title and six button prompts.
4. Finish after the media results are saved, or explicitly choose the optional serial comparison. It alternates ten-second button and quiet periods. **Stop and save** is always available. The engine does not need to run for this infotainment test.

Each button prompt allows ten seconds, with sixty seconds for the six-button sequence. Media preparation and observations have a four-and-a-half-minute ceiling; the sound check allows 75 seconds. The optional serial experiment has its own 110-second ceiling. Failure to verify audio ends as a setup problem, not a car failure. Accidental double-clicks cannot immediately advance two steps. Close and reopen for a separate visit.

## What this visit can answer

- Does the car show the app's changing song title?
- Do prompted car button presses arrive in this Windows app?
- Does the already discovered serial service send bytes during those actions?
- During a separately selected experiment, does serial traffic differ between button and quiet windows? Early closure or contaminated quiet windows leaves this unanswered.

**Ready for a connection experiment, not a working vehicle-health scanner.** No radio helper, installation route or verified engine reading exists. The test might produce a useful negative result. It does not establish iPhone or other-car compatibility.

## USB limitation

This laptop exposes a USB host controller; no active device-mode controller was identified. There is no supported way in this kit to make it act as a phone on the car's USB socket. **The cable experiment has been removed.** It was not a useful diagnostic-data test. Read-only USB inventory remains a developer tool, not a proposed path into the car.

## Recovery during the visit

- **Car missing from the output list:** connect Bluetooth audio from the car's phone/media menu, then press **Refresh list**. Choose the car's music output, not an entry marked *phone-call audio* (Hands-Free/Headset).
- **Other Bluetooth headphones:** switch them off before the visit. Headphones paired to this laptop can reconnect, take the audio and send their own Next/Previous events.
- **Missing title/buttons:** check the selected Bluetooth audio source and pause other media players. Avoid laptop media keys and other remotes: Windows cannot identify which physical device sent a media event.
- **Missing pairing:** reconnect through Windows settings. The test uses the exact saved Golf identity and never guesses another car by name.
- **Serial absent, ambiguous, silent or disconnected:** save the result and continue media/USB observations. Silence means inconclusive, not healthy or permanently incompatible.
- **Serial closes early:** the matched comparison is incomplete. Preserve the result; it does not diagnose why the radio closed the socket.
- **Unexpected behavior:** Stop and save. Incoming serial chunks are saved immediately, preserving partial evidence.

No administrator recorder, driver replacement, pairing reset, firmware modification or AI service is used. The previously skipped recorder remains skipped.

## Evidence

Every session has its own `results/` directory. Read `visit-summary.json` and `READ THIS.txt` first. `media-baseline.json` is saved before optional discovery begins. `events.jsonl` records stages and button timings; `comparison-windows.json` records active/quiet intervals. `private-services.json`, `private-serial.json` and `private-serial-chunks.jsonl` hold transport evidence. Discovery and serial outcomes are separate. New reports carry executable/manifest fingerprints. Inspect private files before sharing.

See **AUDIT.md** for prior evidence, the test contract and remaining blockers; **FINAL-VALIDATION.json** records the final checks. The older decoder remains available through `VehicleMediaBridge.exe --advanced`.

## Developer checks

`build.ps1` compiles both executables and regenerates `kit-manifest.json`. After any source change, run it before **Check laptop**: the app refuses to start a visit while the manifest does not match the files. Hashes detect accidental kit changes, not authenticity or tamper-proof signing. `runtime-path.txt` is specific to this laptop; `private-target.json` pins the previously authorised Golf.

- `--prepare`: actual guided local preflight, without a serial/car query.
- `--self-test`: 22 synthetic protocol/prompt test groups.
- `--windows-frame`: synthetic integer through this app's actual Windows media APIs and a metadata-update check; Bluetooth is not the test transport.
- `--rehearse-guided`: scenarios include `complete`, `discovery-failure`, `cancel`, `deadline`, `worker-cancel`, `visit-timeout`, `double-click`, `slow-human`, `serial-early-close`, `audio-unverified` and `windows-guided`. The last uses actual Windows media callbacks in the guided UI; pairing and owner observations are still fixtures. None runs the car's code.
- `transport/test_visit_worker.py`: offline socket, identity, selection, receive and deadline tests.

Windows session-manager access can fail inside a restricted tool context. Successful normal-desktop validation is recorded separately; no Windows service configuration was altered.
