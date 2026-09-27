# Golf factory Bluetooth: live follow-up, 25 September 2026

**26 September follow-up:** the previously untested MIBBridge experiment was
run against the Golf. It connected and sent 93 defined application bytes,
but received no reply. Receive-ready and EXLAP checks likewise received no data;
Device ID discovery returned zero records. See the [new visit's fallback
results](../Golf-Visit/results/20260926T050638-81655b24/fallbacks-051333/RESULT.md).
The historical “NOT tested” section below describes the earlier state.

**The Bluetooth transport works. A vehicle-health interface still does not.**

**Later offline work:** a public Panasonic MSTD-family program was inspected.
It contains Bluetooth logic and internal VIN/oil/speed-related paths, but no
Bluetooth route to those paths has been established. Its exact match to this
Golf is unverified. A passive laptop button recorder is prepared; see the
[button and software investigation](BUTTON_INVESTIGATION.md) for evidence and
its recording-validation status.

**Further offline evidence:** [bounded instruction analysis](SPP_DISPATCH_TRACE.md)
shows the candidate's normal Bluetooth state chain does not handle its internal
SPP data event. This is a possible explanation to verify, not a finding about
the exact owner firmware. [The iPhone review](CLAUDE_Q3_REVIEW.md) corrects the
claim that BLE is the only supported Bluetooth data possibility, while keeping
the current serial/iPhone incompatibility explicit.

The owner ended the available car-testing window. No further vehicle communication
was started after that notice. All live-test processes had already exited.

No fault codes, engine readings, VIN or health result were retrieved. Missing
readings remain unknown, not zero or healthy. No iPhone connection was tested.

The owner confirmed the Golf was parked with the infotainment screen on for
these tests. Engine state was not separately recorded for these new runs.
Target equipment remains owner-reported 5G0035819A, hardware 40, software 0421.
The exact saved Golf pairing was selected locally; its address is not included
in these shared results. No other car was contacted.

## What changed in this visit

| Test | Actual result | Meaning |
|---|---|---|
| 16:26 Sydney: fresh Device ID SDP query | Completed, zero records | No additional model/manufacturer metadata obtained from this query |
| Fresh Public Browse Group query | Seven records | Found a phonebook-client record that the earlier L2CAP query missed |
| Fresh ATT SDP query | Completed, zero records | No advertised Classic GATT/ATT service found in this state; not a BLE scan |
| 16:30: standard RFCOMM receive-ready signal | Fresh channel 5 connected; Windows accepted the signal; zero application bytes; remote closure | This experiment did not reveal the service or a fix; does not prove why it closed |
| 16:43: one EXLAP identification hypothesis | Fresh channel 5 connected; Windows accepted all 74 request bytes; zero reply bytes over 15 seconds; no receive error | EXLAP was not identified. This was a real application-request experiment, not another passive listen |

