import type { CountryName, ItineraryItem } from './db';

type PdfJs = { getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<any> }; GlobalWorkerOptions: { workerSrc: string } };

declare global { interface Window { pdfjsLib?: PdfJs } }

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export async function loadPdfJs(): Promise<PdfJs> {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-tripdeck-pdfjs]`) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', () => reject(new Error('PDF parser failed to load.')), { once: true }); return; }
    const script = document.createElement('script');
    script.src = PDFJS_URL; script.async = true; script.dataset.tripdeckPdfjs = '1';
    script.onload = () => resolve(); script.onerror = () => reject(new Error('PDF parser could not load. Connect to the internet once and try again.'));
    document.head.appendChild(script);
  });
  if (!window.pdfjsLib) throw new Error('PDF parser did not initialize.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return window.pdfjsLib;
}

export async function extractPdfLines(file: File): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = (content.items || []).filter((x: any) => typeof x.str === 'string');
    const grouped = new Map<number, string[]>();
    for (const item of items) {
      const y = Math.round(Number(item.transform?.[5] || 0) / 3) * 3;
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y)!.push(item.str.trim());
    }
    const pageLines = [...grouped.entries()].sort((a,b) => b[0] - a[0]).map(([,parts]) => parts.filter(Boolean).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);
    lines.push(...pageLines);
  }
  return lines;
}

const monthMap: Record<string, number> = { jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,september:9 };
const countryDates: Record<CountryName, string[]> = {
  Malaysia: ['2026-08-22','2026-08-23','2026-08-24','2026-08-25','2026-08-26'],
  Singapore: ['2026-08-26','2026-08-27','2026-08-28','2026-08-29','2026-08-30'],
  Indonesia: ['2026-08-30','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04'],
};

function countryFromText(text: string, fallback: CountryName): CountryName {
  if (/singapore|changi|sentosa|marina bay|gardens by the bay/i.test(text)) return 'Singapore';
  if (/indonesia|jakarta|bali|soekarno|monas|kota tua/i.test(text)) return 'Indonesia';
  if (/malaysia|kuala lumpur|klcc|petronas|batu caves|bukit bintang/i.test(text)) return 'Malaysia';
  return fallback;
}
function dateFromLine(line: string): string | null {
  let m = line.match(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?)\b/i);
  if (!m) { const reverse = line.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?)\s+(\d{1,2})\b/i); if (reverse) m = ['', reverse[2], reverse[1]] as any; }
  if (!m) return null;
  const month = monthMap[m[2].toLowerCase()]; if (!month) return null;
  return `2026-${String(month).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
}
function timeFromLine(line: string): { time: string; rest: string } | null {
  const m = line.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?\s*[-–—:]?\s*(.*)$/);
  if (!m) return null;
  const obviousTime = Boolean(m[2] || m[3]); if (!obviousTime) return null;
  let hour = Number(m[1]), minute = Number(m[2] || 0); const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && hour < 12) hour += 12; if (ap === 'AM' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { time: `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`, rest: (m[4] || '').trim() };
}

function priceFromLines(lines: string[], country: CountryName): { amount?: number; currency?: string } {
  const text = lines.join(' ');
  const patterns: Array<[RegExp,string]> = [
    [/(?:SGD|S\$)\s*([\d,.]+)/i,'SGD'], [/(?:MYR|RM)\s*([\d,.]+)/i,'MYR'], [/(?:IDR|Rp\.?)\s*([\d,.]+)/i,'IDR']
  ];
  for (const [pattern,currency] of patterns) { const m=text.match(pattern); if (m) { const value=Number(m[1].replace(/,/g,'')); if (Number.isFinite(value)) return { amount:value, currency }; } }
  return { currency: country === 'Singapore' ? 'SGD' : country === 'Indonesia' ? 'IDR' : 'MYR' };
}

function likelyLocation(lines: string[], title: string): string {
  const explicit = lines.find(x => /^(?:location|venue|place|address)\s*:/i.test(x));
  if (explicit) return explicit.replace(/^[^:]+:\s*/,'').trim();
  const atLine = lines.find(x => /\b(?:at|@)\s+[A-Z0-9]/.test(x));
  if (atLine) return atLine.replace(/^.*?\b(?:at|@)\s+/i,'').trim();
  const candidate = lines.find(x => x !== title && /airport|hotel|mall|tower|garden|museum|market|restaurant|cafe|mosque|street|road|avenue|bay|park|caves|monument|station|terminal|sentosa|chinatown/i.test(x));
  return candidate || title;
}

export function parseItineraryLines(lines: string[], defaultCountry: CountryName): ItineraryItem[] {
  const clean = lines.map(x => x.trim()).filter(x => x.length > 1);
  let country = defaultCountry; let date: string | null = null; let dayIndex = 0;
  const entries: Array<{ country: CountryName; date: string; time: string; lines: string[] }> = [];
  let current: { country: CountryName; date: string; time: string; lines: string[] } | null = null;
  const flush = () => { if (current && current.lines.join(' ').trim()) entries.push(current); current = null; };
  for (const line of clean) {
    country = countryFromText(line, country);
    const explicitDate = dateFromLine(line); if (explicitDate) { flush(); date = explicitDate; continue; }
    const day = line.match(/^\s*day\s*(\d{1,2})\b/i); if (day) { flush(); dayIndex = Math.max(0, Number(day[1]) - 1); date = countryDates[country][dayIndex] || countryDates[country][0]; continue; }
    const timed = timeFromLine(line);
    if (timed) { flush(); if (!date) date = countryDates[country][dayIndex] || countryDates[country][0]; current = { country, date, time: timed.time, lines: timed.rest ? [timed.rest] : [] }; continue; }
    if (current) current.lines.push(line);
  }
  flush();

  // If the PDF has day/date sections but no explicit times, retain useful lines as a sensible editable schedule.
  if (!entries.length) {
    let fallbackDate = countryDates[defaultCountry][0]; let hour = 9;
    return clean.filter(x => !/^day\s*\d+/i.test(x) && !dateFromLine(x)).slice(0, 30).map((line, index) => {
      const c = countryFromText(line, defaultCountry); const d = dateFromLine(clean[Math.max(0,index-1)]) || fallbackDate; fallbackDate = d;
      const result: ItineraryItem = { id: crypto.randomUUID(), title: line.slice(0,100), location: line.slice(0,120), date:d, time:`${String(Math.min(21,hour)).padStart(2,'0')}:00`, country:c, notes:'Imported from itinerary PDF - review and edit if needed.', source:'pdf' };
      hour += 2; return result;
    });
  }

  return entries.map(entry => {
    const useful = entry.lines.filter(x => !/^\s*(notes?|details?|location|venue)\s*:/i.test(x));
    const title = (useful[0] || entry.lines[0] || 'Itinerary activity').replace(/^[-•]\s*/,'').slice(0,120);
    const location = likelyLocation(entry.lines, title).slice(0,180);
    const notes = entry.lines.filter(x => x !== title && x !== location).join(' · ').slice(0,800);
    const price = priceFromLines(entry.lines, entry.country);
    return { id: crypto.randomUUID(), title, location, date: entry.date, time: entry.time, country: entry.country, notes, source:'pdf', activityCost: price.amount, activityCurrency: price.amount != null ? price.currency : undefined } as ItineraryItem;
  });
}
