import os
import sys
import glob
import re
import asyncio
import edge_tts

def extract_transcript(markdown_path):
    with open(markdown_path, 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.search(r'## Full Spoken Transcript\s*\n+>\s*"([^"]+)"', content)
    if match:
        return match.group(1).strip()
    return "FraudShield Payment Protection Platform Demo"

async def process_all():
    os.makedirs('audio', exist_ok=True)
    files = sorted(glob.glob('narration/*.md'))
    for md_path in files:
        basename = os.path.basename(md_path).replace('.md', '')
        mp3_path = os.path.join('audio', f'{basename}.mp3')
        text = extract_transcript(md_path)
        print(f"[*] Synthesizing {basename} ({len(text.split())} words)...")
        c = edge_tts.Communicate(text, 'en-US-AndrewNeural')
        await c.save(mp3_path)
        size = os.path.getsize(mp3_path)
        print(f"[+] Saved {mp3_path} ({size} bytes)")

if __name__ == '__main__':
    asyncio.run(process_all())
