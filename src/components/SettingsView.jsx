import { useState, useEffect } from 'react'
import { getSettings, saveSettings, pullCardsFromCloud } from '../modules/db.js'
import { requestPermissionAndSubscribe, unsubscribePush, getCurrentSubscription, saveScheduleToServer } from '../modules/notifications.js'

export default function SettingsView() {
  const [settings, setSettings] = useState(null)

  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('green')
  const [notifLoading, setNotifLoading] = useState(false)
  const [syncInput, setSyncInput] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)

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
      // Hata mesajını ezmeden sessizce kaydet
      setSettings(s => ({ ...s, notificationEnabled: false }))
      await saveSettings({ notificationEnabled: false })
    }
    setNotifLoading(false)
  }

  const addTime = async (t) => {
    if (!settings) return
    const times = [...new Set([...settings.notificationTimes, t])].sort()
    await save({ notificationTimes: times })
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

  const handlePullCloud = async () => {
    if (!syncInput.trim()) return showMsg('Lütfen bir kod girin', 'red')
    setSyncLoading(true)
    try {
      const added = await pullCardsFromCloud(syncInput)
      showMsg(added > 0 ? `${added} yeni kelime eklendi ✓` : 'Yeni kelime bulunamadı.')
      if (added > 0) {
        // Yeni kodumuz yapalım ki bundan sonraki kelimeler de o havuza gitsin
        await save({ syncCode: syncInput.trim() })
      }
      setSyncInput('')
    } catch (err) {
      showMsg(err.message, 'red')
    }
    setSyncLoading(false)
  }

  const handleExport = async () => {
    try {
      const { getAllCards } = await import('../modules/db.js')
      const cards = await getAllCards()
      if (cards.length === 0) return showMsg('Dışa aktarılacak kelime yok', 'red')
      
      const text = cards.map(c => `${c.front}\t${c.back}`).join('\n')
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kelimelerim_${new Date().toISOString().slice(0,10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
      showMsg('Dosya indirildi ✓')
    } catch (err) {
      showMsg('Hata: ' + err.message, 'red')
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

        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8, marginBottom: 8 }}>
          Bildirim almak istediğin saatlere dokun:
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, margin: '8px 0'
        }}>
          {(() => {
            const slots = []
            for (let h = 9; h <= 23; h++) {
              for (const m of ['00', '30']) {
                if (h === 23 && m === '30') continue // 23:30 yok
                slots.push(`${String(h).padStart(2, '0')}:${m}`)
              }
            }
            return slots.map(t => {
              const isSelected = settings.notificationTimes.includes(t)
              return (
                <button
                  key={t}
                  onClick={() => isSelected ? removeTime(t) : addTime(t)}
                  style={{
                    padding: '10px 4px',
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    borderRadius: 10,
                    border: isSelected ? '2px solid var(--green, #2d8a4e)' : '1.5px solid #ddd',
                    background: isSelected ? '#e6f4ec' : 'var(--paper, #fff)',
                    color: isSelected ? 'var(--green, #2d8a4e)' : 'var(--ink-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t}
                </button>
              )
            })
          })()
          }
        </div>
      </div>

      {/* Yedekleme & Senkronizasyon */}
      <div className="settings-section">
        <h3>Yedekleme & Senkronizasyon</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--ink-muted)', marginBottom: 4 }}>Senkronizasyon Kodun</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              className="input" 
              readOnly 
              value={settings.syncCode || ''} 
              style={{ flex: 1, fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--ink)' }} 
            />
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                if (!settings.syncCode) return
                navigator.clipboard.writeText(settings.syncCode)
                showMsg('Kod kopyalandı!')
              }}
              style={{ width: 'auto', padding: '13px 20px' }}
            >
              Kopyala
            </button>
          </div>
          <div style={{ 
            fontSize: 12, 
            color: '#856404', 
            marginTop: 8, 
            padding: '10px 12px', 
            background: '#fff3cd', 
            border: '1px solid #ffeeba',
            borderRadius: 8,
            lineHeight: 1.5
          }}>
            <strong>⚠️ DİKKAT:</strong> Telefon değiştirirseniz veya uygulamayı silerseniz, eski kelimelerinizi geri getirebilmek için bu koda ihtiyacınız olacak. Lütfen kopyalayıp güvenli bir yere kaydedin (Notlar veya WhatsApp gibi).
          </div>
        </div>

        <div style={{ padding: '12px', background: 'var(--cream)', borderRadius: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Eski Kelimeleri Geri Getir</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Örn: f47ac10b"
              value={syncInput}
              onChange={e => setSyncInput(e.target.value)}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <button 
              className="btn btn-primary" 
              onClick={handlePullCloud}
              disabled={syncLoading || !syncInput.trim()}
              style={{ width: 'auto', padding: '13px 20px' }}
            >
              {syncLoading ? 'İndiriliyor...' : 'İndir'}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Veri</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 12 }}>
          Lokal verilerinizi yönetin.
        </p>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginBottom: 12, border: '1.5px solid #ddd' }}
          onClick={handleExport}
        >
          Kelimeleri Dosya Olarak İndir (.txt)
        </button>
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