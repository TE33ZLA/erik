"""One bounded phase of the guided visit. Local phases never contact the car.

Live phases need --run, a historically pinned peer, and current authenticated
pairing. The GUI additionally requires parked confirmation and imposes process
deadlines. No application requests, USB writes, firmware or driver changes.
"""
import argparse
import ctypes as C
import datetime
import hashlib
import json
from pathlib import Path
import sys
from paired import windows_bluetooth
from golf_sdp_discovery import discover
from golf_rfcomm_probe import probe

ROOT = Path(__file__).resolve().parent.parent

def save(path, value):
    path = Path(path)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, indent=2), encoding='utf-8')
    temp.replace(path)

def usb_snapshot():
    """Present USB nodes via SetupAPI; no enumeration of remote car services."""
    from ctypes import wintypes as W
    class Info(C.Structure):
        _fields_ = [('size', W.DWORD), ('guid', C.c_byte * 16),
                    ('devinst', W.DWORD), ('reserved', C.c_size_t)]
    dll = C.WinDLL('setupapi', use_last_error=True)
    dll.SetupDiGetClassDevsW.argtypes = [C.c_void_p, W.LPCWSTR, W.HWND, W.DWORD]
    dll.SetupDiGetClassDevsW.restype = W.HANDLE
    dll.SetupDiEnumDeviceInfo.argtypes = [W.HANDLE, W.DWORD, C.POINTER(Info)]
    dll.SetupDiEnumDeviceInfo.restype = W.BOOL
    dll.SetupDiGetDeviceInstanceIdW.argtypes = [W.HANDLE, C.POINTER(Info), W.LPWSTR, W.DWORD, C.POINTER(W.DWORD)]
    dll.SetupDiGetDeviceInstanceIdW.restype = W.BOOL
    dll.SetupDiGetDeviceRegistryPropertyW.argtypes = [W.HANDLE, C.POINTER(Info), W.DWORD, C.POINTER(W.DWORD), C.c_void_p, W.DWORD, C.POINTER(W.DWORD)]
    dll.SetupDiGetDeviceRegistryPropertyW.restype = W.BOOL
    dll.SetupDiDestroyDeviceInfoList.argtypes = [W.HANDLE]
    dll.SetupDiDestroyDeviceInfoList.restype = W.BOOL
    handle = dll.SetupDiGetClassDevsW(None, None, None, 6)
    if handle == C.c_void_p(-1).value:
        raise C.WinError(C.get_last_error())
    devices = []
    try:
        for index in range(4096):
            info = Info(); info.size = C.sizeof(Info)
            if not dll.SetupDiEnumDeviceInfo(handle, index, C.byref(info)):
                if C.get_last_error() != 259:
                    raise C.WinError(C.get_last_error())
                return devices
            identity = C.create_unicode_buffer(4096)
            if not dll.SetupDiGetDeviceInstanceIdW(handle, C.byref(info), identity, len(identity), None):
                raise C.WinError(C.get_last_error())
            def prop(number):
                value = C.create_unicode_buffer(4096)
                if dll.SetupDiGetDeviceRegistryPropertyW(handle, C.byref(info), number, None, value, C.sizeof(value), None):
                    return value.value
                return ''
            name = prop(12) or prop(0)
            if identity.value.upper().startswith('USB\\') or 'USB' in prop(7).upper():
                devices.append({'id_hash': hashlib.sha256(identity.value.encode()).hexdigest(),
                                'name': name, 'class': prop(7)})
        raise RuntimeError('Device enumeration limit reached; result incomplete')
    finally:
        dll.SetupDiDestroyDeviceInfoList(handle)

def select_target(pin, peers):
    address = str(pin.get('address', '')).upper()
    if len(address) != 12 or any(c not in '0123456789ABCDEF' for c in address):
        raise ValueError('Saved Golf identity is missing or invalid')
    matches = [p for p in peers if p.get('address', '').upper() == address and p.get('authenticated')]
    if len(matches) != 1:
        raise ValueError('Previously tested Golf is not uniquely present in authenticated pairing records. Reconnect using Windows Bluetooth settings.')
    return matches[0]

