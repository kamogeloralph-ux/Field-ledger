from pathlib import Path
import subprocess
from PIL import Image, ImageEnhance, ImageFilter

sources = [
    Path('/home/ubuntu/upload/20260902_164158.webp'),
    Path('/home/ubuntu/upload/20260902_164218.webp'),
    Path('/home/ubuntu/upload/20260902_164231.webp'),
]
out_dir = Path('/home/ubuntu/fleet-inspection-pwa/ocr-work')
out_dir.mkdir(exist_ok=True)

with (out_dir / 'raw_ocr.txt').open('w', encoding='utf-8') as report:
    for source in sources:
        image = Image.open(source).convert('L')
        width, height = image.size
        report.write(f'\n### SOURCE {source.name} {width}x{height}\n')
        # The table occupies most of the portrait image. Split into three
        # horizontal groups, keeping a small overlap at each boundary.
        crop_top = int(height * 0.02)
        crop_bottom = int(height * 0.92)
        edges = [0, int(width * 0.36), int(width * 0.69), width]
        for index, (left, right) in enumerate(zip(edges, edges[1:]), start=1):
            crop = image.crop((max(0, left - 14), crop_top, min(width, right + 14), crop_bottom))
            crop = crop.resize((crop.width * 3, crop.height * 3))
            crop = ImageEnhance.Contrast(crop).enhance(1.8)
            crop = crop.filter(ImageFilter.SHARPEN)
            crop_path = out_dir / f'{source.stem}_group{index}.png'
            crop.save(crop_path)
            result = subprocess.run(
                ['tesseract', str(crop_path), 'stdout', '--psm', '6', '-l', 'eng'],
                check=False, capture_output=True, text=True,
            )
            report.write(f'\n--- GROUP {index} ---\n{result.stdout}\n')
