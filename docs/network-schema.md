# Network file schema `pvllc.network/1.0.0`

Each drawing box can carry interfaces. The single IP shown on the node is the first address, kept in sync when the table changes.

```json
{
  "schema": "pvllc.network/1.0.0",
  "show": "JPM",
  "devices": [
    {
      "id": "box-1",
      "label": "CAM-1",
      "interfaces": [
        {
          "name": "eth0",
          "mode": "static",
          "address": "10.0.10.21",
          "cidr": 24,
          "gateway": "10.0.10.1",
          "vlan": 10,
          "mac": "aa:bb:cc:dd:ee:21",
          "hostname": "cam-1"
        }
      ]
    }
  ]
}
```

Checks: valid IPv4, CIDR 0–32, network and broadcast addresses, gateway inside the interface subnet, duplicate addresses, duplicate MACs, duplicate hostnames, overlapping prefixes, and the same subnet claimed by two VLANs.

CSV columns: device, interface, mode, address, cidr, gateway, vlan, mac, hostname.
