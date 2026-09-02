from pathlib import Path
import cv2
import subprocess

source = Path('/home/ubuntu/upload/20260902_164218.webp')
out_dir = Path('/home/ubuntu/fleet-inspection-pwa/ocr-work/rows')
out_dir.mkdir(parents=True, exist_ok=True)
image = cv2.imread(str(source), cv2.IMREAD_GRAYSCALE)
# Keep the table only; process lower and upper bands separately to improve row recognition.
for band_name, y1, y2 in [('upper', 55, 1050), ('lower', 950, 1900)]:
    for group_name, x1, x2 in [('left', 105, 505), ('middle', 485, 905), ('right', 885, 1215)]:
        crop = image[y1:y2, x1:x2]
        crop = cv2.resize(crop, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        blur = cv2.GaussianBlur(crop, (3, 3), 0)
        threshold = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11)
        path = out_dir / f'{band_name}_{group_name}.png'
        cv2.imwrite(str(path), threshold)
        result = subprocess.run(['tesseract', str(path), 'stdout', '--psm', '6', '-l', 'eng'], capture_output=True, text=True)
        (out_dir / f'{band_name}_{group_name}.txt').write_text(result.stdout, encoding='utf-8')
