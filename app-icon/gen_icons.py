import os
from PIL import Image

SRC = os.path.join("app-icon", "app-icon.png")
OUT = os.path.join("app-icon", "AppIcon.appiconset")

# (filename, size_px)  — standard iOS AppIcon.appiconset set
icons = [
    # iPhone
    ("AppIcon-20x20@2x.png", 40),
    ("AppIcon-20x20@3x.png", 60),
    ("AppIcon-29x29@1x.png", 29),
    ("AppIcon-29x29@2x.png", 58),
    ("AppIcon-29x29@3x.png", 87),
    ("AppIcon-40x40@2x.png", 80),
    ("AppIcon-40x40@3x.png", 120),
    ("AppIcon-57x57@1x.png", 57),
    ("AppIcon-57x57@2x.png", 114),
    ("AppIcon-60x60@2x.png", 120),
    ("AppIcon-60x60@3x.png", 180),
    # iPad (required: 76/152/167)
    ("AppIcon-20x20@1x.png", 20),
    ("AppIcon-29x29@2x-ipad.png", 58),
    ("AppIcon-40x40@1x.png", 40),
    ("AppIcon-40x40@2x-ipad.png", 80),
    ("AppIcon-76x76@1x.png", 76),
    ("AppIcon-76x76@2x.png", 152),
    ("AppIcon-83.5x83.5@2x.png", 167),
    # App Store
    ("AppIcon-512@2x.png", 1024),
]

os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert("RGBA")
print("source size", im.size)

BG = (26, 86, 219, 255)  # 深蓝 #1A56DB，确保 App Store 1024 完全不透明
for name, px in icons:
    img = im.resize((px, px), Image.LANCZOS)
    canvas = Image.new("RGBA", (px, px), BG)
    canvas.alpha_composite(img)
    # App Store requires 1024x1024 icon without alpha channel; save all as RGB to be safe
    canvas.convert("RGB").save(os.path.join(OUT, name))
    print("wrote", name, px)

contents = '''{
  "images" : [
    {"idiom":"iphone","scale":"2x","size":"20x20","filename":"AppIcon-20x20@2x.png"},
    {"idiom":"iphone","scale":"3x","size":"20x20","filename":"AppIcon-20x20@3x.png"},
    {"idiom":"iphone","scale":"1x","size":"29x29","filename":"AppIcon-29x29@1x.png"},
    {"idiom":"iphone","scale":"2x","size":"29x29","filename":"AppIcon-29x29@2x.png"},
    {"idiom":"iphone","scale":"3x","size":"29x29","filename":"AppIcon-29x29@3x.png"},
    {"idiom":"iphone","scale":"2x","size":"40x40","filename":"AppIcon-40x40@2x.png"},
    {"idiom":"iphone","scale":"3x","size":"40x40","filename":"AppIcon-40x40@3x.png"},
    {"idiom":"iphone","scale":"1x","size":"57x57","filename":"AppIcon-57x57@1x.png"},
    {"idiom":"iphone","scale":"2x","size":"57x57","filename":"AppIcon-57x57@2x.png"},
    {"idiom":"iphone","scale":"2x","size":"60x60","filename":"AppIcon-60x60@2x.png"},
    {"idiom":"iphone","scale":"3x","size":"60x60","filename":"AppIcon-60x60@3x.png"},
    {"idiom":"ipad","scale":"1x","size":"20x20","filename":"AppIcon-20x20@1x.png"},
    {"idiom":"ipad","scale":"2x","size":"29x29","filename":"AppIcon-29x29@2x-ipad.png"},
    {"idiom":"ipad","scale":"1x","size":"40x40","filename":"AppIcon-40x40@1x.png"},
    {"idiom":"ipad","scale":"2x","size":"40x40","filename":"AppIcon-40x40@2x-ipad.png"},
    {"idiom":"ipad","scale":"1x","size":"76x76","filename":"AppIcon-76x76@1x.png"},
    {"idiom":"ipad","scale":"2x","size":"76x76","filename":"AppIcon-76x76@2x.png"},
    {"idiom":"ipad","scale":"2x","size":"83.5x83.5","filename":"AppIcon-83.5x83.5@2x.png"},
    {"idiom":"ios-marketing","scale":"1x","size":"1024x1024","filename":"AppIcon-512@2x.png"}
  ],
  "info" : {"author":"xcode","version":1}
}
'''
with open(os.path.join(OUT, "Contents.json"), "w", encoding="utf-8") as f:
    f.write(contents)
print("wrote Contents.json")
