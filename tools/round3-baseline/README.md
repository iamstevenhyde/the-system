# Round 3 reference values

`data.js` and `cards.js` are exact copies of the reset files received at the start of Round 3, before any edits. `engine.js` is the incoming engine, including the pre-existing reform ramp. Do not regenerate these references from tuned files. The explicit bounds in BALANCE_BRIEF.md supersede percentage bounds; all other existing numeric values remain within 40% of these references.

The gate runner imports `bounds-check.mjs` before evaluating G1–G10. It checks exported numeric data recursively, requires unchanged card predicates, and compares the engine's existing numeric literals. Two documented additions have separate conservative limits: implementation backfill expense (0–0.15 $M per disruption point) and completion learning (0–4 efficiency points, within the engine's existing capability-bonus cap). These limits are local safeguards for new mechanics, not replacements for any brief bound.
