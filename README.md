# Opcoes_B3 — Scanner de opções da B3 (Wheel e Calls longas)

Projeto **independente** do scanner SMC (que agora é o projeto **Smc_B3**). Site que roda no PC e no celular, hospedado no
GitHub Pages e atualizado de hora em hora no pregão.

## O que faz
Portado do seu *Scanner Wheel V.2*, sem mudar a lógica (Black-Scholes, IV, delta, PoP, scores, filtros):
- **Wheel · vender PUT/CALL**: por ativo, lista PUTs e CALLs OTM com IV, IV/HV, delta, ROI, xCDI, prob. de exercício, PoP e score; presets SAFE / WHEEL / AGRESSIVO / RENDA; clique numa linha para o gráfico com cones de IV/HV, strike e breakeven; funil de filtros quando nada passa.
- **Calls longas**: calls de 60–730 dias com desconto vs Black-Scholes pela HV (💎 🚀).
- Campos editáveis **ficam salvos** no aparelho; **Selic automática** (BCB SGS 432 → última coleta → 14%).

## De onde vêm os dados (nenhuma dependência do SMC)
- **Opções**: opcoes.net.br, mesmos campos do seu `listar_opcoes` (`i[0]` ticker, `i[2]` tipo, `i[5]` strike, `i[7]` último, `i[8]` negócios, `i[9]` volume, `i[10]` data). Só entram opções com negócios e volume. Requisições em paralelo (12).
- **Preço do ativo**: estimado pelas próprias opções (paridade put-call). Nenhum outro site é usado.
- **HV**: **desligada por padrão** (não há fonte de histórico além do Yahoo). Sem HV, a coluna IV/HV e as *calls longas* (desconto vs HV) ficam indisponíveis. Para ligar: `python build_options.py --out site --hv-yahoo` (opcional; para sozinho se o Yahoo limitar). No GitHub, acrescente `--hv-yahoo` ao comando do workflow.
- **Selic**: BCB.

## Publicar no GitHub (pelo navegador, sem pastas)
1. Crie o repositório **Opcoes_B3** (público). Em **Add file → Upload files** envie os arquivos soltos deste zip (menos `atualizar.yml`) e clique em **Commit changes**.
2. **Add file → Create new file**, nome `.github/workflows/atualizar.yml`; cole o conteúdo do `atualizar.yml` do zip e faça **Commit changes**.
3. **Settings → Pages → Source: GitHub Actions**.
4. Aba **Actions → Atualizar opções e publicar → Run workflow**. O site fica em `https://SEU_USUARIO.github.io/Opcoes_B3/`.
O log mostra o diagnóstico da API no início e o tempo de cada fase da coleta.

## Limitações
Sem interesse aberto (OI) na fonte: os sinais 🐋 🟣 🧲 ficam inativos. Preços de opções ilíquidas podem estar velhos. Ferramenta educacional, não é recomendação de investimento.
