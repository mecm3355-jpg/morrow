from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


W, H = 1280, 720
FPS = 10
FRAMES_PER_SCENE = 18

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "artifacts"
OUT_DIR.mkdir(exist_ok=True)
GIF_PATH = OUT_DIR / "morrow-error-correction-motion.gif"
POSTER_PATH = OUT_DIR / "morrow-error-correction-motion-poster.png"

FONT_REGULAR = r"C:\Windows\Fonts\malgun.ttf"
FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"

NAVY = "#071936"
INK = "#12213f"
MUTED = "#64748b"
PURPLE = "#5b35f5"
PURPLE_2 = "#7c4dff"
GREEN = "#0aa05a"
GREEN_DARK = "#05763f"
RED = "#e43843"
RED_SOFT = "#fff0f1"
WHITE = "#ffffff"
LINE = "#dfe6f2"
SOFT = "#f5f7fc"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def ease_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def text(draw: ImageDraw.ImageDraw, xy, value: str, size: int, color=INK, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=color, anchor=anchor)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def base_frame() -> Image.Image:
    im = Image.new("RGB", (W, H), WHITE)
    px = im.load()
    for y in range(H):
        t = y / H
        r = int(255 - 7 * t)
        g = int(255 - 5 * t)
        b = int(255 - 1 * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    d = ImageDraw.Draw(im, "RGBA")
    d.ellipse((-180, -250, 460, 390), fill=(97, 61, 246, 15))
    d.ellipse((920, 330, 1430, 850), fill=(10, 160, 90, 16))
    return im


def draw_header(im: Image.Image, scene: int):
    d = ImageDraw.Draw(im)
    text(d, (56, 35), "MORROW · TROUBLESHOOTING", 18, PURPLE, True)
    text(d, (56, 67), "오늘의 오류 정정 과정", 42, NAVY, True)
    text(d, (1224, 62), "401 → 정상 로그인", 21, GREEN_DARK, True, "ra")

    y = 151
    xs = [116, 376, 636, 896, 1156]
    d.line((xs[0], y, xs[-1], y), fill=LINE, width=6)
    labels = ["오류 발견", "연결 진단", "DB 계정 정정", "관리자 확인", "로그인 성공"]
    for i, (x, label) in enumerate(zip(xs, labels)):
        active = i <= scene
        color = GREEN if scene == 4 and i == 4 else (PURPLE if active else "#cad3e3")
        d.ellipse((x - 19, y - 19, x + 19, y + 19), fill=color)
        text(d, (x, y), str(i + 1), 19, WHITE, True, "mm")
        text(d, (x, y + 41), label, 16, color if active else MUTED, True, "mm")


def pill(d, x, y, label, color, bg, width=None):
    f = font(20, True)
    bbox = d.textbbox((0, 0), label, font=f)
    w = width or (bbox[2] - bbox[0] + 34)
    rounded(d, (x, y, x + w, y + 42), 21, bg)
    text(d, (x + w / 2, y + 21), label, 20, color, True, "mm")
    return w


def arrow(d, x1, y, x2, color=PURPLE):
    d.line((x1, y, x2 - 16, y), fill=color, width=7)
    d.polygon([(x2 - 18, y - 13), (x2, y), (x2 - 18, y + 13)], fill=color)


def draw_check(d, cx, cy, color, size=22, width=6):
    d.line(
        (
            cx - size * 0.48,
            cy,
            cx - size * 0.12,
            cy + size * 0.38,
            cx + size * 0.55,
            cy - size * 0.42,
        ),
        fill=color,
        width=width,
        joint="curve",
    )


def terminal(d, box, lines):
    x1, y1, x2, y2 = box
    rounded(d, box, 18, "#101b2d")
    for i, c in enumerate(["#ff5f56", "#ffbd2e", "#27c93f"]):
        d.ellipse((x1 + 18 + i * 20, y1 + 15, x1 + 30 + i * 20, y1 + 27), fill=c)
    yy = y1 + 55
    for value, color in lines:
        text(d, (x1 + 24, yy), value, 19, color, False)
        yy += 34


def database_icon(d, cx, cy, color=GREEN):
    d.ellipse((cx - 58, cy - 65, cx + 58, cy - 15), fill="#65d89c", outline=GREEN_DARK, width=3)
    d.rectangle((cx - 58, cy - 40, cx + 58, cy + 48), fill=color, outline=GREEN_DARK, width=3)
    d.ellipse((cx - 58, cy + 22, cx + 58, cy + 72), fill="#0bc66d", outline=GREEN_DARK, width=3)
    d.arc((cx - 58, cy - 8, cx + 58, cy + 35), 0, 180, fill="#8af0b8", width=3)


def browser(d, box, title="Morrow"):
    x1, y1, x2, y2 = box
    rounded(d, box, 20, WHITE, "#cbd6e7", 3)
    rounded(d, (x1, y1, x2, y1 + 48), 20, "#eef2f8")
    d.rectangle((x1, y1 + 25, x2, y1 + 48), fill="#eef2f8")
    for i, c in enumerate(["#ff5f56", "#ffbd2e", "#27c93f"]):
        d.ellipse((x1 + 18 + i * 20, y1 + 17, x1 + 29 + i * 20, y1 + 28), fill=c)
    text(d, ((x1 + x2) / 2, y1 + 25), title, 18, NAVY, True, "mm")


def card_layer(scene: int, p: float, tick: int) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    show = ease_out(min(1.0, p * 2.7))
    dx = int(lerp(70, 0, show))
    alpha = int(255 * show)
    x1, y1, x2, y2 = 56 + dx, 215, 1224 + dx, 612
    rounded(d, (x1 + 5, y1 + 12, x2 + 5, y2 + 12), 32, (18, 33, 63, int(24 * show)))
    rounded(d, (x1, y1, x2, y2), 32, (255, 255, 255, alpha), (215, 224, 240, alpha), 2)

    if scene == 0:
        # Error state
        d.ellipse((105 + dx, 285, 315 + dx, 495), fill=(228, 56, 67, alpha))
        text(d, (210 + dx, 384), "!", 118, WHITE, True, "mm")
        pill(d, 365 + dx, 264, "1 · 문제 발견", RED, RED_SOFT, 210)
        text(d, (365 + dx, 326), "관리자 로그인이 실패했습니다", 35, NAVY, True)
        terminal(d, (365 + dx, 382, 905 + dx, 548), [
            ("POST  /api/users/login", "#dbe8ff"),
            ("401  Unauthorized", "#ff6b74"),
            ("요청은 서버에 도착했지만 인증 실패", "#ffffff"),
        ])
        pulse = 5 + int(4 * math.sin(tick / 2))
        rounded(d, (940 + dx - pulse, 344 - pulse, 1165 + dx + pulse, 485 + pulse), 22, (255, 240, 241, alpha), (228, 56, 67, alpha), 3)
        text(d, (1052 + dx, 388), "401", 55, RED, True, "mm")
        text(d, (1052 + dx, 447), "인증 오류", 24, RED, True, "mm")

    elif scene == 1:
        pill(d, 96 + dx, 254, "2 · 연결 분리 진단", PURPLE, "#eee9ff", 250)
        terminal(d, (96 + dx, 323, 552 + dx, 550), [
            ("GET  /api/health", "#dbe8ff"),
            ('"status": "ok"', "#73f0a9"),
            ('"database": "connected"', "#73f0a9"),
        ])
        arrow(d, 592 + dx, 425, 720 + dx, GREEN)
        rounded(d, (747 + dx, 305, 1165 + dx, 548), 26, "#f0fff7", "#a4e7c4", 3)
        d.ellipse((790 + dx, 340, 875 + dx, 425), fill=GREEN)
        draw_check(d, 832 + dx, 382, WHITE, 25, 7)
        text(d, (912 + dx, 352), "Vercel · Atlas", 29, NAVY, True)
        text(d, (912 + dx, 401), "연결은 정상", 36, GREEN_DARK, True)
        text(d, (790 + dx, 475), "CORS나 배포 연결 문제가 아님", 22, MUTED, True)

    elif scene == 2:
        pill(d, 96 + dx, 254, "3 · Database User 정정", GREEN_DARK, "#eafff3", 315)
        database_icon(d, 220 + dx, 427, GREEN)
        text(d, (220 + dx, 535), "MongoDB Atlas", 21, GREEN_DARK, True, "mm")
        arrow(d, 315 + dx, 424, 465 + dx, GREEN)
        rounded(d, (492 + dx, 300, 805 + dx, 550), 24, "#f5f7fc", "#cbd6e7", 3)
        text(d, (648 + dx, 337), "Database User", 23, NAVY, True, "mm")
        text(d, (648 + dx, 405), "morrow_app", 37, GREEN_DARK, True, "mm")
        text(d, (648 + dx, 463), "Morrow 전용 접속 계정", 21, MUTED, True, "mm")
        arrow(d, 833 + dx, 424, 920 + dx, PURPLE)
        rounded(d, (944 + dx, 300, 1165 + dx, 550), 24, "#f2efff", "#c9bbff", 3)
        text(d, (1054 + dx, 350), "Vercel", 28, NAVY, True, "mm")
        text(d, (1054 + dx, 416), "MONGODB_ATLAS_URI", 23, PURPLE, True, "mm")
        text(d, (1054 + dx, 476), "환경변수 반영", 21, MUTED, True, "mm")

    elif scene == 3:
        pill(d, 96 + dx, 254, "4 · 관리자 데이터 확인", PURPLE, "#eee9ff", 305)
        browser(d, (96 + dx, 322, 430 + dx, 552), "MongoDB Atlas")
        text(d, (128 + dx, 397), "users 컬렉션", 26, NAVY, True)
        text(d, (128 + dx, 450), 'role: "admin"', 23, PURPLE, True)
        text(d, (128 + dx, 496), "비밀번호: 해시값", 21, MUTED, True)
        arrow(d, 470 + dx, 425, 590 + dx, PURPLE)
        rounded(d, (617 + dx, 302, 1165 + dx, 550), 26, "#fff8f8", "#ffd0d3", 3)
        text(d, (668 + dx, 345), "원인", 23, RED, True)
        text(d, (668 + dx, 397), "관리자 계정이 없거나", 31, NAVY, True)
        text(d, (668 + dx, 444), "저장된 비밀번호 해시 불일치", 31, NAVY, True)
        pill(d, 668 + dx, 494, "관리자 데이터 · 해시 재설정", RED, RED_SOFT, 360)

    else:
        pill(d, 96 + dx, 254, "5 · 다시 로그인", GREEN_DARK, "#eafff3", 230)
        browser(d, (96 + dx, 320, 570 + dx, 552), "Morrow")
        draw_check(d, 333 + dx, 392, GREEN, 48, 10)
        text(d, (333 + dx, 478), "어드민님 반갑습니다.", 27, NAVY, True, "mm")
        arrow(d, 610 + dx, 425, 735 + dx, GREEN)
        rounded(d, (762 + dx, 300, 1165 + dx, 550), 26, "#effff6", "#a4e7c4", 3)
        checks = ["로그인 200 OK", "사용자 정보 조회 성공", "MongoDB Atlas 연결", "로컬 서버 OFF 상태 정상"]
        yy = 340
        for item in checks:
            d.ellipse((795 + dx, yy, 829 + dx, yy + 34), fill=GREEN)
            draw_check(d, 812 + dx, yy + 17, WHITE, 14, 4)
            text(d, (850 + dx, yy + 17), item, 22, NAVY, True, "lm")
            yy += 49

    return layer


def footer(im: Image.Image, scene: int):
    d = ImageDraw.Draw(im)
    if scene < 4:
        rounded(d, (56, 638, 1224, 690), 24, "#f3f0ff")
        text(d, (82, 664), "핵심 흐름", 19, PURPLE, True, "lm")
        text(d, (220, 664), "Database User → Atlas 연결 → users 관리자 조회 → 비밀번호 비교 → 로그인", 20, INK, True, "lm")
    else:
        rounded(d, (56, 632, 1224, 694), 28, "#eafff3", "#a4e7c4", 2)
        d.ellipse((72, 646, 106, 680), fill=GREEN)
        draw_check(d, 89, 663, WHITE, 14, 4)
        text(d, (135, 663), "오류 정정 완료", 26, GREEN_DARK, True, "lm")
        text(d, (365, 663), "접속 계정과 로그인 계정은 다르지만 하나의 흐름으로 연결", 21, NAVY, True, "lm")


def render(scene: int, local_frame: int) -> Image.Image:
    p = local_frame / max(1, FRAMES_PER_SCENE - 1)
    im = base_frame()
    draw_header(im, scene)
    layer = card_layer(scene, p, local_frame)
    im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    footer(im, scene)
    return im


def main():
    frames = []
    for scene in range(5):
        for local_frame in range(FRAMES_PER_SCENE):
            frames.append(render(scene, local_frame))
    # Hold the successful final state slightly longer.
    final = render(4, FRAMES_PER_SCENE - 1)
    frames.extend([final.copy() for _ in range(14)])
    final.save(POSTER_PATH, quality=95)

    palette_frames = [f.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
    palette_frames[0].save(
        GIF_PATH,
        save_all=True,
        append_images=palette_frames[1:],
        duration=int(1000 / FPS),
        loop=0,
        optimize=False,
        disposal=2,
    )
    print(GIF_PATH)
    print(POSTER_PATH)
    print(f"frames={len(frames)} duration={len(frames)/FPS:.1f}s size={W}x{H}")


if __name__ == "__main__":
    main()
