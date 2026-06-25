#!/usr/bin/env python3
"""
问易 · 六爻  — Horizontal Promo Banner
1600 × 900 px  /  144 dpi
"""

from PIL import Image, ImageDraw, ImageFont
import os, math

W, H = 1600, 900

FONTS = "/Users/stellaliu/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/bd0c6814-2660-4907-9560-222456d648d4/3359e0a5-09f4-486e-8657-1ba61ba44375/skills/canvas-design/canvas-fonts"

# ── Chinese fonts ─────────────────────────────────────
ZH_MEDIUM = "/System/Library/Fonts/STHeiti Medium.ttc"
ZH_LIGHT  = "/System/Library/Fonts/STHeiti Light.ttc"
ZH_HIRA   = "/System/Library/Fonts/Hiragino Sans GB.ttc"

# ── Palette ───────────────────────────────────────────
BG      = (242, 236, 222)   # warm parchment
PANEL_R = (30,  27,  22)    # near-black right panel
INK     = (22,  20,  15)    # deep ink
GOLD    = (182, 140, 68)    # ceremonial gold
GOLD_DK = (140, 104, 44)    # darker gold
GOLD_LT = (220, 190, 130)   # pale gold
RED     = (168, 52,  44)    # moving yao red
MUTED   = (145, 132, 112)   # warm grey
DIVIDER = (200, 190, 172)   # hairline
CREAM   = (250, 245, 235)   # off-white screen

