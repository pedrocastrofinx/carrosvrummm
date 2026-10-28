# Dryve Assinatura Hub (versão HTML)

Central operacional para a equipe de atendimento: catálogo de veículos por assinatura, fichas, biblioteca de vídeos, clientes e retiradas, mensagens padronizadas e Clove Assistente.

## Como rodar
Abra `index.html` no Chrome ou Edge (duplo clique). Não precisa instalar nada.
Os dados ficam no navegador: cadastros em `localStorage`, fotos e vídeos em IndexedDB. O ZIP é lido via JSZip (CDN), então a importação de ZIP precisa de internet. Sem internet, extraia o ZIP e importe a pasta.

## Primeiros passos
1. Menu do usuário (canto superior direito) → perfil **Administrador**.
2. Administração → **Importar**: arraste os ZIPs `BANCOS` e `Cores`, ou as pastas.
   - Vídeos com banco/extrato/cartão no nome vão para Tutoriais de bancos e documentos (apoio operacional).
   - Imagens só são ligadas a um veículo se o modelo aparecer no nome do arquivo ou da pasta. O resto fica em Biblioteca → "Sem veículo" para você vincular.
   - Retirada/depoimento entra como restrito até a autorização ser confirmada.
3. Administração → Veículos: complete versão, planos, câmbio etc. O que faltar aparece como "Não informado".

## Dados
Cadastro-base: Movida e Localiza (links dos catálogos) e 8 modelos citados (só marca, modelo, categoria). Não há preço, versão ou disponibilidade inventados. "Dados e backup → Carregar demonstração" adiciona 3 veículos fictícios marcados DEMONSTRAÇÃO, removíveis.

## Clove Assistente
- **Modo demonstração** (padrão): regras determinísticas sobre os dados locais. Identificado na tela.
- **Modo API**: Administração → Clove → endereço do seu servidor. O Hub envia `{pergunta, regras, historico, contexto}` e espera `{texto}`. A chave do modelo fica só no servidor (variável de ambiente). Sem chave no navegador.

## Limitações desta versão (e o que a hospedagem resolve)
- Perfil admin/atendente é só separação de tela, **não é segurança**. Autenticação e permissões reais: Supabase Auth + RLS.
- Dados e arquivos são por navegador. Para a equipe toda: Supabase (Postgres + Storage com URLs assinadas).
- Link "interno" de vídeo enviado por arquivo só abre no mesmo navegador; vídeos por URL e a versão hospedada geram links reais.
- Download só para arquivos enviados ao Hub e permitidos; links externos abrem o original.

## Estrutura
`index.html`, `styles.css`, `js/core.js` (dados, IndexedDB, templates), `js/clove.js` (assistente), `js/views.js` (telas), `js/admin.js` (cadastros/importação), `js/main.js` (rotas e eventos).


## Pesquisa de vídeos e auditoria (27/10/2026)

O inventário deduplicado está em `data/veiculos-pesquisa.json` (280 ofertas, 277 combinações únicas). `data/videos-validados.json` não contém vídeos validados porque a chave da YouTube Data API não estava disponível no ambiente de auditoria. Não trate candidatos de pesquisa como vídeos aprovados.

A ferramenta retomável `tools/pesquisar_videos.py` lê a chave apenas da variável de ambiente `YOUTUBE_API_KEY`, mantém `data/youtube-cache.json`, `data/progresso-pesquisa.json` e `data/candidatos-youtube.json`, e não marca candidatos como validados automaticamente.

No PowerShell, configure a chave localmente e execute lotes:
```powershell
$env:YOUTUBE_API_KEY = "SUA_CHAVE_LOCAL"
python tools/pesquisar_videos.py --limite 10
```
Não coloque a chave em HTML/JS nem no ZIP. Revise os candidatos, confirme a geração/versão/ano e disponibilidade do vídeo, e só então cadastre-os em `data/videos-validados.json`.

Leia `relatorio-final.md` e `relatorio-final.json` para o status auditado. Esta versão é uma entrega parcial de preparação e auditoria, não uma conclusão da pesquisa de 277 veículos.

## Publicar e automatizar
Veja **README-DEPLOY.md**: Vercel + Supabase (login e precos privados), IA do Clove, catalogos e videos atualizando sozinhos pelo GitHub Actions.
