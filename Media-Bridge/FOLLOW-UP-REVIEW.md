# Follow-up review of the revised kit — 27 September 2026

Independent second review of `Golf-connection-review-revised-2026-09-27.zip`, with fixes applied in this branch. No car contact, no Windows machine and no Bluetooth were used.

## Verdict

- **Media visit (sound, titles, buttons): ready once rebuilt and re-validated on the laptop.** The first review's timing, double-click, ordering, labelling, cancellation and provenance defects are genuinely fixed. The fixes below cover what was still missing.
- **Optional serial comparison: runs correctly, but is still a low-value question.** Early closure or silence leaves it inconclusive.
- **Engine data: not established, and no code change can establish it.** Nothing on the stock radio is known to export a vehicle value. A radio-side exporter needs radio software changes, which the owner's constraints exclude.

## What was checked here

| Check | Result |
|---|---|
| SHA-256 of every file in the packet's `kit-manifest.json` | All match (the two private files are intentionally absent) |
| `transport/test_visit_worker.py` (Linux, Python 3.11) | 11 of 11 pass |
| C# type check of the original and fixed sources (Mono `mcs` with stub Windows Runtime signatures) | Both compile |
| 22 internal protocol and button groups, run from the **fixed** source under Mono | All pass; reference packet `D391…BBFBB7D` matches |
| Execution records in the results | Every selected result carries the packet's console executable and manifest fingerprints |
| Windows-only checks (rehearsals, preflight, loopback, audio enumeration) | **Not rerunnable here.** Must be rerun on the laptop (below) |

## Remaining problems found, and fixed in this branch

1. **Garbled window text.** `GuidedVisit.cs` had doubly-encoded characters (`â€”`, `â€¦`) in five strings, visible in the packet's own `guided-ready.png` title bar. Repaired.
2. **Output list could not be refreshed.** Outputs were listed once, when **Begin** was pressed. If Windows connected the car's audio afterwards, the car never appeared and the only way out was a 45-second timeout recorded as "setup unverified". Added **Refresh list**.
3. **Hands-free output could pass the sound check.** Picking the car's *Hands-Free/Headset* endpoint plays the tone as phone-call audio: the owner hears it from the car, but the music (A2DP) route is untested. Such entries are now labelled *phone-call audio: not for this test*, and the selection is logged.
4. **Test tone was likely to be missed.** It was one second long and started the instant the output changed. A Bluetooth music stream often needs about a second to become audible. The app now waits $1.5\,\text{s}$ after selecting the output, then plays a $3\,\text{s}$ tone at a slightly higher level. It uses a new file name, so the old one-second file is not reused.
5. **Sound-check time.** Raised from 45 to 75 seconds, to allow choosing, refreshing and retrying. The media ceiling rises from 240 to 270 seconds: $15+5+75+60+60+20 = 235 \le 270$.
6. **An interrupted comparison window could be counted as complete.** In the packet's own `visit-timeout` rehearsal, `comparison-windows.json` records a window cut off by the deadline as `"complete": true` (with a 110-second duration). A window closed by Stop, deadline or early serial end is now always incomplete and marked `interrupted`. The rehearsal now asserts this.
7. **Serial process bound too tight.** Python start-up plus a 10-second connect plus a 50-second listen could reach the 65-second kill limit and relabel a normal finish as a deadline. Raised to 70 seconds: $25+70 = 95 \le 110$.
8. **Documentation.**
   - `AUDIT.md`: the 25 September remote closure followed an RFCOMM ready signal, and its timing was not recorded.
   - `AUDIT.md` and `READ ME.md`: new limits and the refresh/hands-free guidance.
   - `READ ME.md`: switch off other Bluetooth headphones. The laptop's own audio audit lists a paired pair, and they could take the audio and send their own Next/Previous events.

## Must be done on the laptop before the visit

The committed `kit-manifest.json` and `FINAL-VALIDATION.json` describe the **old** build. The app refuses to start until the manifest is rebuilt. In the prepared project's `Media-Bridge` folder, after copying in the changed files:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
.\VehicleMediaBridge.exe --self-test
.\VehicleMediaBridge.exe --prepare
.\VehicleMediaBridge.exe --windows-frame
foreach ($s in 'complete','discovery-failure','cancel','deadline','worker-cancel','visit-timeout','double-click','slow-human','serial-early-close','audio-unverified','windows-guided') { .\VehicleMediaBridge.exe --rehearse-guided $s }
& (Get-Content .\runtime-path.txt) .\finalize_review.py
```

Run these from a normal desktop session; media-session APIs are unavailable in restricted contexts. Then do a quick real audio check at home with the Bluetooth headphones: **Begin media test** → **Refresh list** → play the tone. This is the only part of the new code not exercised by any rehearsal.

## What still cannot be fixed in code

- No known function on the stock radio (5G0035819A, HW 40, SW 0421) exports an engine value over Bluetooth or USB.
- A radio-side exporter needs matched firmware, an installation and recovery route, and permission to modify the radio. None of these exist, and the constraints exclude the last.
- The laptop cannot act as a USB device on the car's host socket.
- No iPhone app exists. An iPhone app could not use the radio's serial service anyway without Apple accessory support declared by the radio.
- The only established iPhone engine-data route is an OBD-II Bluetooth LE adapter, which the "no additional diagnostic hardware" rule excludes. That decision, not software, is what blocks engine readings.
