// @ts-nocheck
/**
 * Port counts read from official datasheets on 2026-11-14.
 * A count is set only when the cited sheet states a number.
 * Ranges and card-dependent maxima stay in notes with count null.
 */

function port(fields) {
  return {
    max_format: null,
    convertible: false,
    optional: false,
    hot_pluggable_card: null,
    control_protocols: [],
    notes: "",
    confidence: "high",
    ...fields,
  };
}

function source(url, title, notes) {
  return { url, title, retrieved: "2026-11-14", kind: "datasheet-pdf", notes };
}

const xvsGuide = {
  url: "https://www.sony.com/electronics/support/res/manuals/5013/ac0fcd23e79e1fe9ad1e3707c87879a1/50135021M.pdf",
  title: "Sony XVS-9000/8000/7000/6000 system user's guide",
  retrieved: "2026-11-14",
  kind: "manual-pdf",
  notes: "Video input and output connectors are option boards. The number of slots depends on how many boards are installed. REF IN is two loop-through BNCs. MVS LAN and UTL LAN are one RJ-45 each. GPI is one D-sub 25-pin. AC inlets are 3-pin: six on the XVS-9000, four on the XVS-8000 and XVS-7000, two on the XVS-6000.",
};

function xvsChassis(id, acCount, maxima) {
  return {
    id,
    port_data_confidence: "medium",
    notes: `Fixed rear-panel connectors from the XVS user's guide. ${maxima} The control panel is a separate unit.`,
    sources: [xvsGuide],
    ports: [
      port({
        id: "video-in",
        name: "Video In",
        direction: "in",
        signal_type: "sdi-unspecified",
        connector: "unknown",
        count: null,
        optional: true,
        confidence: "medium",
        notes: maxima,
      }),
      port({
        id: "video-out",
        name: "Video Out",
        direction: "out",
        signal_type: "sdi-unspecified",
        connector: "unknown",
        count: null,
        optional: true,
        confidence: "medium",
        notes: maxima,
      }),
      port({ id: "ref", name: "Reference", direction: "bidirectional", signal_type: "ref", connector: "bnc", count: 2, notes: "Loop-through pair." }),
      port({ id: "mvs-lan", name: "MVS LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "utl-lan", name: "Utility LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1, notes: "Present on the rear panel. The guide says not to connect a signal." }),
      port({ id: "gpi", name: "GPI", direction: "out", signal_type: "gpio", connector: "db25", count: 1, notes: "Alarm output." }),
      port({ id: "ac", name: "AC In", direction: "in", signal_type: "power", connector: "other", count: acCount, notes: "3-pin inlet. The guide does not name an IEC shell." }),
    ],
  };
}

