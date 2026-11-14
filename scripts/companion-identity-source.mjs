// @ts-nocheck
/**
 * Priority A Companion manufacturers as identity-only nodes.
 * Models are names that appear in docs/catalog-companion-gap.md.
 * ports is always empty. No port count is recorded.
 */

const NOTE =
  "Identity only. The model name comes from a Bitfocus Companion module. Port counts were not read from a datasheet and must not be invented.";

function device({ manufacturer, manufacturerId, model, category, line, module, aliases = [] }) {
  const slug = model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id: `${manufacturerId}.${slug}`,
    manufacturer,
    manufacturer_id: manufacturerId,
    model,
    product_line: line,
    sku: null,
    category,
    status: "current",
    form_factor: null,
    rack_units: null,
    power: null,
    ports: [],
    control_protocols: [],
    companion_modules: [module],
    aliases,
    variants: [],
    modular: false,
    notes: `${NOTE} Module ${module}.`,
    sources: [
      {
        url: "https://bitfocus.io/connections",
        title: `Bitfocus Companion — ${module}`,
        retrieved: "2026-11-13",
        kind: "companion-module",
        notes: "Identity only. No connector counts were copied from Companion.",
      },
    ],
    port_data_confidence: "none",
  };
}

function family(manufacturer, manufacturerId, models, category, line, module) {
  return models.map((model) => device({ manufacturer, manufacturerId, model, category, line, module }));
}

