/**
 * Build-time feature flags.
 *
 * `PRO_ENABLED` — gates every JIGGO Pro surface (the /upgrade screen's entry
 * points, the Settings upsell card, the Coach-lock primary CTA, the
 * onboarding 'pro' step, and the in-context CTAs on /rituals + /insights).
 *
 * Set to `false` for the v1.0 App Store submission: the /upgrade screen's
 * purchase button is a stub ("coming soon" alert) and shipping a visible
 * pricing flow with no real StoreKit transaction is a guaranteed App Review
 * rejection under guidelines 2.1 / 3.1.1.
 *
 * v1.0 therefore ships BYO-key-only — the Coach works fully when the user
 * pastes their own Anthropic key in Settings. Once StoreKit 2 is wired and
 * the products are live in App Store Connect, flip this to `true` and ship
 * an update — every Pro surface lights back up with no other code change.
 *
 * The /upgrade route itself stays registered but unreachable while this is
 * false; an unreferenced route is invisible to App Review.
 */
export const PRO_ENABLED = false;
