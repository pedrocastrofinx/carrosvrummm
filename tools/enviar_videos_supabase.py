#!/usr/bin/env python3
"""Envia os VIDEOS DOS CARROS (arquivos .mp4 de uma pasta) para a biblioteca compartilhada do Hub:
Supabase Storage (bucket privado "midias") + tabela midias_compartilhadas. Todos os analistas veem e baixam.
- Casa o nome do arquivo com o veiculo (marca/modelo/versao) do inventario; se so o modelo e identificavel, o video vale para todas as versoes.
- Retomavel: pula o que ja foi enviado (mesmo nome + tamanho). Gera miniatura com ffmpeg, se houver.
- Rode DEPOIS de supabase/midias.sql. Variaveis: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (chave secreta; nunca em arquivo).
Uso: python tools/enviar_videos_supabase.py --pasta "C:\\...\\CARROS- VIDEOS" [--dry-run]
"""
import argparse, json, os, pathlib, re, shutil, subprocess, sys, tempfile, unicodedata, urllib.error, urllib.parse, urllib.request, uuid

DATA = pathlib.Path(__file__).resolve().parents[1] / "data"
CORES = ["branco", "preto", "vermelho", "cinza", "prata", "azul", "verde", "grafite", "amarelo", "laranja", "bege", "marrom", "dourado", "vinho", "cassiopeia", "titanium"]
STOP = {"flex", "aut", "autom", "automatico", "automatica", "manual", "turbo", "com", "sem", "pack", "base", "plus", "novo", "nova", "cd", "cs", "ce", "tb", "mpi", "tsi", "gdi", "tgdi", "4x2", "4x4", "5p", "4p", "12v", "16v", "8v", "6v",
        "diesel", "gasolina", "hibrido", "mec", "mecanico", "cabine", "dupla", "simples", "sedan", "hatch"}
MARCA_ALIAS = {"vw": "volkswagen"}

def norm(s): return unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
def toks(s): return re.findall(r"[a-z0-9]+(?:\.[0-9]+)?", norm(s))
def cil(s):
    m = re.search(r"(?<!\d)(\d)[.,](\d)(?!\d)", str(s or "")); return f"{m.group(1)}.{m.group(2)}" if m else None
def trans(s):
    n = norm(s)
    if re.search(r"\b(aut|autom|automatico|automatica|cvt|dct|at)\b", n): return "A"
    if re.search(r"\b(manual|mt|mec)\b", n): return "M"
    return None

