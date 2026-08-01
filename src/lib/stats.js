// Pure statistics helpers — no DOM, no deps. Everything runs client-side.

/* ---------- gamma / chi-square ---------- */

const LG = [
  76.18009172947146, -86.50532032941677, 24.01409824083091,
  -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
]

export function logGamma(x) {
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) ser += LG[j] / ++y
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

// regularized lower incomplete gamma, series expansion (good for x < a+1)
function gammaPSeries(a, x) {
  let ap = a
  let sum = 1 / a
  let del = sum
  for (let n = 0; n < 400; n++) {
    ap++
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * 1e-14) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

// regularized upper incomplete gamma, continued fraction (good for x >= a+1)
function gammaQCf(a, x) {
  const tiny = 1e-300
  let b = x + 1 - a
  let c = 1 / tiny
  let d = 1 / b
  let h = d
  for (let i = 1; i < 400; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < tiny) d = tiny
    c = b + an / c
    if (Math.abs(c) < tiny) c = tiny
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-14) break
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

/** P(X > x) for X ~ chi-square with df degrees of freedom. */
export function chi2SF(x, df) {
  if (x <= 0) return 1
  const a = df / 2
  const z = x / 2
  return z < a + 1 ? 1 - gammaPSeries(a, z) : gammaQCf(a, z)
}

/** Binomial pmf P(X = k), X ~ B(n, p). */
export function binomPmf(k, n, p) {
  if (k < 0 || k > n) return 0
  const logC = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log1p(-p))
}

export const pad2 = (i) => String(i).padStart(2, '0')

/** Human-readable "1 ใน N" for a probability. */
export function oneIn(p) {
  if (p <= 0) return '—'
  const n = 1 / p
  if (n >= 1e6) {
    const m = n / 1e6
    return `1 ใน ${m % 1 ? m.toFixed(1) : m} ล้าน`
  }
  return `1 ใน ${Math.round(n).toLocaleString('th-TH')}`
}

export const pct = (p, d = 2) => `${(p * 100).toFixed(d)}%`

/* ---------- draw-level analyses ---------- */
/* All functions take `draws` newest-first (as exported by data/index.js). */

/** Count of each 00–99 two-digit ending. */
export function last2Freq(draws) {
  const freq = Array(100).fill(0)
  for (const d of draws) for (const n of d.last2) freq[Number(n)]++
  return freq
}

/** Goodness-of-fit of the 00–99 endings against a uniform 1/100 model. */
export function uniformityTest(draws) {
  const freq = last2Freq(draws)
  const n = draws.length
  const expected = n / 100
  const chi2 = freq.reduce((s, c) => s + (c - expected) ** 2 / expected, 0)
  return { freq, n, expected, chi2, df: 99, p: chi2SF(chi2, 99) }
}

/**
 * "How many of the 100 endings came up exactly k times?" — the observed shape
 * against the binomial one you'd get from a fair draw.
 */
export function hitCountDistribution(draws) {
  const freq = last2Freq(draws)
  const n = draws.length
  const top = Math.max(...freq)
  const bins = []
  for (let k = 0; k <= top; k++) {
    bins.push({
      k,
      observed: freq.filter((c) => c === k).length,
      expected: 100 * binomPmf(k, n, 0.01),
    })
  }
  return bins
}

/**
 * Gap analysis for the 00–99 endings: every interval between appearances,
 * plus how many draws each number is currently overdue.
 */
export function gapAnalysis(draws) {
  const old2new = [...draws].reverse()
  const last = Array(100).fill(-1)
  const gaps = []
  old2new.forEach((d, i) => {
    for (const s of d.last2) {
      const v = Number(s)
      if (last[v] >= 0) gaps.push(i - last[v])
      last[v] = i
    }
  })
  const n = old2new.length
  const droughts = last.map((i, v) => ({
    v,
    drought: i < 0 ? n : n - 1 - i,
    seen: i >= 0,
  }))
  return {
    gaps,
    droughts: droughts.sort((a, b) => b.drought - a.drought),
    maxGap: gaps.length ? Math.max(...gaps) : 0,
    meanGap: gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0,
  }
}

/** Gaps bucketed against the geometric distribution a fair draw would produce. */
export function gapHistogram(gaps, width = 20, buckets = 8) {
  const p = 0.01
  const out = []
  for (let b = 0; b < buckets; b++) {
    const lo = b * width + 1
    const hi = (b + 1) * width
    const isLast = b === buckets - 1
    // P(lo <= G <= hi) for G ~ Geometric(p); last bucket is the open tail
    const expectedP = isLast
      ? (1 - p) ** (lo - 1)
      : (1 - p) ** (lo - 1) - (1 - p) ** hi
    out.push({
      label: isLast ? `${lo}+` : `${lo}–${hi}`,
      observed: gaps.filter((g) => (isLast ? g >= lo : g >= lo && g <= hi)).length,
      expected: expectedP * gaps.length,
    })
  }
  return out
}

/** Digit 0–9 frequency at each of the 6 positions of the first prize. */
export function digitPositions(draws) {
  const grid = Array.from({ length: 6 }, () => Array(10).fill(0))
  for (const d of draws) {
    const s = d.first[0]
    if (!s || s.length !== 6) continue
    for (let i = 0; i < 6; i++) grid[i][Number(s[i])]++
  }
  const n = draws.length
  const rows = grid.map((counts, i) => {
    const exp = n / 10
    const chi2 = counts.reduce((s, c) => s + (c - exp) ** 2 / exp, 0)
    return { pos: i, counts, chi2, df: 9, p: chi2SF(chi2, 9) }
  })
  return { rows, n, expected: n / 10 }
}

