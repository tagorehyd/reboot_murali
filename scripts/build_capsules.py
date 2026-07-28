import os
import sys
import glob
import json
import subprocess
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

CAPSULE_TITLES = {
    '01-instant-settlement': 'Low-Risk Payment Instant Settlement — Multi-Chain Verification',
    '02-isolation-forest-hold': 'Isolation Forest ML — Anomaly Detection & Multi-Sig Hold',
    '03-ai-rag-assistant': 'AI Fraud Analyst Assistant — Retrieval-Augmented Generation',
    '04-chain-explorer-audit': 'Multi-Chain Ledger Explorer — Tamper-Evident Audit Trail'
}

SPEC_FILES = {
    '01-instant-settlement': 'e2e/01-instant-settlement.spec.ts',
    '02-isolation-forest-hold': 'e2e/02-isolation-forest-hold.spec.ts',
    '03-ai-rag-assistant': 'e2e/03-ai-rag-assistant.spec.ts',
    '04-chain-explorer-audit': 'e2e/04-chain-explorer-audit.spec.ts'
}

def get_media_duration(file_path):
    cmd = [
        FFMPEG_EXE, '-i', file_path,
        '-hide_banner'
    ]
    p = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
    for line in p.stderr.splitlines():
        if 'Duration:' in line:
            # Duration: 00:00:15.24, start: ...
            parts = line.split('Duration:')[1].split(',')[0].strip()
            h, m, s = parts.split(':')
            return float(h)*3600 + float(m)*60 + float(s)
    return 15.0

def find_video_webm(slug):
    dirs = glob.glob(f'test-results/{slug}-*')
    for d in dirs:
        webm = os.path.join(d, 'video.webm')
        if os.path.exists(webm):
            return webm
    return None

def build_single_capsule(slug, title, webm_path, mp3_path, out_mp4):
    os.makedirs(os.path.dirname(out_mp4), exist_ok=True)
    
    v_dur = get_media_duration(webm_path)
    a_dur = get_media_duration(mp3_path)
    print(f"[*] Building capsule {slug}: Video={v_dur:.2f}s, Audio={a_dur:.2f}s")

    # Pad video if shorter than audio, trim if longer
    target_dur = max(v_dur, a_dur)
    pad_needed = max(0.0, a_dur - v_dur)

    # Escaped title for drawtext filter
    clean_title = title.replace(":", "\\:").replace("'", "").replace("—", "-")

    vf_filter = (
        f"scale=1920:1080:force_original_aspect_ratio=decrease,"
        f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"tpad=stop_mode=clone:stop_duration={pad_needed:.2f},"
        f"drawbox=y=ih-120:color=black@0.75:width=iw:height=120:t=fill:enable='between(t,0,4)',"
        f"drawtext=text='FraudShield Demo | {clean_title}':x=40:y=h-80:fontsize=36:fontcolor=white:enable='between(t,0,4)'"
    )

    cmd = [
        FFMPEG_EXE, '-y',
        '-i', webm_path,
        '-i', mp3_path,
        '-vf', vf_filter,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-r', '30', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-t', f"{target_dur:.2f}",
        out_mp4
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
    if res.returncode == 0 and os.path.exists(out_mp4):
        final_dur = get_media_duration(out_mp4)
        print(f"[+] Capsule generated: {out_mp4} ({final_dur:.2f}s, {os.path.getsize(out_mp4)} bytes)")
        return True, v_dur, a_dur, final_dur
    else:
        print(f"[!] FFMPEG error building {slug}: {res.stderr[-300:]}")
        return False, v_dur, a_dur, 0.0

def build_full_demo(capsule_paths, out_full_mp4):
    print("[*] Concatenating capsules into dist/full-demo.mp4...")
    concat_list_file = 'dist/concat_list.txt'
    with open(concat_list_file, 'w', encoding='utf-8') as f:
        for p in capsule_paths:
            abs_p = os.path.abspath(p).replace('\\', '/')
            f.write(f"file '{abs_p}'\n")

    cmd = [
        FFMPEG_EXE, '-y',
        '-f', 'concat', '-safe', '0',
        '-i', concat_list_file,
        '-c', 'copy',
        out_full_mp4
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
    if res.returncode == 0 and os.path.exists(out_full_mp4):
        full_dur = get_media_duration(out_full_mp4)
        print(f"[+] Full demo video rendered: {out_full_mp4} ({full_dur:.2f}s, {os.path.getsize(out_full_mp4)} bytes)")
        return True
    else:
        print(f"[!] Concat error: {res.stderr[-300:]}")
        return False

def main():
    os.makedirs('dist/capsules', exist_ok=True)
    manifest = []
    created_capsules = []

    for slug, title in CAPSULE_TITLES.items():
        webm = find_video_webm(slug)
        mp3 = f'audio/{slug}.mp3'
        out_mp4 = f'dist/capsules/{slug}.mp4'

        if not webm or not os.path.exists(webm):
            print(f"[!] WebM video missing for {slug}")
            manifest.append({
                'feature': title,
                'slug': slug,
                'spec_file': SPEC_FILES[slug],
                'status': 'FAILED',
                'reason': 'Missing Playwright recording'
            })
            continue

        if not os.path.exists(mp3):
            print(f"[!] Audio voiceover missing for {slug}")
            manifest.append({
                'feature': title,
                'slug': slug,
                'spec_file': SPEC_FILES[slug],
                'status': 'FAILED',
                'reason': 'Missing audio voiceover'
            })
            continue

        success, v_dur, a_dur, final_dur = build_single_capsule(slug, title, webm, mp3, out_mp4)
        if success:
            created_capsules.append(out_mp4)
            manifest.append({
                'feature': title,
                'slug': slug,
                'spec_file': SPEC_FILES[slug],
                'status': 'PASSED',
                'video_duration_seconds': round(v_dur, 2),
                'audio_duration_seconds': round(a_dur, 2),
                'capsule_duration_seconds': round(final_dur, 2),
                'output_path': out_mp4
            })
        else:
            manifest.append({
                'feature': title,
                'slug': slug,
                'spec_file': SPEC_FILES[slug],
                'status': 'FAILED',
                'reason': 'FFmpeg muxing failure'
            })

    if created_capsules:
        build_full_demo(created_capsules, 'dist/full-demo.mp4')

    with open('dist/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print("[+] Wrote dist/manifest.json")

if __name__ == '__main__':
    main()