def limpar_nome(arq):
    s = pathlib.Path(arq).stem
    s = re.sub(r"^(c.pia de|copia de)\s+", "", s, flags=re.I)          # "Copia de ..." (o acento pode vir como ?)
    s = re.sub(r"\.(mp4|mov|m4v|webm)\b", " ", s, flags=re.I)         # "ONIX ... AUT..mp4 BRANCO"
    s = re.sub(r"\s*\(\d+\)\s*$", "", s)
    s = re.sub(r"[_]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip(" .-")
    return s

def titulo_de(s):
    if s.isupper():
        return " ".join(w if (len(w) <= 3 or any(c.isdigit() for c in w)) else w.capitalize() for w in s.split())
    return s

def carregar_inventario():
    inv = json.loads((DATA / "veiculos-pesquisa.json").read_text(encoding="utf-8-sig"))["veiculos"]
    modelos, nomes = {}, {}
    for v in inv:                                     # Movida e Localiza escrevem o mesmo modelo de jeitos diferentes (TERA/Tera): junta pela forma normalizada
        k = (norm(v["marca"]), norm(v["modelo"]))
        nomes.setdefault(k, (v["marca"], v["modelo"]))
        modelos.setdefault(k, []).append(v)
    return {nomes[k]: vs for k, vs in modelos.items()}

def casar(nome_limpo, modelos):
    """-> {'marca','modelo','versao','locadora','todas_versoes','confianca'} ou None (video institucional/sem carro)"""
    txt = " " + " ".join(toks(nome_limpo.replace("-", " "))) + " "
    achados = []
    for (marca, modelo), vs in modelos.items():
        mt = toks(modelo.replace("-", " "))
        if not mt: continue
        achou = re.search(r"(?<![a-z0-9])" + r"\s+".join(map(re.escape, mt)) + r"(?![a-z0-9])", txt)
        if not achou and len("".join(mt)) >= 3:       # "HRV" x "HR-V", "TCROSS" x "T-Cross": janela de ate 3 palavras do arquivo com o mesmo texto compacto
            ft = txt.split(); alvo = "".join(mt)
            achou = any("".join(ft[i:i + w]) == alvo for w in (1, 2, 3) for i in range(len(ft)))
        if achou: achados.append((len("".join(mt)), marca, modelo, vs))
    if not achados: return None
    achados.sort(key=lambda x: -x[0]); topo = achados[0][0]
    achados = [a for a in achados if a[0] == topo]
    if len({(a[1], a[2]) for a in achados}) > 1: return None            # modelo ambiguo: nao arrisca
    _, marca, modelo, vs = achados[0]
    ft = set(toks(nome_limpo))
    pont = []
    for v in vs:
        vt = {t for t in toks(v.get("versao")) if len(t) >= 3 and t not in STOP and not re.fullmatch(r"[\d.]+v?", t)}
        p = 3 * len(vt & ft)
        cv, cf, tv, tf = cil(v.get("versao")), cil(nome_limpo), trans(v.get("versao")), trans(nome_limpo)
        if cv and cf: p += 2 if cv == cf else -6          # motor diferente (2.0 x 3.0 V6) desqualifica
        if tv and tf: p += 1 if tv == tf else -6          # automatico x manual desqualifica
        pont.append((p, v))
    pont.sort(key=lambda x: -x[0])
    base = {"marca": marca, "modelo": modelo}
    if pont and pont[0][0] >= 4 and (len(pont) == 1 or pont[0][0] > pont[1][0]):
        v = pont[0][1]
        return {**base, "versao": v.get("versao") or "", "locadora": (v.get("locadoras") or [""])[0], "todas_versoes": False, "confianca": "versao"}
    return {**base, "versao": "", "locadora": "", "todas_versoes": True, "confianca": "modelo"}

# ---------------- Supabase ----------------
def _headers(chave, extra=None, bearer=False):
    h = {"apikey": chave}
    if bearer or chave.startswith("eyJ"): h["Authorization"] = "Bearer " + chave
    h.update(extra or {}); return h

def http(metodo, url, chave, corpo=None, extra=None):
    for bearer in (False, True):                       # chaves novas (sb_secret_) usam so apikey; se recusar, tenta com Bearer
        req = urllib.request.Request(url, data=corpo, method=metodo, headers=_headers(chave, extra, bearer))
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                t = r.read().decode("utf-8", "replace"); return r.status, (json.loads(t) if t.strip().startswith(("{", "[")) else t)
        except urllib.error.HTTPError as e:
            t = e.read().decode("utf-8", "replace")
            if e.code in (401, 403) and not bearer: continue
            return e.code, t[:300]
    return 401, "nao autorizado"

def enviar_arquivo(url, chave, caminho_storage, dados, mime):
    st, r = http("POST", f"{url}/storage/v1/object/midias/{urllib.parse.quote(caminho_storage)}", chave, dados, {"Content-Type": mime, "x-upsert": "false"})
    if st not in (200, 201): raise RuntimeError(f"upload falhou: HTTP {st} {r}")

def miniatura(arquivo, destino):
    ff = shutil.which("ffmpeg")
    if not ff: return False
    for ss in ("1", "0"):
        subprocess.run([ff, "-y", "-loglevel", "error", "-ss", ss, "-i", str(arquivo), "-frames:v", "1", "-vf", "scale=480:-2", str(destino)], capture_output=True)
        if destino.exists() and destino.stat().st_size > 0: return True
    return False

def seguro(nome): return re.sub(r"[^A-Za-z0-9._-]+", "_", unicodedata.normalize("NFD", nome).encode("ascii", "ignore").decode())

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--pasta", required=True); ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--incluir-com-marca-dagua", action="store_true", help="envia tambem os videos com marca d'agua de terceiros (so com autorizacao)")
    a = ap.parse_args()
    pasta = pathlib.Path(a.pasta)
    arquivos = sorted(p for p in pasta.rglob("*") if p.is_file() and p.suffix.lower() in (".mp4", ".mov", ".m4v", ".webm"))
    if not arquivos: raise SystemExit("ERRO: nenhum video encontrado em " + str(pasta))
    modelos = carregar_inventario()
    bloqueados = set()
    lista = DATA / "videos-com-marca-dagua.json"
    if lista.exists() and not a.incluir_com_marca_dagua: bloqueados = set(json.loads(lista.read_text(encoding="utf-8"))["arquivos"])
    ignorados = [p for p in arquivos if p.name in bloqueados]
    arquivos = [p for p in arquivos if p.name not in bloqueados]
    if ignorados: print(f"{len(ignorados)} videos PULADOS por terem marca d'agua de terceiros (data/videos-com-marca-dagua.json). Use --incluir-com-marca-dagua so com autorizacao.")
    plano = []
    for p in arquivos:
        nome = limpar_nome(p.name); m = casar(nome, modelos)
        cores = [c for c in CORES if c in norm(nome)]
        if m: item = {**m, "categoria": "avaliacao", "tags": ["video-do-carro"] + [f"cor:{c}" for c in cores]}
        elif re.search(r"whatsapp video", nome, re.I):    # sem nome do carro: fica na biblioteca como "sem identificacao" para o admin vincular
            item = {"marca": "", "modelo": "", "versao": "", "locadora": "", "todas_versoes": False, "confianca": "sem-carro", "categoria": "outros", "tags": ["sem-identificacao"]}
        else: item = {"marca": "", "modelo": "", "versao": "", "locadora": "", "todas_versoes": False, "confianca": "sem-carro", "categoria": "apoio_locadora", "tags": ["institucional"]}
        plano.append({"arquivo": p, "titulo": titulo_de(nome), **item})
    resumo = {c: sum(1 for x in plano if x["confianca"] == c) for c in ("versao", "modelo", "sem-carro")}
    print(f"{len(plano)} videos | casados por versao: {resumo['versao']} | por modelo (todas as versoes): {resumo['modelo']} | sem carro (institucional): {resumo['sem-carro']}")
    rel = [{"arquivo": x["arquivo"].name, "titulo": x["titulo"], "marca": x["marca"], "modelo": x["modelo"], "versao": x["versao"], "confianca": x["confianca"], "categoria": x["categoria"]} for x in plano]
    (DATA / "videos-biblioteca-relatorio.json").write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    if a.dry_run: print("dry-run: nada foi enviado. Relatorio em data/videos-biblioteca-relatorio.json"); return
    url, chave = os.environ.get("SUPABASE_URL", "").strip().rstrip("/"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not chave: raise SystemExit("ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.")
    st, existentes = http("GET", f"{url}/rest/v1/midias_compartilhadas?select=nome_original,tamanho&limit=5000", chave)
    if st != 200: raise SystemExit(f"ERRO ao ler a biblioteca (HTTP {st}). Rodou o supabase/midias.sql? {existentes}")
    ja = {(e["nome_original"], e["tamanho"]) for e in existentes}
    enviados = pulados = falhas = 0
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="dryve_thumb_"))
    try:
        for i, x in enumerate(plano, 1):
            p = x["arquivo"]; tam = p.stat().st_size
            if (p.name, tam) in ja: pulados += 1; continue
            mid = str(uuid.uuid4()); caminho = f"{mid}/{seguro(p.name)}"; thumb = None
            try:
                enviar_arquivo(url, chave, caminho, p.read_bytes(), "video/mp4" if p.suffix.lower() != ".webm" else "video/webm")
                t = tmp / (mid + ".jpg")
                if miniatura(p, t):
                    thumb = f"{mid}/thumb.jpg"; enviar_arquivo(url, chave, thumb, t.read_bytes(), "image/jpeg")
                linha = {"id": mid, "tipo": "video", "titulo": x["titulo"], "descricao": "", "categoria": x["categoria"], "marca": x["marca"], "modelo": x["modelo"], "versao": x["versao"],
                         "locadora": x["locadora"], "todas_versoes": x["todas_versoes"], "storage_path": caminho, "thumb_path": thumb, "nome_original": p.name, "tamanho": tam,
                         "permite_download": True, "tags": x["tags"]}
                st, r = http("POST", f"{url}/rest/v1/midias_compartilhadas", chave, json.dumps(linha).encode("utf-8"), {"Content-Type": "application/json", "Prefer": "return=minimal"})
                if st not in (200, 201, 204): raise RuntimeError(f"registro falhou: HTTP {st} {r}")
                enviados += 1; print(f"[{i}/{len(plano)}] ok  {p.name.encode('ascii', 'replace').decode()}")
            except Exception as e:
                falhas += 1; print(f"[{i}/{len(plano)}] FALHOU {p.name.encode('ascii', 'replace').decode()}: {e}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(json.dumps({"enviados": enviados, "jaExistiam": pulados, "falhas": falhas}, ensure_ascii=True))
    if falhas: sys.exit(1)

if __name__ == "__main__": main()
