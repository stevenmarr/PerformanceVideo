# Patch file schema `pvllc.patch/1.0.0`

A show's cables are the drawing's edges. The patch file is that same list, one connection per cable.

```json
{
  "schema": "pvllc.patch/1.0.0",
  "show": "JPM",
  "connections": [
    {
      "id": "c1",
      "sourceDevice": "CAM-1",
      "sourcePort": "sdi-out-1",
      "destinationDevice": "SW-1",
      "destinationPort": "sdi-in-1",
      "signalType": "sdi-12g",
      "signalFormat": "2160p59.94",
      "cableType": "1694A",
      "cableLength": "25'",
      "cableLabel": "CAM-A",
      "notes": ""
    }
  ]
}
```

CSV uses the same field names as the header row.

Checks:

- Port families that do not match (HDMI into SDI) are errors.
- A faster SDI rate into a slower input is an error. A slower SDI rate into a faster input is a warning.
- Unknown or unverified ports are warnings, not invented types.
- An input with two cables is an error.
- A port marked required and left open is a warning.

`sourceDevice` and `destinationDevice` are the drawing unit ids. `sourcePort` and `destinationPort` are the pin ids.
