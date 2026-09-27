# Evidence review — 27 September 2026

**Revised after independent review.** See `REVIEW-RESPONSE.md` for accepted findings and fixes. Earlier ZIPs describe the superseded combined/USB flow. This revision performs media checks first, removes the USB visit step and makes serial observation separately optional.

## Claim and decision

The kit is prepared for a bounded connection experiment. It is **not ready to retrieve engine data**. If the next visit must demonstrate working diagnostics, that objective remains blocked. Neither internal testing nor the owner's ordinary USB cable removes that blocker.

Target: owner-reported 2014 Golf, radio 5G0035819A, hardware 40, software 0421. The proposed car USB-A → laptop USB-C setup has been removed from the visit because no supported device-mode path exists in this kit. Stock iPhone remains an eventual goal, not a validated route.

The specific remaining hypothesis is that spontaneous serial traffic might accompany user-operated media actions. This is unproved and has a weak prior: previous listens and identification attempts returned no replies. Positive bytes would need protocol identification, not automatic interpretation as sensor data. A negative observation rules out only that test window, not every imaginable protocol. The experiment requires no modified radio software.

## Actual earlier Golf evidence

| Observation | Established | Not established |
|---|---|---|
| Fresh discovery: seven services | Advertised endpoints in that state | Vehicle-data API |
| Authenticated/encrypted RFCOMM channel 5 connected | Transport accepted connection | Responding application or health data |
| Receive-only/receive-ready: zero bytes | Silence during those windows | Exact cause |
| 25 September receive-ready connection ended `remote_closed` | The peer closed that particular connection, after an RFCOMM ready signal (closure time not recorded) | An available listener throughout later button actions. The 26 September passive 10-second listen ended at its own deadline, not by closure. |
| EXLAP: 74 bytes accepted locally; zero reply | Hypothesis did not identify EXLAP | Car understood the request |
| MIBBridge: 93 bytes accepted locally; zero reply | Published tunnel not identified | All possible protocols excluded |
| BLE on/off/on: 20 / 13 / 8 addresses; none attributable | No identified Golf BLE device | Proof BLE is universally absent |
| Owner skipped administrator recorder | Recorder did not run | A negative recorder finding |

Unchanged original reports:

- [25 September live evidence](../golf-live-test-2026-09-25/RESULT.md)
- [26 September fallback results](../Golf-Visit/results/20260926T050638-81655b24/fallbacks-051333/RESULT.md)
- [Completed BLE comparison](../Golf-Visit/results/20260926T084433-8f4d3ebf/REVIEW.md)

The completed comparison supersedes older statements that BLE comparison had not yet run. The new kit does not blindly repeat EXLAP, MIBBridge or surrounding-device BLE scans.

## New experiment contract

| Stage | Action / limit | Positive evidence | Failure handling |
|---|---|---|---|
| Local check | Hashes; internal groups; media session; audio-output enumeration/assignment; cached pairing | Local preparation only | Block start and explain |
| Audio route | Select this app's explicit output (list refreshable; hands-free entries flagged), wait for the stream, play a 3-second tone; owner check 75 seconds | Owner hears car speakers | Stop as setup-unverified, not car failure |
| First title | New per-session title; owner check 30 seconds | Owner-correlated metadata | Record missing/unobserved; continue |
| Buttons | Six shuffled Next/Previous prompts; 10 seconds per prompt, 60 seconds maximum | Received Windows callback sequence | Unexpected/rapid events and timeout retained |
| Second title | Changed title; owner check 30 seconds | Update observed rather than only cached title | Record missing/unobserved |
| Media finish | Baseline saved before any serial query; finish/optional choice 20 seconds | Independently preserved media observations | Default is finish |
| Optional services | Fresh SDP query 25 seconds; pinned authenticated peer; reject undecodable records | One unambiguous serial endpoint | Record discovery failure and serial not attempted |
| Optional serial | Connect 10 seconds; listen 50 seconds; process bound 70 seconds | Timestamped incoming chunks | Early closure makes comparison incomplete |
| Optional comparison | On confirmed open listener: active 10s, quiet 10s, active 10s, quiet 10s | Matched observation windows, still only correlation | Missing active events/quiet contamination marked inconclusive |
| Bounds | Media phase 270 seconds; optional serial phase 110 seconds; Stop throughout | Preserved results | Kill workers, release media, retain captured chunks |

Budget: a media worst case of pairing 15 + audio enumeration 5 + route 75 + titles 60 + buttons 60 + final choice 20 = 235 seconds fits within 270. Optional discovery 25 + worker 70 = 95 fits within 110. Normal use can finish much sooner; the ceilings are not estimated completion times. Routine UI work and brief process cleanup consume the spare allowance.

