# Final summary: Round 3 PASS (G1-G10, bounds-check). See the last block for changes and numbers.

# Final balance summary — Round 2

All **G1–G10 pass** after Round 2 iteration **14** (baseline plus 13 tuning iterations), within the 25-iteration limit. The tournament covers **400 seeded games / 5,796 teams**; paired checks cover 100 seeds per tested region. Tuning stopped on the first all-pass result. Full-precision results are in `balance_report.json` and `balance_gates.json`.

| Gate | Final evidence |
| --- | --- |
| G1 | Archetype region wins: access **25.940%**, excellence **20.882%**, integrated **32.375%**. |
| G2 | Profile region wins: defender **33.909%**, prospector **25.431%**, analyzer **38.913%**, adaptive **35.893%**, reactor **3.883%**. Reactor has the lowest mean total, **46.380**. |
| G3 | Class wins: Mountain **15.25%**, Metro **28.50%**, Sunbelt **24.50%**, Lakes **31.75%**. |
| G4 | Quality-floor capped share **7.643%**. |
| G5 | **0** invariant violations. |
| G6 | Profile mean spread **17.032** points (adaptive 63.412 minus reactor 46.380). |
| G7 | Metro chronic-minus-specialty operating surplus improves from **−8.058** before reform to **−6.117** after reform. Two-change mandate finishes in round **2**, consultation in round **4**; final minimum trust **19.518** versus **38.451**. |
| G8 | In both Lakes and Metro, paired mean operating surplus falls during redesign and recovers above the non-changer by round 5, with better patient outcomes; details below. |
| G9 | Adaptive region wins **35.893%**, within 22–38%; reactor remains lowest on mean total. |
| G10 | Consultation wins on both minimum trust and final total in **63.00%** of pairs; joint redesign in **58.00%**. Mandates finish strictly faster in **100.00%** and **67.75%**, respectively. Both participatory approaches lose a majority of pairs in Lakes and win a majority elsewhere. |

## Paired change checks

`tools/jcurve-check.mjs` compares identical initial organizations, seeds, regional events and rival policies. Each region has three fixed rival archetypes; all teams use equal focus, standard prices and counter responses, without investment or pilots. Proposal selection remains endogenous to each arm's organizational state.

G8 starts from excellence, changes structure/process toward integrated care jointly in round 2 when warned, then strategy/rewards in round 3; the comparator makes no changes. The resulting organization retains expert people, so this is a mixed configuration, not a five-matching-choice win rule. The gate compares paired **means**, not a universal per-seed guarantee.

| Region | Round 2 operating delta | Round 3 operating delta | Round 4 operating delta | Round 5 operating delta | Round 5 outcome delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lakes | −0.6106 | −5.2141 | −4.8183 | +0.0584 | +0.7122 |
| Metro | −0.2589 | −5.3545 | −3.5887 | +0.0934 | +1.1626 |

Operating deltas are $M per round; outcome deltas are points on the engine's patient-weighted outcome measure. These late surplus gains are small. The results establish the specified seeded mean J-curve, not robustness to every seed, policy or starting configuration.

G10 uses 400 pairs per participatory approach: 100 per region, evenly split between access and excellence starts, with the same two process/reward changes in round 2. A win requires **both** higher round-5 minimum trust and higher final total; ties do not count. Regional winners are determined by a majority of paired final-total wins, not mean score margins. Mandate must finish strictly faster in a majority of pairs. All participatory runs finish by round 5.

| Region | Consult total wins | Joint total wins |
| --- | ---: | ---: |
| Mountain | 50% | 85% |
| Metro | 99% | 67% |
| Sunbelt | 68% | 58% |
| Lakes | 35% | 22% |

Joint redesign still has a positive *mean* score delta in Lakes despite losing most pairs there; G10's regional diversity criterion is the paired win frequency. Consultation's mean score delta in Lakes is negative.

## Changes and limits

Round 2 changes only tuning numbers in `engine/data.js` and `engine/cards.js`. `engine.js`, `bots.js`, the engine API and state shape are unchanged by this pass. The existing REFORM_RAMP remains **0.5 / 0.8 / 1.0**. The adaptive bot already starts fully integrated and had no incoherent redesign to fix.

The main changes increase disruption and redesign completion speeds, strengthen late quality-based reimbursement, rebalance regional costs and care economics, and reduce exploration returns. Full cross-training now costs 3.5 rather than 1.5 and gives 3 rather than 5 adaptability points. The regional approach tradeoff required substantial facilitation costs: consultation **14.5** and joint **35.0** $M per redesign round, in addition to 1.5 per changed point. These are gameplay calibration values, not empirical cost estimates; they materially reduce cash available for investment. Every intermediate change and gate result appears below.

The tournament now retains unrounded means, and the gate runner rejects missing/non-finite required metrics and reports other than 400 games. G10 was strengthened during development to require regional majority winners in both directions; its completion checker was corrected to recognize round-2 finishes. These checker changes are recorded with their iterations.

The 243-configuration-per-region smoke check passes: best mixed/uniform totals are Mountain **67.87/67.80**, Metro **67.47/66.87**, Sunbelt **67.51/67.07**, Lakes **66.82/67.05**. This uses one seed and equal capacities; it checks mixed viability within five points, not universal dominance. Mountain's tournament class-win share is close to the 15% boundary. No unseen-seed claim is made.

## Reproduce

```sh
node tools/tournament.mjs 400
node tools/balance-gates.mjs > balance_gates.json
node tools/jcurve-check.mjs
node tools/strategic-check.mjs
node tools/configuration-check.mjs
```

The final tournament and combined gate check passed at iteration 14; the independent configuration smoke check also passed. No tuning followed iteration 14. Whitespace validation passes with CRLF recognized (`git -c core.whitespace=cr-at-eol diff --check`); the untouched incoming `engine.js` uses CRLF.

The existing `balance_iterations.bundle` contains only the earlier Round 1 history and was not refreshed for Round 2. Current Round 2 results and edits are present in the workspace. Round 1 iterations 1–9 below are historical; Round 2 iterations are explicitly labeled.

## Iteration history

## Iteration 1 — 400 seeded games

Established baseline and added reproducible G1–G7 checks. Fixed tournament classwin denominator: one observation per region per game (400), previously one per team (~1450), which made all four regions reaching 15% mathematically impossible. No engine or bot changes. G7 uses 40 paired Metro seeds with fixed rivals and operating surplus as play performance; redesign compares the same two changes, seed and responses.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": false,
    "G4": false,
    "G5": true,
    "G6": true,
    "G7": false
  },
  "arch": {
    "integrated": 0.55,
    "access": 0.058,
    "excellence": 0.012
  },
  "wins": {
    "analyzer": 0.94,
    "adaptive": 0.315,
    "reactor": 0.035,
    "defender": 0.076,
    "prospector": 0.014
  },
  "regions": {
    "mountain": 0.007,
    "metro": 0,
    "sunbelt": 0.233,
    "lakes": 0.76
  },
  "means": {
    "analyzer": 53.111,
    "adaptive": 50.844,
    "reactor": 29.792,
    "defender": 38.933,
    "prospector": 31.964
  },
  "capped": 0.283,
  "invariantCount": 0,
  "spread": 23.318999999999996,
  "strategic": {
    "preReformChronicAdvantage": 2.1308749999999996,
    "postReformChronicAdvantage": 8.114416666666667,
    "mandate": {
      "finished": 4,
      "minTrust": 38.44908199213631
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42514044247491
    },
    "pass": false
  }
}
```

## Iteration 2 — 400 seeded games

Raised primary/specialty rates to .25/1.60, lowered chronic to .50; reduced primary/specialty fixed costs to .045/.22; reduced integrated initial chronic capacity to 32. Lowered quality floor to 40. Mandates now speed 1.05 with trust hit 18, making the speed/trust tradeoff observable. G4–G7 pass; archetype/profile and geography remain skewed.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "integrated": 0.534,
    "access": 0.085,
    "excellence": 0.014
  },
  "wins": {
    "analyzer": 0.972,
    "adaptive": 0.248,
    "defender": 0.102,
    "reactor": 0.049,
    "prospector": 0.01
  },
  "regions": {
    "mountain": 0.015,
    "metro": 0,
    "sunbelt": 0.33,
    "lakes": 0.655
  },
  "means": {
    "analyzer": 53.733,
    "adaptive": 52.215,
    "defender": 47.543,
    "reactor": 36.719,
    "prospector": 39.12
  },
  "capped": 0.062,
  "invariantCount": 0,
  "spread": 17.013999999999996,
  "strategic": {
    "preReformChronicAdvantage": -0.2082500000000001,
    "postReformChronicAdvantage": 3.5235000000000007,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42514044247491
    },
    "pass": true
  }
}
```

## Iteration 3 — 400 seeded games

Primary quality now weights efficiency .45, coordination .10, responsiveness .15 (weights still sum to one). Rates .26/2.20/.45 and specialty variable share .25 reward specialty economics. Metro labor/fixed 1.02/.94 and Mountain labor 1.02 reduce regional cost disadvantages; Sunbelt growth .06 and Lakes chronic demand 1.15 reduce geographic advantages.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "integrated": 0.22,
    "excellence": 0.527,
    "access": 0.123
  },
  "wins": {
    "adaptive": 0.145,
    "prospector": 0.667,
    "defender": 0.158,
    "reactor": 0.054,
    "analyzer": 0.355
  },
  "regions": {
    "mountain": 0.068,
    "metro": 0.02,
    "sunbelt": 0.28,
    "lakes": 0.632
  },
  "means": {
    "adaptive": 62.203,
    "prospector": 65.61,
    "defender": 63.477,
    "reactor": 52.26,
    "analyzer": 62.59
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 13.350000000000001,
  "strategic": {
    "preReformChronicAdvantage": -9.506500000000004,
    "postReformChronicAdvantage": -6.592166666666666,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42514044247491
    },
    "pass": true
  }
}
```

## Iteration 4 — 400 seeded games

Specialty variable share .32 trims excess margin; primary rate .28 supports access. Regional fixed multipliers Mountain .78, Metro .80, Sunbelt 1.05, Lakes 1.30 address observed class-win skew.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "excellence": 0.368,
    "access": 0.366,
    "integrated": 0.173
  },
  "wins": {
    "prospector": 0.451,
    "defender": 0.472,
    "adaptive": 0.102,
    "reactor": 0.066,
    "analyzer": 0.29
  },
  "regions": {
    "mountain": 0.24,
    "metro": 0.145,
    "sunbelt": 0.578,
    "lakes": 0.037
  },
  "means": {
    "prospector": 60.907,
    "defender": 63.555,
    "adaptive": 59.749,
    "reactor": 50.461,
    "analyzer": 60.367
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 13.094000000000001,
  "strategic": {
    "preReformChronicAdvantage": -7.39825,
    "postReformChronicAdvantage": -4.574999999999998,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42514044247491
    },
    "pass": true
  }
}
```

