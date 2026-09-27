"""Independent Python reference for the desktop protocol's known packet."""
import json
import struct
import subprocess
import zlib
from pathlib import Path

root = Path(__file__).resolve().parent
body = bytes.fromhex('d3910101') + struct.pack('>IHBi', 0x12345678, 1, 1, 1234)
expected = (body + struct.pack('>I', zlib.crc32(body))).hex().upper()
actual = subprocess.check_output([str(root / 'VehicleMediaBridge.exe'), '--vector'], text=True, timeout=10).strip()
if actual != expected:
    raise RuntimeError(f'Independent vector mismatch: {actual} != {expected}')
report = dict(passed=True, expected=expected, actual=actual,
              reference='Python standard-library struct and zlib', car_contact=False,
              vehicle_reading_verified=False)
(root / 'results').mkdir(exist_ok=True)
(root / 'results' / 'independent-vector.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('Independent packet check passed')