def serial_channel(result):
    if result.get('outcome') != 'discovery_complete':
        raise ValueError('Service discovery did not finish; no cached channel will be guessed')
    channels = set()
    for r in result.get('records', []):
        if not isinstance(r, dict) or r.get('decode_error') or not isinstance(r.get('service_classes'), list):
            raise ValueError('An SDP record was not fully decoded; serial service uniqueness is unknown')
        classes = [str(x).lower().replace('-', '') for x in r.get('service_classes', [])]
        if any(x in ('1101', '00001101', '0000110100001000800000805f9b34fb') for x in classes):
            n = r.get('rfcomm_channel')
            if type(n) is not int or not 1 <= n <= 30:
                raise ValueError('Serial service has an invalid channel')
            channels.add(n)
    if len(channels) != 1:
        raise ValueError('No single unambiguous serial service; no connection attempted')
    return next(iter(channels))

def run(args):
    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
    if args.mode == 'usb':
        return {'outcome': 'usb_inventory_saved', 'devices': usb_snapshot(),
                'car_contact_requested': False, 'vehicle_reading_verified': False}
    pin = json.loads((ROOT / 'private-target.json').read_text(encoding='utf-8-sig'))
    radio, peers = windows_bluetooth()
    target = select_target(pin, peers)
    if not radio:
        raise ValueError('Windows Bluetooth radio unavailable')
    if args.mode == 'preflight':
        return {'outcome': 'local_ready', 'radio_available': radio,
                'target_pairing_found': True, 'windows_reports_connected': target['connected'],
                'car_contact_requested': False, 'vehicle_reading_verified': False,
                'note': 'Windows connection flag is not proof of media routing or vehicle data.'}
    if not args.run:
        raise ValueError('Live discovery/listening requires an explicit --run')
    if args.mode == 'sdp':
        result = discover(target['address'], 'public-browse')
        result['target_hash'] = hashlib.sha256(target['address'].encode()).hexdigest()
        return result
    services = json.loads((out.parent / 'private-services.json').read_text(encoding='utf-8'))
    if services.get('target_hash') != hashlib.sha256(target['address'].encode()).hexdigest():
        raise ValueError('Service record does not match the paired Golf')
    # Fresh result must belong to this visit and be less than two minutes old.
    age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(services['at_utc'])
    if not 0 <= age.total_seconds() <= 120:
        raise ValueError('Service discovery is stale; a new visit is needed')
    channel = serial_channel(services)
    def connected():
        save(out.parent / 'serial-status.json', {'connected': True, 'at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'listen_seconds': 50})
    def chunk(data, metadata):
        with (out.parent / 'private-serial-chunks.jsonl').open('a', encoding='utf-8') as stream:
            stream.write(json.dumps(dict(metadata, hex=data.hex())) + '\n')
            stream.flush()
    return probe(target['address'], channel, connect_seconds=10, receive_seconds=50,
                 on_connected=connected, on_chunk=chunk)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['preflight', 'usb', 'sdp', 'serial'])
    parser.add_argument('--out', required=True)
    parser.add_argument('--run', action='store_true')
    args = parser.parse_args()
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        result = run(args)
        code = 0
    except Exception as exc:
        result = {'outcome': 'phase_failed_inconclusive', 'error': str(exc),
                  'error_type': type(exc).__name__, 'vehicle_reading_verified': False}
        code = 2
    result.update(started_utc=started, completed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), mode=args.mode)
    result['execution'] = {'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                           'kit_manifest_sha256': hashlib.sha256((ROOT/'kit-manifest.json').read_bytes()).hexdigest(),
                           'python_version': sys.version}
    save(args.out, result)
    return code

if __name__ == '__main__':
    sys.exit(main())
