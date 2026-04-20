# CORE Assessment — UI Experience Specification

## Assessment-Taker Experience Design

---

## 1. Purpose

This document specifies the assessment-taker experience for the CORE Assessment platform — the screens, flows, interactions, and design principles that ensure the UI measures cognitive ability, not interface literacy. It is framework-agnostic: it describes behavior, not implementation.

### 1.1 Design Grounding

The design decisions in this document are grounded in:

- **Cognitive load theory** (Sweller, 1988) — minimize extraneous cognitive load so working memory is spent on the question, not the interface
- **Question order effects research** (Weinstein & Roediger 2010/2012; Iriberri & Rey-Biel 2022, n=19,000) — easy-to-hard ordering reduces abandonment and improves performance accuracy
- **Assessment UX best practices** — from Nielsen Norman Group (cognitive load minimization), CSUSM (test design), and University of Washington (constructing tests)
- **The CORE Assessment's own design constraints** — no back-navigation, per-question timers, timed single-sitting, anti-gaming requirements

### 1.2 Core Principle

**The interface must be invisible.** Every ounce of the test-taker's cognitive effort should go to the question content, never to figuring out how the UI works. Zero learning curve on every screen. If a test-taker has to think about the interface even once, the design has failed.

### 1.3 Companion Documents

| Document | Relationship |
|---|---|
| Functional Spec v2.4 | Assessment mechanics, timer rules, scoring, auth |
| Design Philosophy v1.0 | Why the sections are ordered and designed the way they are |
| assessment-meta.json | Machine-readable config the UI loads to build its structure |
| Dashboard Module Spec v1.2 | Admin-facing dashboard (separate from this document — this covers the test-taker experience only) |

---

## 2. Design Principles

### 2.1 Measure Cognition, Not Interface Skill

Every interaction should be immediately obvious. No novel UI patterns. No clever interactions that require experimentation. Standard form controls (radio buttons, checkboxes, text areas, draggable lists) used exactly as users expect. If accessibility tools work with it out of the box, the interaction is probably right.

### 2.2 Minimize Extraneous Cognitive Load

Only show what's needed for the current question. The screen should contain: the question, the response mechanism, the timer (if visible), and a submit button. No scores, no section titles competing for attention, no decorative elements, no branding in the assessment flow. The question content IS the interface.

Remove everything that isn't the question:
- No running score or performance indicators
- No question count across the entire assessment ("Question 17 of 34" creates anxiety about pace)
- No animations or transitions that draw the eye away from the content
- No tooltips, help icons, or informational overlays during questions

### 2.3 Create Calm Confidence, Not Pressure

The assessment measures how someone thinks under *mild* time pressure — not under duress. The visual environment should feel like a focused workspace, not an exam hall.

- Warm, neutral color palette — not clinical white, not dark/moody
- Generous whitespace — every question should feel like it has room to breathe
- The timer is information, not a threat — countdown is calm, not aggressive
- Section transitions are breathing room — the test-taker controls when to start the next section

### 2.4 Progressive Disclosure

Reveal complexity gradually:
- Pre-assessment briefing prepares for what's coming
- Section intros set expectations for that section's format and pacing
- Question-specific constraints (character limits, timer behavior) appear contextually with the question
- No information is front-loaded that isn't immediately actionable

### 2.5 Respect the "No Going Back" Constraint

Since test-takers cannot return to previous questions, every submission must feel deliberate:
- Submit button requires an answer to be selected/entered before it activates
- No accidental submissions — the action to advance must be intentional
- No browser back button confusion — intercept and warn if attempted
- The constraint is communicated once (pre-assessment briefing) and then the UI simply doesn't offer a back option

### 2.6 Accessibility as Baseline

WCAG 2.1 AA compliance minimum. Not an afterthought — a design constraint from the start:
- Keyboard-navigable throughout
- Screen reader compatible (all interactive elements labeled, ARIA live regions for timer warnings)
- Sufficient contrast ratios on all text and interactive elements
- Focus indicators visible and clear
- Touch targets ≥ 44px on all interactive elements
- No information conveyed by color alone

---

## 3. Assessment Flow — Screen by Screen

### 3.1 Screen: Landing / Authentication

**Purpose:** Authenticate the user and set the stage.

**Content:**
- CORE Assessment branding (logo, assessment name, organization names)
- Email input for OTP authentication (per Functional Spec §7.6)
- OTP verification flow (enter code sent to email)
- Brief statement: "This assessment takes approximately 45–50 minutes."

