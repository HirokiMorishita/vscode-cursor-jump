#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"

out_dir="$root/bin/win32-x64"
mkdir -p "$out_dir"
x86_64-w64-mingw32-g++ "$(dirname "$0")/main.cc" \
  -O2 -std=c++11 -static \
  -o "$out_dir/zenhan.exe" \
  -luser32 -limm32
x86_64-w64-mingw32-strip $out_dir/zenhan.exe
echo "built: $out_dir/zenhan.exe"


out_dir="$root/bin/win32-ia32"
mkdir -p "$out_dir"
i686-w64-mingw32-g++ "$(dirname "$0")/main.cc" \
  -O2 -std=c++11 -static \
  -o "$out_dir/zenhan.exe" \
  -luser32 -limm32
i686-w64-mingw32-strip $out_dir/zenhan.exe
echo "built: $out_dir/zenhan.exe"