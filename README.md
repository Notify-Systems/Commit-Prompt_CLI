# commit-prompt-cli

CLI simples que gera um prompt pronto com o conteúdo do `git diff --staged` e o copia para a área de transferência.
Você cola o prompt em qualquer IA de sua preferência e usa a resposta como
mensagem de commit. A ferramenta não faz nenhuma chamada de rede nem usa
API de IA — tudo roda localmente.

## Instalação

```bash
npm install
```

## Uso

Dentro de um repositório Git, com alguma alteração já staged (`git add`):

```bash
npm start
```

Saída esperada:

```
✔ Diff encontrado.
✔ Prompt copiado para a área de transferência.

Cole o conteúdo em qualquer IA e solicite a geração da mensagem de commit.
```

Basta colar (Ctrl+V / Cmd+V) o conteúdo no ChatGPT, Gemini, Claude etc.

## Uso como comando global (opcional)

O `package.json` já expõe o campo `bin`. Para instalar globalmente a partir
do próprio diretório do projeto:

```bash
npm link
```

Isso disponibiliza o comando `commit-prompt` em qualquer diretório.

## Estrutura do projeto

```
src/
├── index.js      # Orquestra o fluxo principal (ponto de entrada)
├── git.js        # Integração com o Git (execSync)
├── clipboard.js  # Cópia de texto para a área de transferência
├── prompt.js      # Montagem do texto do prompt enviado à IA
├── messages.js    # Mensagens exibidas ao usuário no terminal
└── utils.js       # Utilitários genéricos (cores, saída com erro)
```

## Erros tratados

- Diretório atual não é um repositório Git.
- Git não instalado / não encontrado no PATH.
- Nenhuma alteração staged.
- Falha ao copiar para a área de transferência (ex.: ambiente sem
  utilitário de clipboard disponível, como containers headless no Linux).
- Falha ao executar comandos Git.
