#!/usr/bin/env python3
"""Building character sprite sheet -> action strips + manifest."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR_CANDIDATES = [
    REPO_ROOT / "dr4",
    REPO_ROOT.parent / "dr4",
]
OUTPUT_DIR = REPO_ROOT / "apps" / "web" / "public" / "assets" / "game" / "units" / "buildings"

CHARACTER_GRID_COLS = 5
CHARACTER_GRID_ROWS = 5

BUILDING_BY_CHARACTER_ROW = {
    0: "melee_turret",
    1: "energy_core",
    2: "laser_turret",
    3: "ranged_turret",
    4: "lava_wall",
}


def resolve_source_dir() -> Path:
    for source_dir in SOURCE_DIR_CANDIDATES:
        if source_dir.exists():
            return source_dir

    formatted_candidates = ", ".join(str(source_dir) for source_dir in SOURCE_DIR_CANDIDATES)
    raise FileNotFoundError(f"missing source directory; checked: {formatted_candidates}")


def crop_grid_cell(sheet: Image.Image, row_index: int, column_index: int, rows: int, columns: int) -> Image.Image:
    width, height = sheet.size
    left = round(column_index * width / columns)
    top = round(row_index * height / rows)
    right = round((column_index + 1) * width / columns)
    bottom = round((row_index + 1) * height / rows)
    return sheet.crop((left, top, right, bottom))


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


def save_action_strip(building_output_dir: Path, action: str, frames: list[Image.Image]) -> dict[str, int | str]:
    trimmed_frames = trim_frames_to_shared_box(frames)
    frame_width, frame_height = trimmed_frames[0].size

    action_dir = building_output_dir / action
    action_dir.mkdir(parents=True, exist_ok=True)

    for frame_index, frame in enumerate(trimmed_frames, start=1):
        frame.save(action_dir / f"f{frame_index}.png", optimize=True)

    strip = Image.new("RGBA", (frame_width * len(trimmed_frames), frame_height), (0, 0, 0, 0))
    for frame_index, frame in enumerate(trimmed_frames):
        strip.paste(frame, (frame_index * frame_width, 0))

    strip_path = building_output_dir / f"{action}.png"
    strip.save(strip_path, optimize=True)

    return {
        "file": strip_path.name,
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "frameCount": len(trimmed_frames),
    }


def process_character_sheet(source_dir: Path) -> dict[str, dict[str, dict[str, int | str]]]:
    source_path = source_dir / "zz45_t.png"
    if not source_path.exists():
        raise FileNotFoundError(f"missing source sheet: {source_path}")

    sheet = Image.open(source_path).convert("RGBA")
    manifest: dict[str, dict[str, dict[str, int | str]]] = {}

    for row_index, building_id in BUILDING_BY_CHARACTER_ROW.items():
        frames = [
            crop_grid_cell(sheet, row_index, column_index, CHARACTER_GRID_ROWS, CHARACTER_GRID_COLS)
            for column_index in range(CHARACTER_GRID_COLS)
        ]
        building_output_dir = OUTPUT_DIR / building_id
        building_output_dir.mkdir(parents=True, exist_ok=True)

        manifest[building_id] = {
            "idle": save_action_strip(building_output_dir, "idle", frames[:1]),
            "attack": save_action_strip(building_output_dir, "attack", frames[1:]),
        }

    return manifest


def main() -> int:
    source_dir = resolve_source_dir()
    manifest = process_character_sheet(source_dir)

    manifest_path = OUTPUT_DIR / "frames-manifest.json"
    with manifest_path.open("w", encoding="utf-8") as manifest_file:
        json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
        manifest_file.write("\n")

    for building_id, actions in manifest.items():
        action_summary = ", ".join(
            f"{action} {metadata['frameWidth']}x{metadata['frameHeight']}x{metadata['frameCount']}"
            for action, metadata in actions.items()
        )
        print(f"[OK] {building_id}: {action_summary}")

    print(f"manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
