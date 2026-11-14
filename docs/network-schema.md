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

Checks: valid IPv4 or IPv6, an IPv4 prefix of 0–32 or an IPv6 prefix of 0–128, IPv4 network and broadcast addresses, the IPv6 subnet-router anycast, a gateway inside the interface subnet, duplicate addresses (compressed and expanded IPv6 are the same address), duplicate MACs, duplicate hostnames, overlapping prefixes of the same family, and the same subnet claimed by two VLANs.

An address is written the way it was typed. Grouping uses the canonical network, so `2001:db8:1::5/64` is grouped as `2001:db8:1::/64`. A zone index such as `%eth0` is not accepted.

CSV columns: device, interface, mode, address, cidr, gateway, vlan, mac, hostname.
