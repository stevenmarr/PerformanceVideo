# Datasheet port pass, 2026-11-14

Counts below were read from the cited official document. Devices not in this list are unchanged and still have no port count.

| Device | Source | What was counted |
|---|---|---|
| Barco Event Master E2 | [E2 Gen 2 spec sheet](https://assets.barco.com/m/6c92faa3d7d32df9/original/E2-Gen-2-en-Spec-sheet.pdf) | 16 SDI in, 12 HDMI in, 12 DisplayPort in, 4 SDI out, 13 HDMI out, 1 DisplayPort out, genlock in/loop, 4 S3D in, 2 S3D out. This is the published Gen 2 mix, not a custom card load. |
| Barco S3-4K | [S3-4K spec sheet](https://assets.barco.com/m/663dfa0f62601d99/original/S3-4K-en-Spec-sheet.pdf) | Fixed configuration only. The same sheet says build-to-order chassis replace it, so those ranges are not stored as counts. |
| Barco S3-4K Jr | [S3-4K Jr spec sheet](https://assets.barco.com/m/1f517ccad3e59577/original/S3-4K-Jr-en-Spec-sheet.pdf) | Inputs and HDMI outputs only. The sheet does not list SDI outputs. |
| Brompton Tessera SX40 | [SX40 data sheet, Feb 2025](https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-SX40-Data-Sheet-Feb2025-EN.pdf) | 1 HDMI in, 1 12G-SDI in, 1 SDI thru, 4 copper and 4 fiber 10G connectors that auto-switch per output, 2 management Ethernet, DMX and sync in/thru. |
| Brompton Tessera S8 | [S8 data sheet, Mar 2025](https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-S8-Data-Sheet-Mar2025-EN.pdf) | 1 HDMI in, 1 12G-SDI in, 1 SDI thru, 8 1G Ethernet out. No fiber outputs on this sheet. |
| ROE SX-40 | Same Brompton SX40 sheet, plus the [ROE SX-40 page](https://www.roevisual.com/en/products/sx-40-led-processing-platform) identifying the product | Same connectors as the Brompton SX40. |
| Panasonic AW-UE150 | [AW-UE150 specifications PDF](https://pro-av.panasonic.net/en/products/aw-ue150/pdf/ue150_spec.pdf) | 1 12G-SDI, 1 3G-SDI, 1 monitor SDI, 1 HDMI, 1 SFP+ output, genlock, LAN, RS-422, mic/line. |
| Panasonic AW-UE160 | [AW-UE160 brochure](https://pro-av.panasonic.net/en/download/brochure/pdf/aw-ue160.pdf) | 1 12G-SDI, 2 3G-SDI, 1 HDMI, 1 SFP+, 2 XLR, 1 USB, genlock. LAN is not given a count on that line. |
| Sony BRC-AM7 | [BRC-AM7 specifications](https://pro.sony/ue_US/pdf/products/ptz-network-cameras/brc-am7) | SDI 1 is 12G, SDI 2 is 3G, HDMI, SFP+, 2 XLR, genlock, timecode in, VISCA in/out, LAN. |
| Sony ILME-FR7 | [ILME-FR7 specifications](https://pro.sony/ue_US/pdf/ilme-fr7) | 1 12G-SDI, 1 HDMI, 1 SFP+ output, 1 XLR-5, genlock, timecode in, LAN. |
| Grass Valley LDX 150 | [LDX 100 series datasheet](https://www.grassvalley.com/wp-content/uploads/2025/01/ldx_100_series_ds-pub-3-0900i-en.pdf) | Five BNC connectors, A through E, each usable as input or output. XCU base-station counts are not copied onto the camera. |
| Grass Valley K-Frame | [Grass Valley Japan S-series page](https://www.grassvalley.jp/pdt-item/gv_korona_s-series/) | S-series standard 32 in and 16 out. The stated maxima (80 and 48) are not stored as connector counts. |

Added 2026-11-14 in the second pass:

| Device | Source | What was counted |
|---|---|---|
| Barco E2 (original, NGS-4U) | [E2 spec sheet](https://assets.barco.com/m/753c2b29df077031/original/E2-en-Spec-sheet.pdf) | New record `barco.event-master-e2-original`. 12 SDI in, 10 HDMI in, 10 DisplayPort in, 4 SDI out, 8 HDMI out, 2 HDMI multiviewer. The existing E2 record stays on the Gen 2 sheet. |
| Barco E2 Jr | [E2 Jr spec sheet](https://assets.barco.com/m/ba293f930b4cabb/original/E2-Jr-en-Spec-sheet.pdf) | 4 SDI in, 6 HDMI in, 6 DisplayPort in, 4 SDI out, 4 HDMI out, 2 HDMI multiviewer. |
| Barco EX | [EX spec sheet](https://assets.barco.com/m/551c7b03df99bf34/original/Ex-en-Spec-sheet.pdf) | Genlock in, genlock out, Ethernet. Video is two card slots, up to 8 in or 8 out, with no fixed mix, so those counts are empty. |
| Barco ImagePRO-4K | [ImagePRO-4K spec sheet](https://assets.barco.com/asset/e5493634-05e3-465e-b0d7-977b0e13d258/ImagePRO-4K-en-Spec-sheet.pdf) | Factory Tri-Combo: 1 HDMI, 1 DisplayPort, and 4 SDI BNCs each way. The sheet's "2x 12G or 4x 3G" is those four BNCs, not six connectors. |
| Brompton S4 | [S4 data sheet, March 2025](https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-S4-Data-Sheet-Mar2025-EN.pdf) | 1 DVI-D in, 4 1G out, 1 management Ethernet, 1 DisplayPort monitor. No native HDMI jack. |
| Brompton T1 | [T1 data sheet, March 2025](https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-T1-Data-Sheet-Mar2025-EN.pdf) | 1 DVI-D in, 1 1G out, DMX in and thru. |
| Brompton XD | [XD data sheet, February 2025](https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-XD-Data-Sheet-Feb2025-EN.pdf) | 1 copper trunk in, 1 fiber trunk in, 1 thru, 10 1G out, powerCON in and thru. |
| Panasonic AV-UHS500 | [AV-UHS500 specifications](https://pro-av.panasonic.net/en/products/av-uhs500/spec.html) | Standard chassis: 8 SDI in, 2 HDMI in, 5 SDI out, 2 HDMI out, 2 reference BNC. Option slots are not added on top. |
| Panasonic Kairos | [Kairos Core specifications](https://pro-av.panasonic.net/en/products/it_ip_platform/at-kc2000_spec.html) | Fixed terminals only: 2 AC in, 4 DisplayPort multiview, 2 LAN, VGA, 4 USB. SDI and HDMI are optional boards whose maxima differ by SKU, so those counts stay empty. |
| Sony XVS-G1 | [XVS-G1 user's guide](https://pro.sony/support/res/manuals/5031/a79518bcdf2341427a14fd3b8ab29faa/50310861M.pdf) | Standard boards: 24 SDI in and 12 SDI out. The spec sheet's 44 and 24 are the totals with both optional I/O boards, and those extra connectors are not stored. |

ROE panel manuals name etherCON data cables and powerCON True1 power cables. They do not state how many of each connector are on a panel, so those panels stay empty.

Added 2026-11-14 in the third pass:

| Device | Source | What was counted |
|---|---|---|
| Sony XVS-9000, XVS-8000, XVS-7000, XVS-6000 | [XVS system user's guide](https://www.sony.com/electronics/support/res/manuals/5013/ac0fcd23e79e1fe9ad1e3707c87879a1/50135021M.pdf) | Fixed rear panel only. Reference is two loop-through BNCs. One MVS LAN, one utility LAN, one GPI. AC inlets: 6, 4, 4, and 2. Video inputs and outputs are option boards, so the published maxima (160/80, 160/48, 112/48, 64/24) are not stored. |
| Panasonic AV-HS6000 | [AV-HS6000 specifications](https://pro-av.panasonic.net/en/products/av-hs6000/spec.html) | Mainframe: 32 SDI in, 2 DVI-D in, 32 SDI out (16 lines, two BNCs each), reference, LTC, LAN, panel link, four RS-422, GPI in and two GPI out. The control panel is not included. |
| Panasonic AV-HS410 | [Switcher comparison specifications](https://pro-av.panasonic.net/en/sales_o/switcher_mixer/spec.pdf) | Standard chassis: 8 SDI in, 1 DVI-D in, 6 SDI out BNCs (five lines, OUT 1 distributed), 1 DVI-D out. Option-slot lines are not stored. |
| Panasonic AW-HS50 (`panasonic.av-hs50`) | [AW-HS50 specifications](https://pro-av.panasonic.net/en/sales_o/switcher_mixer/aw-hs50/av-hs50_spec.pdf) | 4 SDI in, 1 DVI-D in, 3 SDI out BNCs (OUT 1 is one line on two BNCs), 1 DVI-D out, LAN, one tally/GPI connector. |
| Panasonic AV-HSW10 | [AV-HSW10 operating instructions](https://pro-av.panasonic.net/manual/pdf/AV-HSW10PJ.EJ_full(DVQP3077ZA)_E.pdf) | 4 SDI in, 2 HDMI in, 2 SDI out, 1 HDMI out, 2 reference BNCs, LAN. SDI IN 1 and HDMI IN 1 exclude each other. SRT and NDI use the LAN jack. |

Still empty: Barco projectors and LED tiles, the other Panasonic PTZ models, the other Sony PTZ cameras, Grass Valley frames other than the K-Frame S-series standard population and the LDX 150 head, and ROE panels.
