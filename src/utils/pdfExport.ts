import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Income, UserProfile } from '../types';

/**
 * Configurações e estilos padrão de exportação de PDF do FinanFly.
 * Mantém o cabeçalho institucional (fundo cinza claro, linha divisória azul e texto preto),
 * espaçamento de linhas compacto para máxima densidade de informações por página,
 * e proporções balanceadas de colunas com descrição expandida.
 */
export const STANDARD_PDF_CONFIG = {
  header: {
    height: 25,
    fillColor: [241, 245, 249] as [number, number, number], // slate-100 (cinza bem claro)
    accentLineColor: [37, 99, 235] as [number, number, number], // blue-600 (azul)
    accentLineHeight: 1.4,
    textColor: [0, 0, 0] as [number, number, number] // preto
  },
  table: {
    theme: 'grid' as const,
    styles: {
      font: 'helvetica' as const,
      fontSize: 7.2,
      cellPadding: { top: 1.1, bottom: 1.1, left: 1.8, right: 1.8 },
      minCellHeight: 4.8,
      valign: 'middle' as const,
      textColor: [30, 41, 59] as [number, number, number], // slate-800
      lineColor: [226, 232, 240] as [number, number, number], // slate-200
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [30, 41, 59] as [number, number, number], // slate-800
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 7.2,
      cellPadding: { top: 1.4, bottom: 1.4, left: 1.8, right: 1.8 },
      halign: 'left' as const,
      valign: 'middle' as const
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number] // slate-50
    },
    margin: { left: 14, right: 14, bottom: 16 }
  }
};

/**
 * Desenha o cabeçalho padrão FinanFly em um documento jsPDF
 */
export const drawStandardPdfHeader = (
  doc: jsPDF,
  pageWidth: number,
  title: string,
  userProfile?: UserProfile | null
): void => {
  const { header } = STANDARD_PDF_CONFIG;

  // Fundo cinza bem claro
  doc.setFillColor(...header.fillColor);
  doc.rect(0, 0, pageWidth, header.height, 'F');

  // Linha separadora azul
  doc.setFillColor(...header.accentLineColor);
  doc.rect(0, header.height - header.accentLineHeight, pageWidth, header.accentLineHeight, 'F');

  // FinanFly Marca & Slogan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...header.textColor);
  doc.text('FinanFly', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...header.textColor);
  doc.text('Finanças Inteligente', 36, 11);

  // Título do Relatório
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...header.textColor);
  doc.text(title, 14, 18.5);

  // Informações de emissão à direita
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...header.textColor);
  doc.text(`Emissão: ${dateFormatted} às ${timeFormatted}`, pageWidth - 14, 11, { align: 'right' });
  if (userProfile?.name) {
    doc.text(`Usuário: ${userProfile.name}`, pageWidth - 14, 16.5, { align: 'right' });
  }
};

/**
 * Adiciona a numeração de páginas padrão em todas as páginas do documento
 */
