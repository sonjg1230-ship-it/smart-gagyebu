import * as XLSX from 'xlsx';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getTodayDateString,
  VALIDATION_LIMITS,
  type CategoryId,
  type TransactionDraft,
  type TransactionType,
} from '../types/ledger';

export interface ImportCandidate extends TransactionDraft {
  tempId: string;
  selected: boolean;
}

function createTempId(): string {
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDate(value: unknown, fallbackDate: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 100000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/[./]/g, '-');
    const match = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      const candidate = `${y}-${m}-${d}`;
      if (VALIDATION_LIMITS.DATE_PATTERN.test(candidate)) {
        return candidate;
      }
    }
  }

  return fallbackDate;
}

function parseNumericAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const stripped = value.replace(/[,\s원₩]/g, '');
    if (!stripped) return null;
    const parsed = Number(stripped);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return null;
}

function inferCategory(type: TransactionType, rawCategory: string, title: string): CategoryId {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const catTrimmed = rawCategory.trim();

  // Exact ID or Korean name match
  const exact = list.find(
    (item) => item.id === catTrimmed || item.name === catTrimmed
  );
  if (exact) return exact.id;

  const haystack = `${catTrimmed} ${title}`.toLowerCase();

  if (type === 'income') {
    if (/급여|월급|봉급|salary/.test(haystack)) return 'salary';
    if (/용돈|부수입|환급|캐시백|보너스|allowance/.test(haystack)) return 'allowance';
    if (/이자|배당|투자|주식|금융|invest/.test(haystack)) return 'invest';
    return 'etc_inc';
  }

  if (/식비|식당|음식|점심|저녁|아침|카페|커피|스타벅스|배달|배민|쿠팡이츠|마트|편의점|food/.test(haystack)) return 'food';
  if (/관리비|공과금|전기|수도|가스|월세|임대료|maintenance/.test(haystack)) return 'maintenance';
  if (/통신|휴대폰|핸드폰|인터넷|skt|kt|lgu|알뜰폰|telecom/.test(haystack)) return 'telecom';
  if (/보험|insurance/.test(haystack)) return 'insurance';
  if (/대출|원리금|이자|loan/.test(haystack)) return 'loan';
  if (/학원|교육|수강|강의|교재|학교|academy/.test(haystack)) return 'academy';
  if (/병원|의원|약국|치과|한의원|의료|medical/.test(haystack)) return 'medical';
  if (/주유|기름|휘발유|경유|주유소|fuel/.test(haystack)) return 'fuel';
  if (/교통|버스|지하철|택시|하이패스|톨게이트|주차|티머니|k-패스|transport/.test(haystack)) return 'transport';
  if (/가족|경조사|축의금|부의금|모임|선물|family/.test(haystack)) return 'family';
  if (/쇼핑|생활|다이소|쿠팡|네이버|올리브영|의류|shopping/.test(haystack)) return 'shopping';
  if (/영화|문화|여가|넷플릭스|유튜브|공연|여행|서점|leisure/.test(haystack)) return 'leisure';
  return 'etc_exp';
}

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  return headers.findIndex((h) => patterns.some((p) => p.test(h)));
}

