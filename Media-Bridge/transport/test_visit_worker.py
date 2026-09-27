"""Offline transport boundary tests; no Bluetooth connections."""
import json
import socket
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
import visit_worker as worker
from golf_rfcomm_probe import receive_only, probe

def service(channel=5):
    return {'outcome': 'discovery_complete', 'records': [{'service_classes': ['1101'], 'rfcomm_channel': channel}]}

class WorkerTests(unittest.TestCase):
    def test_serial_discovery_gates(self):
        self.assertEqual(worker.serial_channel(service()), 5)
        for result in [dict(service(), outcome='discovery_error_inconclusive'),
                       {'outcome': 'discovery_complete', 'records': []}, service(True), service(0), service(31),
                       {'outcome': 'discovery_complete', 'records': service(5)['records'] + service(6)['records']}]:
            with self.assertRaises(ValueError): worker.serial_channel(result)

    def test_wrong_profile_not_used(self):
        result = service(); result['records'][0]['service_classes'] = ['1105']
        with self.assertRaises(ValueError): worker.serial_channel(result)

    def test_partial_record_makes_unique_channel_unprovable(self):
        for unknown in [{'decode_error':'ValueError'}, {}, {'service_classes':None}]:
            result=service(); result['records'].append(unknown)
            with self.assertRaises(ValueError):worker.serial_channel(result)

    def test_full_uuid_serial_recognized(self):
        result = service(); result['records'][0]['service_classes'] = ['00001101-0000-1000-8000-00805f9b34fb']
        self.assertEqual(worker.serial_channel(result), 5)

    def test_pairing_identity_not_name_guess(self):
        pin = {'address': 'AABBCCDDEEFF'}
        peer = {'address': pin['address'], 'authenticated': True, 'connected': False}
        self.assertEqual(worker.select_target(pin, [peer]), peer)
        for peers in [[], [dict(peer, authenticated=False)], [dict(peer, address='001122334455', name='Eriks Golf')], [peer, peer]]:
            with self.assertRaises(ValueError): worker.select_target(pin, peers)

    def test_live_opt_in_is_required(self):
        class Args: mode='sdp'; run=False; out='unused.json'
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); (root/'private-target.json').write_text('{"address":"AABBCCDDEEFF"}')
            with patch.object(worker, 'ROOT', root), patch.object(worker, 'windows_bluetooth', return_value=(True,[{'address':'AABBCCDDEEFF','authenticated':True}])), patch.object(worker,'discover') as discover:
                with self.assertRaises(ValueError):worker.run(Args())
                discover.assert_not_called()

    def test_receive_chunks_survive_before_return(self):
        a,b=socket.socketpair()
        with a,b:
            b.sendall(b'\x00abc'); b.shutdown(socket.SHUT_WR)
            chunks=[]
            result=receive_only(a,.5,on_chunk=lambda data, meta: chunks.append((data,meta)))
            self.assertEqual(result['received_bytes'],4)
            self.assertEqual(b''.join(x[0] for x in chunks),b'\x00abc')
            self.assertEqual(result['end_reason'],'remote_closed')
            b.settimeout(.2); self.assertRaises(TimeoutError,b.recv,1)  # no application reply

    def test_silent_receive_has_deadline(self):
        a,b=socket.socketpair()
        with a,b:
            start=time.monotonic(); result=receive_only(a,.05)
            self.assertLess(time.monotonic()-start,.5)
            self.assertEqual(result['received_bytes'],0)
            self.assertEqual(result['end_reason'],'receive_deadline')

    def test_receive_limit(self):
        a,b=socket.socketpair()
        with a,b:
            b.sendall(b'abcdefgh')
            result=receive_only(a,.2,byte_limit=3)
            self.assertEqual(result['hex'],'616263')
            self.assertEqual(result['end_reason'],'byte_limit')

    def test_invalid_socket_inputs_do_not_contact(self):
        with self.assertRaises(ValueError):probe('not a peer',5)
        with self.assertRaises(ValueError):probe('AABBCCDDEEFF',31)

    def test_atomic_save(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'test.json';worker.save(path,{'received':0})
            self.assertEqual(json.loads(path.read_text()),{'received':0})
            self.assertFalse(path.with_suffix('.json.tmp').exists())

if __name__=='__main__':unittest.main()
