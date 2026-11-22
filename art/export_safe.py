"""Create the portfolio's compact assembly mesh from the 040 review model."""
import json
import struct
import sys
from pathlib import Path

source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert source["design_id"] == "sequence_safe_040"
output = Path(__file__).resolve().parents[1] / "assets" / "safe-040.bin"
with output.open("wb") as stream:
    stream.write(struct.pack("<I", len(source["meshes"])))
    for part in source["meshes"]:
        vertices, faces = part["vertices"], part["triangles"]
        stream.write(struct.pack("<III", len(vertices), len(faces), int(part["color"][1:], 16)))
        for x, y, z in vertices:
            stream.write(struct.pack("<fff", x, z, -y))
        for a, b, c in faces:
            stream.write(struct.pack("<III", a, b, c))