**Behavior:**
- After successful authentication, check if the user has an in-progress assessment (resume) or needs to start a new one
- If first-time user: capture name and role (self-reported) per Functional Spec §7.6.5
- No preview of questions, section details, or scoring information on this screen

**Design notes:**
- Clean, minimal layout. The authentication flow should feel effortless
- Error states for invalid email (not in domain allowlist) should be clear and non-technical: "This assessment is currently available to [organization] team members. Contact your administrator if you believe you should have access."

---

### 3.2 Screen: Pre-Assessment Briefing

**Purpose:** Set expectations, communicate rules, reduce anxiety.

**Content (in order):**

1. **Welcome:** "Welcome to the CORE Assessment. This assessment measures how you think — not what you know. There are no trick questions and no specialized knowledge required."

2. **What to expect:**
   - 5 sections, approximately 34 questions total
   - Mix of question types: choose one answer, choose multiple answers, drag items into order, and short written responses
   - Approximate duration: 45–50 minutes

3. **Rules (stated simply, not as a legal block):**
   - You cannot go back to previous questions once you advance
   - Some questions have visible countdown timers; others are timed but the timer is hidden — you'll receive a brief warning before time runs out
   - If time runs out on a question, your current answer is submitted automatically
   - The assessment must be completed in a single sitting
   - Please do not use external resources or AI tools during the assessment

4. **Format preview:** Brief visual examples of each question type interaction — not sample questions, just the mechanics:
   - "Select one" — radio button illustration
   - "Select all that apply" — checkbox illustration
   - "Drag into order" — draggable list illustration
   - "Written response" — text area illustration

5. **Ready button:** "Begin Assessment" — user-initiated, no auto-start, no countdown

**Design notes:**
- This is the ONLY screen where rules are explained. They are not repeated during the assessment.
- Tone is encouraging and clear, not legalistic
- Content should fit on one screen without scrolling on desktop (be concise)

---

### 3.3 Screen: Section Intro (appears ×5, before each section)

**Purpose:** Transition between sections. Provide a mental reset and set expectations for the upcoming format.

**Content:**
- Section name and short description (from `assessment-meta.json` section descriptions)
- Question count and approximate duration: "This section has [N] questions and takes about [M] minutes."
- Format note: "You'll see [question types] in this section."
- Section-specific tone guidance (brief, one line):
  - Section 1 (Rapid Recognition): "These are quick — trust your instincts."
  - Section 2 (Logical Reasoning, now position 2): "Some questions are quick, others require careful analysis."
  - Section 3 (Critical Observation): "Read carefully — the details matter."
  - Section 4 (Problem Decomposition, now position 4): "Take your time. Think through the full picture before you commit."
  - Section 5 (Output Validation): "Compare what was asked for against what was produced."

**Behavior:**
- "Begin Section" button — user-initiated. The test-taker controls the pace between sections.
- No auto-start. No countdown. This screen is the only rest point.
- No scores or performance feedback from the previous section

**Design notes:**
- This is breathing room. Visual calm. Generous whitespace.
- Brief enough to read in 5–10 seconds — don't make it feel like an obstacle

---

### 3.4 Screen: Question Display (Core Assessment Interface)

This is where the test-taker spends 95% of their time. The UI must be optimized for each question type while maintaining a consistent outer frame.

#### 3.4.1 Consistent Frame (All Question Types)

**Top bar (minimal):**
- Section name abbreviated + question number within section: "Logic — 3 of 8"
- Timer display (when applicable — see §4 for timer behavior)
- Nothing else. No overall progress bar. No score. No branding.

**Content area (center, dominant):**
- Question prompt: largest text on the screen, highly readable
- Context block (if present): visually distinct but non-competing container. Slightly muted background, clear boundary, scrollable if long
- Response mechanism: directly below context, or beside it on wide screens

**Bottom bar:**
- Single action button: "Next" (or "Submit & Continue")
- Button is disabled until an answer is provided (prevents accidental blank submissions)
- For open_ended: button activates once any text is entered
- No back button. No skip button. No save-for-later.

#### 3.4.2 Question Type: single_select

**Display:**
- Question prompt in large, readable type
- Options as large tappable cards or radio-button rows
- Each option has generous padding and clear hit area (minimum 44px height)
- Selected state: unmistakable visual indicator — filled radio, check icon, background color shift, or border change. Not just a subtle color tint.

**Behavior:**
- Selecting an option enables the "Next" button
- Selecting a different option deselects the previous one
- No double-click or confirm step — selection is the answer, "Next" advances

#### 3.4.3 Question Type: multi_select

