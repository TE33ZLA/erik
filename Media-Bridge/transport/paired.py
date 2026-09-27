"""Cached paired-device lookup; no RF inquiry. Reused from the local scanner."""
import ctypes
import sys
import json

def windows_bluetooth():
    """Read radio availability and cached Classic device names; no RF inquiry."""
    if sys.platform != "win32":
        return None, []
    from ctypes import wintypes as w

    class SystemTime(ctypes.Structure):
        _fields_ = [(name, w.WORD) for name in ("year", "month", "weekday", "day", "hour", "minute", "second", "milliseconds")]

    class Search(ctypes.Structure):
        _fields_ = [("size", w.DWORD), ("authenticated", w.BOOL),
                    ("remembered", w.BOOL), ("unknown", w.BOOL),
                    ("connected", w.BOOL), ("inquiry", w.BOOL),
                    ("timeout", ctypes.c_ubyte), ("radio", w.HANDLE)]

    class Device(ctypes.Structure):
        _fields_ = [("size", w.DWORD), ("address", ctypes.c_ulonglong),
                    ("device_class", w.ULONG), ("connected", w.BOOL),
                    ("remembered", w.BOOL), ("authenticated", w.BOOL),
                    ("last_seen", SystemTime), ("last_used", SystemTime),
                    ("name", w.WCHAR * 248)]

    class RadioSearch(ctypes.Structure):
        _fields_ = [("size", w.DWORD)]

    dll = ctypes.WinDLL("bthprops.cpl", use_last_error=True)
    def api(name, args, result):
        fn = getattr(dll, name)
        fn.argtypes, fn.restype = args, result
        return fn
    first_radio = api("BluetoothFindFirstRadio", [ctypes.POINTER(RadioSearch), ctypes.POINTER(w.HANDLE)], w.HANDLE)
    close_radio_find = api("BluetoothFindRadioClose", [w.HANDLE], w.BOOL)
    radio = w.HANDLE()
    params = RadioSearch(ctypes.sizeof(RadioSearch))
    handle = first_radio(ctypes.byref(params), ctypes.byref(radio))
    available = bool(handle)
    if handle:
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.CloseHandle.argtypes = [w.HANDLE]
        kernel.CloseHandle.restype = w.BOOL
        kernel.CloseHandle(radio)
        close_radio_find(handle)
    elif ctypes.get_last_error() not in (0, 259):
        raise ctypes.WinError(ctypes.get_last_error())
    first = api("BluetoothFindFirstDevice", [ctypes.POINTER(Search), ctypes.POINTER(Device)], w.HANDLE)
    next_device = api("BluetoothFindNextDevice", [w.HANDLE, ctypes.POINTER(Device)], w.BOOL)
    close = api("BluetoothFindDeviceClose", [w.HANDLE], w.BOOL)
    search = Search(ctypes.sizeof(Search), True, True, False, True, False, 0, None)
    device = Device()
    device.size = ctypes.sizeof(Device)
    handle = first(ctypes.byref(search), ctypes.byref(device))
    result = []
    if not handle:
        if ctypes.get_last_error() not in (0, 259):
            raise ctypes.WinError(ctypes.get_last_error())
        return available, result
    try:
        while True:
            if device.authenticated:
                result.append({"address": f"{device.address:012X}", "name": device.name,
                               "connected": bool(device.connected), "authenticated": bool(device.authenticated)})
            device.size = ctypes.sizeof(Device)
            if not next_device(handle, ctypes.byref(device)):
                if ctypes.get_last_error() not in (0, 259):
                    raise ctypes.WinError(ctypes.get_last_error())
                break
    finally:
        close(handle)
    return available, result

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    p=argparse.ArgumentParser()
    p.add_argument('--out',required=True,type=Path)
    args=p.parse_args()
    try:
        radio,peers=windows_bluetooth()
        addresses=sorted({d['address'] for d in peers if d['name']=='Eriks Golf'})
        result={'outcome':'local_ready','addresses':addresses,'radio_available':radio,
                'peer_contacted':False,'inquiry_requested':False,'source':'Windows cached Bluetooth API'}
    except Exception as e:
        result={'outcome':'local_check_failed','error_type':type(e).__name__,'error':str(e)}
    args.out.write_text(json.dumps(result,indent=2),encoding='utf-8')