## Iteration 5 — 400 seeded games

Primary rate .27 and chronic .48 restore some integrated competitiveness. Fixed multipliers Mountain .80, Metro .76, Sunbelt 1.18, Lakes 1.14 correct the overlarge regional adjustment in iteration 4.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "integrated": 0.236,
    "excellence": 0.37,
    "access": 0.252
  },
  "wins": {
    "adaptive": 0.135,
    "prospector": 0.452,
    "defender": 0.326,
    "reactor": 0.066,
    "analyzer": 0.401
  },
  "regions": {
    "mountain": 0.217,
    "metro": 0.235,
    "sunbelt": 0.205,
    "lakes": 0.343
  },
  "means": {
    "adaptive": 60.681,
    "prospector": 61.396,
    "defender": 63.441,
    "reactor": 50.998,
    "analyzer": 61.207
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 12.443000000000005,
  "strategic": {
    "preReformChronicAdvantage": -7.306625000000004,
    "postReformChronicAdvantage": -4.205416666666666,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42514044247491
    },
    "pass": true
  }
}
```

## Iteration 6 — 400 seeded games

Specialty variable cost share .33 gently reduces prospector margins. Safe-staffing counteroffer quality +3/+3 (from +2/+2) and discharge-authority counteroffer coordination +4 (from +3) narrow accept/counter differences without changing bot decisions. Lakes fixed multiplier 1.16 reduces its near-ceiling class-win rate.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "excellence": 0.318,
    "integrated": 0.229,
    "access": 0.316
  },
  "wins": {
    "prospector": 0.38,
    "adaptive": 0.117,
    "defender": 0.409,
    "reactor": 0.069,
    "analyzer": 0.405
  },
  "regions": {
    "mountain": 0.237,
    "metro": 0.263,
    "sunbelt": 0.245,
    "lakes": 0.255
  },
  "means": {
    "prospector": 60.365,
    "adaptive": 60.282,
    "defender": 63.427,
    "reactor": 50.592,
    "analyzer": 60.803
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 12.835,
  "strategic": {
    "preReformChronicAdvantage": -7.025749999999992,
    "postReformChronicAdvantage": -3.9019166666666676,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42497562257415
    },
    "pass": true
  }
}
```

## Iteration 7 — 400 seeded games

Primary rate .268 trims access margin slightly. Safe-staffing counteroffer quality +4/+4; discharge-authority accept and counter both grant +5 coordination, retaining distinct trust, admin and influence effects. This targets analyzer versus adaptive outcome differences through proposal tradeoffs, leaving all bot logic untouched.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "excellence": 0.313,
    "integrated": 0.228,
    "access": 0.325
  },
  "wins": {
    "prospector": 0.376,
    "adaptive": 0.125,
    "defender": 0.42,
    "reactor": 0.066,
    "analyzer": 0.393
  },
  "regions": {
    "mountain": 0.233,
    "metro": 0.255,
    "sunbelt": 0.26,
    "lakes": 0.253
  },
  "means": {
    "prospector": 60.356,
    "adaptive": 60.297,
    "defender": 63.516,
    "reactor": 50.486,
    "analyzer": 60.779
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 13.030000000000001,
  "strategic": {
    "preReformChronicAdvantage": -7.034125000000001,
    "postReformChronicAdvantage": -3.8877499999999996,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42481139009179
    },
    "pass": true
  }
}
```

## Iteration 8 — 400 seeded games

Primary rate .26 reduces defender margins; specialty variable share .325 partially restores specialty margin. Exploration return 1.0 (from 1.6) narrows the resilience gap between investing analyzer and adaptive without altering either decision policy.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "integrated": 0.239,
    "excellence": 0.303,
    "access": 0.315
  },
  "wins": {
    "adaptive": 0.148,
    "prospector": 0.359,
    "defender": 0.406,
    "reactor": 0.071,
    "analyzer": 0.396
  },
  "regions": {
    "mountain": 0.205,
    "metro": 0.3,
    "sunbelt": 0.235,
    "lakes": 0.26
  },
  "means": {
    "adaptive": 60.153,
    "prospector": 59.714,
    "defender": 63.084,
    "reactor": 50.477,
    "analyzer": 60.454
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 12.607000000000006,
  "strategic": {
    "preReformChronicAdvantage": -7.228249999999998,
    "postReformChronicAdvantage": -4.070416666666666,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42481139009179
    },
    "pass": true
  }
}
```

## Iteration 9 — 400 seeded games

Specialty variable share .322 (from .325) is a small margin adjustment to bring defender below the profile ceiling while preserving specialty/integrated competition.

```json
{
  "gates": {
    "G1": true,
    "G2": true,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true
  },
  "arch": {
    "integrated": 0.241,
    "excellence": 0.317,
    "access": 0.296
  },
  "wins": {
    "adaptive": 0.152,
    "prospector": 0.378,
    "defender": 0.383,
    "reactor": 0.07,
    "analyzer": 0.397
  },
  "regions": {
    "mountain": 0.203,
    "metro": 0.297,
    "sunbelt": 0.23,
    "lakes": 0.27
  },
  "means": {
    "adaptive": 60.266,
    "prospector": 59.999,
    "defender": 63.128,
    "reactor": 50.577,
    "analyzer": 60.558
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 12.551000000000002,
  "strategic": {
    "preReformChronicAdvantage": -7.310750000000001,
    "postReformChronicAdvantage": -4.153333333333333,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42481139009179
    },
    "pass": true
  }
}
```

## Round 2 iteration 1 — 400 seeded games

Baseline after REFORM_RAMP. Added G8/G10 paired checks and integrated G8–G10 into the gate runner. G8 uses an excellence start, joint structure/process redesign in round 2 and strategy/rewards in round 3; fixed equal focus and no investment in either arm. G10 uses identical process/rewards changes in round 2, 100 seeds per region evenly split between access and excellence starts, testing consult and joint separately. Rivals use fixed equal focus and counter responses. All gate scenarios are fixed before tuning. G8 evaluates paired mean differences; G10 requires simultaneous trust and total wins in at least 55% for each participatory approach and mandate faster in a majority. Neither approach may sweep all regions. No engine or bot changes.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": false,
    "G10": false
  },
  "arch": {
    "access": 0.355,
    "integrated": 0.173,
    "excellence": 0.378
  },
  "wins": {
    "defender": 0.462,
    "adaptive": 0.125,
    "prospector": 0.458,
    "reactor": 0.067,
    "analyzer": 0.268
  },
  "regions": {
    "mountain": 0.17,
    "metro": 0.34,
    "sunbelt": 0.31,
    "lakes": 0.18
  },
  "means": {
    "defender": 64.124,
    "adaptive": 60.39,
    "prospector": 61.417,
    "reactor": 51.45,
    "analyzer": 60.658
  },
  "capped": 0.047,
  "invariantCount": 0,
  "spread": 12.673999999999992,
  "strategic": {
    "preReformChronicAdvantage": -7.310750000000001,
    "postReformChronicAdvantage": -5.247000000000001,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42481139009179
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": 0.4060999999999994,
            "outcomeDelta": -3.3000000000000056
          },
          {
            "round": 3,
            "operatingDelta": -0.7997000000000023,
            "outcomeDelta": -4.937499999999999
          },
          {
            "round": 4,
            "operatingDelta": -3.4273,
            "outcomeDelta": -6.038300000000001
          },
          {
            "round": 5,
            "operatingDelta": -0.346899999999999,
            "outcomeDelta": -0.32590000000000025
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": 0.46409999999999896,
            "outcomeDelta": -3.3888000000000034
          },
          {
            "round": 3,
            "operatingDelta": -0.900299999999998,
            "outcomeDelta": -5.242899999999996
          },
          {
            "round": 4,
            "operatingDelta": -1.9601999999999984,
            "outcomeDelta": -5.1441000000000034
          },
          {
            "round": 5,
            "operatingDelta": 0.6980000000000001,
            "outcomeDelta": 0.13269999999999896
          }
        ],
        "pass": false
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.9139000000000002,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.6011999999999997,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.84,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.9562000000000002,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.72,
            "bothWinRate": 0.36,
            "mandateFasterRate": 1,
            "meanTotalDelta": -1.1236999999999993,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.59,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 2.0853000000000015,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.71,
            "meanTotalDelta": 2.7431999999999994,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 4.626200000000002,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 4.420900000000002,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.625,
        "mandateFasterRate": 0.5525,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 2 — 400 seeded games

