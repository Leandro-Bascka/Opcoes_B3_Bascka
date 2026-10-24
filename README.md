# Opcoes_B3 — scanner de PUTs e CALLs LEAPS

Este pacote mantém a estrutura do site GitHub Pages e acrescenta um Cloudflare Worker para iniciar a varredura pelo botão **Varrer a B3**, acompanhar o workflow do GitHub Actions e atualizar o site automaticamente quando a publicação terminar.

## O que mudou

- O botão **Varrer a B3** aciona uma execução real do workflow `atualizar.yml`.
- A página mostra o estado da execução e as etapas do GitHub Actions.
- Quando a coleta e a publicação terminam com sucesso, a página recarrega os dados publicados e inicia a classificação local.
- O GitHub token fica somente como Secret no Cloudflare Worker; nunca deve ser inserido no JavaScript nem no GitHub Pages.
- O Turnstile valida a pessoa que está iniciando a varredura, evitando que o endpoint fique aberto a acionamentos automatizados triviais.
- O workflow produz um resumo de tempo, ativos atualizados, dados antigos reutilizados e falhas por ticker.
- A coleta tem timeout controlado e logs sem buffer para facilitar o diagnóstico.

## Arquivos

- Arquivos na raiz: site, scanner e coletor Python.
- `.github/workflows/atualizar.yml`: workflow do GitHub Actions. Mantenha este caminho no repositório.
- `cloudflare/worker.js`: código do intermediário Cloudflare.
- `atualizar.yml`: cópia para facilitar a leitura/cópia pelo navegador; o arquivo executado pelo GitHub é o de `.github/workflows/`.

## 1. Enviar os arquivos para o GitHub

1. Extraia o ZIP no computador.
2. Envie os arquivos da raiz para a raiz do repositório `Opcoes_B3`, mantendo os nomes.
3. Crie/mantenha o arquivo `.github/workflows/atualizar.yml` com o conteúdo incluído no ZIP. Se usar o Git local, a pasta oculta `.github` será enviada normalmente. No navegador, crie o arquivo pelo caminho **Add file → Create new file** e informe `.github/workflows/atualizar.yml`.
4. Em **Settings → Pages**, selecione **GitHub Actions** como fonte.
5. Em **Actions**, confirme que `Atualizar opções e publicar` aparece. Faça uma execução manual inicial para validar a coleta e a publicação.

O workflow ainda mantém a atualização agendada em dias úteis e também roda após commits na branch `main`. A execução solicitada pelo botão usa `workflow_dispatch`.

## 2. Criar o Cloudflare Turnstile (proteção contra acionamentos indevidos)

1. Entre no painel Cloudflare e abra **Turnstile**.
2. Crie um widget para o domínio do GitHub Pages. Para um site `https://SEU_USUARIO.github.io/Opcoes_B3/`, o hostname é `SEU_USUARIO.github.io`.
3. Copie a **Site Key**; ela será usada no JavaScript público. A **Secret Key** fica somente no Worker.

## 3. Criar o Cloudflare Worker

1. No painel Cloudflare, abra **Workers & Pages** e crie um Worker.
2. Cole o conteúdo de `cloudflare/worker.js` no editor e publique.
3. Em **Settings → Variables and Secrets**, adicione estas variáveis:

| Nome | Tipo | Valor |
|---|---|---|
| `GH_OWNER` | Variable | Seu usuário ou organização do GitHub |
| `GH_REPO` | Variable | `Opcoes_B3` (ou o nome exato do repositório) |
| `GH_WORKFLOW_FILE` | Variable | `atualizar.yml` |
| `GH_REF` | Variable | `main` |
| `SITE_ORIGIN` | Variable | `https://SEU_USUARIO.github.io` (sem `/Opcoes_B3/` no final) |
| `GH_TOKEN` | Secret | Token do GitHub, explicado abaixo |
| `TURNSTILE_SECRET` | Secret | Secret Key do Turnstile |

4. Publique novamente o Worker após adicionar as variáveis/secrets.
5. Anote a URL pública do Worker, por exemplo `https://opcoes-b3-scan.SEU_SUBDOMINIO.workers.dev`.

### Token do GitHub

Crie um **fine-grained personal access token** com acesso somente ao repositório `Opcoes_B3`. Conceda a permissão **Actions: Read and write**. Se sua organização exigir aprovação para tokens, aguarde a aprovação. Coloque o token somente no campo Secret `GH_TOKEN` do Worker. Nunca o coloque no `opcoes.js`, HTML, README público ou repositório.

## 4. Conectar o site ao Worker

Abra `opcoes.js` e, no início do arquivo, substitua estas duas constantes:

```js
const WORKER_API_URL = "https://COLE-SEU-WORKER.workers.dev";
const TURNSTILE_SITE_KEY = "COLE-SUA-SITE-KEY-DO-TURNSTILE";
```

Use a URL real do Worker e a Site Key do Turnstile. A Site Key é pública por definição; a Secret Key não é. Faça commit das alterações na branch `main`. O workflow publicará o site com a configuração.

## 5. Como testar

1. Abra o site do GitHub Pages e entre na aba/tela de opções.
2. Clique em **Varrer a B3**.
3. Conclua o desafio Turnstile.
4. A página mostrará o status e as etapas do GitHub Actions.
5. Quando o workflow concluir com sucesso, a página recarregará os dados publicados e calculará o ranking local.
6. Se falhar, abra o link da execução mostrado na tela e veja a etapa que falhou.

O endpoint do Worker oferece `GET /health`, `POST /scan` e `GET /status?run_id=...`. O endpoint `/scan` exige um token Turnstile válido e valida a origem do site.

## Diagnóstico de ativos

O resumo da execução informa duração, ativos atualizados, dados anteriores reutilizados e falhas. O `meta.json` também mantém `falhas` e `falhas_motivo`, quando o script consegue concluir e gravar o relatório.

**Importante sobre o tempo:** o workflow atual combina os ativos de `opcoes_ativos.txt` com até 80 ativos adicionais obtidos de `Smc_B3` (`--wheel-top 80`). Portanto, ele pode consultar muito mais do que os tickers listados no arquivo de texto. Os ativos adicionais são limitados a vencimentos de até 45 dias (`--wheel-dte 45`); as LEAPS dependem dos ativos cuja coleta inclui vencimentos longos. Isso é relevante para o objetivo de comparar PUTs e CALLs LEAPS e deve ser ajustado após verificarmos o primeiro log completo.

O aumento de paralelismo foi mantido moderado (`--workers 5`, intervalo inicial de 0,25 s) porque aumentar demais as requisições pode provocar HTTP 429 na fonte. O timeout da etapa de coleta é de 18 minutos; o job tem limite de 25 minutos. Não há como garantir um tempo exato sem observar as respostas reais do `opcoes.net.br`.

## Segurança e limitações

- O GitHub token fica em Secret no Worker; nunca é enviado ao navegador.
- Restrição de origem/CORS não substitui autenticação; o Turnstile é validado no servidor.
- Não compartilhe o token do GitHub ou a Secret Key do Turnstile.
- A fonte de opções pode limitar requisições ou não devolver dados para determinados tickers. O relatório separa falhas por ativo, mas não pode garantir que a fonte sempre forneça todas as opções.
- O ranking é informativo e não garante que uma PUT expire sem exercício nem que uma LEAPS esteja barata.
