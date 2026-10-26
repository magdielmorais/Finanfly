import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, UserProfile } from '../types';

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

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(190, 18, 60); // rose-700 accent line
  doc.rect(0, 26.5, pageWidth, 1.5, 'F');

  // Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('FinanFly', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Finanças Inteligente', 38, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Relatório de Lançamentos de Despesas', 14, 20);

  // Emission date on the right
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${dateFormatted} às ${timeFormatted}`, pageWidth - 14, 12, { align: 'right' });
  if (userProfile?.name) {
    doc.text(`Usuário: ${userProfile.name}`, pageWidth - 14, 17, { align: 'right' });
  }

  // 2. Filter & Context Summary Card
  let currentY = 34;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, currentY, pageWidth - 28, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Filtros Aplicados na Exportação:', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600

  // Filter column 1
  doc.text(`• Período: ${filterDetails.periodText}`, 18, currentY + 12);
  doc.text(`• Categoria: ${filterDetails.categoryText}`, 18, currentY + 18);

  // Filter column 2
  doc.text(`• Tipo: ${filterDetails.typeText}`, 85, currentY + 12);
  doc.text(`• Situação: ${filterDetails.statusText}`, 85, currentY + 18);

  // Filter column 3
  if (filterDetails.searchText) {
    doc.text(`• Busca: "${filterDetails.searchText}"`, 145, currentY + 12);
  }
  doc.text(`• Lançamentos: ${expenses.length}`, 145, currentY + 18);

  currentY += 27;

  // 3. Financial Metrics Box
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');

  const paidExpenses = expenses.filter(e => e.status?.toLowerCase() === 'pago');
  const paidTotal = paidExpenses.reduce((acc, curr) => acc + curr.value, 0);

  const pendingExpenses = expenses.filter(e => e.status?.toLowerCase() !== 'pago');
  const pendingTotal = pendingExpenses.reduce((acc, curr) => acc + curr.value, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(159, 18, 57); // rose-900
  doc.text('SOMA TOTAL FILTRADA:', 18, currentY + 9);

  doc.setFontSize(11);
  doc.text(`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 75, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Pagas: R$ ${paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${paidExpenses.length})`, 130, currentY + 9);
  doc.text(`Pendentes: R$ ${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pendingExpenses.length})`, pageWidth - 18, currentY + 9, { align: 'right' });

  currentY += 18;

  // 4. Expense Table
  // Sort expenses by date in descending order (or chronological)
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
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59], // slate-800
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 19, halign: 'center' }, // Data
      1: { cellWidth: 'auto' }, // Descrição
      2: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }, // Valor
      3: { cellWidth: 28 }, // Categoria
      4: { cellWidth: 24 }, // Classificação
      5: { cellWidth: 25 }, // Tipo
      6: { cellWidth: 24, halign: 'center' } // Situação
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    didDrawCell: (data) => {
      // Highlight status column color
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
      // Highlight value column in rose
      if (data.section === 'body' && data.column.index === 2) {
        doc.setTextColor(190, 18, 60); // rose-700
      }
    },
    margin: { left: 14, right: 14, bottom: 18 }
  });

  // 5. Page numbering on all pages
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

  // 6. Filename formatting
  const sanitizedPeriod = filterDetails.periodText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const filename = `finanfly_despesas_${sanitizedPeriod || 'relatorio'}_${now.toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
};
