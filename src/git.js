import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Versão assíncrona (baseada em Promises) do execFile. Usada em vez de exec
// para não bloquear o Event Loop enquanto o Git processa diffs grandes E para
// não passar pelo shell: os argumentos vão como array, então não há como um
// valor futuro (ex.: nome de branch, caminho de arquivo) virar injeção de
// comando via metacaracteres do shell.
const execFileAsync = promisify(execFile);

const MAX_DIFF_BUFFER = 1024 * 1024 * 20;

// Arquivos que costumam gerar diffs enormes e pouco úteis para uma IA
// interpretar (são conteúdo gerado automaticamente, não lógica de negócio).
// Ficam de fora do diff por padrão.
const DEFAULT_EXCLUDED_PATHSPECS = [
  ":!package-lock.json",
  ":!npm-shrinkwrap.json",
  ":!yarn.lock",
  ":!pnpm-lock.yaml",
];

/**
 * Erro customizado usado para diferenciar falhas relacionadas ao Git
 * de outras falhas inesperadas da aplicação.
 */
class GitError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "GitError";
    this.cause = cause;
  }
}

/**
 * Verifica se o Git está instalado e acessível no PATH do sistema.
 */
async function isGitMissing() {
  try {
    await execFileAsync("git", ["--version"]);
    return false;
  } catch {
    return true;
  }
}

/**
 * Verifica se o diretório atual está dentro de um repositório Git.
 */
async function isGitRepository() {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Executa `git diff --staged` (ignorando lockfiles por padrão, ver
 * DEFAULT_EXCLUDED_PATHSPECS) e retorna o resultado como string.
 * Lança GitError em caso de falha na execução do comando, com uma mensagem
 * específica quando a causa for o diff ultrapassar o maxBuffer.
 */
async function getStagedDiff() {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--staged", "--", ".", ...DEFAULT_EXCLUDED_PATHSPECS],
      {
        encoding: "utf-8",
        maxBuffer: MAX_DIFF_BUFFER,
      },
    );
    return stdout;
  } catch (error) {
    if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
      throw new GitError(
        `O diff staged ultrapassou o limite de ${MAX_DIFF_BUFFER / (1024 * 1024)}MB e não pôde ser lido. Tente fazer commit em partes menores.`,
        error,
      );
    }
    throw new GitError('Falha ao executar "git diff --staged".', error);
  }
}

/**
 * Executa um comando Git e retorna o stdout como string.
 * Centraliza o tratamento de erro das funções abaixo: qualquer falha vira um
 * GitError com a causa original preservada (o stderr real do Git).
 */
async function runGit(args, failureMessage) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      encoding: "utf-8",
      maxBuffer: MAX_DIFF_BUFFER,
    });
    return stdout;
  } catch (error) {
    throw new GitError(failureMessage, error);
  }
}

/**
 * Lista os arquivos staged que foram adicionados, copiados, modificados ou
 * renomeados (ACMR), ignorando os deletados, que não têm código para comentar.
 * O --relative devolve caminhos relativos ao diretório atual, coerentes com o
 * getStagedDiff (que também se limita ao diretório atual). O -z separa os
 * nomes por NUL, evitando que nomes com espaços ou acentos venham entre aspas.
 */
async function getStagedFiles() {
  const stdout = await runGit(
    [
      "diff",
      "--staged",
      "--relative",
      "--name-only",
      "--diff-filter=ACMR",
      "-z",
      "--",
      ".",
    ],
    "Falha ao listar os arquivos staged.",
  );
  return stdout.split("\0").filter(Boolean);
}

/**
 * Lê o conteúdo do arquivo na área de staging (e não no disco), para que ele
 * corresponda exatamente ao diff staged, mesmo que haja edições não staged.
 * O prefixo "./" faz o caminho ser relativo ao diretório atual.
 */
async function getStagedFileContent(filePath) {
  return runGit(
    ["show", `:./${filePath}`],
    `Falha ao ler "${filePath}" da área de staging.`,
  );
}

/**
 * Obtém o diff staged de um único arquivo. O ":(literal)" impede que
 * caracteres como * ou ? no nome sejam tratados como curingas pelo Git.
 */
async function getStagedFileDiff(filePath) {
  return runGit(
    [
      "diff",
      "--staged",
      "--relative",
      "--unified=3",
      "--",
      `:(literal)${filePath}`,
    ],
    `Falha ao obter o diff de "${filePath}".`,
  );
}

export {
  isGitMissing,
  isGitRepository,
  getStagedDiff,
  getStagedFiles,
  getStagedFileContent,
  getStagedFileDiff,
  GitError,
  DEFAULT_EXCLUDED_PATHSPECS,
};