export const companionIdentityCatalog = {
  schema_version: "1.0.0",
  generated_at: "2026-11-14T00:00:00-06:00",
  source_notes:
    "Identity-only nodes for Companion manufacturers that are not in the 13-brand catalog. Priority A from docs/catalog-companion-gap.md. Ports are empty on purpose.",
  devices: [
    device({ manufacturer: "AV Stumpfl", manufacturerId: "avstumpfl", model: "PIXERA", category: "media-server", line: "PIXERA", module: "avstumpfl-pixera" }),
    device({ manufacturer: "disguise", manufacturerId: "disguise", model: "disguise server", category: "media-server", line: "disguise", module: "disguise-osc", aliases: ["disguise OSC", "disguise SMC"] }),
    ...family("Anomes", "anomes", ["Millumin 2", "Millumin 3", "Millumin 4"], "media-server", "Millumin", "anomes-millumin"),
    device({ manufacturer: "Resolume", manufacturerId: "resolume", model: "Arena", category: "media-server", line: "Arena", module: "resolume-arena" }),
    ...family("Dataton", "dataton", ["WATCHOUT", "WATCHOUT 7"], "media-server", "WATCHOUT", "dataton-watchout"),
    device({ manufacturer: "Green Hippo", manufacturerId: "greenhippo", model: "Hippotizer", category: "media-server", line: "Hippotizer", module: "greenhippo-hippotizer-rest" }),
    device({ manufacturer: "7thSense Design", manufacturerId: "seventhsense", model: "Delta Media Server", category: "media-server", line: "Delta", module: "7thsensedesign-delta" }),
    device({ manufacturer: "NewTek", manufacturerId: "newtek", model: "TriCaster", category: "switcher", line: "TriCaster", module: "newtek-tricaster" }),
    device({ manufacturer: "NewTek", manufacturerId: "newtek", model: "NDI Studio Monitor", category: "monitor", line: "NDI", module: "newtek-ndistudiomonitor" }),
    device({ manufacturer: "StudioCoast", manufacturerId: "studiocoast", model: "vMix", category: "switcher", line: "vMix", module: "studiocoast-vmix" }),
    ...family("Roland", "roland", ["V-1HD", "V-1-4K", "V-60HD", "V-80HD", "V-160HD", "V-600UHD", "V-1200HD", "P-20HD"], "switcher", "V-series", "roland-v160hd"),
    device({ manufacturer: "FOR-A", manufacturerId: "fora", model: "Hanabi HVS", category: "switcher", line: "Hanabi", module: "fora-hvs" }),
    device({ manufacturer: "FOR-A", manufacturerId: "fora", model: "MFR", category: "router", line: "MFR", module: "fora-mfr" }),
    device({ manufacturer: "Datavideo", manufacturerId: "datavideo", model: "DVIP switcher", category: "switcher", line: "DVIP", module: "datavideo-dvip" }),
    device({ manufacturer: "Datavideo", manufacturerId: "datavideo", model: "VISCA camera", category: "ptz-camera", line: "VISCA", module: "datavideo-visca" }),
    ...family(
      "NovaStar",
      "novastar",
      ["MCTRL4K", "VX1000", "VX600", "VX4S", "VX6S", "NovaPro HD", "NovaPro UHD Jr", "J6", "H-Series", "MX40 Pro", "CX80 Pro", "KU20", "D12", "N10", "N20", "DB4K", "MxReal 3"],
      "led-processor",
      "NovaStar",
      "novastar-controller",
    ),
    device({ manufacturer: "Colorlight", manufacturerId: "colorlight", model: "GrandShow", category: "media-server", line: "GrandShow", module: "colorlight-grandshow" }),
    ...family("Colorlight", "colorlight", ["U Series", "Z Series", "X Series", "V Series", "VX Series", "D Series", "S Series"], "led-processor", "Colorlight", "colorlight-processor"),
    device({ manufacturer: "BirdDog", manufacturerId: "birddog", model: "PTZ family", category: "ptz-camera", line: "PTZ", module: "birddog-ptz" }),
    device({ manufacturer: "BirdDog", manufacturerId: "birddog", model: "Converters", category: "converter", line: "Converters", module: "birddog-converters" }),
    device({ manufacturer: "BirdDog", manufacturerId: "birddog", model: "Connect", category: "streaming", line: "Connect", module: "birddog-connect" }),
    device({ manufacturer: "BirdDog", manufacturerId: "birddog", model: "Central", category: "other", line: "Central", module: "birddog-central" }),
    ...family("Magewell", "magewell", ["Ultra Stream", "Ultra Encode", "Pro Convert", "Director Mini"], "streaming", "Ultra", "magewell-ultrastream"),
    ...family("Teradek", "teradek", ["Prism", "Prism Flex", "VidiU", "VidiU X"], "streaming", "Prism", "teradek-prism"),
    ...family("Kiloview", "kiloview", ["N50", "N60", "FN-50", "FN-60", "E1", "E2", "E3", "D260", "D350", "CUBE R1", "CUBE X1"], "converter", "NDI", "kiloview-ndi"),
    ...family("Canon", "canon", ["CR-N100", "CR-N300", "CR-N350", "CR-N400", "CR-N500", "CR-N700", "CR-X300", "CR-X500"], "ptz-camera", "CR", "canon-ptz"),
    ...family("Canon", "canon", ["RC-IP1000"], "control-panel", "RC", "canon-controller"),
    ...family("Canon", "canon", ["C70", "C80", "C300", "C500", "XF605"], "cinema-camera", "Cinema", "canon-xf"),
    device({ manufacturer: "Lumens", manufacturerId: "lumens", model: "PTZ family", category: "ptz-camera", line: "VISCA", module: "lumens-visca" }),
    device({ manufacturer: "Lumens", manufacturerId: "lumens", model: "Media processor", category: "image-processor", line: "Media processor", module: "lumens-mediaprocessor" }),
    ...family("Marshall", "marshall", ["CV355", "CV420", "CV420e", "CV620", "CV630", "CV730"], "ptz-camera", "CV", "marshall-ipcamera"),
    device({ manufacturer: "JVC", manufacturerId: "jvc", model: "PTZ family", category: "ptz-camera", line: "PTZ", module: "jvc-ptz" }),
    device({ manufacturer: "Vaddio", manufacturerId: "vaddio", model: "PTZ family", category: "ptz-camera", line: "PTZ", module: "vaddio-ptz" }),
    ...family("Figure 53", "figure53", ["QLab", "Go Button", "QView"], "media-server", "QLab", "figure53-qlab-advance"),
    device({ manufacturer: "Renewed Vision", manufacturerId: "renewedvision", model: "ProPresenter", category: "media-server", line: "ProPresenter", module: "renewedvision-propresenter-api" }),
    device({ manufacturer: "Extron", manufacturerId: "extron", model: "DXP", category: "router", line: "DXP", module: "extron-dxp" }),
    device({ manufacturer: "Extron", manufacturerId: "extron", model: "SMX", category: "router", line: "SMX", module: "extron-smx" }),
    device({ manufacturer: "Kramer", manufacturerId: "kramer", model: "Matrix", category: "router", line: "Matrix", module: "kramer-matrix" }),
    device({ manufacturer: "tvONE", manufacturerId: "tvone", model: "CORIOmaster", category: "image-processor", line: "CORIO", module: "tvone-corio" }),
    device({ manufacturer: "Lightware", manufacturerId: "lightware", model: "LW3 matrix", category: "router", line: "LW3", module: "lightware-lw3" }),
    device({ manufacturer: "Crestron", manufacturerId: "crestron", model: "DM-NVX", category: "router", line: "DM-NVX", module: "crestron-nvx" }),
    device({ manufacturer: "Evertz", manufacturerId: "evertz", model: "Quartz", category: "router", line: "Quartz", module: "evertz-quartz" }),
    device({ manufacturer: "Haivision", manufacturerId: "haivision", model: "Makito X4", category: "streaming", line: "Makito", module: "haivision-makito-x4-encoder" }),
    device({ manufacturer: "Matrox", manufacturerId: "matrox", model: "Monarch", category: "streaming", line: "Monarch", module: "matrox-monarch" }),
    device({ manufacturer: "Riedel", manufacturerId: "riedel", model: "MediorNet", category: "router", line: "MediorNet", module: "riedel-mediornet" }),
    device({ manufacturer: "TSL Products", manufacturerId: "tsl", model: "UMD", category: "tally", line: "UMD", module: "tslproducts-umd" }),
    device({ manufacturer: "Softron", manufacturerId: "softron", model: "OnTheAir Video", category: "player", line: "OnTheAir", module: "softron-ontheairvideo" }),
    device({ manufacturer: "Theatrixx", manufacturerId: "theatrixx", model: "xPressCue", category: "player", line: "xPressCue", module: "theatrixx-xpresscue" }),
    device({ manufacturer: "DT Videolabs", manufacturerId: "dtvideolabs", model: "PlaybackPro Plus", category: "player", line: "PlaybackPro", module: "dtvideolabs-playbackproplus" }),
    device({ manufacturer: "Smode", manufacturerId: "smode", model: "Smode Live", category: "media-server", line: "Smode", module: "smodetech-smodelive" }),
    ...family("VYV", "vyv", ["Photon", "Tachyon", "Xenon"], "media-server", "Photon", "vyv-photon"),
    device({ manufacturer: "Avolites", manufacturerId: "avolites", model: "AI", category: "media-server", line: "AI", module: "avolites-ai" }),
    device({ manufacturer: "Telestream", manufacturerId: "telestream", model: "Prism", category: "monitor", line: "Prism", module: "telestream-prism" }),
    device({ manufacturer: "CasparCG", manufacturerId: "casparcg", model: "Server", category: "media-server", line: "CasparCG", module: "casparcg-server" }),
    device({ manufacturer: "VideoLAN", manufacturerId: "videolan", model: "VLC", category: "player", line: "VLC", module: "videolan-vlc" }),
  ],
};