export const datasheetPortOverlay = [
  {
    id: "barco.event-master-e2",
    port_data_confidence: "high",
    notes:
      "Ports are the published E2 Gen 2 (NGS-4U-V2) connector mix from the Barco spec sheet, not a custom card load. A different input or output card set changes these counts. The sheet also says up to 16 4K inputs and up to 8 4K outputs; those are processing capacities, not extra connectors.",
    sources: [
      source(
        "https://assets.barco.com/m/6c92faa3d7d32df9/original/E2-Gen-2-en-Spec-sheet.pdf",
        "Barco E2 Gen 2 spec sheet",
        "Video inputs: 16x SD/HD/3G/6G/12G, 12x HDMI 2.0, 12x DisplayPort 1.2. Video outputs: 4x SDI, 13x HDMI, 1x DisplayPort. Genlock input/loop. S3D sync 4x DIN in, 2x DIN out.",
      ),
    ],
    ports: [
      port({ id: "sdi-in", name: "12G-SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: 16, max_format: "12G-SDI" }),
      port({ id: "hdmi-in", name: "HDMI 2.0 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 12, max_format: "HDMI 2.0 600 MHz" }),
      port({ id: "dp-in", name: "DisplayPort 1.2 In", direction: "in", signal_type: "displayport", connector: "displayport", count: 12, max_format: "DisplayPort 1.2 600 MHz" }),
      port({ id: "sdi-out", name: "12G-SDI Out", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 4, max_format: "12G-SDI" }),
      port({ id: "hdmi-out", name: "HDMI Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 13, max_format: "HDMI 600 MHz" }),
      port({ id: "dp-out", name: "DisplayPort Out", direction: "out", signal_type: "displayport", connector: "displayport", count: 1, max_format: "DisplayPort 660 MHz" }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-loop", name: "Genlock Loop", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "s3d-in", name: "S3D Sync In", direction: "in", signal_type: "framelock", connector: "din", count: 4 }),
      port({ id: "s3d-out", name: "S3D Sync Out", direction: "out", signal_type: "framelock", connector: "din", count: 2 }),
    ],
  },
  {
    id: "barco.event-master-s3-4k",
    port_data_confidence: "medium",
    notes:
      "Counts are the fixed S3-4K configuration on the Barco spec sheet. That sheet says the empty-chassis / build-to-order version replaces this fixed mix, so a BTO unit can differ. Those variable ranges are not entered as counts.",
    sources: [
      source(
        "https://assets.barco.com/m/663dfa0f62601d99/original/S3-4K-en-Spec-sheet.pdf",
        "Barco S3-4K spec sheet",
        "Inputs: 4x SD/HD/3G SDI, 4x HDMI 1.4a, 4x DisplayPort 1.1. Outputs: 4x SD/HD/3G SDI, 4x HDMI 1.4a, 2x HDMI 1.4a multiviewer. Genlock input/loop.",
      ),
    ],
    ports: [
      port({ id: "sdi-in", name: "3G-SDI In", direction: "in", signal_type: "sdi-3g", connector: "bnc", count: 4 }),
      port({ id: "hdmi-in", name: "HDMI 1.4 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 4, max_format: "HDMI 1.4a" }),
      port({ id: "dp-in", name: "DisplayPort 1.1 In", direction: "in", signal_type: "displayport", connector: "displayport", count: 4 }),
      port({ id: "sdi-out", name: "3G-SDI Out", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 4 }),
      port({ id: "hdmi-out", name: "HDMI 1.4 Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 4 }),
      port({ id: "hdmi-mv", name: "HDMI Multiviewer", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 2 }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-loop", name: "Genlock Loop", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
    ],
  },
  {
    id: "barco.event-master-s3-4k-jr",
    port_data_confidence: "high",
    notes:
      "The S3-4K Jr spec sheet lists these connectors and does not list SDI outputs. No SDI output count is stored.",
    sources: [
      source(
        "https://assets.barco.com/m/1f517ccad3e59577/original/S3-4K-Jr-en-Spec-sheet.pdf",
        "Barco S3-4K Jr spec sheet",
        "Inputs: 4x SD/HD/3G SDI, 2x HDMI 1.4a, 2x DisplayPort 1.1. Outputs: 4x HDMI 1.4a and 2x HDMI 1.4a multiviewer.",
      ),
    ],
    ports: [
      port({ id: "sdi-in", name: "3G-SDI In", direction: "in", signal_type: "sdi-3g", connector: "bnc", count: 4 }),
      port({ id: "hdmi-in", name: "HDMI 1.4 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 2 }),
      port({ id: "dp-in", name: "DisplayPort 1.1 In", direction: "in", signal_type: "displayport", connector: "displayport", count: 2 }),
      port({ id: "hdmi-out", name: "HDMI 1.4 Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 4 }),
      port({ id: "hdmi-mv", name: "HDMI Multiviewer", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 2 }),
    ],
  },
  {
    id: "brompton.tessera-sx40",
    port_data_confidence: "high",
    notes:
      "Each of the four 10G outputs auto-switches between its copper and fiber connector. Those are not eight simultaneous feeds.",
    sources: [
      source(
        "https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-SX40-Data-Sheet-Feb2025-EN.pdf",
        "Brompton Tessera SX40 data sheet, February 2025",
        "One HDMI 2.0b input. One 12G-SDI input and reclocked thru. Four 10GBASE-T outputs and four 10GBASE-LR fiber outputs that auto-switch per output. Two Gigabit management ports. DMX in and thru. Sync in and thru.",
      ),
    ],
    ports: [
      port({ id: "hdmi-in", name: "HDMI 2.0 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 1, max_format: "4096x2160" }),
      port({ id: "sdi-in", name: "12G-SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: 1, max_format: "12G-SDI 4096x2160" }),
      port({ id: "sdi-thru", name: "12G-SDI Thru", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 1 }),
      port({ id: "eth-10g", name: "10G Ethernet Out", direction: "out", signal_type: "ethernet", connector: "ethercon", count: 4 }),
      port({ id: "fiber-10g", name: "10G Fiber Out", direction: "out", signal_type: "fiber-sfp", connector: "opticalcon-duo", count: 4, notes: "Pairs with the copper outputs. Each output auto-switches between copper and fiber." }),
      port({ id: "mgmt", name: "Management Ethernet", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 2 }),
      port({ id: "dmx-in", name: "DMX In", direction: "in", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "dmx-thru", name: "DMX Thru", direction: "out", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "ref-in", name: "Sync In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-thru", name: "Sync Thru", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
    ],
  },
  {
    id: "brompton.tessera-s8",
    port_data_confidence: "high",
    notes: "The S8 data sheet lists eight 1G Ethernet outputs and does not list fiber outputs. No fiber count is stored.",
    sources: [
      source(
        "https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-S8-Data-Sheet-Mar2025-EN.pdf",
        "Brompton Tessera S8 data sheet, March 2025",
        "One HDMI 2.0 input. One 12G-SDI input and reclocked thru. Eight 1 Gigabit Ethernet outputs.",
      ),
    ],
    ports: [
      port({ id: "hdmi-in", name: "HDMI 2.0 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 1, max_format: "4096x2160" }),
      port({ id: "sdi-in", name: "12G-SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: 1 }),
      port({ id: "sdi-thru", name: "12G-SDI Thru", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 1 }),
      port({ id: "eth-1g", name: "1G Ethernet Out", direction: "out", signal_type: "ethernet", connector: "ethercon", count: 8 }),
      port({ id: "mgmt", name: "Management Ethernet", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 2 }),
      port({ id: "dmx-in", name: "DMX In", direction: "in", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "dmx-thru", name: "DMX Thru", direction: "out", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "ref-in", name: "Sync In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-thru", name: "Sync Thru", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
    ],
  },
  {
    id: "roe.sx40",
    port_data_confidence: "high",
    notes:
      "ROE's SX-40 page identifies this as the Brompton Tessera SX40. Connector counts are taken from the Brompton SX40 data sheet, not from a separate ROE rear-panel drawing.",
    sources: [
      source(
        "https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-SX40-Data-Sheet-Feb2025-EN.pdf",
        "Brompton Tessera SX40 data sheet, February 2025",
        "Same connector list as brompton.tessera-sx40.",
      ),
      {
        url: "https://www.roevisual.com/en/products/sx-40-led-processing-platform",
        title: "ROE Visual SX-40 LED processing platform",
        retrieved: "2026-11-13",
        kind: "product-page",
        notes: "Identifies the ROE SX-40 platform as the Brompton Tessera SX40. Does not itself list connector counts.",
      },
    ],
    ports: [
      port({ id: "hdmi-in", name: "HDMI 2.0 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "sdi-in", name: "12G-SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: 1 }),
      port({ id: "sdi-thru", name: "12G-SDI Thru", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 1 }),
      port({ id: "eth-10g", name: "10G Ethernet Out", direction: "out", signal_type: "ethernet", connector: "ethercon", count: 4 }),
      port({ id: "fiber-10g", name: "10G Fiber Out", direction: "out", signal_type: "fiber-sfp", connector: "opticalcon-duo", count: 4, notes: "Auto-switches with the copper outputs." }),
      port({ id: "mgmt", name: "Management Ethernet", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 2 }),
      port({ id: "dmx-in", name: "DMX In", direction: "in", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "dmx-thru", name: "DMX Thru", direction: "out", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "ref-in", name: "Sync In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-thru", name: "Sync Thru", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
    ],
  },
  {
    id: "panasonic.aw-ue150",
    port_data_confidence: "high",
    notes: "Optical output repeats the 12G-SDI output. The spec sheet says the camera does not accept an optical input.",
    sources: [
      source(
        "https://pro-av.panasonic.net/en/products/aw-ue150/pdf/ue150_spec.pdf",
        "Panasonic AW-UE150 specifications PDF",
        "HDMI 2.0 x1. 12G-SDI OUT BNC x1. 3G-SDI OUT BNC x1. MONI OUT BNC x1. SFP+ optical output. G/L IN BNC. LAN RJ-45. RS-422 RJ-45. 3.5 mm mic/line.",
      ),
    ],
    ports: [
      port({ id: "sdi-12g", name: "12G-SDI Out", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 1, max_format: "2160p59.94" }),
      port({ id: "sdi-3g", name: "3G-SDI Out", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 1 }),
      port({ id: "sdi-mon", name: "Monitor SDI Out", direction: "out", signal_type: "sdi-hd", connector: "bnc", count: 1 }),
      port({ id: "hdmi-out", name: "HDMI 2.0 Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "sfp", name: "Optical Out", direction: "out", signal_type: "fiber-sfp", connector: "sfp-plus", count: 1, notes: "Same picture as 12G-SDI. Output only." }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "rs422", name: "RS-422", direction: "bidirectional", signal_type: "rs-422", connector: "rj45", count: 1 }),
      port({ id: "audio", name: "Mic/Line In", direction: "in", signal_type: "audio-analog", connector: "trs-3.5", count: 1 }),
    ],
  },
  {
    id: "panasonic.aw-ue160",
    port_data_confidence: "high",
    notes: "Counts follow the interface line on the official AW-UE160 brochure. LAN is not given a count on that line, so it is not stored.",
    sources: [
      source(
        "https://pro-av.panasonic.net/en/download/brochure/pdf/aw-ue160.pdf",
        "Panasonic AW-UE160 brochure",
        "I/F: Fiber (SFP+), 12G-SDI, 2 x 3G-SDI, HDMI, 2 x XLR, USB 3.0, G/L IN.",
      ),
    ],
    ports: [
      port({ id: "sdi-12g", name: "12G-SDI Out", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 1 }),
      port({ id: "sdi-3g", name: "3G-SDI Out", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 2 }),
      port({ id: "hdmi-out", name: "HDMI Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "sfp", name: "Optical", direction: "out", signal_type: "fiber-sfp", connector: "sfp-plus", count: 1 }),
      port({ id: "audio", name: "XLR Audio In", direction: "in", signal_type: "audio-analog", connector: "xlr-3", count: 2 }),
      port({ id: "usb", name: "USB 3.0", direction: "bidirectional", signal_type: "usb", connector: "usb-a", count: 1 }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
    ],
  },
  {
    id: "sony.brc-am7",
    port_data_confidence: "high",
    notes: "SDI OUT2 is 3G/HD only. The spec sheet does not give it a 12G count.",
    sources: [
      source(
        "https://pro.sony/ue_US/pdf/products/ptz-network-cameras/brc-am7",
        "Sony BRC-AM7 specifications",
        "SDI OUT1 BNC x1 12G/6G/3G/HD. SDI OUT2 BNC x1 3G/HD. HDMI Type-A x1. SFP+ x1. XLR-3 x2. Genlock BNC x1. TC BNC x1 input. VISCA in and out. LAN x1.",
      ),
    ],
    ports: [
      port({ id: "sdi-out-1", name: "SDI Out 1", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 1, max_format: "12G-SDI 2160p59.94" }),
      port({ id: "sdi-out-2", name: "SDI Out 2", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 1, max_format: "3G-SDI 1080p" }),
      port({ id: "hdmi-out", name: "HDMI Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "sfp", name: "Optical Out", direction: "out", signal_type: "fiber-sfp", connector: "sfp-plus", count: 1 }),
      port({ id: "audio-xlr", name: "Audio In", direction: "in", signal_type: "audio-analog", connector: "xlr-3", count: 2 }),
      port({ id: "audio-mini", name: "Mic In", direction: "in", signal_type: "audio-analog", connector: "trs-3.5", count: 1 }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "tc-in", name: "Timecode In", direction: "in", signal_type: "timecode-ltc", connector: "bnc", count: 1 }),
      port({ id: "visca-in", name: "VISCA In", direction: "in", signal_type: "rs-422", connector: "rj45", count: 1 }),
      port({ id: "visca-out", name: "VISCA Out", direction: "out", signal_type: "rs-422", connector: "rj45", count: 1 }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
    ],
  },
  {
    id: "sony.ilme-fr7",
    port_data_confidence: "high",
    notes: "The manual says the optical connector is output only.",
    sources: [
      source(
        "https://pro.sony/ue_US/pdf/ilme-fr7",
        "Sony ILME-FR7 specifications",
        "SDI BNC x1 12G/6G/3G/HD. HDMI Type-A x1. Genlock BNC x1. TC BNC x1 input. SFP+ output. XLR 5-pin x1. LAN x1.",
      ),
    ],
    ports: [
      port({ id: "sdi-out", name: "12G-SDI Out", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 1, max_format: "4096x2160" }),
      port({ id: "hdmi-out", name: "HDMI Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "sfp", name: "Optical Out", direction: "out", signal_type: "fiber-sfp", connector: "sfp-plus", count: 1, notes: "Output only." }),
      port({ id: "audio", name: "Audio In", direction: "in", signal_type: "audio-analog", connector: "xlr-5", count: 1 }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "tc-in", name: "Timecode In", direction: "in", signal_type: "timecode-ltc", connector: "bnc", count: 1 }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
    ],
  },
  {
    id: "grassvalley.ldx-150",
    port_data_confidence: "high",
    notes:
      "BNC A–E are five baseband connectors that the datasheet says can be input or output at 1.5G, 3G, or 12G. They are not stored as five inputs plus five outputs. Base-station (XCU) connector counts are a different device and are not copied onto the camera head.",
    sources: [
      source(
        "https://www.grassvalley.com/wp-content/uploads/2025/01/ldx_100_series_ds-pub-3-0900i-en.pdf",
        "Grass Valley LDX 100 series datasheet",
        "Camera connectivity: BNC A to E, input and output, 1.5G, 3G or 12G. Microphone XLR-3. REF/AES BNC. C2IP RJ-45. IP trunk RJ-45. SMPTE ST 304 hybrid fiber.",
      ),
    ],
    ports: [
      port({
        id: "bnc-a-e",
        name: "BNC A–E",
        direction: "bidirectional",
        signal_type: "sdi-12g",
        connector: "bnc",
        count: 5,
        notes: "Each connector can be an input or an output. The sheet does not fix which.",
      }),
      port({ id: "ref", name: "REF/AES", direction: "bidirectional", signal_type: "ref", connector: "bnc", count: 1, notes: "Reference input, output, or AES." }),
      port({ id: "mic", name: "Mic In", direction: "in", signal_type: "audio-analog", connector: "xlr-3", count: 1 }),
      port({ id: "c2ip", name: "C2IP", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "trunk", name: "IP Trunk", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "fiber", name: "Hybrid Fiber", direction: "bidirectional", signal_type: "fiber-sfp", connector: "smpte-304", count: 1 }),
    ],
  },
  {
    id: "grassvalley.k-frame",
    port_data_confidence: "medium",
    notes:
      "Counts are the S-series standard population stated by Grass Valley Japan: 32 inputs and 16 outputs, maximum 80 and 48. The maximum is not stored as the connector count. Output boards are described as 16 dual-channel outputs; the dual BNC wiring is not expanded beyond the stated 16 outputs.",
    sources: [
      {
        url: "https://www.grassvalley.jp/pdt-item/gv_korona_s-series/",
        title: "Grass Valley Japan, K-Frame S-series",
        retrieved: "2026-11-14",
        kind: "product-page",
        notes: "S-series: standard 32 inputs, maximum 80. Standard 16 outputs, maximum 48. BNC, SD/HD/3G.",
      },
    ],
    ports: [
      port({
        id: "sdi-in",
        name: "SDI In",
        direction: "in",
        signal_type: "sdi-3g",
        connector: "bnc",
        count: 32,
        confidence: "medium",
        notes: "Standard S-series population. Maximum 80 is not a second connector group.",
      }),
      port({
        id: "sdi-out",
        name: "SDI Out",
        direction: "out",
        signal_type: "sdi-3g",
        connector: "bnc",
        count: 16,
        confidence: "medium",
        notes: "Standard S-series population. Maximum 48 is not a second connector group.",
      }),
    ],
  },
  {
    id: "barco.event-master-e2-jr",
    port_data_confidence: "high",
    notes: "Published E2 Jr mix from the Barco spec sheet. A different card load changes these counts. The 4K figures on the sheet are processing capacity, not extra connectors.",
    sources: [
      source(
        "https://assets.barco.com/m/ba293f930b4cabb/original/E2-Jr-en-Spec-sheet.pdf",
        "Barco E2 Jr spec sheet",
        "Inputs: 4x SD/HD/3G SDI, 6x HDMI 1.4a, 6x DisplayPort 1.1. Outputs: 4x SD/HD/3G SDI, 4x HDMI 1.4a, 2x HDMI multiviewer. Genlock input/loop. S3D 4 in, 2 out.",
      ),
    ],
    ports: [
      port({ id: "sdi-in", name: "3G-SDI In", direction: "in", signal_type: "sdi-3g", connector: "bnc", count: 4 }),
      port({ id: "hdmi-in", name: "HDMI 1.4 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 6 }),
      port({ id: "dp-in", name: "DisplayPort 1.1 In", direction: "in", signal_type: "displayport", connector: "displayport", count: 6 }),
      port({ id: "sdi-out", name: "3G-SDI Out", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 4 }),
      port({ id: "hdmi-out", name: "HDMI 1.4 Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 4 }),
      port({ id: "hdmi-mv", name: "HDMI Multiviewer", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 2 }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-loop", name: "Genlock Loop", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "s3d-in", name: "S3D Sync In", direction: "in", signal_type: "framelock", connector: "din", count: 4 }),
      port({ id: "s3d-out", name: "S3D Sync Out", direction: "out", signal_type: "framelock", connector: "din", count: 2 }),
    ],
  },
  {
    id: "barco.event-master-ex",
    port_data_confidence: "medium",
    notes:
      "The EX spec sheet gives genlock and Ethernet as fixed connectors. Video I/O is two card slots, up to 8 inputs or up to 8 outputs, with no fixed connector mix, so those counts are left empty.",
    sources: [
      source(
        "https://assets.barco.com/m/551c7b03df99bf34/original/Ex-en-Spec-sheet.pdf",
        "Barco Event Master EX spec sheet",
        "Two card slots, up to 8 inputs or up to 8 outputs. Analog reference input on BNC and a reference output. Ethernet RJ-45.",
      ),
    ],
    ports: [
      port({
        id: "video-in",
        name: "Video In",
        direction: "in",
        signal_type: "unknown",
        connector: "unknown",
        count: null,
        confidence: "medium",
        notes: "Up to 8 inputs. The sheet does not name the connectors.",
      }),
      port({
        id: "video-out",
        name: "Video Out",
        direction: "out",
        signal_type: "unknown",
        connector: "unknown",
        count: null,
        confidence: "medium",
        notes: "Up to 8 outputs. The sheet does not name the connectors.",
      }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-out", name: "Genlock Out", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "lan", name: "Ethernet", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
    ],
  },
  {
    id: "barco.imagepro-4k",
    port_data_confidence: "high",
    notes:
      "Factory Tri-Combo cards. The spec sheet's '2x 12G or 4x 3G' describes the same four BNC connectors, which the user guide labels SDI 1 through SDI 4. The count stored is 4, not 2 plus 4.",
    sources: [
      source(
        "https://assets.barco.com/asset/e5493634-05e3-465e-b0d7-977b0e13d258/ImagePRO-4K-en-Spec-sheet.pdf",
        "Barco ImagePRO-4K spec sheet",
        "Factory Tri-Combo input and output: 1x HDMI 2.0, 1x DisplayPort 1.2, and 2x 12G-SDI or 4x 3G-SDI. Genlock input and reference output. Ethernet RJ-45.",
      ),
      {
        url: "https://www.barco.com/en/product/imagepro-4k",
        title: "Barco ImagePRO-4K product page",
        retrieved: "2026-11-14",
        kind: "product-page",
        notes: "Repeats the factory Tri-Combo connector list.",
      },
    ],
    ports: [
      port({ id: "hdmi-in", name: "HDMI 2.0 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "dp-in", name: "DisplayPort 1.2 In", direction: "in", signal_type: "displayport", connector: "displayport", count: 1 }),
      port({ id: "sdi-in", name: "SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: 4, convertible: true, notes: "Four BNCs. Usable as 2x 12G or 4x 3G." }),
      port({ id: "hdmi-out", name: "HDMI 2.0 Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "dp-out", name: "DisplayPort 1.2 Out", direction: "out", signal_type: "displayport", connector: "displayport", count: 1 }),
      port({ id: "sdi-out", name: "SDI Out", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 4, convertible: true, notes: "Four BNCs. Usable as 2x 12G or 4x 3G." }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-out", name: "Genlock Out", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "lan", name: "Ethernet", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
    ],
  },
  {
    id: "brompton.tessera-s4",
    port_data_confidence: "high",
    notes: "The S4 sheet lists one DVI-D input. HDMI is only via an adapter, so no HDMI connector is stored.",
    sources: [
      source(
        "https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-S4-Data-Sheet-Mar2025-EN.pdf",
        "Brompton Tessera S4 data sheet, March 2025",
        "One DVI-D input. Four 1G Tessera outputs. One Gigabit management port. One DisplayPort++ monitor output.",
      ),
    ],
    ports: [
      port({ id: "dvi-in", name: "DVI-D In", direction: "in", signal_type: "dvi", connector: "dvi-d", count: 1, max_format: "1920x1080" }),
      port({ id: "eth-1g", name: "1G Ethernet Out", direction: "out", signal_type: "ethernet", connector: "rj45", count: 4 }),
      port({ id: "mgmt", name: "Management Ethernet", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "dp-ui", name: "Monitor Out", direction: "out", signal_type: "displayport", connector: "displayport", count: 1 }),
    ],
  },
  {
    id: "brompton.tessera-t1",
    port_data_confidence: "high",
    notes: "The T1 sheet lists one DVI-D input and one 1G output. HDMI is only via an adapter.",
    sources: [
      source(
        "https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-T1-Data-Sheet-Mar2025-EN.pdf",
        "Brompton Tessera T1 data sheet, March 2025",
        "One DVI-D input. One 1G Tessera output. One Gigabit management port. DMX in and thru. One DisplayPort++ monitor output.",
      ),
    ],
    ports: [
      port({ id: "dvi-in", name: "DVI-D In", direction: "in", signal_type: "dvi", connector: "dvi-d", count: 1, max_format: "1920x1080" }),
      port({ id: "eth-1g", name: "1G Ethernet Out", direction: "out", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "mgmt", name: "Management Ethernet", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "dmx-in", name: "DMX In", direction: "in", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "dmx-thru", name: "DMX Thru", direction: "out", signal_type: "other", connector: "xlr-5", count: 1 }),
      port({ id: "dp-ui", name: "Monitor Out", direction: "out", signal_type: "displayport", connector: "displayport", count: 1 }),
    ],
  },
  {
    id: "brompton.tessera-xd",
    port_data_confidence: "high",
    notes:
      "The XD sheet lists one copper trunk input and one fiber trunk input that auto-switch, plus a thru. It does not state a second physical thru connector, so thru is one port.",
    sources: [
      source(
        "https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-XD-Data-Sheet-Feb2025-EN.pdf",
        "Brompton Tessera XD data sheet, February 2025",
        "One 10G copper input, one 10G fiber input, a 10G thru, and ten 1G outputs. powerCON TRUE1 with a through port.",
      ),
    ],
    ports: [
      port({ id: "trunk-cu", name: "10G Copper In", direction: "in", signal_type: "ethernet", connector: "ethercon", count: 1 }),
      port({ id: "trunk-fiber", name: "10G Fiber In", direction: "in", signal_type: "ethernet", connector: "opticalcon-duo", count: 1 }),
      port({
        id: "trunk-thru",
        name: "10G Thru",
        direction: "out",
        signal_type: "ethernet",
        connector: "unknown",
        count: 1,
        notes: "One thru that auto-switches between fiber and copper. The sheet does not name a second thru connector, so the connector family is left unknown.",
      }),
      port({ id: "eth-1g", name: "1G Out", direction: "out", signal_type: "ethernet", connector: "ethercon", count: 10 }),
      port({ id: "power-in", name: "powerCON In", direction: "in", signal_type: "power", connector: "powercon-true1", count: 1 }),
      port({ id: "power-thru", name: "powerCON Thru", direction: "out", signal_type: "power", connector: "powercon-true1", count: 1 }),
    ],
  },
  {
    id: "panasonic.av-uhs500",
    port_data_confidence: "high",
    notes:
      "Standard chassis only. The spec page says an option unit can add more SDI and HDMI. Those extra lines are not stored. SDI IN 1/2 and HDMI IN 1/2 exclude each other.",
    sources: [
      {
        url: "https://pro-av.panasonic.net/en/products/av-uhs500/spec.html",
        title: "Panasonic AV-UHS500 specifications",
        retrieved: "2026-11-14",
        kind: "product-page",
        notes: "SDI IN BNC x8. HDMI IN x2. SDI OUT BNC x5. HDMI OUT x2. Reference BNC x2.",
      },
    ],
    ports: [
      port({ id: "sdi-in", name: "12G-SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: 8 }),
      port({ id: "hdmi-in", name: "HDMI In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 2 }),
      port({ id: "sdi-out", name: "12G-SDI Out", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 5 }),
      port({ id: "hdmi-out", name: "HDMI Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 2 }),
      port({ id: "ref", name: "Reference", direction: "bidirectional", signal_type: "ref", connector: "bnc", count: 2, notes: "Input with loop-through, or two black-burst outputs in internal sync." }),
    ],
  },
  {
    id: "panasonic.kairos",
    port_data_confidence: "medium",
    notes:
      "Fixed main-frame terminals from the Kairos Core specifications table. SDI and HDMI are optional boards and the maxima differ by SKU (for example AT-KC2000/AT-KC200 max 32 SDI in and 16 SDI out at HD, AT-KC200L1 ships 24 in / 12 out). Those maxima are not stored as connector counts.",
    sources: [
      {
        url: "https://pro-av.panasonic.net/en/products/it_ip_platform/at-kc2000_spec.html",
        title: "Panasonic Kairos Core 2000/200 specifications",
        retrieved: "2026-11-14",
        kind: "product-page",
        notes: "AC IN x2. DisplayPort 1.4 x4 for multiview. LAN RJ-45 x2. VGA D-sub 15. USB 3.2 Type-A x4. SDI and HDMI are optional and listed only as maxima.",
      },
    ],
    ports: [
      port({ id: "power", name: "AC In", direction: "in", signal_type: "power", connector: "iec-c14", count: 2 }),
      port({ id: "dp-mv", name: "Multiview Out", direction: "out", signal_type: "displayport", connector: "displayport", count: 4, max_format: "DisplayPort 1.4" }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 2 }),
      port({ id: "vga", name: "VGA", direction: "out", signal_type: "vga", connector: "vga-hd15", count: 1 }),
      port({ id: "usb", name: "USB", direction: "bidirectional", signal_type: "usb", connector: "usb-a", count: 4 }),
      port({
        id: "sdi",
        name: "SDI",
        direction: "bidirectional",
        signal_type: "sdi-unspecified",
        connector: "unknown",
        count: null,
        optional: true,
        confidence: "medium",
        notes: "Optional boards. The specifications table lists maxima that differ by SKU, not a shipped connector count.",
      }),
      port({
        id: "hdmi",
        name: "HDMI",
        direction: "bidirectional",
        signal_type: "hdmi",
        connector: "hdmi-a",
        count: null,
        optional: true,
        confidence: "medium",
        notes: "Optional input or output boards. The table lists maxima, not a shipped count.",
      }),
    ],
  },
  {
    id: "sony.xvs-g1",
    port_data_confidence: "high",
    notes:
      "Standard rear panel from the XVS-G1 user's guide: inputs 1–24 and outputs 1–12. Inputs 25–44 and outputs 13–24 need optional XKS-G1110 boards and are not included in the count. The Sony spec sheet's 44 and 24 are those maxima.",
    sources: [
      {
        url: "https://pro.sony/support/res/manuals/5031/a79518bcdf2341427a14fd3b8ab29faa/50310861M.pdf",
        title: "Sony XVS-G1 system user's guide",
        retrieved: "2026-11-14",
        kind: "manual-pdf",
        notes: "INPUT 1 to 24 and OUTPUT 1 to 12 are on the standard connector boards. INPUT 25 to 44 and OUTPUT 13 to 24 require optional boards.",
      },
      source(
        "https://pro.sony/en_BD/pdf/products/video-switchers/xvs-g1",
        "Sony XVS-G1 specifications",
        "Reference input BNC x2 with loop-through. Reference output BNC x1. LAN x2. The 44/24 SDI figures are maxima with all option boards.",
      ),
    ],
    ports: [
      port({ id: "sdi-in", name: "SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: 24, notes: "Inputs 1–24. Inputs 25–44 are optional." }),
      port({ id: "sdi-out", name: "SDI Out", direction: "out", signal_type: "sdi-12g", connector: "bnc", count: 12, notes: "Outputs 1–12. Outputs 13–24 are optional." }),
      port({ id: "ref-in", name: "Reference In", direction: "in", signal_type: "ref", connector: "bnc", count: 2 }),
      port({ id: "ref-out", name: "Reference Out", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 2 }),
      port({ id: "gpi", name: "GPI", direction: "bidirectional", signal_type: "gpio", connector: "db25", count: 1 }),
      port({ id: "usb2", name: "USB 2.0", direction: "bidirectional", signal_type: "usb", connector: "usb-a", count: 2 }),
      port({ id: "usb3", name: "USB 3.0", direction: "bidirectional", signal_type: "usb", connector: "usb-a", count: 2 }),
    ],
  },
  xvsChassis("sony.xvs-9000", 6, "Up to 160 inputs and up to 80 outputs. Those figures are the slot maxima, not a shipped connector count."),
  xvsChassis("sony.xvs-8000", 4, "Up to 160 inputs and up to 48 outputs. Those figures are the slot maxima, not a shipped connector count."),
  xvsChassis("sony.xvs-7000", 4, "Up to 112 inputs and up to 48 outputs. Those figures are the slot maxima, not a shipped connector count."),
  xvsChassis("sony.xvs-6000", 2, "Up to 64 inputs and up to 24 outputs. Those figures are the slot maxima, not a shipped connector count."),
  {
    id: "panasonic.av-hs6000",
    port_data_confidence: "high",
    notes:
      "Mainframe AV-HS60U2 only. The control panel is a separate unit and its connectors are not copied here. Standard mode uses all 32 input BNCs and 32 output BNCs. The 32 output BNCs are 16 lines with a distributed copy on each line. 3G mode uses the odd-numbered terminals.",
    sources: [
      {
        url: "https://pro-av.panasonic.net/en/products/av-hs6000/spec.html",
        title: "Panasonic AV-HS6000 specifications",
        retrieved: "2026-11-14",
        kind: "tech-specs",
        notes: "SDI IN BNC x 32. DVI-D IN x 2. SDI OUT BNC x 32, 16 lines with two distributed outputs per line. Reference BNC with loop-through, or two black-burst outputs in internal sync. LTC IN BNC. LAN and PANEL RJ-45. COM D-sub 9-pin x 4. GPI IN D-sub 25-pin x 1. GPI OUT D-sub 25-pin x 2.",
      },
    ],
    ports: [
      port({ id: "sdi-in", name: "SDI In", direction: "in", signal_type: "sdi-3g", connector: "bnc", count: 32, notes: "All 32 BNCs in standard HD/SD mode. 3G mode uses the odd-numbered terminals." }),
      port({ id: "dvi-in", name: "DVI-D In", direction: "in", signal_type: "dvi", connector: "dvi-d", count: 2 }),
      port({ id: "sdi-out", name: "SDI Out", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 32, notes: "16 lines, two BNCs per line." }),
      port({ id: "ref", name: "Reference", direction: "bidirectional", signal_type: "ref", connector: "bnc", count: 2, notes: "Loop-through in genlock, or two black-burst outputs in internal sync." }),
      port({ id: "ltc-in", name: "LTC In", direction: "in", signal_type: "timecode-ltc", connector: "bnc", count: 1 }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "panel", name: "Panel", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1, notes: "Link to the control panel." }),
      port({ id: "com", name: "RS-422", direction: "bidirectional", signal_type: "rs-422", connector: "db9", count: 4 }),
      port({ id: "gpi-in", name: "GPI In", direction: "in", signal_type: "gpio", connector: "db25", count: 1 }),
      port({ id: "gpi-out", name: "GPI Out", direction: "out", signal_type: "gpio", connector: "db25", count: 2 }),
    ],
  },
  {
    id: "panasonic.av-hs410",
    port_data_confidence: "high",
    notes:
      "Standard chassis from the Panasonic switcher comparison sheet. Two option slots can add more inputs or outputs. Those optional lines are not stored.",
    sources: [
      {
        url: "https://pro-av.panasonic.net/en/sales_o/switcher_mixer/spec.pdf",
        title: "Panasonic live switcher comparison specifications, April 2017",
        retrieved: "2026-11-14",
        kind: "datasheet-pdf",
        notes: "AV-HS410 standard SDI: 8 lines, BNC x 8. Standard DVI-D input x 1. Standard SDI output: 5 lines, BNC x 6, with OUT 1 distributed to two BNCs. Standard DVI-D output x 1.",
      },
    ],
    ports: [
      port({ id: "sdi-in", name: "SDI In", direction: "in", signal_type: "sdi-hd", connector: "bnc", count: 8, notes: "Inputs 1–8. Option slots are not included." }),
      port({ id: "dvi-in", name: "DVI-D In", direction: "in", signal_type: "dvi", connector: "dvi-d", count: 1 }),
      port({ id: "sdi-out", name: "SDI Out", direction: "out", signal_type: "sdi-hd", connector: "bnc", count: 6, notes: "Five lines. OUT 1 is distributed to two BNCs." }),
      port({ id: "dvi-out", name: "DVI-D Out", direction: "out", signal_type: "dvi", connector: "dvi-d", count: 1 }),
    ],
  },
  {
    id: "panasonic.av-hs50",
    port_data_confidence: "high",
    notes:
      "The catalog id follows the Companion name AV-HS50. Panasonic sells this chassis as the AW-HS50. SDI OUT 1 is one signal split onto two BNCs, so the physical SDI output count is 3.",
    sources: [
      {
        url: "https://pro-av.panasonic.net/en/sales_o/switcher_mixer/aw-hs50/av-hs50_spec.pdf",
        title: "Panasonic AW-HS50 specifications",
        retrieved: "2026-11-14",
        kind: "datasheet-pdf",
        notes: "Four SDI inputs. Two SDI output lines, with SDI OUT 1 split into two. One DVI-D input and one DVI-D output. LAN RJ-45 x 1. Tally/GPI D-sub 15-pin x 1.",
      },
      {
        url: "https://pro-av.panasonic.net/en/sales_o/switcher_mixer/spec.pdf",
        title: "Panasonic live switcher comparison specifications, April 2017",
        retrieved: "2026-11-14",
        kind: "datasheet-pdf",
        notes: "AW-HS50: 4 lines, BNC x 4 in. SDI out 2 lines, BNC x 3.",
      },
    ],
    ports: [
      port({ id: "sdi-in", name: "SDI In", direction: "in", signal_type: "sdi-hd", connector: "bnc", count: 4 }),
      port({ id: "dvi-in", name: "DVI-D In", direction: "in", signal_type: "dvi", connector: "dvi-d", count: 1 }),
      port({ id: "sdi-out", name: "SDI Out", direction: "out", signal_type: "sdi-hd", connector: "bnc", count: 3, notes: "OUT 1 is one line on two BNCs. OUT 2 is the second line." }),
      port({ id: "dvi-out", name: "DVI-D Out", direction: "out", signal_type: "dvi", connector: "dvi-d", count: 1 }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1 }),
      port({ id: "gpi", name: "Tally / GPI", direction: "bidirectional", signal_type: "gpio", connector: "other", count: 1, notes: "D-sub 15-pin. Five inputs and seven outputs on the one connector." }),
    ],
  },
  {
    id: "panasonic.av-hsw10",
    port_data_confidence: "high",
    notes:
      "Physical jacks from the AV-HSW10 operating instructions. SDI IN 1 and HDMI IN 1 are mutually exclusive, and both connectors are present. SRT and NDI use the LAN jack, so they are not extra connectors.",
    sources: [
      {
        url: "https://pro-av.panasonic.net/manual/pdf/AV-HSW10PJ.EJ_full(DVQP3077ZA)_E.pdf",
        title: "Panasonic AV-HSW10 operating instructions",
        retrieved: "2026-11-14",
        kind: "manual-pdf",
        notes: "SDI IN 1 to 4, BNC x 4. SDI OUT 1 and 2, BNC x 2. HDMI IN 1 and 2. HDMI OUT x 1. Reference BNC x 2. LAN RJ-45 x 1. USB Type-C x 1 and USB Type-A x 1.",
      },
    ],
    ports: [
      port({ id: "sdi-in", name: "3G-SDI In", direction: "in", signal_type: "sdi-3g", connector: "bnc", count: 4, notes: "SDI IN 1 excludes HDMI IN 1." }),
      port({ id: "hdmi-in", name: "HDMI In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 2, notes: "HDMI IN 1 excludes SDI IN 1." }),
      port({ id: "sdi-out", name: "3G-SDI Out", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 2 }),
      port({ id: "hdmi-out", name: "HDMI Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 1 }),
      port({ id: "usb-c", name: "USB Stream Out", direction: "out", signal_type: "usb", connector: "usb-c", count: 1 }),
      port({ id: "ref", name: "Reference", direction: "bidirectional", signal_type: "ref", connector: "bnc", count: 2 }),
      port({ id: "audio-in", name: "Audio In", direction: "in", signal_type: "audio-analog", connector: "rca", count: 2 }),
      port({ id: "phones", name: "Headphones", direction: "out", signal_type: "audio-analog", connector: "trs-3.5", count: 1 }),
      port({ id: "lan", name: "LAN", direction: "bidirectional", signal_type: "ethernet", connector: "rj45", count: 1, notes: "IP control, SRT, and NDI share this jack." }),
      port({ id: "gpi", name: "Tally / GPI", direction: "bidirectional", signal_type: "gpio", connector: "other", count: 1, notes: "D-sub 15-pin." }),
      port({ id: "usb-a", name: "USB", direction: "bidirectional", signal_type: "usb", connector: "usb-a", count: 1 }),
      port({ id: "dc-in", name: "DC In", direction: "in", signal_type: "power", connector: "other", count: 1, notes: "DC 16 V inlet. The manual does not name the shell." }),
    ],
  },
];

export const datasheetExtraDevices = [
  {
    id: "barco.event-master-e2-original",
    manufacturer: "Barco",
    manufacturer_id: "barco",
    model: "Event Master E2 (original)",
    product_line: "Event Master",
    sku: "NGS-4U",
    category: "image-processor",
    status: "current",
    form_factor: "4RU",
    rack_units: 4,
    power: null,
    control_protocols: [],
    companion_modules: ["barco-eventmaster"],
    aliases: ["E2 Gen 1", "NGS-4U"],
    variants: [],
    modular: true,
    port_data_confidence: "high",
    notes:
      "Original full-size E2, model NGS-4U, from the Barco spec sheet that is not the Gen 2 sheet. barco.event-master-e2 remains the Gen 2 (NGS-4U-V2) mix. A different card load changes these counts.",
    sources: [
      source(
        "https://assets.barco.com/m/753c2b29df077031/original/E2-en-Spec-sheet.pdf",
        "Barco E2 spec sheet (NGS-4U)",
        "Inputs: 12x SD/HD/3G SDI, 10x HDMI 1.4a, 10x DisplayPort 1.1. Outputs: 4x SD/HD/3G SDI, 8x HDMI 1.4a, 2x HDMI multiviewer. Genlock input/loop. S3D 4 DIN in, 2 DIN out.",
      ),
    ],
    ports: [
      port({ id: "sdi-in", name: "3G-SDI In", direction: "in", signal_type: "sdi-3g", connector: "bnc", count: 12 }),
      port({ id: "hdmi-in", name: "HDMI 1.4 In", direction: "in", signal_type: "hdmi", connector: "hdmi-a", count: 10 }),
      port({ id: "dp-in", name: "DisplayPort 1.1 In", direction: "in", signal_type: "displayport", connector: "displayport", count: 10 }),
      port({ id: "sdi-out", name: "3G-SDI Out", direction: "out", signal_type: "sdi-3g", connector: "bnc", count: 4 }),
      port({ id: "hdmi-out", name: "HDMI 1.4 Out", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 8 }),
      port({ id: "hdmi-mv", name: "HDMI Multiviewer", direction: "out", signal_type: "hdmi", connector: "hdmi-a", count: 2 }),
      port({ id: "ref-in", name: "Genlock In", direction: "in", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "ref-loop", name: "Genlock Loop", direction: "out", signal_type: "ref", connector: "bnc", count: 1 }),
      port({ id: "s3d-in", name: "S3D Sync In", direction: "in", signal_type: "framelock", connector: "din", count: 4 }),
      port({ id: "s3d-out", name: "S3D Sync Out", direction: "out", signal_type: "framelock", connector: "din", count: 2 }),
    ],
  },
];
