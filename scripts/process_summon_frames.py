#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
召唤物 4 宫格雪碧图 -> 单帧 PNG + 水平 strip + manifest
==========================================================

读取 apps/web/public/assets/game/summons/sheets/<cardId>.png（1536x1536，2x2 共
4 帧，#FF00FF 品红抠色背景），按 cardId 切成 4 帧并调用 transparent.py 中的
cutout（默认）或 pillow 方式做透明化处理，对 4 帧统一裁切去边后产出：

  apps/web/public/assets/game/summons/frames/<cardId>/f1.png ... f4.png
      ↳ 单帧 RGBA 透明 PNG，4 帧尺寸统一、原帧中心对齐
  apps/web/public/assets/game/summons/frames/<cardId>.png
      ↳ 水平 4 帧 strip（Phaser load.spritesheet 直接加载）
  apps/web/public/assets/game/summons/frames/manifest.json
      ↳ { cardId: { frameWidth, frameHeight, frameCount, method } }

Usage:
  python scripts/process_summon_frames.py
  python scripts/process_summon_frames.py --method pillow            # 不依赖网络
  python scripts/process_summon_frames.py --only summon_furnace_golem
  python scripts/process_summon_frames.py --workers 6
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

# transparent.py 在仓库根，包含 cutout / pillow / rembg 三种实现。
# 这里直接复用其 cutout.pro API 客户端 + 配置（CUTOUT_API_KEY / CUTOUT_API_URL）。
from transparent import (  # noqa: E402
    CUTOUT_API_KEY,
    CUTOUT_API_URL,
    remove_bg_cutout,
    remove_bg_pillow,
)

try:
    from PIL import Image
except ImportError:
    print(json.dumps({"code": 1, "message": "请先安装 Pillow: pip install Pillow"}))
    sys.exit(1)

SHEETS_DIR = REPO_ROOT / "apps" / "web" / "public" / "assets" / "game" / "summons" / "sheets"
FRAMES_DIR = REPO_ROOT / "apps" / "web" / "public" / "assets" / "game" / "summons" / "frames"

GRID_COLS = 2
GRID_ROWS = 2
FRAMES_PER_CARD = GRID_COLS * GRID_ROWS

# 切完的 1 个子图四角必然落在品红留白区，pillow tolerance 用 40 留点裕度
PILLOW_TOLERANCE = 40

# cutout AI 会把品红抠掉得不彻底，且会把 (255,0,255) 渲染偏移到 (248,4,230) 之类，
# 所以后处理时用更宽的 tolerance 统一把"高红低绿高蓝"的残留像素 alpha 清零。
# 法术里合法的粉色（如 pivot_wall_feedback）饱和度更低（绿通道明显高于 50），不会被误伤。
CHROMA_RGB = (255, 0, 255)
CHROMA_CLEANUP_TOLERANCE = 50


