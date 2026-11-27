export const parsePtBrNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const str = String(val).trim();
  if (!str) return 0;

  // 1. Se contém vírgula, a vírgula é o separador decimal oficial brasileiro (ex: 1.500,50 ou 1500,50)
  if (str.includes(',')) {
    const clean = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // 2. Se contém ponto: verificar se é separador de milhar (ex: 1.000, 1.500, 10.000, 1.000.000)
  if (str.includes('.')) {
    const parts = str.split('.');
    const lastPart = parts[parts.length - 1];
    // Se tem apenas 2 blocos e o último tem 1 ou 2 dígitos (ex: 15.5 ou 149.90), trata como decimal
    if (lastPart.length <= 2 && parts.length === 2) {
      const clean = str.replace(/[^\d.]/g, '');
      const parsed = parseFloat(clean);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    // Se o último bloco tem exatamente 3 dígitos ou há múltiplos pontos, remove pontos de milhar
    const clean = str.replace(/\./g, '').replace(/[^\d]/g, '');
    const parsed = parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // 3. Apenas dígitos inteiros
  const clean = str.replace(/[^\d]/g, '');
  const parsed = parseFloat(clean);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatPtBrCurrency = (val: number): string => {
  if (!val || !Number.isFinite(val) || val === 0) return '';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatPtBrLiveInput = (raw: string): string => {
  if (!raw) return '';
  const val = raw.trim();
  if (!val) return '';

  // 1. Se o valor contém vírgula (separador decimal brasileiro)
  if (val.includes(',')) {
    const [intStr, ...rest] = val.split(',');
    const decStr = rest.join('').replace(/\D/g, '').slice(0, 2);
    const digitsInt = intStr.replace(/\D/g, '');
    const formattedInt = digitsInt ? parseInt(digitsInt, 10).toLocaleString('pt-BR') : '0';
    if (val.endsWith(',') && decStr.length === 0) {
      return `${formattedInt},`;
    }
    return decStr.length > 0 ? `${formattedInt},${decStr}` : `${formattedInt},`;
  }

  // 2. Se o usuário acabou de digitar um ponto no final (separador de milhar), mantém o ponto
  if (val.endsWith('.')) {
    const digitsInt = val.replace(/\D/g, '');
    if (!digitsInt) return '';
    const formattedInt = parseInt(digitsInt, 10).toLocaleString('pt-BR');
    return `${formattedInt}.`;
  }

  // 3. Formatação automática de milhar com ponto para números inteiros (ex: 1000 -> 1.000)
  const digitsOnly = val.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return parseInt(digitsOnly, 10).toLocaleString('pt-BR');
};
