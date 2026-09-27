"""Decode the saved SDP blobs without contacting a Bluetooth device."""
import hashlib
import json
from pathlib import Path


def element(data, offset=0):
    if offset >= len(data):
        raise ValueError("Missing SDP element")
    descriptor = data[offset]
    kind, size_index = descriptor >> 3, descriptor & 7
    pos = offset + 1
    if kind == 0:
        length = 0
    elif size_index <= 4:
        length = 1 << size_index
    else:
        width = 1 << (size_index-5)
        if pos+width > len(data):
            raise ValueError("Truncated SDP length")
        length = int.from_bytes(data[pos:pos+width], "big")
        pos += width
    end = pos+length
    if end > len(data):
        raise ValueError("Truncated SDP payload")
    payload = data[pos:end]
    if kind in (6, 7):
        value = []
        cursor = pos
        while cursor < end:
            child, cursor = element(data, cursor)
            if cursor > end:
                raise ValueError("Child exceeds parent")
            value.append(child)
    elif kind in (1, 2):
        value = int.from_bytes(payload, "big", signed=kind == 2)
    elif kind == 3:
        value = payload.hex()
    elif kind in (4, 8):
        value = payload.decode("utf-8", errors="replace")
    else:
        value = payload.hex()
    return {"type": kind, "value": value}, end


BLUETOOTH_BASE_SUFFIX = "00001000800000805f9b34fb"


# Published 128-bit IDs that are not on the Bluetooth base (SyncML server and client).
KNOWN_NON_BASE_UUIDS = {
    "000000010000100080000002ee000002": "SyncML server",
    "000000020000100080000002ee000002": "SyncML client",
}


def short_uuid(value):
    """Normalise 16-, 32- and 128-bit SDP UUID hex to one comparable form.

    Bluetooth-base UUIDs become their short form (for example "1101");
    vendor-specific 128-bit UUIDs are kept in full, lower case.
    """
    value = str(value).lower()
    if len(value) == 32 and value.endswith(BLUETOOTH_BASE_SUFFIX):
        value = value[:8]
    if len(value) == 8 and value.startswith("0000"):
        value = value[4:]
    return value


def decode(data):
    root, end = element(data)
    if end != len(data) or root["type"] != 6 or len(root["value"]) % 2:
        raise ValueError("Not one complete SDP attribute sequence")
    items = root["value"]
    attrs = {}
    for i in range(0, len(items), 2):
        key = items[i]
        if key["type"] != 1:
            raise ValueError("Attribute ID must be unsigned")
        attrs[f'{key["value"]:04x}'] = items[i+1]
    descriptors = attrs.get("0004", {}).get("value", [])
    rfcomm = None
    protocols = []
    for entry in descriptors:
        values = entry.get("value") if isinstance(entry, dict) else None
        if not isinstance(values, list) or not values or values[0].get("type") != 3:
            continue
        protocol = short_uuid(values[0]["value"])
        protocols.append(protocol)
        if protocol == "0003" and len(values) >= 2 and values[1].get("type") == 1:
            rfcomm = values[1]["value"]
    classes = [short_uuid(x["value"]) for x in attrs.get("0001", {}).get("value", [])
               if isinstance(x, dict) and x.get("type") == 3]
    flags = {
        # Plain serial transport: usable from Windows, not by a normal iPhone app.
        "serial_port": "1101" in classes,
        # ATT in the protocol list marks GATT offered over Classic Bluetooth,
        # which Core Bluetooth can use from iOS 13 when the car supports it.
        "classic_gatt_att": "0007" in protocols,
        # Vendor-specific 128-bit IDs deserve a manual look; they are how
        # proprietary services (including accessory protocols) are usually named.
        "vendor_specific_uuid": any(len(c) == 32 and c not in KNOWN_NON_BASE_UUIDS
                                    for c in classes + protocols),
    }
    return {"handle": attrs.get("0000", {}).get("value"),
            "service_name": attrs.get("0100", {}).get("value"),
            "service_classes": classes, "protocols": protocols,
            "rfcomm_channel": rfcomm, "interface_flags": flags, "attributes": attrs}


if __name__ == "__main__":
    results = []
    for path in sorted(Path("work").glob("golf-CachedServices-*.bin")):
        raw = path.read_bytes()
        record = decode(raw)
        record.update(source_file=path.name, sha256=hashlib.sha256(raw).hexdigest())
        results.append(record)
    output = {"source": "Windows CachedServices for the locally identified Eriks Golf device",
              "live_inventory": False, "records": results}
    Path("work/golf-sdp-decoded.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps([{k:r[k] for k in ("handle","service_name","service_classes","rfcomm_channel")}
                      for r in results], indent=2))