export async function parseExcelFile(file: File): Promise<ImportCandidate[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('엑셀 시트를 찾을 수 없습니다.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (rows.length === 0) {
    throw new Error('엑셀 파일에 데이터가 없습니다.');
  }

  // Locate header row (within first 10 rows)
  let headerRowIndex = 0;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const candidate = rows[i].map((cell) => String(cell ?? '').trim().toLowerCase());
    const hasAmountOrTitle = candidate.some((h) =>
      /금액|출금|입금|amount|내용|적요|가맹점|상호|title|날짜|일자|date/.test(h)
    );
    if (hasAmountOrTitle) {
      headerRowIndex = i;
      headers = candidate;
      break;
    }
  }

  const dateCol = findColumnIndex(headers, [/날짜/, /일자/, /거래일/, /date/]);
  const typeCol = findColumnIndex(headers, [/구분/, /유형/, /종류/, /type/]);
  const categoryCol = findColumnIndex(headers, [/카테고리/, /분류/, /항목/, /category/]);
  const titleCol = findColumnIndex(headers, [/내용/, /적요/, /가맹점/, /상호/, /거래처/, /메모/, /title/, /memo/]);
  const amountCol = findColumnIndex(headers, [/금액/, /amount/]);
  const incomeCol = findColumnIndex(headers, [/입금/, /수입/, /income/]);
  const expenseCol = findColumnIndex(headers, [/출금/, /지출/, /expense/]);

  const fallbackDate = getTodayDateString();
  const candidates: ImportCandidate[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.every((c) => String(c ?? '').trim() === '')) {
      continue;
    }

    const firstCell = String(row[0] ?? '').trim();
    if (/^(요약 항목|총 수입|총 지출|순 합계|합계)$/.test(firstCell)) {
      break;
    }

    let type: TransactionType = 'expense';
    let amount: number | null = null;

    if (amountCol >= 0) {
      const rawAmt = parseNumericAmount(row[amountCol]);
      if (rawAmt !== null && rawAmt !== 0) {
        const rawType = typeCol >= 0 ? String(row[typeCol] ?? '').trim().toLowerCase() : '';
        if (/수입|입금|income|\+/.test(rawType)) {
          type = 'income';
          amount = Math.abs(rawAmt);
        } else if (/지출|출금|expense|-/.test(rawType)) {
          type = 'expense';
          amount = Math.abs(rawAmt);
        } else if (rawAmt > 0 && typeCol < 0) {
          // If no type column, positive numbers default to expense unless flagged
          type = 'expense';
          amount = rawAmt;
        } else if (rawAmt < 0) {
          type = 'expense';
          amount = Math.abs(rawAmt);
        } else {
          type = 'income';
          amount = rawAmt;
        }
      }
    } else if (incomeCol >= 0 || expenseCol >= 0) {
      const inc = incomeCol >= 0 ? parseNumericAmount(row[incomeCol]) : null;
      const exp = expenseCol >= 0 ? parseNumericAmount(row[expenseCol]) : null;
      if (inc && inc > 0) {
        type = 'income';
        amount = inc;
      } else if (exp && Math.abs(exp) > 0) {
        type = 'expense';
        amount = Math.abs(exp);
      }
    }

    if (amount === null || amount < VALIDATION_LIMITS.AMOUNT_MIN || amount > VALIDATION_LIMITS.AMOUNT_MAX) {
      continue;
    }

    const rawTitle =
      titleCol >= 0
        ? String(row[titleCol] ?? '').trim()
        : row
            .map((c) => String(c ?? '').trim())
            .find((c) => c && parseNumericAmount(c) === null && !/^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/.test(c)) ?? '';

    const title = (rawTitle || '엑셀 가져오기 내역').slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
    const rawCat = categoryCol >= 0 ? String(row[categoryCol] ?? '').trim() : '';
    const category = inferCategory(type, rawCat, title);
    const date = dateCol >= 0 ? normalizeDate(row[dateCol], fallbackDate) : fallbackDate;

    candidates.push({
      tempId: createTempId(),
      selected: true,
      type,
      amount,
      category,
      title,
      date,
      isFixed: false,
      bankName: undefined,
    });
  }

  if (candidates.length === 0) {
    throw new Error('유효한 거래 내역 행을 찾지 못했습니다. 날짜·내용·금액 열이 있는지 확인해 주세요.');
  }

  return candidates;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('이미지 인코딩에 실패했습니다.'));
        return;
      }
      resolve(result.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(new Error('이미지 파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

export async function parseImageFile(file: File): Promise<ImportCandidate[]> {
  const imageBase64 = await fileToBase64(file);
  const response = await fetch('/api/parse-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType: file.type || 'image/jpeg',
      defaultDate: getTodayDateString(),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    transactions?: TransactionDraft[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || '이미지 분석에 실패했습니다.');
  }

  const list = Array.isArray(payload.transactions) ? payload.transactions : [];
  if (list.length === 0) {
    throw new Error('이미지에서 거래 내역을 찾지 못했습니다.');
  }

  return list.map((item) => ({
    ...item,
    tempId: createTempId(),
    selected: true,
    isFixed: Boolean(item.isFixed),
    bankName: item.bankName,
  }));
}
