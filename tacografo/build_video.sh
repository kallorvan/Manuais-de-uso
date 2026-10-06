#!/usr/bin/env bash
# Monta o vídeo do manual: cada slide fica na tela pelo tempo do seu áudio.
# Uso: ./build_video.sh [pasta_audios] [saida.mp4]
#   pasta_audios: contém audio_01.mp3 ... audio_20.mp3 (padrão: audios/)
# Requer: ffmpeg, pdftoppm, LibreOffice (via soffice.py da skill pptx em $PPTX_SKILL).
set -euo pipefail
cd "$(dirname "$0")"
AUD="${1:-audios}"
OUT="${2:-Manual_Tacografo_Digital.mp4}"
PAD_IN=0.5      # silêncio antes da fala
PAD_OUT=0.8     # silêncio depois da fala
SEM_AUDIO=4     # duração dos slides sem narração (encerramento)
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 1. Slides em PNG 1920x1080
cp Manual_Tacografo_Digital.pptx "$WORK/deck.pptx"
python3 "$PPTX_SKILL/scripts/office/soffice.py" --headless --convert-to pdf --outdir "$WORK" "$WORK/deck.pptx" >/dev/null 2>&1
pdftoppm -png -scale-to-x 1920 -scale-to-y 1080 "$WORK/deck.pdf" "$WORK/slide"
mapfile -t SLIDES < <(ls "$WORK"/slide-*.png | sort)

# 2. Um clipe por slide
: > "$WORK/lista.txt"
for i in "${!SLIDES[@]}"; do
  n=$(printf "%02d" $((i + 1)))
  img="${SLIDES[$i]}"
  clip="$WORK/clip_$n.mp4"
  if [[ -f "$AUD/audio_$n.mp3" ]]; then
    ffmpeg -v error -y -loop 1 -framerate 30 -i "$img" -i "$AUD/audio_$n.mp3" \
      -filter_complex "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=$(awk "BEGIN{print $PAD_IN*1000}")|$(awk "BEGIN{print $PAD_IN*1000}"),apad=pad_dur=$PAD_OUT[a]" \
      -map 0:v -map "[a]" -c:v libx264 -tune stillimage -pix_fmt yuv420p -r 30 \
      -c:a aac -b:a 192k -shortest "$clip"
  else
    echo "Slide $n sem áudio: ${SEM_AUDIO}s de silêncio"
    ffmpeg -v error -y -loop 1 -framerate 30 -i "$img" -f lavfi -i anullsrc=r=48000:cl=stereo \
      -t "$SEM_AUDIO" -c:v libx264 -tune stillimage -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k "$clip"
  fi
  echo "file '$clip'" >> "$WORK/lista.txt"
done

# 3. Junta tudo
ffmpeg -v error -y -f concat -safe 0 -i "$WORK/lista.txt" -c copy -movflags +faststart "$OUT"
echo "OK $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" | cut -d. -f1)s)"
