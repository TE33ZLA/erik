"""Collect existing evidence and run offline worker checks; no car contact."""
import datetime
import hashlib
import io
import json
import struct
from pathlib import Path
import subprocess
import sys
import unittest
import zipfile

root=Path(__file__).resolve().parent
sys.path.insert(0,str(root/'transport'))
import test_visit_worker
import test_obex_control

def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def latest(name, predicate):
    def bound(d):
        identity=d.get('execution',{})
        return identity.get('executable_sha256')==digest(root/'VehicleMediaBridge.exe') and identity.get('kit_manifest_sha256')==digest(root/'kit-manifest.json')
    found=[p for p in sorted((root/'results').glob('*/'+name)) if bound(read(p)) and predicate(read(p))]
    if not found:raise RuntimeError('Missing successful evidence: '+name)
    return found[-1]

manifest=read(root/'kit-manifest.json')
for name,expected in manifest.items():
    if digest(root/name)!=expected:raise RuntimeError('Kit changed: '+name)

stream=io.StringIO()
suite=unittest.TestSuite([unittest.defaultTestLoader.loadTestsFromModule(m) for m in (test_visit_worker,test_obex_control)])
result=unittest.TextTestRunner(stream=stream,verbosity=2).run(suite)
(root/'results'/'worker-tests.txt').write_text(stream.getvalue(),encoding='utf-8')
if not result.wasSuccessful():raise RuntimeError('Offline worker checks failed')
subprocess.run([sys.executable,'-B',str(root/'verify_vector.py')],check=True,timeout=15)

proofs={
 'internal_protocol_and_prompt_tests':latest('internal-tests.json',lambda d:bool(d.get('passed'))),
 'actual_guided_local_preflight':latest('guided-preflight.json',lambda d:d.get('passed') is True),
 'actual_windows_loopback':latest('windows-loopback.json',lambda d:d.get('passed') is True and d.get('full_frame') is True and d.get('metadata_update_verified_locally') is True),
}
scenarios=('complete','discovery-failure','cancel','deadline','worker-cancel','visit-timeout','double-click','slow-human','serial-early-close','audio-unverified','windows-guided')
for scenario in scenarios:
    proofs['guided_fixture_'+scenario]=latest('guided-rehearsal.json',lambda d:d.get('passed') is True and d.get('scenario')==scenario)
loop=read(proofs['actual_windows_loopback'])
rows=[json.loads(line) for line in (proofs['actual_windows_loopback'].parent/'events.jsonl').read_text().splitlines() if line.strip()]
events=[r for r in rows if r['type']=='loopback_event']
buttons=[r['detail']['button'] for r in events]
assert buttons==loop['events'] and len(buttons)==loop['symbols_sent']
bits=''.join({'Next':'1','Previous':'0'}[b] for b in buttons)
assert bits[:16]==bits[-16:]=='0111111001111110'
payload=bits[16:-16]; unstuffed='';ones=0;index=0
while index<len(payload):
    bit=payload[index];index+=1;unstuffed+=bit;ones=ones+1 if bit=='1' else 0
    if ones==5:
        assert payload[index]=='0';index+=1;ones=0
