/**
 * Gera identificadores únicos criptograficamente aleatórios para registros financeiros.
 * Evita colisões entre usuários ou cliques simultâneos (substitui Date.now() / Math.random()).
 */
export function generateRecordId(prefix = 'rec'): string {
  const cleanPrefix = String(prefix || 'rec').replace(/[^a-zA-Z0-9_-]/g, '');

  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === 'function') {
      return `${cleanPrefix}-${globalThis.crypto.randomUUID()}`;
    }
    if (typeof globalThis.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${cleanPrefix}-${hex}`;
    }
  }

  throw new Error('Gerador criptográfico Web Crypto indisponível para criar identificador seguro.');
}