The listener sends zero **application** bytes. Bluetooth service discovery, authentication and transport signalling still occur. There are no diagnostic writes, firmware changes, USB payload writes, administrator recording or connections to unowned BLE devices. No automatic pairing deletion, driver installation or indefinite reconnect loop exists.

Windows media events do not identify their originating physical device. Owner observations and title challenges support correlation, not authenticated attribution. Serial windows begin only after the receiver reports an open connection. Inspect UTC window, event and chunk timestamps before claiming causality. An early closure or incomplete/contaminated window is explicitly inconclusive. Arrival-time correlation cannot prove that a button caused serial data or that the data is a sensor reading.

The optional serial connection might interfere with media operation; it now starts only after the media baseline is saved. A six-button trial does not establish Bluetooth event-rate or packet reliability. The app offers no engine-health verdict.

## USB evidence and limits

The actual laptop audit identified Lenovo model 83LK, an Intel USB 3.20 host controller and no active function-mode controller. Generic Windows driver files in a stopped state do not establish compatible hardware. See `results/laptop-usb-audit.json` and `results/prepared-usb-inventory.json`.

The [Lenovo LOQ 15IAX9E specification](https://psref.lenovo.com/syspool/Sys/PDF/LOQ/LOQ_15IAX9E/LOQ_15IAX9E_Spec.pdf) lists USB-A and USB-C data ports without advertising peripheral-mode operation. [Microsoft's dual-role architecture](https://learn.microsoft.com/en-us/windows-hardware/drivers/usbcon/usb-dual-role-driver-stack-architecture) requires compatible controller hardware and platform support. Combined with the actual inventory, these support treating device mode as **unestablished**. This is an engineering inference, not an electrical measurement proving all latent hardware features absent.

Operational decision: do not spend another visit comparing USB node lists. Such a comparison cannot establish a working device-mode or diagnostic route. `audit_usb.ps1` now provides a reproducible read-only inventory, with a new result and script fingerprint; it does not retroactively prove how the older inventory was generated.

## What internal validation proves

- Packet tests use our synthetic values and desktop helper. They do not execute Golf firmware.
- Windows loopback uses real Windows media APIs/callbacks; both ends are this laptop. Bluetooth is not the transport. The decoded integer 1234 is invented test data.
- Guided rehearsals replace pairing/serial workers with explicit fixtures; owner observations are simulated. Most button events are injected and labelled. The separate `windows-guided` run sends through this app's actual Windows session and exercises the receiver callback, UI dispatch and guided trial. Neither is a Bluetooth test.
- The deadline rehearsal genuinely starts and terminates an inert child process. Socket tests use local socket pairs for receive-only behavior, chunk capture and limits.
- The actual guided preflight and USB inventory query this laptop; cached pairing is not a live connection.
- The older recorded full-frame callback span was **53.807 seconds**, not 47. A nominal delay budget is not elapsed performance. The revised collector derives the new span from event timestamps and independently reconstructs the recorded packet; see `FINAL-VALIDATION.json` for the measured value.

Each new C# report includes executable and manifest hashes captured in its running process. The collector refuses results from another build and derives counts, values and timing from the selected evidence. These self-recorded hashes improve traceability; they are not independent attestation. Two original zero-payload car captures are included with fingerprints in the revised review packet, including the 25 September remote closure. Historical files are fingerprinted now, not signed at capture time; other historical claims remain supported by their reports and retained local evidence.

The Windows mechanism is documented in [Microsoft's manual System Media Transport Controls integration](https://learn.microsoft.com/en-us/windows/apps/develop/media-playback/system-media-transport-controls). Media controls and metadata are not a documented Golf engine-data API.

## Remaining blockers

1. No stock-radio function has been identified that exports a vehicle field through these interfaces.
2. No matched radio helper exists. The inspected public MSTD-family binary is not matched to software 0421; bounded inspection is not validation of this actual unit.
3. No supported USB installation path is established. Public navigation-unit modification notes are not an installer for this Golf.
4. No iPhone transport/app has been tested. Windows RFCOMM success does not establish an iPhone route.
5. No other-car coverage follows. A recovery algorithm cannot create a service that the car does not expose.

Recovery here means bounded waits, skipping blocked routes, preserving evidence and explaining errors. It does not mean guessing an unknown diagnostic protocol or silently marking missing data healthy.

## Independent review request

Review the source and evidence without assuming a working diagnostic solution. Check that simulated/local evidence is never labelled as car evidence; failed or ambiguous discovery cannot select another service; Stop/deadlines release resources; USB role claims are qualified; and the concurrent-media/serial experiment can answer its narrow hypothesis. Cite concrete code or missing evidence. Concluding that the constraints still block engine data is an acceptable review outcome.
