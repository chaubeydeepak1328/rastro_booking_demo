"""Generate original geometric brand assets, without modifying source artwork."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SIZE = 1024
GREEN = '#176B58'
CREAM = '#F6F7F4'

def mark(image, box, color='white', background=GREEN):
    draw = ImageDraw.Draw(image)
    x, y, side = box
    if background:
        draw.rounded_rectangle((x, y, x + side, y + side), radius=side * .28, fill=background)
    width = int(side * .075)
    points = [(.72, .25), (.45, .25)]
    def curve(p0, p1, p2, p3):
        for step in range(1, 81):
            t = step / 80
            points.append(tuple((1-t)**3*p0[i] + 3*(1-t)**2*t*p1[i] + 3*(1-t)*t*t*p2[i] + t**3*p3[i] for i in range(2)))
    curve((.45, .25), (.22, .25), (.22, .5), (.45, .5))
    points.append((.55, .5))
    curve((.55, .5), (.78, .5), (.78, .75), (.55, .75))
    points.append((.28, .75))
    scaled = [(x + px * side, y + py * side) for px, py in points]
    draw.line(scaled, fill=color, width=width, joint='curve')
    for cx, cy in scaled:
        draw.ellipse((cx-width/2, cy-width/2, cx+width/2, cy+width/2), fill=color)
    return image

assets = ROOT / 'assets'
icon = mark(Image.new('RGBA', (SIZE, SIZE), GREEN), (0, 0, SIZE))
icon.save(assets / 'icon.png')
icon.resize((64, 64), Image.Resampling.LANCZOS).save(assets / 'favicon.png')
mark(Image.new('RGBA', (SIZE, SIZE)), (210, 210, 604)).save(assets / 'splash-icon.png')
mark(Image.new('RGBA', (SIZE, SIZE)), (210, 210, 604)).save(assets / 'android-icon-foreground.png')
mark(Image.new('RGBA', (SIZE, SIZE)), (210, 210, 604), color='white', background=None).save(assets / 'android-icon-monochrome.png')
preview = Image.new('RGBA', (390, 844), CREAM)
small = mark(Image.new('RGBA', (512, 512)), (0, 0, 512)).resize((100, 100), Image.Resampling.LANCZOS)
preview.alpha_composite(small, (145, 372))
(ROOT / 'artifacts').mkdir(exist_ok=True)
preview.convert('RGB').save(ROOT / 'artifacts' / 'splash-preview.png')
