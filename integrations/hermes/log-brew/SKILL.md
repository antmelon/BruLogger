---
name: log-brew
description: Log a coffee brew to BruLogger from a Telegram message, from text ("V60, Guji natural, 15g/250g, 3:10, blueberry, 4.5 stars"), a photo of the coffee bag, a photo of the brew, or any mix. Also fixes or deletes a logged brew ("actually it was 16g", "delete that last one") and answers questions about past brews ("what did I brew yesterday?", "same as last time but finer").
version: 1.2.0
author: Ant
prerequisites:
  commands: [curl]
metadata:
  hermes:
    tags: [Coffee, BruLogger, Journal, Logging]
    homepage: https://brulogger.vercel.app
---

# Log a brew to BruLogger

BruLogger is Ant's coffee journal. This skill turns a message into a brew entry through its HTTP API. Every brew belongs to a **coffee**: a bag of beans, with its name, roaster, origin and the other details printed on it, plus its roast date and size. The API finds the coffee from the details you send, or saves a new one. Run the API calls with the `terminal` tool. The source of truth for this skill is `integrations/hermes/log-brew/SKILL.md` in the brulogger repo.

## API

Base URL: `https://brulogger.vercel.app/api/brews`. Auth header: `Authorization: Bearer $BRULOGGER_API_TOKEN` (from the environment; never echo it).

- `GET /api/brews?limit=10&since=<ISO 8601>&q=<text>`: brews, newest first (limit max 50). `q` matches the coffee's name, roaster or origin (case-insensitive substring). Returns `{ "brews": [...] }`. Each brew has its coffee as `coffee` (`id`, `name`, `roaster`, `origin`, `roast_level`, `varietal`, `processing_method`, `roaster_notes`, `roast_date`, `bag_size_g`, `finished_at`); read coffee details from there.
- `GET /api/brews/<id>`: one brew. Returns `{ "brew": {...} }`.
- `POST /api/brews?dry_run=1`: validates and normalizes without saving. Returns `{ "brew": {...} }`, where `brew.coffee` is the existing coffee it will use, or the new one it will create (`"id": null`).
- `POST /api/brews` with header `Idempotency-Key: <key>`: saves. Returns `201 { "brew": {...} }`. If a brew was already saved under that key, it returns `200 { "brew": {...}, "replayed": true }` and saves nothing.
- `PATCH /api/brews/<id>`: changes only the fields sent; `null` clears a field. `"photo": {...}` replaces the photo, `"photo": null` removes it. `coffee_id`, `coffee_name`, `brew_method` and `created_at` can be changed but not cleared. Returns `{ "brew": {...} }`. Coffee fields work differently, see "Fixing or deleting a logged brew".
- `DELETE /api/brews/<id>`: deletes the brew and its photo. Returns `{ "deleted": {...} }`.

Errors return `{ "error": "...", "details": ["..."] }`. On `400`, fix the fields named in `details` (ask Ant if needed) and retry; nothing was written. `404` means no brew with that id. Never invent values to get past validation.

```sh
curl -sS -X POST "https://brulogger.vercel.app/api/brews?dry_run=1" \
  -H "Authorization: Bearer $BRULOGGER_API_TOKEN" -H "Content-Type: application/json" \
  --data @brew.json
```

## Fields (JSON body)

The coffee comes either as `coffee_id` (from a brew you looked up) or as its details (the `coffee_name` group below), never both. Details are matched to one of Ant's coffees by name and roaster, ignoring case; a different `roast_date` means a different bag. A match gets any details it was missing filled in, never changed. No match saves a new coffee.