assert len(unstuffed)%8==0
packet_bytes=bytes(int(unstuffed[i:i+8],2) for i in range(0,len(unstuffed),8))
assert packet_bytes.hex().upper()==read(root/'results'/'independent-vector.json')['expected']
value=struct.unpack('>i',packet_bytes[11:15])[0]
assert loop['decoded_test_values']==[value]
event_span=(events[-1]['detail']['monotonic_ms']-events[0]['detail']['monotonic_ms'])/1000
report={
 'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'readiness':'Prepared for bounded connection experiment; vehicle-data retrieval remains blocked',
 'kit_manifest_sha256':digest(root/'kit-manifest.json'),
 'gui_executable_sha256':digest(root/'Media Bridge.exe'),
 'console_executable_sha256':digest(root/'VehicleMediaBridge.exe'),
 'manifest_verified':True,
 'internal_test_groups':len(read(proofs['internal_protocol_and_prompt_tests'])['passed']),'offline_worker_tests':result.testsRun,'offline_worker_tests_passed':result.wasSuccessful(),
 'guided_rehearsal_scenarios':len(scenarios),
 'windows_loopback':{'events':len(events),'decoded_synthetic_value':value,'metadata_update':loop['metadata_update_verified_locally'],'bluetooth_tested':loop['bluetooth_tested'],'measured_first_to_last_callback_seconds':event_span,'independent_recorded_event_decode_verified':True},
 'source_evidence':{k:str(v.relative_to(root)).replace('\\','/') for k,v in proofs.items()},
 'limits':{'car_contact_in_preparation':False,'verified_vehicle_reading':False,'usb_vehicle_connection_verified':False,'radio_helper_available':False,'iphone_tested':False,'other_cars_validated':False},
 'build_binding':'Every selected C# result must carry the current executable and kit-manifest hashes; collection fails on a missing or different identity. These are self-recorded hashes, not external attestation.',
 'observed_preparation_failures':['Windows media-session manager and audio endpoint enumeration are unavailable in the restricted tool context; checks were run in normal desktop context without service changes.'],
}
(root/'FINAL-VALIDATION.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

historical=[root.parent.parent/'work/golf-package-review-0.1.1/golf-windows-prototype/results/20260925T063044581486Z-ready/private-capture.json',root.parent/'Golf-Visit/results/20260926T050638-81655b24/private-listen-efeef2ee.json']
history=[]
for index,path in enumerate(historical):
    capture=read(path)
    # These two original captures were inspected: no address, no received payload.
    assert capture.get('received_bytes')==0 and capture.get('hex')==''
    history.append({'archive_path':'historical-raw/capture-'+str(index)+'.json','original_relative_path':str(path.relative_to(root.parent.parent)).replace('\\','/'),'sha256':digest(path),'recorded_at_utc':capture['at_utc'],'end_reason':capture['end_reason'],'note':'Original saved bytes, fingerprinted now; not signed at capture time or independently authenticated.'})
(root/'HISTORICAL-EVIDENCE.json').write_text(json.dumps(history,indent=2),encoding='utf-8')
packet=root.parent/'Golf-connection-review-revised-2026-09-27.zip'
with zipfile.ZipFile(packet,'w',compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.iterdir()):
        if path.is_file() and (path.suffix in ('.cs','.md','.exe','.png','.ps1') or path.name in ('verify_vector.py','kit-manifest.json','FINAL-VALIDATION.json','HISTORICAL-EVIDENCE.json','finalize_review.py')):
            archive.write(path,'Media-Bridge/'+path.name)
    for path in sorted((root/'transport').glob('*.py')):archive.write(path,'Media-Bridge/transport/'+path.name)
    included=set()
    def add(path):
        relative='Media-Bridge/'+str(path.relative_to(root)).replace('\\','/')
        if relative not in included:archive.write(path,relative);included.add(relative)
    for path in proofs.values():
        # Selected folders contain only local/fixture evidence, never live-car raw records.
        for artifact in path.parent.glob('*'):
            if artifact.is_file():add(artifact)
    for name in ('independent-vector.json','worker-tests.txt','laptop-usb-audit.json','laptop-usb-audit-current.json','prepared-usb-inventory.json','prepared-local-check.json'):
        add(root/'results'/name)
    for path,item in zip(historical,history):archive.write(path,item['archive_path'])
    for relative in ('golf-live-test-2026-09-25/RESULT.md',
                     'Golf-Visit/results/20260926T050638-81655b24/fallbacks-051333/RESULT.md',
                     'Golf-Visit/results/20260926T084433-8f4d3ebf/REVIEW.md',
                     'golf-music-channel-investigation-2026-09-27.md',
                     'golf-usb-route-review-2026-09-27.md'):
        path=root.parent/relative
        if path.is_file():archive.write(path,relative)
print(json.dumps({'review_packet':str(packet),'manifest_verified':True,'worker_tests_passed':result.testsRun,'evidence_groups':len(proofs),'sha256':digest(packet)},indent=2))