export const drawStandardPdfFooter = (doc: jsPDF, pageWidth: number, pageHeight: number): void => {
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `FinanFly Gestão Financeira • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }
};

export interface ExpensePdfExportOptions {
  expenses: Expense[];
  userProfile?: UserProfile | null;
  filterDetails: {
    periodText: string;
    categoryText: string;
    typeText: string;
    statusText: string;
    searchText?: string;
  };
  totalValue: number;
}

/**
 * Exporta lançamentos de despesas em PDF com o layout padrão institucional do FinanFly:
 * - Espaçamento entre linhas compacto (para caber muito mais itens por página)
 * - Coluna Descrição ampliada (60mm)
 * - Coluna Valor compactada (21.5mm)
 * - Colunas Data, Categoria, Classificação, Tipo e Situação redistribuídas de forma equilibrada
 */
export const exportExpensesToPdf = async ({
  expenses,
  userProfile,
  filterDetails,
  totalValue
}: ExpensePdfExportOptions): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner padrão
  drawStandardPdfHeader(doc, pageWidth, 'Relatório de Lançamentos de Despesas', userProfile);

  // 2. Filter & Context Summary Card (compacto para economizar altura)
  let currentY = 29;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, currentY, pageWidth - 28, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Filtros Aplicados na Exportação:', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105); // slate-600

  // Filter column 1
  doc.text(`• Período: ${filterDetails.periodText}`, 18, currentY + 10.5);
  doc.text(`• Categoria: ${filterDetails.categoryText}`, 18, currentY + 15.5);

  // Filter column 2
  doc.text(`• Tipo: ${filterDetails.typeText}`, 85, currentY + 10.5);
  doc.text(`• Situação: ${filterDetails.statusText}`, 85, currentY + 15.5);

  // Filter column 3
  if (filterDetails.searchText) {
    doc.text(`• Busca: "${filterDetails.searchText}"`, 145, currentY + 10.5);
  }
  doc.text(`• Lançamentos: ${expenses.length}`, 145, currentY + 15.5);

  currentY += 22;

  // 3. Financial Metrics Box (compacto)
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(14, currentY, pageWidth - 28, 11.5, 2, 2, 'FD');

  const paidExpenses = expenses.filter(e => e.status?.toLowerCase() === 'pago');
  const paidTotal = paidExpenses.reduce((acc, curr) => acc + curr.value, 0);

  const pendingExpenses = expenses.filter(e => e.status?.toLowerCase() !== 'pago');
  const pendingTotal = pendingExpenses.reduce((acc, curr) => acc + curr.value, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(159, 18, 57); // rose-900
  doc.text('SOMA TOTAL FILTRADA:', 18, currentY + 7.5);

  doc.setFontSize(10);
  doc.text(`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 72, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Pagas: R$ ${paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${paidExpenses.length})`, 130, currentY + 7.5);
  doc.text(`Pendentes: R$ ${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pendingExpenses.length})`, pageWidth - 18, currentY + 7.5, { align: 'right' });

  currentY += 15.5;

  // 4. Expense Table
  const sortedExpenses = [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const tableRows = sortedExpenses.map(exp => {
    let dateStr = exp.date || '-';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return [
      dateStr,
      exp.description || '',
      `R$ ${exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      exp.category || '-',
      exp.classification || '-',
      exp.paymentType || '-',
      exp.status || '-'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Descrição', 'Valor (R$)', 'Categoria', 'Classificação', 'Tipo', 'Situação']],
    body: tableRows,
    theme: STANDARD_PDF_CONFIG.table.theme,
    styles: STANDARD_PDF_CONFIG.table.styles,
    headStyles: STANDARD_PDF_CONFIG.table.headStyles,
    columnStyles: {
      0: { cellWidth: 16.5, halign: 'center' }, // Data (redistribuído)
      1: { cellWidth: 60 }, // Descrição (largura substancialmente ampliada)
      2: { cellWidth: 21.5, halign: 'right', fontStyle: 'bold' }, // Valor (largura reduzida e otimizada)
      3: { cellWidth: 25 }, // Categoria (redistribuído)
      4: { cellWidth: 19 }, // Classificação (redistribuído)
      5: { cellWidth: 22 }, // Tipo (redistribuído)
      6: { cellWidth: 18, halign: 'center' } // Situação (redistribuído)
    },
    alternateRowStyles: STANDARD_PDF_CONFIG.table.alternateRowStyles,
    didDrawCell: (data) => {
      // Destaque de cor na coluna Situação
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw || '');
        if (text.toLowerCase() === 'pago') {
          doc.setTextColor(22, 101, 52); // emerald-800
        } else if (text.toLowerCase() === 'pendente') {
          doc.setTextColor(194, 65, 12); // orange-700
        } else if (text.toLowerCase() === 'atrasado') {
          doc.setTextColor(190, 18, 60); // rose-700
        }
      }
      // Destaque de cor na coluna Valor (tom rose)
      if (data.section === 'body' && data.column.index === 2) {
        doc.setTextColor(190, 18, 60); // rose-700
      }
    },
    margin: STANDARD_PDF_CONFIG.table.margin
  });

  // 5. Numeração de páginas em todas as páginas
  drawStandardPdfFooter(doc, pageWidth, pageHeight);

  // 6. Nome do arquivo
  const now = new Date();
  const sanitizedPeriod = filterDetails.periodText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const filename = `finanfly_despesas_${sanitizedPeriod || 'relatorio'}_${now.toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
};

export interface IncomePdfExportOptions {
  incomes: Income[];
  userProfile?: UserProfile | null;
  filterDetails: {
    periodText: string;
    categoryText: string;
    typeText: string;
    statusText: string;
    searchText?: string;
  };
  totalValue: number;
}

/**
 * Exporta lançamentos de receitas em PDF seguindo o mesmo padrão de layout institucional:
 * - Cabeçalho institucional idêntico
 * - Espaçamento compacto entre linhas
 * - Descrição ampliada e valor otimizado
 */
export const exportIncomesToPdf = async ({
  incomes,
  userProfile,
  filterDetails,
  totalValue
}: IncomePdfExportOptions): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner padrão
  drawStandardPdfHeader(doc, pageWidth, 'Relatório de Lançamentos de Receitas', userProfile);

  // 2. Filter & Context Summary Card (compacto)
  let currentY = 29;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Filtros Aplicados na Exportação:', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);

  doc.text(`• Período: ${filterDetails.periodText}`, 18, currentY + 10.5);
  doc.text(`• Categoria: ${filterDetails.categoryText}`, 18, currentY + 15.5);

  doc.text(`• Tipo: ${filterDetails.typeText}`, 85, currentY + 10.5);
  doc.text(`• Situação: ${filterDetails.statusText}`, 85, currentY + 15.5);

  if (filterDetails.searchText) {
    doc.text(`• Busca: "${filterDetails.searchText}"`, 145, currentY + 10.5);
  }
  doc.text(`• Lançamentos: ${incomes.length}`, 145, currentY + 15.5);

  currentY += 22;

  // 3. Financial Metrics Box (Receitas em tom verde emerald)
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, currentY, pageWidth - 28, 11.5, 2, 2, 'FD');

  const receivedIncomes = incomes.filter(i => i.status?.toLowerCase() === 'recebido');
  const receivedTotal = receivedIncomes.reduce((acc, curr) => acc + curr.value, 0);

  const pendingIncomes = incomes.filter(i => i.status?.toLowerCase() !== 'recebido');
  const pendingTotal = pendingIncomes.reduce((acc, curr) => acc + curr.value, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('TOTAL RECEITAS FILTRADAS:', 18, currentY + 7.5);

  doc.setFontSize(10);
  doc.text(`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 75, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Recebidas: R$ ${receivedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${receivedIncomes.length})`, 130, currentY + 7.5);
  doc.text(`A Receber: R$ ${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pendingIncomes.length})`, pageWidth - 18, currentY + 7.5, { align: 'right' });

  currentY += 15.5;

  // 4. Incomes Table
  const sortedIncomes = [...incomes].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const tableRows = sortedIncomes.map(inc => {
    let dateStr = inc.date || '-';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return [
      dateStr,
      inc.description || '',
      `R$ ${inc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      inc.category || '-',
      inc.paymentType || '-',
      inc.status || '-'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Descrição', 'Valor (R$)', 'Categoria', 'Tipo', 'Situação']],
    body: tableRows,
    theme: STANDARD_PDF_CONFIG.table.theme,
    styles: STANDARD_PDF_CONFIG.table.styles,
    headStyles: STANDARD_PDF_CONFIG.table.headStyles,
    columnStyles: {
      0: { cellWidth: 17, halign: 'center' }, // Data
      1: { cellWidth: 67 }, // Descrição ampliada
      2: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }, // Valor
      3: { cellWidth: 28 }, // Categoria
      4: { cellWidth: 26 }, // Tipo
      5: { cellWidth: 22, halign: 'center' } // Situação
    },
    alternateRowStyles: STANDARD_PDF_CONFIG.table.alternateRowStyles,
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw || '');
        if (text.toLowerCase() === 'recebido') {
          doc.setTextColor(22, 101, 52); // emerald-800
        } else {
          doc.setTextColor(194, 65, 12); // orange-700
        }
      }
      if (data.section === 'body' && data.column.index === 2) {
        doc.setTextColor(22, 101, 52); // emerald-700
      }
    },
    margin: STANDARD_PDF_CONFIG.table.margin
  });

  // 5. Numeração de páginas
  drawStandardPdfFooter(doc, pageWidth, pageHeight);

  // 6. Salvar arquivo
  const now = new Date();
  const sanitizedPeriod = filterDetails.periodText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const filename = `finanfly_receitas_${sanitizedPeriod || 'relatorio'}_${now.toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
};

export interface MonthlySummaryPdfExportOptions {
  monthName: string;
  year: number;
  userProfile?: UserProfile | null;
  categoriesTableData: {
    category: string;
    budgetedValue: number;
    realizedValue: number;
    balanceValue: number;
    color: string;
  }[];
  realizedCategoriesList: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  sumBudget: number;
  sumExpense: number;
  balance: number;
}

/**
 * Gera imagem em base64 do gráfico Donut/Pizza de Categorias Realizadas
 */
export const createRealizedPieChartImage = (
  slices: { name: string; value: number; color: string; percentage: number }[],
  totalRealized: number
): string => {
  if (typeof document === 'undefined') return '';
  const size = 600;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size * 0.44;
  const innerRadius = size * 0.26;

  ctx.clearRect(0, 0, size, size);

  if (slices.length === 0 || totalRealized <= 0) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem Despesas Realizadas', cx, cy - 12);
    ctx.font = '18px Helvetica, Arial, sans-serif';
    ctx.fillText('R$ 0,00', cx, cy + 18);
    return canvas.toDataURL('image/png');
  }

  let startAngle = -Math.PI / 2;
  const totalVal = slices.reduce((acc, s) => acc + s.value, 0);

  slices.forEach(slice => {
    const sliceAngle = (slice.value / totalVal) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, startAngle, endAngle, false);
    ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = slice.color || '#ef4444';
    ctx.fill();

    if (slices.length > 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    startAngle = endAngle;
  });

  // Texto central
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Realizado', cx, cy - 14);

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 24px Helvetica, Arial, sans-serif';
  ctx.fillText(`R$ ${totalRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cx, cy + 16);

  return canvas.toDataURL('image/png');
};

