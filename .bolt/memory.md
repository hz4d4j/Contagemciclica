# Project memory

## Product intent & audience

- Sistema interno com múltiplas abas/telas, voltado à Nexteer Automotive.
- Funcionalidade em andamento: adição e integração de suporte a arquivos Excel.
- Público: usuários internos da Nexteer (ferramenta corporativa).

## Brand personality & voice

- Marca: Nexteer Automotive.
- Identidade visual orientada pelas cores institucionais: vermelho, branco e cinza.
- Comunicação direta e funcional, em português.

## Visual design & UX direction

- Cabeçalho de todas as abas usa vermelho Nexteer com leve degradê.
- Textos e links do cabeçalho em branco.
- Faixa cinza na borda inferior do cabeçalho.
- Item de menu ativo recebe linha branca embaixo.
- Botão de alternância de tema: borda branca, cores invertidas no hover.
- Deve funcionar corretamente em temas claro e escuro (leitura e contraste preservados).
- Framework: DEFAULT_TO_DEV.

## Decisions, constraints & rationale

- Aplicar identidade Nexteer (vermelho/branco/cinza) de forma global no cabeçalho.
- Manter leitura e contraste em ambos os temas claro e escuro.
- Projeto compila sem erros após as alterações de cor.

## Open questions & assumptions

- Não houve teste no navegador; apenas validação por compilação.
- Códigos hex exatos das cores Nexteer ainda não definidos/documentados.
- Comportamento do cabeçalho em resoluções menores (responsividade) não validado.