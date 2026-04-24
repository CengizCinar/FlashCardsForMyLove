import { useState, useEffect, useRef, useCallback } from 'react'
import { getDueCards, updateCard, getAllCards } from '../modules/db.js'
import { checkAnswer, calculateNextReview, pickNextCard } from '../modules/srs.js'

export default function StudyView({ dailyGoal = 20 }) {
  const [queue, setQueue] = useState([])        // bugünkü vadesi gelen kartlar
  const [current, setCurrent] = useState(null)  // { card, direction }
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null) // { type, message, correct }
  const [sessionHistory, setSessionHistory] = useState([])
  const [sessionTotal, setSessionTotal] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef(null)

  // Kartları yükle
  const loadQueue = useCallback(async () => {
    setLoading(true)
    let cards = await getDueCards()
    // Günlük hedefe göre kırp (yeni kartları sınırla ama vadesi geçenleri hep al)
    const overdue  = cards.filter(c => c.repetitions > 0)
    const newCards = cards.filter(c => c.repetitions === 0).slice(0, Math.max(0, dailyGoal - overdue.length))
    const final = [...overdue, ...newCards]
    setQueue(final)
    setSessionTotal(final.length)
    if (final.length > 0) {
      const pick = pickNextCard(final, [])
      setCurrent(pick)
    }
    setLoading(false)
  }, [dailyGoal])

  useEffect(() => { loadQueue() }, [loadQueue])

  // Input'a focus
  useEffect(() => {
    if (current && !feedback && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [current, feedback])

  const handleSubmit = async () => {
    if (!current || !answer.trim()) return

    const { card, direction } = current
    const correctAnswer = direction === 'nl-tr' ? card.back : card.front
    const result = checkAnswer(answer, correctAnswer)

    // Grade belirle
    const grade = result === 'correct' ? 2 : result === 'typo' ? 1 : 0

    const feedbackMap = {
      correct: { type: 'correct', message: '✓ Doğru!' },
      typo:    { type: 'typo',    message: '~ Doğru ama yazıma dikkat!' },
      wrong:   { type: 'wrong',   message: '✗ Yanlış' }
    }

    setFeedback({ ...feedbackMap[result], correct: correctAnswer })

    if (result === 'wrong') {
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
    }

    // SRS güncelle
    const update = calculateNextReview(card, grade)
    await updateCard(card.id, update)

    // Seans geçmişine ekle
    const newHistory = [...sessionHistory, { cardId: card.id, direction, result }]
    setSessionHistory(newHistory)

    // Yanlışsa kartı kuyruğun sonuna geri koy
    let newQueue = queue
    if (grade === 0) {
      newQueue = [...queue.filter(c => c.id !== card.id), { ...card, ...update }]
    } else {
      newQueue = queue.filter(c => c.id !== card.id)
    }
    setQueue(newQueue)
  }

  const handleNext = () => {
    setAnswer('')
    setFeedback(null)
    if (queue.length === 0) {
      setDone(true)
      return
    }
    const pick = pickNextCard(queue, sessionHistory)
    if (!pick) { setDone(true); return }
    setCurrent(pick)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (feedback) handleNext()
      else handleSubmit()
    }
  }

  if (loading) return (
    <div className="view">
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <p>Kelimeler yükleniyor...</p>
      </div>
    </div>
  )

  if (done || (sessionTotal === 0)) return (
    <div className="view">
      <div className="done-screen">
        <div className="done-icon">🎉</div>
        <h2>{sessionTotal === 0 ? 'Bugünlük tamamdır!' : 'Harika iş!'}</h2>
        <p>
          {sessionTotal === 0
            ? 'Bugün çalışılacak kelime yok.\nYeni kelimeler ekleyebilirsin.'
            : `${sessionHistory.filter(h => h.result !== 'wrong').length} / ${sessionHistory.length} doğru cevapladın.`}
        </p>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => { setDone(false); setSessionHistory([]); loadQueue() }}>
          Tekrar başla
        </button>
      </div>
    </div>
  )

  if (!current) return null

  const { card, direction } = current
  const question = direction === 'nl-tr' ? card.front : card.back
  const langLabel = direction === 'nl-tr' ? 'NL → TR' : 'TR → NL'
  const hintLang  = direction === 'nl-tr' ? 'Türkçesi nedir?' : 'Hollandacası nedir?'
  const progress  = sessionTotal > 0 ? Math.round(((sessionTotal - queue.length) / sessionTotal) * 100) : 0

  return (
    <div className="view">
      {/* İlerleme */}
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          {queue.length} kelime kaldı
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          {progress}%
        </span>
      </div>

      {/* Kart */}
      <div className={`flashcard-wrap ${shaking ? 'shake' : ''}`}>
        <div className="flashcard">
          <span className="card-lang-badge">{langLabel}</span>
          <div className="card-word">{question}</div>
          <div className="card-hint">{hintLang}</div>
        </div>
      </div>

      {/* Cevap alanı */}
      <div className="answer-area">
        <input
          ref={inputRef}
          className={`answer-input ${feedback ? feedback.type : ''}`}
          type="text"
          placeholder="Cevabını yaz..."
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!!feedback}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />

        {feedback && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.message}
            {feedback.type !== 'correct' && (
              <div className="correct-answer">{feedback.correct}</div>
            )}
          </div>
        )}

        {!feedback ? (
          <button className="btn btn-primary" onClick={handleSubmit}>
            Kontrol et →
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={handleNext}>
            {queue.length === 0 ? 'Bitir ✓' : 'Sonraki →'}
          </button>
        )}
      </div>
    </div>
  )
}