def f(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

def fzh(path, size):
    return ImageFont.truetype(path, size)

# latin fonts
F_WORK_R  = f("WorkSans-Regular.ttf",     14)
F_WORK_B  = f("WorkSans-Bold.ttf",        16)
F_WORK_SM = f("WorkSans-Regular.ttf",     11)
F_MONO_R  = f("GeistMono-Regular.ttf",    11)
F_MONO_B  = f("GeistMono-Bold.ttf",       13)
F_LORA    = f("Lora-Regular.ttf",         15)
F_GLOOCK  = f("Gloock-Regular.ttf",       18)
F_POIRET  = f("PoiretOne-Regular.ttf",    13)

# chinese fonts
F_ZH_TITLE = fzh(ZH_MEDIUM, 96)     # main app name
F_ZH_MED   = fzh(ZH_MEDIUM, 20)
F_ZH_LT    = fzh(ZH_LIGHT,  16)
F_ZH_SM    = fzh(ZH_LIGHT,  13)
F_ZH_MINI  = fzh(ZH_LIGHT,  11)

# ─────────────────────────────────────────────────────
img = Image.new("RGB", (W, H), BG)
d   = ImageDraw.Draw(img)

# ══════════════════════════════════════════════════════
# BACKGROUND: subtle horizontal ruled lines
# ══════════════════════════════════════════════════════
for y in range(0, H, 40):
    d.line([(0,y),(W,y)], fill=(228, 220, 206), width=1)

# ══════════════════════════════════════════════════════
# RIGHT DARK PANEL  (right 38% of image)
# ══════════════════════════════════════════════════════
RP_X = int(W * 0.62)
d.rectangle([RP_X, 0, W, H], fill=PANEL_R)

# subtle texture lines inside dark panel
for y in range(0, H, 40):
    d.line([(RP_X, y),(W, y)], fill=(38, 34, 28), width=1)

# ══════════════════════════════════════════════════════
# LEFT SECTION: Large Hexagram Visual
# ══════════════════════════════════════════════════════
# 水火既济 hexagram (upper=坎=010, lower=离=101)
# index 0=初爻(bottom visual top of list displayed top-down)
YAOS = [
    # (yang, moving, display_top_to_bottom) — 上爻 first
    ('yin',  False),   # 上爻  yin
    ('yang', True ),   # 五爻  yang·moving
    ('yin',  False),   # 四爻  yin
    ('yang', False),   # 三爻  yang
    ('yin',  True ),   # 二爻  yin·moving
    ('yang', False),   # 初爻  yang
]
YAO_NAMES = ['上爻','五爻','四爻','三爻','二爻','初爻']

LM   = 64        # left margin
LY0  = 148       # top of hexagram block
GAP  = 86        # gap between yao lines
BW   = 280       # bar total width
BH   = 10        # bar height
YGAP = 26        # gap inside yin bar
R    = 2         # bar corner radius

for i, (typ, moving) in enumerate(YAOS):
    y   = LY0 + i * GAP
    col = RED if moving else INK

    if typ == 'yang':
        d.rounded_rectangle([LM, y, LM+BW, y+BH], radius=R, fill=col)
    else:
        hw = (BW - YGAP) // 2
        d.rounded_rectangle([LM,      y, LM+hw,   y+BH], radius=R, fill=col)
        d.rounded_rectangle([LM+hw+YGAP, y, LM+BW, y+BH], radius=R, fill=col)

    # moving dot
    if moving:
        dx = LM + BW + 18
        dy = y + BH // 2
        dr = 5
        d.ellipse([dx-dr, dy-dr, dx+dr, dy+dr], fill=RED)
        d.ellipse([dx-dr+1, dy-dr+1, dx+dr-1, dy+dr-1], fill=RED)

    # yao name label
    lc = RED if moving else MUTED
    d.text((LM, y - 24), YAO_NAMES[i], font=F_ZH_MINI, fill=lc)

# Hexagram title below block
block_bottom = LY0 + 6 * GAP - 20
d.text((LM, block_bottom + 8), "水 火 既 济   ·   示 例 卦 象",
       font=F_ZH_SM, fill=MUTED)

# Thin gold vertical accent left of hexagram
d.rectangle([LM - 18, LY0 - 10, LM - 16, LY0 + 5 * GAP + BH + 10], fill=GOLD)

# ══════════════════════════════════════════════════════
# CENTER SECTION: App Identity
# ══════════════════════════════════════════════════════
# Column separator
SEP_X = int(W * 0.345)
d.rectangle([SEP_X, 40, SEP_X+1, H-40], fill=DIVIDER)

CX0 = SEP_X + 1     # center section left
CX1 = RP_X - 1      # center section right
CW  = CX1 - CX0

def center_text(draw, text, font, y, color, x0=CX0, width=CW, anchor='lt'):
    bb  = draw.textbbox((0,0), text, font=font)
    tw  = bb[2] - bb[0]
    tx  = x0 + (width - tw) // 2
    draw.text((tx, y), text, font=font, fill=color)

# ── App name
APP_Y = 170
bb = d.textbbox((0,0), "问易", font=F_ZH_TITLE)
tw = bb[2] - bb[0]
tx = CX0 + (CW - tw) // 2
# subtle shadow
d.text((tx+3, APP_Y+4), "问易", font=F_ZH_TITLE, fill=(220, 212, 196))
d.text((tx,   APP_Y),   "问易", font=F_ZH_TITLE, fill=INK)

# ── Gold rule
rule_y = APP_Y + 108
rule_pad = 80
d.rectangle([CX0+rule_pad, rule_y, CX1-rule_pad, rule_y+2], fill=GOLD)

# ── Tagline
center_text(d, "六 爻 占 卜    ·    随 问 随 起", F_ZH_MED,
            rule_y + 22, MUTED)

# ── Sub tagline (latin italic)
center_text(d, "Ancient Wisdom  ·  Modern Interface", F_LORA,
            rule_y + 56, MUTED)

# ── Three feature columns
FEAT_Y = rule_y + 118
feat_col_w = CW // 3

feats = [
    ("01", "投钱起卦", "手摇铜钱六次\n古法逐爻起卦"),
    ("02", "动爻推演", "自动计算变卦\n本卦变卦一目了然"),
    ("03", "爻辞解析", "六十四卦全文\n一键复制AI解读"),
]

for i, (num, head, body) in enumerate(feats):
    fc_x0 = CX0 + i * feat_col_w
    fc_cx = fc_x0 + feat_col_w // 2

    # Number
    bb = d.textbbox((0,0), num, font=F_MONO_B)
    nw = bb[2] - bb[0]
    d.text((fc_cx - nw//2, FEAT_Y), num, font=F_MONO_B, fill=GOLD)

    # Thin rule under number
    d.rectangle([fc_cx-16, FEAT_Y+20, fc_cx+16, FEAT_Y+21], fill=GOLD_LT)

    # Head
    bb2 = d.textbbox((0,0), head, font=F_ZH_MED)
    hw2 = bb2[2] - bb2[0]
    d.text((fc_cx - hw2//2, FEAT_Y + 32), head, font=F_ZH_MED, fill=INK)

    # Body lines
    for li, line in enumerate(body.split('\n')):
        bb3 = d.textbbox((0,0), line, font=F_ZH_SM)
        lw3 = bb3[2] - bb3[0]
        d.text((fc_cx - lw3//2, FEAT_Y + 64 + li*22), line,
               font=F_ZH_SM, fill=MUTED)

# Dot separators between columns
for i in range(1, 3):
    sx = CX0 + i * feat_col_w
    d.ellipse([sx-2, FEAT_Y+72, sx+2, FEAT_Y+76], fill=DIVIDER)

# ── Quote block
quote_y = FEAT_Y + 148
quote_text = "一问·一卦·一答"
bb_q = d.textbbox((0,0), quote_text, font=F_ZH_MED)
qw = bb_q[2] - bb_q[0]
qx = CX0 + (CW - qw) // 2
# flanking rules
d.rectangle([CX0+rule_pad, quote_y+14, qx-20, quote_y+15], fill=DIVIDER)
d.rectangle([qx+qw+20, quote_y+14, CX1-rule_pad, quote_y+15], fill=DIVIDER)
d.text((qx, quote_y), quote_text, font=F_ZH_MED, fill=MUTED)

sub_q = "以古法之智，答当下之问"
bb_sq = d.textbbox((0,0), sub_q, font=F_ZH_SM)
sqw = bb_sq[2] - bb_sq[0]
d.text((CX0 + (CW-sqw)//2, quote_y+32), sub_q, font=F_ZH_SM, fill=DIVIDER)

# ── Bottom meta bar
meta_y = H - 72
d.rectangle([CX0+30, meta_y-12, CX1-30, meta_y-11], fill=DIVIDER)
d.text((CX0+30, meta_y), "LIUYAO · H5 · MOBILE", font=F_MONO_R, fill=MUTED)
bb_v = d.textbbox((0,0), "WÈN YÌ", font=F_MONO_B)
d.text((CX1 - 30 - (bb_v[2]-bb_v[0]), meta_y), "WÈN YÌ", font=F_MONO_B, fill=GOLD)

# ══════════════════════════════════════════════════════
# RIGHT DARK PANEL: Phone mockup + accents
# ══════════════════════════════════════════════════════
RC = RP_X + (W - RP_X) // 2    # center of right panel

# Phone outline
PW, PH_ph = 148, 264
px = RC - PW // 2
py = (H - PH_ph) // 2 - 10
CR = 24   # corner radius

# Drop shadow
d.rounded_rectangle([px+5, py+7, px+PW+5, py+PH_ph+7],
                     radius=CR, fill=(18,16,12))
# Phone body
d.rounded_rectangle([px, py, px+PW, py+PH_ph],
                     radius=CR, fill=(55, 50, 42))
# Screen bezel
BZ = 9
d.rounded_rectangle([px+BZ, py+BZ+16, px+PW-BZ, py+PH_ph-BZ],
                     radius=CR-BZ, fill=CREAM)
# Notch
nw_n = 44
d.rounded_rectangle([px+(PW-nw_n)//2, py+7,
                      px+(PW+nw_n)//2, py+19],
                     radius=5, fill=(38,34,28))

# ── Screen content (mini app UI) ──
SX0 = px + BZ + 4
SX1 = px + PW - BZ - 4
SY0 = py + BZ + 20
SW  = SX1 - SX0

# Tiny "所问之事" label
d.text((SX0+4, SY0+6), "所问之事", font=F_ZH_MINI, fill=MUTED)
# Tiny question line
d.rectangle([SX0+4, SY0+22, SX1-4, SY0+23], fill=DIVIDER)
d.text((SX0+4, SY0+26), "事业发展方向", font=F_ZH_MINI, fill=INK)

# Divider
d.rectangle([SX0, SY0+46, SX1, SY0+47], fill=DIVIDER)

# Mini hex display (6 lines, compact)
MX  = SX0 + 8
MY0 = SY0 + 56
MGAP= 19
MBW = SW - 20
MBH = 4
MYGAP = 8

mini_yaos = [
    ('yin',  False),
    ('yang', True ),
    ('yin',  False),
    ('yang', False),
    ('yin',  True ),
    ('yang', False),
]

for mi, (typ, mov) in enumerate(mini_yaos):
    my = MY0 + mi * MGAP
    mc = RED if mov else INK
    if typ == 'yang':
        d.rounded_rectangle([MX, my, MX+MBW, my+MBH], radius=1, fill=mc)
    else:
        mhw = (MBW - MYGAP) // 2
        d.rounded_rectangle([MX,        my, MX+mhw,       my+MBH], radius=1, fill=mc)
        d.rounded_rectangle([MX+mhw+MYGAP, my, MX+MBW, my+MBH], radius=1, fill=mc)
    if mov:
        d.ellipse([MX+MBW+5, my, MX+MBW+9, my+MBH+1], fill=RED)

# Hex name
d.text((MX, MY0 + 6*MGAP + 4), "水火既济  →  山火贲", font=F_ZH_MINI, fill=MUTED)

# Gold rule
gr_y = MY0 + 6*MGAP + 22
d.rectangle([MX, gr_y, MX+MBW, gr_y+1], fill=GOLD)

# Yao ci mini text blocks (gray bars)
for li in range(4):
    by = gr_y + 10 + li * 12
    blen = [MBW, int(MBW*0.8), int(MBW*0.65), int(MBW*0.75)][li]
    bc   = INK if li == 0 else DIVIDER
    d.rounded_rectangle([MX, by, MX+blen, by+3], radius=1, fill=bc)

# Copy button
btn_y = py + PH_ph - BZ - 28
d.rounded_rectangle([SX0+6, btn_y, SX1-6, btn_y+18], radius=3, fill=GOLD)
bb_btn = d.textbbox((0,0), "复制结果", font=F_ZH_MINI)
bx = SX0+6 + ((SX1-SX0-12) - (bb_btn[2]-bb_btn[0])) // 2
d.text((bx, btn_y+3), "复制结果", font=F_ZH_MINI, fill=CREAM)

# ── Right panel decorative text (vertical, faint)
vert_chars = list("六爻占卜天地人")
for vi, ch in enumerate(vert_chars):
    vy = 80 + vi * 52
    bb_v = d.textbbox((0,0), ch, font=F_ZH_SM)
    vx = W - 38 - (bb_v[2]-bb_v[0]) // 2
    d.text((vx, vy), ch, font=F_ZH_SM, fill=(72, 65, 54))

# Gold corner marks on right panel
for pts in [
    [(RP_X+20, 30), (RP_X+40, 30)],
    [(RP_X+20, 30), (RP_X+20, 50)],
    [(W-40, H-30), (W-20, H-30)],
    [(W-20, H-50), (W-20, H-30)],
]:
    d.line(pts, fill=GOLD, width=2)

# ── Right panel tagline below phone
tag_y = py + PH_ph + 18
bb_t = d.textbbox((0,0), "WÈNYÌ", font=F_MONO_B)
tx_r = RC - (bb_t[2]-bb_t[0]) // 2
d.text((tx_r, tag_y), "WÈNYÌ", font=F_MONO_B, fill=GOLD)

bb_t2 = d.textbbox((0,0), "问 易", font=F_ZH_MED)
tx_r2 = RC - (bb_t2[2]-bb_t2[0]) // 2
d.text((tx_r2, tag_y+24), "问 易", font=F_ZH_MED, fill=(100,90,76))

# ── Left section: top-left meta
d.text((LM, 52),  "问  易", font=F_ZH_MED,  fill=INK)
d.text((LM, 80),  "六 爻 占 卜  ·  H5 移 动 端", font=F_ZH_SM, fill=MUTED)

# Bottom left fine print
d.text((LM, H-48), "古法六爻  ·  三千年易学智慧  ·  掌中一问  天机自显",
       font=F_ZH_SM, fill=MUTED)

# ══════════════════════════════════════════════════════
# GOLD ACCENT: top hairline
# ══════════════════════════════════════════════════════
d.rectangle([0, 0, W, 3], fill=GOLD)
d.rectangle([0, H-3, W, H], fill=GOLD)

# ══════════════════════════════════════════════════════
out = "/Users/stellaliu/Documents/问易/promo/banner.png"
img.save(out, "PNG", dpi=(144,144))
print(f"✓  Saved → {out}")
