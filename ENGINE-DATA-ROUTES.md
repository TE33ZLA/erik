# Where engine data can come from — 2014 Golf 7, radio 5G0035819A

Research note, 27 September 2026, revised after a second search. No car contact. Constraints: stock radio, ordinary Bluetooth, no added hardware, no change to the car's software.

## Where the data lives

- Engine readings (RPM, coolant temperature, fault codes) are produced by the engine control unit on the **powertrain CAN bus**.
- The radio (Composition Media, MIB1 Standard, Panasonic) sits on the **infotainment CAN bus**.
- The gateway J533 passes a selected set of messages between buses, and routes diagnostic requests that arrive through the OBD-II socket.

So the radio can only ever pass on what the gateway sends it, and only if it has a function that exports it.

## What the radio actually holds

VW's Golf 7 launch material lists what the CAR menu of this radio shows: trip computer values (average consumption and similar), Eco-HMI tips, service interval, vehicle settings and a "current malfunctions" list (warnings) under Vehicle status. Early-2014 Golf 7 owners with this radio report that even the hidden offroad/performance screen shows **no oil or coolant temperature**, because the older instrument cluster does not put those values on the infotainment bus.

So the ceiling of any radio-based route is: consumption, range, trip data and warning messages. **Not RPM, not engine temperature, not fault codes.**

## Routes checked

| Route | Status | Evidence |
|---|---|---|
| Radio's Bluetooth serial service (channel 5) | Silent when listened to; no reply to EXLAP or MIBBridge requests; closed the connection once | Car visits 25–26 Sep |
| Channel 5 as an EXLAP (VW data) service | **Ruled out by VW's own rule.** The EXLAP spec binds Bluetooth EXLAP to the Serial Port Profile *with an EXLAP-specific service UUID per service*. Channel 5 advertises the plain Serial Port class `1101`. See check 3 below to confirm from the saved record. | EXLAP 1.3 spec (Bluetooth binding); 25 Sep discovery record |
| EXLAP on this generation at all | Documented only for **MIB2 High**, over TCP (Wi-Fi/USB) | [EXLAP atlas](https://github.com/ijord/EXLAP-mib2-atlas) |
| Think Blue. Trainer | On the Golf 7 it is built into the head unit, not a phone data link | Search summaries of owner forums |
| Radio firmware modification | Excluded by the constraints; no matched firmware for software 0421 anyway; and see "what the radio holds" | Earlier reviews |
| Car USB socket | Car is USB host; the laptop cannot act as a USB device; the radio's USB supports media devices only | Earlier reviews |
| Engineering "Test Mode" (MENU 10 s) | Needs "development mode", which is a software change on the radio → excluded | [M.I.B. wiki, hidden menus](https://github.com/Mr-MIBonk/M.I.B._More-Incredible-Bash/wiki/%22hidden-menus%22---key-combinations) |
| **Service Mode (MENU 3 s)** | Opens without any software change; shows unit/version information | same |
| OBD-II socket with an adapter | Established route to RPM, temperature and fault codes — but it is added hardware, so **excluded** | Standard OBD-II/EOBD |

## One hypothesis still open, and the experiment for it

Every Bluetooth request so far came from the Windows laptop. Windows connects to the car as a **music source only**; it can never be the car's *phone* (Windows has no hands-free "audio gateway" role). Some car stacks only serve data channels to the connected phone.

That does not make channel 5 a data service (see above), but it leaves one question the evidence cannot answer: **does the radio answer this laptop at the application layer on any service at all?**

`Media-Bridge/transport/golf_obex_control.py` tests exactly that with the radio's own advertised Object Push service: one standard 7-byte OBEX CONNECT handshake (`80 00 07 10 00 20 00`), read the reply, then DISCONNECT. No object is pushed and nothing is stored on the radio. Every OBEX server answers a CONNECT with a response code, even a refusal.

| Result | Meaning |
|---|---|
| `A0` (OK) or `C3` (Forbidden) | The radio talks to the laptop at the application layer. Channel 5's silence is specific to that service, which fits "not a data service". |
| No reply | The radio may serve application channels only to its connected phone. A laptop can never test that. |

Either way this is reachability evidence, not vehicle data. Offline tests: `transport/test_obex_control.py` (9 tests, socket pairs only). Live use needs the prepared laptop, `private-target.json`, the parked car, and `--run`:

```powershell
& (Get-Content .\runtime-path.txt) .\transport\golf_obex_control.py --run --out .\results\obex-control.json
```

## Checks needing no hardware and no software change

1. **Service Mode:** radio on, hold **MENU** for about 3 seconds. Photograph the screens. This gives the exact software train, which decides whether any firmware analysis so far even applies.
2. **CAR button:** open *Trip data*, *Vehicle status* and any *Eco* screen and note every value shown. Prediction: consumption, range, time, distance, warnings — no RPM or temperature. If RPM or a temperature appears, that changes the picture and is worth reporting.
3. **The saved channel-5 record:** on the laptop, open `private-services.json` from a visit folder and look at the record with `rfcomm_channel: 5`. If `service_classes` is only `1101` and `interface_flags.vendor_specific_uuid` is `false`, the EXLAP ruling above is confirmed from the car's own record.
4. **The Object Push probe** above, at the parked car.

## Conclusion

Within the constraints, no route to RPM, engine temperature or fault codes exists, and the radio most likely does not hold those values at all. This is not a missing request format; it is where the data is. What remains reachable through the radio, at most, is the trip-computer level of information, and no interface on this unit has been shown to export even that.

For a stock iPhone the picture is stricter still: iOS cannot open the radio's serial service without Apple accessory support declared by the radio, which this unit does not offer.
