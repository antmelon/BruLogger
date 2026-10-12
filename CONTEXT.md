# BruLogger Domain Context

## Glossary

### Brew
The core entity of the application. A single logged coffee brewing session: which Coffee was used, how it was prepared, and how it tasted. Every Brew belongs to exactly one Coffee.

### Coffee
A bag of beans the user owns: its name, roaster, origin, RoastLevel, varietal, processing method and Roaster's Tasting Notes, plus its roast date and bag size. Details of the beans belong to the Coffee, not to each Brew, so editing them changes every Brew of it. Buying the same coffee again is a new Coffee (a different roast date means a different bag). A Coffee is **in use** until it's marked **finished**; finished ones drop out of the brew form's choices. A Coffee that has Brews can't be deleted, only finished.

### Roaster's Tasting Notes
The tasting notes printed on a Coffee's bag ("blueberry, jasmine"). Distinct from Flavor Notes, which are what the user tasted in a Brew.

### Days Since Roast
Calendar days from a Coffee's roast date to a given day: today on the Coffees tab, or the day a Brew was made on its detail ("11 days off roast").

### Grams Left
A Coffee's bag size minus the doses of its Brews. Brews without a dose count as nothing, so it's an estimate. **Running low** means two average doses or less left.

### FlavorProfile
An optional five-axis tasting assessment of a Brew: **Aromatics**, **Acidity**, **Sweetness**, **Aftertaste**, and **Body**. Each axis is scored 1–5 in 0.5-step increments and visualised as a radar chart. A profile is all five axes or none: a Brew whose taster didn't score it has no profile (not default scores), so averages only include brews that were actually scored.

### BrewMethod
The preparation technique used for a Brew. One of: Pour Over, French Press, Espresso, AeroPress, Cold Brew, Other. Required on every Brew.

### RoastLevel
The degree of roast of a Coffee: Light, Medium-Light, Medium, Medium-Dark, Dark. Optional.

### Rating
An overall 1–5 star quality score for a Brew, supporting half-star increments. Optional — not every brew needs to be rated.

### Flavor Notes
Free-text tasting descriptors on a Brew (e.g. "blueberry, jasmine"). Distinct from the FlavorProfile: notes are what it tasted *like*, the profile is *how much* of each attribute. Optional, and included in list search.

### General Notes
Free-text notes about the Brew that aren't tasting descriptors (technique tweaks, what to try next). Optional.

### Brew Parameters
The measurable recipe of a Brew: grind size (free text), water temperature (°C), dose (g of coffee), yield (g of liquid out), and brew time (whole seconds). All optional.

### Photo
An optional single image attached to a Brew, stored in the private `brew-photos` Supabase Storage bucket. Only its owner can view, upload or delete it; the app shows it through a short-lived signed link.

### BrewInsert
The data shape used when creating or updating a Brew: its own fields plus `coffee_id`, minus the server-generated fields (id, user_id, created_at). Unset optional fields are `null`. A Coffee's equivalent is CoffeeInsert.
