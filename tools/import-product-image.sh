#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Import a real product packshot into the landing page.
#
#   Usage:  tools/import-product-image.sh <source-image> [--no-trim]
#
# What it does:
#   1. (optional) trims the fully-transparent border, so a background-removed
#      PNG fills the frame without empty space
#   2. resizes to max 900 px on the long edge (keeps the alpha channel) and
#      writes assets/img/product-tube.webp  (same path the page already uses)
#   3. rewrites the width/height attributes of every <img> that points at that
#      file, keeping the intrinsic aspect-ratio (no layout shift)
#
# Requires ImageMagick (convert) + python3.
# ---------------------------------------------------------------------------
set -euo pipefail

SRC="${1:-}"
TRIM="yes"
[[ "${2:-}" == "--no-trim" ]] && TRIM="no"

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "usage: $0 <source-image> [--no-trim]" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/img/product-tube.webp"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ source : $SRC"
identify -format '  input  : %wx%h  channels=%[channels]\n' "$SRC"

WORK="$SRC"
if [[ "$TRIM" == "yes" ]]; then
  convert "$SRC" -bordercolor none -border 2 -trim +repage "$TMP/trimmed.png"
  WORK="$TMP/trimmed.png"
  identify -format '  trimmed: %wx%h\n' "$WORK"
fi

convert "$WORK" -resize '900x900>' -define webp:method=6 -quality 86 "$OUT"

W="$(identify -format '%w' "$OUT")"
H="$(identify -format '%h' "$OUT")"
BYTES="$(stat -c %s "$OUT")"
echo "→ output: assets/img/product-tube.webp  ${W}x${H}  ${BYTES} bytes"

# --- keep the markup in sync (width/height on every product <img>) ----------
python3 - "$ROOT/index.html" "$W" "$H" <<'PY'
import io, re, sys
path, w, h = sys.argv[1], sys.argv[2], sys.argv[3]
src = io.open(path, encoding='utf-8').read()

pattern = re.compile(
    r'(<img[^>]*src="assets/img/product-tube\.webp"[^>]*?)width="\d+" height="\d+"',
    re.S
)
src, n = pattern.subn(lambda m: m.group(1) + 'width="%s" height="%s"' % (w, h), src)
io.open(path, 'w', encoding='utf-8').write(src)
print('→ index.html: %d <img> tag(s) updated with width="%s" height="%s"' % (n, w, h))
PY
