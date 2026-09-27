# Where engine data can come from — 2014 Golf 7, radio 5G0035819A

Research note, 27 September 2026. No car contact.

## Where the data lives

- Engine readings are produced by the engine control unit. RPM and coolant temperature are live values; fault codes are stored.
- That unit sits on the **powertrain CAN bus**.
- The radio (Composition Media, MIB1) sits on the **infotainment CAN bus**.
- Between them is the gateway, J533. It passes a selected set of messages from one bus to another. It also routes diagnostic requests that come in through the **OBD-II port**.

To get engine data, either the radio must already receive it and send it out, or something must request it through the OBD port.

## Routes checked

| Route | Status | Evidence |
|---|---|---|
| Radio's Bluetooth serial service (channel 5) | No reply to EXLAP or MIBBridge requests; silent when listened to | Car visits 25–26 Sep (`golf-live-test-2026-09-25/RESULT.md`) |
| EXLAP (VW's vehicle-data protocol) | Documented only for **MIB2 High**, over TCP (Wi-Fi/USB), not MIB1 or Bluetooth | [EXLAP atlas](https://github.com/ijord/EXLAP-mib2-atlas) |
| Radio's own data | Early MY2014 Golf 7s with MIB1 reportedly show **no oil or coolant temperature** even when the hidden offroad/performance screen is enabled. The older instrument cluster does not send those messages to the infotainment bus. | Forum report (search summary only; the page could not be opened): [cartechnology.co.uk thread](https://cartechnology.co.uk/showthread.php?tid=84116) |
| Radio firmware modification | Excluded by the owner's rules. The earlier offline analysis found no matched firmware for software 0421 and no install/recovery route. It would probably not help anyway, because of the row above. | `golf-music-channel-investigation-2026-09-27.md`, `golf-usb-route-review-2026-09-27.md` |
| Car USB socket | Car is USB host; the laptop cannot act as a USB device; the radio supports media devices only | Earlier reviews |
| **OBD-II port with an adapter** | **Established route.** Standard emissions diagnostics give RPM (PID 0x0C), coolant temperature (PID 0x05) and stored fault codes (mode 03) | Standard OBD-II/EOBD; widely used |

## Conclusion

Finding how to request engine data from this radio is not a missing coding step. The radio is not connected to the engine data in a way anyone has documented. On this early Golf it may not even receive temperatures.

Every known working method goes through the OBD-II port. That needs one small adapter, which the current "no additional diagnostic hardware" rule excludes.

## If the rule is relaxed

- **For iPhone:** use a Bluetooth **LE** OBD adapter, or a Wi-Fi one. Classic-Bluetooth (serial-profile) ELM327 clones do not work with iPhone apps.
- **Development path:**
  1. Test the adapter first from the Windows laptop, on the same Bluetooth stack as this kit, reading PIDs 0x0C and 0x05 and mode 03.
  2. Then build the iPhone app with CoreBluetooth.
- **What a first test can verify:** an RPM reading matched against the tachometer, and a coolant temperature that climbs as the engine warms up.
