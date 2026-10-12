# App Store

What the App Store listing says and how to fill in the parts of App Store Connect that can't live in this repo. Keep all of it true to the app and to the [privacy policy](https://brulogger.com/privacy): when one changes, check the others.

## Listing (`store.config.json`)

The name, subtitle, description, keywords, promotional text, URLs, categories (Food & Drink, then Lifestyle) and age rating answers are in [`store.config.json`](../store.config.json), in [EAS Metadata](https://docs.expo.dev/eas/metadata/) format. Once the app exists in App Store Connect, push them with `npx eas-cli metadata:push`, or pull what's there with `metadata:pull`. Apple's limits: name and subtitle 30 characters, keywords 100 characters in total, promotional text 170, description 4000.

The keywords skip words that are already in the name or subtitle (coffee, journal, log, rate, brew), because Apple indexes those anyway.

## App Review information

Entered in App Store Connect, not kept here, because Apple requires a phone number.

- **Contact:** Anthony Longo, support@brulogger.com, plus a phone number.
- **Sign-in required:** no demo account. Reviewers sign in with Apple, which creates a new, empty account.
- **Notes:**

  > BruLogger is a personal coffee journal. No demo account is needed: sign in with Apple (or Google) on the first screen, which creates a new, empty account. Tap "+ Log Brew" to add a brew; the My Brews, Analytics and Profile tabs fill in as brews are added. Brews and photos are private to each account and never shown to other users. To delete the account and all its data: Profile > Delete Account. For an account that signed in with Apple, the app asks to confirm with Apple, then revokes its Sign in with Apple token before deleting anything.

## App Privacy (the privacy "nutrition label")

App Store Connect → App Privacy. EAS Metadata can't set this, so it's entered by hand. These answers match the privacy policy.

**Does this app collect data?** Yes. **Is any of it used for tracking?** No.

| Data type | Linked to the user | Used for tracking | Purpose |
| --- | --- | --- | --- |
| Contact Info → Name | Yes | No | App Functionality |
| Contact Info → Email Address | Yes | No | App Functionality |
| User Content → Photos or Videos | Yes | No | App Functionality |
| User Content → Other User Content | Yes | No | App Functionality |
| Identifiers → User ID | Yes | No | App Functionality |
| Diagnostics → Crash Data | No | No | App Functionality |

Why each:

- **Name and email:** from Google or Apple sign-in. With Apple's Hide My Email, the address is a relay address, but it's still an email address. Google also shares a profile picture link, which counts under Photos.
- **Photos:** the photos people add to brews.
- **Other user content:** the brews themselves: ratings, flavor profiles, notes.
- **User ID:** the account ID that the brews belong to.
- **Crash data:** Sentry crash reports. They're "not linked" because they carry no account, user or brew IDs, no name, email or IP address, and IDs are scrubbed from URLs and messages (`lib/crashReports.ts`). Keep it that way, or change this answer.

**Not collected:** location, contacts, health, financial info, browsing or search history (searching your brews happens on the device), purchases, usage data or analytics, sensitive info, and anything for advertising. IP addresses in the hosting and sign-in logs aren't used to work out location or for anything beyond running the service.

## Age rating

Every content question is "None" or "No", which rates the app 4+. Two answers worth explaining:

- **User-generated content: No.** People do write brews and add photos, but only their author ever sees them. Nothing is shared or shown to other users.
- **Unrestricted web access: No.** The only in-app browser is Google's sign-in page (Sign in with Apple uses the system's Apple sheet).

The terms still require users to be 13 or older. That's about collecting children's data, not about the content rating.

## Screenshots

One set for 6.9-inch iPhones (1320 × 2868), which App Store Connect also uses for smaller iPhones. EAS Metadata can't upload screenshots, so they're added by hand in App Store Connect. The first three show in search results, so order matters. The 1.0 set, taken 2026-10-12 from a TestFlight build on an iPhone 17 Pro, uses real brews: My Brews, a brew's photo, its flavor chart and notes, Analytics, the average flavor profile, and the edit form's flavor sliders. An iPhone 17 Pro screenshot is 1206 × 2622 (6.3-inch). Scaled to 1320 wide it's 1320 × 2870, so a pixel comes off the top and bottom. Save them as sRGB without an alpha channel.

iPhone-only for now (decided 2026-10-11, `ios.supportsTablet: false`), so no iPad screenshots are needed and iPads run the iPhone app scaled up. Supporting iPad later means checking the layout on iPad and adding 13-inch iPad screenshots.

## Submitting a version

1. Upload the build: `npx eas-cli build --platform ios --profile production`, then `npx eas-cli submit --platform ios --latest`.
2. Push the listing: `npx eas-cli metadata:push`.
3. In App Store Connect, on the version's page: screenshots, the build, App Review information (above), and for the first version also App Privacy (above), Pricing and Availability (Free), and Content Rights (no third-party content).
4. Add for Review, then Submit. `automaticRelease` is off in `store.config.json`, so an approved version waits until it's released by hand.
