import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../modules/db.js'
import { requestPermissionAndSubscribe, unsubscribePush, getCurrentSubscription, saveScheduleToServer } from '../modules/notifications.js'

export default function SettingsView() {
  const [settings, setSettings] = useState(null)
  const [newTime, setNewTime] = useState('08:00')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('green')
  const [notifLoading, setNotifLoading] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const showMsg = (text, type = 'green') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  const save = async (patch) => {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await saveSettings(patch)
    showMsg('Kaydedildi ✓')
  }

  const handleNotificationToggle = async () => {
    if (!settings) return
    setNotifLoading(true)

    try {
      if (settings.notificationEnabled) {
        // Kapat
        await unsubscribePush()
        await save({ notificationEnabled: false, pushSubscription: null })
        showMsg('Bildirimler kapatıldı.')
      } else {
        // Aç — burada iOS izin penceresi çıkar
        const subscription = await requestPermissionAndSubscribe()
        const subJson = JSON.parse(JSON.stringify(subscription))
        await saveScheduleToServer(subJson, settings.notificationTimes)
        await save({ notificationEnabled: true, pushSubscription: subJson })
        showMsg('Bildirimler açıldı! ✓')
      }
    } catch (err) {
      if (err.message.includes('izni')) {
        showMsg('İzin verilmedi. iPhone Ayarları → Bildirimler → Kartlar → İzin Ver.', 'red')
      } else if (err.message.includes('VAPID')) {
        showMsg('Sunucu henüz yapılandırılmamış (VAPID key eksik).', 'red')
      } else {
        showMsg('Hata: ' + err.message, 'red')
      }
      await save({ notificationEnabled: false })
    }
    setNotifLoading(false)
  }

  const addTime = async () => {
    if (!settings) return
    const times = [...new Set([...settings.notificationTimes, newTime])].sort()
    await save({ notificationTimes: times })
    // Bildirim açıksa sunucuyu güncelle
    if (settings.notificationEnabled && settings.pushSubscription) {
      await saveScheduleToServer(settings.pushSubscription, times).catch(() => { })
    }
  }

  const removeTime = async (t) => {
    const times = settings.notificationTimes.filter(x => x !== t)
    await save({ notificationTimes: times })
    if (settings.notificationEnabled && settings.pushSubscription) {
      await saveScheduleToServer(settings.pushSubscription, times).catch(() => { })
    }
  }

  if (!settings) return <div className="view"><p>Yükleniyor...</p></div>

  return (
    <div className="view">
      <h1 className="view-title">Ayarlar</h1>
      {msg && (
        <p style={{ color: `var(--${msgType})`, fontSize: 14, marginBottom: 12, padding: '10px 14px', background: msgType === 'red' ? '#fce8e8' : '#e6f4ec', borderRadius: 8 }}>
          {msg}
        </p>
      )}

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

      {/* Bildirimler */}
      <div className="settings-section">
        <h3>Bildirimler</h3>

        <div className="toggle-row">
          <div>
            <span className="toggle-label">Bildirimler</span>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
              {settings.notificationEnabled ? '✓ Aktif' : 'Kapalı'}
            </div>
          </div>
          <button
            className={`toggle ${settings.notificationEnabled ? 'on' : ''}`}
            onClick={handleNotificationToggle}
            disabled={notifLoading}
            style={{ opacity: notifLoading ? 0.6 : 1 }}
          />
        </div>

        {!settings.notificationEnabled && (
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8, lineHeight: 1.6, padding: '8px 12px', background: 'var(--cream)', borderRadius: 8 }}>
            ⚠️ Bildirimlerin çalışması için:<br />
            1. Bu toggle'ı aç<br />
            2. Çıkan izin penceresinde <strong>"İzin Ver"</strong> de<br />
            3. Uygulama <strong>Ana Ekrandan</strong> açılmış olmalı (Safari'den değil)<br />
            4. iOS 16.4+ gerekli
          </p>
        )}

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
              await db.cards.toCollection().modify({
                repetitions: 0, interval: 0, easeFactor: 2.5,
                nextReview: new Date().toISOString()
              })
              showMsg('İlerleme sıfırlandı.')
            }
          }}
        >
          İlerlemeyi sıfırla
        </button>
      </div>
    </div>
  )
}