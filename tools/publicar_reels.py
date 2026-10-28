#!/usr/bin/env python3
"""Coloca os reels gerados (tools/gerar_reels.py) DENTRO do site: copia para videos/reels/ e gera data/reels.js, que o Hub importa
(um video por modelo, valido para todas as versoes, com download liberado). Assim todo veiculo tem video sem depender do Supabase.
Uso: python tools/publicar_reels.py [pasta_dos_reels]   (padrao: ../REELS-DRYVE ou saida-reels)"""
import hashlib, json, pathlib, re, shutil, sys, unicodedata

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATA = RAIZ / "data"

def norm(s): return unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower().strip()
def slug(s): return re.sub(r"[^a-z0-9]+", "-", norm(s)).strip("-")

def main():
    cand = [pathlib.Path(sys.argv[1])] if len(sys.argv) > 1 else [RAIZ.parent / "REELS-DRYVE", RAIZ / "saida-reels"]
    pasta = next((p for p in cand if p.exists()), None)
    if not pasta: raise SystemExit("ERRO: pasta de reels nao encontrada. Rode tools/gerar_reels.py antes.")
    inv = json.loads((DATA / "veiculos-pesquisa.json").read_text(encoding="utf-8-sig"))["veiculos"]
    por_modelo = {}
    for v in inv: por_modelo.setdefault((norm(v["marca"]), norm(v["modelo"])), v)       # 1o veiculo do modelo = representante
    destino = RAIZ / "videos" / "reels"; destino.mkdir(parents=True, exist_ok=True)
    itens, sem = [], []
    for f in sorted(pasta.glob("REEL - *.mp4")):
        nome = f.stem[len("REEL - "):]
        alvo = next((v for k, v in por_modelo.items() if norm(f"{v['marca']} {v['modelo']}") == norm(nome)), None)
        if not alvo: sem.append(f.name); continue
        arq = slug(nome) + ".mp4"; shutil.copy2(f, destino / arq)
        itens.append({"marca": alvo["marca"], "modelo": alvo["modelo"], "versao": alvo.get("versao") or "", "locadora": (alvo.get("locadoras") or [""])[0], "arq": arq, "titulo": nome})
    corpo = ",".join(json.dumps({"marca": i["marca"], "modelo": i["modelo"], "versao": i["versao"], "locadora": i["locadora"], "videos": ["@@" + i["arq"] + "@@" + i["titulo"]]}, ensure_ascii=False) for i in itens)
    # os videos sao montados em JS para usar o endereco do proprio site (location.origin)
    js = ("/* Gerado por tools/publicar_reels.py: reels Dryve por modelo (valem para todas as versoes; download liberado). */\n"
          "(function () {\n  const O = location.origin, itens = [" + corpo + "];\n"
          "  for (const it of itens) it.videos = it.videos.map(s => { const [a, t] = s.slice(2).split('@@'); return { url: O + '/videos/reels/' + a, titulo: t + ' · Reel Dryve', categoria: 'avaliacao', tags: ['reel-dryve'], todasVersoes: true, permiteDownload: true, nomeOriginal: 'Reel Dryve - ' + t + '.mp4' }; });\n"
          "  (window.CATALOGOS_INICIAIS = window.CATALOGOS_INICIAIS || []).push({ id: 'reels-" + hashlib.sha1(corpo.encode()).hexdigest()[:8] + "', veiculos: itens });\n})();\n")
    (DATA / "reels.js").write_text(js, encoding="utf-8", newline="\n")
    print(json.dumps({"reels": len(itens), "semModelo": sem, "pasta": str(destino)}, ensure_ascii=True))

if __name__ == "__main__": main()
