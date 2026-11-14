# Device catalog coverage

Generated: 2026-11-13T08:15:26-06:00 (America/Chicago). Total devices in `devices.json`: **723** across **13 manufacturers**. Schema: `schema.json` v1.0.0.

Port counts are taken only from a cited official source. A device with `port_data_confidence: none` is an identity record (it can already be a canvas node) whose I/O has not been read from a datasheet. That is intentional — the rule is 'never invent port counts'.

## Counts per manufacturer

| manufacturer_id | Manufacturer | Devices | Confidence (high / medium / low / none) | Status | Port groups |
|---|---|---:|---|---|---|
| `blackmagic` | Blackmagic Design | 220 | 178 / 31 / 4 / 7 | current 220 | 1539 port groups, 1267 with a confirmed count, 272 with count null |
| `analogway` | Analog Way | 61 | 1 / 10 / 0 / 50 | current 26, discontinued 33, unknown 2 | 74 port groups, 44 with a confirmed count, 30 with count null |
| `aja` | AJA | 164 | 2 / 6 / 0 / 156 | current 164 | 24 port groups, 19 with a confirmed count, 5 with count null |
| `ross` | Ross Video | 45 | 4 / 4 / 0 / 37 | current 37, discontinued 3, unknown 5 | 21 port groups, 18 with a confirmed count, 3 with count null |
| `barco` | Barco | 24 | 0 / 0 / 0 / 24 | current 16, discontinued 8 | 0 port groups, 0 with a confirmed count, 0 with count null |
| `christie` | Christie | 21 | 1 / 1 / 0 / 19 | current 20, discontinued 1 | 7 port groups, 6 with a confirmed count, 1 with count null |
| `vista` | Vista Systems | 3 | 0 / 0 / 0 / 3 | discontinued 3 | 0 port groups, 0 with a confirmed count, 0 with count null |
| `pixelhue` | PixelHue | 17 | 1 / 0 / 0 / 16 | current 15, unknown 2 | 7 port groups, 6 with a confirmed count, 1 with count null |
| `roe` | ROE Visual | 38 | 0 / 0 / 0 / 38 | current 38 | 0 port groups, 0 with a confirmed count, 0 with count null |
| `brompton` | Brompton Technology | 5 | 0 / 0 / 0 / 5 | current 5 | 0 port groups, 0 with a confirmed count, 0 with count null |
| `panasonic` | Panasonic | 67 | 0 / 0 / 0 / 67 | current 34, unknown 33 | 0 port groups, 0 with a confirmed count, 0 with count null |
| `sony` | Sony | 37 | 0 / 0 / 0 / 37 | current 37 | 0 port groups, 0 with a confirmed count, 0 with count null |
| `grassvalley` | Grass Valley | 21 | 0 / 0 / 0 / 21 | current 19, unknown 2 | 0 port groups, 0 with a confirmed count, 0 with count null |
| | **Total** | **723** | **187 / 52 / 4 / 480** | current 631, discontinued 48, unknown 44 | 1672 port groups, 1360 with a confirmed count, 312 with count null |

## Counts per category

| Category | Count |
|---|---:|
| converter | 187 |
| image-processor | 70 |
| ptz-camera | 60 |
| switcher | 55 |
| capture | 46 |
| control-panel | 40 |
| cinema-camera | 34 |
| led-panel | 33 |
| other | 27 |
| router | 20 |
| recorder-player | 18 |
| projector | 18 |
| studio-camera | 18 |
| media-server | 14 |
| led-processor | 13 |
| monitor | 12 |
| multiviewer | 10 |
| camcorder | 10 |
| streaming | 8 |
| frame-sync | 7 |
| keyer | 5 |
| recorder | 4 |
| player | 3 |
| audio-mixer | 3 |
| tally | 3 |
| sync-generator | 2 |
| ccu | 2 |
| camera | 1 |

## What is complete, what is thin

### Strong (ports from official sources, high or medium confidence on flagship models)

