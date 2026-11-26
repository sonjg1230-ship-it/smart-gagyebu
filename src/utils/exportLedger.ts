import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  formatCurrency,
  getCategoryMeta,
  getTodayDateString,
  type FilterType,
  type Transaction,
} from '../types/ledger';

const FILTER_LABELS: Record<FilterType, string> = {
  all: '전체',
  income: '수입',
  expense: '지출',
};

function computeSummary(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const item of transactions) {
    if (item.type === 'income') totalIncome += item.amount;
    else totalExpense += item.amount;
  }
  return {
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
  };
}

export function exportToExcel(transactions: Transaction[], filter: FilterType): void {
  const today = getTodayDateString();
  const filterLabel = FILTER_LABELS[filter];
  const { totalIncome, totalExpense, totalBalance } = computeSummary(transactions);

  const detailRows: (string | number)[][] = [
    ['날짜', '구분', '카테고리', '내용', '금액(원)'],
    ...transactions.map((item) => {
      const meta = getCategoryMeta(item.type, item.category);
      const signedAmount = item.type === 'income' ? item.amount : -item.amount;
      return [
        item.date,
        item.type === 'income' ? '수입' : '지출',
        meta.name,
        item.title,
        signedAmount,
      ];
    }),
    [],
    ['요약 항목', '', '', '', '금액(원)'],
    ['총 수입', '', '', '', totalIncome],
    ['총 지출', '', '', '', -totalExpense],
    ['순 합계', '', '', '', totalBalance],
  ];

  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 18 },
    { wch: 34 },
    { wch: 16 },
  ];

  const summaryRows: (string | number)[][] = [
    ['항목', '값'],
    ['내보내기 날짜', today],
    ['필터 구분', filterLabel],
    ['거래 건수', transactions.length],
    ['총 수입(원)', totalIncome],
    ['총 지출(원)', totalExpense],
    ['순 합계(원)', totalBalance],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 18 }, { wch: 22 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, detailSheet, '거래 내역');
  XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');

  XLSX.writeFile(workbook, `스마트가계부_${filterLabel}_${today}.xlsx`);
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
  style: Partial<CSSStyleDeclaration> = {}
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.textContent = text;
  Object.assign(el.style, style);
  return el;
}

