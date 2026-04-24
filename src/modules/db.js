import Dexie from 'dexie'
import { supabase } from './supabaseClient'

// ── Veritabanı şeması ──────────────────────────────────────────────────────
export const db = new Dexie('KelimeKartlari')

db.version(1).stores({
  cards: '++id, front, back, language, nextReview, createdAt',
  settings: 'id'
})

// ── Varsayılan ayarlar ─────────────────────────────────────────────────────
export async function getSettings() {
  let s = await db.settings.get(1)
  if (!s) {
    s = {
      id: 1,
      notificationEnabled: false,
      notificationTimes: ['09:00', '19:00'],
      pushSubscription: null,
      dailyGoal: 20,
      syncCode: Math.random().toString(36).substring(2, 10) // 8 haneli kod
    }
    await db.settings.put(s)
  }
  if (!s.syncCode) {
    s.syncCode = Math.random().toString(36).substring(2, 10)
    await db.settings.put(s)
  }
  return s
}

export async function saveSettings(patch) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch })
}

// ── Kart CRUD ──────────────────────────────────────────────────────────────
export async function addCard({ front, back, language = 'nl-tr' }) {
  const s = await getSettings()
  
  // 1. Supabase'e gönder
  const { error } = await supabase
    .from('cards')
    .insert([{ front: front.trim(), back: back.trim(), language, user_code: s.syncCode }])

  if (error) console.error("Supabase'e kayıt hatası:", error)

  // 2. Lokal veritabanına (Dexie) ekle
  return db.cards.add({
    front: front.trim(),
    back: back.trim(),
    language,
    nextReview: new Date().toISOString(),
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    totalReviews: 0,
    createdAt: new Date().toISOString()
  })
}

export async function updateCard(id, patch) {
  return db.cards.update(id, patch)
}

export async function deleteCard(id) {
  return db.cards.delete(id)
}

export async function getDueCards() {
  const now = new Date().toISOString()
  return db.cards
    .where('nextReview')
    .belowOrEqual(now)
    .toArray()
}

export async function getAllCards() {
  return db.cards.orderBy('createdAt').reverse().toArray()
}

export async function getCardCount() {
  return db.cards.count()
}

export async function getDueCount() {
  const cards = await getDueCards()
  return cards.length
}

// ── Bulut Senkronizasyonu ──────────────────────────────────────────────────
export async function pullCardsFromCloud(code) {
  if (!code) throw new Error('Geçersiz kod')
  
  // Buluttaki kelimeleri çek
  const { data: cloudCards, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_code', code.trim())
    
  if (error) throw new Error('Buluttan okuma hatası: ' + error.message)
  if (!cloudCards || cloudCards.length === 0) return 0
  
  // Mevcut yerel kartları al (çiftleri engellemek için)
  const localCards = await db.cards.toArray()
  const localMap = new Set(localCards.map(c => `${c.front.toLowerCase()}-${c.back.toLowerCase()}`))
  
  let addedCount = 0
  const now = new Date().toISOString()
  
  for (const cc of cloudCards) {
    const key = `${cc.front.toLowerCase()}-${cc.back.toLowerCase()}`
    if (!localMap.has(key)) {
      await db.cards.add({
        front: cc.front,
        back: cc.back,
        language: cc.language || 'nl-tr',
        nextReview: now,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalReviews: 0,
        createdAt: cc.createdAt || now
      })
      addedCount++
    }
  }
  
  return addedCount
}