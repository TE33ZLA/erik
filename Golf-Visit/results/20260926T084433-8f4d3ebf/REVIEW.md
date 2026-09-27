# Actual Golf BLE comparison — 26 September 2026

The prepared on/off/on comparison completed. **No observed address followed the
required pattern, and no BLE service was identified as belonging to the Golf.**
This is an inconclusive search result, not proof that the car cannot expose BLE.
No vehicle-health field or iPhone API exchange was obtained.

| Owner-confirmed car state | Observation | Addresses observed |
|---|---|---:|
| On, parked, screen on | 20 seconds | 20 |
| Car and screen off | 30-second settling wait, then 20 seconds | 13 |
| Screen on again, Bluetooth reconnected | 10-second settling wait, then 20 seconds | 8 |

All three scans completed without a reported helper error. Raw advertisement
samples, service UUIDs, address types, signal ranges and timestamps were retained
locally. The strongest signal in the final scan was also present during the off
scan. No address matching the saved Classic target was observed. Neither fact
establishes ownership: Classic/BLE addresses can differ, radios can remain awake,
addresses can rotate, and nearby transmitters can appear intermittently.

The count drop from 20 to 13 to 8 is not a count of Golf devices. There were
human-action gaps between scans, including about seven minutes between the end
of the first scan and the start of the off-stage wait. The laptop cannot
independently verify the car power state or unchanged device positions.

No nearby device was connected for GATT inspection because none was independently
identified as the Golf. No serial protocol retries, recorder, administrator
prompt, firmware modification or characteristic reads/writes were performed in
this focused visit. The user was told the three observations were saved and the
car could be switched off; no additional car contact is required to review them.

The evidence does not provide a supported iPhone health-data route. A future
active request still requires an identified vehicle-side service and a documented
or validated request. Repeating these same observations is not a working fix.