- **Blackmagic Design (220 current devices, 178 high-confidence).** Full current tech-specs parse of the official Blackmagic tech-specs HTML (Connections fields), 13 November 2026: ATEM Constellation (including 4 M/E 4K Plus, 8K, IP / IP Plus), ATEM Mini Extreme ISO G2, Television Studio 4K8 / HD8, Videohub 12G 10×10 through 120×120, HyperDeck, Teranex, DeckLink, cameras, converters, Fairlight Live, SmartView, Ultimatte, Web Presenter. 1,267 port groups have confirmed counts. **Gap:** discontinued models (original ATEM Mini, Production Studio 4K, older Videohubs, older HyperDecks) are **not** in this file — they still appear in rental inventories and should be a follow-up pass. A few Physical Installation fields are image-only, so some RU values are null (honest). One leftover nit: ATEM Mini Extreme ISO G2 Ethernet notes mention both 1G and 10G on a single eth port record.
- **Analog Way LivePremier Aquilon (11 frames, RS6 high, others medium).** Official Aquilon User Manual v6.2 (10/09/2026, already on disk) gives RU, max watts and 4K I/O maxima for every RS and C chassis. Official product pages give the **stock input connector mix** for RS6, RS5, RS4, RS1 and RS alpha. The official RS6 Quick Start Guide gives **20× HDMI 2.0** program/aux outputs (stock — not a show-specific IO Map). RS3/RS2 input mixes were not fetched (counts only). C / C+ / Cmini / Cmax are modular: maxima are recorded, option-card mixes are in notes. Midra 4K, Alta (Zenith), Picturall Mark II, CorePlay, and a LiveCore / Midra legacy list are identity-only. **61 devices.**
- **Ross Carbonite Ultra 60, Ultra Solo, Carbonite Code (high); Ultra, HyperMax, Ultrix Carbonite, Graphite (medium).** Official product pages 13 November 2026 plus the Ultra 60 User Manual v9.2 (Nov 2025, Ross P/N 4890DR-110-09.2): Ultra 60 is a 3RU modular frame, official I/O table Base 12×4+1 MV / 2 boards 36×12+3 MV / 3 boards 60×20+5 MV (max 60 in, 20 out, 5 I/O MultiViewers; marketing '25 outputs' = 20+MV). Ultra Solo Key Specs: 12 SDI in, 5 SDI out, USB-C webcam, 24 tally, 24 GPI/O, 1 AES, 1 MV, all-in-one or 1RU. Carbonite Code is software NDI (30×6 / Solo 8×2). HyperMax and Ultrix Carbonite are software-defined / blade-based — official maxima are quoted, rear-panel layouts are not invented. **45 devices**, including Ultrix FR2/FR5/FR12, NK, Graphite, Tria/Kiva, XPression, TouchDrive, and legacy Carbonite Black / Vision as identity.
- **Christie Spyder X80 (high).** Official product page: 6RU, 1680 W, up to 6 input modules × 4 = 24 inputs and 4 output cards × 4 = 16 outputs; each channel has HDMI 2.0 + DisplayPort 1.2 + 12G-SDI. Spyder-S compositor options (12G 8Ch, SFP 8Ch, HDMI 2.0 / 2.1, DP 1.4) and a 16-node 100G fabric are from the official series page; per-node counts not fully extracted (medium). Spyder X20 is official end-of-production. Terra, MicroTiles LED, Core Series III, XP LED, and current projector series (Griffyn, M 4K RGB, HS, GS, Inspire, Jazz, Korus, Captiva, Eclipse G3, Sapphire 4K40-RGBH) are identity. **21 devices.**
- **PixelHue P80 (high).** Official product page: 12 fixed concurrent 4K inputs (connector mix not fully broken down — left unknown), optional input card, up to 20× 4K inputs; 8× HDMI 2.0 main out; 4× HDMI 2.0 flex out; 4× 12G-SDI matrix out; 2× dedicated MV; 8× 10G SFP (copy of HDMI mains). Q8, P20, P10, F Series, S16, U5 family, X400 (G1) media server, 4K ViewPro, EP4T/R Pro, and Companion MS3 / MS3 Pro are identity. **17 devices.**
- **AJA KUMO 1616 and 3232-12G (high); other KUMO sizes (medium).** Official tech-specs: KUMO 1616 has 16× BNC SDI outputs and 2× BNC looping reference; KUMO 3232-12G has 32× 12G-SDI BNC outputs and 2× BNC looping ref. Other KUMO sizes (1616-12G, 3232, 6464, 6464-12G) use the official N×N model name at medium confidence. FS-HDR and ColorBox have only the connectors that were clearly stated. The rest of the 173-slug aja.com hardware index (FiDO, HA5/HI5, openGear, KONA, Ki Pro, HELO, BRIDGE, ROI, etc.) is identity-complete with no invented counts. Software SKUs omitted. **164 devices.**

