"""Bounded Windows RFCOMM receiver. No application data is transmitted.

Uses an owner-confirmed remote address from the private local evidence file.
The channel is a recorded cached endpoint, not an assertion of a live service.
No pairing keys, PIN guesses, protocol requests, or credential handling.
"""
import argparse
import ctypes
import datetime
import json
import select
import socket
import struct
import time
from pathlib import Path

AF_BTH = 32
BTHPROTO_RFCOMM = 3
SO_BTH_AUTHENTICATE = 0x80000001
SO_BTH_ENCRYPT = 0x00000002


class SockaddrBth(ctypes.Structure):
    # Microsoft's ws2bth.h wraps SOCKADDR_BTH in pshpack1.h.
    _pack_ = 1
    _fields_ = [("family", ctypes.c_uint16), ("address", ctypes.c_uint64),
                ("service", ctypes.c_ubyte * 16), ("port", ctypes.c_uint32)]


def receive_only(sock, seconds=30, byte_limit=65536, on_chunk=None):
    end = time.monotonic() + seconds
    received = bytearray()
    chunks = []
    reason = "receive_deadline"
    read_error = None
    while time.monotonic() < end and len(received) < byte_limit:
        ready, _, _ = select.select([sock], [], [], max(0, end-time.monotonic()))
        if not ready:
            break
        try:
            data = sock.recv(min(4096, byte_limit-len(received)))
        except BlockingIOError:
            continue
        except OSError as exc:
            reason = "receive_error"
            read_error = getattr(exc, "winerror", None) or exc.errno
            break
        if not data:
            reason = "remote_closed"
            break
        received.extend(data)
        chunks.append({"at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                       "bytes": len(data)})
        if on_chunk is not None:
            on_chunk(data, chunks[-1])
    if len(received) >= byte_limit:
        reason = "byte_limit"
    return {"received_bytes": len(received), "hex": received.hex(),
            "utf8_preview": received.decode("utf-8", errors="replace"),
            "chunks": chunks, "end_reason": reason,
            "receive_error": read_error,
            "interpretation": "Transport evidence only. No health field has been decoded."}


def declare_receive_ready(winsock, sock):
    """One standard RFCOMM modem-status signal; no application stream write.

    Layout/constants: Microsoft's WinSDK ws2bth.h, packed RFCOMM_COMMAND.
    MSC: EA + ready-to-communicate + ready-to-receive; no flow-off, call or break.
    A zero API return means Windows accepted it, not a car application reply.
    """
    payload = struct.pack("<IBB5x", 1, 0x0D, 0)
    command = ctypes.create_string_buffer(payload, len(payload))
    response = ctypes.create_string_buffer(11)
    count = ctypes.c_uint32()
    winsock.WSAIoctl.argtypes = [ctypes.c_size_t, ctypes.c_uint32, ctypes.c_void_p,
                                ctypes.c_uint32, ctypes.c_void_p, ctypes.c_uint32,
                                ctypes.POINTER(ctypes.c_uint32), ctypes.c_void_p,
                                ctypes.c_void_p]
    winsock.WSAIoctl.restype = ctypes.c_int
    rc = winsock.WSAIoctl(sock.fileno(), 0xD8000065, command, len(payload),
                         response, len(response), ctypes.byref(count), None, None)
    return {"kind": "RFCOMM MSC ready-to-communicate/receive; no break",
            "windows_accepted": rc == 0,
            "winsock_error": winsock.WSAGetLastError() if rc else None,
            "application_bytes_sent": 0,
            "peer_application_response_verified": False}


def probe(address, channel, connect_seconds=15, receive_seconds=30, signal_ready=False,
          on_connected=None, on_chunk=None):
    if len(address) != 12 or any(c not in "0123456789abcdefABCDEF" for c in address):
        raise ValueError("Expected the confirmed 12-hex-digit remote Bluetooth address")
    if not 1 <= channel <= 30:
        raise ValueError("RFCOMM channel must be 1 through 30")
    assert ctypes.sizeof(SockaddrBth) == 30
    assert SockaddrBth.address.offset == 2 and SockaddrBth.port.offset == 26
    winsock = ctypes.WinDLL("Ws2_32.dll")
    winsock.connect.argtypes = [ctypes.c_size_t, ctypes.c_void_p, ctypes.c_int]
    winsock.connect.restype = ctypes.c_int
    winsock.WSAGetLastError.restype = ctypes.c_int
    result = {"at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "transport": "Classic Bluetooth RFCOMM", "cached_channel": channel,
              "application_bytes_sent": 0, "connected": False,
              "note": "Normal Bluetooth connection/security signalling is still exchanged.",
              "target_source": "Owner-supplied address or local paired-device evidence",
              "security_requested": "Authentication and encryption required",
              "connect_deadline_seconds": connect_seconds,
              "receive_deadline_seconds": receive_seconds,
              "stage": "socket_setup"}
    # socket creation initializes Winsock through Python; no inquiry is performed.
    with socket.socket(AF_BTH, socket.SOCK_STREAM, BTHPROTO_RFCOMM) as sock:
        # Use the existing authorised pairing; require link authentication/encryption.
        # No insecure fallback if these options are unavailable.
        for option in (SO_BTH_AUTHENTICATE, SO_BTH_ENCRYPT):
            sock.setsockopt(BTHPROTO_RFCOMM, ctypes.c_int32(option).value,
                            struct.pack("<I", 1))
        sock.setblocking(False)
        endpoint = SockaddrBth()
        endpoint.family = AF_BTH
        endpoint.address = int(address, 16)
        endpoint.port = channel
        result["stage"] = "connect"
        rc = winsock.connect(sock.fileno(), ctypes.byref(endpoint), ctypes.sizeof(endpoint))
        if rc:
            err = winsock.WSAGetLastError()
            if err not in (10035, 10036, 10037):
                result.update(outcome="connection_not_established", winsock_error=err)
                return result
            _, writable, exceptional = select.select([], [sock], [sock], connect_seconds)
            if not writable and not exceptional:
                result["outcome"] = "connect_timeout_inconclusive"
                return result
            err = sock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR)
            if err:
                result.update(outcome="connection_not_established", winsock_error=err)
                return result
        result["connected"] = True
        if on_connected is not None:
            on_connected()
        if signal_ready:
            result["stage"] = "transport_receive_ready"
            result["receive_ready_signal"] = declare_receive_ready(winsock, sock)
            if not result["receive_ready_signal"]["windows_accepted"]:
                result["outcome"] = "ready_signal_not_accepted_inconclusive"
                return result
        result["stage"] = "receive"
        result.update(receive_only(sock, receive_seconds, on_chunk=on_chunk))
        result["outcome"] = "bytes_received" if result["received_bytes"] else "connected_silent_inconclusive"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path("work/golf-cached-pnp-private.json"))
    parser.add_argument("--address", help="Owner-confirmed target address, 12 hex digits (kept out of result)")
    parser.add_argument("--channel", type=int, default=5)
    parser.add_argument("--out", type=Path, default=Path("work/golf-rfcomm-result-private.json"))
    parser.add_argument("--run", action="store_true", help="Make one bounded connection attempt")
    parser.add_argument("--signal-ready", action="store_true",
                        help="Declare standard RFCOMM receive readiness before listening")
    args = parser.parse_args()
    if not args.run:
        print("Prepared only. Use --run when the owner and parked car are ready. No connection made.")
        return
    try:
        address = args.address
        if not address:
            cache = json.loads(args.cache.read_text(encoding="utf-8-sig"))
            address = cache["Address"]
        result = probe(address.replace(":", "").replace("-", ""), args.channel,
                       signal_ready=args.signal_ready)
    except Exception as exc:
        result = {"outcome": "probe_error_inconclusive", "error_type": type(exc).__name__,
                  "error": str(exc), "application_bytes_sent": 0}
    args.out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    # Keep received raw bytes and any identifiers out of console/exchange reports.
    print(json.dumps({k: v for k, v in result.items()
                      if k not in ("hex", "utf8_preview", "chunks")}))


if __name__ == "__main__":
    main()