| Field | Type | Notes |
|---|---|---|
| `coffee_id` | string | An existing coffee's `id`, e.g. `brew.coffee.id` from a lookup. Use it for "same as last time" |
| `coffee_name` | string | **Required unless `coffee_id`.** The coffee's name as printed, e.g. "Ethiopia Guji Hambela" |
| `brew_method` | enum | **Required.** One of `Pour Over`, `French Press`, `Espresso`, `AeroPress`, `Cold Brew`, `Other`. V60/Chemex/Kalita/Origami → `Pour Over`; moka pot/siphon/Clever → `Other` (mention the device in `general_notes`) |
| `roaster` | string | |
| `origin` | string | Country/region |
| `roast_level` | enum | `Light`, `Medium-Light`, `Medium`, `Medium-Dark`, `Dark`. Only if stated or printed on the bag |
| `varietal` | string | e.g. "Heirloom", "Gesha, Bourbon" |
| `processing_method` | string | e.g. "Washed", "Natural", "Honey" |
| `roaster_notes` | string | Tasting notes printed on the bag: "blueberry, jasmine". Not `flavor_notes` |
| `roast_date` | date | `YYYY-MM-DD`, from the bag. Only if printed or stated; not in the future |
| `bag_size_g` | number | Grams in the bag ("12 oz" → 340, "250g" → 250) |
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
   - **Bag/label photo:** extract `coffee_name`, `roaster`, `origin`, `varietal`, `processing_method`, `roast_level`, `roaster_notes`, `roast_date` and `bag_size_g`. Roaster tasting notes go in `roaster_notes`, *not* `flavor_notes` (those are what Ant tasted). Don't attach a label photo unless Ant asks.
   - **Brew/cup photo:** attach it as `photo`.
   - **Unclear which:** ask.
2. **"Same as last time"** or a missing coffee name with context: `GET ?limit=5` (or `?q=<coffee or roaster>` when one is named) and reuse the matching brew's `coffee.id` as `coffee_id`, plus its recipe, applying the changes Ant mentions. If that coffee has `finished_at` set, ask whether it's a new bag (then send the details, with the new `roast_date` if known).
3. **Fill the gaps.** If `coffee_name` or `brew_method` is still unknown, ask one short question. Leave everything else out rather than guessing.
4. **Dry run.** Build the JSON, `POST ?dry_run=1`, and fix any `400` details.
5. **Confirm.** Reply with a one-to-two line summary of the normalized brew and ask to save, e.g.
   `Log this? Ethiopia Guji Hambela (Onyx) · Pour Over · 15g → 250g · 93°C · 3:10 · ★4.5 · blueberry, jasmine 📷`
   When the dry run's `brew.coffee.id` is `null`, add "(new coffee)" after the name so Ant can catch a misspelling that would split one bag into two.
   Apply corrections and re-confirm if Ant edits anything.
6. **Save.** `POST` without `dry_run`, with an `Idempotency-Key` header: a new random key per brew (e.g. from `uuidgen`), made once when you build the draft. If the request fails or times out, retry with the **same** key; the API won't save it twice. Reply "Logged ✓" plus anything notable.

## Fixing or deleting a logged brew

1. **Find it.** "That one" / "the last one" is `GET ?limit=1`; otherwise `GET ?limit=5` or `?q=<coffee>`. If more than one brew could match, ask which (name and date).
2. **Confirm.** Fix: show the change, e.g. `Change Guji Hambela (Oct 8): dose 15g → 16g?`. Delete: `Delete Guji Hambela (Pour Over, Oct 8)?`. Wait for a yes.
   Coffee details belong to the coffee, not the brew:
   - Changing `origin`, `roast_level`, `varietal`, `processing_method`, `roaster_notes`, `roast_date` or `bag_size_g` edits the coffee, so it changes for **every** brew of it. Say so when confirming: `Change the origin of Guji Hambela (all 12 brews) to Ethiopia?`.
   - A different `coffee_name` or `roaster` (or `coffee_id`) means "this brew was a different coffee": the brew moves to that coffee, found or created.
3. **Apply.** `PATCH /api/brews/<id>` with only the changed fields, or `DELETE /api/brews/<id>`. Reply "Updated ✓" / "Deleted ✓".

## Photos

Telegram photos are usually well under the limit. If a photo exceeds 3 MB, downscale it (longest edge ~1600 px, JPEG quality ~80) before base64-encoding. Build the JSON in a file and send it with `--data @file`; base64 photos are too long for a command-line argument.
