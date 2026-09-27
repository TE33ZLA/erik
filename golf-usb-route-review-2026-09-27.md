# 2014 Golf: ordinary USB to stock iPhone

## Decision and retained alternative

The active investigation is the factory USB interface on the owner's Australian
2014 Golf, radio 5G0035819A, hardware 40, software 0421. The phone target is a
stock iPhone. No diagnostic adapter, new vehicle hardware, radio replacement,
radio software installation, or firmware modification is authorised by this
direction. An ordinary data-capable USB cable is allowed. No car contact was
made for this review.

Retain manufacturer-cloud access as a separate connector for cars which
already have working telematics, an available manufacturer data service,
owner authorisation, and a permitted third-party integration in their region.
This does not establish such access for this Golf. Smartcar is an example of
that architecture, not an Australian deployment solution: its published
coverage is North America and Europe. Cloud data availability and freshness
must be checked per field; internet connectivity is not full diagnostic access.

## Findings

1. VW's Australian Mk7 launch documentation describes Composition Media with
   Bluetooth and a USB interface (pages 34–35). This establishes intended media
   connectivity, not a vehicle-health protocol. The owner's original MIB1 unit
   must not be treated as MIB2/App-Connect hardware. VW's 2015 announcement ties
   the newer CarPlay integration to MIB II. SmartDeviceLink support on other
   brands is not evidence of SDL support on this Golf.
2. Apple documents a compliant USB-A-to-USB-C cable for connecting a USB-C
   iPhone to a car with USB-A. That establishes a possible physical connection;
   modern-iPhone compatibility with this specific older radio remains untested.
   The owner's phone model and actual socket should be confirmed before a visit.
3. Apple's External Accessory documentation describes explicit accessory-side
   support and a command protocol supplied by the accessory manufacturer. A
   media connection does not itself establish a general app data session.
   Do not invent protocol strings or present a generic USB terminal as an
   iPhone solution. The archived guide supplies the concept; any app build
   must verify current SDK requirements and the actual accessory protocol.
4. Offline string inspection of our existing related MSTD program found USB
   read/send tasks, USB iPod handling, HID report-descriptor parsing, media
   browsing/control, and USB audio references. These are candidate software
   clues consistent with Apple-media support. They are not a decoded request,
   proof of an active runtime path, or proof of vehicle-health access.

## Candidate evidence and limits

Input: `../work/golf-button-investigation/CPU_HMI_OR.research-only.bin`

SHA256: `c7ad7223a0229f0944e66a34537dcd8e740fccf946d2998d5ab3d1f55ebdb8be`

This is the previously downloaded public June-2016 SH-4/Windows CE candidate,
not a confirmed match for the owner's software 0421. It was read only as bytes.

Output: `../work/golf-button-investigation/candidate-usb-strings.json`

The scan extracted ASCII and UTF-16LE printable strings, then matched USB,
iPod/iPhone, iAP, external-accessory, App-Connect/CarPlay and vendor protocol
terms. There are 243 raw matches, including incidental matches. This count is
not a count of implemented features. Useful file offsets include:

- `0x5558a8` / `0x5558c4`: USB_READ / USB_SEND task labels.
- `0x5d8b98`: opening an iPod device handle.
- `0x5d9288` / `0x5d92c8`: iPod HID report-table / descriptor handling.
- `0x5d99e0`: USB HID write errors including not_ipod.
- `0x5acec8` onward: iPod media connection/control states.
- `0x600718`: USB audio driver reference.

No usable vehicle-data command or app protocol identifier was established by
this inspection. A missing string is not proof a feature is absent elsewhere.
`USB_CTRL_HSM ... active_diag, ADC=...` is insufficient evidence of a vehicle
diagnostic service; it appears among USB power/control labels. Similarly,
`NVM_APP_ConnectToDatabase` is a database label, not VW App-Connect support.

## Exact questions for the next research stage

1. In firmware matched to this radio, which Apple accessory capabilities are
   actually advertised? Is there a custom app data channel beyond media?
2. If such a channel exists, what protocol identifier, supported iPhone API,
   authentication and manufacturer authorisation does it require?
3. Does any reachable handler return a vehicle field such as VIN, mileage or
   oil temperature? Identify the request, response format and source first.
4. Can one field be independently checked against the car's own display?

The useful distinction is physical connection, media communication, app data
session, and verified vehicle reading. Passing one does not pass the next.

## Conditions before another car visit

First prepare a specific observable test, suitable iPhone software and a way
to save its result. An ordinary browser page cannot be assumed to enumerate
External Accessory sessions. Native iPhone software would require an Apple
build/signing/install workflow; none was built or installed in this review.
An empty app accessory list would mean no accessory exposed to that app in
that setup, not proof of no USB connection or no undiscovered protocol.

The earliest physical check can establish recognition and media exchange with
the exact iPhone, but it will not validate the health product. The health test
requires a known, permitted read request and independently checkable reply.
Do not promise a laptop can sniff an iPhone-to-radio USB link through an
ordinary cable; that is a separate capture setup. Do not initiate another
live scan or ask the owner to keep the car on without a test ready to run.

## Sources

