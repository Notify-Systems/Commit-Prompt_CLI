import { exec } from 'node:child_process';
import { promisify } from 'node:util';

// Versão assíncrona (baseada em Promises) do exec. Usada em vez de execSync
// para não bloquear o Event Loop enquanto o Git processa diffs grandes.
const execAsync = promisify(exec);

/**
 * Erro customizado usado para diferenciar falhas relacionadas ao Git
 * de outras falhas inesperadas da aplicação.
 */
class GitError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'GitError';
    this.cause = cause;
  }
}

/**
 * Verifica se o Git está instalado e acessível no PATH do sistema.
 */
async function isGitMissing() {
  try {
    await execAsync('git --version');
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
    await execAsync('git rev-parse --is-inside-work-tree');
    return true;
  } catch {
    return false;
  }
}

/**
 * Executa `git diff --staged` e retorna o resultado como string.
 * Lança GitError em caso de falha na execução do comando.
 */
async function getStagedDiff() {
  try {
    const { stdout } = await execAsync('git diff --staged', {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 20, // 20MB: suficiente para diffs grandes
    });
    return stdout;
  } catch (error) {
    throw new GitError('Falha ao executar "git diff --staged".', error);
  }
}

export { isGitMissing, isGitRepository, getStagedDiff, GitError };
