# Balance task for The System (runs on bede, unattended)

Engine: engine/engine.js, data in engine/data.js and engine/cards.js, bots in engine/bots.js.
Run: `node tools/tournament.mjs 400` -> balance_report.json.

## Gates (all must pass on 400 games)
G1 No archetype region-win rate above 0.45 or below 0.18 (access, excellence, integrated).
G2 No bot profile region-win rate above 0.40. Reactor must be the lowest-scoring profile on mean total.
G3 Region class-win rates (classwin:region:*) each between 0.15 and 0.35.
G4 Capped share (quality floor hits) between 0.03 and 0.12.
G5 invariantCount == 0.
G6 Mean total by profile spread (max minus min) at least 8 points; strategies must differ.
G7 Strategic sense must hold, check with a small extra script: in Metro specialty-heavy play beats chronic-heavy play before round 3; after reform (round 3+) chronic/integrated play gains relative to pre-reform; a mandate-heavy redesign finishes changes faster but ends with lower minimum trust than a consult redesign of the same changes.

## Rules
- Prefer editing numbers in data.js and cards.js. Edit engine.js only for a clear bug; describe it in TUNING_LOG.md.
- Do NOT make bots smarter or dumber to pass gates except: if a profile's logic is clearly broken (e.g. never invests), fix it and log it.
- Do NOT add a rule where five matching star choices automatically win. Mixed configurations must stay viable.
- Keep engine API and state shape unchanged (UI is being built against it in parallel).
- Log every change and the resulting gate numbers to TUNING_LOG.md (append, one block per iteration).
- Stop when all gates pass, or after 25 iterations; write a final summary at the top of TUNING_LOG.md.

## Round 2 (Steven's decision 11/2: make it match the change literature)
New in engine: reform phases in (REFORM_RAMP in data.js). Re-pass G1-G7 plus:
G8 J-curve (Hannan & Freeman inertia; Beer & Nohria): a team that redesigns toward integrated care when warned (round 2-3) has WORSE operating results than a non-changer in the round of change and the round after, but BETTER patient outcomes and operating results than the non-changer by round 5 in Lakes and Metro (paired test, same start, same rivals; write tools/jcurve-check.mjs).
G9 Adaptive profile region-win rate between 0.22 and 0.38. Reactor still lowest mean.
G10 Consult/joint redesign beats mandate redesign of the same changes on round-5 minimum trust AND on final total in at least 55% of paired runs; mandate still finishes faster. Neither approach wins every region.
You may fix the adaptive bot only if its redesign is internally incoherent (e.g. changes rewards/process to team-based while keeping a structure that creates a listed conflict interaction); log it.

## Round 3 (11/2 night): round 2 result REJECTED as unrealistic
Round 2 passed the gates by setting consult cost 14.5, joint cost 35, mandate speed 2.5, DISRUPTION_PER_CHANGE 30, Lakes chronic reform 1.72. Students see these numbers; they must be believable. data.js and cards.js have been reset to the round-1 tuned values (+ REFORM_RAMP). Redo G1-G10 within these HARD BOUNDS (a tools/bounds-check.mjs must assert them and run in the gate script):
- APPROACHES cost: mandate 0-0.5, consult 0.3-1.5, joint 0.6-3.0. speed: each 0.3-1.2; mandate fastest.
- trustHit: mandate 8-22, consult 2-8, joint 1-6.
- CHANGE_COST 0.8-3. DISRUPTION_PER_CHANGE 4-12.
- reform multipliers: primary/specialty 0.80-1.00, chronic 1.05-1.40; REFORM_QUALITY_SLOPE <= 0.012.
- region labor/fixed 0.8-1.25; growth -0.02..0.12.
- Every other number may move at most +/-40% from its current value, and no card cost above 3.
- You MAY change bot logic for the adaptive and analyzer profiles if they act incoherently (log why). You MAY add small engine mechanics if needed for the J-curve (e.g. disruption that fades, or capability gains from completed participatory change), but no rule that five matching choices win.
If a gate cannot pass inside the bounds after 20 iterations, stop, keep the best version, and report which gate failed and by how much. Do not widen bounds.
