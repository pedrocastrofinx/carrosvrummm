#!/usr/bin/env python3
"""Gera REELS verticais (1080x1920, ~9 s, estilo TikTok/Reels) com a identidade da Dryve para cada MODELO do catalogo.
Cenas: (1) carro entrando sobre o circulo azul + nome do modelo; (2) tres cartoes com dados do carro (so os que tem fonte em
data/fichas-tecnicas.json; o resto vira "Incluso: IPVA, seguro, manutencao"); (3) chamada final. Sem preco (muda toda hora).
Fotos: Movida (PNG transparente) ou Localiza (endpoint de imagem do proprio site). Confirme que a Dryve pode usar essas imagens.
Requisitos: pip install pillow  |  ffmpeg no PATH.   Uso: python tools/gerar_reels.py [--saida pasta] [--so "marca modelo"] [--limite N] [--forcar]
"""
import argparse, json, pathlib, re, shutil, subprocess, sys, tempfile, unicodedata, urllib.parse, urllib.request
from collections import Counter

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATA, FONTE = RAIZ / "data", RAIZ / "tools" / "assets" / "Sora.ttf"
W, H = 1080, 1920
AZUL, PROF, NAVY, CIANO, MUTED = (10, 92, 255), (0, 56, 201), (20, 33, 61), (111, 228, 255), (91, 103, 131)
_f = {}

def fonte(tam, peso=700):
    k = (tam, peso)
    if k not in _f:
        f = ImageFont.truetype(str(FONTE), tam); f.set_variation_by_axes([peso]); _f[k] = f
    return _f[k]

def norm(s): return unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower().strip()
def bonito(s): return s.title() if s.isupper() else s

def largura(txt, f):
    return f.getbbox(txt)[2]

def ajusta(txt, peso, max_larg, tam_max, tam_min=54):
    for t in range(tam_max, tam_min - 1, -4):
        f = fonte(t, peso)
        if largura(txt, f) <= max_larg: return f
    return fonte(tam_min, peso)

def centro(d, y, txt, f, cor):
    d.text(((W - largura(txt, f)) / 2, y), txt, font=f, fill=cor)

def fundo_claro():
    im = Image.new("RGB", (W, H), "white"); px = im.load()
    for y in range(H):
        t = y / H; c = (int(255 - 21 * t), int(255 - 12 * t), 255)
        for x in range(0, W, 1): px[x, y] = c
    return im

