# Vídeos reais de todos os carros (MP4 para baixar e enviar ao cliente)

Meta: um vídeo curto, vertical, mostrando o carro por fora e **o interior**, para cada modelo, em MP4 que o atendente baixa e manda no WhatsApp.

## O que NÃO dá para fazer
Baixar vídeos de TikTok/YouTube de outras lojas e criadores. O conteúdo é deles, a marca d'água de outra loja aparece para o seu cliente e baixar fora do botão da plataforma viola os termos. Os 111 arquivos da pasta `CARROS- VIDEOS` seguem no Hub só como **uso interno**: 93 têm marca d'água de terceiros e aparecem com o aviso vermelho "Marca d'água de terceiros".

## Caminho 1 — Material oficial (mais rápido para cobrir muitos modelos)
- **Movida e Localiza** (vocês vendem os carros delas): peça ao contato comercial a pasta de mídia oficial (vídeos e fotos dos modelos) com autorização de uso em venda. É o caminho com mais chance de cobrir todos os 86 modelos de uma vez.
- **Montadoras:** cada uma tem sala de imprensa/mídia com vídeos para download, normalmente para imprensa. Confirme o uso comercial antes de enviar a clientes.
  - Fiat, Jeep, RAM, Citroën, Peugeot: https://www.media.stellantis.com/br-pt (baixe manualmente no navegador; bloqueia acesso automático).
  - Chevrolet: portal de mídia da GM Brasil (`media.gm.com`, seção Chevrolet; confirme o endereço atual).
  - Demais marcas: procure "Imprensa" ou "Sala de imprensa" no rodapé do site oficial da marca.

## Caminho 2 — Pedir autorização a quem já filmou
Os perfis aparecem na marca d'água de cada vídeo (ex.: `@pinguimveiculos`, `@carstop_pb`, `@fiatbr`). Envie por mensagem direta:

> Olá! Aqui é o Pedro, da **Dryve** (carro por assinatura, em parceria com Movida e Localiza). Gostamos muito do seu vídeo do **[modelo]**. Você autoriza a Dryve a usar o arquivo original (sem a marca d'água do TikTok) em atendimento e venda, enviando ao cliente por WhatsApp? Podemos dar o crédito ao seu perfil. Se sim, pode me mandar o MP4 aqui mesmo. Obrigado!

Guarde a resposta (print) de cada autorização. Para vídeos que o criador **já autoriza** (perfis que liberam o uso), abra Editar no Hub e acrescente a tag `liberado-criador`: o aviso vermelho de marca d'água some e não volta.

## Caminho 3 — Filmar (garante todos os modelos, na identidade Dryve)
Roteiro de 15 a 25 s por carro, vertical (9:16), celular na vertical, gravação em 1080p:
1. Frente e lateral andando em volta do carro (5 s)
2. **Interior**: painel e multimídia ligados (5 s)
3. Bancos da frente e de trás (4 s)
4. Porta-malas aberto (3 s)
5. Traseira e fechamento com o carro limpo (3 s)

Dica: sem pessoas ao fundo, sem placa de outras lojas, luz natural.

## Como subir no Hub
1. Nomeie o arquivo assim: `MARCA MODELO VERSÃO COR.mp4` (ex.: `Fiat Pulse Drive 1.3 AUT BRANCO.mp4`).
2. Administração → Mídias → Adicionar (vários arquivos de uma vez).
3. Botão **Vincular pelo nome**: o Hub liga cada vídeo ao carro certo (versão exata quando dá; senão vale para todas as versões do modelo).
4. Para guardar no Supabase e todos os analistas baixarem: `supabase\ENVIAR-VIDEOS.ps1 -Pasta "C:\pasta\dos\videos"`.
