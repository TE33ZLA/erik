"""Control experiment: does the radio answer this laptop at the application
layer on any RFCOMM service?

Channel 5 (Serial Port) never replied. This sends one standard OBEX CONNECT
handshake (7 bytes) to the radio's advertised Object Push service and records
the reply, then a DISCONNECT. Every OBEX server answers a CONNECT with a
response code, even a refusal. No object is pushed and nothing is stored on
the radio.

A reply here shows the radio's application layer talks to this laptop, so the
serial silence is specific to that service. Silence or refusal here too
suggests the radio only serves its connected phone. Neither outcome is
vehicle data.

Same discipline as visit_worker: pinned authenticated peer, fresh discovery,
one unambiguous channel, explicit --run, bounded deadlines.
"""
import argparse
import ctypes
import datetime
import hashlib
import json
import select
import socket
import struct
import sys
from pathlib import Path
from golf_rfcomm_probe import SockaddrBth, AF_BTH, BTHPROTO_RFCOMM, SO_BTH_AUTHENTICATE, SO_BTH_ENCRYPT

ROOT = Path(__file__).resolve().parent.parent

OBEX_CONNECT = 0x80
OBEX_DISCONNECT = 0x81
OBEX_HEADER_CONNECTION_ID = 0xCB
OBEX_PUSH_CLASSES = ('1105', '00001105', '0000110500001000800000805f9b34fb')

CONNECT_REQUEST = struct.pack('>BHBBH', OBEX_CONNECT, 7, 0x10, 0x00, 0x2000)

RESPONSE_MEANING = {
    0xA0: 'OK: the radio accepted an OBEX session from this laptop',
    0xC0: 'Bad request',
    0xC1: 'Unauthorized',
    0xC3: 'Forbidden: the radio refused this laptop at the application layer',
    0xC6: 'Not acceptable',
    0xCF: 'Unsupported media type',
    0xD0: 'Internal server error',
    0xD1: 'Not implemented',
    0xD3: 'Service unavailable',
}


def obex_push_channel(result):
    """Exactly one decodable OBEX Object Push record, or no connection."""
    if result.get('outcome') != 'discovery_complete':
        raise ValueError('Service discovery did not finish; no cached channel will be guessed')
    channels = set()
    for r in result.get('records', []):
        if not isinstance(r, dict) or r.get('decode_error') or not isinstance(r.get('service_classes'), list):
            raise ValueError('An SDP record was not fully decoded; Object Push uniqueness is unknown')
        classes = [str(x).lower().replace('-', '') for x in r['service_classes']]
        if any(x in OBEX_PUSH_CLASSES for x in classes):
            n = r.get('rfcomm_channel')
            if type(n) is not int or not 1 <= n <= 30:
                raise ValueError('Object Push service has an invalid channel')
            channels.add(n)
    if len(channels) != 1:
        raise ValueError('No single unambiguous Object Push service; no connection attempted')
    return next(iter(channels))


def parse_obex_response(data):
    """Decode one OBEX response packet; raises ValueError on a malformed one."""
    if len(data) < 3:
        raise ValueError('Response shorter than an OBEX header')
    code, length = data[0], struct.unpack('>H', data[1:3])[0]
    if not code & 0x80:
        raise ValueError('Response lacks the OBEX final bit')
    if length < 3 or length > len(data):
        raise ValueError('Response length field does not match the received bytes')
    parsed = {'code': code, 'length': length, 'meaning': RESPONSE_MEANING.get(code, 'Other OBEX response code'),
              'connection_id': None}
    cursor = 3
    if length >= 7:
        parsed['obex_version'], parsed['flags'], parsed['max_packet'] = struct.unpack('>BBH', data[3:7])
        cursor = 7
    # Only the Connection ID header is decoded; other headers are kept raw.
    while cursor < length:
        header = data[cursor]
        if header == OBEX_HEADER_CONNECTION_ID and cursor + 5 <= length:
            parsed['connection_id'] = struct.unpack('>I', data[cursor + 1:cursor + 5])[0]
            cursor += 5
        else:
            parsed['undecoded_headers_hex'] = data[cursor:length].hex()
            break
    return parsed


def disconnect_request(connection_id):
    if connection_id is None:
        return struct.pack('>BH', OBEX_DISCONNECT, 3)
    return struct.pack('>BHBI', OBEX_DISCONNECT, 8, OBEX_HEADER_CONNECTION_ID, connection_id)


def receive_packet(sock, seconds):
    """One OBEX packet, or whatever arrived before the deadline."""
    import time
    end = time.monotonic() + seconds
    data = bytearray()
    while time.monotonic() < end:
        ready, _, _ = select.select([sock], [], [], max(0, end - time.monotonic()))
        if not ready:
            break
        try:
            chunk = sock.recv(4096)
        except BlockingIOError:
            continue
        if not chunk:
            return bytes(data), 'remote_closed'
        data.extend(chunk)
        if len(data) >= 3 and len(data) >= struct.unpack('>H', data[1:3])[0]:
            return bytes(data), 'packet_complete'
    return bytes(data), 'deadline'


