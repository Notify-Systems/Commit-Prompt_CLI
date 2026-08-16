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

export {
  isGitMissing,
  isGitRepository,
  getStagedDiff,
  GitError,
  DEFAULT_EXCLUDED_PATHSPECS,
};