/**
 * Law of large numbers: the 5th–95th percentile spread of the 100 endings'
 * relative frequency, as draws accumulate. (Percentiles rather than min/max —
 * the extremes of 100 numbers are dominated by the two or three that happen
 * never to have come up, and say more about the sample size than the spread.)
 */
export function convergenceBand(draws, from = 40, points = 90) {
  const old2new = [...draws].reverse()
  const freq = Array(100).fill(0)
  const series = []
  const step = Math.max(1, Math.floor((old2new.length - from) / points))
  old2new.forEach((d, i) => {
    for (const s of d.last2) freq[Number(s)]++
    const n = i + 1
    if (n >= from && (n % step === 0 || n === old2new.length)) {
      const sorted = [...freq].sort((a, b) => a - b)
      series.push({ n, lo: sorted[5] / n, hi: sorted[94] / n })
    }
  })
  return series
}

/* ---------- per-ticket probability & expected value ---------- */

/** Face value printed on the ticket; street prices run higher. */
export const FACE_PRICE = 80

/**
 * Exact per-ticket odds for one draw, derived from that draw's own prize
 * structure. A ticket is a uniform pick from 000000–999999. Only the payout
 * ratio depends on `price` — the expected value itself does not.
 */
export function ticketOdds(draw, price = FACE_PRICE) {
  const tiers = [
    ['รางวัลที่ 1', draw.first, draw.first_p, 6],
    ['ข้างเคียงรางวัลที่ 1', draw.near1, draw.near1_p, 6],
    ['รางวัลที่ 2', draw.second, draw.second_p, 6],
    ['รางวัลที่ 3', draw.third, draw.third_p, 6],
    ['รางวัลที่ 4', draw.fourth, draw.fourth_p, 6],
    ['รางวัลที่ 5', draw.fifth, draw.fifth_p, 6],
    ['เลขหน้า 3 ตัว', draw.last3f, draw.last3f_p, 3],
    ['เลขท้าย 3 ตัว', draw.last3b, draw.last3b_p, 3],
    ['เลขท้าย 2 ตัว', draw.last2, draw.last2_p, 2],
  ]
    .filter(([, nums]) => nums.length)
    .map(([label, nums, prize, digits]) => {
      const p = nums.length / 10 ** digits
      return { label, count: nums.length, prize, p, ev: p * prize }
    })

  const ev = tiers.reduce((s, t) => s + t.ev, 0)

  // Exact P(win something): split the ticket into front-3 | back-3.
  const backWins = new Set()
  for (const w of draw.last2) for (let i = 0; i < 10; i++) backWins.add(String(i) + w)
  for (const w of draw.last3b) backWins.add(w)
  const frontWins = new Set(draw.last3f)
  let losing = (1000 - backWins.size) * (1000 - frontWins.size)
  // ...then add back any 6-digit prize number that the split above counted as a loss
  const sixDigit = new Set([
    ...draw.first, ...draw.near1, ...draw.second,
    ...draw.third, ...draw.fourth, ...draw.fifth,
  ])
  for (const num of sixDigit) {
    if (!frontWins.has(num.slice(0, 3)) && !backWins.has(num.slice(3))) losing--
  }

  const pWin = 1 - losing / 1e6
  return { tiers, ev, pWin, price, rtp: ev / price }
}

/* Knuth's method — every λ here is well under 1, so this exits in a step or two. */
function poissonSample(lambda) {
  if (lambda <= 0) return 0
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

/**
 * Buying `n` tickets in ONE draw, two ways: all the same number, or n different
 * numbers. The expected value is identical — only the spread of outcomes moves.
 *
 * Exact: "nothing at all" (sampling without replacement over the 1,000,000
 * possible tickets) and the first-prize odds. Simulated: breaking even, which
 * needs the payout total — tiers are treated as independent Poisson counts, a
 * close approximation at these probabilities.
 */
export function drawStrategies(odds, draw, n, price, trials = 50000) {
  const spend = n * price
  const losing = Math.round((1 - odds.pWin) * 1e6)

  let pNothingDistinct = 1
  for (let i = 0; i < n; i++) pNothingDistinct *= (losing - i) / (1e6 - i)

  let breakEven = 0
  for (let t = 0; t < trials; t++) {
    let pay = 0
    for (const tier of odds.tiers) pay += poissonSample(n * tier.p) * tier.prize
    if (pay >= spend) breakEven++
  }

  const pFirstOne = draw.first.length / 1e6
  return {
    spend,
    ev: n * odds.ev,
    distinct: {
      pNothing: pNothingDistinct,
      pWin: 1 - pNothingDistinct,
      pBreakEven: breakEven / trials,
      pFirst: 1 - (1 - pFirstOne) ** n,
    },
    same: {
      pNothing: 1 - odds.pWin,
      pWin: odds.pWin,
      // one number, so the payout is n × that number's prize: break even iff it clears the price
      pBreakEven: odds.tiers.filter((t) => t.prize >= price).reduce((s, t) => s + t.p, 0),
      pFirst: pFirstOne,
    },
  }
}

export const DRAWS_PER_YEAR = 24

/** Outcome of buying `tickets` every draw for `years`. */
export function projectSpend(odds, draw, tickets, years) {
  const n = tickets * years * DRAWS_PER_YEAR
  const pFirst = draw.first.length / 1e6
  return {
    draws: years * DRAWS_PER_YEAR,
    tickets: n,
    spend: n * odds.price,
    expectedReturn: n * odds.ev,
    pAnyFirst: 1 - (1 - pFirst) ** n,
    pAnyWin: 1 - (1 - odds.pWin) ** n,
    expectedWins: n * odds.pWin,
  }
}
