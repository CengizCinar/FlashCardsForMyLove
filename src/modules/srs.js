// ── SM-2 Algoritması + Kelime Seçimi + Cevap Kontrolü ────────────────────

const MIN_EASE = 1.3

// ── Cevap Kontrolü ────────────────────────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function normalize(str) {
  return str.trim().toLowerCase()
    .replace(/\s+/g, ' ')
}

// result: 'correct' | 'typo' | 'wrong'
export function checkAnswer(userInput, correctAnswer) {
  const u = normalize(userInput)
  const c = normalize(correctAnswer)
  if (u === c) return 'correct'
  const dist = levenshtein(u, c)
  if (dist <= 2) return 'typo'
  return 'wrong'
}

// ── SM-2 Hesaplama ─────────────────────────────────────────────────────────
// grade: 0=yanlış | 1=typo(zor) | 2=doğru | 3=kolay
export function calculateNextReview(card, grade) {
  let { interval = 0, easeFactor = 2.5, repetitions = 0 } = card

  // SM-2 q değeri (0-5 skalası)
  const q = grade === 0 ? 0 : grade === 1 ? 3 : grade === 2 ? 4 : 5

  // Ease factor güncelle
  const newEase = Math.max(
    MIN_EASE,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  )

  let newInterval, newRepetitions

  if (grade === 0) {
    // Yanlış: sıfırla, 1 dk sonra tekrar
    newRepetitions = 0
    newInterval = 0
    const next = new Date()
    next.setMinutes(next.getMinutes() + 1)
    return {
      interval: 0,
      easeFactor: Math.max(MIN_EASE, easeFactor - 0.2),
      repetitions: 0,
      totalReviews: (card.totalReviews || 0) + 1,
      lastReview: new Date().toISOString(),
      nextReview: next.toISOString()
    }
  }

  // Doğru veya typo
  if (repetitions === 0) {
    newInterval = 1
  } else if (repetitions === 1) {
    newInterval = 6
  } else {
    newInterval = Math.round(interval * newEase)
  }

  // Typo → aralığı biraz kıs
  if (grade === 1) newInterval = Math.max(1, Math.floor(newInterval * 0.7))

  newRepetitions = repetitions + 1

  const next = new Date()
  next.setDate(next.getDate() + newInterval)

  return {
    interval: newInterval,
    easeFactor: newEase,
    repetitions: newRepetitions,
    totalReviews: (card.totalReviews || 0) + 1,
    lastReview: new Date().toISOString(),
    nextReview: next.toISOString()
  }
}

// ── Kelime Seçim Algoritması ──────────────────────────────────────────────
// Ağırlıklı rastgele seçim:
//   - Vadesi geçmiş kartlar: ağırlık = ne kadar geçmiş (gün) + 1
//   - Yeni kartlar (hiç çalışılmamış): sabit orta ağırlık
//   - Seansda son 3 içinde görülen kart → tekrar gelemesin
//   - Aynı kelimeye arka arkaya aynı yön gelmesin

export function pickNextCard(dueCards, sessionHistory = []) {
  if (dueCards.length === 0) return null

  const now = new Date()

  // Son 3 kartın id'si → hariç tut (1 kartsa hariç tutma)
  const recentIds = sessionHistory.slice(-3).map(h => h.cardId)
  const pool = dueCards.length > 3
    ? dueCards.filter(c => !recentIds.includes(c.id))
    : dueCards

  if (pool.length === 0) return null

  // Ağırlık hesapla
  const weighted = pool.map(card => {
    const overdueDays = card.repetitions === 0
      ? 1 // yeni kart
      : Math.max(0, (now - new Date(card.nextReview)) / (1000 * 60 * 60 * 24))
    return { card, weight: overdueDays + 1 }
  })

  // Ağırlıklı rastgele seç
  const total = weighted.reduce((s, w) => s + w.weight, 0)
  let rand = Math.random() * total
  let selected = weighted[weighted.length - 1].card
  for (const { card, weight } of weighted) {
    rand -= weight
    if (rand <= 0) { selected = card; break }
  }

  // Yön belirle: NL→TR veya TR→NL
  // Aynı karta son gösterilen yönün tersini tercih et
  const lastSeen = sessionHistory.filter(h => h.cardId === selected.id).pop()
  let direction
  if (!lastSeen) {
    direction = Math.random() < 0.5 ? 'nl-tr' : 'tr-nl'
  } else {
    direction = lastSeen.direction === 'nl-tr' ? 'tr-nl' : 'nl-tr'
  }

  return { card: selected, direction }
}

// Yüzde ilerleme (bugünkü seans için)
export function sessionProgress(total, remaining) {
  if (total === 0) return 100
  return Math.round(((total - remaining) / total) * 100)
}