def exchange(sock, response_seconds=8):
    """CONNECT, read the reply, DISCONNECT. Works on any connected stream socket."""
    result = {'request_hex': CONNECT_REQUEST.hex(), 'application_bytes_sent': len(CONNECT_REQUEST),
              'objects_pushed': 0}
    _, writable, _ = select.select([], [sock], [], response_seconds)
    if not writable:
        result.update(outcome='send_not_possible_inconclusive')
        return result
    sock.sendall(CONNECT_REQUEST)
    data, end = receive_packet(sock, response_seconds)
    result.update(response_hex=data.hex(), receive_end=end)
    if not data:
        result.update(outcome='connected_no_reply_inconclusive')
        return result
    try:
        parsed = parse_obex_response(data)
    except ValueError as exc:
        result.update(outcome='reply_not_obex', parse_error=str(exc))
        return result
    result.update(response=parsed, outcome='obex_reply_received')
    bye = disconnect_request(parsed['connection_id'])
    try:
        sock.sendall(bye)
        result['application_bytes_sent'] += len(bye)
        farewell, _ = receive_packet(sock, 3)
        result['disconnect_response_hex'] = farewell.hex()
    except OSError as exc:
        result['disconnect_error'] = str(exc)
    return result


def connect_rfcomm(address, channel, connect_seconds):
    """Authenticated, encrypted RFCOMM connection; mirrors golf_rfcomm_probe.probe."""
    winsock = ctypes.WinDLL('Ws2_32.dll')
    winsock.connect.argtypes = [ctypes.c_size_t, ctypes.c_void_p, ctypes.c_int]
    winsock.connect.restype = ctypes.c_int
    winsock.WSAGetLastError.restype = ctypes.c_int
    sock = socket.socket(AF_BTH, socket.SOCK_STREAM, BTHPROTO_RFCOMM)
    try:
        for option in (SO_BTH_AUTHENTICATE, SO_BTH_ENCRYPT):
            sock.setsockopt(BTHPROTO_RFCOMM, ctypes.c_int32(option).value, struct.pack('<I', 1))
        sock.setblocking(False)
        endpoint = SockaddrBth()
        endpoint.family = AF_BTH
        endpoint.address = int(address, 16)
        endpoint.port = channel
        rc = winsock.connect(sock.fileno(), ctypes.byref(endpoint), ctypes.sizeof(endpoint))
        if rc:
            err = winsock.WSAGetLastError()
            if err not in (10035, 10036, 10037):
                raise OSError(err, 'connection_not_established')
            _, writable, exceptional = select.select([], [sock], [sock], connect_seconds)
            if not writable and not exceptional:
                raise TimeoutError('connect_timeout_inconclusive')
            err = sock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR)
            if err:
                raise OSError(err, 'connection_not_established')
        return sock
    except BaseException:
        sock.close()
        raise


def run(args):
    from paired import windows_bluetooth
    from golf_sdp_discovery import discover
    from visit_worker import select_target
    pin = json.loads((ROOT / 'private-target.json').read_text(encoding='utf-8-sig'))
    radio, peers = windows_bluetooth()
    target = select_target(pin, peers)
    if not radio:
        raise ValueError('Windows Bluetooth radio unavailable')
    if not args.run:
        raise ValueError('This control experiment requires an explicit --run at the parked car')
    services = discover(target['address'], 'public-browse')
    services['target_hash'] = hashlib.sha256(target['address'].encode()).hexdigest()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    (out.parent / 'private-services-control.json').write_text(json.dumps(services, indent=2), encoding='utf-8')
    channel = obex_push_channel(services)
    result = {'at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'transport': 'Classic Bluetooth RFCOMM', 'service': 'OBEX Object Push', 'channel': channel,
              'security_requested': 'Authentication and encryption required',
              'interpretation': 'Application-layer reachability only. Not vehicle data.'}
    sock = connect_rfcomm(target['address'], channel, connect_seconds=10)
    with sock:
        result['connected'] = True
        result.update(exchange(sock, response_seconds=8))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    parser.add_argument('--run', action='store_true')
    args = parser.parse_args()
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        result = run(args)
        code = 0
    except Exception as exc:
        result = {'outcome': 'control_failed_inconclusive', 'error': str(exc), 'error_type': type(exc).__name__}
        code = 2
    result.update(started_utc=started, completed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  vehicle_reading_verified=False,
                  execution={'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                             'python_version': sys.version})
    Path(args.out).write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k in ('outcome', 'connected', 'response', 'error')}))
    return code


if __name__ == '__main__':
    sys.exit(main())
