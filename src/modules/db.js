import Dexie from 'dexie'
import { supabase } from './supabaseClient'

// ── Veritabanı şeması ──────────────────────────────────────────────────────
// cards tablosu: her kelime kartı bir kayıt
// settings tablosu: tek bir satır (id=1), uygulama ayarları

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
      dailyGoal: 20
    }
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
  // 1. Supabase'e gönder
  const { error } = await supabase
    .from('cards')
    .insert([{ front: front.trim(), back: back.trim(), language }])

  if (error) console.error("Supabase'e kayıt hatası:", error)

  // 2. Lokal veritabanına (Dexie) ekle (Mevcut kodun)
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
