import { z } from 'zod';
import sharp from 'sharp';

export const customId = z.string().regex(/^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const nutrient = max => z.union([z.number(), z.string().max(20).regex(/^(?:\d+(?:\.\d*)?|\.\d+)$/), z.literal(''), z.null()]).optional().transform(value => value === '' || value == null ? null : Number(value)).pipe(z.number().finite().min(0).max(max).nullable());
const url = z.string().trim().max(2000).refine(value => !value || (() => { try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; } })());
export const productSchema = z.object({
  name: z.string().trim().min(1).max(120), brand: z.string().trim().min(1).max(120), category: z.string().trim().min(1).max(120),
  serving: z.enum(['100 g', '100 ml']), calories: nutrient(1000), protein: nutrient(100), carbs: nutrient(100), sugar: nutrient(100), fat: nutrient(100), saturatedFat: nutrient(100), fiber: nutrient(100), salt: nutrient(100),
  ingredientsText: z.string().trim().min(1).max(10000), allergensText: z.string().max(2000).optional().default(''), tracesText: z.string().max(2000).optional().default(''),
  sourceUrl: url.optional().default(''), image: z.string().max(820000).nullable().optional().default(''),
}).strict().refine(input => Buffer.byteLength(JSON.stringify({ ...input, image: undefined }), 'utf8') <= 40000).refine(input => !(input.sugar != null && input.carbs != null && input.sugar > input.carbs) && !(input.saturatedFat != null && input.fat != null && input.saturatedFat > input.fat) && !(input.serving === '100 g' && (input.protein || 0) + (input.carbs || 0) + (input.fat || 0) > 101));

let decoding = 0;
sharp.cache(false);
export async function decodeImage(value) {
  if (!value) return null;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) throw new Error('INVALID_IMAGE');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 600 * 1024 || buffer.toString('base64') !== match[2]) throw new Error('INVALID_IMAGE');
  if (decoding >= 2) { const error = new Error('IMAGE_BUSY'); error.status = 503; throw error; }
  decoding += 1;
  try {
    const decoder = sharp(buffer, { limitInputPixels: 16000000, failOn: 'warning', animated: false });
    const metadata = await decoder.metadata();
    if (metadata.format !== ({ png: 'png', jpeg: 'jpeg', webp: 'webp' })[match[1]] || (metadata.pages || 1) !== 1) throw new Error('INVALID_IMAGE');
    const output = await decoder.rotate().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    if (output.length > 600 * 1024) throw new Error('INVALID_IMAGE');
    return output;
  } finally { decoding -= 1; }
}
