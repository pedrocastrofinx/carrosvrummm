# Dryve Hub: publicar na Vercel (com Supabase, IA e atualização automática)

Faça na ordem. Os passos 1 e 2 são no Supabase; o 3 e o 4 (GitHub e Vercel) podem ser feitos por você ou por mim.

## O que funciona sozinho depois de publicado
| Peça | Como funciona |
|---|---|
| Catálogo Movida e Localiza | O GitHub Actions coleta as páginas públicas todo dia às 06:00 (Brasília). Só grava se algo mudou. Se vier menos de 70% do que já existia, **não grava nada** e o job falha. |
| Vídeos | Todo dia às 07:00 pesquisa os veículos pendentes até a cota do YouTube acabar e retoma no dia seguinte. Entram no Hub com o selo **SUGERIDO · revisar**. |
| Interno e externo | Busca dedicada por modelo (interior e exterior). Vídeos de avaliação completa aparecem nas duas abas. |
| Motor e consumo | Vêm da tabela oficial do Inmetro (PBE Veicular 2026). Cada ficha mostra a fonte e a linha do Inmetro usada no casamento. |
| IA (Clove) | `/api/clove` na Vercel, com a chave da Anthropic só no servidor e login obrigatório. |
| Preços da Localiza | Ficam no Supabase, atrás de login. **Não vão para o GitHub nem para o site público.** |

## 1. Supabase (uma vez)
1. **Authentication → Sign In / Providers → Email → desligue "Allow new users to sign up".** Obrigatório: sem isso qualquer pessoa cria conta e lê os preços.
2. **SQL Editor → New query**: cole o conteúdo de `supabase/schema.sql` e rode (Run).
3. **Project Settings → API**: tenha à mão o `Project URL` e a chave `service_role` (secreta).

## 2. Criar seu usuário e enviar os preços (um comando)
No PowerShell, na pasta do projeto:
```powershell
powershell -ExecutionPolicy Bypass -File supabase\CONFIGURAR.ps1
```
Ele pergunta (com digitação oculta) a URL do Supabase, a `service_role` e a senha inicial. Cria `pedro.castro@finxcapital.com.br` como **administrador**, envia `data/tabela-localiza.js` para o Supabase e apaga as chaves da memória ao terminar. Nada é gravado em arquivo.
Para outro analista: `python tools/criar_usuario_supabase.py --email pessoa@empresa.com` (com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `DRYVE_SENHA_ADMIN` definidos na janela). Sem `--admin` o papel é atendente.
Depois do primeiro login, use o botão **Trocar senha** (canto inferior direito).

## 2b. Biblioteca de vídeos para baixar (vídeos dos carros, compartilhados)
Os vídeos que a equipe já tem (arquivos MP4) ficam num bucket **privado** do Supabase; todos os analistas logados veem e **baixam o arquivo original**. As referências do YouTube ficam ocultas por padrão (só consulta, não baixáveis).
1. **SQL Editor**: cole e rode `supabase/midias.sql` (cria a tabela e o bucket `midias`; limite de 50 MB por arquivo no plano gratuito).
2. No PowerShell: `powershell -ExecutionPolicy Bypass -File "C:\Users\PedroCastro\Downloads\DryveHub-completa-com-videos\dryvehub-final\supabase\ENVIAR-VIDEOS.ps1"` (peça só a chave secreta; `-SoTestar` mostra o casamento sem enviar nada).
3. O script casa o nome de cada arquivo com o veículo (versão exata quando dá; senão vale para **todas as versões do modelo**) e grava o relatório em `data/videos-biblioteca-relatorio.json`. Corrija qualquer vínculo no Hub (Administração → Mídias → editar). Vídeos novos: o administrador envia pelo Hub (Adicionar mídia) e eles vão direto para a nuvem.
Se o `midias.sql` ainda não foi rodado, o Hub funciona como antes (uploads ficam só no navegador).

## 3. GitHub
Repositório **privado**. O `.gitignore` já deixa de fora `data/tabela-localiza.js` e arquivos de chave:
```powershell
git init -b main
git add .
git status          # confira: NÃO pode aparecer data/tabela-localiza.js nem .env
git commit -m "Dryve Hub"
git remote add origin https://github.com/SEU-USUARIO/dryvehub.git
git push -u origin main
```
Depois: **Settings → Secrets and variables → Actions → New repository secret**: `YOUTUBE_API_KEY` (chave nova, restrita à YouTube Data API v3).
**Settings → Actions → General → Workflow permissions**: *Read and write permissions*.
Em **Actions**, rode manualmente os dois workflows (*Run workflow*) para testar.

