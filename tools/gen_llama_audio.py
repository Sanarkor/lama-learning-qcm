#!/usr/bin/env python3
"""Génère les MP3 Vivienne / Sonia (+18 %, pitch 0) listés dans tools/audio_todo.json."""
import asyncio, json, os, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TODO = ROOT / "tools" / "audio_todo.json"
OUT = ROOT / "audio"
RAW = Path("/tmp/aud_raw")
LOG = Path("/tmp/llama_audio_log/gen.log")
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

items = json.loads(TODO.read_text())
todo = [x for x in items if not (OUT / f"{x['h']}.mp3").exists() or (OUT / f"{x['h']}.mp3").stat().st_size < 400]
print(f"{len(items)} uniques, {len(todo)} à faire", flush=True)

sem = asyncio.Semaphore(8)
done = 0
fail = []
t0 = time.time()


def log(msg):
    line = msg + "\n"
    sys.stdout.write(line)
    sys.stdout.flush()
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line)


async def one(x):
    global done
    import edge_tts
    h, voice, text = x["h"], x["voice"], x["text"]
    dest = OUT / f"{h}.mp3"
    raw = RAW / f"{h}.mp3"
    async with sem:
        ok = False
        for attempt in range(8):
            try:
                com = edge_tts.Communicate(text, voice, rate="+18%", pitch="+0Hz")
                await asyncio.wait_for(com.save(str(raw)), 50)
                if raw.exists() and raw.stat().st_size > 500:
                    ok = True
                    break
            except Exception as e:
                log(f"retry {h} {attempt+1}: {type(e).__name__}: {e}")
            await asyncio.sleep(1.2 * (attempt + 1))
        if not ok:
            fail.append(h)
            log(f"FAIL {h}")
            return
        p = await asyncio.create_subprocess_exec(
            "ffmpeg", "-loglevel", "error", "-y", "-i", str(raw),
            "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "32k",
            str(dest),
        )
        await p.wait()
        try:
            raw.unlink()
        except OSError:
            pass
        if p.returncode != 0 or not dest.exists() or dest.stat().st_size < 400:
            fail.append(h)
            log(f"FAIL ffmpeg {h}")
            return
        done += 1
        if done % 100 == 0 or done == len(todo):
            elapsed = time.time() - t0
            rate = done / elapsed if elapsed else 0
            left = (len(todo) - done) / rate if rate else 0
            log(f"OK {done}/{len(todo)}  {elapsed:.0f}s  eta {left/60:.1f} min")


async def main():
    # batches to avoid creating 20k tasks at once
    batch = 400
    for i in range(0, len(todo), batch):
        chunk = todo[i:i + batch]
        await asyncio.gather(*(one(x) for x in chunk))
    log(f"FIN done={done} fail={len(fail)} unique={len(items)}")
    if fail:
        (ROOT / "tools" / "audio_fail.json").write_text(json.dumps(fail))
        log("échecs: " + ",".join(fail[:40]))


if __name__ == "__main__":
    asyncio.run(main())
