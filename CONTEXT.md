# BruLogger Domain Context

## Glossary

### Brew
The core entity of the application. A single logged coffee brewing session, capturing what coffee was used, how it was prepared, and how it tasted. Every piece of data in the app belongs to a Brew.

### FlavorProfile
The five-axis tasting assessment recorded on every Brew: **Aromatics**, **Acidity**, **Sweetness**, **Aftertaste**, and **Body**. Each axis is scored 1–5 in 0.5-step increments and visualised as a radar chart.

### BrewMethod
The preparation technique used for a Brew. One of: Pour Over, French Press, Espresso, AeroPress, Cold Brew, Other. Required on every Brew.

### RoastLevel
The degree of roast of the beans used in a Brew: Light, Medium-Light, Medium, Medium-Dark, Dark. Optional.

### Rating
An overall 1–5 star quality score for a Brew, supporting half-star increments. Optional — not every brew needs to be rated.

### Flavor Notes
Free-text tasting descriptors on a Brew (e.g. "blueberry, jasmine"). Distinct from the FlavorProfile: notes are what it tasted *like*, the profile is *how much* of each attribute. Optional, and included in list search.

### General Notes
Free-text notes about the Brew that aren't tasting descriptors (technique tweaks, what to try next). Optional.

### Brew Parameters
The measurable recipe of a Brew: grind size (free text), water temperature (°C), dose (g of coffee), yield (g of liquid out), and brew time (whole seconds). All optional.

### Photo
An optional single image attached to a Brew, stored in the `brew-photos` Supabase Storage bucket. Photos are publicly readable by URL, but only their owner can upload or delete them.

### BrewInsert
The data shape used when creating or updating a Brew. Identical to Brew minus the server-generated fields (id, user_id, created_at). Unset optional fields are `null`.
