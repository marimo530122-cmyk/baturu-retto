"""
バツルーレット(Baturu Retto) 多言語対応SNSショート動画 自動生成スクリプト

使い方:
    python generate_video.py US
    python generate_video.py JP --layout B
"""

import argparse
import os
from dataclasses import dataclass
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont

if not hasattr(Image, "ANTIALIAS"):
    # moviepy 1.0.3 が参照する旧名(Pillow 10+で削除済み)への互換シム
    Image.ANTIALIAS = Image.LANCZOS

from moviepy.editor import (
    ColorClip,
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)

# ====== 基本設定 ======
VIDEO_W, VIDEO_H = 1080, 1920
DEFAULT_DURATION = 18  # 15〜20秒の範囲で指定
INTRO_DURATION = 3
OUTRO_DURATION = 3

APP_NAME = "罰ゲーム列島(Baturu Retto)"
APP_URL = "marimo530122-cmyk.github.io/baturu-retto/"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# LINE公式アカウントの友だち追加QRコード(assets/line_qr.png に配置)
QR_CODE_PATH = os.path.join(ASSETS_DIR, "line_qr.png")

# バツルーレット本体(style.css)のネオン配色に合わせたブランドカラー
BRAND_PINK = (255, 45, 149, 255)
BRAND_PURPLE = (143, 75, 255, 255)
BRAND_BG = (11, 7, 22)


@dataclass
class RegionConfig:
    lang: str
    intro_text: str
    cta_text: str
    font_file: str  # FONTS_DIR 内のファイル名
    line_cta_text: str = "Scan to add us on LINE!"
    profile_hint_text: str = "Same QR code is on our profile too!"


# ====== 地域別設定(ここに国を追加していく) ======
REGION_CONFIGS = {
    "US": RegionConfig(
        lang="en",
        intro_text="The Most Chaotic Punishment Game App?!",
        cta_text="Play now! Link in bio!",
        font_file="NotoSans-Bold.ttf",
        line_cta_text="Scan to add us on LINE!",
        profile_hint_text="Same QR code is on our profile too!",
    ),
    "VN": RegionConfig(
        lang="vi",
        intro_text="Ứng dụng trò chơi phạt lầy lội nhất?!",
        cta_text="Chơi ngay! Link ở tiểu sử!",
        font_file="NotoSans-Bold.ttf",
        line_cta_text="Quét mã QR để kết bạn LINE!",
        profile_hint_text="Mã QR này cũng có trên trang cá nhân!",
    ),
    "JP": RegionConfig(
        lang="ja",
        intro_text="世界一エグい罰ゲームアプリ知ってる?",
        cta_text="プロフィールのリンクから遊んでね!",
        font_file="NotoSansJP-Bold.ttf",
        line_cta_text="QRを読み取って友だち追加!",
        profile_hint_text="詳細はプロフィールへ!",
    ),
}


def get_region_config(country_code: str) -> RegionConfig:
    country_code = country_code.upper()
    if country_code not in REGION_CONFIGS:
        raise ValueError(
            f"未対応の国コードです: {country_code}。"
            f"対応済み: {list(REGION_CONFIGS.keys())}"
        )
    return REGION_CONFIGS[country_code]


# ====== テキスト描画(Pillowで多言語フォントを直接扱う) ======
def render_text_image(
    text: str,
    font_path: str,
    font_size: int,
    canvas_size: tuple,
    fill=(255, 255, 255, 255),
    stroke_fill=(0, 0, 0, 255),
    stroke_width=6,
    max_width_ratio=0.85,
) -> np.ndarray:
    if not os.path.exists(font_path):
        raise FileNotFoundError(
            f"フォントファイルが見つかりません: {font_path}\n"
            "assets/fonts/ に指定のフォント(.ttf)を配置してください。"
        )

    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, font_size)
    try:
        font.set_variation_by_axes([700])  # 可変フォントの場合はBold相当のウェイトを指定
    except (AttributeError, OSError, ValueError):
        pass  # 固定ウェイトのフォントなど、可変軸を持たない場合はそのまま使う

    max_width = int(canvas_size[0] * max_width_ratio)
    lines = _wrap_text(text, font, draw, max_width)

    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font, stroke_width=stroke_width)
        line_heights.append(bbox[3] - bbox[1])
    line_spacing = int(font_size * 0.3)
    total_height = sum(line_heights) + line_spacing * (len(lines) - 1)

    y = (canvas_size[1] - total_height) // 2
    for line, lh in zip(lines, line_heights):
        bbox = draw.textbbox((0, 0), line, font=font, stroke_width=stroke_width)
        line_w = bbox[2] - bbox[0]
        x = (canvas_size[0] - line_w) // 2
        draw.text(
            (x, y),
            line,
            font=font,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
        )
        y += lh + line_spacing

    return np.array(img)


