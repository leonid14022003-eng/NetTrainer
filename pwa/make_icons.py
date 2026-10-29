#!/usr/bin/env python3
"""Рисует иконки приложения в pwa/icons/ (нужен Pillow). Запускать только если меняется рисунок:
готовые PNG лежат в репозитории, build.py просто копирует их в docs/icons/."""
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent / 'icons'
TOP, BOTTOM = (2, 121, 177), (14, 40, 77)      # --ptcyan → --ptnavy из css/style.css
LED = (31, 191, 53)                              # --led-up: «линк поднят»
SS = 4                                           # рисуем крупнее и уменьшаем — сглаживание


def gradient(s):
    img = Image.new('RGBA', (s, s))
    px = img.load()
    for y in range(s):
        k = y / (s - 1)
        c = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * k) for i in range(3)) + (255,)
        for x in range(s):
            px[x, y] = c
    return img


def graph(img, scale=1.0):
    """Сеть-звезда: узел в центре и три вокруг, все соединены."""
    s = img.size[0]
    d = ImageDraw.Draw(img, 'RGBA')
    cx, cy = s * 0.5, s * 0.52
    r = s * 0.25 * scale
    outer = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in (-90, 150, 30)]
    for i in range(3):
        d.line([outer[i], outer[(i + 1) % 3]], fill=(255, 255, 255, 90), width=round(s * 0.018 * scale))
    for p in outer:
        d.line([(cx, cy), p], fill=(255, 255, 255, 235), width=round(s * 0.038 * scale))
    for x, y in outer:
        rr = s * 0.078 * scale
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(255, 255, 255, 255))
        ri = rr * 0.42
        d.ellipse([x - ri, y - ri, x + ri, y + ri], fill=TOP + (255,))
    rc = s * 0.12 * scale
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], fill=(255, 255, 255, 255))
    ring = rc * 0.68
    d.ellipse([cx - ring, cy - ring, cx + ring, cy + ring], outline=BOTTOM + (255,), width=round(s * 0.022 * scale))
    led = rc * 0.3
    d.ellipse([cx - led, cy - led, cx + led, cy + led], fill=LED + (255,))
    return img


def square(size, scale=1.0):
    big = graph(gradient(size * SS), scale)
    return big.resize((size, size), Image.LANCZOS)


def rounded(size):
    """Обычная иконка: скруглённый квадрат с небольшим полем (Mac, браузеры)."""
    s = size * SS
    pad = round(s * 0.06)
    inner = s - 2 * pad
    tile = graph(gradient(inner))
    mask = Image.new('L', (inner, inner), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, inner - 1, inner - 1], radius=round(inner * 0.225), fill=255)
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    img.paste(tile, (pad, pad), mask)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    rounded(512).save(OUT / 'icon-512.png')
    rounded(192).save(OUT / 'icon-192.png')
    square(512, scale=0.82).save(OUT / 'icon-maskable-512.png')      # Android обрезает края по своей маске
    square(180).convert('RGB').save(OUT / 'apple-touch-icon.png')    # iPhone сам скругляет углы, прозрачность не нужна
    for f in sorted(OUT.glob('*.png')):
        print(f.name, Image.open(f).size)


if __name__ == '__main__':
    main()
