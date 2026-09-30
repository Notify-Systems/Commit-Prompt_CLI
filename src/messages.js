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

function showUsage() {
  console.log("Uso: commit-prompt [opções]");
  console.log("");
  console.log(
    "Sem opções, gera o prompt de mensagem de commit a partir do diff staged.",
  );
  console.log("");
  console.log("Opções:");
  console.log(
    "  -c, --comment  Gera o prompt para comentar as partes alteradas dos arquivos staged",
  );
  console.log("  -h, --help     Exibe esta ajuda");
}

function showInvalidOptionError(originalError) {
  console.error(COLORS.red("✖ Opção inválida."));
  console.error(`  Detalhes: ${originalError.message}`);
  console.error('  Use "commit-prompt --help" para ver as opções disponíveis.');
}

function showSkippedFiles(skipped) {
  console.log(COLORS.yellow(`⚠ ${skipped.length} arquivo(s) ignorado(s):`));
  for (const { path, reason } of skipped) {
    console.log(`  - ${path} (${reason})`);
  }
}

function showNoCommentableFilesMessage() {
  console.log(
    COLORS.yellow("⚠ Nenhum arquivo staged elegível para receber comentários."),
  );
  console.log(
    "  Faça git add de arquivos de código-fonte com alterações de conteúdo.",
  );
}

function showCommentFilesFound(count) {
  console.log(
    COLORS.green(`✔ ${count} arquivo(s) elegível(is) para comentários.`),
  );
}

function showCommentBatchesNotice(fileCount, batchCount) {
  console.log(
    COLORS.yellow(
      `⚠ O conteúdo de ${fileCount} arquivo(s) é grande demais para um único prompt.`,
    ),
  );
  console.log(
    `  Ele foi dividido em ${batchCount} prompts, para colar um de cada vez na IA.`,
  );
}

function showCommentPromptCopiedMessage(index, total, label) {
  const position = total > 1 ? ` ${index}/${total}` : "";
  console.log(
    COLORS.green(`✔ Prompt${position} copiado para a área de transferência.`),
  );
  console.log(`  Arquivos: ${label}`);
}

// Texto exibido pelo readline enquanto espera o usuário, por isso é uma
// constante (retornada como string) e não uma função que imprime.
const WAIT_FOR_NEXT_PROMPT_TEXT =
  "Cole na IA e pressione Enter para copiar o próximo prompt... ";

function showCommentCancelledMessage() {
  console.log("");
  console.log(
    COLORS.yellow(
      "⚠ Operação cancelada. Os prompts restantes não foram copiados.",
    ),
  );
}

function showCommentReviewHint() {
  console.log("");
  console.log(
    "Cole o conteúdo em uma IA, aplique os arquivos devolvidos e confira com",
  );
  console.log(
    '"git diff" se apenas comentários foram alterados antes de fazer o commit.',
  );
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
  showUsage,
  showInvalidOptionError,
  showSkippedFiles,
  showNoCommentableFilesMessage,
  showCommentFilesFound,
  showCommentBatchesNotice,
  showCommentPromptCopiedMessage,
  WAIT_FOR_NEXT_PROMPT_TEXT,
  showCommentCancelledMessage,
  showCommentReviewHint,
};
