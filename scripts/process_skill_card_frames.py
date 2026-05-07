#!/usr/bin/env python3
"""Skill card 3x3 transparent sheets -> card icons, release strips, overlays."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "dr5"
CARD_OUTPUT_DIR = REPO_ROOT / "apps" / "web" / "public" / "assets" / "game" / "cards"
FRAME_OUTPUT_DIR = REPO_ROOT / "apps" / "web" / "public" / "assets" / "game" / "summons" / "frames"
OVERLAY_OUTPUT_DIR = REPO_ROOT / "apps" / "web" / "public" / "assets" / "game" / "summons" / "overlays"

GRID_ROWS = 3
GRID_COLS = 3
RELEASE_FRAME_INDICES = tuple(range(1, 9))

CARD_ID_BY_SOURCE_STEM = {
    "nlpy": "energy_instant_power",
    "szfh": "emergency_freeze",
    "yggz": "emergency_repair_all",
    "xhjy": "spell_lava_rain",
    "fysm": "summon_flame_hawks",
    "xymo": "summon_furnace_golem",
    "ytjj": "defense_temp_wall",
    "nljl": "summon_energy_sprite",
    "asfz": "pivot_wall_feedback",
    "mhls": "attack_molten_chain",
    "hltx": "reward_fire_dragon_breath",
    "xyqy": "premium_starfall_contract",
}


def crop_grid_cell(sheet: Image.Image, frame_index: int) -> Image.Image:
    cell_width = sheet.width // GRID_COLS
    cell_height = sheet.height // GRID_ROWS
    row_index = frame_index // GRID_COLS
    column_index = frame_index % GRID_COLS
    left = column_index * cell_width
    upper = row_index * cell_height
    return sheet.crop((left, upper, left + cell_width, upper + cell_height))


def normalize_sheet_size(sheet: Image.Image) -> Image.Image:
    usable_width = (sheet.width // GRID_COLS) * GRID_COLS
    usable_height = (sheet.height // GRID_ROWS) * GRID_ROWS
    if usable_width == sheet.width and usable_height == sheet.height:
        return sheet
    return sheet.crop((0, 0, usable_width, usable_height))


def union_alpha_bbox(frames: list[Image.Image]) -> tuple[int, int, int, int] | None:
    union: tuple[int, int, int, int] | None = None
    for frame in frames:
        bbox = frame.getchannel("A").getbbox()
        if bbox is None:
            continue
        if union is None:
            union = bbox
            continue
        union = (
            min(union[0], bbox[0]),
            min(union[1], bbox[1]),
            max(union[2], bbox[2]),
            max(union[3], bbox[3]),
        )
    return union


def crop_to_shared_bounds(frames: list[Image.Image]) -> list[Image.Image]:
    bbox = union_alpha_bbox(frames)
    if bbox is None:
        raise RuntimeError("sheet frames are fully transparent")
    return [frame.crop(bbox) for frame in frames]


def save_horizontal_strip(output_path: Path, frames: list[Image.Image]) -> dict[str, int]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame_width, frame_height = frames[0].size
    strip = Image.new("RGBA", (frame_width * len(frames), frame_height), (0, 0, 0, 0))
    for frame_index, frame in enumerate(frames):
        strip.paste(frame, (frame_width * frame_index, 0))
    strip.save(output_path, optimize=True)
    return {
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "frameCount": len(frames),
    }


def save_overlay_frames(card_id: str, frames: list[Image.Image]) -> dict[str, dict[str, int]] | None:
    if card_id == "summon_furnace_golem":
        idle_frames = crop_to_shared_bounds([frames[4]])
        attack_frames = crop_to_shared_bounds([frames[5], frames[6]])
        return {
            "idle": save_horizontal_strip(OVERLAY_OUTPUT_DIR / card_id / "idle.png", idle_frames),
            "attack": save_horizontal_strip(OVERLAY_OUTPUT_DIR / card_id / "attack.png", attack_frames),
        }

    if card_id == "defense_temp_wall":
        idle_frames = crop_to_shared_bounds([frames[4]])
        return {
            "idle": save_horizontal_strip(OVERLAY_OUTPUT_DIR / card_id / "idle.png", idle_frames),
        }

    if card_id == "summon_energy_sprite":
        active_frames = crop_to_shared_bounds([frames[4], frames[5], frames[6]])
        return {
            "active": save_horizontal_strip(OVERLAY_OUTPUT_DIR / card_id / "active.png", active_frames),
        }

    return None


def process_sheet(source_path: Path) -> tuple[str, dict]:
    source_stem = source_path.stem.removesuffix("_t")
    card_id = CARD_ID_BY_SOURCE_STEM[source_stem]
    sheet = normalize_sheet_size(Image.open(source_path).convert("RGBA"))

    frames = [crop_grid_cell(sheet, frame_index) for frame_index in range(GRID_ROWS * GRID_COLS)]

    icon = crop_to_shared_bounds([frames[0]])[0]
    CARD_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    icon.save(CARD_OUTPUT_DIR / f"{card_id}.png", optimize=True)

    release_frames = crop_to_shared_bounds([frames[index] for index in RELEASE_FRAME_INDICES])
    frame_metadata = save_horizontal_strip(FRAME_OUTPUT_DIR / f"{card_id}.png", release_frames)
    frame_dir = FRAME_OUTPUT_DIR / card_id
    frame_dir.mkdir(parents=True, exist_ok=True)
    for frame_number, frame in enumerate(release_frames, start=1):
        frame.save(frame_dir / f"f{frame_number}.png", optimize=True)

    metadata = {
        "source": source_path.name,
        **frame_metadata,
        "icon": f"apps/web/public/assets/game/cards/{card_id}.png",
    }

    overlay_metadata = save_overlay_frames(card_id, frames)
    if overlay_metadata:
        metadata["overlay"] = overlay_metadata

    return card_id, metadata


def main() -> int:
    if not SOURCE_DIR.exists():
        raise FileNotFoundError(f"missing source directory: {SOURCE_DIR}")

    FRAME_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OVERLAY_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict] = {}
    for source_stem, card_id in CARD_ID_BY_SOURCE_STEM.items():
        source_path = SOURCE_DIR / f"{source_stem}_t.png"
        if not source_path.exists():
            raise FileNotFoundError(f"missing source sheet for {card_id}: {source_path}")
        processed_card_id, metadata = process_sheet(source_path)
        manifest[processed_card_id] = metadata
        print(f"[OK] {processed_card_id}: {metadata['frameWidth']}x{metadata['frameHeight']} x{metadata['frameCount']}")

    manifest_path = FRAME_OUTPUT_DIR / "manifest.json"
    with manifest_path.open("w", encoding="utf-8") as manifest_file:
        json.dump(dict(sorted(manifest.items())), manifest_file, indent=2, ensure_ascii=False)
        manifest_file.write("\n")

    print(f"manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