Disruption per change 7→14 makes reorganization carry an initial operating cost; speeds mandate 1.05→1.40, consult .40→.50, joint .50→.60 allow staged redesigns to mature in five rounds. Reform quality slope .006→.010 and chronic base rate .48→.52 strengthen late returns to care coordination. Numbers only; bots and engine untouched.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": false,
    "G10": false
  },
  "arch": {
    "integrated": 0.287,
    "access": 0.3,
    "excellence": 0.233
  },
  "wins": {
    "adaptive": 0.179,
    "defender": 0.381,
    "prospector": 0.259,
    "reactor": 0.085,
    "analyzer": 0.475
  },
  "regions": {
    "mountain": 0.182,
    "metro": 0.38,
    "sunbelt": 0.16,
    "lakes": 0.278
  },
  "means": {
    "adaptive": 60.908,
    "defender": 62.868,
    "prospector": 58.193,
    "reactor": 49.951,
    "analyzer": 61.383
  },
  "capped": 0.056,
  "invariantCount": 0,
  "spread": 12.917000000000002,
  "strategic": {
    "preReformChronicAdvantage": -7.109124999999999,
    "postReformChronicAdvantage": -5.252083333333333,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.43605644561547
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": 0.17320000000000005,
            "outcomeDelta": -5.36000000000001
          },
          {
            "round": 3,
            "operatingDelta": -3.3918000000000075,
            "outcomeDelta": -7.917499999999989
          },
          {
            "round": 4,
            "operatingDelta": -7.075000000000006,
            "outcomeDelta": -8.36590000000001
          },
          {
            "round": 5,
            "operatingDelta": -2.0495999999999985,
            "outcomeDelta": -1.320999999999998
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": 0.2193999999999996,
            "outcomeDelta": -5.455700000000006
          },
          {
            "round": 3,
            "operatingDelta": -3.5559999999999974,
            "outcomeDelta": -8.360999999999994
          },
          {
            "round": 4,
            "operatingDelta": -5.544499999999998,
            "outcomeDelta": -7.7774000000000045
          },
          {
            "round": 5,
            "operatingDelta": -0.7992000000000001,
            "outcomeDelta": -0.7767999999999993
          }
        ],
        "pass": false
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.6117000000000008,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.1605999999999987,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.84,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.2528999999999995,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.73,
            "bothWinRate": 0.37,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.09480000000000047,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5925,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 3.2788,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 3.9716000000000027,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 5.089299999999997,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 5.219999999999999,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.625,
        "mandateFasterRate": 0.75,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 3 — 400 seeded games

Disruption 14→24; speeds mandate 1.40→1.65, consult .50→.60, joint .60→.80. Joint facilitation cost 1.2→5 introduces a financial tradeoff. Primary quality moves .10 weight from efficiency to coordination, rewarding coordinated patient care; chronic construction yield 2.6→3.4 supports capacity growth. Metro fixed .76→.80 reduces class-win concentration.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": false,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.462,
    "excellence": 0.201,
    "access": 0.023
  },
  "wins": {
    "adaptive": 0.35,
    "prospector": 0.236,
    "reactor": 0.052,
    "analyzer": 0.713,
    "defender": 0.029
  },
  "regions": {
    "mountain": 0.188,
    "metro": 0.35,
    "sunbelt": 0.15,
    "lakes": 0.313
  },
  "means": {
    "adaptive": 65.511,
    "prospector": 58.154,
    "reactor": 47.998,
    "analyzer": 65.811,
    "defender": 58.215
  },
  "capped": 0.057,
  "invariantCount": 0,
  "spread": 17.81300000000001,
  "strategic": {
    "preReformChronicAdvantage": -7.104124999999998,
    "postReformChronicAdvantage": -4.148416666666666,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 3,
      "minTrust": 38.44727187881294
    },
    "pass": false
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.29279999999999967,
            "outcomeDelta": -7.275700000000008
          },
          {
            "round": 3,
            "operatingDelta": -4.090099999999998,
            "outcomeDelta": -6.821100000000007
          },
          {
            "round": 4,
            "operatingDelta": -3.4249999999999967,
            "outcomeDelta": 0.4290000000000003
          },
          {
            "round": 5,
            "operatingDelta": 0.4005000000000007,
            "outcomeDelta": 5.251899999999996
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": 0.17880000000000112,
            "outcomeDelta": -6.677000000000008
          },
          {
            "round": 3,
            "operatingDelta": -4.163000000000002,
            "outcomeDelta": -7.250200000000003
          },
          {
            "round": 4,
            "operatingDelta": -1.5863,
            "outcomeDelta": 1.4622999999999993
          },
          {
            "round": 5,
            "operatingDelta": 1.5172999999999996,
            "outcomeDelta": 5.6422
          }
        ],
        "pass": false
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 2.450200000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 2.8457000000000003,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 2.557400000000001,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.75,
            "meanTotalDelta": 1.705600000000001,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.625,
        "mandateFasterRate": 0.75,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.15,
            "meanTotalDelta": 4.7339,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.26,
            "meanTotalDelta": 3.9153,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.15,
            "meanTotalDelta": 4.626799999999998,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.15,
            "meanTotalDelta": 3.713800000000001,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.625,
        "mandateFasterRate": 0.17750000000000002,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 4 — 400 seeded games

Primary quality weights .425 efficiency/.125 coordination restore access competitiveness after iteration 3 overcorrected. Disruption 24→30 targets the remaining positive initial Metro redesign delta. Mandate speed 1.65→2.20 and consult .60→.50 restore completion-order separation; joint cost 5→12 strengthens its resource tradeoff.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.376,
    "excellence": 0.231,
    "access": 0.146
  },
  "wins": {
    "adaptive": 0.282,
    "prospector": 0.271,
    "defender": 0.189,
    "reactor": 0.053,
    "analyzer": 0.586
  },
  "regions": {
    "mountain": 0.19,
    "metro": 0.34,
    "sunbelt": 0.15,
    "lakes": 0.32
  },
  "means": {
    "adaptive": 62.922,
    "prospector": 58.399,
    "defender": 61.581,
    "reactor": 47.259,
    "analyzer": 63.199
  },
  "capped": 0.064,
  "invariantCount": 0,
  "spread": 15.939999999999998,
  "strategic": {
    "preReformChronicAdvantage": -7.104124999999998,
    "postReformChronicAdvantage": -4.97025,
    "mandate": {
      "finished": 2,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.44764393415884
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5412999999999992,
            "outcomeDelta": -9.367600000000008
          },
          {
            "round": 3,
            "operatingDelta": -4.994799999999997,
            "outcomeDelta": -10.613599999999984
          },
          {
            "round": 4,
            "operatingDelta": -4.867100000000002,
            "outcomeDelta": -4.157499999999998
          },
          {
            "round": 5,
            "operatingDelta": -0.49979999999999963,
            "outcomeDelta": 1.8468000000000007
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.19980000000000014,
            "outcomeDelta": -9.050000000000004
          },
          {
            "round": 3,
            "operatingDelta": -5.081700000000001,
            "outcomeDelta": -11.1809
          },
          {
            "round": 4,
            "operatingDelta": -3.1551,
            "outcomeDelta": -3.3262999999999994
          },
          {
            "round": 5,
            "operatingDelta": 0.6075000000000005,
            "outcomeDelta": 2.280800000000001
          }
        ],
        "pass": true
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.49,
            "bothWinRate": 0.49,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.2245999999999998,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.18720000000000078,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.33,
            "bothWinRate": 0.33,
            "mandateFasterRate": 1,
            "meanTotalDelta": -1.5797000000000005,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.33,
            "bothWinRate": 0.33,
            "mandateFasterRate": 1,
            "meanTotalDelta": -2.8705000000000003,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.41250000000000003,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.15,
            "meanTotalDelta": 2.811500000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.26,
            "meanTotalDelta": 2.6449999999999982,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.15,
            "meanTotalDelta": 4.9947,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.15,
            "meanTotalDelta": 2.151,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.625,
        "mandateFasterRate": 0.17750000000000002,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 5 — 400 seeded games

Corrected paired completion measurement: two-change scenarios can finish in round 2 (previous checker recorded no earlier than round 3, concealing mandate speed). Primary quality restored to .45/.10. Mandate speed 2.20→2.50 and trust hit 18→24; consult speed .50→.55; joint cost 12→20. Lakes full chronic reform multiplier 1.32→1.48 supports its late J-curve recovery. Full cross-training proposal cost 1.5→3.5 and adaptability gain 5→3 bring its cost/benefit closer to the negotiated program and reduce analyzer dominance without changing bot logic.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.329,
    "excellence": 0.159,
    "access": 0.301
  },
  "wins": {
    "adaptive": 0.329,
    "prospector": 0.18,
    "defender": 0.391,
    "reactor": 0.05,
    "analyzer": 0.431
  },
  "regions": {
    "mountain": 0.165,
    "metro": 0.228,
    "sunbelt": 0.138,
    "lakes": 0.47
  },
  "means": {
    "adaptive": 62.884,
    "prospector": 56.528,
    "defender": 62.893,
    "reactor": 45.712,
    "analyzer": 62.347
  },
  "capped": 0.076,
  "invariantCount": 0,
  "spread": 17.180999999999997,
  "strategic": {
    "preReformChronicAdvantage": -7.104124999999998,
    "postReformChronicAdvantage": -5.24575,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5412999999999992,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.062299999999999,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.868899999999999,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": -0.2795999999999998,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.19980000000000014,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.1775999999999955,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.4177000000000004,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.30669999999999986,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.7623,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.3245,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.8109999999999995,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.9166999999999985,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.7125,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.460700000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 2.8539999999999996,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 5.287800000000001,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 4.195999999999998,
            "unfinished": 0
          }
        },
        "bothWinRate": 1,
        "mandateFasterRate": 0.6775,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 6 — 400 seeded games

