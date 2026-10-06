"""Monta o vídeo do manual com revelação progressiva sincronizada à narração.

Para cada slide:
  1. Acha no áudio (audios/audio_NN.mp3) o momento em que cada frase-gatilho
     de roteiro.json ("cues") é falada: estima pela posição do texto e ajusta
     para a pausa mais próxima detectada no áudio.
  2. Gera um PPTX "de vídeo" em que o slide aparece em vários estados, cada um
     com um item a mais (build_pptx.js com VIDEO_TIMINGS).
  3. Encadeia os estados com fusão suave no tempo exato de cada frase.

Uso: python3 build_video.py [saida.mp4]
Requer: ffmpeg, pdftoppm, node + pptxgenjs (NODE_PATH) e $PPTX_SKILL (soffice.py).
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

DIR = Path(__file__).parent
AUD = DIR / "audios"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DIR / "Manual_Tacografo_Digital.mp4"
PAD_IN, PAD_OUT = 0.6, 0.9      # respiro antes/depois da fala (s)
FADE = 0.35                      # fusão entre estados (s)
LEAD = 0.25                      # item aparece um pouco antes de ser falado
SEM_AUDIO = 5.0                  # duração do encerramento
FPS = 30

def sh(*cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)

def duration(f):
    return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)).stdout)

def silences(f):
    err = subprocess.run(["ffmpeg", "-i", str(f), "-af", "silencedetect=noise=-35dB:d=0.18", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return list(zip(st, en))

def cue_times(text, cues, audio):
    """Tempo (s, a partir do início do áudio) em que cada cue começa a ser falada."""
    dur = duration(audio)
    sil = silences(audio)
    s0 = sil[0][1] if sil and sil[0][0] < 0.05 else 0.0
    s1 = sil[-1][0] if sil and sil[-1][1] >= dur - 0.05 else dur
    inner = [(a, b) for a, b in sil if a > s0 and b < s1]
    speech = (s1 - s0) - sum(b - a for a, b in inner)

    def real_time(frac):  # fração do texto -> tempo real, pulando as pausas
        target, t, spoken = frac * speech, s0, 0.0
        for a, b in inner:
            if spoken + (a - t) >= target:
                break
            spoken += a - t
            t = b
        return t + (target - spoken)

    low, out = text.lower(), []
    for c in cues:
        pos = low.find(c.lower())
        if pos <= 0:
            out.append(0.0)
            continue
        t = real_time(pos / len(text))
        ends = [b for a, b in inner if abs(b - t) <= 0.7]   # fala recomeça após pausa
        if ends:
            t = min(ends, key=lambda b: abs(b - t))
        out.append(round(max(0.0, t - LEAD), 2))
    return out

def main():
    roteiro = json.loads((DIR / "roteiro.json").read_text())
    work = Path(tempfile.mkdtemp())
    timings, audios = {}, {}
    for sl in roteiro["slides"]:
        a = AUD / f"audio_{sl['id']:02d}.mp3"
        if a.exists():
            audios[sl["id"]] = a
            if sl.get("cues"):
                timings[sl["id"]] = cue_times(sl["narracao"], sl["cues"], a)
    (work / "timings.json").write_text(json.dumps(timings))
    print("Tempos de revelação:", json.dumps(timings, ensure_ascii=False))

    deck = work / "video.pptx"
    sh("node", str(DIR / "build_pptx.js"), str(deck), env={**os.environ, "VIDEO_TIMINGS": str(work / "timings.json")})
    states = json.loads((work / "video_estados.json").read_text())
    sh("python3", os.environ["PPTX_SKILL"] + "/scripts/office/soffice.py", "--headless", "--convert-to", "pdf",
       "--outdir", str(work), str(deck))
    sh("pdftoppm", "-png", "-scale-to-x", "1920", "-scale-to-y", "1080", str(work / "video.pdf"), str(work / "p"))
    pages = sorted(work.glob("p-*.png"))
    assert len(pages) == len(states), (len(pages), len(states))

    clips = []
    for sid in [s["id"] for s in roteiro["slides"]]:
        idx = [i for i, st in enumerate(states) if st["slide"] == sid]
        imgs = [pages[i] for i in idx]
        starts = [0.0] + [states[i]["start"] + PAD_IN for i in idx[1:]]
        a = audios.get(sid)
        total = PAD_IN + duration(a) + PAD_OUT if a else SEM_AUDIO
        clip = work / f"clip_{sid:02d}.mp4"
        cmd = ["ffmpeg", "-v", "error", "-y"]
        for k, img in enumerate(imgs):
            end = starts[k + 1] + FADE if k + 1 < len(imgs) else total
            cmd += ["-loop", "1", "-framerate", str(FPS), "-t", f"{end - starts[k]:.3f}", "-i", str(img)]
        if a:
            cmd += ["-i", str(a)]
        else:
            cmd += ["-f", "lavfi", "-t", f"{total:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        n = len(imgs)
        fil, last = [], "[0:v]"
        for k in range(1, n):
            fil.append(f"{last}[{k}:v]xfade=transition=fade:duration={FADE}:offset={starts[k]:.3f}[v{k}]")
            last = f"[v{k}]"
        fade_out = f",fade=t=out:st={total - 1.2:.3f}:d=1.2" if not a else ""
        fil.append(f"{last}format=yuv420p,fps={FPS}{fade_out}[vout]")
        ms = int(PAD_IN * 1000)
        if a:
            fil.append(f"[{n}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms},apad,atrim=0:{total:.3f}[aout]")
        else:
            fil.append(f"[{n}:a]anull[aout]")
        cmd += ["-filter_complex", ";".join(fil), "-map", "[vout]", "-map", "[aout]",
                "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k", str(clip)]
        subprocess.run(cmd, check=True)
        clips.append(clip)
        print(f"slide {sid:02d}: {n} estado(s), {total:.1f}s")

    lst = work / "lista.txt"
    lst.write_text("".join(f"file '{c}'\n" for c in clips))
    sh("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
       "-movflags", "+faststart", str(OUT))
    print(f"OK {OUT} ({duration(OUT):.0f}s)")

if __name__ == "__main__":
    main()