### Thin (identity complete, ports still to parse)

- **Barco (24 devices, all `none`).** barco.com returned **HTTP 403** on every Event Master and image-processing URL tried on 13 November 2026. The file lists Event Master E2 / E2 Jr / S3-4K / S3-4K Jr / EX, EC-50 / EC-200, ImagePRO-4K / II, legacy Encore / DCS / PDS / MatrixPRO-II, UDX / UDM / UDR / HDX / HDF / G / F projector series, TruePix and Infinipix — because Companion already covers them and they are the live-event processors in rental inventories. **This is the single most important follow-up:** parse official Event Master E2 / S3-4K datasheets the moment the site is reachable, and fill ports. Do not copy remembered I/O from memory.
- **Brompton (5 devices, all `none`).** bromptontech.com presented a SiteGround **captcha / HTTP 202** (~177-byte body). Tessera SX40 is independently corroborated by ROE Visual's official SX-40 page. S8, S4, T1 and XD are identity + Companion `brompton-tessera`. Follow-up: official Tessera datasheets (SFP / HDMI / 12G counts).
- **ROE Visual (38 devices, all `none`).** Official `roevisual.com/en/products` page (770 KB, 13 November 2026) supplied a complete current panel and processor list (Black Pearl / 2V2, Ruby / Ruby-C, Carbon Mark II / Full Spectrum, Vanish V8 / V8T / ST / Air / Acoustics, Graphite, Coral, Sierra, Black Marble / BM5 / Interactive, Black Quartz, Obsidian, Diamond, Meru, Denali, Topaz, Jet, Omni Tube, ROE Strip, SOLO; processors Deepsky, HELIOS, eV4, MX, SX40; frames). Per-panel power/data connector counts were **not** parsed from individual datasheets.
- **Panasonic (67 devices, all `none`).** Identity-complete for every PTZ, studio camera, camcorder, RP controller, ROP, Kairos, AV-UHS500 / AV-HS410 / AV-HS50 / AV-HSW10 / AV-HS6000 named in Companion's official product lists. `pro-av.panasonic.net` family URLs returned **404** on the paths tried. Follow-up: official AW-UE150 / UE160 / UE80 and AV-UHS500 / Kairos Core datasheets (12G-SDI, HDMI, fiber, genlock).
- **Sony (37 devices, all `none`).** pro.sony returned **HTTP 403**. Identity for XVS-9000/8000/7000/6000, XVS-G1, MLS-X1, the full Companion VISCA / PTZ list (BRC, SRG, ILME-FR7), PXW camcorders, BRAVIA / PVM, ZRCT-300 Crystal LED, and a thin HDC-5500/3500/3100/P50/P31 set. Follow-up: XVS-G1 / MLS-X1 and BRC-AM7 / FR7 datasheets.
- **Grass Valley (21 devices, all `none`).** grassvalley.com returned **HTTP 202**. Identity from Companion (K-Frame, X-Frame, XP-Frame, Kayenne, Karrera, Korona, Kaleido family, AMP) plus Kahuna, Kula, LDX 150/100/86N/35, Densité and IQ Modular because they still appear in inventories. Follow-up: official K-Frame S-series and LDX 150 datasheets.
- **Vista Systems (3 devices, all `none`).** The company was acquired by Christie; vista-systems.com redirected. Legacy Spyder 200 / 300 / Vista-branded X20 only. Current hardware lives under `christie.*`.

### Discontinued / legacy still in rental

