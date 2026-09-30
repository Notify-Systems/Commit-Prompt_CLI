#!/usr/bin/env node

import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import {
  isGitMissing,
  isGitRepository,
  getStagedDiff,
  GitError,
} from "./git.js";
import { buildCommitPrompt, LARGE_DIFF_CHAR_THRESHOLD } from "./prompt.js";
import { buildCommentPrompt, splitIntoBatches } from "./commentPrompt.js";
import { collectCommentableFiles } from "./commentFiles.js";
import { copyToClipboard } from "./clipboard.js";
import { COLORS } from "./utils.js";
import {
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
} from "./messages.js";

/**
 * Lê as opções da linha de comando. Retorna null (e já exibe o erro) quando
 * a opção é inválida, para que o main() apenas encerre.
 */
function parseCliOptions() {
  try {
    const { values } = parseArgs({
      options: {
        comment: { type: "boolean", short: "c" },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: false,
    });
    return values;
  } catch (error) {
    showInvalidOptionError(error);
    process.exitCode = 1;
    return null;
  }
}

/**
 * Imprime um prompt no terminal para cópia manual. Usado quando não é
 * possível copiar para a área de transferência.
 */
function printPromptForManualCopy(prompt) {
  console.log("");
  console.log(COLORS.yellow("⚠ Copie o prompt abaixo manualmente:"));
  console.log("");
  console.log(prompt);
}

/**
 * Copia um único prompt para a área de transferência. Ambientes headless
 * (SSH, Docker, CI) costumam não ter um utilitário de clipboard disponível;
 * em vez de simplesmente falhar, fazemos fallback: avisamos o problema e
 * imprimimos o prompt para cópia manual.
 */
async function copyPromptOrPrint(prompt, showSuccess) {
  try {
    await copyToClipboard(prompt);
    showSuccess();
  } catch (error) {
    showClipboardError(error);
    printPromptForManualCopy(prompt);
    process.exitCode = 1;
  }
}

/**
 * Entrega vários prompts (lotes do modo --comment) um de cada vez: copia o
 * primeiro e, a cada Enter do usuário, copia o seguinte. Sem terminal
 * interativo não há como esperar o Enter, então todos são impressos.
 *
 * @returns {Promise<boolean>} false se o usuário cancelou (Ctrl+D) antes de
 * receber todos os prompts; true nos demais casos.
 */
async function deliverCommentPrompts(prompts) {
  if (prompts.length === 1) {
    const [{ text, label }] = prompts;
    await copyPromptOrPrint(text, () =>
      showCommentPromptCopiedMessage(1, 1, label),
    );
    return true;
  }

  if (!process.stdin.isTTY) {
    for (const { text, label } of prompts) {
      console.log("");
      console.log(COLORS.cyan(`Arquivos: ${label}`));
      printPromptForManualCopy(text);
    }
    return true;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (const [index, { text, label }] of prompts.entries()) {
      try {
        await copyToClipboard(text);
      } catch (error) {
        showClipboardError(error);
        // Imprime este prompt e todos os que faltavam, para não perder nenhum.
        for (const remaining of prompts.slice(index)) {
          console.log("");
          console.log(COLORS.cyan(`Arquivos: ${remaining.label}`));
          printPromptForManualCopy(remaining.text);
        }
        process.exitCode = 1;
        return true;
      }

      showCommentPromptCopiedMessage(index + 1, prompts.length, label);
      if (index < prompts.length - 1) {
        try {
          await rl.question(WAIT_FOR_NEXT_PROMPT_TEXT);
        } catch (error) {
          // Ctrl+D fecha a entrada e rejeita a pergunta com AbortError; é um
          // cancelamento do usuário, não uma falha inesperada.
          if (error.name === "AbortError") {
            showCommentCancelledMessage();
            process.exitCode = 1;
            return false;
          }
          throw error;
        }
      }
    }
    return true;
  } finally {
    rl.close();
  }
}

/**
 * Fluxo padrão: obter diff staged -> montar prompt de commit -> copiar para
 * a área de transferência -> avisar o usuário.
 */
async function runCommitPromptFlow() {
  let diff;
  try {
    diff = await getStagedDiff();
  } catch (error) {
    if (error instanceof GitError) {
      showGitCommandError(error);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  if (!diff || diff.trim().length === 0) {
    showNoStagedChangesMessage();
    // Não há alterações staged: o objetivo principal da ferramenta não foi
    // cumprido, então sinalizamos falha para não quebrar cadeias "cmd1 && cmd2".
    process.exitCode = 1;
    return;
  }

  showDiffFoundMessage();

  if (diff.length > LARGE_DIFF_CHAR_THRESHOLD) {
    showLargeDiffWarning(diff.length);
  }

  const prompt = buildCommitPrompt(diff);
  await copyPromptOrPrint(prompt, showPromptCopiedMessage);
}

/**
 * Fluxo --comment: coletar arquivos staged elegíveis (conteúdo + diff) ->
 * dividir em lotes se forem grandes -> montar os prompts de comentários ->
 * entregar ao usuário.
 */
async function runCommentPromptFlow() {
  let collected;
  try {
    collected = await collectCommentableFiles();
  } catch (error) {
    if (error instanceof GitError) {
      showGitCommandError(error);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const { stagedCount, files, skipped } = collected;

  if (stagedCount === 0) {
    showNoStagedChangesMessage();
    process.exitCode = 1;
    return;
  }

  if (skipped.length > 0) {
    showSkippedFiles(skipped);
  }

  if (files.length === 0) {
    showNoCommentableFilesMessage();
    process.exitCode = 1;
    return;
  }

  showCommentFilesFound(files.length);

  const batches = splitIntoBatches(files);
  if (batches.length > 1) {
    showCommentBatchesNotice(files.length, batches.length);
  }

  const prompts = batches.map((batch) => ({
    text: buildCommentPrompt(batch),
    label: batch.map((file) => file.path).join(", "),
  }));

  const completed = await deliverCommentPrompts(prompts);
  if (completed) {
    showCommentReviewHint();
  }
}

/**
 * Ponto de entrada da aplicação.
 * Fluxo: ler opções -> validar Git/repositório -> executar o fluxo escolhido
 * (prompt de commit por padrão, prompt de comentários com --comment).
 */
async function main() {
  const options = parseCliOptions();
  if (!options) {
    return;
  }

  if (options.help) {
    showUsage();
    return;
  }

  if (await isGitMissing()) {
    showGitNotInstalledError();
    process.exitCode = 1;
    return;
  }

  if (!(await isGitRepository())) {
    showNoGitRepositoryError();
    process.exitCode = 1;
    return;
  }

  if (options.comment) {
    await runCommentPromptFlow();
  } else {
    await runCommitPromptFlow();
  }
}

main().catch((error) => {
  showUnexpectedError(error);
  process.exitCode = 1;
});