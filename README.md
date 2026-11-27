# CampusFest Growth Center: RISA Labs Growth APM Assignment

**Author:** Vishesh (Dual Degree, IIT Kharagpur) · **Track:** Challenge A, Attendee Growth · **City:** Bengaluru

| Deliverable | File / link |
|---|---|
| 3-slide strategy | `Vishesh_RISA_Growth_APM_Strategy.pdf` |
| Working product (dashboard + campaign/task manager + AI analyst) | `index.html`, live at **https://risa-growth-center-jade.vercel.app/** |
| Analysis scripts (reproduce every number) | `analysis/*.py` |

---

## 1. TL;DR

- **2025 baseline (source data):** 2,050 verified external visitors vs a 2,200 goal (93%). ₹2,74,000 spent of a ₹3,00,000 budget, which is ₹134 per visitor (₹142 per campaign-attributed visitor).
- **Diagnosis:** Paid Social and Creators took **55% of spend but delivered 27% of attributed visitors** (₹274 and ₹337 per visitor, 50% show-up, 51% of all opt-outs). Peer and group channels (Ambassadors, College Partnerships, Referrals, Community) took **39% of spend and delivered 63%** of visitors (₹69–108 per visitor). Separately, 31% of registrants never showed up.
- **Target:** **Base 2,600 verified attendees (2,597 modelled, +27%) within ₹3L. Stretch 3,700 (3,708 modelled, +81%)** with ₹78k of sponsor co-funding. Both stay under an assumed venue ceiling of about 4,400 unique visitors.
- **Bets (ranked by ICE):** 1) College Club Partnerships 2.0, 2) Referral "Squad Pass", 3) Show-up engine, 4) Cut and restructure Paid Social + Creators (funds bets 1–3), 5) Ambassadors paid per verified check-in.

---

## 2. Data handling (Challenge A dataset)

Source: `Attendee_Dataset.xlsx`, a synthetic CampusFest 2025 dataset (event 12–13 Apr 2025, records 15 Jan–20 Apr 2025).

Cleaning and definition rules, applied exactly as the dataset's Read-me instructs:

| Rule | Implementation | Effect |
|---|---|---|
| Deduplicate import retries by stable ID | `drop_duplicates()` on identical rows | Daily marketing −2, registration history −4, check-ins −20 |
| Count people by `person_id`, not name | All counts use IDs | Names repeat |
| Targets apply to **external** people | Exclude internal (40), staff (10), test (10) | 2,840 → 2,800 registrations |
| Latest eligible status version per registration | Last `effective_at` ≤ snapshot end | 2,500 confirmed, 183 cancelled, 88 waitlisted, 29 interested |
| Verified visitor = admitted + verified, distinct external person | Denied (50) and pending/unverified (30) excluded; manual + scanner deduped by person | **2,050** (1,925 attributed + 125 walk-ins) |
| No later outcome in an earlier snapshot | Every metric filters timestamps ≤ end of the selected IST day | Dashboard "as-of" date works for any day |
| Reach is not summable | Shown as `reach_sum` with a warning, never used as unique people | — |
| Attribution | Leads = fixed first-touch campaign; registrations and visitors = campaign recorded on the registration/check-in | Attribution ≠ causation (stated in app and chatbot) |

### 2025 campaign results (as of 2025-04-20)

| Campaign | Spend | Leads | Regs | Visitors | Lead→Reg | Reg→Visit | ₹/lead | ₹/visitor | Opt-outs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Campus Ambassadors | 42,000 | 600 | 520 | 390 | 86.7% | 75.0% | 70 | 108 | 18 |
| Paid Social | 93,000 | 960 | 680 | 340 | 70.8% | 50.0% | 97 | 274 | 117 |
| Creator Partners | 59,000 | 490 | 350 | 175 | 71.4% | 50.0% | 120 | 337 | 43 |
| College Partnerships | 31,000 | 500 | 450 | 385 | 90.0% | 85.6% | 62 | 81 | 16 |
| Student Referrals | 19,000 | 410 | 350 | 275 | 85.4% | 78.6% | 46 | 69 | 14 |
| Organic Search | 14,000 | 290 | 250 | 195 | 86.2% | 78.0% | 48 | 72 | 11 |
| Community Groups | 16,000 | 250 | 200 | 165 | 80.0% | 82.5% | 64 | 97 | 10 |
| **Total** | **2,74,000** | **3,500** | **2,800** | **1,925 (+125 walk-ins)** | 80.0% | 68.8% | 78 | 142 | 229 |

