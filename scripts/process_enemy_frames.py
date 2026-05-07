#!/usr/bin/env python3
"""Enemy 3x3 transparent sprite sheets -> action strips + manifest."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "t"
OUTPUT_DIR = REPO_ROOT / "apps" / "web" / "public" / "assets" / "game" / "units" / "enemies"

GRID_COLS = 3
GRID_ROWS = 3

ACTION_BY_ROW = {
    0: "walk",
    1: "attack",
    2: "hit",
}

SOURCE_BY_ENEMY_ID = {
    "ember_grunt": "rhxml_t.png",
    "spark_runner": "hhlh_t.png",
    "basalt_smasher": "hsmx_t.png",
    "ash_wing": "hjbfsm_t.png",
    "volcano_core_beast": "hsskmw_t.png",
}


def slice_grid_cells(sheet: Image.Image) -> dict[str, list[Image.Image]]:
    width, height = sheet.size
    cells_by_action: dict[str, list[Image.Image]] = {}

    for row_index, action in ACTION_BY_ROW.items():
        row_frames: list[Image.Image] = []

        for column_index in range(GRID_COLS):
            left = round(column_index * width / GRID_COLS)
            top = round(row_index * height / GRID_ROWS)
            right = round((column_index + 1) * width / GRID_COLS)
            bottom = round((row_index + 1) * height / GRID_ROWS)
            row_frames.append(sheet.crop((left, top, right, bottom)))

        cells_by_action[action] = row_frames

    return cells_by_action


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    return alpha.getbbox()


def union_alpha_bbox(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    bounding_boxes = [alpha_bbox(frame) for frame in frames]
    visible_bounding_boxes = [box for box in bounding_boxes if box is not None]

    if not visible_bounding_boxes:
        raise RuntimeError("all frames are fully transparent")

    return (
        min(box[0] for box in visible_bounding_boxes),
        min(box[1] for box in visible_bounding_boxes),
        max(box[2] for box in visible_bounding_boxes),
        max(box[3] for box in visible_bounding_boxes),
    )


def trim_frames_to_shared_box(frames: list[Image.Image]) -> list[Image.Image]:
    shared_box = union_alpha_bbox(frames)
    return [frame.crop(shared_box) for frame in frames]


def mirror_frames(frames: list[Image.Image]) -> list[Image.Image]:
    return [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in frames]


def save_action_strip(enemy_output_dir: Path, action: str, frames: list[Image.Image]) -> dict[str, int | str]:
    trimmed_frames = trim_frames_to_shared_box(frames)
    mirrored_frames = mirror_frames(trimmed_frames)
    frame_width, frame_height = mirrored_frames[0].size

    action_dir = enemy_output_dir / action
    action_dir.mkdir(parents=True, exist_ok=True)

    for frame_index, frame in enumerate(mirrored_frames, start=1):
        frame.save(action_dir / f"f{frame_index}.png", optimize=True)

    strip = Image.new("RGBA", (frame_width * len(mirrored_frames), frame_height), (0, 0, 0, 0))
    for frame_index, frame in enumerate(mirrored_frames):
        strip.paste(frame, (frame_index * frame_width, 0))

    strip_path = enemy_output_dir / f"{action}.png"
    strip.save(strip_path, optimize=True)

    return {
        "file": strip_path.name,
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "frameCount": len(mirrored_frames),
    }


def process_enemy(enemy_id: str, source_file_name: str) -> dict[str, dict[str, int | str]]:
    source_path = SOURCE_DIR / source_file_name

    if not source_path.exists():
        raise FileNotFoundError(f"missing source sheet: {source_path}")

    sheet = Image.open(source_path).convert("RGBA")
    cells_by_action = slice_grid_cells(sheet)
    enemy_output_dir = OUTPUT_DIR / enemy_id
    enemy_output_dir.mkdir(parents=True, exist_ok=True)

    action_metadata: dict[str, dict[str, int | str]] = {}
    for action, frames in cells_by_action.items():
        action_metadata[action] = save_action_strip(enemy_output_dir, action, frames)

    return action_metadata


def main() -> int:
    manifest: dict[str, dict[str, dict[str, int | str]]] = {}

    for enemy_id, source_file_name in SOURCE_BY_ENEMY_ID.items():
        manifest[enemy_id] = process_enemy(enemy_id, source_file_name)
        walk = manifest[enemy_id]["walk"]
        attack = manifest[enemy_id]["attack"]
        hit = manifest[enemy_id]["hit"]
        print(
            f"[OK] {enemy_id}: "
            f"walk {walk['frameWidth']}x{walk['frameHeight']}, "
            f"attack {attack['frameWidth']}x{attack['frameHeight']}, "
            f"hit {hit['frameWidth']}x{hit['frameHeight']}"
        )

    manifest_path = OUTPUT_DIR / "frames-manifest.json"
    with manifest_path.open("w", encoding="utf-8") as manifest_file:
        json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
        manifest_file.write("\n")

    print(f"manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
