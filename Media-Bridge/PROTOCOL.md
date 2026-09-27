# Experimental media-event protocol v1

This format was invented for the experiment. It is not an existing VW, Apple or Bluetooth diagnostic protocol. The radio-side emitter and vehicle read adapter do not exist yet. The C# HelperModel is an injectable desktop model only.

## Framing

`Next` represents one, `Previous` zero. Other controls discard an incomplete frame. Bits are MSB first. Each packet has two opening and two closing `01111110` flags. Within the packet, insert a zero after every five consecutive ones. The receiver removes those zeros, requires an exact packet size, and rejects bad stuffing/schema/CRC.

The two flags at each end improve recovery if a boundary event is lost. A damaged delimiter can still leave a complete, correct packet intact; that is allowed. Error detection does not imply every physical event disturbance is reported. The tests require no wrong decoded value and recovery of the following intact packet for each single-event mutation of the chosen test vector.

## Packet, 19 bytes

| Offset | Bytes | Meaning |
|---|---:|---|
| 0 | 2 | Magic D3 91 |
| 2 | 1 | Version 1 |
| 3 | 1 | Kind: 1 test integer, 2 externally supplied integer with unverified vehicle meaning |
| 4 | 4 | Session nonce, unsigned big endian |
| 8 | 2 | Sequence, unsigned big endian |
| 10 | 1 | Field 1: opaque integer, no sensor or units assigned |
| 11 | 4 | Signed integer, big endian |
| 15 | 4 | CRC-32/ISO-HDLC of bytes 0..14, stored big endian |

CRC polynomial (reflected) ED B8 83 20; initial and final xor FF FF FF FF. Golden packet: `D391010112345678000101000004D22BBFBB7D` (test value 1234).

The receiver permits sequence advances of 1..32767 modulo 65536; duplicate/older frames are ignored. An incomplete frame expires after a gap exceeding 3 seconds. Buffered input is capped at 256 symbols. Overflow abandons the partial packet and searches for a new flag. After restart, a fresh nonce prevents accepting old-session packets. It is displayed in test metadata as a proposed way for a future radio helper to discover it; that metadata path has NOT been demonstrated on the Golf.

CRC detects accidental damage, not forgery. A nonce reduces accidental cross-session mixing; it is not authentication. A Windows media event carries no verified device identity. Neither kind value can turn a decoded packet into a verified car reading. Input provenance is assigned locally by the receiver, never trusted from payload bytes.

## Performance and missing integration

The nominal 186-symbol example uses a requested 250 ms delay per command, but actual calls and scheduling add overhead. The earlier recorded first-to-last callback span was 53.807 seconds. The revised `FINAL-VALIDATION.json` derives the latest measured span from timestamps. This is a low-bandwidth proof experiment, not a practical high-rate scanner. Bluetooth pacing, deduplication, media focus and iPhone delivery remain untested. No local timing is a supported car rate.

Radio port prerequisites: a matched executable/build target; a verified installation and recovery procedure; a read-only accessor for one known vehicle value; a sender using the radio's existing media-command implementation; a scheduler that honours its press/release requirements. No guessed memory address, internal message ID or synthetic value should substitute for these prerequisites.