Other findings:
- Confirmed → visit was 77%. Show-up by registration month: Jan 79%, **Feb 63%**, Mar 71%, Apr 73%. Long gaps between registering and the event cause decay, which is the rationale for the show-up engine.
- Visitors averaged 1.35 days each (2,775 person-days / 2,050). Day 1 had 1,430 unique visitors (≈70%).
- Targets were revised on 15 Mar: 3,200→3,600 leads, 2,800→3,200 registrations, 1,800→2,200 visitors, ₹2.4L→₹3.0L budget.

---

## 3. City choice: Bengaluru

| Factor | Evidence / reasoning | Type |
|---|---|---|
| Biggest college base | Bengaluru Urban has 1,225 colleges, the most of any Indian district; Jaipur is second with 809 (Geography of Higher Education Report 2026, via ThePrint / EducationWorld) | Sourced fact |
| Student pool | Karnataka's average enrolment is 413 per college (AISHE 2021-22), so roughly 1,225 × 413 ≈ **5 lakh students** | Estimate |
| Sponsors | Dense startup and consumer-tech ecosystem supports the stretch co-funding | Judgement |
| Climate | Mild Feb–Apr weather, unlike Delhi or Mumbai heat and humidity | Judgement |

Sources: <https://theprint.in/india/education/higher-education-capacity-expands-nationwide-but-big-gaps-in-up-bihar-jharkhand-finds-study/3058634/> · <https://www.deccanherald.com/india/karnataka/state-s-gross-enrolment-ratio-up-by-0-2-in-2021-22-2867728> · <https://news.careers360.com/up-has-highest-number-of-colleges-in-country-followed-maharashtra-karnataka-aishe-report>

---

## 4. Target model (Slide 1): detailed calculations

Method: bottom-up by channel. For each channel, **visitors = round(round(leads × lead→reg) × reg→visit)** and **spend = leads × cost per lead**. Rates start from 2025 actuals and are **discounted** where a channel scales into colder audiences.

| Channel | 2025 CPL / L→R / R→V | Base leads | Base CPL | Base L→R | Base R→V | Base regs | Base visitors | Base spend | Stretch leads / CPL / L→R / R→V | Stretch visitors |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|
| College Partnerships | 62 / .90 / .86 | 1,000 | 65 | .88 | .82 | 880 | 722 | 65,000 | 1,400 / 68 / .88 / .86 | 1,060 |
| Campus Ambassadors | 70 / .87 / .75 | 900 | 75 | .85 | .72 | 765 | 551 | 67,500 | 1,100 / 78 / .85 / .80 | 748 |
| Student Referrals | 46 / .85 / .79 | 750 | 55 | .84 | .76 | 630 | 479 | 41,250 | 1,100 / 55 / .84 / .84 | 776 |
| Organic Search | 48 / .86 / .78 | 380 | 50 | .86 | .78 | 327 | 255 | 19,000 | 450 / 50 / .86 / .84 | 325 |
| Community Groups | 64 / .80 / .82 | 330 | 65 | .80 | .80 | 264 | 211 | 21,450 | 400 / 65 / .80 / .86 | 275 |
| Paid Social (retargeting) | 97 / .71 / .50 | 450 | 97 | .70 | .50 | 315 | 158 | 43,650 | 450 / 97 / .70 / .60 | 189 |
| Creators (pay per registration) | 120 / .71 / .50 | 200 | 120 | .71 | .50 | 142 | 71 | 24,000 | 200 / 120 / .71 / .60 | 85 |
| Walk-ins | 125 actual | | | | | | 150 | | | 250 |
| Show-up engine | | | | | | | | 14,000 | ₹20,000 | |
| **Total** | | **4,010** | | | | **3,323** | **2,597** | **2,95,850** | **5,100 leads, 4,255 regs, ₹3,77,650** | **3,708** |

- **Base:** 2,597 ≈ **2,600**, +547 vs 2025. ₹2,95,850 / 2,597 = **₹114 per attendee**. ₹4,150 of the ₹3L stays as buffer.
- **Stretch:** 3,708 ≈ **3,700**, +1,658 vs 2025. ₹3,77,650 / 3,708 = **₹102 per attendee**. The extra ₹77,650 comes from sponsor co-marketing (assumption).
- **Stretch decomposition:** applying stretch show-up rates to base volume gives +227; extra leads give +784 (College 303, Referrals 247, Ambassadors 136, Organic 50, Community 48); extra walk-ins give +100. 227 + 784 + 100 = 1,111 = 3,708 − 2,597. ✔
- **Base contribution by bet vs 2025** (channel visitors minus 2025 actual): College +337, Referrals +204, Ambassadors +161, Organic + Community +106, Walk-ins +25, Paid/Creators −286. Total **+547**. ✔
- **Capacity:** assumed 3,000 unique visitors per day. Stretch peak day ≈ 3,708 × 70% = 2,596 < 3,000. Two-day ceiling ≈ 2 × 3,000 / 1.35 ≈ 4,400.
- **Sanity check:** 2,600 out of ~5 lakh students is 0.5% penetration. The target is not derived from that, but it shows nothing implausible is required.

