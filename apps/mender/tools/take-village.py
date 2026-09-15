#!/usr/bin/env python3
"""Take the artist's map and his thirteen districts out of the village repo.

    python3 tools/take-village.py [--village DIR] [--out DIR]

THE ARTIST DRAWS THE VILLAGE AND NOTHING HERE DRAWS ANY OF IT. What comes
across is `base-layout.json` byte for byte — his scene, every tile and every
object where he put it — plus the partition that says which of his cells and
which of his objects belong to each of his thirteen places, and the atlas that
says what every tile is. Nothing is composed here, nothing is generated, and
there is no second version of his map anywhere in this repo.

A state of the village is a set of those thirteen switched on. On means exactly
what he drew; off means open sea where it stood. That composition happens in
`packages/village`, at runtime, from these three files.

This replaces the old `world.json` and `plots.json`, which were built by the
village repo's own growth pipeline and drew districts through five stages of
being built up. None of that is the artist's. It is gone.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil

# His thirteen. D01 is ours and lives in another layout; it is not one of these.
DISTRICTS = ["CAMP", "A", "B", "C", "D", "E", "F", "G", "H", "I", "ISLAND", "J", "K"]

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)


def runs(cells: list) -> list:
    """A district's cells as vertical runs, `[x, y0, y1]`.

    His crop farm alone is 1,804 of them and a pair per cell is most of a
    megabyte of punctuation; a column at a time it is a few hundred lines. The
    shape is the same shape.
    """
    by: dict[int, list[int]] = {}
    for x, y in cells:
        by.setdefault(x, []).append(y)
    out = []
    for x in sorted(by):
        ys = sorted(by[x])
        start = prev = ys[0]
        for y in ys[1:]:
            if y == prev + 1:
                prev = y
                continue
            out.append([x, start, prev])
            start = prev = y
        out.append([x, start, prev])
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--village", default=os.path.join(os.path.dirname(os.path.dirname(
        os.path.dirname(APP))), "a-cozy-agents-village"))
    ap.add_argument("--out", default=os.path.join(APP, "assets", "village"))
    a = ap.parse_args()

    base = os.path.join(a.village, "assets", "village-base", "base-layout.json")
    atlas = os.path.join(a.village, "assets", "village-base", "atlas.json")
    spec = os.path.join(a.village, "study", "districts", "_spec")
    for path in (base, atlas, spec):
        if not os.path.exists(path):
            raise SystemExit(f"not in the village repo: {path}")

    os.makedirs(a.out, exist_ok=True)
    shutil.copyfile(base, os.path.join(a.out, "base-layout.json"))
    shutil.copyfile(atlas, os.path.join(a.out, "atlas.json"))

    districts = []
    for i in DISTRICTS:
        s = json.load(open(os.path.join(spec, i + ".json")))
        districts.append({
            "id": i,
            "name": s["name"],
            "cells": runs([tuple(c) for c in s["cells"]]),
            # Indexes into his object list, never ids: 116 of his ids do not
            # survive a browser.
            "objects": sorted(s["objects"]),
        })
    # His `kind` is not carried: his own spec files call the market common, and
    # only the camp and the islet ever are. Which two those are is `his.ts`.
    doc = {
        "$comment": "His partition, taken from study/districts/_spec by "
                    "tools/take-village.py. Do not hand-edit.",
        "districts": districts,
    }
    out = os.path.join(a.out, "districts.json")
    json.dump(doc, open(out, "w"), separators=(",", ":"))

    for stale in ("world.json", "plots.json"):
        path = os.path.join(a.out, stale)
        if os.path.exists(path):
            os.remove(path)
            print(f"removed {stale}, which the growth pipeline built")

    layout = json.load(open(base))
    print(f"his map: {len(layout['tiles'])} tiles, {len(layout['objects'])} objects")
    for d in districts:
        print(f"  {d['id']:7}{d['name']:18}{sum(r[2] - r[1] + 1 for r in d['cells']):5} cells,"
              f"{len(d['objects']):5} objects")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
