#!/usr/bin/env python3
"""Cria (ou redefine a senha de) um usuario do Hub no Supabase e, com --admin, da o papel de administrador.
Variaveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secreta) e DRYVE_SENHA_ADMIN (senha inicial; minimo 10 caracteres).
A senha NUNCA e impressa. Uso: python tools/criar_usuario_supabase.py --email pessoa@empresa.com [--admin]
Rode DEPOIS de executar supabase/schema.sql (a tabela perfis precisa existir).
"""
import argparse, json, os, sys, urllib.error, urllib.parse, urllib.request

def chamar(metodo, url, chave, corpo=None, extra=None):
    h = {"apikey": chave, "Content-Type": "application/json"}; h.update(extra or {})
    if chave.startswith("eyJ"): h["Authorization"] = "Bearer " + chave   # chaves novas (sb_secret_...) nao sao JWT: so apikey
    req = urllib.request.Request(url, data=json.dumps(corpo).encode("utf-8") if corpo is not None else None, method=metodo, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode("utf-8", "replace"); return r.status, (json.loads(t) if t.strip() else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode("utf-8", "replace")
        try: return e.code, json.loads(t)
        except ValueError: return e.code, {"raw": t[:200]}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--email", required=True); ap.add_argument("--admin", action="store_true"); a = ap.parse_args()
    url, chave, senha = os.environ.get("SUPABASE_URL", "").strip().rstrip("/"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip(), os.environ.get("DRYVE_SENHA_ADMIN", "")
    if not url or not chave: raise SystemExit("ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.")
    if len(senha) < 10: raise SystemExit("ERRO: DRYVE_SENHA_ADMIN precisa ter pelo menos 10 caracteres.")
    email = a.email.strip().lower()
    st, j = chamar("POST", url + "/auth/v1/admin/users", chave, {"email": email, "password": senha, "email_confirm": True})
    if st in (200, 201): uid, acao = j["id"], "criado"
    elif st == 422 or (isinstance(j, dict) and "already" in json.dumps(j).lower()):   # ja existe: redefine a senha
        st2, lista = chamar("GET", url + "/auth/v1/admin/users?per_page=1000", chave)
        uid = next((u["id"] for u in (lista or {}).get("users", []) if (u.get("email") or "").lower() == email), None)
        if not uid: raise SystemExit("ERRO: o usuario existe mas nao consegui localiza-lo.")
        st3, j3 = chamar("PUT", f"{url}/auth/v1/admin/users/{uid}", chave, {"password": senha, "email_confirm": True})
        if st3 not in (200, 201): raise SystemExit(f"ERRO ao redefinir a senha: HTTP {st3}")
        acao = "ja existia: senha redefinida"
    else: raise SystemExit(f"ERRO do Supabase ao criar usuario: HTTP {st} {json.dumps(j, ensure_ascii=False)[:200]}")
    print(f"usuario {email}: {acao}")
    if a.admin:
        st4, j4 = chamar("POST", url + "/rest/v1/perfis?on_conflict=id", chave, {"id": uid, "email": email, "papel": "admin"}, {"Prefer": "resolution=merge-duplicates,return=minimal"})
        if st4 not in (200, 201, 204): raise SystemExit(f"ERRO ao definir papel admin: HTTP {st4} {json.dumps(j4, ensure_ascii=False)[:200]} (rodou o supabase/schema.sql?)")
        print("papel: admin")

if __name__ == "__main__": main()
