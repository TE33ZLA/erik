# Response to Claude's review

27 September 2026. The review correctly distinguishes a prepared media experiment from an engine-data solution. My earlier readiness wording was too broad: local checks did not cover real Windows callbacks into the guided trial, and the combined visit had real timing and cancellation defects. No new car test was performed while making these corrections.

## Accepted findings and changes

| Finding | Correction | Regression evidence |
|---|---|---|
| Twelve prompts in thirty seconds rushed the owner | Six balanced prompts, ten seconds per prompt, sixty seconds total | `slow-human`: nine simulated seconds between each event, total over the old thirty-second limit |
| Double tap could skip buttons | Stage-action lockout exceeds Windows' configured double-click interval | `double-click`: second click cannot skip the next stage |
| Listening began before useful media checks and could end before buttons | Complete and save media baseline first; serial separately selected; active window starts on confirmed open listener | `complete`, `serial-early-close`; matched active/quiet windows |
| Discovery failure labelled as serial failure | Separate discovery and serial fields; serial explicitly not attempted | `discovery-failure` |
| Stop misreported missing output as worker failure | Check cancellation even after process has exited; preserve completed output separately from termination status | `worker-cancel` genuinely starts and kills an inert process; `cancel` checks stale discovery cannot continue |
| Worst-case work exceeded visit ceiling | Separate budgets: media worst case 205s inside 240s; serial workers 90s inside 110s | Documented arithmetic plus `visit-timeout` |
| Wrong default audio output could look like car failure | Select this app's output explicitly; play a quiet tone on request; owner must hear the car before proceeding | Actual local endpoint enumeration/assignment; `audio-unverified` blocks car assessment |
| An undecodable service could be silently ignored | Any undecodable/incomplete SDP record prevents unique serial selection | Offline worker regression |
| Guided tests bypassed the Windows callback | Add a real Windows-session-to-receiver-to-UI-to-guided-trial check | `windows-guided`; pairing and owner observations remain fixtures |
| Aggregated counts/timing partly hardcoded | Derive event count, value, metadata result and elapsed span from selected evidence; independently decode the recorded frame | `finalize_review.py` |
| Results not bound to producing build | Capture executable/manifest identity in the process; reject results from a different build | Per-report `execution` and collection-time checks |
| USB audit had no generating script | Include `audit_usb.ps1` and a fresh read-only inventory | New audit includes script/manifest fingerprints |
| Historical remote closure omitted | Add it explicitly and include the original zero-payload capture with a current fingerprint | `HISTORICAL-EVIDENCE.json` and `historical-raw/` in the packet |
| USB visit step had no useful supported path | Remove it from the guided visit | No USB calls in the visit flow |

## What remains unsolved

No engine-data exporter, radio-side helper, matched installation/recovery procedure, iPhone implementation or verified car reading exists. The experimental integer protocol cannot create a data source on the stock radio. Finding a matching firmware image alone would not prove a callable exporter or a permitted installation path.

The new serial comparison is optional exploratory work with a low chance of producing useful data. Its result is correlation only, not a diagnostic function. Early closure, missing active events or contaminated quiet periods leaves it inconclusive. A completed silent comparison still does not prove permanent incompatibility.

For this laptop, no supported USB peripheral setup was identified. That is enough to remove it from the visit; this review response does not claim an inventory proves every latent hardware capability absent. I also do not generalize the review's “only established iPhone route” claim to all cars or cloud services. For this specific Golf and the allowed interfaces, no established engine-data route has been found.

## Review the revised packet

Use the revised ZIP, not the earlier one. Start with `FINAL-VALIDATION.json` and `AUDIT.md`. Older ZIP/results remain historical evidence. “Locally checked” means the stated checks ran on this laptop; it does not mean the revised software has been tested over the Golf's Bluetooth connection.

The strongest remaining question is architectural, not whether another local software test passes: where would genuine engine data enter the proposed stock-radio connection? Until there is an evidence-backed answer, another car visit should not be presented as a route to a working health scanner.