def circulo(im, cx, cy, diam):
    m = Image.new("L", (diam, diam), 0); ImageDraw.Draw(m).ellipse((0, 0, diam - 1, diam - 1), fill=255)
    g = Image.new("RGB", (diam, diam)); gp = g.load()
    for y in range(diam):
        for x in range(diam):
            t = min(1.0, (x * 0.35 + y * 0.65) / diam); gp[x, y] = (int(47 + (0 - 47) * t), int(123 + (56 - 123) * t), int(255 + (201 - 255) * t))
    im.paste(g, (cx - diam // 2, cy - diam // 2), m)

def logo(d, cor=AZUL):
    d.text((70, 70), "Dryve", font=fonte(92, 800), fill=cor)

def carro(url_png, largura_px):
    im = Image.open(url_png).convert("RGBA"); r = largura_px / im.width
    return im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)

def cola_carro(base, car, cx, cy):
    sombra = Image.new("RGBA", car.size, (0, 0, 0, 0)); sombra.putalpha(car.getchannel("A").point(lambda a: int(a * 0.35)))
    sombra = sombra.filter(ImageFilter.GaussianBlur(26))
    x, y = cx - car.width // 2, cy - car.height // 2
    base.alpha_composite(sombra, (x, y + 34)); base.alpha_composite(car, (x, y))

def cena_a(modelo, marca, car):
    im = fundo_claro().convert("RGBA"); d = ImageDraw.Draw(im); logo(d)
    circulo(im, 540, 800, 880); d = ImageDraw.Draw(im)
    centro(d, 410, "Carro 0 km", fonte(40, 600), "white"); centro(d, 460, "por assinatura", fonte(62, 800), CIANO)
    camada = Image.new("RGBA", (W, H), (0, 0, 0, 0)); cola_carro(camada, car, 540, 930)
    f = ajusta(modelo, 800, 940, 140); linhas = [modelo]
    y = 1330
    d.text((70, y), marca.upper(), font=fonte(40, 700), fill=AZUL); y += 64
    d.text((70, y), modelo, font=f, fill=NAVY); y += f.size + 26
    d.text((70, y), "Assine com a Dryve", font=fonte(46, 500), fill=MUTED)
    return im.convert("RGB"), camada

def cena_b(modelo, car, itens):
    im = fundo_claro().convert("RGBA"); d = ImageDraw.Draw(im); logo(d)
    circulo(im, 540, 520, 600); cola_carro(im, car, 540, 580); d = ImageDraw.Draw(im)
    centro(d, 880, modelo, ajusta(modelo, 800, 940, 84, 52), NAVY)
    camadas = []
    for i, (rot, val) in enumerate(itens[:3]):
        y = 1040 + i * 230; c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((80, y + 14, 1000, y + 194), 40, fill=(20, 33, 61, 60)); sh = sh.filter(ImageFilter.GaussianBlur(20)); c.alpha_composite(sh)
        cd = ImageDraw.Draw(c); cd.rounded_rectangle((80, y, 1000, y + 190), 40, fill="white", outline=(228, 233, 241), width=2)
        cd.rounded_rectangle((80, y, 104, y + 190), 12, fill=AZUL)
        cd.text((140, y + 32), rot, font=fonte(34, 600), fill=MUTED)
        cd.text((140, y + 84), val, font=ajusta(val, 800, 820, 70, 40), fill=NAVY)
        camadas.append(c)
    return im.convert("RGB"), camadas

def cena_c():
    im = Image.new("RGB", (W, H)); px = im.load()
    for y in range(H):
        t = y / H; c = (int(10 - 10 * t), int(92 - 36 * t), int(255 - 54 * t))
        for x in range(W): px[x, y] = c
    d = ImageDraw.Draw(im); logo(d, "white")
    centro(d, 520, "Carro 0 km", fonte(70, 600), CIANO)
    for i, t in enumerate(["com tudo incluso:", "IPVA, seguro", "e manutenção"]): centro(d, 640 + i * 130, t, fonte(104, 800), "white")
    d.rounded_rectangle((160, 1380, 920, 1520), 70, fill="white"); centro(d, 1418, "Fale com a Dryve", fonte(54, 800), AZUL)
    centro(d, 1780, "Imagens ilustrativas · dados de referência", fonte(30, 500), (200, 220, 255))
    return im

# ---------------- dados ----------------
def ler_json(nome, padrao):
    p = DATA / nome
    return json.loads(p.read_text(encoding="utf-8-sig")) if p.exists() else padrao

def ler_catalogo(nome):
    p = DATA / nome
    if not p.exists(): return []
    t = p.read_text(encoding="utf-8-sig"); return json.loads(t[t.index("push(") + 5: t.rindex(")")]).get("veiculos", [])

def modelos():
    inv = ler_json("veiculos-pesquisa.json", {}).get("veiculos", []); fichas = ler_json("fichas-tecnicas.json", {}).get("veiculos", {})
    fotos = {}
    for arq in ("catalogo-movida.js", "catalogo-localiza.js"):            # Movida primeiro: PNG transparente maior
        for v in ler_catalogo(arq):
            if v.get("fotos"): fotos.setdefault((norm(v["marca"]), norm(v["modelo"])), v["fotos"][0])
    grupos = {}
    for v in inv:
        k = (norm(v["marca"]), norm(v["modelo"])); g = grupos.setdefault(k, {"marca": bonito(v["marca"]), "modelo": bonito(v["modelo"]), "campos": []})
        g["campos"].append(fichas.get(v["id"], {}).get("campos", {}))
    out = []
    for k, g in grupos.items():
        g["foto"] = fotos.get(k); out.append(g)
    return sorted(out, key=lambda g: (g["marca"], g["modelo"]))

def itens_do_modelo(campos):
    itens = []
    motores = [c["motor"].split(" ·")[0] for c in campos if c.get("motor")]
    if motores: itens.append(("Motor", Counter(motores).most_common(1)[0][0]))
    pot = [int(m.group(1)) for c in campos if c.get("potencia") for m in [re.search(r"(\d+)\s*cv", c["potencia"])] if m]
    if pot: itens.append(("Potência", f"{min(pot)} cv" if min(pot) == max(pot) else f"{min(pot)} a {max(pot)} cv"))
    pm = [c["portaMalas"] for c in campos if c.get("portaMalas")]
    if pm:
        v = Counter(pm).most_common(1)[0][0]; cacamba = v.lower().startswith("caçamba")
        itens.append(("Caçamba" if cacamba else "Porta-malas", re.sub(r"^Caçamba:\s*", "", v).split(" (")[0]))
    for rot, val in (("Incluso", "IPVA"), ("Incluso", "Seguro"), ("Incluso", "Manutenção")):
        if len(itens) >= 3: break
        itens.append((rot, val))
    return itens[:3]

def baixa(url, destino):
    if destino.exists() and destino.stat().st_size > 1000: return True
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 DryveHubReels/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r: destino.write_bytes(r.read())
        Image.open(destino).verify(); return True
    except Exception as e:
        destino.unlink(missing_ok=True); print("   foto falhou:", e); return False

def ff(*a):
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[-400:])