**Display:**
- Question prompt with clear instruction: "Select ALL that apply"
- Options as checkbox cards — same sizing and spacing as single_select
- Selected count indicator below options: "3 selected" — helps track choices
- Selected state: checkmark icon + visual fill/border. Must be distinct from unselected even in grayscale.

**Behavior:**
- Each option toggles independently
- "Next" button activates once at least one option is selected
- No minimum or maximum selection enforcement in the UI (scoring handles partial credit)

#### 3.4.4 Question Type: drag_to_order

**Display:**
- Instruction: "Drag the steps into the correct order"
- Items as cards in a vertical list, each with:
  - A visible drag handle (grip/hamburger icon on the left)
  - The item text
  - A position number that updates live as items are reordered (1, 2, 3...)
- Cards have generous height (≥ 56px) and spacing between them

**Behavior — pointer (mouse/trackpad):**
- Click and drag the handle (or anywhere on the card) to reorder
- Drop target indicator (line or gap) shows where the item will land
- Smooth animation during drag

**Behavior — touch:**
- Long-press or drag handle initiates drag
- Large drop zones — touch imprecision requires forgiving targets
- Haptic feedback on drop if available

**Behavior — keyboard (accessibility):**
- Tab to focus a card. Enter or Space to "pick up." Arrow keys to move. Enter or Space to "drop."
- Alternative: provide an "up" and "down" button on each card when focused

**Design notes:**
- This is the most complex interaction in the assessment. It MUST work smoothly on tablet-size touch screens.
- Test this interaction type more thoroughly than any other during development.
- Consider offering a "number input" fallback: instead of drag, show numbered dropdowns per item where the user selects position 1, 2, 3... This is less elegant but universally accessible.

#### 3.4.5 Question Type: open_ended

**Display:**
- Question prompt + context displayed above a text area
- Text area: minimum 6 visible lines, auto-expanding as user types (up to a reasonable max before scrolling)
- Placeholder text from the question definition (e.g., "List your implementation steps in order...") — disappears on focus
- Character/word counter below the text area: "124 / 1,000 words" — informational, not punitive
  - Counter is neutral colored until 90% of limit (then shifts to amber — a gentle notice, not red)
  - When limit is reached: prevent further input, counter says "Limit reached"

