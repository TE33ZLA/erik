"""Offline tests for the OBEX control experiment; no Bluetooth connections."""
import socket
import struct
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
import golf_obex_control as control


def discovery(channel=3, classes=('1105',)):
    return {'outcome': 'discovery_complete', 'records': [{'service_classes': list(classes), 'rfcomm_channel': channel}]}


class ObexControlTests(unittest.TestCase):
    def test_connect_request_is_the_standard_seven_bytes(self):
        self.assertEqual(control.CONNECT_REQUEST.hex(), '80000710002000')

    def test_channel_selection_fails_closed(self):
        self.assertEqual(control.obex_push_channel(discovery()), 3)
        self.assertEqual(control.obex_push_channel(discovery(classes=['00001105-0000-1000-8000-00805f9b34fb'])), 3)
        bad = [dict(discovery(), outcome='discovery_error_inconclusive'),
               {'outcome': 'discovery_complete', 'records': []},
               discovery(classes=['1101']),
               discovery(0), discovery(31), discovery(True),
               {'outcome': 'discovery_complete', 'records': discovery(3)['records'] + discovery(4)['records']},
               {'outcome': 'discovery_complete', 'records': discovery()['records'] + [{'decode_error': 'ValueError'}]},
               {'outcome': 'discovery_complete', 'records': discovery()['records'] + [{}]}]
        for result in bad:
            with self.assertRaises(ValueError):
                control.obex_push_channel(result)

    def test_response_parsing(self):
        ok = control.parse_obex_response(bytes.fromhex('a0000710000400'))
        self.assertEqual((ok['code'], ok['max_packet'], ok['connection_id']), (0xA0, 1024, None))
        with_id = control.parse_obex_response(bytes.fromhex('a0000c10000400cb00000001'))
        self.assertEqual(with_id['connection_id'], 1)
        forbidden = control.parse_obex_response(bytes.fromhex('c30003'))
        self.assertIn('refused', forbidden['meaning'])
        for junk in (b'', b'\xa0', bytes.fromhex('20000710000400'), bytes.fromhex('a000ff10000400')):
            with self.assertRaises(ValueError):
                control.parse_obex_response(junk)

    def test_disconnect_carries_connection_id(self):
        self.assertEqual(control.disconnect_request(None).hex(), '810003')
        self.assertEqual(control.disconnect_request(7).hex(), '810008cb00000007')

    def exchange_against(self, reply, expect_disconnect=True):
        a, b = socket.socketpair()
        seen = {}

        def server():
            seen['connect'] = b.recv(64)
            if reply:
                b.sendall(reply)
                if expect_disconnect:
                    seen['disconnect'] = b.recv(64)
                    b.sendall(bytes.fromhex('a00003'))
            b.close()

        thread = threading.Thread(target=server)
        thread.start()
        with a:
            a.setblocking(False)
            result = control.exchange(a, response_seconds=1)
        thread.join(2)
        return result, seen

    def test_accepting_server_round_trip(self):
        result, seen = self.exchange_against(bytes.fromhex('a0000c10000400cb00000009'))
        self.assertEqual(seen['connect'], control.CONNECT_REQUEST)
        self.assertEqual(result['outcome'], 'obex_reply_received')
        self.assertEqual(result['response']['code'], 0xA0)
        self.assertEqual(seen['disconnect'].hex(), '810008cb00000009')
        self.assertEqual(result['application_bytes_sent'], 15)
        self.assertEqual(result['objects_pushed'], 0)

    def test_refusing_server_is_still_a_reply(self):
        result, _ = self.exchange_against(bytes.fromhex('c30003'))
        self.assertEqual(result['outcome'], 'obex_reply_received')
        self.assertEqual(result['response']['code'], 0xC3)

    def test_silent_server_is_inconclusive(self):
        result, _ = self.exchange_against(b'', expect_disconnect=False)
        self.assertEqual(result['outcome'], 'connected_no_reply_inconclusive')
        self.assertEqual(result['application_bytes_sent'], 7)

    def test_garbage_reply_is_not_obex(self):
        result, _ = self.exchange_against(b'hello', expect_disconnect=False)
        self.assertEqual(result['outcome'], 'reply_not_obex')

    def test_live_opt_in_is_required(self):
        class Args:
            run = False
            out = 'unused.json'
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'private-target.json').write_text('{"address":"AABBCCDDEEFF"}')
            with patch.object(control, 'ROOT', root), \
                 patch('paired.windows_bluetooth', return_value=(True, [{'address': 'AABBCCDDEEFF', 'authenticated': True}])), \
                 patch('golf_sdp_discovery.discover') as discover, \
                 patch.object(control, 'connect_rfcomm') as connect:
                with self.assertRaises(ValueError):
                    control.run(Args())
                discover.assert_not_called()
                connect.assert_not_called()


if __name__ == '__main__':
    unittest.main()