- Analog Way LiveCore Ascender / NeXtage / Output Expanders, Midra Eikos² / Pulse² / QuickMatriX / Saphyr / SmartMatriX², Orchestra², older Picturall, VIO 4K, Vertige — listed, ports not captured.
- Barco Encore, DCS 100/200, PDS, MatrixPRO-II, ImagePRO-II, HDX / HDF — listed as identity.
- Ross Carbonite Black / Black Solo, Vision, standalone Acuity — identity.
- Christie Spyder X20 (official EOP page).
- **Blackmagic discontinued models are the largest named gap** inside an otherwise complete current-line file.

## Sources used

- Blackmagic Design official tech-specs HTML (many product-family pages, 13 November 2026). Parser: `scripts/bmd_parse.py`, `scripts/bmd_convert.py`. Saved under `raw/web/bmd-*.html`.
- Analog Way Aquilon User Manual v6.2 (10/09/2026) and Aquilon RS6 Quick Start Guide, already on disk; official Analog Way product pages for RS6 / RS5 / RS4 / RS1 / RS alpha / Cmax / C+ (`raw/web/aw-*.html`).
- AJA aja.com product index and official KUMO 1616, KUMO 3232-12G, FS-HDR, ColorBox tech-specs (`raw/web/aja-*.html`).
- Ross Video official product pages (Carbonite Ultra 60, Ultra series, Ultra Solo, Carbonite Code, HyperMax, Ultrix Carbonite, Ultrix Acuity, Graphite) retrieved 13 November 2026, plus Carbonite Ultra 60 User Manual v9.2 (Nov 2025).
- Christie official pages: Spyder X80, Spyder-S, EOP image processors (Spyder X20), Terra, LED walls, all-projectors nav (13 November 2026).
- PixelHue official homepage and P80 product page (`pixelhue.com`, 13 November 2026).
- ROE Visual official English products page (`roevisual.com/en/products`, 13 November 2026).
- Bitfocus Companion connections list (905 modules) and 1,098 `companion-module-*` GitHub repos — `raw/companion-connections.json`, `raw/companion-module-repos.tsv`. Used for model identity and for `companion-gap.md`, **not** as a source of port counts.
- Sites that **blocked** a complete datasheet pass (ports therefore left empty, not guessed): Barco.com 403; bromptontech.com captcha / 202; grassvalley.com 202; pro.sony 403; some pro-av.panasonic.net family URLs 404; vista-systems.com redirect; en.pixelhue.com did not resolve.

## File map

```
 /workspace/design-spec/catalog/
   schema.json
   devices.json                  # combined, 723 devices
   devices-blackmagic.json            # 220 devices
   devices-analogway.json             # 61 devices
   devices-aja.json                   # 164 devices
   devices-ross.json                  # 45 devices
   devices-barco.json                 # 24 devices
   devices-christie.json              # 21 devices
   devices-vista.json                 # 3 devices
   devices-pixelhue.json              # 17 devices
   devices-roe.json                   # 38 devices
   devices-brompton.json              # 5 devices
   devices-panasonic.json             # 67 devices
   devices-sony.json                  # 37 devices
   devices-grassvalley.json           # 21 devices
   companion-gap.md
   COVERAGE.md                  # this file
   raw/                         # fetched HTML, Companion dump, BMD parse intermediates
   scripts/                     # parsers and catalog_lib.py
```

## Recommended next passes (short sprints)

1. Barco Event Master E2 / S3-4K official datasheets — highest-value missing ports.
2. Brompton Tessera SX40 / S8 official datasheets (and ROE panel power/data connectors).
3. Panasonic AW-UE150 / UE160 / UE80 and AV-UHS500 / Kairos Core I/O.
4. Sony XVS-G1 / MLS-X1 and BRC-AM7 / ILME-FR7 I/O.
5. Grass Valley K-Frame and LDX 150 I/O.
6. Blackmagic discontinued lineup (rental inventory).
7. Import Priority A Companion manufacturers from `companion-gap.md` as `manufacturer_id: "other"` (or extend the enum): PIXERA, disguise, Millumin, Resolume, WATCHOUT, NovaStar, Colorlight, Roland, BirdDog, Magewell, Teradek, Canon PTZ, Extron, FOR-A, etc.

