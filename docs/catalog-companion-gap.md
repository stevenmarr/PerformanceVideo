# Companion connection types not in the 13-brand catalog

This file lists Bitfocus Companion connection types whose manufacturers are **not** among the 13 brands Steven asked to deep-search (Blackmagic, Barco, AJA, Grass Valley, Sony, Panasonic, Ross, Analog Way, Christie, Vista Systems, PixelHue, ROE, Brompton), and that are still worth having as diagram nodes for live-event video.

**Source:** [bitfocus.io/connections](https://bitfocus.io/connections) flight payload extracted 2026-11-13 (905 connection modules, 591 manufacturers) plus the `companion-module-*` GitHub repo list (1,098 repos). Full dump: `raw/companion-connections.json`.

**Already covered by the 13-brand catalog:** Companion modules for AJA (5), Analog Way (10), Barco (11), Blackmagic Design (13), Brompton (1), Christie / Christie Digital Systems (3), Grass Valley (3), Panasonic (12), PixelHue (4), Ross Video (5), Sony (9). Those are **not** repeated here.

The list is ranked for a Performance Video LLC live-event plot (switchers, routers, processors, LED, media servers, cameras, stream encoders, projectors). Lighting desks and audio consoles are a short adjacent section at the end — they appear on the same plots, but they are not video nodes. Generic HTTP/TCP/UDP/OSC modules are called out because Control Center is building those command systems; they are protocols, not devices.

---

## Priority A — add as nodes in the next catalog pass

These are everyday live-event or broadcast boxes that show up on PVLLC-style plots and that have a Companion module (so buttons, variables and feedbacks are already known).

| Manufacturer | Companion module(s) | Products named in Companion | Why it should be a node |
|---|---|---|---|
| AV Stumpfl | `avstumpfl-pixera` | PIXERA | Media server used as a peer of disguise / Millumin; Steven's Control Center already has a PIXERA tab. |
| Disguise | `disguise-osc`, `disguise-smc`, `disguise-mtc`, `disguise-liveupdate` | disguise OSC, SMC, Multi Transport Control, LiveUpdate | Industry-standard media server. Needs a server node (machine I/O) plus a control endpoint. |
| Anomes | `anomes-millumin` | Millumin 2 / 3 / 4 | Media server; Control Center already has a MILLUMIN tab. |
| Resolume | `resolume-arena` | Arena | VJ / playback server common on IMAG and festival plots. |
| Dataton | `dataton-watchout`, `dataton-watchout-json` | WATCHOUT, WATCHOUT 7 | Multi-display media server, still widely rented. |
| Green Hippo | `greenhippo-hippotizer-rest` | Hippotizer | Media server, same class as disguise / PIXERA. |
| 7thSense Design | `7thsensedesign-delta` | Delta Media Server | High-end media server (domes, dark rides, large canvas). |
| NewTek / Vizrt | `newtek-tricaster`, `newtek-ndistudiomonitor` | TriCaster, NDI Studio Monitor | TriCaster is a complete production switcher; NDI Studio Monitor is a common confidence / record endpoint. Vizrt also has `vizrt-mosart` and `vizrt-tcp-engine-trio` for graphics / automation. |
| StudioCoast | `studiocoast-vmix` | vMix | Software switcher used heavily in corporate, worship and streaming. |
| Roland | `roland-v80hd`, `roland-v60hd`, `roland-v160hd`, `roland-v600uhd`, `roland-v1-4k`, `roland-v1200hd`, `roland-p20hd`, plus V-8HD / V-160HD siblings | V-1HD / V-1-4K, V-60HD, V-80HD, V-160HD, V-600UHD, V-1200HD, P-20HD | Compact live switchers and a replay deck; very common in mid-size event racks. |
| FOR-A | `fora-hvs`, `fora-mfr` | Hanabi (HVS) switchers, MFR routers | Broadcast switchers and routers still specified on trucks and in rental. |
| Datavideo | `datavideo-dvip`, `datavideo-visca` | DVIP-controlled switchers, VISCA cameras | SE / ITC / PTC line is everywhere in house-of-worship and education plots. |
| NovaStar (also "Novastar", "NovaStar Coex") | `novastar-controller`, `novastar-h-series`, `novastar-coex`, `novastar-d12`, `novastar-splicer`, `novastar-mediaserver`, `novastar-broadcastswitcher`, `novastar-switcher`, `novastar-mxreal3` | MCTRL4K, VX1000 / VX600 / VX4S / VX6S, NovaPro HD / UHD Jr, J6, H-Series, MX40 Pro, CX80 Pro, KU20, D12, N10, N20, DB4K, MxReal 3 | The most common LED processors after Brompton. Should be a first-class node family (controller + receiving card). |
| Colorlight | `colorlight-processor`, `colorlight-grandshow` | U / Z / X / V / VX / D / S series, GrandShow | Second-most-common LED processor family in mid-size rental. |
| BirdDog | `birddog-ptz`, `birddog-converters`, `birddog-connect`, `birddog-central` | PTZ cameras, NDI converters, Connect, Central | NDI PTZ and SDI–NDI converters are on almost every hybrid plot. |
| Magewell | `magewell-ultrastream`, `magewell-proconvert-decoder`, `magewell-director` | Ultra Stream / Ultra Encode (HDMI, SDI, Plus, AIO), Pro Convert, Director Mini | Capture and encode boxes sitting between cameras and the stream or NDI fabric. |
| Teradek | `teradek-prism`, `teradek-vidiu`, `teradek-vidiux` | Prism, Prism Flex, VidiU, VidiU X | Bonded / contribution encoders and event stream encoders. |
| Kiloview | `kiloview-ndi`, `kiloview-encoder`, `kiloview-decoder`, `kiloview-4kconverter`, `kiloview-cuber1`, `kiloview-cubex1` | N50 / N60 / FN-50 / FN-60, E1–E3, D260 / D350, CUBE R1 / X1 | NDI converters and codec boxes, often cheaper alternatives to BirdDog. |
| Canon | `canon-ptz`, `canon-controller`, `canon-xf` | CR-N100 / N300 / N350 / N400 / N500 / N700, CR-X300 / X500, RC-IP1000, C70 / C80 / C300 / C500, XF605 | Cinema and PTZ cameras used as show cameras; RC-IP1000 is a controller node. |
| Lumens | `lumens-visca`, `lumens-mediaprocessor` | PTZ, box and tracking cameras; media processor | VISCA PTZ common in education and corporate. |
| Marshall | `marshall-ipcamera` | CV355, CV420, CV420e, CV620, CV630, CV730 | Compact POV / PTZ cameras on many event plots. |
| JVC | `jvc-ptz` | KZ100, PZ510, generic Camera | PTZ / connected-cam line. |
| Vaddio | `vaddio-ptz` | PTZ Camera | Install and corporate PTZ. |
| Figure 53 | `figure53-qlab-advance`, `figure53-go-button`, `figure53-qview` | QLab, Go Button, QView | Theatre / corporate playback; a software node with audio + video cue I/O. |
| Renewed Vision | `renewedvision-propresenter-api`, `renewedvision-pvp` | ProPresenter API, PVP 3 | Worship and corporate presentation playback. |
| Extron | `extron-dxp`, `extron-smx`, `extron-mmx-tcp`, `extron-in1604`, `extron-smp111`, `extron-smp351`, `extron-ipl250`, `extron-ipl-t-pcs4` | DXP / SMX / MMX matrices, IN1604, SMP 111 / 351, IPL | Corporate and install matrices, scalers and presentation recorders that share racks with event gear. |
| Kramer | `kramer-matrix`, `kramer-vp727`, `kramer-vp734`, `kramer-vp773a`, `kramer-vs41h` | Generic matrix, VP-734 / 747 / 773A, VS-41H | Same role as Extron — presentation switchers and matrices. |
| tvONE | `tvone-corio`, `tvone-calico` | CORIO C2, CALICO | CORIOmaster-class video processors / wall controllers. |
| Lightware | `lightware-lw2`, `lightware-lw3` | LW2, LW3 protocol matrices | High-end AV matrices (often 4K / 12G / fiber). |
| Crestron | `crestron-nvx`, `crestron-digitalmatrix`, `crestron-hd-mdnxm-4kz-e` | DM-NVX family, DigitalMedia switchers, HD-MD 4K matrices | AV-over-IP and corporate matrices that share the same drawing as event I/O. |
| Evertz | `evertz-quartz`, `evertz-dreamcatcher`, `evertz-symphony`, `evertz-vipx` | Quartz / MAGNUM routers, DreamCatcher replay, MVP / VIP / NGI multiviewers | Broadcast routers, replay and monitoring — truck and venue infrastructure. |
| Haivision | `haivision-makito-x4-encoder`, `haivision-makito-x4-decoder`, `haivision-kbencoder`, `haivision-connectdvr` | Makito X4, KB Encoder, Connect DVR | Contribution encode / decode for sports and remote production. |
| Matrox | `matrox-monarch`, `matrox-conductip` | Monarch HD / HDX / LCS, ConductIP | Stream encoders and ST 2110 / IP conductors. |
| Riedel | `riedel-mediornet`, `riedel-rrcs` | MediorNet, RRCS | MediorNet is a video + intercom + audio fiber/IP fabric — a real signal-flow node, not just a panel. |
| TSL Products | `tslproducts-umd`, `tslproducts-umdlistener`, `tslproducts-usp3` | UMD protocol, UMD Listener, Universal Switch Panel | Tally / UMD is already a Control Center concern (TSL tallies). |
| FOR-A / Utah / Nevion / Imagine / Snell | `utahscientific-bpspanel`, `nevion-mrp`, `nevion-videoipath`, `imagine-lrc`, `snellwilcox-kahuna` | Utah routers, Nevion VideoIPath / MRP, Imagine Logical Router Control, Snell Kahuna | Broadcast routers and a legacy Kahuna (Kahuna is also noted under Grass Valley in this catalog as an identity record). |
| Softron | `softron-ontheairvideo`, `softron-movierecorder`, `softron-mreplay`, `softron-multicamlogger` | OnTheAir Video, MovieRecorder, M\|Replay | Mac playout and ISO record, used next to a switcher. |
| Theatrixx | `theatrixx-xpresscue` | xPressCue | Event media / clip player. |
| DT Videolabs | `dtvideolabs-playbackproplus` | PlaybackPro Plus | Playback application still seen on corporate and theatre plots. |
| Smode | `smodetech-smodelive` | Smode Live | Real-time media server / compositor. |
| VYV | `vyv-photon` | Photon, Tachyon, Xenon | Projection-mapping / media-server family. |
| Avolites | `avolites-ai`, `avolites-titan` | AI media server, Titan | Media server (AI) plus lighting (Titan) — AI is the video node. |
| Telestream | `telestream-prism` | Prism (MPD / MPI2 / MPP / MPS / MPX2) | Waveform / QC monitors (scopes), useful next to a program feed. |
| CasparCG | `casparcg-server` | Server | Open-source graphics / playout server. |
| VideoLAN | `videolan-vlc` | VLC | Ubiquitous software player; a useful "confidence / clip" node. |

---

## Priority B — worth a node when they appear on a plot

| Manufacturer | Companion module(s) | Reason |
|---|---|---|
| Atlona (`atlona-clso`, `atlona-omega`) | Presentation matrices / switchers in corporate rooms. |
| WyreStorm (`wyrestorm-matrix`, `wyrestorm-sw0402mv`) | HDMI matrices and a small multiviewer. |
| IDK (`idk-fdx`, `idk-msd`, `idk-ninjar`) | Japanese matrices and seamless switchers. |
| DEXON (`dexon-dimax`, `dexon-divip`, `dexon-matrix`) | Video-wall processors and IP matrices. |
| NoHassleAV (`nohassleav-matrix`, `nohassleav-videowallprocessor`) | Small HDMI matrices and 4×4 video-wall boxes. |
| Smart-AVI, TESmart, Tesla Smart | Commodity HDMI matrices — only add when a specific SKU is on a drawing. |
| VHD (`vhd-vx61xl`, `vhd-vx90`) | LED processors (VX / V60 family). |
| Xiamen SPROLINK (`xiamen-sprolink-vd-series`) | LED processors. |
| Samsung (`samsung-display`, `samsung-smarttv`, `samsung-tizenos`) and LG (`lgtv-display`, `lgtv-prodisplay`) | Confidence monitors, The Wall / MAGNIT-class displays, and lobby screens. Sony Crystal LED is already in the Sony catalog (`sony.zrct-300`). |
| Sharp (`sharp-tv`), VIZIO, Vivitek (`vivitek-projector`) | Displays / projectors; add SKUs as needed. |
| Sony BRAVIA is already in `devices-sony.json`. | |
| Bosch (`bosch-hd-cameracontrol`) | HD camera control (install). |
| Telycam, Zowietek, Foscam, Rocosoft PTZJoy | Additional PTZ / IP camera nodes. |
| Middle Things (`middlethings-middlecontrol`) | PTZ joystick (APC-R) — a controller node, not a camera. |
| Tightrope (`trms-cablecast`), ToolsOnAir (`toolsonair-justincapture`) | Broadcast automation / capture. |
| BrightSign (`brightsign-player`) | Signage player often hanging off an aux. |
| Ventuz (`ventuz-director`), Singular.Live (`singularlive-studio`), H2R Graphics (`h2r-graphics`) | Real-time graphics endpoints. |
| YoloLiv (`yunxi-yolobox`) | All-in-one portable stream switcher. |
| Tractus / ZEN NDI routers | Software NDI routers — useful as a fabric node. |
| Sienna (`sienna-ndimonitor`) | NDI Monitor. |
| Tech Ministry Tally Arbiter (`techministry-tallyarbiter`) | Tally aggregator already adjacent to Control Center's TSL work. |
| EventApps / CueTone / Videopathe cue / timer apps | Cue-player and timer nodes on IMAG plots. |
| Here to Record (`h2r-layouts`) | Lower-thirds / layout engine. |
| CTE / CTP Systems GPIO, VICREO Listener | GPIO and hotkey bridges. |
| Arkona (`arkona-bladerunner`) | ST 2110 IP processing (BLADE//runner). |
| Lawo — **no dedicated video-matrix Companion module was in the 905-module dump** (audio / mixing modules may exist under other names). A Lawo V__matrix / mc² node is still worth adding from official datasheets, not from Companion. |

---

## Generic protocol modules (not devices, but relevant)

Companion ships a large **Generic** family (`generic-http`, plus Art-Net, Ember+, AES70, MQTT, MIDI, OSC-adjacent, TCP/UDP-style bridges). These are not product nodes — they are the same HTTP / TCP / UDP / OSC command systems Steven asked Control Center to grow. The diagram app should have **generic protocol endpoints** (an "HTTP device", a "TCP device", a "UDP device") that a user can drop on the canvas and type a base URL or host:port into, rather than a node per Companion generic module.

---

## Adjacent (not video, but they share the plot)

Add these only as optional node types, not as part of the video catalog:

- **Lighting:** MA Lighting (grandMA2 / grandMA3 / MSC), ChamSys (MagicQ, QuickQ), ETC (Eos, Echo, Paradigm), Avolites Titan, High End / Hog (if present), Visual Productions (CueCore / TimeCore / IoCore).
- **Audio consoles & DSP:** DiGiCo, Yamaha, Allen & Heath, Behringer / Midas (X32, Wing, X-Air), Lawo, Calrec, Shure (ULX-D, Axient, ANI), Sennheiser, d&b audiotechnik, Focusrite, Biamp Tesira, DirectOut PRODIGY, Audinate Dante Controller / DDM, Clear-Com (FreeSpeak, Arcadia) — Clear-Com and Riedel sit on the line between comms and video fabric.
- **Chroma-Q Vista 3** (`chromaq-vista`) is a *lighting* console, not Vista Systems Spyder. Do not confuse it with `devices-vista.json`.

---

## Counts

- Companion modules total: **905**
- Manufacturers: **591**
- Modules belonging to the 13 catalogued brands: **76** (across 11 Companion manufacturer-name spellings; Vista Systems has no current Companion module of its own — Spyder is under `christie-spyder`)
- Modules outside the 13 brands: **829**, of which this file flags **~50 manufacturers as Priority A** (the ones worth building first) and a longer Priority B tail.
- Follow-up work: import Priority A as `manufacturer_id: "other"` device records (or extend the schema enum) with the same "identity first, ports only from official datasheets" rule used here.
