import path from "node:path";
import {
  getStagedFiles,
  getStagedFileContent,
  getStagedFileDiff,
} from "./git.js";

// Somente arquivos de código-fonte que aceitam comentários. Formatos como
// .json (não admite comentários) e lockfiles ficam de fora por não estarem aqui.
const COMMENTABLE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".kt",
  ".go",
  ".rs",
  ".c",
  ".h",
  ".cpp",
  ".cs",
  ".php",
  ".rb",
  ".sh",
  ".sql",
]);

// A IA precisa devolver o arquivo completo, então arquivos muito grandes
// estouram o limite de resposta e são pulados (com aviso ao usuário).
const MAX_COMMENT_FILE_CHARS = 40000;

/**
 * Lê os arquivos staged e separa os elegíveis para comentário dos ignorados.
 * Cada arquivo elegível traz o conteúdo completo (versão staged) e o diff.
 *
 * @returns {Promise<{
 *   stagedCount: number,
 *   files: Array<{path: string, content: string, diff: string}>,
 *   skipped: Array<{path: string, reason: string}>
 * }>} stagedCount é o total de arquivos staged antes de qualquer filtro.
 */
async function collectCommentableFiles() {
  const stagedPaths = await getStagedFiles();
  const files = [];
  const skipped = [];

  for (const filePath of stagedPaths) {
    const extension = path.extname(filePath).toLowerCase();
    if (!COMMENTABLE_EXTENSIONS.has(extension)) {
      skipped.push({ path: filePath, reason: "tipo de arquivo sem suporte" });
      continue;
    }

    const content = await getStagedFileContent(filePath);

    // Um byte NUL no texto é o sinal usual de arquivo binário.
    if (content.includes("\0")) {
      skipped.push({ path: filePath, reason: "arquivo binário" });
      continue;
    }

    if (content.length > MAX_COMMENT_FILE_CHARS) {
      skipped.push({ path: filePath, reason: "arquivo muito grande" });
      continue;
    }

    const diff = await getStagedFileDiff(filePath);

    // Sem hunks (blocos "@@") não há linha alterada para comentar, como numa
    // mudança só de permissão ou num arquivo novo vazio.
    if (!/^@@/m.test(diff)) {
      skipped.push({ path: filePath, reason: "sem alteração de conteúdo" });
      continue;
    }

    files.push({ path: filePath, content, diff });
  }

  return { stagedCount: stagedPaths.length, files, skipped };
}

export { collectCommentableFiles, COMMENTABLE_EXTENSIONS, MAX_COMMENT_FILE_CHARS };