The seventh service is `PhonebookAccess PCE`, class `112e`, without an incoming
RFCOMM endpoint. The other six remain Serial Port (5), Hands-free unit (1), Audio
Sink, A/V RemoteControl, OBEX Object Push (3), and SyncMLServer (7).
The [Bluetooth SIG profile](https://www.bluetooth.com/specifications/specs/phone-book-access-profile-1-1-1/)
defines phonebook access; its presence does not demonstrate a vehicle-health API.

## Exact application request and its limits

One fixed request was sent on the freshly advertised serial endpoint:

```xml
<Req id="31415926"><Protocol version="1" returnCapabilities="true"/></Req>
```

This follows section 3.5.2 of [Volkswagen's EXLAP 1.3 specification](https://www.scribd.com/document/158754515/EXLAP-Specification-V1-3-Creative-Commons-BY-SA-3-0-Volkswagen-pdf).
The specification defines it as protocol/capability negotiation that should not
change application state. Sections 3.7.3 and 5.4 describe an Init greeting and
service-specific Bluetooth identification. Neither was observed on this Golf.
Thus the test deliberately examined an unconfirmed hypothesis; the specification
does not establish how unidentified software interprets its bytes.

There were no authentication attempts, sensor requests, subscriptions, function
calls, fault clearing, coding, flashing, or added hardware. A successful socket
write does not prove the car application consumed or understood the request.
No bytes came back, so there is no positive EXLAP evidence. This one result does
not prove every other possible protocol or configuration is impossible.

## Code and evidence

The extracted prototype now includes separately invoked bounded tools for
metadata discovery, receive-ready signalling, EXLAP identification, and a prepared
MIBBridge compatibility experiment described below. The default launcher still
only discovers and listens. Twenty-three offline tests passed,
including actual local socket exchange, partial writes and rejecting misleading
or unmatched XML. These tests validate client behaviour, not Golf compatibility.
The original reviewed ZIP remains unchanged; the local extensions were not
reviewed by Claude.

- [Metadata result](metadata-summary.json)
- [Receive-ready result](ready-summary.json)
- [Identification result](identification-summary.json)
- Working code: `../../work/golf-package-review-0.1.1/golf-windows-prototype/`

Earlier engine-off and engine-running listens in the separate research task
also received zero bytes. Those are different runs and do not establish the
engine state of this visit.

## Actual blocker

Channel 5's application and its accepted vehicle-data requests remain unknown.
No matching legitimate client, protocol documentation, or exact-unit software
implementation was located that connects this endpoint to health readings.
The next evidence needed is such a client/trace or manufacturer documentation
for this hardware/software family. A generic Bluetooth connection, simulator,
MIB2 example or redesigned dashboard cannot supply that missing implementation.

The manufacturer's [MIB Standard FCC test report](https://fccid.io/WUQ-MIB1/Test-Report/test-report-1694449.pdf)
mentions a production tool connected by Serial/USB for radio tests. It neither
identifies this Golf's channel-5 application nor supplies a wireless diagnostic
API, and exact part-to-filing equivalence was not established. Its laboratory
tool is not a demonstrated workaround under the no-added-hardware requirement.

The current app must report: **Bluetooth connection demonstrated; vehicle-data
access not established on this unit.** It must not promise a future database
addition or call this an easy software fix. All test sockets are closed.

## New offline lead — prepared, NOT tested on the Golf

[MIBBridge by Alexander Hahn](https://github.com/hahnworks/MIBBridge) publishes
an HTTP-over-RFCOMM tunnel for VW up!, Citigo and Mii with Composition Phone.
Its example uses channel 5 and a binary frame format. The matching channel is
only a reason to investigate; no shared implementation with this Golf's MIB1
Standard unit has been established. The author's success on those other cars
is not Golf compatibility evidence.

The public 0.1 source archive was downloaded and hash-checked, then read without
installing or executing the package. SHA256:
`ed0bb4cdc668761e1a54e3901203769bdffcc4415f40902e68e14e8ea69fa3cd`.

`golf_mibbridge_identification.py` independently implements a small, bounded
compatibility experiment using the published frame format: a heartbeat, opening
the documented web port 80, and one HTTP `GET /`. It exposes no local forwarding
port, requests no credentials or VIN, and sends no vehicle-function commands.
It only reports a verified tunnel when a matching frame contains a complete
HTTP response header. A 401/403 would demonstrate transport, not data permission.
Silence, an echo, or a heartbeat alone never becomes a health-data success.

Four offline tests cover published frame vectors, incomplete/invalid frames,
fragmented HTTP responses and rejecting silence/echo as success. **The owner
needed to turn the car off before a live trial: this protocol remains untested
on the Golf.** There is no tunnel-result capture and no newly retrieved car data.

The optional request for the full MSTD software train also remains unanswered;
it is not necessary to keep the car on to answer it now. Public software records
provide candidate mappings for 0421, but the owner's exact full train has not
been read. No software was downloaded for flashing and no update was attempted.