- [VW Australian Mk7 launch documentation](https://www.australiancar.reviews/_pdfs/Volkswagen_Golf_Mk7_Presskit_201304.pdf)
- [VW's MIB II / App-Connect announcement, September 2015](https://www.prnewswire.com/news-releases/volkswagen-demonstrates-advanced-connectivity-in-new-celebrity-driven-marketing-campaign-300144900.html)
- [Apple: USB-C iPhone connections](https://support.apple.com/en-au/105099)
- [Apple: External Accessory concepts, archived guide](https://developer.apple.com/library/archive/featuredarticles/ExternalAccessoryPT/Introduction/Introduction.html)
- [Smartcar signals and owner-account flow](https://smartcar.com/product/signals)
- [Smartcar regions](https://smartcar.com/global)

## Follow-up: any existing USB port is acceptable

The owner broadened socket choice to any USB on the car, retaining the ordinary
cable / stock iPhone / no added hardware / no car software-change constraints.

VW SSP 519 (English edition 890519AG), page 14, documents the optional Comfort
telephone pairing-box arrangement. Through construction week 45/2013 the
pairing-box USB is charging only; from week 46/2013 the described arrangement
also supports data through USB hub R293. The hub joins the pairing-box socket
U37 and external audio connection R199 to the same infotainment controller
J794. These are reference configurations, not an inventory proving the owner
has the optional pairing box or hub. A 2014 registration/model year does not
by itself establish the exact construction week.

**Implication:** this documented second USB path is another entrance to the
same radio, not a separate diagnostic path to the engine/ABS controllers.
Selecting another data-capable socket does not establish the missing radio
application that exports health readings. No direct engine diagnostic USB
socket was identified in the examined documentation.

The saved MSTD research notes also document an engineering telnet method tested
on an Audi MSTD navigation unit. It requires a software installation and a
USB-to-Ethernet adapter, and the notes explicitly warn against installing that
package on non-navigation units. It is neither an ordinary-cable setup nor a
matched, verified method for this Golf. No package was installed or executed.
Even a radio shell would not itself establish a working iPhone health service.

**Outcome:** no verified working vehicle-health setup was found that satisfies
the constraints. The remaining custom Apple-accessory-protocol investigation
is research, not a ready connection or proof that such a protocol exists. A
new car visit is not yet justified as a health-data test. No live USB test was
performed and no iPhone app was built or installed.

- [VW SSP 519, page 14: USB hub and socket topology](https://www.vaglinks.com/Docs/SSP/VWUSA.COM_SSP_890519AG_2013_Golf_Infotainment_PartII.pdf)
- Saved engineering source: `../work/golf-button-investigation/MSTD_Panasonic_Telnet_connection_index.md`
- Source repository blob: `bcb8bfdd473401abbc6e4d52860e94c36b9131d9` in `LateAlways/mibwiki-mirror`, path `docs/MSTD Panasonic/Telnet connection/index.md`.

## Continued investigation: Apple packet path

Static tracing progressed beyond string matches in the same unmatched
June-2016 candidate. This is not a newly obtained copy of the owner's firmware.

- The `IPOD_TRANS Send` string leads to candidate function `0x19eef0`.
  It calls `0x19efe0` before handing the buffer to internal send functions.
  It checks an adjacent `0xff` byte on one path; USB/serial transport selection
  still requires fuller control-flow analysis.
- Candidate builder `0x19ed14` writes a `0x55` start byte, short or extended
  length, command-family byte, command number, optional transaction bytes,
  payload and a checksum through another helper. Family 4 uses a two-byte
  command number. Special cases for general-family commands `0x13` and `0x38`
  change framing-related state. This is consistent with legacy Apple iAP;
  it does not establish support for custom External Accessory app sessions.
- The known-code reference to the send wrapper was at `0x194fee`, inside
  candidate range `0x194f58..0x1952d4`. Another caller of the frame-check helper
  was at `0x194cf4`. These limited references do not constitute a complete call
  graph: runtime reachability, indirect callers and data/code boundaries need
  further review.
- A bounded evaluation of helper `0x19efe0` on seven synthetic inputs reached
  returns matching manual instruction review: a short frame, changed payload
  with the same envelope, and an extended-length frame returned 0; a changed
  checksum returned 4; a one-byte input returned 3. A wrong start byte and
  inconsistent declared length also returned 0, so this routine is **not a
  complete packet validator**. Its return value must not be treated as proof
  a command is supported, authenticated, executable or safe to send.

The packet-format interpretation was cross-checked against the independent
[Rockbox iAP framing implementation](https://raw.githubusercontent.com/Rockbox/rockbox/master/apps/iap/iap-core.c)
and its [general command descriptions](https://raw.githubusercontent.com/Rockbox/rockbox/master/apps/iap/iap-lingo0.c).
Rockbox is a protocol reference here, not code installed in the Golf or iPhone.
No Rockbox implementation was copied into the scanner.

Reproducible evidence:

- `../work/golf-button-investigation/dispatch-analysis/usb-ipod-followup.json`
- `../work/golf-button-investigation/dispatch-analysis/usb-ipod-followup.asm.txt`
- `../work/golf-button-investigation/dispatch-analysis/usb-send-callers.json`
- `../work/golf-button-investigation/dispatch-analysis/usb-send-callers.asm.txt`
- `../work/golf-button-investigation/dispatch-analysis/usb-packet-builder.asm.txt`
- `../work/golf-button-investigation/validate_usb_frame_helper.py`
- `../work/golf-button-investigation/dispatch-analysis/usb-frame-helper-validation.json`
- `../work/golf-button-investigation/dispatch-analysis/usb-frame-helper-validation.asm.txt`

The validation script uses the existing partial SH-4 interpreter on synthetic
memory, with calls/unsupported operations as stopping boundaries. It does not
boot the radio, run OEM code natively, simulate a whole car or send USB traffic.
All seven checks passed. No firmware, car setting or phone software was changed.

**Remaining decisive evidence:** the accessory capability/identification
message and associated app-protocol handlers for this radio, preferably from
matched 0421 firmware. A generic legacy-iAP encoder can frame arbitrary payloads;
that does not imply a handler exists to read vehicle data. No protocol string,
vehicle-data command, live reply or supported iPhone health session has been
established. USB is still a research route, not a working setup.