/**
 * Exporta o Resumo Mensal por Categoria em PDF com:
 * 1. Cabeçalho padrão FinanFly
 * 2. Tabela comparativa Orçado vs Realizado por categoria
 * 3. Seção Categorias - Realizado com o gráfico Donut e percentuais de cada categoria
 */
export const exportMonthlySummaryToPdf = async ({
  monthName,
  year,
  userProfile,
  categoriesTableData,
  realizedCategoriesList,
  sumBudget,
  sumExpense,
  balance
}: MonthlySummaryPdfExportOptions): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Cabeçalho padrão FinanFly
  drawStandardPdfHeader(doc, pageWidth, `Resumo Mensal por Categoria • ${monthName} de ${year}`, userProfile);

  // 2. Cartão de Contexto e Indicadores do Mês
  let currentY = 29;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Mês de Referência: ${monthName} de ${year}`, 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);

  doc.text(`• Total Orçado: R$ ${sumBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, currentY + 11.5);
  doc.text(`• Total Realizado: R$ ${sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 85, currentY + 11.5);

  const balanceLabel = balance >= 0 ? 'Superávit / Economia' : 'Déficit no Mês';
  doc.text(`• Saldo do Mês: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${balanceLabel})`, 145, currentY + 11.5);

  currentY += 21;

  // 3. Tabela de Resumo por Categoria Mensal (Orçado, Realizado, Saldo, % Realizado)
  const sortedCategories = [...categoriesTableData].sort((a, b) => {
    if (b.realizedValue !== a.realizedValue) return b.realizedValue - a.realizedValue;
    return a.category.localeCompare(b.category, 'pt-BR');
  });

  const tableRows = sortedCategories.map(item => {
    const pct = sumExpense > 0 ? ((item.realizedValue / sumExpense) * 100).toFixed(1) + '%' : '0.0%';
    const balanceStr = item.balanceValue < 0
      ? `-${Math.abs(item.balanceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : item.balanceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    return [
      item.category,
      `R$ ${item.budgetedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${item.realizedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${balanceStr}`,
      pct
    ];
  });

  // Linha de Total
  const totalBalanceStr = balance < 0
    ? `-${Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const totalRow = [
    'TOTAL GERAL',
    `R$ ${sumBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `R$ ${sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `R$ ${totalBalanceStr}`,
    '100.0%'
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Categoria', 'Orçado (R$)', 'Realizado (R$)', 'Saldo (R$)', '% Realizado']],
    body: tableRows,
    foot: [totalRow],
    theme: STANDARD_PDF_CONFIG.table.theme,
    styles: STANDARD_PDF_CONFIG.table.styles,
    headStyles: STANDARD_PDF_CONFIG.table.headStyles,
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: { top: 1.4, bottom: 1.4, left: 1.8, right: 1.8 },
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 62 }, // Categoria
      1: { cellWidth: 30, halign: 'right' }, // Orçado
      2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }, // Realizado
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }, // Saldo
      4: { cellWidth: 30, halign: 'center' } // % Realizado
    },
    alternateRowStyles: STANDARD_PDF_CONFIG.table.alternateRowStyles,
    didDrawCell: (data) => {
      // Destaque de cor no Saldo
      if (data.section === 'body' && data.column.index === 3) {
        const item = sortedCategories[data.row.index];
        if (item) {
          if (item.balanceValue < 0) {
            doc.setTextColor(190, 18, 60); // red-600
          } else if (item.balanceValue > 0) {
            doc.setTextColor(22, 101, 52); // emerald-700
          }
        }
      }
      // Destaque de cor no Realizado (rose-700)
      if (data.section === 'body' && data.column.index === 2) {
        doc.setTextColor(190, 18, 60);
      }
    },
    margin: STANDARD_PDF_CONFIG.table.margin
  });

  // 4. Seção: Categorias - Realizado com Gráfico e Percentuais
  let finalTableY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : currentY + 70;

  // Se não couber o bloco do gráfico (aprox 72mm) na página atual, quebra para uma nova página
  if (finalTableY + 74 > pageHeight - 16) {
    doc.addPage();
    finalTableY = 20;
  }

  // Título da Seção do Gráfico
  doc.setFillColor(241, 245, 249);
  doc.rect(14, finalTableY, pageWidth - 28, 7.5, 'F');
  doc.setFillColor(220, 38, 38); // linha de destaque vermelha para despesas realizadas
  doc.rect(14, finalTableY, 2.5, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CATEGORIAS REALIZADO • GRÁFICO E PERCENTUAIS DE CADA CATEGORIA', 19, finalTableY + 5.2);

  const chartStartY = finalTableY + 10.5;

  // Gerar o gráfico Donut em alta resolução
  const activeSlices = realizedCategoriesList.filter(c => c.value > 0);
  const chartImgData = createRealizedPieChartImage(activeSlices, sumExpense);
  if (chartImgData) {
    doc.addImage(chartImgData, 'PNG', 14, chartStartY, 56, 56);
  }

  // Tabela lateral direita com os percentuais e valores por categoria
  const sortedRealizedList = [...realizedCategoriesList]
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const breakdownRows = sortedRealizedList.map(item => [
    '', // Espaço para a bolinha da cor
    item.name,
    `R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `${item.percentage.toFixed(1)}%`
  ]);

  if (breakdownRows.length > 0) {
    autoTable(doc, {
      startY: chartStartY,
      head: [['Cor', 'Categoria', 'Realizado (R$)', 'Percentual']],
      body: breakdownRows,
      theme: STANDARD_PDF_CONFIG.table.theme,
      styles: {
        ...STANDARD_PDF_CONFIG.table.styles,
        fontSize: 7,
        cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 }
      },
      headStyles: {
        ...STANDARD_PDF_CONFIG.table.headStyles,
        fontSize: 7,
        cellPadding: { top: 1.2, bottom: 1.2, left: 1.5, right: 1.5 }
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, // Cor
        1: { cellWidth: 46 }, // Categoria
        2: { cellWidth: 36, halign: 'right' }, // Realizado
        3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' } // Percentual
      },
      alternateRowStyles: STANDARD_PDF_CONFIG.table.alternateRowStyles,
      didDrawCell: (data) => {
        // Desenha a bolinha colorida na coluna 'Cor'
        if (data.section === 'body' && data.column.index === 0) {
          const item = sortedRealizedList[data.row.index];
          if (item) {
            const hex = item.color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) || 59;
            const g = parseInt(hex.substring(2, 4), 16) || 130;
            const b = parseInt(hex.substring(4, 6), 16) || 246;

            doc.setFillColor(r, g, b);
            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            doc.circle(cx, cy, 2, 'F');
          }
        }
        if (data.section === 'body' && data.column.index === 3) {
          doc.setTextColor(220, 38, 38);
        }
      },
      margin: { left: 74, right: 14, bottom: 16 }
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma despesa realizada neste mês para compor o gráfico.', 76, chartStartY + 20);
  }

  // 5. Numeração de páginas institucional
  drawStandardPdfFooter(doc, pageWidth, pageHeight);

  // 6. Download do arquivo
  const now = new Date();
  const sanitizedMonth = monthName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');

  const filename = `finanfly_resumo_mensal_${sanitizedMonth}_${year}_${now.toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
};