def detect_chroma_padding(sheet: "Image.Image", chroma=CHROMA_RGB, tolerance: int = 10) -> tuple[int, int, int, int]:
    """探测 sheet 四周纯品红 padding 的厚度 (top, right, bottom, left)。

    设计前提：AI 出图 1536x1024，经 ``scripts/process-summon-sheets.mjs`` 垫成 1:1。
    上下补的 padding 一定是 ``#FF00FF``，因此从外向内找第一个非品红主导行/列即可。
    采样 32 个采样点判断，避免逐像素全扫，单卡 < 50 ms。
    """
    if sheet.mode != "RGBA":
        sheet = sheet.convert("RGBA")
    pixels = sheet.load()
    width, height = sheet.size
    cr, cg, cb = chroma

    def is_chroma(r: int, g: int, b: int) -> bool:
        return abs(r - cr) <= tolerance and abs(g - cg) <= tolerance and abs(b - cb) <= tolerance

    def row_dominantly_chroma(y: int) -> bool:
        sample_count = 0
        chroma_count = 0
        step = max(1, width // 32)
        for x in range(0, width, step):
            r, g, b, _ = pixels[x, y]
            sample_count += 1
            if is_chroma(r, g, b):
                chroma_count += 1
        return sample_count > 0 and chroma_count >= int(sample_count * 0.95)

    def col_dominantly_chroma(x: int) -> bool:
        sample_count = 0
        chroma_count = 0
        step = max(1, height // 32)
        for y in range(0, height, step):
            r, g, b, _ = pixels[x, y]
            sample_count += 1
            if is_chroma(r, g, b):
                chroma_count += 1
        return sample_count > 0 and chroma_count >= int(sample_count * 0.95)

    top = 0
    for y in range(height // 2):
        if not row_dominantly_chroma(y):
            break
        top = y + 1

    bottom = 0
    for y in range(height - 1, height // 2 - 1, -1):
        if not row_dominantly_chroma(y):
            break
        bottom = height - y

    left = 0
    for x in range(width // 2):
        if not col_dominantly_chroma(x):
            break
        left = x + 1

    right = 0
    for x in range(width - 1, width // 2 - 1, -1):
        if not col_dominantly_chroma(x):
            break
        right = width - x

    return top, right, bottom, left


def split_sheet(sheet: "Image.Image") -> list["Image.Image"]:
    """先去掉外圈 chroma padding 复原 4 帧真实布局（如 1536x1024），再 2x2 等分。

    旧实现直接对 1536x1536 等分 768x768，会把上 padding 留在 TL/TR、下 padding 留在
    BL/BR，导致 4 帧内容在统一裁切后上下错位。这里先去 padding 再切，让每个 cell
    内的实际美术帧居中，f1..f4 在 union bbox 内的垂直锚点一致。
    """
    top, right, bottom, left = detect_chroma_padding(sheet)
    width, height = sheet.size
    trimmed = sheet.crop((left, top, width - right, height - bottom))
    tw, th = trimmed.size
    cell_w = tw // GRID_COLS
    cell_h = th // GRID_ROWS

    quadrants: list[Image.Image] = []
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            box = (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)
            quadrants.append(trimmed.crop(box))
    return quadrants


_CUTOUT_REQUEST_LOCK = __import__("threading").Lock()
_cutout_request_seq = 0


def _next_cutout_seq() -> int:
    global _cutout_request_seq
    with _CUTOUT_REQUEST_LOCK:
        _cutout_request_seq += 1
        return _cutout_request_seq


def cleanup_residual_chroma(image: "Image.Image", tolerance: int = CHROMA_CLEANUP_TOLERANCE) -> "Image.Image":
    """把 cutout 后残留的品红噪点像素 alpha 清零，避免落场时出现粉色斑点。"""
    if image.mode != "RGBA":
        image = image.convert("RGBA")

    pixels = image.load()
    width, height = image.size
    cr, cg, cb = CHROMA_RGB
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if abs(r - cr) <= tolerance and abs(g - cg) <= tolerance and abs(b - cb) <= tolerance:
                pixels[x, y] = (r, g, b, 0)
    return image


def make_quadrant_transparent(quadrant: "Image.Image", method: str, log_label: str = "") -> "Image.Image":
    if method == "cutout":
        seq = _next_cutout_seq()
        prefix = f"  [cutout #{seq:02d}{(' ' + log_label) if log_label else ''}]"
        print(f"{prefix} POST {CUTOUT_API_URL} ({quadrant.size[0]}x{quadrant.size[1]})")
        result = remove_bg_cutout(quadrant)
        print(f"{prefix} done -> alpha cleanup ({result.size[0]}x{result.size[1]})")
        return cleanup_residual_chroma(result)
    if method == "pillow":
        return remove_bg_pillow(quadrant, tolerance=PILLOW_TOLERANCE)
    raise ValueError(f"未知的透明化方式: {method}")


def make_quadrant_transparent_with_fallback(
    quadrant: "Image.Image", primary: str, log_label: str = ""
) -> tuple["Image.Image", str]:
    """primary 出错时自动回落到 pillow 抠色（纯品红背景下基本不会失败）"""
    try:
        result = make_quadrant_transparent(quadrant, primary, log_label=log_label)
        if result.mode != "RGBA":
            result = result.convert("RGBA")
        if result.getbbox() is None:
            raise RuntimeError("transparent result is empty, falling back to chroma key")
        return result, primary
    except Exception as exc:
        if primary == "pillow":
            raise
        print(f"  [warn] {primary} 失败，回落到 pillow: {exc}")
        fallback = make_quadrant_transparent(quadrant, "pillow", log_label=log_label)
        if fallback.mode != "RGBA":
            fallback = fallback.convert("RGBA")
        return fallback, "pillow (fallback)"


def union_bbox(images: list["Image.Image"]) -> tuple[int, int, int, int] | None:
    boxes = [img.getbbox() for img in images]
    boxes = [b for b in boxes if b is not None]
    if not boxes:
        return None
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def process_card(card_id: str, sheet_path: Path, output_root: Path, method: str) -> dict:
    output_dir = output_root / card_id
    output_dir.mkdir(parents=True, exist_ok=True)

    sheet = Image.open(sheet_path)
    if sheet.mode != "RGBA":
        sheet = sheet.convert("RGBA")

    pad_top, pad_right, pad_bottom, pad_left = detect_chroma_padding(sheet)
    print(
        f"[split] {card_id}: source {sheet.size[0]}x{sheet.size[1]} "
        f"-> chroma padding T/R/B/L = {pad_top}/{pad_right}/{pad_bottom}/{pad_left}"
    )

    quadrants = split_sheet(sheet)
    cell = quadrants[0].size
    print(f"[split] {card_id}: 4 cells of {cell[0]}x{cell[1]} (TL=f1, TR=f2, BL=f3, BR=f4)")

    transparent_frames: list[Image.Image] = []
    used_method = method
    for idx, quad in enumerate(quadrants, start=1):
        rgba, actual = make_quadrant_transparent_with_fallback(
            quad, method, log_label=f"{card_id}/f{idx}"
        )
        if actual != method:
            used_method = actual
        transparent_frames.append(rgba)

    bbox = union_bbox(transparent_frames)
    if bbox is None:
        raise RuntimeError(f"{card_id}: 4 帧抠图后全是空白")

    cropped = [frame.crop(bbox) for frame in transparent_frames]
    frame_w, frame_h = cropped[0].size

    for idx, frame in enumerate(cropped, start=1):
        frame.save(output_dir / f"f{idx}.png", optimize=True)

    strip = Image.new("RGBA", (frame_w * FRAMES_PER_CARD, frame_h), (0, 0, 0, 0))
    for idx, frame in enumerate(cropped):
        strip.paste(frame, (idx * frame_w, 0))
    strip.save(output_root / f"{card_id}.png", optimize=True)

    return {
        "cardId": card_id,
        "frameWidth": frame_w,
        "frameHeight": frame_h,
        "frameCount": FRAMES_PER_CARD,
        "method": used_method,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="召唤物 4 宫格切片 + 透明化")
    parser.add_argument(
        "--method",
        default="cutout",
        choices=["cutout", "pillow"],
        help="透明化方式（默认 cutout，cutout.pro AI 抠图；pillow 为本地纯色抠色，不需要网络）",
    )
    parser.add_argument(
        "--only",
        default=None,
        help="只处理指定 cardId（逗号分隔），不指定则处理 sheets/ 下全部",
    )
    parser.add_argument("--workers", type=int, default=4, help="并发卡数（默认 4）")
    args = parser.parse_args()

    if not SHEETS_DIR.exists():
        print(f"[fatal] 找不到目录：{SHEETS_DIR}")
        return 1

    sheet_files = sorted(SHEETS_DIR.glob("*.png"))
    if args.only:
        wanted = {name.strip() for name in args.only.split(",") if name.strip()}
        sheet_files = [f for f in sheet_files if f.stem in wanted]

    if not sheet_files:
        print("[fatal] 没有要处理的雪碧图")
        return 1

    FRAMES_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 72)
    print(f"召唤物 4 宫格切片 + 透明化")
    print(f"  method      = {args.method}")
    print(f"  workers     = {args.workers}")
    print(f"  cards       = {len(sheet_files)}")
    if args.method == "cutout":
        masked_key = (CUTOUT_API_KEY[:8] + "..." + CUTOUT_API_KEY[-4:]) if len(CUTOUT_API_KEY) > 12 else "***"
        print(f"  cutout url  = {CUTOUT_API_URL}")
        print(f"  cutout key  = {masked_key}  (来源: transparent.py)")
        print(f"  预计请求数  = {len(sheet_files) * FRAMES_PER_CARD} (每帧 1 次 cutout.pro POST)")
    print("=" * 72)
    print()

    results: dict[str, dict] = {}
    failures: list[tuple[str, str]] = []

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        future_to_card = {
            pool.submit(process_card, sheet.stem, sheet, FRAMES_DIR, args.method): sheet.stem
            for sheet in sheet_files
        }

        for future in as_completed(future_to_card):
            card_id = future_to_card[future]
            try:
                result = future.result()
                results[card_id] = result
                print(
                    f"[OK]   {card_id}: frame {result['frameWidth']}x{result['frameHeight']} x{result['frameCount']} "
                    f"({result['method']})"
                )
            except Exception as exc:
                failures.append((card_id, str(exc)))
                print(f"[FAIL] {card_id}: {exc}")

    sorted_results = dict(sorted(results.items()))
    manifest_path = FRAMES_DIR / "manifest.json"
    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(sorted_results, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print()
    print(f"输出目录：{FRAMES_DIR}")
    print(f"manifest：{manifest_path}")
    print(f"成功 {len(results)} 张，失败 {len(failures)} 张")
    return 0 if not failures else 2


if __name__ == "__main__":
    sys.exit(main())
