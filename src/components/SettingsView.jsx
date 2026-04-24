import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../modules/db.js'

export default function SettingsView() {
  const [settings, setSettings] = useState(null)
  const [newTime, setNewTime]   = useState('08:00')
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const save = async (patch) => {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await saveSettings(patch)
    setMsg('Kaydedildi ✓')
    setTimeout(() => setMsg(''), 1500)
  }

  const addTime = () => {
    if (!settings) return
    const times = [...new Set([...settings.notificationTimes, newTime])].sort()
    save({ notificationTimes: times })
  }

  const removeTime = (t) => {
    const times = settings.notificationTimes.filter(x => x !== t)
    save({ notificationTimes: times })
  }

  if (!settings) return <div className="view"><p>Yükleniyor...</p></div>

  return (
    <div className="view">
      <h1 className="view-title">Ayarlar</h1>
      {msg && <p style={{ color: 'var(--green)', fontSize: 14, marginBottom: 12 }}>{msg}</p>}

      {/* Günlük hedef */}
      <div className="settings-section">
        <h3>Çalışma hedefi</h3>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Günlük maksimum kart</label>
          <input
            className="input"
            type="number"
            min={5} max={200}
            value={settings.dailyGoal}
            onChange={e => save({ dailyGoal: parseInt(e.target.value) || 20 })}
          />
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 8 }}>
          Vadesi geçmiş kartların tümü gösterilir. Bu sayı yeni kart limitini belirler.
        </p>
      </div>

      {/* Bildirim saatleri */}
      <div className="settings-section">
        <h3>Bildirim saatleri</h3>
        <div className="toggle-row">
          <span className="toggle-label">Bildirimler</span>
          <button
            className={`toggle ${settings.notificationEnabled ? 'on' : ''}`}
            onClick={() => save({ notificationEnabled: !settings.notificationEnabled })}
          />
        </div>

        <div className="time-chips" style={{ margin: '12px 0' }}>
          {settings.notificationTimes.map(t => (
            <div className="time-chip" key={t}>
              <span>{t}</span>
              <button onClick={() => removeTime(t)}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            type="time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-ghost" style={{ width: 'auto', padding: '13px 18px' }} onClick={addTime}>
            + Ekle
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 10, lineHeight: 1.5 }}>
          ⚠️ Bildirimlerin çalışması için uygulamayı <strong>Ana Ekrana Ekle</strong> (Safari → Paylaş → Ana Ekrana Ekle) ve iOS 16.4+ gerekli.
        </p>
      </div>

      {/* Veri */}
      <div className="settings-section">
        <h3>Veri</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 12 }}>
          Tüm veriler sadece bu cihazda, çevrimdışı saklanır.
        </p>
        <button
          className="btn btn-danger"
          onClick={async () => {
            if (window.confirm('Tüm ilerleme sıfırlansın mı? Kelimeler silinmez.')) {
              const { db } = await import('../modules/db.js')
              await db.cards.toCollection().modify({ repetitions: 0, interval: 0, easeFactor: 2.5, nextReview: new Date().toISOString() })
              setMsg('İlerleme sıfırlandı.')
            }
          }}
        >
          İlerlemeyi sıfırla
        </button>
      </div>
    </div>
  )
}
