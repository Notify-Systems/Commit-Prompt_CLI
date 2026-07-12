import clipboardy from 'clipboardy';

/**
 * Copia o texto fornecido para a área de transferência do sistema operacional.
 * Isolar o clipboardy neste módulo facilita trocar a lib no futuro, se preciso.
 */
async function copyToClipboard(text) {
  await clipboardy.write(text);
}

export { copyToClipboard };
