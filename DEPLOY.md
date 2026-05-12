# JIGGO MAXXING — App Store Deploy Playbook

Commands you (the user) need to run at the terminal. JS-side is complete and tsc + web-export clean.

## 1) Native iOS toolchain (one-time)

CocoaPods is the only blocker:
```sh
sudo gem install cocoapods --no-document
```

Then verify:
```sh
which pod && pod --version
```

## 2) First native build to simulator

```sh
cd "/Users/kgz/jiggo premium/JiggoMaxxing"
npx expo run:ios --device E517D738-0269-4270-BA09-925A11320E73   # iPhone 17 Pro Max (booted)
```

This will:
- Run `expo prebuild` (already done; `ios/` exists)
- `pod install` (needs the cocoapods you just installed)
- `xcodebuild` debug build for the simulator
- Install + open the app
- Start Metro

Expected first build: 3–5 min.

## 3) App Store Connect setup

Bundle ID is set to `com.jiggo.maxxing` in `app.json`.

```sh
# Create the bundle ID + ASC record
asc apps create --bundle-id com.jiggo.maxxing --name "JIGGO MAXXING" --primary-locale en-US

# Set categories
asc apps set-categories <appId> --primary HEALTH_AND_FITNESS --secondary LIFESTYLE

# Pull current metadata skeleton
asc metadata pull --bundle-id com.jiggo.maxxing
```

**Research-backed ASO (May 2026):**

Apple is not flagging the word *looksmaxxing* itself — rating/PSL/before-after imagery is what triggers 1.1/4.3 clusters. Keep the term out of *visible* metadata, capture its traffic in the hidden keyword field only.

- **Title (30 char max):** `JIGGO: Men's Edge Coach` (22)
- **Subtitle (30 char max):** `Discipline, Habits, Routine` (27)
- **Keywords (100 char, no dupes from title/subtitle):**
  `looksmax,grooming,self,improvement,glowup,style,physique,confidence,daily,tracker,routine`
- **Primary category:** Health & Fitness · **Secondary:** Lifestyle

**DE store listing:**
- **Title:** `JIGGO: Edge Coach für Männer`
- **Subtitle:** `Disziplin · Routine · Stil`

**First three lines of the description** (anchors anti-toxic positioning):
> JIGGO is the men's edge coach without the toxic playbook. No PSL scores. No before/after. No "looksmax tier." Just a private, on-device coach for grooming, physique, style, confidence, and discipline.

**Screenshot captions** (top of frame, 6 screenshots):
1. "No ratings. No comparisons. Just your edge."
2. "Twelve curated looks. Build your own."
3. "Six private dimensions. Local only."
4. "Switch your plan to fit the week."
5. "A coach with limits. Insight, never judgement."
6. "All your data. On your device."

## 4) Privacy policy URL

Apple requires a hosted URL. Options:
- Add a `/why` static page to `meloxkgz.github.io/jiggo-maxxing/privacy.html` containing the same essay-form copy as `app/why.tsx`.
- Or use a one-page generator like `https://app-privacy-policy-generator.firebaseapp.com/`.

The in-app essay at `/why` is your source of truth. Mirror it to the URL.

## 5) Screenshots

Once the simulator is running:
```sh
asc screenshots frame --plan ./.asc/screenshots.json
asc screenshots upload --bundle-id com.jiggo.maxxing
```

Or use the `asc-shots-pipeline` skill to drive the simulator + frame.

Required sizes:
- 6.7" (iPhone 16 Pro Max / 17 Pro Max) — 1290×2796
- 6.1" (iPhone 16 / 17) — 1170×2532

Min 3 screenshots; recommend 6:
1. Home with Edge Index + nudge
2. Style → Looks (12 covers visible)
3. Scan detail with dimensions + actions
4. Plan with template chips
5. Coach in conversation
6. Insights

## 6) Commerce model — research-backed ladder

Research from Adapty, RevenueCat 2025, Cal AI Superwall case study:
- **Hard onboarding paywall** earns ~$3.09 RPI by D14 vs $0.38 for soft (8x).
- **Onboarding placement** drives 60–80 % of subscription revenue.
- **Free trial + weekly** converts trial-to-paid at 39.9 % median (H&F vertical), top decile 68 %.
- **Annual at ~3.8x weekly price** anchors well: $39.99/yr against $4.99/wk = "Save 80 %".

**Recommended ladder** (shown as screen 7 after onboarding's 6 personalization screens):
1. **7-day free trial → $4.99/wk** — default highlighted CTA
2. **$39.99/yr** with `Save 80 %` badge
3. **BYO Anthropic key** — tiny tertiary link beneath: *"I have my own Anthropic key — unlock Coach without subscribing"*. Keeps brand-honest stance; doesn't cannibalize because power users self-select and aren't the median LTV target anyway.

**Implementation path** (~2–3 days):
- `expo-iap` or native StoreKit 2 bridge
- Anthropic proxy: Cloudflare Worker / Vercel Function with per-user rate limit (e.g. 60 turns/day, 200/week)
- RevenueCat optional — adds entitlement sync but +$X/mo per active sub. Native StoreKit 2 is the v1 path per `feedback_storekit_over_revenuecat.md`.

**Run experiments** like Cal AI did (61 paywall A/Bs → +31 % trial-to-paid) — toggle weekly default vs annual default, trial length 7 vs 14 days, BYO link visibility.

## 7) Build + submit

```sh
# Bump build
asc apps set-build-number --bundle-id com.jiggo.maxxing --build 1

# Archive + export with the API-key altool path
xcodebuild -workspace ios/JiggoMaxxing.xcworkspace \
  -scheme JiggoMaxxing -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath build/JIGGO.xcarchive \
  -allowProvisioningUpdates archive

xcodebuild -exportArchive \
  -archivePath build/JIGGO.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ios/ExportOptions.plist

xcrun altool --upload-app -f build/ipa/JiggoMaxxing.ipa \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER"
```

Wait for processing (5–15 min), then submit via `asc apps submit`.

## Known pre-flight checks

- ITSAppUsesNonExemptEncryption: false  ✓ (in app.json infoPlist)
- NSCameraUsageDescription ✓
- NSPhotoLibraryUsageDescription ✓
- Local-only data (no analytics, no accounts) ✓
- Privacy publish must be done in ASC web UI (no public API)