Stretch per-bet contributions on Slide 2 (College +640, Referrals +451, Ambassadors +297) are base increment plus extra volume. The show-up uplift (+227) is counted once, under the show-up engine, so Paid/Creators is −286 in both scenarios. 640 + 451 + 297 + 227 − 286 + 204 (organic + community) + 125 (walk-ins) = 1,658. ✔

> **Self-correction:** an earlier draft used 0.71 for Paid Social lead→reg. 2025 actually delivered 70.8%, so that rate was slightly above the evidence. The in-app evidence checker flagged it, and the model now uses 0.70.

### Assumptions register

| # | Assumption | Value | Why / how to validate |
|---|---|---|---|
| A1 | Partner colleges in 2025 | ~10 (not in data) | Validate against the partnership CRM; this drives the leads-per-college threshold |
| A2 | Leads per new partner college | ~50 | 500 leads / 10 colleges in 2025; checked on the 5-college pilot |
| A3 | Cost-per-lead inflation when scaling | +5–20% | Diminishing returns; monitored weekly |
| A4 | Conversion discount for scaled channels | −2 to −6 points | Colder audiences |
| A5 | Show-up engine lift (stretch) | +4 to +10 points | Holdout test (10% of confirmed registrants) |
| A6 | Venue capacity | 3,000 unique/day | Confirm with venue |
| A7 | Ambassadors 2025 | ~40 (not in data) | — |
| A8 | Sponsor co-funding for stretch | ₹78k | Sponsor track |
| A9 | 2026 festival repeats the 2025 format (2 days, same channels) | — | — |

---

## 5. Prioritisation framework (Slide 2)

**ICE = Impact × Confidence × Ease**, each scored 1–10. Impact is incremental attendees per rupee, Confidence is the strength of the 2025 evidence, and Ease covers time, people and dependencies.

| Rank | Bet | I | C | E | ICE | Base / stretch attendees vs 2025 | Budget |
|---|---|---|---|---|---|---|---|
| 1 | College Club Partnerships 2.0 | 8 | 8 | 6 | 384 | +337 / +640 | ₹65k |
| 2 | Referral "Squad Pass" | 7 | 7 | 7 | 343 | +204 / +451 | ₹41k |
| 3 | Show-up engine | 5 | 7 | 9 | 315 | insurance / +227 | ₹14k |
| 4 | Cut and restructure Paid + Creators | 4 | 8 | 9 | 288 | −286 / −286 (frees ₹84k) | ₹68k |
| 5 | Ambassadors paid per verified check-in | 5 | 7 | 6 | 210 | +161 / +297 | ₹67.5k |

