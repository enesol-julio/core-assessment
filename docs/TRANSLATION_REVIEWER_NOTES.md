# Translation Reviewer Notes — Judgment Calls for Bilingual Review

## Critical: Questions Requiring Bilingual Validation

### 🔴 s1-q07 — Anagram Substitution (HIGHEST PRIORITY)

**English:** "If the letters in 'CHEATER' are rearranged, they spell the name of a:" → TEACHER (Profession, option c)

**Spanish:** "Si las letras de 'LÁMINA' se reordenan, forman el nombre de un/una:" → ANIMAL (Animal, option c)

**What changed:** The entire word pair was replaced. CHEATER→TEACHER is English-only. LÁMINA→ANIMAL is the Spanish substitute (both share letters A,A,I,L,M,N).

**Scoring compatibility:** To preserve `correct_answer = "c"` without any system changes, the Spanish overlay **swaps the text** of option_id "b" and "c":
- English: a=City, **b=Animal**, **c=Profession**, d=Color → correct is "c" (Profession)
- Spanish: a=Ciudad, **b=Profesión**, **c=Animal**, d=Color → correct is "c" (Animal)

**This is intentional and correct.** The answer key `"c"` works in both languages. No system changes needed.

**Reviewer action:** Verify that LÁMINA→ANIMAL is solvable under 30-second time pressure for a native Spanish speaker. Confirm the anagram is valid (L,Á,M,I,N,A = A,N,I,M,A,L).

---

### 🟡 s1-q05 — Month Initial Sequence (MEDIUM PRIORITY)

**English:** J, F, M, A, M, J, J, ? (January, February, March...)

**Spanish:** E, F, M, A, M, J, J, ? (Enero, Febrero, Marzo...)

**What changed:** First letter changed from J→E (January→Enero). All other initials happen to match.

**Answer key:** Unchanged. Correct answer is "a" (A) — August/Agosto both start with A.

**Reviewer action:** Confirm the sequence E,F,M,A,M,J,J is immediately recognizable to a native Spanish speaker as month initials. Verify it's not accidentally easier or harder than the English version.

---

### 🟡 s1-q17 — Letter-Value Calculation with English Word (MEDIUM PRIORITY)

**English/Spanish:** "If A=1, B=2, C=3... Z=26, what does the word 'ACE' total?"

**Decision:** Kept "ACE" untranslated. The word is short, recognizable in Spanish contexts (poker, tennis), and the cognitive task is arithmetic (1+3+5), not vocabulary. Translating to a Spanish word would require changing the answer.

**Reviewer action:** Confirm that "ACE" is recognizable enough to Spanish speakers that they won't spend time confused by the word instead of doing the math.

---

### 🟢 s1-q02 — Concept Classification (LOW PRIORITY)

**English:** Blueprint / Recipe / Itinerary / Souvenir

**Spanish:** Plano / Receta / Itinerario / Recuerdo

**Assessment:** Clean translation. The plan-vs-result distinction holds perfectly. "Recuerdo" (memento/souvenir) is the odd one out just as "Souvenir" is in English.

---

### 🟢 s1-q04 — Analogy (LOW PRIORITY)

**English:** Outline : Essay :: Skeleton : ___

**Spanish:** Esquema : Ensayo :: Esqueleto : ___

**Assessment:** Clean translation. "Esquema" (outline/framework) has the same structural-plan connotation in Spanish. All four options translate directly: Hueso, Cuerpo, Radiografía, Fósil.

---

### 🟢 Section 3 & 5 — Business Scenarios (LOW PRIORITY)

All business scenarios (order processing, scheduling systems, meeting rooms, invoice automation, hiring pipelines, catering vendors, etc.) use universally understood business concepts. Terms like SLA, PTO, NDA, PDF, HubSpot, Google Analytics, and Slack were kept in English where they're standard in professional Spanish-speaking contexts.

**Reviewer action:** Spot-check that no intentional ambiguity was accidentally resolved in translation. Focus on s3-q01 through s3-q07 (multi-select) where the gap between "real issue" and "opinion/preference" distractors must feel equally plausible in Spanish.

---

### 🟢 Section 4 — Logical Precision (LOW PRIORITY)

All quantifiers translated with exact logical equivalents:
- "All" → "Todos"
- "Some" → "Algunos"
- "Every" → "Todo/Cada"
- "No/None" → "Ningún/Ninguno"
- "Only if" → "Solo si"
- "Unless" → "A menos que"
- "Must" → "Debe/Deben"

**Reviewer action:** Spot-check s4-q03, s4-q04, and s4-q08 where the logical connectives are load-bearing for the correct answer.

---

## Section short_name Translations

| English | Spanish | Notes |
|---------|---------|-------|
| Speed Round | Ronda Rápida | Direct, natural |
| Logic | Lógica | Direct |
| The BA Lens | El Ojo Analítico | "The BA Lens" is English-specific jargon. "El Ojo Analítico" (The Analytical Eye) conveys the same intent — looking critically at details. |
| Decomposition | Descomposición | Direct |
| The QA Lens | El Ojo de QA | Hybrid — "QA" is universally understood in professional Spanish. "Ojo" preserves the lens/eye metaphor. |

---

## Files Delivered

| File | Questions/Keys | Status |
|------|---------------|--------|
| es-section-1-rapid-recognition.json | 20 questions | ✅ Valid JSON, all IDs match |
| es-section-2-problem-decomposition.json | 10 questions | ✅ Valid JSON, all IDs match |
| es-section-3-critical-observation.json | 12 questions | ✅ Valid JSON, all IDs match |
| es-section-4-logical-reasoning.json | 15 questions | ✅ Valid JSON, all IDs match |
| es-section-5-output-validation.json | 13 questions | ✅ Valid JSON, all IDs match |
| es-assessment-meta-overrides.json | 5 sections | ✅ Valid JSON |
| es-ui-strings.json | 57 keys | ✅ Valid JSON, key parity with EN |
| en-ui-strings.json | 57 keys | ✅ Valid JSON, key parity with ES |
