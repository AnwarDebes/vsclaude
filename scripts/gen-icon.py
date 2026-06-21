#!/usr/bin/env python3
"""Generate the vsclaude source app icon (1024x1024 PNG) with no dependencies.

Draws Pixie, the terracotta-on-charcoal pixel robot, as a clean icon. The Tauri
CLI then resamples this single source into every platform icon size:

    pnpm --filter @vsclaude/desktop tauri icon assets/pixie-icon-source.png
"""
import os
import struct
import zlib

W = H = 1024

# Brand palette.
BG = (26, 22, 20, 255)          # charcoal #1a1614
ACCENT = (217, 119, 87, 255)    # terracotta #d97757
ACCENT_DK = (194, 96, 63, 255)  # #c2603f
DARK = (26, 22, 20, 255)        # eyes / mouth
SURFACE = (44, 37, 33, 255)     # #2c2521
GLOW = (224, 164, 88, 255)      # #e0a458 antenna tips
GREEN = (127, 176, 105, 255)    # #7fb069 chest light

buf = bytearray(W * H * 4)


def put(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        i = (y * W + x) * 4
        buf[i:i + 4] = bytes(c)


def fill_rect(x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)):
            put(x, y, c)


def fill_round_rect(x0, y0, x1, y1, r, c):
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)):
            cx = min(max(x, x0 + r), x1 - r - 1)
            cy = min(max(y, y0 + r), y1 - r - 1)
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(x, y, c)


def fill_circle(cx, cy, r, c):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(x, y, c)


# Background.
fill_rect(0, 0, W, H, BG)

# Antennae with glowing tips.
fill_round_rect(360, 150, 396, 320, 18, ACCENT)
fill_round_rect(628, 150, 664, 320, 18, ACCENT)
fill_circle(378, 150, 40, GLOW)
fill_circle(646, 150, 40, GLOW)

# Head.
fill_round_rect(232, 300, 792, 760, 80, ACCENT)
# A subtle lower band for depth.
fill_round_rect(232, 690, 792, 760, 80, ACCENT_DK)

# Eyes (with a tiny highlight).
fill_circle(388, 470, 58, DARK)
fill_circle(636, 470, 58, DARK)
fill_circle(406, 452, 18, (247, 239, 233, 255))
fill_circle(654, 452, 18, (247, 239, 233, 255))

# Mouth.
fill_round_rect(440, 600, 584, 636, 18, DARK)

# Body hint.
fill_round_rect(360, 780, 664, 900, 40, SURFACE)
fill_round_rect(420, 812, 540, 840, 14, GREEN)


def write_png(path, width, height, data):
    def chunk(typ, payload):
        return (
            struct.pack(">I", len(payload))
            + typ
            + payload
            + struct.pack(">I", zlib.crc32(typ + payload) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(data[y * stride:(y + 1) * stride])
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as fh:
        fh.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "pixie-icon-source.png")
    write_png(out, W, H, buf)
    print("wrote", out)
