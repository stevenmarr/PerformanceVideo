# Signal propagation

Pick a source on the drawing. The app walks every cable downstream.

- Each device has latency in milliseconds and frames. Until you edit it, the value is an estimate (default 0 ms and 1 frame) and the path is marked as an estimate.
- The total at a destination is the sum of every device on the path, including the source and the destination.
- A cable whose format differs from the format coming into that hop is a mismatch warning.
- A cable whose device is missing is a broken path.
- Play lights the cables in path order.