export async function exportToPdf(transactions: Transaction[], filter: FilterType): Promise<void> {
  const today = getTodayDateString();
  const filterLabel = FILTER_LABELS[filter];
  const { totalIncome, totalExpense, totalBalance } = computeSummary(transactions);

  // Build an offscreen A4-proportioned DOM report using safe DOM APIs (no raw HTML injection)
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '794px',
    padding: '40px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontFamily: "'Plus Jakarta Sans', 'Noto Sans KR', sans-serif",
    boxSizing: 'border-box',
  });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: '18px',
    marginBottom: '20px',
    borderBottom: '2px solid #4f46e5',
  });

  const titleWrap = document.createElement('div');
  titleWrap.appendChild(
    createTextElement('h1', '스마트 가계부 내역서', {
      fontSize: '22px',
      fontWeight: '700',
      margin: '0 0 6px 0',
      color: '#0f172a',
    })
  );
  titleWrap.appendChild(
    createTextElement('p', `추출일: ${today} · 구분: ${filterLabel} · 총 ${transactions.length}건`, {
      fontSize: '12px',
      margin: '0',
      color: '#64748b',
    })
  );
  header.appendChild(titleWrap);
  container.appendChild(header);

  // Summary Grid
  const summaryGrid = document.createElement('div');
  Object.assign(summaryGrid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  });

  const summaryItems = [
    { label: '순 합계', value: formatCurrency(totalBalance), color: '#4f46e5', bg: '#eef2ff' },
    { label: '총 수입', value: `+${formatCurrency(totalIncome)}`, color: '#059669', bg: '#ecfdf5' },
    { label: '총 지출', value: `-${formatCurrency(totalExpense)}`, color: '#e11d48', bg: '#fff1f2' },
  ];

  for (const card of summaryItems) {
    const box = document.createElement('div');
    Object.assign(box.style, {
      backgroundColor: card.bg,
      borderRadius: '12px',
      padding: '14px 16px',
    });
    box.appendChild(
      createTextElement('div', card.label, {
        fontSize: '11px',
        fontWeight: '600',
        color: '#475569',
        marginBottom: '4px',
      })
    );
    box.appendChild(
      createTextElement('div', card.value, {
        fontSize: '16px',
        fontWeight: '700',
        color: card.color,
        fontVariantNumeric: 'tabular-nums',
      })
    );
    summaryGrid.appendChild(box);
  }
  container.appendChild(summaryGrid);

  // Table
  const table = document.createElement('table');
  Object.assign(table.style, {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  });

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  Object.assign(headRow.style, {
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #cbd5e1',
  });

  const columns = [
    { label: '날짜', align: 'left', width: '16%' },
    { label: '구분', align: 'center', width: '10%' },
    { label: '카테고리', align: 'left', width: '20%' },
    { label: '내용', align: 'left', width: '34%' },
    { label: '금액', align: 'right', width: '20%' },
  ];

  for (const col of columns) {
    const th = createTextElement('th', col.label, {
      padding: '10px 8px',
      textAlign: col.align,
      fontWeight: '700',
      color: '#334155',
      width: col.width,
    });
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const item of transactions) {
    const meta = getCategoryMeta(item.type, item.category);
    const isIncome = item.type === 'income';
    const row = document.createElement('tr');
    Object.assign(row.style, {
      borderBottom: '1px solid #f1f5f9',
    });

    row.appendChild(
      createTextElement('td', item.date, {
        padding: '9px 8px',
        color: '#475569',
        fontVariantNumeric: 'tabular-nums',
      })
    );
    row.appendChild(
      createTextElement('td', isIncome ? '수입' : '지출', {
        padding: '9px 8px',
        textAlign: 'center',
        fontWeight: '600',
        color: isIncome ? '#059669' : '#e11d48',
      })
    );
    row.appendChild(
      createTextElement('td', meta.name, {
        padding: '9px 8px',
        color: '#334155',
      })
    );
    row.appendChild(
      createTextElement('td', item.title, {
        padding: '9px 8px',
        color: '#0f172a',
        fontWeight: '500',
        wordBreak: 'break-word',
      })
    );
    row.appendChild(
      createTextElement('td', `${isIncome ? '+' : '-'}${formatCurrency(item.amount)}`, {
        padding: '9px 8px',
        textAlign: 'right',
        fontWeight: '700',
        color: isIncome ? '#059669' : '#0f172a',
        fontVariantNumeric: 'tabular-nums',
      })
    );

    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const imgHeight = (canvas.height * printableWidth) / canvas.width;
    let remainingHeight = imgHeight;
    let yOffset = margin;

    pdf.addImage(imgData, 'PNG', margin, yOffset, printableWidth, imgHeight);
    remainingHeight -= printableHeight;

    while (remainingHeight > 0) {
      pdf.addPage();
      yOffset = margin - (imgHeight - remainingHeight);
      pdf.addImage(imgData, 'PNG', margin, yOffset, printableWidth, imgHeight);
      remainingHeight -= printableHeight;
    }

    pdf.save(`스마트가계부_${filterLabel}_${today}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function captureElementAsPngBlob(element: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

export async function exportElementToImage(element: HTMLElement, fileBaseName: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${fileBaseName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportElementToPdf(element: HTMLElement, fileBaseName: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const imgHeight = (canvas.height * printableWidth) / canvas.width;
  let remainingHeight = imgHeight;
  let yOffset = margin;

  pdf.addImage(imgData, 'PNG', margin, yOffset, printableWidth, imgHeight);
  remainingHeight -= printableHeight;

  while (remainingHeight > 0) {
    pdf.addPage();
    yOffset = margin - (imgHeight - remainingHeight);
    pdf.addImage(imgData, 'PNG', margin, yOffset, printableWidth, imgHeight);
    remainingHeight -= printableHeight;
  }

  pdf.save(`${fileBaseName}.pdf`);
}

