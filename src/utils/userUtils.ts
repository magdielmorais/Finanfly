/**
 * Utilitário para geração de iniciais de usuário em formato padronizado com 2 letras.
 * 
 * Regras:
 * - Nomes compostos (ex: "João Silva", "Carlos Eduardo", "Ana Paula de Souza"):
 *   Primeira letra do primeiro nome + primeira letra do último nome/sobrenome ("JS", "CE", "AS").
 * - Nomes com palavras únicas (ex: "Gabriel", "Admin", "FinanFly"):
 *   As duas primeiras letras da palavra em maiúsculo ("GA", "AD", "FI").
 * - Nomes vazios ou sem letras:
 *   Extrai as 2 iniciais do e-mail (ex: "joao.silva@email.com" -> "JS", "contato@..." -> "CO").
 * - Garante SEMPRE exatamente duas letras maiúsculas no círculo.
 */
export function getUserInitials(name?: string | null, email?: string | null): string {
  if (name && typeof name === 'string' && name.trim().length > 0) {
    const cleanName = name.trim();
    // Separa por espaços em branco
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length >= 2) {
      // Filtrar preposições comuns em português
      const prepositions = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'd\'']);
      const meaningfulWords = words.filter(w => !prepositions.has(w.toLowerCase()));
      
      if (meaningfulWords.length >= 2) {
        const firstLetter = meaningfulWords[0].charAt(0);
        const lastLetter = meaningfulWords[meaningfulWords.length - 1].charAt(0);
        if (firstLetter && lastLetter) {
          return (firstLetter + lastLetter).toUpperCase();
        }
      } else if (words.length >= 2) {
        const firstLetter = words[0].charAt(0);
        const secondLetter = words[1].charAt(0);
        if (firstLetter && secondLetter) {
          return (firstLetter + secondLetter).toUpperCase();
        }
      }
    }
    
    // Apenas 1 palavra (ex: "Gabriel", "Administrador", "Ana")
    const singleWord = words[0] || cleanName;
    if (singleWord.length >= 2) {
      return singleWord.substring(0, 2).toUpperCase();
    } else if (singleWord.length === 1) {
      // Se tiver apenas 1 caractere, tenta pegar a segunda letra do e-mail se houver
      if (email && typeof email === 'string') {
        const emailLetters = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        if (emailLetters.length >= 2) {
          return (singleWord.charAt(0) + emailLetters.charAt(1)).toUpperCase();
        }
      }
      return (singleWord.charAt(0) + singleWord.charAt(0)).toUpperCase();
    }
  }

  // Fallback a partir do e-mail quando o nome não estiver preenchido
  if (email && typeof email === 'string' && email.trim().length > 0) {
    const emailPrefix = email.trim().split('@')[0];
    const emailParts = emailPrefix.split(/[._-]+/).filter(p => p.length > 0);
    if (emailParts.length >= 2) {
      const first = emailParts[0].charAt(0);
      const last = emailParts[emailParts.length - 1].charAt(0);
      if (first && last) {
        return (first + last).toUpperCase();
      }
    }
    const cleanLetters = emailPrefix.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanLetters.length >= 2) {
      return cleanLetters.substring(0, 2).toUpperCase();
    } else if (cleanLetters.length === 1) {
      return (cleanLetters.charAt(0) + cleanLetters.charAt(0)).toUpperCase();
    }
  }

  return 'US';
}