**Rejected:** celebrity headliner (cost, crowd risk, doesn't fix show-up), scaling cold paid social (worst cost per attendee and most opt-outs), free walk-in blitz (unverified, capacity risk), mega-influencers (reach without intent).

---

## 6. Product: Growth Center

A single-file web app (`index.html`, vanilla JS, no build step, no external libraries). The full deduplicated record-level dataset (~3.6k people, 2.8k registrations, 5.9k status versions, 3.4k check-ins, 481 daily rows, aggregated interactions) is embedded as JSON. **Every metric is computed live from the records**, so edits flow through to all views and to the AI.

### Features mapped to the brief

| Brief requirement | Where |
|---|---|
| 1. Measure: funnel, campaign KPIs, targets vs actuals, conversion rates, budget, projections | **Overview** and **Campaigns** tabs; as-of date picker (any day 15 Jan–20 Apr, no leakage); target version switches automatically on 15 Mar; pre-event projections = confirmed × show-rate + walk-ins |
| 2. Diagnose: winners, losers, bottlenecks, drivers | **Diagnose** tab: spend share vs visitor share (efficiency index), weakest stage per campaign vs portfolio, last-7-days change; **Campaigns** drill-down with weekly trends |
| 3. Decide: prioritise, allocate, scale/change/stop | Auto **SCALE / FIX / CUT** tags from editable thresholds; priority ranking; **budget reallocation simulator**; remaining-budget guidance |
| 4. Execute: campaigns, tasks, owners, deadlines | Create and edit campaigns (status, owner, budget, notes); Kanban tasks (owner, due date, priority, overdue flag); **Data & Settings** to edit source daily rows, add manual outcome entries, edit targets and thresholds; change log; export/import JSON; reset |
| 5. AI Growth Analyst | Chat panel with tool calling (below) |
| Strategy ↔ product link | **2026 Plan** tab: the Slide 1 model, editable, with live 2025 benchmarks and an **evidence check** that flags any assumption more optimistic than 2025, plus budget and capacity checks. **Experiments** tab: the 5 Slide 2/3 bets scored SCALE / CHANGE / STOP against editable thresholds, replayable at any date |
| Diagnose (advanced) | **Alerts**: last 7 days vs the prior 3-week weekly average (registrations ±30%, cost per registration +30%, cancellations / opt-outs / spend +50%). **Data quality** panel: duplicates removed and records excluded |
| Persistence | `localStorage` in the viewer's browser; survives reloads |

### AI Growth Analyst design (not hardcoded)

The model **never sees a static data dump**. It calls functions that run against the live app state:

| Tool | Purpose |
|---|---|
| `get_snapshot(as_of)` | Totals, pacing vs targets, budget, per-campaign metrics, recommendation and bottleneck |
| `get_campaign_detail(campaign, as_of)` | Metrics, weekly trend, settings and tasks for one campaign |
| `get_weekly_trend` | Weekly series |
| `compare_snapshots(date_a, date_b)` | What changed and which campaign drove it |
| `calculate(expression)` | Exact arithmetic, so the model doesn't do mental math |
| `simulate_reallocation(moves)` | Budget-shift impact |
| `list_tasks` | Execution state |
| `get_data_coverage` | What the data does and does **not** contain, used to refuse honestly |
| `query_records` | **General query engine** over raw people, registrations, check-ins, interactions and daily rows: count / distinct people / sum, up to 2 group-bys, filters (campaign, dates, status, event type, result, verification, source, person type, hour, has_registration, has_verified_visit). Handles unfamiliar questions |
| `person_funnel` | Identified-person funnel and leakage per campaign (e.g. brochure but not registered, confirmed but no-show), email open/click rates |
| `get_alerts` | Week-over-week anomalies |
| `get_experiments` | Live verdicts for the 5 bets |
| `get_plan_model(what_if)` | The 2026 model with unsaved what-if overrides (e.g. "what if college show-up is only 70%?") |
| `propose_action` | Create a task, change a task's status, or pause/stop/rebudget a campaign. **Shows a Confirm/Reject card; nothing changes until the user confirms** |

The system prompt enforces: answer only from tool results in the current turn; use the calculator; separate evidence from assumptions; say when the data cannot answer and what data would; give recommendations with thresholds; route changes through `propose_action`. Conversation history (last 20 turns) is kept for follow-ups, and tool calls are shown inline so answers are auditable.

**LLM providers:**
1. **Claude**: automatic when the app is opened as a Claude artifact (claude.ai).
2. **Google Gemini**: free key from Google AI Studio (both newer `AQ.` keys and older `AIza` keys work; sent in the `x-goog-api-key` header). Default model `gemini-3.5-flash`, with automatic fallback to `gemini-flash-latest`, `gemini-3.6-flash` and `gemini-2.5-flash` on 404.
3. **Any OpenAI-compatible API** (OpenAI, Groq, OpenRouter): set the base URL, key and model.

### Demo workflow (end to end)

1. Ask: *"Are we on track for the visitor goal?"* → calls `get_snapshot` and reports 2,050 vs 2,200 (93.2%) and the 150 shortfall.
2. Follow-up: *"Which campaign should we cut, and why?"* → Paid Social / Creators, with ₹/visitor, show-up and opt-out evidence.
3. *"Move ₹20k from Paid Social to College Partnerships — impact?"* → `simulate_reallocation` gives ≈ +140 visitors (−58 / +199), labelled as an assumption.
4. *"Create a task for Arjun to do that by 20 March"* → proposal card → **Confirm** → the task appears in **Tasks** and the change log.
5. *"Which colleges sent the most attendees?"* → **declines**: college names are not in the data. It explains what's missing and offers the closest supported answer (the College Partnerships campaign total).
6. Change data: in **Data & Settings**, edit a Paid Social spend row or add a manual entry, then ask again. The answer reflects the new numbers.
7. Unfamiliar question: *"How many people downloaded the brochure but never registered?"* → `query_records` returns **319**. *"Manual vs scanner check-ins on day 2?"* → **1,235 scanner / 110 manual** (both verified against pandas).
8. Stress-test the plan: *"If college partnerships only hit 70% show-up, does the base hold?"* → `get_plan_model` what-if gives base 2,491 (+22%), still within budget.
9. Time travel: set the as-of date to 2025-03-15 and ask *"Projected visitors?"* → pre-event projection with no hindsight (1,084 at a 77% show-rate plus 100 walk-ins).

---

## 7. Setup and deployment

**Local:** double-click `index.html`. No install needed. Inside the app, use ⚙ AI settings to choose Gemini or OpenAI-compatible and paste a key.

**Public link (about 3 minutes):**
- **GitHub Pages:** new repo → upload `index.html` → Settings → Pages → Deploy from branch `main` / root → share `https://<user>.github.io/<repo>/`.
- **Netlify Drop or Vercel:** drag the folder in, or run `vercel deploy`.
- **To let reviewers chat without their own key:** put a Gemini key in `window.GC_CONFIG.key` at the top of `index.html`. Restrict the key to your site's HTTP referrer in Google AI Studio and Cloud Console, because a key embedded in a public page is visible to anyone.

**Reproduce the numbers:** `python3 analysis/funnel.py Attendee_Dataset.xlsx` (2025 metrics) and `python3 analysis/model.py` (base/stretch model).

---

## 8. Testing performed

- Every dashboard total and per-campaign value matched an independent pandas computation (e.g. 2,050 visitors, ₹2,74,000 spend, 2,500 confirmed, ₹273.53 Paid Social cost per visitor).
- Headless Chrome tests: no console errors on any tab; proposal → confirm creates the task; campaign pause is reflected in the recommendation; editing a source spend row (Organic Search ₹14k→₹64k) changes cost per visitor to ₹328 and flips the tag SCALE→FIX; all changes survive a page reload.
- New tools cross-checked with pandas: brochure-not-registered 319 ✔; day-2 verified check-ins by source 1,235 / 110 ✔; cancellations by campaign (Paid 60, Creators 36, …) ✔; Paid Social weekly spend sums to ₹93,000 ✔.
- Tool guards: out-of-range dates return an error explaining the coverage; unknown campaigns list the valid options; `calculate` only accepts arithmetic.

## 9. Tools used

- Python (pandas) for cleaning, analysis and the model; headless Chrome for testing and PDF rendering.
- Vanilla HTML/CSS/JS for the app (no frameworks or CDNs, works offline apart from the LLM call).
- LLMs: Claude (artifact runtime) / Gemini API / OpenAI-compatible, via function calling.
- Built with AI assistance (Claude). Every number was verified against the source data with code.

## 10. Known limitations (honest list)

- **Persistence is per browser** (localStorage). A production version would use Supabase/Postgres for a shared, multi-user state. Exporting and importing JSON covers handover.
- The 2026 model assumes the 2025 channel economics transfer to Bengaluru. They are synthetic 2025 data, so treat the rates as priors to be replaced by pilot data in weeks 1–2.
- **Attribution is observational** (first touch / recorded source). There are no holdouts in the source data, so incrementality is unproven. The show-up engine and referral tests include holdouts for this reason.
- The pre-event projection uses a single show-rate assumption (77%) for all campaigns. Per-campaign show-rates would be more accurate but would leak 2025 outcomes into in-flight snapshots.
- The reallocation simulator uses a simple diminishing-returns factor (1.25×). It is directional, not a response-curve model.
- Manual edits apply from their entry date. Edited source daily rows apply on their original dates.
- Experiments use **proxies** where the source data doesn't capture the real KPI. Referral invites aren't recorded, so the proxy is referral leads per registrant. T-7 reconfirmation isn't recorded, so the show-up bet shows NO DATA before the event. College and ambassador counts are assumptions (editable). Slide 3's thresholds are for the 2026 run, where these fields would be captured.
- Data not available (the chatbot says so): demographics, college names, ticket revenue, venue capacity, creative-level data, deduplicated reach.
- Download (export) is blocked inside the claude.ai artifact sandbox but works on a normal web host.
- The demo embeds a Gemini API key client-side so reviewers can use the chatbot without their own key. Production would call Gemini through a backend proxy, and the demo key will be deleted after review.
-  The demo embeds an API key client-side for reviewer convenience; production would call Gemini through a backend proxy.
