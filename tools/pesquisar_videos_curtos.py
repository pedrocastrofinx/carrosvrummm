"""Acha VIDEOS CURTOS (Shorts, ate 90 s) de cada modelo no YouTube, so para o atendente baixar e mandar ao cliente.
Guarda so links e metadados (nao baixa nada). Funciona sem a cota de BUSCA (que e pequena): le os uploads recentes de canais
(playlistItems = 1 unidade por pagina) e filtra por duracao, depois casa o titulo com os modelos do inventario.
Canais: os que ja apareceram na pesquisa anterior + canais oficiais das marcas + extras em data/canais-extras.txt (um @handle por linha).
Retomavel (cache em data/videos-curtos.json). Uso: YOUTUBE_API_KEY=... python tools/pesquisar_videos_curtos.py [--paginas 3] [--max-seg 90]"""
import json, os, re, sys, time, unicodedata, pathlib, urllib.request, urllib.parse, urllib.error

RAIZ = pathlib.Path(__file__).resolve().parent.parent; D = RAIZ / "data"
KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
args = sys.argv[1:]
opt = lambda n, d: args[args.index("--" + n) + 1] if "--" + n in args else d
PAGINAS, MAX_SEG = int(opt("paginas", 3)), int(opt("max-seg", 90))
SAIDA = D / "videos-curtos.json"
if not KEY: raise SystemExit("ERRO: defina YOUTUBE_API_KEY no ambiente (a chave nao deve ser gravada em arquivo do projeto).")

MARCAS = ["fiatbrasil", "chevroletbrasil", "volkswagenbrasil", "hyundaibrasil", "toyotadobrasil", "jeepbrasil", "renaultdobrasil", "nissanbrasil", "hondaautomoveisbr",
          "bydbrasil", "gwmbrasil", "caoachery", "citroenbrasil", "peugeotbrasil", "ramtrucksbrasil", "kiabrasil", "mitsubishimotorsbrasil", "bmwbrasil", "mercedesbenzbrasil",
          "audibrasil", "volvocarbrasil", "landroverbrasil", "lexusbrasil", "movida", "localiza", "suzukibrasil", "omodabrasil", "jaecoo", "leapmotorbrasil", "porschebrasil", "minibrasil"]

def norm(s): return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFD", str(s or "").lower()).encode("ascii", "ignore").decode()).strip()
def api(ep, **p):
    url = "https://www.googleapis.com/youtube/v3/" + ep + "?" + urllib.parse.urlencode({**p, "key": KEY})
    try: return json.load(urllib.request.urlopen(url, timeout=30))
    except urllib.error.HTTPError as e:
        corpo = e.read().decode("utf-8", "ignore").replace(KEY, "***")
        if e.code in (403, 429) and "quota" in corpo.lower(): raise SystemExit("COTA DO DIA ACABOU: progresso salvo; rode de novo amanha (renova ~04h, horario de Brasilia).")
        if e.code == 404: return {}
        raise SystemExit(f"HTTP {e.code}: {corpo[:300]}")
def seg(iso):
    r = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not r: return None
    d, h, m, s = (int(x or 0) for x in r.groups()); return d * 86400 + h * 3600 + m * 60 + s
def salvar(d):
    tmp = SAIDA.with_suffix(".tmp"); tmp.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8"); os.replace(tmp, SAIDA)

feito = json.loads(SAIDA.read_text(encoding="utf-8")) if SAIDA.exists() else {}
feito.setdefault("canais", {})

# ---- 1) lista de canais ----
canais = {}
for x in json.loads((D / "candidatos-youtube.json").read_text(encoding="utf-8-sig"))["veiculos"].values():
    for v in x.get("candidatos", []): canais[v["canalId"]] = v["canal"]
extras = (D / "canais-extras.txt").read_text(encoding="utf-8").split() if (D / "canais-extras.txt").exists() else []
for h in MARCAS + extras:
    h = h.lstrip("@")
    if "@" + h in feito.setdefault("handles", {}):
        if feito["handles"]["@" + h]: canais[feito["handles"]["@" + h]] = "@" + h
        continue
    it = (api("channels", part="id", forHandle="@" + h).get("items") or [{}])[0]
    feito["handles"]["@" + h] = it.get("id"); print("handle @" + h, "->", it.get("id") or "nao existe")
    if it.get("id"): canais[it["id"]] = "@" + h
salvar(feito)