Specialty variable share .322→.300 restores prospector/excellence margins. Fixed multipliers Lakes 1.16→1.24 and Sunbelt 1.18→1.12 address geographic skew. Lakes chronic reform 1.48→1.65 targets late operating recovery. Joint facilitation cost 20→32 tests whether its score advantage can retain a genuine resource tradeoff.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": true
  },
  "arch": {
    "integrated": 0.348,
    "excellence": 0.2,
    "access": 0.224
  },
  "wins": {
    "adaptive": 0.342,
    "prospector": 0.242,
    "defender": 0.293,
    "analyzer": 0.465,
    "reactor": 0.038
  },
  "regions": {
    "mountain": 0.145,
    "metro": 0.165,
    "sunbelt": 0.147,
    "lakes": 0.542
  },
  "means": {
    "adaptive": 64.265,
    "prospector": 58.747,
    "defender": 63.309,
    "analyzer": 63.739,
    "reactor": 46.606
  },
  "capped": 0.076,
  "invariantCount": 0,
  "spread": 17.659,
  "strategic": {
    "preReformChronicAdvantage": -7.731250000000003,
    "postReformChronicAdvantage": -5.849333333333334,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5815999999999978,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.120199999999999,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.6987,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.13910000000000092,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.24579999999999963,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.255999999999999,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.469099999999999,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.1955999999999998,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.768599999999999,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.3068999999999984,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.4797999999999996,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.8817999999999997,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.7125,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.95,
            "bothWinRate": 0.95,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.746200000000002,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.74,
            "bothWinRate": 0.74,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.6817000000000002,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.4963000000000015,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 2.5257999999999976,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.76,
        "mandateFasterRate": 0.6775,
        "pass": true
      }
    },
    "pass": true
  }
}
```

## Round 2 iteration 7 — 400 seeded games

Strengthened G10 regional diversity: each participatory approach must win a majority of pairs in some region and lose a majority in another (not merely avoid a 100% sweep). Consult cost .6→8 and joint 32→38 test this regional tradeoff. Chronic base rate .52→.505 trims integrated dominance; Lakes fixed 1.24→1.45 addresses its 54.2% class-win share. G8 passed iteration 6 in both regions.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.333,
    "excellence": 0.204,
    "access": 0.248
  },
  "wins": {
    "adaptive": 0.339,
    "prospector": 0.244,
    "defender": 0.325,
    "reactor": 0.041,
    "analyzer": 0.431
  },
  "regions": {
    "mountain": 0.163,
    "metro": 0.25,
    "sunbelt": 0.25,
    "lakes": 0.338
  },
  "means": {
    "adaptive": 62.96,
    "prospector": 57.509,
    "defender": 62.309,
    "reactor": 45.445,
    "analyzer": 62.417
  },
  "capped": 0.076,
  "invariantCount": 0,
  "spread": 17.515,
  "strategic": {
    "preReformChronicAdvantage": -7.809125,
    "postReformChronicAdvantage": -6.077500000000001,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5787000000000014,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.131699999999995,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.7904,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": -0.03259999999999984,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.23580000000000162,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.262000000000003,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.5581999999999994,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.05440000000000012,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.6945000000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.4328999999999987,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.6957,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8804999999999994,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.7125,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.71,
            "bothWinRate": 0.71,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.8427000000000007,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.14,
            "bothWinRate": 0.14,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": -0.8050000000000004,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 2.5737000000000023,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.14,
            "bothWinRate": 0.14,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": -0.5875000000000007,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.37250000000000005,
        "mandateFasterRate": 0.6775,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 8 — 400 seeded games

Consult cost 8→18 and joint 38→35 seek regional winners without lowering paired overall wins below 55%. Specialty variable share .300→.290 counters analyzer dominance. Lakes chronic reform 1.65→1.72 and fixed multiplier 1.45→1.50 aim to restore positive late redesign margin while retaining geographic balance.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.342,
    "excellence": 0.23,
    "access": 0.206
  },
  "wins": {
    "adaptive": 0.35,
    "prospector": 0.278,
    "defender": 0.269,
    "reactor": 0.041,
    "analyzer": 0.441
  },
  "regions": {
    "mountain": 0.163,
    "metro": 0.247,
    "sunbelt": 0.237,
    "lakes": 0.352
  },
  "means": {
    "adaptive": 63.427,
    "prospector": 58.236,
    "defender": 62.318,
    "reactor": 45.665,
    "analyzer": 62.856
  },
  "capped": 0.076,
  "invariantCount": 0,
  "spread": 17.762,
  "strategic": {
    "preReformChronicAdvantage": -8.089500000000005,
    "postReformChronicAdvantage": -6.35175,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.598699999999999,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.154100000000005,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.723400000000001,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.1260000000000012,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.2589000000000006,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.305999999999998,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.5824999999999996,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.006699999999999786,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.49,
            "bothWinRate": 0.49,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.23629999999999954,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.58,
            "bothWinRate": 0.58,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.13939999999999933,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.62,
            "bothWinRate": 0.62,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.20069999999999943,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0,
            "bothWinRate": 0,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.8989000000000005,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.4225,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.2919999999999998,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.66,
            "bothWinRate": 0.66,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.20270000000000046,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.51,
            "bothWinRate": 0.51,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.0104000000000015,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.29,
            "bothWinRate": 0.29,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.4477999999999999,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5775,
        "mandateFasterRate": 0.6775,
        "pass": true
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 9 — 400 seeded games

Consult cost 18→12 restores its overall paired advantage. Primary rate .260→.263 and chronic .505→.500 support access relative to integrated; specialty variable share .290→.295 avoids further squeezing access. Metro chronic reform 1.28→1.32 creates more late J-curve margin. Lakes fixed 1.50→1.51 trims its class-win ceiling overshoot.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.336,
    "access": 0.235,
    "excellence": 0.211
  },
  "wins": {
    "adaptive": 0.349,
    "defender": 0.308,
    "prospector": 0.256,
    "reactor": 0.037,
    "analyzer": 0.43
  },
  "regions": {
    "mountain": 0.16,
    "metro": 0.287,
    "sunbelt": 0.233,
    "lakes": 0.32
  },
  "means": {
    "adaptive": 63.227,
    "defender": 62.394,
    "prospector": 57.732,
    "reactor": 45.488,
    "analyzer": 62.671
  },
  "capped": 0.076,
  "invariantCount": 0,
  "spread": 17.738999999999997,
  "strategic": {
    "preReformChronicAdvantage": -7.957000000000003,
    "postReformChronicAdvantage": -6.014499999999999,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5876999999999993,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.162900000000005,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.7513000000000005,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.09759999999999902,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.24890000000000165,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.295999999999998,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.5396999999999985,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.1189999999999997,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.1199000000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.9607000000000002,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.1079999999999999,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.56,
            "bothWinRate": 0.56,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.2699999999999991,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.685,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.2998000000000005,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.16179999999999986,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.51,
            "bothWinRate": 0.51,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.031300000000003,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.16,
            "bothWinRate": 0.16,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.1841999999999991,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5475000000000001,
        "mandateFasterRate": 0.6775,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 10 — 400 seeded games

Primary base rate .263→.270 restores access margins to reduce analyzer region wins; consult facilitation cost 12→14 targets a majority loss in Lakes while retaining an overall paired majority.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": true
  },
  "arch": {
    "integrated": 0.332,
    "access": 0.262,
    "excellence": 0.192
  },
  "wins": {
    "adaptive": 0.348,
    "defender": 0.344,
    "prospector": 0.232,
    "reactor": 0.035,
    "analyzer": 0.421
  },
  "regions": {
    "mountain": 0.158,
    "metro": 0.285,
    "sunbelt": 0.237,
    "lakes": 0.32
  },
  "means": {
    "adaptive": 63.352,
    "defender": 62.854,
    "prospector": 57.778,
    "reactor": 45.659,
    "analyzer": 62.801
  },
  "capped": 0.076,
  "invariantCount": 0,
  "spread": 17.692999999999998,
  "strategic": {
    "preReformChronicAdvantage": -7.915375000000003,
    "postReformChronicAdvantage": -5.977333333333331,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5973999999999985,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.198800000000001,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.795899999999996,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.09090000000000015,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.2589000000000017,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.332000000000001,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.574900000000001,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.11919999999999993,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8549000000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.746499999999999,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.839499999999999,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.42,
            "bothWinRate": 0.42,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.1410000000000003,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.65,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.3548000000000002,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.19999999999999907,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.58,
            "bothWinRate": 0.58,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.088100000000001,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.16,
            "bothWinRate": 0.16,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.2376999999999997,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5650000000000001,
        "mandateFasterRate": 0.6775,
        "pass": true
      }
    },
    "pass": true
  }
}
```

## Round 2 iteration 11 — 400 seeded games

Specialty variable share .295→.280 aims to reduce analyzer wins through specialty competition. Tournament means now retain full precision so rounded boundary values cannot falsely pass; checker rejects missing/non-finite required archetype, profile and region metrics. No engine API or state-shape change.

```json
{
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.3392330383480826,
    "access": 0.2172503242542153,
    "excellence": 0.2237354085603113
  },
  "wins": {
    "adaptive": 0.34771354616048317,
    "defender": 0.28559102674719583,
    "prospector": 0.27586206896551724,
    "reactor": 0.03278688524590164,
    "analyzer": 0.4383088869715272
  },
  "regions": {
    "mountain": 0.1575,
    "metro": 0.285,
    "sunbelt": 0.235,
    "lakes": 0.3225
  },
  "means": {
    "adaptive": 63.87654012079387,
    "defender": 63.069870578084505,
    "prospector": 59.08441379310346,
    "reactor": 46.151363244176046,
    "analyzer": 63.30236410698873
  },
  "capped": 0.0759144237405107,
  "invariantCount": 0,
  "spread": 17.725176876617823,
  "strategic": {
    "preReformChronicAdvantage": -8.341625000000004,
    "postReformChronicAdvantage": -6.392166666666667,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.6245000000000008,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.254099999999995,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.8587,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": -0.005799999999999556,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.2789000000000003,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.392000000000003,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.615500000000003,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.04490000000000041,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8590000000000003,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7346999999999997,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8268999999999994,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.52,
            "bothWinRate": 0.52,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.07489999999999938,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.675,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.371400000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.6430999999999994,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.58,
            "bothWinRate": 0.58,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.076600000000001,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.29,
            "bothWinRate": 0.29,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.7538999999999999,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5975,
        "mandateFasterRate": 0.6775,
        "pass": true
      }
    },
    "pass": false
  }
}
```

## Round 2 iteration 12 — 400 seeded games

Restored specialty variable share .280→.295: cheaper specialty production also helped analyzers and eroded late redesign margin. Exploration return 1.0→.5 reduces the resilience benefit of repeated exploration, following the earlier Round 1 lever; adaptive decisions remain unchanged.

