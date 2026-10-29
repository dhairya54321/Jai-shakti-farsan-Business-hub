import { getDatabase } from '../db/index.js';

// Gujarati numeral translation map
const GUJARATI_DIGITS = {
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
};

export function convertGujaratiDigitsToAscii(str) {
  return str.replace(/[૦-૯]/g, d => GUJARATI_DIGITS[d] || d);
}

// Spoken Gujarati words for numbers
const SPOKEN_GUJARATI_NUMBERS = [
  { word: 'દોઢસો', value: 150 },
  { word: 'અઢીસો', value: 250 },
  { word: 'સાડાત્રણસો', value: 350 },
  { word: 'સાડાચારસો', value: 450 },
  { word: 'પાંચસો', value: 500 },
  { word: 'ચારસો', value: 400 },
  { word: 'ત્રણસો', value: 300 },
  { word: 'બસો', value: 200 },
  { word: 'સો', value: 100 },
  { word: 'એકસો', value: 100 },
  { word: 'બે હજાર', value: 2000 },
  { word: 'ત્રણ હજાર', value: 3000 },
  { word: 'પાંચ હજાર', value: 5000 },
  { word: 'દસ હજાર', value: 10000 },
  { word: 'હજાર', value: 1000 }
];

export const VoiceParserService = {
  parseSpokenText(businessId, transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return { success: false, error: 'Empty transcript' };
    }

    const cleanInput = transcript.trim();
    let normalized = convertGujaratiDigitsToAscii(cleanInput).toLowerCase();

    const db = getDatabase();
    const categories = db.prepare('SELECT id, code, name_en, name_gu FROM expense_categories WHERE business_id = ? AND is_active = 1').all(businessId);
    const vendors = db.prepare('SELECT id, name FROM vendors WHERE business_id = ? AND is_active = 1').all(businessId);
    const workers = db.prepare('SELECT id, name, phone, diary_page FROM workers WHERE business_id = ? AND is_active = 1').all(businessId);

    let extractedAmount = null;
    let extractedPaymentMethod = null;
    let extractedCategoryId = null;
    let extractedVendorId = null;
    let extractedWorkerId = null;
    let extractedWorkerName = null;
    let extractedDate = null;
    let extractedDescription = cleanInput;

    // 1. Check spoken Gujarati numbers
    for (const spoken of SPOKEN_GUJARATI_NUMBERS) {
      if (cleanInput.includes(spoken.word)) {
        extractedAmount = spoken.value;
        break;
      }
    }

    // 2. Extract numeric amount via regex (e.g. 150, 450.50, 5000)
    if (!extractedAmount) {
      // Look for patterns like "150 રૂપિયા", "₹ 450", "450 rs", "450 rupees", or isolated digits
      const amountRegex = /(?:₹|rs\.?|rupees|રૂપિયા|રૂ)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|rupees|રૂપિયા|રૂ)?/i;
      const match = normalized.match(amountRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0) {
          extractedAmount = val;
        }
      }
    }

    // 3. Extract Payment Method
    if (/રોકડ|રોકડા|કેશ|cash/i.test(normalized)) {
      extractedPaymentMethod = 'cash';
    } else if (/યુપીઆઈ|યુપીઆઇ|જીપે|ફોનપે|પેટીએમ|upi|gpay|phonepe|paytm/i.test(normalized)) {
      extractedPaymentMethod = 'upi';
    } else if (/બેંક|ચેક|ટ્રાન્સફર|નેફ્ટ|આરટીજીએસ|bank|neft|rtgs|cheque/i.test(normalized)) {
      extractedPaymentMethod = 'bank_transfer';
    } else if (/કાર્ડ|સ્વાઇપ|card/i.test(normalized)) {
      extractedPaymentMethod = 'card';
    } else if (/ઉધાર|બાકી|credit|udhar/i.test(normalized)) {
      extractedPaymentMethod = 'credit';
    } else {
      extractedPaymentMethod = 'cash'; // Most common retail fallback
    }

    // 4. Extract Category
    const categoryKeywords = [
      { code: 'tea_refreshment', keywords: ['ચા', 'નાસ્તો', 'ચા-પાણી', 'કોફી', 'બિસ્કિટ', 'tea', 'refreshment', 'coffee', 'breakfast', 'snacks'] },
      { code: 'transport_delivery', keywords: ['ટ્રાન્સપોર્ટ', 'ડિલિવરી', 'ભાડું', 'રિક્ષા', 'ટેમ્પો', 'પેટ્રોલ', 'ડીઝલ', 'transport', 'delivery', 'auto', 'tempo', 'diesel', 'petrol', 'fuel', 'fare'] },
      { code: 'electricity_utilities', keywords: ['વીજળી', 'લાઈટ બિલ', 'લાઈટબિલ', 'પાણી બિલ', 'electricity', 'light bill', 'utility', 'power bill'] },
      { code: 'raw_materials', keywords: ['કાચો માલ', 'બેસન', 'તેલ', 'મેંદો', 'મસાલા', 'મરચું', 'હળદર', 'મીઠું', 'સીંગતેલ', 'કપાસિયા', 'besan', 'oil', 'flour', 'spices', 'raw material'] },
      { code: 'packaging_materials', keywords: ['પેકિંગ', 'બોક્સ', 'પાઉચ', 'ઝભલા', 'થેલી', 'packaging', 'box', 'boxes', 'pouch', 'pouches', 'bag', 'bags'] },
      { code: 'worker_wages', keywords: ['મજૂરી', 'કારીગર પગાર', 'પગાર', 'રોજ', 'salary', 'wages', 'worker wage'] },
      { code: 'worker_advance_upad', keywords: ['ઉપાડ', 'એડવાન્સ', 'કારીગર ઉપાડ', 'upad', 'advance', 'worker advance'] },
      { code: 'repairs_maintenance', keywords: ['રિપેરિંગ', 'સમારકામ', 'ગેસ સિલિન્ડર', 'સિલિન્ડર', 'ગેસ', 'વાહિંગ', 'સર્વિસ', 'repair', 'gas', 'cylinder', 'maintenance'] },
      { code: 'cleaning_supplies', keywords: ['સફાઈ', 'સાબુ', 'ફિનાઈલ', 'ઝાપટણ', 'પોતા', 'cleaning', 'soap', 'phenyl', 'broom'] },
      { code: 'vegetable_purchase', keywords: ['શાકભાજી', 'બટેટા', 'ડુંગળી', 'કોથમરી', 'મરચાં', 'લીલા મરચાં', 'આદુ', 'શાક', 'vegetable', 'vegetables', 'potatoes', 'onions', 'chillies', 'coriander', 'ginger'] },
      { code: 'finished_goods', keywords: ['તૈયાર માલ', 'રેડીમેડ', 'પેક્ડ નાસ્તો', 'finished goods', 'readymade'] },
      { code: 'rent', keywords: ['દુકાન ભાડું', 'ગોડાઉન ભાડું', 'ભાડું', 'rent', 'shop rent'] },
      { code: 'phone_internet', keywords: ['ઇન્ટરનેટ', 'વાઇફાઇ', 'ફોન રિચાર્જ', 'મોબાઈલ', 'recharge', 'internet', 'wifi', 'phone'] }
    ];

    for (const item of categoryKeywords) {
      for (const kw of item.keywords) {
        if (normalized.includes(kw)) {
          const matchedCat = categories.find(c => c.code === item.code);
          if (matchedCat) {
            extractedCategoryId = matchedCat.id;
            break;
          }
        }
      }
      if (extractedCategoryId) break;
    }

    // Fallback category if not found
    if (!extractedCategoryId) {
      const generalCat = categories.find(c => c.code === 'other_operating' || c.code === 'general_other');
      if (generalCat) extractedCategoryId = generalCat.id;
    }

    // 5. Extract Worker (for worker advance / wages)
    const cleanForWorker = normalized
      .replace(/[0-9]/g, ' ')
      .replace(/\b(upad|advance|cash|paid|pay|rs|inr|salary|wage|bhai|ben|maharaj|katila|karigar)\b/gi, ' ')
      .replace(/(ઉપાડ|એડવાન્સ|રોકડ|રોકડા|રૂપિયા|પગાર|ભાઈ|બેન|મહારાજ|કારીગર|કાતીલા|આપ્યા|આપ્યો)/g, ' ')
      .trim();
    const workerTokens = cleanForWorker.split(/[\s,()/-]+/).filter(p => p.length >= 2);

    for (const w of workers) {
      const cleanWorkerName = (w.name || '').toLowerCase();
      const wParts = cleanWorkerName.split(/[\s,()/-]+/).filter(p => p.length >= 2);
      for (const tok of workerTokens) {
        const isMatch = wParts.some(p => p.includes(tok) || tok.includes(p) || (p.length >= 3 && tok.length >= 3 && (p.startsWith(tok.slice(0, 3)) || tok.startsWith(p.slice(0, 3)))));
        if (isMatch) {
          extractedWorkerId = w.id;
          extractedWorkerName = w.name;
          break;
        }
      }
      if (extractedWorkerId) break;
    }

    // If worker recognized, prefer worker_advance_upad category if not already set
    if (extractedWorkerId && (!extractedCategoryId || extractedCategoryId === categories.find(c => c.code === 'other_operating')?.id)) {
      const workerCat = categories.find(c => c.code === 'worker_advance_upad');
      if (workerCat) extractedCategoryId = workerCat.id;
    }

    // 6. Extract Vendor
    for (const v of vendors) {
      const cleanVendorName = v.name.toLowerCase();
      // Match keywords from vendor name
      const nameParts = cleanVendorName.split(/[\s,()/-]+/).filter(p => p.length > 2);
      for (const part of nameParts) {
        if (normalized.includes(part)) {
          extractedVendorId = v.id;
          break;
        }
      }
      if (extractedVendorId) break;
    }

    // 7. Extract Date
    const todayStr = new Date().toISOString().slice(0, 10);
    if (/ગઈકાલે|yesterday/i.test(normalized)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      extractedDate = d.toISOString().slice(0, 10);
    } else {
      extractedDate = todayStr;
    }

    return {
      success: true,
      raw_transcript: cleanInput,
      extracted: {
        amount: extractedAmount,
        category_id: extractedCategoryId,
        payment_method: extractedPaymentMethod,
        transaction_date: extractedDate,
        vendor_id: extractedVendorId,
        worker_id: extractedWorkerId,
        worker_name: extractedWorkerName,
        description: cleanInput
      },
      confidence: (extractedAmount && (extractedCategoryId || extractedWorkerId)) ? 'high' : (extractedAmount ? 'medium' : 'low')
    };
  }
};

export default VoiceParserService;
