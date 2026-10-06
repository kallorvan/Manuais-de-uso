"""Redesenha cada tela do tacógrafo em alta resolução (1920x1080).

O vídeo original tem só 576x326, então os prints ficam borrados. Aqui o visor
é desenhado do zero com o texto exato de cada etapa, os botões a pressionar
ficam destacados e a foto real entra como miniatura de referência.

Uso: python3 render_telas.py   (gera telas/*.jpg a partir de prints/*.jpg)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

DIR = Path(__file__).parent
OUT = DIR / "telas"
SS = 2  # supersampling
W, H = 1920 * SS, 1080 * SS

MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
SANS = str(Path.home() / ".fonts/Montserrat-800.ttf")
if not Path(SANS).exists():
    SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

NAVY = (26, 38, 67)
PINK = (217, 72, 100)
BEZEL = (22, 24, 28)
BEZEL_HI = (44, 47, 54)
LCD_BG = (226, 234, 238)
LCD_TXT = (24, 34, 52)
BTN = (12, 13, 16)

def font(path, px):
    return ImageFont.truetype(path, px * SS)

# Tela: lista de linhas. Linha = texto ou (texto, "inv") para seleção.
# press = botões destacados: "V" voltar, "U" ▲, "D" ▼, "OK".
TELAS = {
    "01_inicial":       dict(home="98646", press=[]),
    "02_gerenciamento": dict(lines=["GERENCIAMENTO", "DA LISTA DE", "MOTORISTA"], icon="±", press=["U", "D", "OK"]),
    "03_remover":       dict(lines=["REMOVER", "CÓDIGO DO", "MOTORISTA"], press=["D"]),
    "04_cadastrar":     dict(lines=["CADASTRAR", "CÓDIGO DO", "MOTORISTA"], press=["OK"]),
    "05_bvdr":          dict(lines=["GRAVAR INFORMAÇÃO", "DO MOTORISTA", "NO BVDR?", "NÃO        SIM"], press=["U", "D", "OK"]),
    "06_codigo":        dict(lines=["DIGITE O NOVO CÓDIGO", "DO MOTORISTA", "90***"], press=["U", "D", "OK"]),
    "07_cnh_vazio":     dict(lines=["DIGITE A HABILITAÇÃO", "DO MOTORISTA", "***********"], press=["U", "D", "OK"]),
    "08_cnh":           dict(lines=["DIGITE A HABILITAÇÃO", "DO MOTORISTA", "11111111000"], press=["OK"]),
    "09_confirma":      dict(lines=["99999", "11111111000", ["NÃO", ("SIM", "inv")]], press=["D", "OK"]),
    "10_cadastrado":    dict(lines=["MOTORISTA", "CADASTRADO", "99999"], press=["V"]),
    "11_inicial":       dict(home="98646", hora="15:29", press=["U", "D"]),
    "12_menu_mot":      dict(lines=["MENU DO", "MOTORISTA"], icon="card", press=["OK"]),
    "13_conecte":       dict(lines=["CONECTE-SE"], press=["OK"]),
    "14_viagem":        dict(lines=["VIAGEM", "FINALIZADA"], press=[], dim=True),
    "15_manual_lista":  dict(lines=["1 MANUAL", ("2 LISTA DE MOTORISTAS", "inv")], align="left", press=["D", "OK"]),
    "16_lista01":       dict(lines=[("01 99999", "inv"), "02 98646"], align="left", press=["U", "D"]),
    "17_lista02":       dict(lines=["01 99999", ("02 98646", "inv")], align="left", press=["U", "D", "OK"]),
    "18_confirma_con":  dict(lines=["99999", "11111111000", ["NÃO", ("SIM", "inv")]], press=["D", "OK"]),
    "19_conectado":     dict(home="99999", hora="15:30", press=[]),
    "20_menu_mot2":     dict(lines=["MENU DO", "MOTORISTA"], icon="card", press=["OK"]),
    "21_desconectar":   dict(lines=["DESCONECTAR", "MOTORISTA?", "99999", ["NÃO", ("SIM", "inv")]], press=["D", "OK"]),
    "22_desconectado":  dict(lines=["MOTORISTA", "DESCONECTADO", "99999"], press=[]),
}

S = lambda v: int(v * SS)
LCD = (S(150), S(150), S(1300), S(560))       # x0, y0, x1, y1
BTN_Y = (S(690), S(800))
BTN_X = [S(200), S(470), S(740), S(1010)]       # largura 230
BTN_W = S(230)

def rounded(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)

def draw_device(img, d):
    # moldura
    rounded(d, (S(60), S(60), S(1860), S(1020)), S(48), fill=BEZEL)
    rounded(d, (S(60), S(60), S(1860), S(120)), S(48), fill=BEZEL_HI)
    d.rectangle((S(60), S(100), S(1860), S(120)), fill=BEZEL)
    # visor (com borda interna)
    x0, y0, x1, y1 = LCD
    rounded(d, (x0 - S(18), y0 - S(18), x1 + S(18), y1 + S(18)), S(22), fill=(8, 9, 11))
    rounded(d, LCD, S(10), fill=LCD_BG)
    d.text((x1 - S(10), y0 - S(46)), "INMETRO", font=font(SANS, 22), fill=(150, 156, 168), anchor="ra")
    # leitor de cartão (à direita)
    rounded(d, (S(1560), S(140), S(1680), S(600)), S(16), fill=(10, 11, 13))
    rounded(d, (S(1595), S(190), S(1645), S(550)), S(10), fill=(55, 58, 66))
    # símbolo de aproximação acima dos botões
    cx = (BTN_X[1] + BTN_X[2] + BTN_W) // 2
    for i, r in enumerate((26, 44, 62)):
        d.arc((cx - S(r) - S(30), S(615) - S(r), cx + S(r) - S(30), S(615) + S(r)), -45, 45, fill=(170, 175, 185), width=S(6))

def draw_buttons(d, press):
    keys = ["V", "U", "D", "OK"]
    for k, x in zip(keys, BTN_X):
        y0, y1 = BTN_Y
        hot = k in press
        if hot:
            rounded(d, (x - S(14), y0 - S(14), x + BTN_W + S(14), y1 + S(14)), S(30), outline=PINK, width=S(10))
        rounded(d, (x, y0, x + BTN_W, y1), S(18), fill=BTN, outline=(60, 63, 70), width=S(3))
        c = (255, 255, 255) if hot else (205, 208, 214)
        mx, my = x + BTN_W // 2, (y0 + y1) // 2
        if k == "U":
            d.polygon([(mx, my - S(24)), (mx - S(28), my + S(20)), (mx + S(28), my + S(20))], fill=c)
        elif k == "D":
            d.polygon([(mx, my + S(24)), (mx - S(28), my - S(20)), (mx + S(28), my - S(20))], fill=c)
        elif k == "OK":
            d.text((mx, my), "OK", font=font(SANS, 46), fill=c, anchor="mm")
        else:  # voltar: seta em U
            d.arc((mx - S(30), my - S(26), mx + S(22), my + S(26)), 270, 90, fill=c, width=S(8))
            d.line((mx - S(30), my + S(26), mx - S(4), my + S(26)), fill=c, width=S(8))
            d.polygon([(mx - S(34), my - S(26)), (mx - S(14), my - S(42)), (mx - S(14), my - S(10))], fill=c)
    # rótulo
    if press:
        d.text((BTN_X[0], S(850)), "PRESSIONE", font=font(SANS, 26), fill=PINK, anchor="ls")

def lcd_text(d, spec):
    x0, y0, x1, y1 = LCD
    if "home" in spec:
        d.text((x0 + S(50), (y0 + y1) // 2), "000", font=font(MONO, 230), fill=LCD_TXT, anchor="lm")
        f = font(MONO, 64)
        rx = x1 - S(50)
        d.text((rx, y0 + S(95)), "26/10/23 " + spec.get("hora", "15:27"), font=f, fill=LCD_TXT, anchor="rm")
        d.text((rx, y0 + S(205)), "0007480.3km", font=f, fill=LCD_TXT, anchor="rm")
        d.text((x0 + S(560), y0 + S(315)), "km/h", font=font(MONO, 48), fill=LCD_TXT, anchor="lm")
        d.text((rx, y0 + S(315)), "▣ " + spec["home"], font=f, fill=LCD_TXT, anchor="rm")
        return
    lines = spec["lines"]
    n = len(lines)
    px = 80 if n <= 3 else 70
    f = font(MONO, px)
    lh = S(px * 1.28)
    icon_w = S(170) if spec.get("icon") else 0
    area_x0, area_x1 = x0 + S(40), x1 - S(40) - icon_w
    top = (y0 + y1) // 2 - (n * lh) // 2 + lh // 2
    for i, ln in enumerate(lines):
        y = top + i * lh
        if isinstance(ln, list):  # opções NÃO / SIM nas metades
            for j, part in enumerate(ln):
                txt, inv = (part if isinstance(part, tuple) else (part, None))
                cx = area_x0 + (area_x1 - area_x0) * (1 + 2 * j) // 4
                draw_run(d, txt, cx, y, f, inv, "mm")
            continue
        txt, inv = (ln if isinstance(ln, tuple) else (ln, None))
        if spec.get("align") == "left":
            draw_run(d, txt, area_x0 + S(20), y, f, inv, "lm", full=(area_x0, area_x1))
        else:
            draw_run(d, txt, (area_x0 + area_x1) // 2, y, f, inv, "mm")
    if spec.get("icon") == "±":
        ix = x1 - S(150)
        cy = (y0 + y1) // 2
        d.text((ix - S(30), cy), "±", font=font(MONO, 110), fill=LCD_TXT, anchor="mm")
        rounded(d, (ix + S(20), cy - S(70), ix + S(110), cy + S(70)), S(10), outline=LCD_TXT, width=S(10))
    elif spec.get("icon") == "card":
        ix = x1 - S(130)
        cy = (y0 + y1) // 2
        rounded(d, (ix - S(45), cy - S(80), ix + S(45), cy + S(80)), S(12), outline=LCD_TXT, width=S(10))
        d.rectangle((ix - S(20), cy - S(110), ix + S(20), cy - S(80)), fill=LCD_TXT)

def draw_run(d, txt, x, y, f, inv, anchor, full=None):
    if inv:
        bb = d.textbbox((x, y), txt, font=f, anchor=anchor)
        pad = S(14)
        box = (bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad)
        if full:
            box = (full[0], box[1], full[1], box[3])
        d.rectangle(box, fill=LCD_TXT)
        d.text((x, y), txt, font=f, fill=LCD_BG, anchor=anchor)
    else:
        d.text((x, y), txt, font=f, fill=LCD_TXT, anchor=anchor)

def lcd_grain(img):
    # leve textura de pixels do LCD, só dentro do visor
    x0, y0, x1, y1 = LCD
    region = img.crop((x0, y0, x1, y1))
    grid = Image.new("L", region.size, 0)
    gd = ImageDraw.Draw(grid)
    step = S(6)
    for gx in range(0, region.size[0], step):
        gd.line((gx, 0, gx, region.size[1]), fill=18)
    for gy in range(0, region.size[1], step):
        gd.line((0, gy, region.size[0], gy), fill=18)
    dark = Image.new("RGB", region.size, (120, 130, 140))
    region = Image.composite(dark, region, grid)
    img.paste(region, (x0, y0))

def inset_photo(img, d, name):
    src = DIR / "prints" / f"{name}.jpg"
    if not src.exists():
        return
    ph = Image.open(src).convert("RGB")
    w, h = S(400), S(225)
    ph = ph.resize((w, h), Image.LANCZOS)
    x, y = S(1420), S(690)
    rounded(d, (x - S(8), y - S(8), x + w + S(8), y + h + S(8)), S(14), fill=(255, 255, 255))
    img.paste(ph, (x, y))
    d.text((x, y + h + S(44)), "FOTO REAL", font=font(SANS, 22), fill=(150, 156, 168), anchor="ls")

def render(name, spec):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    draw_device(img, d)
    lcd_text(d, spec)
    lcd_grain(img)
    d = ImageDraw.Draw(img)
    draw_buttons(d, spec.get("press", []))
    inset_photo(img, d, name)
    img = img.resize((1920, 1080), Image.LANCZOS)
    img.save(OUT / f"{name}.jpg", quality=93)

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, spec in TELAS.items():
        render(name, spec)
    print(f"{len(TELAS)} telas em {OUT}")
