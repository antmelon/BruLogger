---
name: log-brew
description: Log a coffee brew to BruLogger from a Telegram message, from text ("V60, Guji natural, 15g/250g, 3:10, blueberry, 4.5 stars"), a photo of the coffee bag, a photo of the brew, or any mix. Also answers questions about recent brews ("what did I brew yesterday?", "same as last time but finer").
version: 1.0.0
author: Ant
prerequisites:
  commands: [curl]
metadata:
  hermes:
    tags: [Coffee, BruLogger, Journal, Logging]
    homepage: https://brulogger.vercel.app
---

# Log a brew to BruLogger

BruLogger is Ant's coffee journal. This skill turns a message into a brew entry through its HTTP API. Run the API calls with the `terminal` tool. The source of truth for this skill is `integrations/hermes/log-brew/SKILL.md` in the brulogger repo.

## API

Base URL: `https://brulogger.vercel.app/api/brews`. Auth header: `Authorization: Bearer $BRULOGGER_API_TOKEN` (from the environment; never echo it).

- `GET /api/brews?limit=10&since=<ISO 8601>`: recent brews, newest first (limit max 50). Returns `{ "brews": [...] }`.
- `POST /api/brews?dry_run=1`: validates and normalizes without saving. Returns `{ "brew": {...} }`.
- `POST /api/brews`: saves. Returns `201 { "brew": {...} }`.

Errors return `{ "error": "...", "details": ["..."] }`. On `400`, fix the fields named in `details` (ask Ant if needed) and retry. Never invent values to get past validation.

```sh
curl -sS -X POST "https://brulogger.vercel.app/api/brews?dry_run=1" \
  -H "Authorization: Bearer $BRULOGGER_API_TOKEN" -H "Content-Type: application/json" \
  --data @brew.json
```

## Fields (JSON body)

| Field | Type | Notes |
|---|---|---|
| `coffee_name` | string | **Required.** The coffee's name as printed, e.g. "Ethiopia Guji Hambela" |
| `brew_method` | enum | **Required.** One of `Pour Over`, `French Press`, `Espresso`, `AeroPress`, `Cold Brew`, `Other`. V60/Chemex/Kalita/Origami → `Pour Over`; moka pot/siphon/Clever → `Other` (mention the device in `general_notes`) |
| `roaster` | string | |
| `origin` | string | Country/region |
| `roast_level` | enum | `Light`, `Medium-Light`, `Medium`, `Medium-Dark`, `Dark`. Only if stated or printed on the bag |
| `varietal` | string | e.g. "Heirloom", "Gesha, Bourbon" |
| `processing_method` | string | e.g. "Washed", "Natural", "Honey" |
| `grind_size` | string | Free text: "Medium-fine", "Comandante 22 clicks" |
| `water_temp_c` | number | °C; convert °F |
| `dose_g` | number | Grams of coffee in |
| `yield_g` | number | Grams of beverage/water out. "15g/250g" → dose 15, yield 250; "1:16 with 15g" → yield 240 |
| `brew_time_s` | integer | Seconds; "3:10" → 190 |
| `flavor_notes` | string | Tasting descriptors: "blueberry, jasmine, cocoa" |
| `general_notes` | string | Everything else worth keeping (technique, device, what to change next time) |
| `rating` | number | 1–5, half steps. Only if Ant gives one; don't infer from adjectives |
| `flavor_profile` | object | All five keys or omit entirely: `aromatics`, `acidity`, `sweetness`, `aftertaste`, `body`, each 1–5 in half steps. Only if Ant scores them |
| `created_at` | ISO 8601 | Only when the brew wasn't just now ("this morning", "yesterday"). Ant is in US Eastern time; include the offset |
| `photo` | object | `{ "data": "<base64>", "mime_type": "image/jpeg" }` (jpeg/png/webp/heic, ≤ 3 MB decoded) |

Unknown fields are rejected, so use these names exactly.

## Workflow

1. **Gather.** Read the text and look at any photo.
   - **Bag/label photo:** extract `coffee_name`, `roaster`, `origin`, `varietal`, `processing_method`, `roast_level` and roaster tasting notes. Roaster tasting notes are *not* `flavor_notes` (those are what Ant tasted); put them in `general_notes` as "Roaster notes: ...". Don't attach a label photo unless Ant asks.
   - **Brew/cup photo:** attach it as `photo`.
   - **Unclear which:** ask.
2. **"Same as last time"** or a missing coffee name with context: `GET ?limit=5` and reuse the matching brew's coffee fields and recipe, applying the changes Ant mentions.
3. **Fill the gaps.** If `coffee_name` or `brew_method` is still unknown, ask one short question. Leave everything else out rather than guessing.
4. **Dry run.** Build the JSON, `POST ?dry_run=1`, and fix any `400` details.
5. **Confirm.** Reply with a one-to-two line summary of the normalized brew and ask to save, e.g.
   `Log this? Ethiopia Guji Hambela (Onyx) · Pour Over · 15g → 250g · 93°C · 3:10 · ★4.5 · blueberry, jasmine 📷`
   Apply corrections and re-confirm if Ant edits anything.
6. **Save.** `POST` without `dry_run`. Reply "Logged ✓" plus anything notable. Don't post twice on a retry: if unsure whether a save landed, `GET ?limit=1` first.

## Photos

Telegram photos are usually well under the limit. If a photo exceeds 3 MB, downscale it (longest edge ~1600 px, JPEG quality ~80) before base64-encoding. Build the JSON in a file and send it with `--data @file`; base64 photos are too long for a command-line argument.
