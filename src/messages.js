import { COLORS } from "./utils.js";

// Todas as mensagens exibidas ao usuário ficam centralizadas aqui.
// Isso facilita manutenção, revisão de tom/copy e uma futura tradução.

function showNoGitRepositoryError() {
  console.error(COLORS.red("✖ Este diretório não é um repositório Git."));
  console.error("  Execute este comando dentro de um repositório Git válido.");
}

function showGitNotInstalledError() {
  console.error(COLORS.red("✖ Git não foi encontrado neste ambiente."));
  console.error("  Instale o Git e verifique se ele está disponível no PATH.");
}

function showNoStagedChangesMessage() {
  console.log(COLORS.yellow("⚠ Nenhuma alteração staged foi encontrada."));
  console.log(
    '  Utilize "git add <arquivos>" antes de rodar esta ferramenta novamente.',
  );
}

function showDiffFoundMessage() {
  console.log(COLORS.green("✔ Diff encontrado."));
}

function showLargeDiffWarning(charCount) {
  console.log(
    COLORS.yellow(
      `⚠ O diff é grande (${charCount.toLocaleString("pt-BR")} caracteres) e pode ultrapassar o limite de contexto de algumas IAs.`,
    ),
  );
  console.log(
    "  Considere colar em uma IA com janela de contexto maior ou revisar o commit em partes.",
  );
}

function showPromptCopiedMessage() {
  console.log(COLORS.green("✔ Prompt copiado para a área de transferência."));
  console.log("");
  console.log(
    "Cole o conteúdo em qualquer IA e solicite a geração da mensagem de commit.",
  );
}

function showClipboardError(originalError) {
  console.error(
    COLORS.red(
      "✖ Não foi possível copiar o prompt para a área de transferência.",
    ),
  );
  console.error(`  Detalhes: ${originalError.message}`);
}

function showGitCommandError(originalError) {
  console.error(COLORS.red("✖ Falha ao executar um comando Git."));
  // originalError é o GitError (wrapper); a mensagem útil de verdade — o
  // stderr real do Git — fica em originalError.cause, gerado pelo
  // child_process. Sem isso, o usuário só vê o texto genérico do wrapper
  // duas vezes e não descobre o motivo real da falha.
  const cause = originalError.cause;
  const detail =
    cause?.stderr?.trim() || cause?.message || originalError.message;
  console.error(`  Detalhes: ${detail}`);
}

function showUnexpectedError(originalError) {
  console.error(COLORS.red("✖ Ocorreu um erro inesperado."));
  console.error(`  Detalhes: ${originalError.message}`);
}

export {
  showNoGitRepositoryError,
  showGitNotInstalledError,
  showNoStagedChangesMessage,
  showDiffFoundMessage,
  showLargeDiffWarning,
  showPromptCopiedMessage,
  showClipboardError,
  showGitCommandError,
  showUnexpectedError,
};
