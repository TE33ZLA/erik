# Prepared fallback checks — actual Golf visit

26 September 2026. Each serial experiment first obtained fresh service records
and verified the same Golf's advertised Serial Port channel 5. Each connection
required authentication and encryption. No credentials, fault clearing, vehicle
function calls, firmware changes or added hardware were used.

| Check | Actual result | Meaning |
|---|---|---|
| MIBBridge tunnel hypothesis | Connected; Windows accepted 93 application bytes; zero reply bytes in 15 seconds | No heartbeat, matching tunnel frame or HTTP response. The published tunnel was not identified on this Golf. |
| Standard receive-ready signal | Connected; Windows accepted the RFCOMM signal; zero application bytes sent or received during a 30-second listen | Readiness signalling did not reveal data; acceptance by Windows is not a verified application response. |
| EXLAP capability hypothesis | Connected; Windows accepted the fixed 74-byte request; zero reply bytes in 15 seconds | No EXLAP capability reply or vehicle reading. This repeats the earlier negative observation under this visit's conditions. |
| Standard Device ID service query | Completed; zero records | No additional model information obtained. |
| Passive button-traffic recorder | Preflight passed; administrator access unavailable | Owner explicitly selected “Skip the recorder”; no elevation or recording attempted. |

All serial check processes ended and sockets closed. Silence does not establish
the exact cause, permanent incompatibility, or absence of every hidden service.
These experiments test defined hypotheses, not every possible request format.
No car-health field was decoded and no iPhone app connection was tested.

The original guided run also completed Classic ATT discovery (zero records),
Public Browse discovery (seven records), passive BLE observation (14 nearby
addresses, none established as the Golf), and serial listening (connected,
zero data). Optional GATT enumeration remains gated on attributing a BLE device
to the Golf. The proposed car-off/car-on observation requires the owner's
physical state changes. The owner chose “Finish this visit”, so no comparison
scan or GATT connection was attempted. This remains untested, not negative.

The MIBBridge route was prepared but untested before today. Earlier documentation
calling it “NOT tested on the Golf” describes that earlier state, not this visit.
The protocol-identification requests were accepted by the local socket; this
does not prove that the remote application processed them.

Raw evidence remains in the private JSON files next to this report. The small
`summary.json` excludes the target address and received payload fields.
