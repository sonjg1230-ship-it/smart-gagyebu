import { type CategoryId, type TransactionDraft, type TransactionType } from '../types/ledger';

export interface SmsParseCandidate extends TransactionDraft {
  rawText: string;
}

export function parsePaymentSms(text: string): SmsParseCandidate[] {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidates: SmsParseCandidate[] = [];

  // Keyword mapping for categories
  const categoryKeywords: Record<string, CategoryId> = {
    식비: 'food',
    카페: 'food',
    커피: 'food',
    스타벅스: 'food',
    투썸: 'food',
    편의점: 'food',
    마트: 'shopping',
    백화점: 'shopping',
    쇼핑: 'shopping',
    쿠팡: 'shopping',
    네이버페이: 'shopping',
    지하철: 'transport',
    버스: 'transport',
    택시: 'transport',
    주유: 'fuel',
    병원: 'medical',
    약국: 'medical',
    영화: 'leisure',
    통신: 'telecom',
    관리비: 'maintenance',
    전기: 'maintenance',
    월세: 'maintenance',
    이체: 'etc_exp',
    급여: 'salary',
    용돈: 'allowance',
  };

  const todayStr = new Date().toISOString().split('T')[0];

  for (const line of lines) {
    // Check if line contains money amount (e.g. 12,500원 or 12500원)
    const amountMatch = line.match(/([\d,]+)\s*원/);
    if (!amountMatch) continue;

    const rawAmountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseInt(rawAmountStr, 10);
    if (isNaN(amount) || amount <= 0) continue;

    // Detect Type (expense vs income)
    let type: TransactionType = 'expense';
    if (
      line.includes('입금') ||
      line.includes('급여') ||
      line.includes('송금받은') ||
      line.includes('캐시백') ||
      line.includes('환급')
    ) {
      type = 'income';
    }

    // Detect Bank / Card name
    let bankName = '신한카드';
    if (line.includes('국민') || line.includes('KB')) bankName = '국민은행/카드';
    else if (line.includes('신한')) bankName = '신한은행/카드';
    else if (line.includes('우리')) bankName = '우리은행/카드';
    else if (line.includes('하나')) bankName = '하나은행/카드';
    else if (line.includes('현대')) bankName = '현대카드';
    else if (line.includes('삼성')) bankName = '삼성카드';
    else if (line.includes('롯데')) bankName = '롯데카드';
    else if (line.includes('카카오뱅크') || line.includes('카뱅')) bankName = '카카오뱅크';
    else if (line.includes('토스')) bankName = '토스뱅크';
    else if (line.includes('농협') || line.includes('NH')) bankName = '농협은행';

    // Detect Date (e.g. 11/26 or 11-26 or 2026-11-26)
    let date = todayStr;
    const dateMatch = line.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const year = new Date().getFullYear();
      date = `${year}-${month}-${day}`;
    }

    // Extract Merchant / Title (remove common boilerplate like [Web발신], 승인, 금액, 날짜, etc.)
    let cleaned = line
      .replace(/\[.*?\]/g, '')
      .replace(/(승인|출금|입금|결제|취소|사용|체크|신용)/g, '')
      .replace(/[\d,]+\s*원/g, '')
      .replace(/\d{1,2}[\/\-]\d{1,2}(\s+\d{2}:\d{2})?/g, '')
      .replace(/[0-9*]+\s*(님)?/g, '')
      .trim();

    // Clean up extra symbols
    cleaned = cleaned.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
    const title = cleaned || '결제 내역';

    // Guess category from title or line
    let category: CategoryId = type === 'income' ? 'salary' : 'food';
    for (const [keyword, catId] of Object.entries(categoryKeywords)) {
      if (line.includes(keyword) || title.includes(keyword)) {
        category = catId;
        break;
      }
    }

    candidates.push({
      type,
      amount,
      category,
      title,
      date,
      isFixed: false,
      bankName,
      rawText: line,
    });
  }

  // If no lines matched individual amount pattern, try parsing the whole block
  if (candidates.length === 0 && text.trim()) {
    const amountMatch = text.match(/([\d,]+)\s*원/);
    if (amountMatch) {
      const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(amount) && amount > 0) {
        let title = text.replace(/\[.*?\]/g, '').replace(/[\d,]+\s*원/g, '').trim();
        if (title.length > 25) title = title.substring(0, 25) + '...';
        if (!title) title = '결제 문자 내역';

        let category: CategoryId = 'food';
        for (const [keyword, catId] of Object.entries(categoryKeywords)) {
          if (text.includes(keyword)) {
            category = catId;
            break;
          }
        }

        candidates.push({
          type: text.includes('입금') ? 'income' : 'expense',
          amount,
          category,
          title,
          date: todayStr,
          isFixed: false,
          bankName: '기본통장',
          rawText: text,
        });
      }
    }
  }

  return candidates;
}
