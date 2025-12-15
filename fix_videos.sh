#!/bin/bash

cd public

# Fix all b-roll videos
for video in broll/*.mp4; do
  if [[ ! "$video" =~ _old\.mp4$ ]] && [[ ! "$video" =~ _fixed\.mp4$ ]]; then
    echo "Processing: $video"
    ffmpeg -i "$video" -c copy -movflags +faststart -y "${video%.mp4}_fixed.mp4" 2>&1 | tail -3
    mv "$video" "${video%.mp4}_old.mp4"
    mv "${video%.mp4}_fixed.mp4" "$video"
    echo "✓ Fixed: $video"
  fi
done

# Fix remaining stock videos
for video in videos/stock/stock_*.mp4; do
  if [[ ! "$video" =~ _old\.mp4$ ]] && [[ ! "$video" =~ _fixed\.mp4$ ]] && [[ ! "$video" =~ stock_pexels_6101348 ]]; then
    echo "Processing: $video"
    ffmpeg -i "$video" -c copy -movflags +faststart -y "${video%.mp4}_fixed.mp4" 2>&1 | tail -3
    mv "$video" "${video%.mp4}_old.mp4"
    mv "${video%.mp4}_fixed.mp4" "$video"
    echo "✓ Fixed: $video"
  fi
done

echo "All videos fixed with faststart flag!"