```json
{
  "gates": {
    "G1": false,
    "G2": true,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": true
  },
  "arch": {
    "integrated": 0.32669616519174044,
    "access": 0.30544747081712065,
    "excellence": 0.1575875486381323
  },
  "wins": {
    "adaptive": 0.3684210526315789,
    "defender": 0.3994823123382226,
    "prospector": 0.18362068965517242,
    "reactor": 0.04055220017256255,
    "analyzer": 0.3882657463330457
  },
  "regions": {
    "mountain": 0.1525,
    "metro": 0.285,
    "sunbelt": 0.25,
    "lakes": 0.3125
  },
  "means": {
    "adaptive": 63.234633304572974,
    "defender": 62.8624762726489,
    "prospector": 56.57506034482763,
    "reactor": 45.68010353753236,
    "analyzer": 62.52742881794658
  },
  "capped": 0.076432022084196,
  "invariantCount": 0,
  "spread": 17.554529767040613,
  "strategic": {
    "preReformChronicAdvantage": -7.915375000000003,
    "postReformChronicAdvantage": -5.977333333333331,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5973999999999985,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.198800000000001,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.795899999999996,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.09090000000000015,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.2589000000000017,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.332000000000001,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.574900000000001,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.11919999999999993,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8549000000000001,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.746499999999999,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.839499999999999,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.42,
            "bothWinRate": 0.42,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.1410000000000003,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.65,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.3548000000000002,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.19999999999999907,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.58,
            "bothWinRate": 0.58,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.088100000000001,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.16,
            "bothWinRate": 0.16,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.2376999999999997,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5650000000000001,
        "mandateFasterRate": 0.6775,
        "pass": true
      }
    },
    "pass": true
  }
}
```

## Round 2 iteration 13 — 400 seeded games

With G2 now passing, specialty variable share .295→.285 restores excellence toward its 18% minimum. Consult cost 14→14.5 preserves a regional majority loss as specialty economics improve.

```json
{
  "gates": {
    "G1": false,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": true
  },
  "arch": {
    "integrated": 0.33443952802359883,
    "access": 0.2788586251621271,
    "excellence": 0.17055771725032426
  },
  "wins": {
    "adaptive": 0.36928386540120794,
    "defender": 0.36496980155306297,
    "prospector": 0.20172413793103447,
    "reactor": 0.03882657463330457,
    "analyzer": 0.4055220017256255
  },
  "regions": {
    "mountain": 0.155,
    "metro": 0.29,
    "sunbelt": 0.24,
    "lakes": 0.315
  },
  "means": {
    "adaptive": 63.587635893011324,
    "defender": 63.0065832614324,
    "prospector": 57.4891293103447,
    "reactor": 46.01182916307165,
    "analyzer": 62.86168248490067
  },
  "capped": 0.076432022084196,
  "invariantCount": 0,
  "spread": 17.57580672993967,
  "strategic": {
    "preReformChronicAdvantage": -8.1975,
    "postReformChronicAdvantage": -6.253416666666665,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.621299999999999,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.224500000000006,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.842099999999999,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.025400000000000596,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.2689000000000012,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.371699999999996,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.600600000000002,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.06900000000000057,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7858999999999992,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.99,
            "bothWinRate": 0.99,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.6800999999999995,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7556999999999988,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.35,
            "bothWinRate": 0.35,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.04980000000000032,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.63,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.3658,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.49449999999999955,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.58,
            "bothWinRate": 0.58,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.0787000000000013,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.29,
            "bothWinRate": 0.29,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.5825,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5975,
        "mandateFasterRate": 0.6775,
        "pass": true
      }
    },
    "pass": true
  }
}
```

## Round 2 iteration 14 — 400 seeded games

Premium price reimbursement multiplier 1.12→1.15 rewards premium positioning while retaining its attraction penalty; specialty variable share .285→.290 limits the general benefit to all competitors. This targets excellence/prospector viability without also disproportionately subsidizing analyzer capacity.

```json
{
  "gates": {
    "G1": true,
    "G2": true,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": true
  },
  "arch": {
    "integrated": 0.32374631268436577,
    "access": 0.2594033722438392,
    "excellence": 0.20881971465629054
  },
  "wins": {
    "adaptive": 0.35893011216566006,
    "defender": 0.33908541846419327,
    "prospector": 0.2543103448275862,
    "reactor": 0.03882657463330457,
    "analyzer": 0.38912855910267474
  },
  "regions": {
    "mountain": 0.1525,
    "metro": 0.285,
    "sunbelt": 0.245,
    "lakes": 0.3175
  },
  "means": {
    "adaptive": 63.41182053494387,
    "defender": 62.93440034512517,
    "prospector": 59.37103448275857,
    "reactor": 46.38027610008629,
    "analyzer": 62.69472821397752
  },
  "capped": 0.076432022084196,
  "invariantCount": 0,
  "spread": 17.03154443485758,
  "strategic": {
    "preReformChronicAdvantage": -8.057874999999994,
    "postReformChronicAdvantage": -6.117000000000001,
    "mandate": {
      "finished": 2,
      "minTrust": 19.517882777599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.45137861773278
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.6105999999999996,
            "outcomeDelta": -9.588600000000007
          },
          {
            "round": 3,
            "operatingDelta": -5.214100000000005,
            "outcomeDelta": -11.371099999999995
          },
          {
            "round": 4,
            "operatingDelta": -4.818299999999997,
            "outcomeDelta": -5.334300000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.058399999999999286,
            "outcomeDelta": 0.7122000000000012
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.25889999999999963,
            "outcomeDelta": -9.29140000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.354500000000002,
            "outcomeDelta": -11.826299999999998
          },
          {
            "round": 4,
            "operatingDelta": -3.588700000000001,
            "outcomeDelta": -4.5184000000000015
          },
          {
            "round": 5,
            "operatingDelta": 0.09340000000000011,
            "outcomeDelta": 1.1625999999999987
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.5,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7841999999999999,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.99,
            "bothWinRate": 0.99,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.6844999999999994,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.68,
            "bothWinRate": 0.68,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.760499999999999,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.35,
            "bothWinRate": 0.35,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.13400000000000042,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.63,
        "mandateFasterRate": 1,
        "pass": true
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.85,
            "bothWinRate": 0.85,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 1.3594000000000006,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.67,
            "bothWinRate": 0.67,
            "mandateFasterRate": 0.76,
            "meanTotalDelta": 0.34679999999999905,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.58,
            "bothWinRate": 0.58,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 3.0830999999999995,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.22,
            "bothWinRate": 0.22,
            "mandateFasterRate": 0.65,
            "meanTotalDelta": 0.4088999999999996,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.5800000000000001,
        "mandateFasterRate": 0.6775,
        "pass": true
      }
    },
    "pass": true
  }
}
```

## Round 2 final validation

Stopped tuning after iteration 14 passed all ten gates. The exhaustive founding-configuration smoke check also passed in all four regions; no balance numbers changed afterward. Final summary replaces the earlier G1–G7-only summary and documents paired-test scope, high facilitation costs, narrow J-curve margins and the historical-only bundle.

## Round 3 iteration 1 — 400 seeded games

Baseline: preserve reset files in tools/round3-baseline; raise Metro fixed 0.76 to hard minimum 0.80. Add recursive bounds assertions to combined gate runner; no engine or bot edits.

```json
{
  "bounds": {
    "pass": true,
    "checked": 510
  },
  "gates": {
    "G1": false,
    "G2": false,
    "G3": false,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": false,
    "G10": false
  },
  "arch": {
    "access": 0.35862516212710766,
    "integrated": 0.1707227138643068,
    "excellence": 0.3787289234760052
  },
  "wins": {
    "defender": 0.46678170836928384,
    "adaptive": 0.12424503882657463,
    "prospector": 0.45775862068965517,
    "reactor": 0.06816220880069025,
    "analyzer": 0.2631578947368421
  },
  "regions": {
    "mountain": 0.19,
    "metro": 0.235,
    "sunbelt": 0.355,
    "lakes": 0.22
  },
  "means": {
    "defender": 63.986937014667845,
    "adaptive": 60.23296807592753,
    "prospector": 61.217810344827605,
    "reactor": 51.3331578947369,
    "analyzer": 60.50481449525454
  },
  "capped": 0.04727398205659075,
  "invariantCount": 0,
  "spread": 12.653779119930945,
  "strategic": {
    "preReformChronicAdvantage": -7.315750000000001,
    "postReformChronicAdvantage": -5.2390833333333315,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42481139009179
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": 0.4060999999999994,
            "outcomeDelta": -3.3000000000000056
          },
          {
            "round": 3,
            "operatingDelta": -0.7997000000000023,
            "outcomeDelta": -4.937499999999999
          },
          {
            "round": 4,
            "operatingDelta": -3.4273,
            "outcomeDelta": -6.038300000000001
          },
          {
            "round": 5,
            "operatingDelta": -0.346899999999999,
            "outcomeDelta": -0.32590000000000025
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": 0.4540999999999989,
            "outcomeDelta": -3.3888000000000034
          },
          {
            "round": 3,
            "operatingDelta": -0.9030999999999999,
            "outcomeDelta": -5.242899999999996
          },
          {
            "round": 4,
            "operatingDelta": -1.9588999999999999,
            "outcomeDelta": -5.1441000000000034
          },
          {
            "round": 5,
            "operatingDelta": 0.6964000000000005,
            "outcomeDelta": 0.13269999999999896
          }
        ],
        "pass": false
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.9139000000000002,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.6028,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.84,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.9562000000000002,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.72,
            "bothWinRate": 0.36,
            "mandateFasterRate": 1,
            "meanTotalDelta": -1.1236999999999993,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.59,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 2.0853000000000015,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.71,
            "meanTotalDelta": 2.7448,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 4.626200000000002,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 4.420900000000002,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.625,
        "mandateFasterRate": 0.5525,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 2 — 400 seeded games

Chronic base rate .48→.55; all chronic reform multipliers 1.40; quality slope .012; Sunbelt fixed 1.20; mandate speed 1.20/trust hit 10; consult/joint costs 1.5/3; disruption 12. Add temporary implementation backfill expense of $0.10M per disruption point, using existing disruption state; this makes implementation consume operating resources as well as capability. No API/state or bot change.

```json
{
  "bounds": {
    "pass": true,
    "checked": 510
  },
  "gates": {
    "G1": false,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": false,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.3587758112094395,
    "excellence": 0.3164721141374838,
    "access": 0.09014267185473411
  },
  "wins": {
    "adaptive": 0.2459016393442623,
    "prospector": 0.3724137931034483,
    "reactor": 0.07937877480586712,
    "defender": 0.11302847282139776,
    "analyzer": 0.5694564279551337
  },
  "regions": {
    "mountain": 0.205,
    "metro": 0.305,
    "sunbelt": 0.16,
    "lakes": 0.33
  },
  "means": {
    "adaptive": 63.78992234685067,
    "prospector": 61.27375862068968,
    "reactor": 52.346824849007874,
    "defender": 62.60311475409844,
    "analyzer": 64.26557377049183
  },
  "capped": 0.03899240855762595,
  "invariantCount": 0,
  "spread": 11.918748921483953,
  "strategic": {
    "preReformChronicAdvantage": -6.946249999999999,
    "postReformChronicAdvantage": -4.062250000000001,
    "mandate": {
      "finished": 3,
      "minTrust": 38.456638426205856
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42796950728071
    },
    "pass": false
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.8599999999999994,
            "outcomeDelta": -4.86000000000001
          },
          {
            "round": 3,
            "operatingDelta": -5.779999999999993,
            "outcomeDelta": -7.897499999999999
          },
          {
            "round": 4,
            "operatingDelta": -10.185899999999997,
            "outcomeDelta": -8.239500000000003
          },
          {
            "round": 5,
            "operatingDelta": -2.9792,
            "outcomeDelta": -1.0381000000000011
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.8344999999999999,
            "outcomeDelta": -4.959200000000004
          },
          {
            "round": 3,
            "operatingDelta": -5.9993,
            "outcomeDelta": -8.298699999999997
          },
          {
            "round": 4,
            "operatingDelta": -8.158999999999995,
            "outcomeDelta": -7.548000000000002
          },
          {
            "round": 5,
            "operatingDelta": -1.2531000000000012,
            "outcomeDelta": -0.5191
          }
        ],
        "pass": false
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.13,
            "bothWinRate": 0,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.7393999999999997,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.41,
            "bothWinRate": 0.07,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.2858999999999987,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0,
            "totalWinRate": 0.23,
            "bothWinRate": 0,
            "mandateFasterRate": 1,
            "meanTotalDelta": -2.763799999999998,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0,
            "totalWinRate": 0.24,
            "bothWinRate": 0,
            "mandateFasterRate": 1,
            "meanTotalDelta": -2.3937999999999984,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.0175,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0,
            "totalWinRate": 1,
            "bothWinRate": 0,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.4157000000000008,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.5294000000000012,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0,
            "totalWinRate": 1,
            "bothWinRate": 0,
            "mandateFasterRate": 1,
            "meanTotalDelta": 3.9238,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0,
            "totalWinRate": 1,
            "bothWinRate": 0,
            "mandateFasterRate": 1,
            "meanTotalDelta": 3.5332999999999997,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.125,
        "mandateFasterRate": 1,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 3 — 400 seeded games

