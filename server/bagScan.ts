import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

// Snap the bag: Claude reads a photo of a coffee bag, through Vercel's AI Gateway, and returns
// what's printed on it. lib/bagScan.ts checks and converts the answer for the coffee form. This
// file imports nothing from the repo, so a script can run it directly with Node (which strips the
// types), e.g. to compare models on real photos.

const GATEWAY_URL = 'https://ai-gateway.vercel.sh';

/** The model unless BAG_SCAN_MODEL names another: an AI Gateway id, provider/model. */
export const DEFAULT_BAG_SCAN_MODEL = 'anthropic/claude-opus-5.5';

/** What the model returns; the same shape as BagScan in lib/bagScan.ts. Roast levels as in types/index.ts. */
export const BagScanSchema = z.object({
  is_coffee_bag: z.boolean(),
  name: z.string().nullable(),
  roaster: z.string().nullable(),
  origin: z.string().nullable(),
  roast_level: z.enum(['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark']).nullable(),
  varietal: z.string().nullable(),
  process: z.string().nullable(),
  tasting_notes: z.string().nullable(),
  roast_date: z.string().nullable(),
  bag_size: z.string().nullable(),
});

const INSTRUCTIONS = `You read photos of coffee bags for a coffee journal app, so the person doesn't have to type the coffee's details in. Copy only what is printed on the bag or its label. Use null for anything the photo doesn't show, and don't fill gaps from what you know about the coffee or the roaster.

- is_coffee_bag: false if the photo doesn't show a coffee bag, box, tin or label. Then every other field is null.
- name: the coffee's name as the roaster gives it, such as "Guji Hambela" or "Holiday Blend". Not the roaster's name, unless that's the only name on the bag.
- roaster: the company that roasted it.
- origin: the country, plus the region when it's printed, such as "Ethiopia, Guji". For a blend, the countries listed.
- roast_level: only when the bag states one. Use the closest allowed value ("light-medium" is Medium-Light). Words like "espresso roast" or "filter roast" aren't roast levels.
- varietal: such as "Heirloom" or "Gesha, Bourbon".
- process: such as "Washed", "Natural", "Honey" or "Anaerobic natural".
- tasting_notes: the roaster's tasting notes printed on the bag, separated by commas, such as "blueberry, jasmine, cocoa".
- roast_date: when it was roasted, as YYYY-MM-DD. Only a date marked as the roast date, never a best-by or expiry date. If the year isn't printed, use the latest such date that isn't after today. Read a numeric date in the order the roaster's country writes dates (day first in most of Europe, month first in the United States).
- bag_size: the net weight exactly as printed, such as "12 oz" or "250 g".`;

export interface BagReading {
  /** null when the model declined or its answer couldn't be read */
  scan: z.infer<typeof BagScanSchema> | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ReadBagOptions {
  /** base64, without a data: prefix */
  image: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Authenticates to the AI Gateway: the function's OIDC token, or an AI Gateway API key */
  token: string;
  /** The person's date, YYYY-MM-DD, for roast dates printed without a year */
  today: string;
  model?: string;
}

/** Asks the model what's printed on the bag. Throws the SDK's errors (Anthropic.APIError) as they come. */
export async function readBag({ image, mimeType, token, today, model = DEFAULT_BAG_SCAN_MODEL }: ReadBagOptions): Promise<BagReading> {
  const client = new Anthropic({ apiKey: null, authToken: token, baseURL: GATEWAY_URL, timeout: 60_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model,
    max_tokens: 4000,
    system: INSTRUCTIONS,
    // Copying a label needs little reasoning
    output_config: { effort: 'low', format: zodOutputFormat(BagScanSchema) },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
        { type: 'text', text: `Today is ${today}. What's printed on this coffee bag?` },
      ],
    }],
  });
  return {
    scan: response.stop_reason === 'refusal' ? null : response.parsed_output,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
