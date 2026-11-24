import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import express, { type Request, type Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const EXPENSE_CATEGORY_IDS = new Set([
  'food',
  'maintenance',
  'telecom',
  'insurance',
  'loan',
  'academy',
  'medical',
  'fuel',
  'transport',
  'family',
  'shopping',
  'leisure',
  'etc_exp',
]);

const INCOME_CATEGORY_IDS = new Set(['salary', 'allowance', 'invest', 'etc_inc']);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface RawParsedItem {
  type?: unknown;
  amount?: unknown;
  category?: unknown;
  title?: unknown;
  date?: unknown;
}

function normalizeParsedItems(items: RawParsedItem[], fallbackDate: string) {
  const normalized: Array<{
    type: 'income' | 'expense';
    amount: number;
    category: string;
    title: string;
    date: string;
  }> = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const type = item.type === 'income' ? 'income' : 'expense';
    const amount = Math.round(Number(item.amount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000_000_000) {
      continue;
    }

    const rawCategory = typeof item.category === 'string' ? item.category.trim() : '';
    const category =
      type === 'income'
        ? INCOME_CATEGORY_IDS.has(rawCategory)
          ? rawCategory
          : 'etc_inc'
        : EXPENSE_CATEGORY_IDS.has(rawCategory)
          ? rawCategory
          : 'etc_exp';

    const rawTitle = typeof item.title === 'string' ? item.title.trim() : '';
    const title = (rawTitle || (type === 'income' ? '이미지 수입 내역' : '이미지 지출 내역')).slice(0, 100);

    const rawDate = typeof item.date === 'string' ? item.date.trim() : '';
    const date = DATE_PATTERN.test(rawDate) ? rawDate : fallbackDate;

    normalized.push({ type, amount, category, title, date });
  }

  return normalized;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.post('/api/parse-receipt', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: 'Gemini API 키가 설정되지 않았습니다. Settings > Secrets 패널을 확인해 주세요.',
      });
      return;
    }

    const { imageBase64, mimeType, defaultDate } = (req.body ?? {}) as {
      imageBase64?: unknown;
      mimeType?: unknown;
      defaultDate?: unknown;
    };

    if (typeof imageBase64 !== 'string' || imageBase64.length === 0 || imageBase64.length > 14_000_000) {
      res.status(400).json({ error: '올바른 이미지 데이터를 전송해 주세요.' });
      return;
    }

    const normalizedMime = typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : '';
    if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedMime)) {
      res.status(400).json({ error: '지원하지 않는 이미지 형식입니다. (JPG, PNG, WEBP 지원)' });
      return;
    }

    const fallbackDate =
      typeof defaultDate === 'string' && DATE_PATTERN.test(defaultDate)
        ? defaultDate
        : getTodayDateString();

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime,
                data: imageBase64,
              },
            },
            {
              text: `이 이미지(영수증, 결제 내역 캡처, 은행 입출금 내역 등)에서 가계부에 등록할 거래 내역을 추출해 주세요.
날짜가 명확하지 않으면 "${fallbackDate}"를 사용하세요.
각 거래의 금액은 원화(KRW) 정수(양수)로 추출하고, 총 결제 금액이 있는 영수증은 대표 가맹점/내역 1건으로 정리하되 여러 건의 이체/카드 내역 목록 화면이면 각 행을 개별 항목으로 추출하세요.

허용된 category ID 목록:
- expense(지출): food(식비/카페), maintenance(관리비/공과금), telecom(통신비), insurance(보험료), loan(대출금), academy(학원비/교육), medical(병원비/약국), fuel(주유비), transport(대중교통/차량), family(가족모임/경조사), shopping(쇼핑/생활), leisure(문화/여가), etc_exp(기타 지출)
- income(수입): salary(급여/월급), allowance(용돈/부수입), invest(금융/투자), etc_inc(기타 수입)`,
            },
          ],
        },
        config: {
          systemInstruction:
            '당신은 한국어 가계부 내역 추출 도우미입니다. 이미지 속 영수증, 결제 문자, 은행 내역에서 정확한 날짜(YYYY-MM-DD), 수입/지출 구분, 가장 적절한 카테고리 ID, 간결한 상호/내용, 원화 정수 금액을 JSON 배열로 반환하세요.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: '"income" or "expense"',
                },
                amount: {
                  type: Type.INTEGER,
                  description: 'Positive integer amount in KRW.',
                },
                category: {
                  type: Type.STRING,
                  description: 'Category ID from the allowed list.',
                },
                title: {
                  type: Type.STRING,
                  description: 'Concise merchant name or description in Korean (max 100 chars).',
                },
                date: {
                  type: Type.STRING,
                  description: 'Date in YYYY-MM-DD format.',
                },
              },
              required: ['type', 'amount', 'category', 'title', 'date'],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      let parsed: unknown = [];
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = [];
      }

      const items = Array.isArray(parsed) ? (parsed as RawParsedItem[]) : [];
      const transactions = normalizeParsedItems(items, fallbackDate);

      if (transactions.length === 0) {
        res.status(422).json({
          error: '이미지에서 거래 내역을 찾지 못했습니다. 영수증이나 결제 내역이 선명한 이미지를 사용해 주세요.',
        });
        return;
      }

      res.json({ transactions });
    } catch (error) {
      console.error('Gemini parse-receipt error:', error);
      res.status(502).json({
        error: '이미지 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