Primary rate .26→.28, chronic .55→.52, reform quality slope .012→.009 to restore access and trim analyzer advantage. Mandate trust hit 10→16 restores meaningful trust tradeoff; joint speed .50→.70 permits recovery by round 5. Completed changes now grant 2 efficiency points (all approaches, capped at existing 15); joint coordination completion gain 3→1.8. Generic learning uses existing capBonus; no matching-choice, region, profile or test-specific rule.

```json
{
  "bounds": {
    "pass": true,
    "checked": 510
  },
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": false,
    "G10": false
  },
  "arch": {
    "integrated": 0.3115781710914454,
    "access": 0.29571984435797666,
    "excellence": 0.19390402075226978
  },
  "wins": {
    "adaptive": 0.20534943917169973,
    "defender": 0.3839516824849008,
    "reactor": 0.061259706643658325,
    "prospector": 0.22241379310344828,
    "analyzer": 0.5073339085418465
  },
  "regions": {
    "mountain": 0.195,
    "metro": 0.3125,
    "sunbelt": 0.235,
    "lakes": 0.2575
  },
  "means": {
    "adaptive": 63.50173425366699,
    "defender": 64.86894736842098,
    "reactor": 52.09798101811918,
    "prospector": 59.446560344827546,
    "analyzer": 63.822691975841266
  },
  "capped": 0.04296066252587992,
  "invariantCount": 0,
  "spread": 12.770966350301798,
  "strategic": {
    "preReformChronicAdvantage": -6.978374999999995,
    "postReformChronicAdvantage": -4.245916666666666,
    "mandate": {
      "finished": 3,
      "minTrust": 31.553284505599997
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.427305201667195
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.2600000000000002,
            "outcomeDelta": -4.620000000000004
          },
          {
            "round": 3,
            "operatingDelta": -2.9598000000000035,
            "outcomeDelta": -4.8474999999999975
          },
          {
            "round": 4,
            "operatingDelta": -5.404999999999997,
            "outcomeDelta": -4.023500000000002
          },
          {
            "round": 5,
            "operatingDelta": -1.1088000000000005,
            "outcomeDelta": 1.058800000000002
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.17210000000000059,
            "outcomeDelta": -4.695800000000004
          },
          {
            "round": 3,
            "operatingDelta": -3.1068999999999987,
            "outcomeDelta": -5.215899999999994
          },
          {
            "round": 4,
            "operatingDelta": -3.2781000000000002,
            "outcomeDelta": -3.1384999999999996
          },
          {
            "round": 5,
            "operatingDelta": 0.6171999999999993,
            "outcomeDelta": 1.7627000000000013
          }
        ],
        "pass": true
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.49,
            "bothWinRate": 0.11,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.009300000000000778,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 0.96,
            "totalWinRate": 0.96,
            "bothWinRate": 0.92,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8029,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.58,
            "bothWinRate": 0.08,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.14840000000000017,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.65,
            "bothWinRate": 0.15,
            "mandateFasterRate": 1,
            "meanTotalDelta": -1.6846999999999988,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.315,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 1.7367999999999995,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 0.96,
            "totalWinRate": 1,
            "bothWinRate": 0.96,
            "mandateFasterRate": 0.39,
            "meanTotalDelta": 2.7433999999999985,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 1.9394999999999984,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 2.3369,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.615,
        "mandateFasterRate": 0.47250000000000003,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 4 — 400 seeded games

Cross-training accept cost 1.5→2.1 and adaptability 5→3; exploration return 1→.6, all at ±40% limits, narrow analyzer advantage without bot edits. Mandate trust hit 16→22, consult speed .40→.50, joint .70→.60; completion efficiency gain 2→3. Slow joint slightly to distinguish completion timing, test stronger generic learning for late operating recovery.

```json
{
  "bounds": {
    "pass": true,
    "checked": 510
  },
  "gates": {
    "G1": false,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.31821533923303835,
    "access": 0.36900129701686124,
    "excellence": 0.10894941634241245
  },
  "wins": {
    "adaptive": 0.26919758412424505,
    "defender": 0.4823123382226057,
    "reactor": 0.057808455565142365,
    "prospector": 0.1103448275862069,
    "analyzer": 0.46074201898188094
  },
  "regions": {
    "mountain": 0.1875,
    "metro": 0.3225,
    "sunbelt": 0.2525,
    "lakes": 0.2375
  },
  "means": {
    "adaptive": 63.419879206212215,
    "defender": 64.88847282139773,
    "reactor": 50.00129421915443,
    "prospector": 56.46879310344826,
    "analyzer": 63.28447799827442
  },
  "capped": 0.05141476880607315,
  "invariantCount": 0,
  "spread": 14.887178602243296,
  "strategic": {
    "preReformChronicAdvantage": -6.978374999999995,
    "postReformChronicAdvantage": -4.245916666666666,
    "mandate": {
      "finished": 3,
      "minTrust": 22.526733209599993
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.433683946998315
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5632000000000005,
            "outcomeDelta": -4.759999999999992
          },
          {
            "round": 3,
            "operatingDelta": -4.009800000000001,
            "outcomeDelta": -6.807499999999993
          },
          {
            "round": 4,
            "operatingDelta": -7.3187999999999995,
            "outcomeDelta": -6.425900000000005
          },
          {
            "round": 5,
            "operatingDelta": 0.07389999999999972,
            "outcomeDelta": 2.1705000000000005
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.5059000000000019,
            "outcomeDelta": -4.8561999999999905
          },
          {
            "round": 3,
            "operatingDelta": -4.210400000000001,
            "outcomeDelta": -7.217499999999994
          },
          {
            "round": 4,
            "operatingDelta": -5.339099999999998,
            "outcomeDelta": -5.612299999999999
          },
          {
            "round": 5,
            "operatingDelta": 1.8074999999999994,
            "outcomeDelta": 2.887299999999999
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.8,
            "totalWinRate": 1,
            "bothWinRate": 0.8,
            "mandateFasterRate": 0.92,
            "meanTotalDelta": 2.765499999999999,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.98,
            "meanTotalDelta": 3.8777000000000017,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.92,
            "meanTotalDelta": 2.2930000000000006,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.92,
            "meanTotalDelta": 3.475899999999998,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.95,
        "mandateFasterRate": 0.9349999999999999,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.8,
            "totalWinRate": 1,
            "bothWinRate": 0.8,
            "mandateFasterRate": 0.25,
            "meanTotalDelta": 3.9872,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.25,
            "meanTotalDelta": 5.2276,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.25,
            "meanTotalDelta": 3.5469000000000026,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.25,
            "meanTotalDelta": 4.9171,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.95,
        "mandateFasterRate": 0.25,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 5 — 400 seeded games

Primary rate .28→.27, premium rate 1.12→1.15, mandate trust hit 22→18 restore excellence competitiveness. Consult/joint speed .50/.60→.40/.55 to separate timing; completion efficiency 3→4 (still capped at 15). Discharge counter coordination 5→7 and cross-training counter adaptability 2→2.8, both +40%, support counteroffers. Bounds checker now also audits all 357 existing engine numeric literals against incoming engine, with explicit small limits on the two new mechanics.

```json
{
  "bounds": {
    "pass": true,
    "checked": 867
  },
  "gates": {
    "G1": true,
    "G2": true,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.29277286135693215,
    "access": 0.2801556420233463,
    "excellence": 0.24254215304798962
  },
  "wins": {
    "adaptive": 0.271786022433132,
    "reactor": 0.07851596203623813,
    "defender": 0.363244176013805,
    "prospector": 0.2775862068965517,
    "analyzer": 0.38912855910267474
  },
  "regions": {
    "mountain": 0.19,
    "metro": 0.305,
    "sunbelt": 0.2175,
    "lakes": 0.2875
  },
  "means": {
    "adaptive": 63.34481449525459,
    "reactor": 52.46630716134605,
    "defender": 64.52003451251076,
    "prospector": 60.761844827586145,
    "analyzer": 63.12555651423649
  },
  "capped": 0.038302277432712216,
  "invariantCount": 0,
  "spread": 12.05372735116471,
  "strategic": {
    "preReformChronicAdvantage": -7.036249999999998,
    "postReformChronicAdvantage": -4.446500000000001,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 38.42634654293391
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.7161000000000002,
            "outcomeDelta": -4.819999999999993
          },
          {
            "round": 3,
            "operatingDelta": -4.415799999999994,
            "outcomeDelta": -7.525500000000006
          },
          {
            "round": 4,
            "operatingDelta": -7.28600000000001,
            "outcomeDelta": -6.56110000000001
          },
          {
            "round": 5,
            "operatingDelta": 0.49610000000000115,
            "outcomeDelta": 2.7629999999999946
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.6714999999999999,
            "outcomeDelta": -4.917099999999996
          },
          {
            "round": 3,
            "operatingDelta": -4.613300000000003,
            "outcomeDelta": -7.929800000000003
          },
          {
            "round": 4,
            "operatingDelta": -5.357699999999998,
            "outcomeDelta": -5.747100000000004
          },
          {
            "round": 5,
            "operatingDelta": 2.1461000000000006,
            "outcomeDelta": 3.362900000000004
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.56,
            "bothWinRate": 0.25,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.08910000000000032,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.82,
            "bothWinRate": 0.82,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8893000000000003,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.75,
            "bothWinRate": 0.25,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.2135999999999998,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.75,
            "bothWinRate": 0.25,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.3471,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.39249999999999996,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 2.0674000000000015,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 0.68,
            "meanTotalDelta": 2.8557999999999995,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 2.2334999999999994,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 0.5,
            "meanTotalDelta": 2.9337,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.625,
        "mandateFasterRate": 0.545,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 6 — 400 seeded games

Joint speed .55→.45 and trust hit 2→6 test deliberation delay/remaining threat at legal bounds. Existing learned speed .15→.21 (+40%) helps later completion. Existing nurse overwork coefficient 60→36 (−40%) tests whether minimum trust ceases to be dominated by the same unrelated bottleneck; overwork still penalizes nurses. These engine numeric changes are audited by bounds-check, no formula or state changes.

```json
{
  "bounds": {
    "pass": true,
    "checked": 867
  },
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": true,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.2783923303834808,
    "access": 0.3339818417639429,
    "excellence": 0.2140077821011673
  },
  "wins": {
    "adaptive": 0.25970664365832613,
    "defender": 0.43485763589301124,
    "reactor": 0.06988783433994823,
    "prospector": 0.2439655172413793,
    "analyzer": 0.3718723037100949
  },
  "regions": {
    "mountain": 0.1825,
    "metro": 0.2875,
    "sunbelt": 0.2725,
    "lakes": 0.2575
  },
  "means": {
    "adaptive": 63.82685073339087,
    "defender": 65.36421052631592,
    "reactor": 52.95543572044861,
    "prospector": 60.90004310344827,
    "analyzer": 63.48404659188948
  },
  "capped": 0.036231884057971016,
  "invariantCount": 0,
  "spread": 12.408774805867303,
  "strategic": {
    "preReformChronicAdvantage": -7.036249999999998,
    "postReformChronicAdvantage": -4.51475,
    "mandate": {
      "finished": 3,
      "minTrust": 28.544434073599998
    },
    "consult": {
      "finished": 4,
      "minTrust": 45.19995748220281
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.9505000000000012,
            "outcomeDelta": -6.209200000000011
          },
          {
            "round": 3,
            "operatingDelta": -6.7558000000000025,
            "outcomeDelta": -10.419500000000003
          },
          {
            "round": 4,
            "operatingDelta": -9.107800000000012,
            "outcomeDelta": -8.76930000000001
          },
          {
            "round": 5,
            "operatingDelta": -1.3175000000000017,
            "outcomeDelta": 0.6482999999999984
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.280799999999998,
            "outcomeDelta": -5.594400000000011
          },
          {
            "round": 3,
            "operatingDelta": -7.1125000000000025,
            "outcomeDelta": -10.816700000000003
          },
          {
            "round": 4,
            "operatingDelta": -8.441699999999994,
            "outcomeDelta": -9.313199999999998
          },
          {
            "round": 5,
            "operatingDelta": -2.2258000000000018,
            "outcomeDelta": -1.4834000000000003
          }
        ],
        "pass": false
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.84,
            "bothWinRate": 0.84,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7653999999999995,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.6120999999999999,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.84,
            "bothWinRate": 0.84,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.0668999999999986,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.88,
            "bothWinRate": 0.88,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.4319999999999995,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.8899999999999999,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.2003,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 2.062999999999999,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.492399999999999,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.96,
            "bothWinRate": 0.96,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.5845999999999991,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.99,
        "mandateFasterRate": 1,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 7 — 400 seeded games

Primary rate .270→.265 trims defender wins. Mandate trust hit 18→12 tests whether faster implementation remains competitive with a less severe but meaningful trust cost; joint speed .45→.55 restores late completion with its higher trust hit retained.

```json
{
  "bounds": {
    "pass": true,
    "checked": 867
  },
  "gates": {
    "G1": true,
    "G2": true,
    "G3": true,
    "G4": false,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": false,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.26991150442477874,
    "access": 0.25421530479896237,
    "excellence": 0.3086900129701686
  },
  "wins": {
    "adaptive": 0.2528041415012942,
    "reactor": 0.09663503019844694,
    "defender": 0.3244176013805004,
    "prospector": 0.35517241379310344,
    "analyzer": 0.3511647972389991
  },
  "regions": {
    "mountain": 0.1875,
    "metro": 0.275,
    "sunbelt": 0.2225,
    "lakes": 0.315
  },
  "means": {
    "adaptive": 63.74534081104411,
    "reactor": 55.831639344262285,
    "defender": 65.02955133735983,
    "prospector": 62.60085344827581,
    "analyzer": 63.407515099223616
  },
  "capped": 0.02139406487232574,
  "invariantCount": 0,
  "spread": 9.197911993097549,
  "strategic": {
    "preReformChronicAdvantage": -7.0712499999999965,
    "postReformChronicAdvantage": -4.543750000000001,
    "mandate": {
      "finished": 3,
      "minTrust": 37.57098536959999
    },
    "consult": {
      "finished": 4,
      "minTrust": 45.19995748220281
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.6865999999999997,
            "outcomeDelta": -6.236199999999994
          },
          {
            "round": 3,
            "operatingDelta": -6.065900000000004,
            "outcomeDelta": -9.479499999999994
          },
          {
            "round": 4,
            "operatingDelta": -8.711200000000003,
            "outcomeDelta": -8.126899999999987
          },
          {
            "round": 5,
            "operatingDelta": -0.3077999999999983,
            "outcomeDelta": 2.000499999999999
          }
        ],
        "pass": false
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -0.974799999999997,
            "outcomeDelta": -5.528300000000002
          },
          {
            "round": 3,
            "operatingDelta": -6.4166,
            "outcomeDelta": -9.894299999999998
          },
          {
            "round": 4,
            "operatingDelta": -7.062700000000002,
            "outcomeDelta": -7.338000000000002
          },
          {
            "round": 5,
            "operatingDelta": 1.1271,
            "outcomeDelta": 2.6405999999999996
          }
        ],
        "pass": true
      }
    },
    "pass": false
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.35,
            "bothWinRate": 0.22,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.34700000000000064,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.54,
            "bothWinRate": 0.54,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.06259999999999984,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.44,
            "bothWinRate": 0.22,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.17590000000000025,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.47,
            "bothWinRate": 0.25,
            "mandateFasterRate": 1,
            "meanTotalDelta": -0.3241000000000007,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.3075,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.84,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7637000000000002,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.1246999999999985,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.85,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.9142000000000019,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.87,
            "bothWinRate": 0.49,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7991999999999991,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.6225,
        "mandateFasterRate": 1,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 8 — 400 seeded games

Consult speed .40→.45 and trust hit 4→2 improve consultation; joint speed .55→.50 tests a regional tradeoff. Quality floor 40→41 restores capped share. Existing two-round fatigue coefficient 1.5→.9 (−40%) reduces lingering implementation disruption while preserving its duration and early dip.

```json
{
  "bounds": {
    "pass": true,
    "checked": 867
  },
  "gates": {
    "G1": true,
    "G2": true,
    "G3": true,
    "G4": false,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.2662241887905605,
    "access": 0.23411154345006485,
    "excellence": 0.3352788586251621
  },
  "wins": {
    "adaptive": 0.2545297670405522,
    "reactor": 0.09577221742881795,
    "defender": 0.29594477998274377,
    "prospector": 0.39482758620689656,
    "analyzer": 0.33908541846419327
  },
  "regions": {
    "mountain": 0.185,
    "metro": 0.27,
    "sunbelt": 0.2175,
    "lakes": 0.3275
  },
  "means": {
    "adaptive": 63.75662640207082,
    "reactor": 55.92792924935296,
    "defender": 65.02642795513373,
    "prospector": 62.99005172413795,
    "analyzer": 63.41711820534958
  },
  "capped": 0.026742581090407176,
  "invariantCount": 0,
  "spread": 9.09849870578077,
  "strategic": {
    "preReformChronicAdvantage": -7.0712499999999965,
    "postReformChronicAdvantage": -4.543750000000001,
    "mandate": {
      "finished": 3,
      "minTrust": 37.57098536959999
    },
    "consult": {
      "finished": 4,
      "minTrust": 45.200749560239935
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.8160000000000007,
            "outcomeDelta": -6.234300000000002
          },
          {
            "round": 3,
            "operatingDelta": -6.055900000000005,
            "outcomeDelta": -9.479499999999994
          },
          {
            "round": 4,
            "operatingDelta": -8.0418,
            "outcomeDelta": -7.470699999999991
          },
          {
            "round": 5,
            "operatingDelta": 0.07560000000000117,
            "outcomeDelta": 2.359900000000003
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.1277999999999972,
            "outcomeDelta": -5.563499999999996
          },
          {
            "round": 3,
            "operatingDelta": -6.404000000000002,
            "outcomeDelta": -9.8886
          },
          {
            "round": 4,
            "operatingDelta": -6.403,
            "outcomeDelta": -6.672299999999996
          },
          {
            "round": 5,
            "operatingDelta": 0.7592000000000004,
            "outcomeDelta": 2.0334000000000008
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.71,
            "bothWinRate": 0.49,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.2460000000000013,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 1,
            "bothWinRate": 1,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.8200999999999997,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.84,
            "bothWinRate": 0.49,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.43309999999999954,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.96,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.2372999999999996,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.62,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.72,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.4694000000000005,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.99,
            "bothWinRate": 0.99,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.7683999999999982,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.85,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.6266000000000002,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.68,
            "bothWinRate": 0.33,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.45300000000000007,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.58,
        "mandateFasterRate": 1,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 9 — 400 seeded games

Mandate trust hit 12→10 tests regional approach competition. Starting nurse trust access 55→60 and excellence 52→60 separates minimum trust from overwork; both within 40%. Quality floor 41→42 to reach 3% capped minimum. Premium rate 1.15→1.14 to keep prospector below 40% wins.

```json
{
  "bounds": {
    "pass": true,
    "checked": 867
  },
  "gates": {
    "G1": true,
    "G2": false,
    "G3": true,
    "G4": false,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": false,
    "G10": false
  },
  "arch": {
    "integrated": 0.22529498525073746,
    "access": 0.23540856031128404,
    "excellence": 0.4059662775616083
  },
  "wins": {
    "adaptive": 0.2191544434857636,
    "reactor": 0.10871440897325281,
    "defender": 0.2899050905953408,
    "prospector": 0.48017241379310344,
    "analyzer": 0.28213977566867987
  },
  "regions": {
    "mountain": 0.1825,
    "metro": 0.2125,
    "sunbelt": 0.2675,
    "lakes": 0.3375
  },
  "means": {
    "adaptive": 63.750163934426254,
    "reactor": 57.1220880069025,
    "defender": 65.67767040552202,
    "prospector": 64.20094827586205,
    "analyzer": 63.422493528904276
  },
  "capped": 0.025707384403036576,
  "invariantCount": 0,
  "spread": 8.55558239861952,
  "strategic": {
    "preReformChronicAdvantage": -7.0862500000000015,
    "postReformChronicAdvantage": -4.828333333333334,
    "mandate": {
      "finished": 3,
      "minTrust": 40.5798358016
    },
    "consult": {
      "finished": 4,
      "minTrust": 50.47191177218038
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.8160000000000007,
            "outcomeDelta": -6.234300000000002
          },
          {
            "round": 3,
            "operatingDelta": -5.665899999999991,
            "outcomeDelta": -9.485500000000004
          },
          {
            "round": 4,
            "operatingDelta": -7.873600000000003,
            "outcomeDelta": -7.466899999999994
          },
          {
            "round": 5,
            "operatingDelta": 0.07120000000000036,
            "outcomeDelta": 2.370299999999997
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.079199999999996,
            "outcomeDelta": -5.5691999999999995
          },
          {
            "round": 3,
            "operatingDelta": -6.005400000000001,
            "outcomeDelta": -9.8846
          },
          {
            "round": 4,
            "operatingDelta": -6.039899999999999,
            "outcomeDelta": -6.672199999999995
          },
          {
            "round": 5,
            "operatingDelta": 1.0812999999999997,
            "outcomeDelta": 2.0360000000000036
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.65,
            "bothWinRate": 0.49,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.13720000000000077,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.99,
            "bothWinRate": 0.99,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.6551999999999998,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.59,
            "totalWinRate": 0.71,
            "bothWinRate": 0.58,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.2945999999999999,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.2012999999999996,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.64,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.69,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.34979999999999933,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.99,
            "bothWinRate": 0.99,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.5911,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.59,
            "totalWinRate": 0.72,
            "bothWinRate": 0.59,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.4596999999999998,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.57,
            "bothWinRate": 0.33,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.2909999999999993,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.6025,
        "mandateFasterRate": 1,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 iteration 10 — 400 seeded games

Premium rate 1.14→1.11 trims prospector; quality floor 42→43. Mountain demand primary 1.10→.90/chronic 1→1.30 tests whether earlier team-care implementation matters more with a higher chronic caseload; labor 1.02→.94 offsets lower primary volume. All changes within bounds. Added baseline provenance README and negative tests for bounds checker; tests pass.

```json
{
  "bounds": {
    "pass": true,
    "checked": 867
  },
  "gates": {
    "G1": true,
    "G2": false,
    "G3": false,
    "G4": false,
    "G5": true,
    "G6": true,
    "G7": true,
    "G8": true,
    "G9": true,
    "G10": false
  },
  "arch": {
    "integrated": 0.3027286135693215,
    "excellence": 0.2535667963683528,
    "access": 0.251621271076524
  },
  "wins": {
    "adaptive": 0.27523727351164795,
    "prospector": 0.2827586206896552,
    "defender": 0.31320103537532357,
    "reactor": 0.09749784296807593,
    "analyzer": 0.4115616911130285
  },
  "regions": {
    "mountain": 0.595,
    "metro": 0.105,
    "sunbelt": 0.1525,
    "lakes": 0.1475
  },
  "means": {
    "adaptive": 65.1714754098361,
    "prospector": 62.84323275862064,
    "defender": 66.28197584124253,
    "reactor": 57.183563416738565,
    "analyzer": 64.92205349439178
  },
  "capped": 0.029503105590062112,
  "invariantCount": 0,
  "spread": 9.098412424503962,
  "strategic": {
    "preReformChronicAdvantage": -7.0862500000000015,
    "postReformChronicAdvantage": -4.828333333333334,
    "mandate": {
      "finished": 3,
      "minTrust": 40.5798358016
    },
    "consult": {
      "finished": 4,
      "minTrust": 50.47191177218038
    },
    "pass": true
  },
  "jcurve": {
    "regions": {
      "lakes": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.8160000000000007,
            "outcomeDelta": -6.234300000000002
          },
          {
            "round": 3,
            "operatingDelta": -5.665899999999991,
            "outcomeDelta": -9.485500000000004
          },
          {
            "round": 4,
            "operatingDelta": -7.873600000000003,
            "outcomeDelta": -7.466899999999994
          },
          {
            "round": 5,
            "operatingDelta": 0.07120000000000036,
            "outcomeDelta": 2.370299999999997
          }
        ],
        "pass": true
      },
      "metro": {
        "pairs": 100,
        "rounds": [
          {
            "round": 1,
            "operatingDelta": 0,
            "outcomeDelta": 0
          },
          {
            "round": 2,
            "operatingDelta": -1.079199999999996,
            "outcomeDelta": -5.5691999999999995
          },
          {
            "round": 3,
            "operatingDelta": -6.005400000000001,
            "outcomeDelta": -9.8846
          },
          {
            "round": 4,
            "operatingDelta": -6.039899999999999,
            "outcomeDelta": -6.672199999999995
          },
          {
            "round": 5,
            "operatingDelta": 1.0812999999999997,
            "outcomeDelta": 2.0360000000000036
          }
        ],
        "pass": true
      }
    },
    "pass": true
  },
  "approaches": {
    "approaches": {
      "consult": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.65,
            "bothWinRate": 0.49,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.13840000000000002,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.99,
            "bothWinRate": 0.99,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.6551999999999998,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.59,
            "totalWinRate": 0.71,
            "bothWinRate": 0.58,
            "mandateFasterRate": 1,
            "meanTotalDelta": -1.6495000000000002,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 1,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 1.2012999999999996,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.64,
        "mandateFasterRate": 1,
        "pass": false
      },
      "joint": {
        "regions": {
          "mountain": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.69,
            "bothWinRate": 0.5,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.3500999999999994,
            "unfinished": 0
          },
          "metro": {
            "pairs": 100,
            "trustWinRate": 1,
            "totalWinRate": 0.99,
            "bothWinRate": 0.99,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.5911,
            "unfinished": 0
          },
          "sunbelt": {
            "pairs": 100,
            "trustWinRate": 0.59,
            "totalWinRate": 0.72,
            "bothWinRate": 0.59,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.4596999999999998,
            "unfinished": 0
          },
          "lakes": {
            "pairs": 100,
            "trustWinRate": 0.5,
            "totalWinRate": 0.57,
            "bothWinRate": 0.33,
            "mandateFasterRate": 1,
            "meanTotalDelta": 0.2909999999999993,
            "unfinished": 0
          }
        },
        "bothWinRate": 0.6025,
        "mandateFasterRate": 1,
        "pass": false
      }
    },
    "pass": false
  }
}
```

## Round 3 final (Claude, 11/2 night): ALL G1-G10 + bounds-check PASS

Start state (Codex) failed G2,G3,G4,G10. Changes from that state (data.js only; no engine or bot change):
- mountain labor 0.94 -> 1.05, fixed 0.80 -> 0.98 (Mountain had 59.5% of class wins; now 29.0%)
- QUALITY_FLOOR 43 -> 44 (capped share 2.95% -> 4.43%)
- APPROACHES.mandate.trustHit 10 -> 10.5 (moves G10 paired win rates; joint trustHit stayed 6)
Mechanism: G10 total-win rate is a knife edge on mandate/joint trustHit; Mountain consult/joint sit at 0.49 so one region loses, as required.
Result: arch a.245 e.338 i.258; profile wins def .305 pro .379 ana .336 ada .250 rea .110 (reactor lowest mean 55.19); class wins mtn .290 metro .195 sun .268 lakes .247; capped .0443; G10 both-win consult .6525, joint .5625. Sweep helper: tools/q.sh, tools/set.py.
