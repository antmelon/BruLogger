# App Store

What the App Store listing says and how to fill in the parts of App Store Connect that can't live in this repo. The app in App Store Connect: https://appstoreconnect.apple.com/apps/6822017723/appstore (also `ascAppId` in `eas.json`). Keep all of it true to the app and to the [privacy policy](https://brulogger.com/privacy): when one changes, check the others.

## Listing (`store.config.json`)

The name, subtitle, description, keywords, promotional text, URLs, categories (Food & Drink, then Lifestyle) and age rating answers are in [`store.config.json`](../store.config.json), in [EAS Metadata](https://docs.expo.dev/eas/metadata/) format. Once the app exists in App Store Connect, push them with `npx eas-cli metadata:push`, or pull what's there with `metadata:pull`. Its `version` is the App Store version they're pushed to. It must match `app.json`'s `version`, and a test checks that. Without it, `metadata:push` fails with "You must provide a value for the attribute 'versionString'". Apple's limits: name and subtitle 30 characters, keywords 100 characters in total, promotional text 170, description 4000.

The keywords skip words that are already in the name or subtitle (coffee, journal, log, rate, brew), because Apple indexes those anyway.

## App Review information

Entered in App Store Connect, not kept here, because Apple requires a phone number.

- **Contact:** Anthony Longo, support@brulogger.com, plus a phone number.
- **Sign-in required:** no demo account. Reviewers sign in with Apple, which creates a new, empty account.
- **Screen recording** (the Attachment box, and the reply to App Review): Apple asked for one for 1.0 (October 2026), as it does for new developer accounts. Re-record it when the flow it shows changes. It's recorded on a physical iPhone on the latest iOS and starts by launching the app: sign in with a test account, log a brew with a photo, open, edit and search brews, Analytics, then Profile > Delete Account. The test account's email has to differ from every real account's, because Supabase joins sign-ins with the same email into one account, and the recording ends by deleting it. My Brews being empty after signing in confirms it's a new account.
- **Notes:** these answer the six questions App Review asked for 1.0. From 1.1.0, item 3 also needs the Coffees tab, which build 1.0.0 doesn't have (it reaches 1.0.0 as an over-the-air update after approval).

  ```text
  1. Screen recording
  Attached. Recorded on an iPhone 17 Pro with the latest iOS, starting from launch. It shows signing in with a new account (the first sign-in creates the account), logging a brew with a photo, opening, editing and searching brews, the Analytics tab, and deleting the account in Profile.

  2. Purpose and audience
  BruLogger is a personal coffee journal for people who make coffee at home: pour over, espresso, AeroPress, French press, cold brew. Getting a coffee to taste right takes adjusting the recipe from cup to cup, and it's hard to remember what changed. BruLogger records each brew: the coffee, the method, the recipe (grind, dose, yield, water temperature, brew time), a star rating, an optional flavor profile, notes and a photo. People can search their history, repeat what worked, and see which methods and roasts they rate highest. It's free, with no ads, in-app purchases or subscriptions.

  3. Setup and access
  No demo account or sample files are needed. On the first screen, tap Continue with Apple (any Apple ID works) or Continue with Google. The first sign-in creates a new, empty account; there's no separate registration form.
  - Log a brew: My Brews tab, then "+ Log Brew". Only Coffee Name and Brew Method are required. The photo button takes a photo or picks one from the library.
  - Tap a brew to open it. Edit Brew and Delete are on its page.
  - My Brews has a search box, filters and sorting.
  - Analytics shows ratings over time, favorite methods and roasts, and the average flavor profile once brews are logged.
  - Delete the account: Profile, Delete Account, then confirm. This permanently deletes the account, its brews and its photos. For an account that signed in with Apple, the app first asks to confirm with Apple and revokes the Sign in with Apple token, then deletes the data.
  Brews and photos are private to the account that made them. Nothing is shared with or shown to other users, so there's no content to report or block.

  4. External services
  - Supabase: database, sign-in and photo storage
  - Sign in with Apple and Sign in with Google: signing in
  - Vercel: hosts brulogger.com and the server endpoint the app calls to revoke Sign in with Apple when an account is deleted
  - Sentry: crash reports (errors only, without personal data)
  - Expo: the framework the app is built with, and its build and update service
  No AI services, payment processors, ad networks or analytics.

  5. Regional differences
  None. The app works the same in every region where it's available. It's in English.

  6. Regulated industry or third-party material
  Not applicable. BruLogger isn't in a regulated industry and has no third-party protected material. All content is what users enter themselves.
  ```

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

Apple's [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) (as of October 2026) require one set for **iPhone with Dynamic Island (medium display)**: 1206 × 2622 or 1179 × 2556, the size an iPhone 17 Pro or 16 Pro takes. A set for the large display (1320 × 2868, a Pro Max) is optional; without one, Apple asks for the 6.5-inch Face ID set instead, so it's uploaded too. App Store Connect rejects a file whose size doesn't match the slot it's dropped into ("File dimensions are invalid"). PNG or JPEG, without an alpha channel. EAS Metadata can't upload screenshots, so they're added by hand in App Store Connect. The first three show in search results, so order matters.

The 1.0 set was taken on 2026-10-12 from a TestFlight build on an iPhone 17 Pro, using real brews: My Brews with photo thumbnails, a brew's photo, its flavor chart and notes, Analytics, the average flavor profile, and the edit form's flavor sliders. They're used as taken for the medium slot. For the large slot they're scaled to 1320 wide, which gives 1320 × 2870, so a pixel comes off the top and bottom.

iPhone-only for now (decided 2026-10-11, `ios.supportsTablet: false`), so no iPad screenshots are needed and iPads run the iPhone app scaled up. Supporting iPad later means checking the layout on iPad and adding 13-inch iPad screenshots.

## Submitting a version

1. Upload the build: `npx eas-cli build --platform ios --profile production`, then `npx eas-cli submit --platform ios --latest`.
2. Push the listing: `npx eas-cli metadata:push`.
3. In App Store Connect, on the version's page: screenshots, the build, App Review information (above), and for the first version also App Privacy (above), Pricing and Availability (Free), and Content Rights (no third-party content).
4. Add for Review, then Submit. `automaticRelease` is off in `store.config.json`, so an approved version waits until it's released by hand.
