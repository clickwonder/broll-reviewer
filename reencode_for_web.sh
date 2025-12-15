#!/bin/bash

cd public

# Re-encode all videos for web compatibility
# - H.264 baseline profile (maximum compatibility)
# - AAC audio at 48000 Hz
# - MP4 container with faststart

echo "Re-encoding all videos for web compatibility..."

# Process b-roll videos
for video in broll/*.mp4; do
  if [[ ! "$video" =~ _old\.mp4$ ]] && [[ ! "$video" =~ _web\.mp4$ ]]; then
    echo "Processing: $video"
    ffmpeg -i "$video" \
      -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p \
      -c:a aac -ar 48000 -ac 2 -b:a 128k \
      -movflags +faststart \
      -y "${video%.mp4}_web.mp4" 2>&1 | tail -3

    if [ -f "${video%.mp4}_web.mp4" ]; then
      mv "$video" "${video%.mp4}_old.mp4"
      mv "${video%.mp4}_web.mp4" "$video"
      echo "✓ Re-encoded: $video"
    fi
  fi
done

# Process stock videos
for video in videos/stock/stock_*.mp4; do
  if [[ ! "$video" =~ _old\.mp4$ ]] && [[ ! "$video" =~ _web\.mp4$ ]]; then
    echo "Processing: $video"
    ffmpeg -i "$video" \
      -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p \
      -c:a aac -ar 48000 -ac 2 -b:a 128k \
      -movflags +faststart \
      -y "${video%.mp4}_web.mp4" 2>&1 | tail -3

    if [ -f "${video%.mp4}_web.mp4" ]; then
      mv "$video" "${video%.mp4}_old.mp4"
      mv "${video%.mp4}_web.mp4" "$video"
      echo "✓ Re-encoded: $video"
    fi
  fi
done

echo ""
echo "All videos re-encoded for web compatibility!"
echo "Audio: AAC @ 48000 Hz"
echo "Video: H.264 baseline profile"
