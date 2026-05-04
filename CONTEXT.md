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

### BrewInsert
The data shape used when creating or updating a Brew. Identical to Brew minus the server-generated fields (id, user_id, created_at).