**Behavior:**
- "Next" button activates once any text is entered (even a single character — don't force a minimum)
- No rich text formatting. No bold, italic, lists. Plain text only. The assessment measures thinking, not formatting.
- No spell check indicator (browser native spell check is fine, but don't add custom validation)
- Auto-save text input every few seconds to guard against accidental navigation or connection loss

**Design notes:**
- The text area is where test-takers spend the most time. It must feel generous, not cramped.
- On mobile/tablet: the on-screen keyboard will consume half the viewport. Ensure the text area and prompt remain visible above the keyboard.

---

### 3.5 Screen: Section Transition (appears ×4, between sections)

**Purpose:** Mark section completion and provide a moment of rest.

**Content:**
- "Section complete." (No score, no feedback, no summary)
- A brief pause message: "Take a moment. When you're ready, the next section is [name]."
- "Continue" button

**Behavior:**
- User-initiated advance. No auto-start. No timer.
- This is the ONLY pause point. Make it count.

**Design notes:**
- Visually distinct from the question display — different background, more whitespace
- This should feel like a breath, not a hurdle

---

### 3.6 Screen: Assessment Complete / Submission

**Purpose:** Confirm submission and set expectations.

**Content:**
- Confirmation: "Your assessment has been submitted."
- Status: "Your responses are being evaluated. Results will be reviewed by your administrator."
- Expectation setting: "You will not see scores on this screen." (Honest, not apologetic — this is by design per Functional Spec §7.6.4)
- Warm closing: "Thank you for completing the CORE Assessment."
- Action: "Return to Home" or auto-logout after 30 seconds

**Behavior:**
- Assessment data is submitted to the server before displaying this screen
- No retry, no review, no score reveal
- Session ends

---

## 4. Timer Behavior

### 4.1 Timer Modes

| Mode | Sections | Visual | Warning | Expiry |
|---|---|---|---|---|
| `visible` | S1 (Rapid Recognition) | Countdown displayed throughout the question | At `warning_seconds` threshold, timer color shifts from neutral to amber | Auto-advance when timer reaches 0 |
| `hidden_with_warning` | S2, S3, S4, S5 | No timer visible during the question | At `warning_seconds` threshold, a gentle banner appears: "[X] seconds remaining" | Auto-advance when timer expires |

### 4.2 Visible Timer Design

- Positioned in the top bar, right-aligned
- Neutral appearance: muted gray or blue text/icon, not large or aggressive
- At warning threshold (typically 10s for 30s questions): shifts to amber. No flashing. No sound. Just a calm color change.
- At 0: smooth transition to the next question. No "TIME'S UP" splash.
- Format: seconds only for short timers (30s). Minutes:seconds for long timers (2:30).

### 4.3 Hidden Timer Warning Design

- No visual indicator until the warning threshold
- Warning appears as a subtle top banner or inline notice: "15 seconds remaining"
- Banner is noticeable but not alarming — amber text on a light amber background, or similar
- Banner remains visible until the question auto-advances
- Screen reader: announce the warning via ARIA live region

### 4.4 Auto-Advance Behavior

When a question's timer expires:
1. Current answer (if any) is submitted automatically
2. If no answer was provided, a blank response is recorded
3. Transition to the next question is smooth — a brief fade or slide (200–300ms), not a jarring cut
4. No penalty notification. No "time's up" message. The speed flags in the data capture this signal — the UI doesn't need to.

---

## 5. Progress & Navigation

### 5.1 Progress Indicator

**Within a section:** "[Section name] — Question [n] of [total]" — minimal text in the top bar. This tells the test-taker where they are without creating pace anxiety.

**Across sections:** No global progress bar. No "Section 3 of 5" header. The section intros communicate which section is next — that's sufficient. Research shows global progress bars in timed assessments create anxiety about remaining time.

**Rationale:** The test-taker's mental model should be: "I'm answering this question. Then the next one. Then eventually the section ends." NOT: "I'm 47% through the assessment and have 22 minutes left." The first model focuses attention on the question. The second divides attention between the question and pace management.

### 5.2 No Back Navigation

- No back button anywhere in the question flow
- Browser back button: intercept with `beforeunload` event and warn: "You cannot return to previous questions. Going back will not change your answers."
- Keyboard shortcuts that might trigger back-navigation (Alt+Left, Backspace in some browsers): handle gracefully
- Swipe-back gesture on touch devices: disable within the assessment view

### 5.3 Section Boundaries

- Section completion is permanent. No option to revisit a completed section.
- The section transition screen (§3.5) is the only acknowledgment that a section has ended.

---

## 6. Responsive Design

### 6.1 Primary Target

Desktop browser (1024px+). This is an administered workplace assessment — the expectation is that most test-takers will use a laptop or desktop.

### 6.2 Tablet Support (Required)

Tablet (768px–1023px) must be fully supported. The drag-to-order interaction is the critical test — it must work smoothly on iPad-size touch screens.

### 6.3 Mobile (Supported, Not Optimized)

Small screens (<768px) are supported but not the design target. On screens below 768px, display a recommendation banner on the landing page: "For the best experience, take this assessment on a tablet or computer." Do not block mobile access — some users may not have a choice.

### 6.4 Layout Approach

Two layouts: desktop (≥768px) and compact (<768px). The question content is linear and naturally stacks — no complex responsive grid needed. Key adaptations for compact:

- Context blocks stack above the response mechanism (not side-by-side)
- Drag-to-order cards become full-width
- Text area expands to full width
- Timer moves inline with section label (top bar becomes single line)

---

## 7. Edge Cases & Error States

| Scenario | Behavior |
|---|---|
| **Browser refresh mid-assessment** | Session state is preserved in PostgreSQL. Reload resumes at the current question. Brief message: "Resuming your assessment..." Timer for the interrupted question continues from where it was (not reset). |
| **Network disconnection** | Queue answer submissions locally. Retry on reconnect. Display a non-blocking banner: "Connection lost — your answers are saved locally and will sync when reconnected." Do not block the test-taker from continuing. |
| **Timer expires with no answer** | Record blank response. Auto-advance. No penalty notification — the speed flags capture this signal. |
| **Session timeout** (configurable, default 4 hours per Functional Spec §7.6) | Assessment is auto-submitted with whatever has been completed. Display message on next login: "Your assessment session timed out and has been submitted with the responses you completed." |
| **Accidental tab close / navigation away** | `beforeunload` warning: "Your assessment is in progress. Leaving this page may affect your session. Are you sure?" |
| **Multiple-device access** | Only one active session per user. If a second device attempts to open the assessment, display: "This assessment is already in progress on another device." |
| **Server error during submission** | Retry automatically with backoff. If repeated failures: "We're having trouble submitting your response. Your answer has been saved locally. Please wait a moment and try again." Do not lose the answer. |

---

## 8. Visual Design Direction

This section provides aesthetic guidance without naming specific frameworks, libraries, or components.

### 8.1 Tone

**"Thoughtful workspace."** Professional but warm. Not clinical (no sterile whites and harsh blues). Not playful (no illustrations, mascots, or gamification). The visual environment should feel like a well-designed office where you'd want to do focused work — calm, clear, and quietly sophisticated.

### 8.2 Typography

- **Body text and options:** Clean, highly readable sans-serif. Larger than typical web apps — 16px minimum for body, 18px+ for question prompts. This is a reading-heavy experience; readability is paramount.
- **Context blocks:** Same typeface, slightly smaller (15–16px), muted color to visually distinguish from the prompt.
- **Timer and progress:** Monospace or tabular-figure font for the countdown (prevents layout shifts as digits change).
- **Hierarchy:** Question prompt > Context > Options > UI chrome. The prompt is always the dominant text element on screen.

### 8.3 Color

- **Base:** Neutral warm — off-white or warm light gray background. Not pure white (too harsh for sustained reading). Not dark mode (cognitive assessment should feel open and clear).
- **Text:** Near-black on the warm base. High contrast but not maximum (pure black on pure white causes eye strain over 45 minutes).
- **Interactive accent:** A single accent color for buttons, selected states, and focus indicators. Something confident but not aggressive — a deep teal, warm blue, or muted orange.
- **Timer warning:** Amber. Not red. Red triggers threat response. Amber communicates "attention" without alarm.
- **Error states:** Standard accessible red with an icon — not just color.
- **No traffic-light coding.** No green = good, red = bad anywhere in the test-taker experience. There is no performance feedback during the assessment.

### 8.4 Spacing & Layout

- **Generous whitespace.** Every element should breathe. Question prompts have large top margins. Options have generous vertical spacing between them.
- **Maximum content width:** 680–720px for question text (optimal reading line length). Wider screens center the content rather than stretching it.
- **Card-based options:** Each option (single_select, multi_select) is a visually distinct card with padding, not a bare text label next to a tiny radio button.
- **Visual separation:** Context blocks are clearly bounded (subtle background, thin border, or indentation). They should feel like "reference material" distinct from the question itself.

### 8.5 Animation & Motion

- **Transitions between questions:** Smooth, brief (200–300ms), directional (slide-left or fade). Communicates forward progress.
- **Timer warning appearance:** Fade-in, not pop. Gentle entrance.
- **Drag-to-order:** Smooth card movement during drag. Drop animation (card settling into position).
- **Nothing decorative.** No loading animations, no confetti, no progress celebrations. Every motion serves a functional purpose.
- **Reduced motion:** Respect `prefers-reduced-motion` OS setting. All transitions become instant cuts when this is enabled.

---

## 9. Specific UI Details by Assessment Phase

### 9.1 Pre-Assessment (Landing, Auth, Briefing)

The pre-assessment screens can include light branding (CORE logo, organization names). Layout is centered, card-based, with generous margins. Authentication flow follows standard email-OTP patterns. The briefing screen should feel welcoming, not intimidating.

### 9.2 During Assessment (Questions)

All branding disappears. The interface becomes pure question + response. The top bar is minimal (section label, question count, timer if visible). The bottom is the submit button. Everything between is the question. This is the most important design decision: during the assessment, the UI gets out of the way completely.

### 9.3 Post-Assessment (Completion)

Returns to branded layout. Confirmation is prominent and warm. No results, no scoring, no analytics. This screen exists for 10–30 seconds before the user leaves.

---

## 10. Data Capture (Invisible to Test-Taker)

The UI silently captures the following alongside answers:

| Data Point | Purpose | Captured How |
|---|---|---|
| Time spent per question (ms) | Speed profiling, anomaly detection | Start timer on question render, stop on submission |
| Time to first interaction (ms) | Reading/processing speed signal | Time from question render to first click/keystroke |
| Answer change count | Confidence/deliberation signal | Count re-selections (single/multi_select) or major edits (open_ended) |
| Submission method | Voluntary vs. auto-advance | Flag whether answer was submitted by button click or timer expiry |
| Client metadata | Debugging, fairness analysis | Browser, viewport size, device type |

**None of this data is displayed to the test-taker.** It feeds into the AI evaluation pipeline's speed profiling and anomaly detection.

---

*Document Version: 1.1*
*Created: April 2026*
*Updated: April 2026*
*Companion documents: CORE Assessment Functional Spec v2.4, CORE Assessment Design Philosophy v1.0, CORE Dashboard Module Spec v1.2*
*Changes from v1.0: Companion doc version bumps, session state backed by PostgreSQL*
