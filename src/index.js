#!/usr/bin/env node

import {
  isGitMissing,
  isGitRepository,
  getStagedDiff,
  GitError,
} from "./git.js";
import { buildCommitPrompt, LARGE_DIFF_CHAR_THRESHOLD } from "./prompt.js";
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
} from "./messages.js";

/**
 * Ponto de entrada da aplicação.
 * Fluxo: validar Git/repositório -> obter diff staged -> montar prompt ->
 * copiar para a área de transferência -> avisar o usuário.
 */
async function main() {
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

  try {
    await copyToClipboard(prompt);
    showPromptCopiedMessage();
  } catch (error) {
    // Ambientes headless (SSH, Docker, CI) costumam não ter um utilitário de
    // clipboard disponível. Em vez de simplesmente falhar, fazemos fallback:
    // avisamos o problema e imprimimos o prompt para cópia manual.
    showClipboardError(error);
    console.log("");
    console.log(COLORS.yellow("⚠ Copie o prompt abaixo manualmente:"));
    console.log("");
    console.log(prompt);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  showUnexpectedError(error);
  process.exitCode = 1;
});
