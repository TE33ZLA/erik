"""Read-only, uncached SDP discovery for one owner-identified Windows BT peer.

Uses Microsoft's published Winsock service-discovery interface. Sends SDP
metadata queries, never commands to a vehicle application. The caller runs
this module in a subprocess with a hard timeout, because discovery can block.
"""
import argparse
import ctypes as C
import datetime
import json
import socket
import uuid
from pathlib import Path
from decode_golf_sdp import decode
from golf_rfcomm_probe import SockaddrBth, AF_BTH, BTHPROTO_RFCOMM


class Guid(C.Structure):
    _fields_ = [("data1", C.c_uint32), ("data2", C.c_uint16),
                ("data3", C.c_uint16), ("data4", C.c_ubyte * 8)]


class Blob(C.Structure):
    _fields_ = [("size", C.c_uint32), ("data", C.c_void_p)]


class QuerySet(C.Structure):
    _fields_ = [("size", C.c_uint32), ("name", C.c_wchar_p),
                ("service_class", C.POINTER(Guid)), ("version", C.c_void_p),
                ("comment", C.c_wchar_p), ("namespace", C.c_uint32),
                ("provider", C.c_void_p), ("context", C.c_wchar_p),
                ("protocol_count", C.c_uint32), ("protocols", C.c_void_p),
                ("query", C.c_wchar_p), ("address_count", C.c_uint32),
                ("addresses", C.c_void_p), ("flags", C.c_uint32),
                ("blob", C.POINTER(Blob))]


SERVICE_QUERIES = {
    "l2cap": "00000100-0000-1000-8000-00805f9b34fb",
    "device-id": "00001200-0000-1000-8000-00805f9b34fb",
    "public-browse": "00001002-0000-1000-8000-00805f9b34fb",
    "att": "00000007-0000-1000-8000-00805f9b34fb",
}


def discover(address, service_query="l2cap"):
    if len(address) != 12 or any(c not in "0123456789abcdefABCDEF" for c in address):
        raise ValueError("Target address must contain 12 hex digits")
    if service_query not in SERVICE_QUERIES:
        raise ValueError("Unknown metadata query")
    # Creating a socket makes sure Python initialized Winsock. No connect.
    with socket.socket(AF_BTH, socket.SOCK_STREAM, BTHPROTO_RFCOMM):
        pass
    ws = C.WinDLL("Ws2_32.dll")
    ws.WSAGetLastError.restype = C.c_int
    ws.WSAAddressToStringW.argtypes = [C.c_void_p, C.c_uint32, C.c_void_p,
                                      C.c_wchar_p, C.POINTER(C.c_uint32)]
    ws.WSAAddressToStringW.restype = C.c_int
    ws.WSALookupServiceBeginW.argtypes = [C.POINTER(QuerySet), C.c_uint32,
                                         C.POINTER(C.c_void_p)]
    ws.WSALookupServiceBeginW.restype = C.c_int
    ws.WSALookupServiceNextW.argtypes = [C.c_void_p, C.c_uint32,
                                        C.POINTER(C.c_uint32), C.POINTER(QuerySet)]
    ws.WSALookupServiceNextW.restype = C.c_int
    ws.WSALookupServiceEnd.argtypes = [C.c_void_p]
    ws.WSALookupServiceEnd.restype = C.c_int
    endpoint = SockaddrBth()
    endpoint.family = AF_BTH
    endpoint.address = int(address, 16)
    context = C.create_unicode_buffer(256)
    length = C.c_uint32(256)
    if ws.WSAAddressToStringW(C.byref(endpoint), C.sizeof(endpoint), None,
                              context, C.byref(length)):
        raise OSError(ws.WSAGetLastError(), "Cannot format target address")
    # Specific standard UUID queries can find identification records that have
    # no L2CAP protocol descriptor. They do not open an application channel.
    service = Guid.from_buffer_copy(uuid.UUID(SERVICE_QUERIES[service_query]).bytes_le)
    query = QuerySet()
    query.size = C.sizeof(query)
    query.service_class = C.pointer(service)
    query.namespace = 16  # NS_BTH
    query.context = context.value
    lookup = C.c_void_p()
    result = {"at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "query": service_query + " SDP with LUP_FLUSHCACHE",
              "query_uuid": SERVICE_QUERIES[service_query], "live_query_requested": True,
              "vehicle_application_commands_sent": 0, "records": []}
    if ws.WSALookupServiceBeginW(C.byref(query), 0x1000, C.byref(lookup)):
        result.update(outcome="discovery_error_inconclusive", winsock_error=ws.WSAGetLastError())
        return result
    try:
        capacity = 65536
        for _ in range(64):
            buffer = C.create_string_buffer(capacity)
            size = C.c_uint32(capacity)
            found = C.cast(buffer, C.POINTER(QuerySet))
            found.contents.size = C.sizeof(QuerySet)
            # LUP_RETURN_NAME | LUP_RETURN_BLOB
            rc = ws.WSALookupServiceNextW(lookup, 0x10 | 0x200, C.byref(size), found)
            if rc:
                error = ws.WSAGetLastError()
                if error in (10102, 10110):  # WSAENOMORE / WSA_E_NO_MORE
                    result["outcome"] = "discovery_complete"
                    return result
                if error == 10014 and capacity < size.value <= 1048576:
                    capacity = size.value
                    continue
                result.update(outcome="discovery_error_inconclusive", winsock_error=error)
                return result
            item = {"reported_name": found.contents.name}
            if found.contents.blob:
                blob = found.contents.blob.contents
                base = C.addressof(buffer)
                if not blob.data or not (base <= blob.data <= base + capacity) or blob.size > base + capacity - blob.data:
                    raise ValueError("SDP blob lies outside the returned buffer")
                raw = C.string_at(blob.data, blob.size)
                item["raw_sdp_hex"] = raw.hex()
                try:
                    item.update(decode(raw))
                except (ValueError, TypeError, KeyError) as exc:
                    item["decode_error"] = type(exc).__name__
            result["records"].append(item)
        result["outcome"] = "record_limit_inconclusive"
        return result
    finally:
        ws.WSALookupServiceEnd(lookup)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--address", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--service-query", choices=SERVICE_QUERIES, default="l2cap")
    args = parser.parse_args()
    try:
        result = discover(args.address, args.service_query)
    except Exception as exc:
        result = {"outcome": "local_discovery_error_inconclusive", "error_type": type(exc).__name__,
                  "error": str(exc), "records": []}
    args.out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({"outcome": result["outcome"], "record_count": len(result["records"]),
                      "winsock_error": result.get("winsock_error")}))
