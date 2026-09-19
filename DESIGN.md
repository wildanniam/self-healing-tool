# Report design

Product UI for researchers reviewing recovery outcomes. Source of truth: the D34 decision, existing navy/teal report vocabulary and owner-approved four-group hierarchy.

Primary path: open results → choose study if historical → scan outcome rows → open the exact run → inspect DOM, paired AI input/output, checks and action effects → expand or download original evidence. A live/replay report starts with its run list; research comparison is secondary.

Use a compact system-font header, restrained navy text, teal selection and red wrong-effect indicators. No hero, decorative imagery or repeated explanatory cards. Main actions and results appear in the first viewport. Metadata, source hashes, raw JSON, configuration and long explanations use native disclosures. No decorative motion.

Components: horizontal study navigation, result summary, filter toolbar, semantic table with explicit per-arm/repeat result buttons, paginated list, single-run inspector, four process tabs, native details, request copy/download and summary CSV/JSON export. Comparison has its own view. Do not pool D30/D33. All active filters govern both exports.

States: native control (AI skipped); model null (recorded abstention); parsed-only versus recorded response; missing source; incomplete record; operational failure; wrong action; correct action; unassessed action; replay. Disabled buttons explain absence, not success. Focus is visible, Escape returns to initiating result, source absence remains explicit. There is no asynchronous loading after opening an offline report.

Desktop 1440×900: restrained max width, four-stage rail, flexible evidence panel. Mobile 390×844: stacked heading/controls, horizontal stage navigation, locally scrollable tables/code without document overflow. Long input/output is vertical, never two giant JSON columns. Use scrollable raw evidence only inside disclosures. Preserve text labels for color meanings and minimum 44px touch controls.

Generic library reports follow the same hierarchy using English and the existing safe reportView. They do not acquire full raw requests merely for layout parity. Recordings are data, never executable HTML. Paper screenshots and public export use synthetic evidence only.

## D35 accepted extension

Library users inspect one action and attempt through the same shared inspector. Hide study/arm/repeat controls in this mode. English defaults with a visible English/Bahasa Indonesia switch; evidence text remains original. Rich local evidence requires capture enabled before execution and explicit audit supplied to reporting; safe JSON stays a whitelist. Keep summary-first layout, source details collapsed, touch controls and keyboard focus. This replaces the earlier English-only/generic-summary-only UI restriction.
