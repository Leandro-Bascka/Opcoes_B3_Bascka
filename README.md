# Opcoes_B3 — Scanner de opções da B3 (Wheel e Calls longas)

Projeto **independente** do scanner SMC (que agora é o projeto **Smc_B3**). Site que roda no PC e no celular, hospedado no
GitHub Pages e atualizado de hora em hora no pregão.

## O que faz
Portado do seu *Scanner Wheel V.2*, sem mudar a lógica (Black-Scholes, IV, delta, PoP, scores, filtros):
- **Wheel · vender PUT/CALL**: por ativo, lista PUTs e CALLs OTM com IV, IV/HV, delta, ROI, xCDI, prob. de exercício, PoP e score; presets SAFE / WHEEL / AGRESSIVO / RENDA; clique numa linha para o gráfico com cones de IV/HV, strike e breakeven; funil de filtros quando nada passa.
- **Calls longas**: calls de 60–730 dias com desconto vs Black-Scholes pela HV (💎 🚀).
- Campos editáveis **ficam salvos** no aparelho; **Selic automática** (BCB SGS 432 → última coleta → 14%).

## De onde vêm os dados (100% independente do Smc_B3)
- **Lista de ativos e liquidez**: `opcoes_ativos.txt` traz os *candidatos* (papéis que têm opções). A cada coleta o sistema mede o volume negociado em **opções** de cada um, no próprio opcoes.net.br, e mantém só os `--top` mais líquidos (30 no workflow). O ranking vai para `meta.json` (`liquidos`) e o combobox aparece na ordem de liquidez. Papel sem opções é ignorado sozinho; para incluir um novo, acrescente uma linha.
- **Opções**: opcoes.net.br, mesmos campos do seu `listar_opcoes`. Só entram opções com negócios e volume. A triagem usa vencimentos até 60 dias (`--wheel-dte`); as calls longas (LEAPS) são baixadas depois, só dos escolhidos.
- **Preço, candles e HV**: `--hv-yahoo` baixa o histórico diário só dos escolhidos (1 requisição por ativo; para sozinho se o Yahoo limitar). Sem isso o preço é estimado pelas opções (paridade put-call) e ficam sem HV/candles; a coluna IV/HV e as calls longas dependem da HV. Para desligar o Yahoo, apague `--hv-yahoo` do workflow.
- **Selic**: BCB.

## Publicar no GitHub (pelo navegador, sem pastas)
1. Crie o repositório **Opcoes_B3** (público). Em **Add file → Upload files** envie os arquivos soltos deste zip (menos `atualizar.yml`) e clique em **Commit changes**.
2. **Add file → Create new file**, nome `.github/workflows/atualizar.yml`; cole o conteúdo do `atualizar.yml` do zip e faça **Commit changes**.
3. **Settings → Pages → Source: GitHub Actions**.
4. Aba **Actions → Atualizar opções e publicar → Run workflow**. O site fica em `https://SEU_USUARIO.github.io/Opcoes_B3/`.
O log mostra o diagnóstico da API no início e o tempo de cada fase da coleta.

## Limitações
Sem interesse aberto (OI) na fonte: os sinais 🐋 🟣 🧲 ficam inativos. Preços de opções ilíquidas podem estar velhos. Ferramenta educacional, não é recomendação de investimento.


## Coleta por lotes (v2)
- `python build_options.py --gerar-universo` gera/mostra `universo_80.json`: as 80 ações mais líquidas (Fundamentus, Liq.2meses) e o lote de cada uma.
- `python build_options.py --out site --lote 0 --lote-tam 10 --max-min 4 --put-dte 60 --leaps-min 90 --hv-yahoo` roda os 8 lotes em sequência, cada um em processo próprio e com tempo limite; um lote que falhar não derruba os outros e os dados dos lotes anteriores são preservados. `--lote 3` roda só o lote 3.
- Cada lote atualiza `meta.json` e `longas.json` ao terminar (o site já pode ser publicado a qualquer momento).


## Ajustes do motor Venda de PUT
- Padrões iniciais: DTE 7–60 (para operação, priorize analisar 15–30), mínimo de 1 negócio, range de strike de 15%, prêmio máximo de 5% e Delta PUT de 0,15–0,30.
- Migração automática dos antigos padrões salvos no navegador, preservando parâmetros que o usuário personalizou.
- Varredura informa quantos ativos carregaram dados e quantos arquivos falharam.
- Funil registra a quantidade de contratos descartados por cada filtro.
- IV não é inferida quando o prêmio está abaixo do intrínseco imediato. Black-Scholes continua sendo aproximação para opções americanas e não incorpora dividendos.
- Mais candidatos não significam execução garantida: conferir spread, book e liquidez antes de operar.

- Ao abrir/selecionar **Venda de PUT · Wheel**, a tela já carrega o ativo selecionado (PETR4 por padrão). A varredura de toda a B3 continua disponível no botão **Varrer a B3**.