# ---- 2) uploads recentes de cada canal -> so os curtos ----
pend = [c for c in canais if c not in feito["canais"]]
print(f"{len(canais)} canais | {len(pend)} a ler")
for n, cid in enumerate(pend, 1):
    lista, pag = [], None
    for _ in range(PAGINAS):
        j = api("playlistItems", part="contentDetails", playlistId="UU" + cid[2:], maxResults=50, **({"pageToken": pag} if pag else {}))
        lista += [i["contentDetails"]["videoId"] for i in j.get("items", [])]; pag = j.get("nextPageToken")
        if not pag: break
    curtos = []
    for i in range(0, len(lista), 50):
        for it in api("videos", part="contentDetails,snippet,statistics", id=",".join(lista[i:i + 50])).get("items", []):
            s = seg(it["contentDetails"].get("duration")); sn = it["snippet"]
            if s and s <= MAX_SEG:
                curtos.append({"videoId": it["id"], "titulo": sn["title"], "descricao": sn.get("description", "")[:400], "canal": sn["channelTitle"], "publicadoEm": sn["publishedAt"][:10], "duracao": s, "visualizacoes": int(it.get("statistics", {}).get("viewCount", 0))})
    feito["canais"][cid] = {"nome": canais[cid], "lidos": len(lista), "curtos": curtos}
    if n % 5 == 0 or n == len(pend): salvar(feito)
    print(f"{n}/{len(pend)} {ascii(canais[cid])}: {len(curtos)} curtos de {len(lista)}")
salvar(feito)

# ---- 3) casa os curtos com os modelos do inventario ----
inv = json.loads((D / "veiculos-pesquisa.json").read_text(encoding="utf-8-sig"))["veiculos"]
modelos = {}
for v in inv:
    k = norm(v["marca"] + " " + v["modelo"]); m = modelos.setdefault(k, {"marca": v["marca"], "modelo": v["modelo"], "locadoras": set(), "veiculos": []}); m["locadoras"].update(v.get("locadoras") or [])
RUIM = ("leilao", "usado", "seminovo", "batida", "acidente", "roubo", "defeito", "reclama", "vendi", "vendo")
res = {k: [] for k in modelos}; vistos = set()
for c in feito["canais"].values():
    for v in c["curtos"]:
        tit, txt = norm(v["titulo"]), norm(v["titulo"] + " " + v["descricao"])
        if any(r in tit.split() or r in tit for r in RUIM) or v["videoId"] in vistos: continue
        for k, m in modelos.items():
            mod, marca = norm(m["modelo"]), norm(m["marca"])
            if not re.search(r"(?<![a-z0-9])" + re.escape(mod) + r"(?![a-z0-9])", tit): continue   # modelo precisa estar no TITULO
            if len(mod) <= 3 and marca not in txt: continue                                            # nomes curtos (C3, X3, T Cross) exigem a marca
            cat = "interior" if re.search(r"\b(interno|interior|por dentro|painel|cabine|bancos|porta malas)\b", tit) else "exterior" if re.search(r"\b(por fora|exterior|visual|design|frente|traseira)\b", tit) else "geral"
            res[k].append({**{a: v[a] for a in ("videoId", "titulo", "canal", "publicadoEm", "duracao", "visualizacoes")}, "url": "https://www.youtube.com/shorts/" + v["videoId"], "categoria": cat, "marcaNoTitulo": marca in tit}); vistos.add(v["videoId"])
feito["modelos"] = {k: {"marca": modelos[k]["marca"], "modelo": modelos[k]["modelo"], "locadoras": sorted(modelos[k]["locadoras"]),
                        "videos": sorted(r, key=lambda x: (not x["marcaNoTitulo"], -x["visualizacoes"]))[:15]} for k, r in res.items()}
feito["geradoEm"] = time.strftime("%Y-%m-%d"); salvar(feito)
com = sum(1 for m in feito["modelos"].values() if m["videos"])
print(f"FIM: {com} de {len(modelos)} modelos com ao menos 1 video curto | {sum(len(m['videos']) for m in feito['modelos'].values())} links")

# ---- 4) arquivo carregado pelo Hub (aba "Videos curtos" da ficha) ----
js = {"geradoEm": feito["geradoEm"], "modelos": [{"marca": m["marca"], "modelo": m["modelo"], "v": [[x["videoId"], x["titulo"], x["canal"], x["duracao"], x["publicadoEm"]] for x in m["videos"]]} for m in feito["modelos"].values() if m["videos"]]}
(D / "videos-curtos.js").write_text("/* Videos curtos (Shorts, ate 90 s) por modelo: so links de referencia, gerado por tools/pesquisar_videos_curtos.py */\nwindow.VIDEOS_CURTOS = " + json.dumps(js, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print("data/videos-curtos.js gravado")