## 4. Vercel
1. **Add New → Project → Import** o repositório. Framework: *Other*. Não mude build nem output.
2. **Environment Variables** (Production):
   - `ANTHROPIC_API_KEY`: chave da Anthropic
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_ANON_KEY`: chave `anon public`
   - **Não** coloque a `service_role` na Vercel.
3. Deploy. Abra o endereço, entre com seu usuário e teste o Clove.

## 5. Teste de fumaça
- Sem login, o site mostra só a tela de entrada (nenhum dado é carregado antes).
- Depois do login: Catálogo com 277 veículos, vídeos com o selo SUGERIDO e motor/consumo nas fichas.
- A tabela de preços da Localiza abre (vem do Supabase).
- O Clove responde (não deve dizer "modo demonstração").
- `https://SEU-SITE/data/tabela-localiza.js` deve dar **404**.

## Fichas técnicas: o que há e o que falta
- **Motor e consumo (Inmetro, oficial):** 187 de 277 veículos com motor e 146 com consumo.
- **Potência, torque e porta-malas (pesquisa modelo a modelo, 28/10/2026):** 131 veículos com potência, 109 com torque e 140 com porta-malas/caçamba, em 47 dos 87 modelos. Cada dado traz a **URL da fonte e o tipo** (fabricante, concessionária, catálogo ou imprensa) na ficha do veículo ("Informações do fabricante — fonte: ..."). Quando as fontes divergiam (ex.: Virtus/Polo TSI, Compass antigo, Haval PHEV), o dado **não foi gravado**.
- **Sem dado ainda (40 modelos):** Audi (A3, A3 Sportback, Q3, Q5, Q8, SQ5), BMW (320i, 330e, X1, X3, X5, X6), Volvo (XC60, XC90, EX40, EC40), BYD Dolphin/Dolphin Mini/King, Geely EX2/EX5, Denza B5, GWM Poer/Tank/Wey, Land Rover Discovery, Lexus NX-350h, Chevrolet Equinox/Trailblazer, Honda HR-V/WR-V, Jeep Renegade (potência), Fiat Fastback (1.3), RAM Dakota, Toyota SW4, Hyundai Kona, Renault Kangoo, Citroën Jumpy. As buscas não trouxeram fonte brasileira confiável. **Audi A3 Sedan Advanced "Mhev":** só há fichas europeias (1.5 TFSI MHEV) e uma fonte nacional diz que o Advanced vendido aqui é 2.0 TFSI; confirme na Audi Brasil antes de preencher.
- **Como corrigir ou acrescentar:** edite `data/fichas-fabricantes.json` (cada item exige `fonteUrl`; campos `cilindrada`, `turbo`, `versaoContem`, `versaoNaoContem`) e rode `python tools/montar_fichas.py`. Itens de fonte "imprensa" ou "catálogo" valem como referência: confira na ficha oficial antes de afirmar ao cliente.
- **Nova tabela do Inmetro:** baixe o PDF em gov.br/inmetro (PBE Veicular), `pip install pymupdf`, rode `python tools/ler_pbe_inmetro.py caminho.pdf` e depois `python tools/montar_fichas.py`.

## Chaves e segurança
- Rotacione a chave do YouTube que apareceu antes no histórico e **apague o `apiyotuba.txt`** de Downloads.
- `service_role` e `ANTHROPIC_API_KEY` nunca vão para o navegador, para o GitHub ou para o chat.
- Para trocar a senha de alguém ou remover acesso: Supabase → Authentication → Users.

## O que ainda não está pronto
- **3D dos carros:** ficou para depois. A aba "Visão 360° / 3D" aceita fotos em sequência ou `.glb`.
- **Cadastros manuais e aprovações de vídeo** continuam **por navegador**. Compartilhar entre analistas exige sincronizar o estado do Hub com o Supabase, etapa à parte.
- **A busca do YouTube** não prova ano, versão nem conteúdo. Por isso o selo SUGERIDO.
- **Preço da Movida** é o "a partir de" da lista; o da Localiza vem só da sua tabela.