def gerar(g, saida, cache):
    nome = f"REEL - {g['marca']} {g['modelo']}.mp4"; alvo = saida / nome
    img = cache / (re.sub(r"[^a-z0-9]+", "_", norm(g["marca"] + g["modelo"])) + ".webp")
    if not g["foto"] or not baixa(g["foto"], img): return None
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="reel_"))
    try:
        car_a, car_b = carro(img, 1090), carro(img, 820)
        bgA, camA = cena_a(g["modelo"], g["marca"], car_a); bgA.save(tmp / "a.png"); camA.save(tmp / "a_car.png")
        bgB, cards = cena_b(g["modelo"], car_b, itens_do_modelo(g["campos"])); bgB.save(tmp / "b.png")
        for i, c in enumerate(cards): c.save(tmp / f"b{i}.png")
        cena_c().save(tmp / "c.png")
        cod = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-r", "30", "-pix_fmt", "yuv420p"]
        ff("-loop", "1", "-framerate", "30", "-t", "3.2", "-i", str(tmp / "a.png"), "-loop", "1", "-framerate", "30", "-t", "3.2", "-i", str(tmp / "a_car.png"),
           "-filter_complex", "[0:v][1:v]overlay=x='1200*pow(1-min(t/0.9\\,1)\\,3)':y=0:format=auto[v]", "-map", "[v]", *cod, str(tmp / "A.mp4"))
        ent = ["-loop", "1", "-framerate", "30", "-t", "3.6", "-i", str(tmp / "b.png")]
        for i in range(len(cards)): ent += ["-loop", "1", "-framerate", "30", "-t", "3.6", "-i", str(tmp / f"b{i}.png")]
        fil = ";".join(f"[{i + 1}:v]format=rgba,fade=t=in:st={0.5 + 0.4 * i}:d=0.35:alpha=1[c{i}]" for i in range(len(cards)))
        enc = "".join(f"{'[0:v]' if i == 0 else f'[o{i - 1}]'}[c{i}]overlay=0:0[o{i}];" for i in range(len(cards)))
        ff(*ent, "-filter_complex", fil + ";" + enc + f"[o{len(cards) - 1}]null[v]", "-map", "[v]", *cod, str(tmp / "B.mp4"))
        ff("-loop", "1", "-framerate", "30", "-t", "2.6", "-i", str(tmp / "c.png"), "-vf", "fade=t=in:st=0:d=0.2", *cod, str(tmp / "C.mp4"))
        ff("-i", str(tmp / "A.mp4"), "-i", str(tmp / "B.mp4"), "-i", str(tmp / "C.mp4"), "-f", "lavfi", "-t", "8.8", "-i", "anullsrc=r=44100:cl=stereo",
           "-filter_complex", "[0:v][1:v]xfade=transition=fade:duration=0.35:offset=2.85[ab];[ab][2:v]xfade=transition=slideleft:duration=0.35:offset=6.1,format=yuv420p[v]",
           "-map", "[v]", "-map", "3:a", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "64k", "-shortest", "-movflags", "+faststart", str(alvo))
        return alvo
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--saida", default=str(RAIZ / "saida-reels")); ap.add_argument("--so", default=""); ap.add_argument("--limite", type=int, default=0); ap.add_argument("--forcar", action="store_true")
    a = ap.parse_args()
    if not shutil.which("ffmpeg"): raise SystemExit("ERRO: ffmpeg nao encontrado no PATH.")
    saida = pathlib.Path(a.saida); cache = saida / "_imagens"; cache.mkdir(parents=True, exist_ok=True)
    gs = [g for g in modelos() if not a.so or norm(a.so) in norm(g["marca"] + " " + g["modelo"])]
    feitos = falhas = 0
    for i, g in enumerate(gs, 1):
        if a.limite and feitos >= a.limite: break
        nome = f"REEL - {g['marca']} {g['modelo']}.mp4"
        if (saida / nome).exists() and not a.forcar: continue
        try:
            r = gerar(g, saida, cache)
            if r: feitos += 1; print(f"[{i}/{len(gs)}] ok  {nome}  ({r.stat().st_size // 1024} KB)")
            else: falhas += 1; print(f"[{i}/{len(gs)}] SEM FOTO  {nome}")
        except Exception as e:
            falhas += 1; print(f"[{i}/{len(gs)}] FALHOU {nome}: {e}")
    print(json.dumps({"gerados": feitos, "falhas": falhas, "modelos": len(gs), "pasta": str(saida)}, ensure_ascii=True))

if __name__ == "__main__": main()