def _wrap_text(text, font, draw, max_width):
    """日本語は1文字単位、英語・ベトナム語(スペース区切り)は単語単位で自動改行する。"""
    is_cjk = any(ord(c) > 0x3000 for c in text)
    units = list(text) if is_cjk else text.split(" ")
    sep = "" if is_cjk else " "

    lines = []
    current = ""
    for unit in units:
        candidate = current + sep + unit if current else unit
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = unit
    if current:
        lines.append(current)
    return lines


# ====== 冒頭テロップ / エンドカード ======
def build_intro_overlay(config: RegionConfig, duration: float) -> ImageClip:
    font_path = os.path.join(FONTS_DIR, config.font_file)
    text_img = render_text_image(
        config.intro_text, font_path, font_size=80, canvas_size=(VIDEO_W, 500)
    )
    return ImageClip(text_img, transparent=True).set_duration(duration).set_position(("center", 120))


def _build_qr_card(qr_path: str, size: int, duration: float) -> ImageClip:
    """QRコードに白い余白(クワイエットゾーン)を付けたうえでネオン枠で縁取ったカード画像を作る。"""
    quiet_zone = 28
    border = 10
    inner = size - quiet_zone * 2

    qr_img = Image.open(qr_path).convert("RGBA")
    qr_img = qr_img.resize((inner, inner), Image.LANCZOS)

    white_card = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    white_card.paste(qr_img, (quiet_zone, quiet_zone), qr_img)

    framed_size = size + border * 2
    framed = Image.new("RGBA", (framed_size, framed_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(framed)
    draw.rounded_rectangle([0, 0, framed_size - 1, framed_size - 1], radius=36, fill=BRAND_PINK)
    draw.rounded_rectangle(
        [4, 4, framed_size - 5, framed_size - 5], radius=32, outline=BRAND_PURPLE, width=4
    )
    framed.paste(white_card, (border, border))

    return ImageClip(np.array(framed), transparent=True).set_duration(duration)


def build_end_card(config: RegionConfig, duration: float) -> CompositeVideoClip:
    """動画最後(OUTRO_DURATION秒)のエンドカード。QR画像(QR_CODE_PATH)があればLINE友だち追加QRを表示する。"""
    font_path = os.path.join(FONTS_DIR, config.font_file)
    bg = ColorClip((VIDEO_W, VIDEO_H), color=BRAND_BG).set_duration(duration)

    title_img = render_text_image(APP_NAME, font_path, 60, (VIDEO_W, 200))
    title_clip = ImageClip(title_img, transparent=True).set_duration(duration).set_position(("center", 150))

    clips = [bg, title_clip]
    has_qr = os.path.exists(QR_CODE_PATH)

    if has_qr:
        qr_card = _build_qr_card(QR_CODE_PATH, 460, duration).set_position(("center", 380))
        line_cta_img = render_text_image(
            config.line_cta_text, font_path, 44, (VIDEO_W, 110), fill=(255, 255, 255, 255)
        )
        line_cta_clip = (
            ImageClip(line_cta_img, transparent=True).set_duration(duration).set_position(("center", 900))
        )

        # プロフィール欄にも同じQRを掲載していることを伝える一言
        profile_hint_img = render_text_image(
            config.profile_hint_text, font_path, 36, (VIDEO_W, 100), fill=(255, 200, 230, 255)
        )
        profile_hint_clip = (
            ImageClip(profile_hint_img, transparent=True).set_duration(duration).set_position(("center", 1010))
        )

        clips += [qr_card, line_cta_clip, profile_hint_clip]
        url_y, cta_y = 1140, 1280
    else:
        url_y, cta_y = 900, 1100

    url_img = render_text_image(APP_URL, font_path, 42, (VIDEO_W, 130), fill=(120, 200, 255, 255))
    url_clip = ImageClip(url_img, transparent=True).set_duration(duration).set_position(("center", url_y))

    cta_img = render_text_image(config.cta_text, font_path, 50, (VIDEO_W, 260))
    cta_clip = ImageClip(cta_img, transparent=True).set_duration(duration).set_position(("center", cta_y))

    clips += [url_clip, cta_clip]
    return CompositeVideoClip(clips, size=(VIDEO_W, VIDEO_H))


# ====== レイアウト(実写 x アプリ画面の合成) ======
def _fit_crop(clip, target_w: int, target_h: int):
    """アスペクト比を保って拡大し、はみ出た部分を中央基準でクロップする。"""
    scale = max(target_w / clip.w, target_h / clip.h)
    clip = clip.resize(scale)
    clip = clip.crop(
        x_center=clip.w / 2, y_center=clip.h / 2, width=target_w, height=target_h
    )
    return clip


def _load_app_screen(path: str, duration: float):
    if path.lower().endswith((".mp4", ".mov", ".m4v")):
        clip = VideoFileClip(path)
        sub = clip.subclip(0, min(duration, clip.duration))
        return sub.loop(duration=duration)
    return ImageClip(path).set_duration(duration)


def _phone_frame_clip(w: int, h: int, duration: float):
    border = 18
    img = Image.new("RGBA", (w + border * 2, h + border * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [0, 0, img.width - 1, img.height - 1], radius=60, outline=(20, 20, 20, 255), width=border
    )
    return ImageClip(np.array(img), transparent=True).set_duration(duration).set_position(("center", "center"))


def layout_top_bottom(bg_video_clip, app_screen_path: str, duration: float):
    """パターンA: 上半分に実写、下半分にアプリ画面"""
    half_h = VIDEO_H // 2

    bg_clip = _fit_crop(bg_video_clip.subclip(0, duration), VIDEO_W, half_h).set_position(("center", 0))
    app_clip = _fit_crop(_load_app_screen(app_screen_path, duration), VIDEO_W, half_h).set_position(
        ("center", half_h)
    )

    return CompositeVideoClip([bg_clip, app_clip], size=(VIDEO_W, VIDEO_H)).set_duration(duration)


def layout_pip(bg_video_clip, app_screen_path: str, duration: float):
    """パターンB: 全体に実写、手前にスマホ枠のアプリ画面をオーバーレイ"""
    bg_clip = _fit_crop(bg_video_clip.subclip(0, duration), VIDEO_W, VIDEO_H)

    pip_w = int(VIDEO_W * 0.55)
    pip_h = int(pip_w * 1.9)
    app_clip = _fit_crop(_load_app_screen(app_screen_path, duration), pip_w, pip_h).set_position(
        ("center", "center")
    )
    frame = _phone_frame_clip(pip_w, pip_h, duration)

    return CompositeVideoClip([bg_clip, app_clip, frame], size=(VIDEO_W, VIDEO_H)).set_duration(duration)


# ====== メイン生成関数 ======
def generate_video(
    country_code: str,
    bg_video_path: str,
    app_screen_path: str,
    layout: str = "A",
    duration: float = DEFAULT_DURATION,
    output_path: Optional[str] = None,
) -> str:
    config = get_region_config(country_code)

    # main_duration は「イントロ+本編」の長さ。イントロはこの先頭 INTRO_DURATION 秒を
    # テキスト付きで再利用するため、ここで OUTRO_DURATION だけ引けば良い
    # (INTRO_DURATION まで引くと合計尺が INTRO_DURATION 分短くなってしまうバグがあった)。
    main_duration = duration - OUTRO_DURATION
    if main_duration <= INTRO_DURATION:
        raise ValueError("durationはINTRO+OUTRO(6秒)より長くしてください。")

    bg_video_clip = VideoFileClip(bg_video_path).without_audio()
    if bg_video_clip.duration < main_duration:
        bg_video_clip = bg_video_clip.loop(duration=main_duration)

    if layout == "A":
        main_clip = layout_top_bottom(bg_video_clip, app_screen_path, main_duration)
    elif layout == "B":
        main_clip = layout_pip(bg_video_clip, app_screen_path, main_duration)
    else:
        raise ValueError("layoutは'A'または'B'を指定してください。")

    intro_overlay = build_intro_overlay(config, INTRO_DURATION)
    intro_scene = CompositeVideoClip(
        [main_clip.subclip(0, INTRO_DURATION), intro_overlay], size=(VIDEO_W, VIDEO_H)
    ).set_duration(INTRO_DURATION)

    body_scene = main_clip.subclip(INTRO_DURATION, main_duration)
    end_card = build_end_card(config, OUTRO_DURATION)

    final = concatenate_videoclips([intro_scene, body_scene, end_card], method="compose")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if output_path is None:
        output_path = os.path.join(OUTPUT_DIR, f"baturu_retto_{country_code.lower()}.mp4")

    final.write_videofile(output_path, fps=30, codec="libx264", audio_codec="aac")
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="バツルーレット 多言語ショート動画自動生成")
    parser.add_argument("country", help="国コード (例: US, VN, JP)")
    parser.add_argument("--bg-video", default=os.path.join(ASSETS_DIR, "bg_video.mp4"))
    parser.add_argument("--app-screen", default=os.path.join(ASSETS_DIR, "app_screen.png"))
    parser.add_argument("--layout", choices=["A", "B"], default="A")
    parser.add_argument("--duration", type=float, default=DEFAULT_DURATION)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    result_path = generate_video(
        args.country,
        bg_video_path=args.bg_video,
        app_screen_path=args.app_screen,
        layout=args.layout,
        duration=args.duration,
        output_path=args.output,
    )
    print(f"動画を書き出しました: {result_path}")
