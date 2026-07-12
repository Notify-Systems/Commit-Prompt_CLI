// Utilitários genéricos, reaproveitáveis por qualquer parte da aplicação.

// Códigos ANSI simples para colorir a saída no terminal sem precisar
// adicionar uma dependência externa apenas para isso.
const COLORS = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

export { COLORS };
