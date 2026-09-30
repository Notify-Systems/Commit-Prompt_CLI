# commit-prompt-cli

> CLI que lê o `git diff --staged`, monta um prompt pronto com as regras de Conventional Commits já embutidas e copia esse prompt para a área de transferência — para você colar em qualquer IA e obter a mensagem de commit. Com a opção `--comment`, gera também um prompt para a IA comentar as partes alteradas dos arquivos staged.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.3-brightgreen.svg)
![Version](https://img.shields.io/badge/version-1.0.0-informational.svg)

[Repositório](https://github.com/Notify-Systems/Commit-Prompt_CLI) · [Issues](https://github.com/Notify-Systems/Commit-Prompt_CLI/issues)

## Sobre o projeto

Escrever mensagens de commit consistentes com o padrão [Conventional Commits](https://www.conventionalcommits.org/) é repetitivo: a cada commit é preciso copiar o diff, lembrar as regras de tipo/escopo/descrição e formatar tudo manualmente antes de colar numa IA.

O `commit-prompt-cli` automatiza essa parte mecânica. Ele:

1. Lê o `git diff --staged` do repositório atual;
2. Monta um prompt completo, já com as regras de Conventional Commits e o diff inseridos no lugar certo;
3. Copia o prompt para a área de transferência do sistema operacional.

Você cola o conteúdo em qualquer IA (ChatGPT, Gemini, Claude etc.) e usa a resposta como mensagem de commit. A ferramenta em si **não faz nenhuma chamada de rede nem usa API de IA** — a montagem do prompt e a cópia para o clipboard rodam inteiramente localmente.

Além do prompt de commit, a opção `--comment` gera um segundo tipo de prompt: em vez do diff completo, ele envia o conteúdo de cada arquivo staged junto com o diff e pede à IA que comente **apenas as partes alteradas**, devolvendo o restante do arquivo idêntico. O fluxo é o mesmo: a ferramenta monta o prompt e copia para a área de transferência, e você cola na IA.

## Funcionalidades principais

- Extrai automaticamente o `git diff --staged` do diretório atual.
- Exclui do diff, por padrão, lockfiles pouco úteis para a IA interpretar: `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock` e `pnpm-lock.yaml`.
- Monta o prompt final combinando um cabeçalho fixo (regras de tipo, escopo, descrição, body e footer do Conventional Commits) com o diff obtido.
- Copia o prompt automaticamente para a área de transferência via [clipboardy](https://github.com/sindresorhus/clipboardy).
- Faz *fallback* quando a cópia falha (por exemplo, em ambientes headless como containers/CI sem utilitário de clipboard): imprime o prompt no terminal para cópia manual.
- Avisa quando o diff staged é grande (acima de ~24.000 caracteres), já que isso pode ultrapassar o limite de contexto de algumas IAs.
- Valida pré-condições com mensagens de erro claras: Git ausente no `PATH`, diretório fora de um repositório Git, nenhuma alteração staged.
- Usa `execFile` (em vez de `exec`) para chamar o Git, passando argumentos como array — evita passar pelo shell e reduz risco de injeção de comando.
- Pode ser instalado como comando global (`commit-prompt`) via `npm link`.
- **Modo `--comment` (`-c`):** gera o prompt para a IA comentar as partes alteradas dos arquivos staged, enviando o conteúdo completo (versão staged) e o diff de cada arquivo.
- Seleciona automaticamente os arquivos elegíveis para comentário: apenas adicionados, copiados, modificados ou renomeados, de tipos de código com suporte a comentários. Ignora (e lista com o motivo) arquivos deletados, binários, de tipos sem suporte, com mais de 40.000 caracteres ou sem alteração de conteúdo.
- Divide o prompt de comentários em lotes quando o conteúdo passa de ~24.000 caracteres, já que a IA devolve os arquivos completos. Os lotes são copiados um de cada vez, com Enter entre eles; sem terminal interativo, todos são impressos.
- O prompt de comentários já embute boas práticas (explicar o porquê, não inventar intenção, JSDoc em código exportado, sem alterar lógica) e separa o conteúdo dos arquivos das instruções com marcadores, para reduzir o risco de *prompt injection* vindo do código.
- Opção `--help` (`-h`) com o resumo de uso.

> **Nota:** o cabeçalho do prompt instrui a IA a escrever a descrição do commit em português. Se você precisa de mensagens em outro idioma, será necessário editar `src/prompt.js`. O mesmo vale para os comentários gerados pelo modo `--comment`, cujas regras ficam em `src/commentPrompt.js`.

## Tecnologias

- [Node.js](https://nodejs.org/) `>=18.3`, com Módulos ES (`"type": "module"`)
- [clipboardy](https://www.npmjs.com/package/clipboardy) `^4.0.0` — única dependência de produção, usada para copiar o prompt para a área de transferência
- Módulo nativo `node:child_process` (`execFile`) para integração com o Git — sem wrapper externo
- Módulos nativos `node:util` (`parseArgs`, para as opções da linha de comando) e `node:readline` (espera do Enter entre lotes no modo `--comment`)

Não há framework web, banco de dados ou infraestrutura de containers no projeto.

## Arquitetura

```text
src/
├── index.js          # Ponto de entrada: lê as opções e orquestra os fluxos (commit e --comment)
├── git.js            # Integração com o Git (validações, diff staged, arquivos staged, GitError)
├── prompt.js         # Monta o prompt de commit (regras de Conventional Commits + diff)
├── commentFiles.js   # Seleciona os arquivos staged elegíveis para comentário (conteúdo + diff)
├── commentPrompt.js  # Monta o prompt de comentários e divide os arquivos em lotes
├── clipboard.js      # Wrapper sobre clipboardy para copiar o prompt
├── messages.js       # Mensagens exibidas no terminal (sucesso, avisos, erros)
└── utils.js          # Utilitário de cores ANSI para saída no terminal
```

Fluxo de execução (`index.js`): valida se o Git está instalado → valida se o diretório é um repositório Git → obtém o diff staged → monta o prompt → copia para a área de transferência → informa o usuário. Falhas em cada etapa são tratadas com mensagens específicas e `process.exitCode = 1`.

Com `--comment`, o fluxo após as validações é: listar os arquivos staged → filtrar os elegíveis e ler o conteúdo staged e o diff de cada um → dividir em lotes se forem grandes → montar o prompt de comentários → copiar para a área de transferência → informar o usuário.

## Pré-requisitos

- Node.js `>=18.3`
- npm
- Git instalado e disponível no `PATH` (verificado pela própria ferramenta em tempo de execução)

## Instalação

```bash
git clone https://github.com/Notify-Systems/Commit-Prompt_CLI.git
cd Commit-Prompt_CLI
npm install
```

### Uso como comando global (opcional)

O `package.json` já expõe o campo `bin`. Para disponibilizar o comando `commit-prompt` em qualquer diretório:

```bash
npm link
```

## Uso

Dentro de um repositório Git, com alguma alteração já staged (`git add`):

```bash
npm start
```

Ou, se instalado globalmente via `npm link`:

```bash
commit-prompt
```

Saída esperada:

```text
✔ Diff encontrado.
✔ Prompt copiado para a área de transferência.

Cole o conteúdo em qualquer IA e solicite a geração da mensagem de commit.
```

Basta colar (Ctrl+V / Cmd+V) o conteúdo em qualquer IA de sua preferência.

### Prompt de comentários (`--comment`)

Para pedir à IA que comente as partes alteradas dos arquivos staged:

```bash
npm start -- --comment
```

Ou, se instalado globalmente:

```bash
commit-prompt --comment
```

Saída esperada:

```text
✔ 2 arquivo(s) elegível(is) para comentários.
✔ Prompt copiado para a área de transferência.
  Arquivos: src/a.js, src/b.js

Cole o conteúdo em uma IA, aplique os arquivos devolvidos e confira com
"git diff" se apenas comentários foram alterados antes de fazer o commit.
```

Fluxo sugerido:

1. `git add` nos arquivos alterados;
2. `commit-prompt --comment` e colar o prompt na IA;
3. Substituir os arquivos pelo código devolvido pela IA;
4. Rodar `git diff` (sem `--staged`): como a versão staged não muda, ele mostra exatamente o que a IA alterou, e apenas linhas de comentário devem aparecer;
5. Se estiver correto, `git add` novamente e gerar a mensagem de commit com `commit-prompt`.

Se o conteúdo for grande demais para um único prompt, a ferramenta o divide em lotes e copia um de cada vez: cole na IA e pressione Enter para copiar o próximo. `Ctrl+D` cancela a entrega dos lotes restantes.

### Opções

| Opção           | Atalho | Descrição                                                                  |
| --------------- | ------ | -------------------------------------------------------------------------- |
| `--comment`     | `-c`   | Gera o prompt para comentar as partes alteradas dos arquivos staged        |
| `--help`        | `-h`   | Exibe o resumo de uso                                                      |

Sem opções, a ferramenta gera o prompt de mensagem de commit.

## Scripts disponíveis

| Script  | Comando         | Descrição                          |
| ------- | --------------- | ----------------------------------- |
| `start` | `npm start`     | Executa a CLI (`node src/index.js`) |

## Erros tratados

- Diretório atual não é um repositório Git.
- Git não instalado ou não encontrado no `PATH`.
- Nenhuma alteração staged (`git add` não foi executado antes).
- Diff staged maior que 20 MB (limite de buffer do comando Git).
- Falha ao copiar para a área de transferência — a ferramenta imprime o prompt no terminal como alternativa.
- Falha ao executar comandos Git (o `stderr` original do Git é exibido quando disponível).
- Opção de linha de comando inválida (a ferramenta indica `--help`).
- Modo `--comment`: nenhum arquivo staged elegível para comentário, com a lista dos arquivos ignorados e o motivo de cada um.
- Modo `--comment`: falha ao ler um arquivo da área de staging ou ao obter o diff dele.
- Modo `--comment`: cancelamento com `Ctrl+D` durante a entrega de vários lotes.
- Erros inesperados são capturados no nível do `main()`.

Em todos os casos de falha, a ferramenta encerra com código de saída `1`. `--help` encerra com código `0`.

## Licença

Distribuído sob a licença **MIT**, conforme declarado em `package.json`. O repositório não contém um arquivo `LICENSE` no momento desta análise.

## Autor

**JPTirso** — [jptirso2@gmail.com](mailto:jptirso2@gmail.com)

## Contribuição

O repositório não possui um `CONTRIBUTING.md` no momento. Para relatar bugs ou sugerir melhorias, abra uma [issue](https://github.com/Notify-Systems/Commit-Prompt_CLI/issues) ou um pull request no repositório.