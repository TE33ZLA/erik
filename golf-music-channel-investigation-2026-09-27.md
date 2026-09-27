# Music-control route: code investigation

## Result

No working vehicle-data request was found. This pass analysed the user's specific proposal: reuse music metadata and skip-button communication as the carrier for vehicle readings. It produced new static traces, not a car connection, iPhone build, or full firmware simulation.

The transport can represent media controls and metadata. A sensor source and a radio-side handler that exports it are still missing. Encoding an engine-data request as a song title does not, by itself, cause the radio to interpret it as a request.

## Software and limits

Input: `work/golf-button-investigation/CPU_HMI_OR.research-only.bin`, SHA-256 `c7ad7223a0229f0944e66a34537dcd8e740fccf946d2998d5ab3d1f55ebdb8be`.

This public June-2016 MSTD-family sample is NOT confirmed as the owner's 5G0035819A / HW40 / software0421. The existing Candidate analyser checks the hash, maps PE sections, finds literal references and disassembles SH-4 instructions. Literal pools are also printed as apparent instructions; only the reviewed code paths below inform the findings. No OEM code was executed. No recorder or car communication was started.

## New evidence

1. `0xa46d0`: the function labelled `CONNECTION_EventVendorDependentConStatusAvailable` checks a one-byte connection status, reads connection-state storage, records status and calls media-state helpers. Its name is not evidence of an arbitrary custom command channel. Not every callee was resolved, so this is not a whole-program absence claim.
2. `0xa0b24`: the capabilities-available handler checks service state and calls `0xa074c` and `0xa42dc`. The latter is labelled `CONNECTION_EventAvrcpCapabilitiesAvailable`. This is capability/connection handling, not a discovered sensor request.
3. `0xa10c4`: the version-services function maps version indices to service flags in `0x6af734`. It does not provide evidence that those flags represent vehicle systems. The wider surrounding labels name playback, shuffle, repeat, scan and browsing. Here, scan refers to a media feature; it is not a diagnostic scan.
4. `0xaabe4`: the skip-request handler processes player state, skip mode and count. It calls the play-status execution function `0x9df20` on one path, and `0xaadc0` on another. The latter prepares an internal message with identifier `0x2003`, forwards a one-byte argument to `0x98ca4`, then invokes `0x97898`. These are INTERNAL values, NOT a verified Bluetooth wire request; no packet should be sent based solely on them.
5. `0xa1fd4`: the function labelled `TRACK_CHANGED_SendResponseMetadataQuery` copies fixed metadata buffers into an internal response. Its helper `0xa03dc` labels buffer `0x6af320` as title and `+0xff` as artist. Other fields are copied from offsets `+0x1fe` and `+0x2fd`; no vehicle meaning was assigned to them. No vehicle-data source or execution of title text was established in this path. This is not proof that every parser/callee has been audited.
6. The `BT_APPL_AVP_PLAYER_COMMAND_REQ` label resolves into an event-naming area. A label does not establish an externally callable health command.

## Specification cross-check

Bluetooth AVRCP 1.6.3 section4.3.1 explicitly uses the VENDOR DEPENDENT envelope for ordinary standard metadata, under Bluetooth SIG company ID `0x001958`. Therefore a vendor-dependent label alone is not evidence of a VW-private health protocol. Section6.4.1 describes capability queries for supported company IDs/events; it does not define an engine diagnostics API. This reference does not establish that the Golf implements version1.6.3.

Apple's MPRemoteCommandCenter supports media events from accessories; MPNowPlayingInfoCenter supplies media metadata for supported displays. Neither documented mechanism supplies car sensor values or a generic raw AVRCP command socket. A media interface prototype would test buttons/display only and must not be presented as progress in reading car health.

## Evidence needed to change the verdict

Find a radio-side handler that reads an identifiable vehicle value AND returns it over a permitted connection, then establish a supported stock-iPhone client route. Evidence could come from matched firmware, manufacturer documentation, or a demonstrated compatible implementation. None was found in this pass. If adding a radio-side handler is necessary, that changes the owner's no-car-software-installation constraint and still requires a compatible install/recovery method.

There is no justified new car visit or blind custom-packet test from these findings. Repeating pairing or sending a diagnostic phrase as a song title cannot verify the missing handler.

## Reproducible local traces

Generated with existing `work/golf-button-investigation/trace_dispatch.py`:

- `dispatch-analysis/music-channel-handlers.json` and `.asm.txt`: regex `CONNECTION_EventVendorDependentConStatusAvailable|SERVICE_SUPPORT_EventAvrcpCapabilitiesAvailable|BT_APPL_AVP_PLAYER_COMMAND_REQ`.
- `dispatch-analysis/music-skip-and-metadata.json` and `.asm.txt`: regex `PLAYER_CONTROL_EventMediaRequesSkip|TRACK_CHANGED_SendResponseMetadataQuery|SERVICE_SUPPORT_SetAvrcpVersionServices|CONTROL_EventMediaControlRequest`.
- `dispatch-analysis/music-send-followup.json` and `.asm.txt`: addresses `0xaadc0 0xa03dc 0x9df20 0xa42dc`.

## Primary references

- https://files.bluetooth.com/wp-content/uploads/dlm_uploads/2024/10/AVRCP_v1.6.3.pdf
- https://developer.apple.com/documentation/mediaplayer/mpremotecommandcenter
- https://developer.apple.com/documentation/mediaplayer/mpnowplayinginfocenter

Targeted searches for MSTD/Panasonic AVRCP vehicle-data commands and matching P3163 software did not produce a verified primary-source health protocol or a matched firmware image. Forum and retrofit listings were not treated as proof.
