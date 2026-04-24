import { useState } from 'react'
import { addCard, updateCard } from '../modules/db.js'

export default function AddWordView({ editCard = null, onSave }) {
  const [front, setFront] = useState(editCard?.front || '')
  const [back, setBack] = useState(editCard?.back || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [addedMsg, setAddedMsg] = useState('')

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      setError('Her iki alan da dolu olmalı.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editCard) {
        await updateCard(editCard.id, { front: front.trim(), back: back.trim() })
        onSave?.()
      } else {
        await addCard({ front: front.trim(), back: back.trim() })
        setAddedMsg(`"${front.trim()}" eklendi ✓`)
        setTimeout(() => setAddedMsg(''), 2500)
        setFront('')
        setBack('')
        // Sayfa değişmez, kullanıcı isterse devam ekler
      }
    } catch (e) {
      setError('Kaydedilemedi: ' + e.message)
    }
    setSaving(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
  }

  return (
    <div className="view">
      <h1 className="view-title">{editCard ? 'Kelimeyi Düzenle' : 'Yeni Kelime'}</h1>
      <p className="view-sub">İki dil arasında bir kelime çifti ekle.</p>

      <div className="field">
        <label>Hollandaca</label>
        <input
          className="input"
          type="text"
          placeholder="bijv. fiets, appel, huis..."
          value={front}
          onChange={e => setFront(e.target.value)}
          onKeyDown={handleKeyDown}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      <div className="field">
        <label>Türkçe</label>
        <input
          className="input"
          type="text"
          placeholder="örn. bisiklet, elma, ev..."
          value={back}
          onChange={e => setBack(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 12 }}>{error}</p>
      )}
      {addedMsg && (
        <p style={{ color: 'var(--green)', fontSize: 14, marginBottom: 12, padding: '10px 14px', background: '#e6f4ec', borderRadius: 8 }}>
          {addedMsg}
        </p>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Kaydediliyor...' : editCard ? 'Güncelle' : '+ Ekle'}
      </button>

      {!editCard && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Toplu içe aktar
          </h3>
          <BulkImport />
        </div>
      )}
    </div>
  )
}

function BulkImport() {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    setLoading(true)
    const lines = text.trim().split('\n').filter(l => l.includes('\t') || l.includes(';'))
    let count = 0
    for (const line of lines) {
      const sep = line.includes('\t') ? '\t' : ';'
      const [f, b] = line.split(sep)
      if (f?.trim() && b?.trim()) {
        await addCard({ front: f.trim(), back: b.trim() })
        count++
      }
    }
    setResult(`${count} kelime eklendi ✓`)
    setText('')
    setLoading(false)
  }

  return (
    <>
      <textarea
        className="input"
        rows={6}
        placeholder={"Her satıra bir çift:\nfiets\tbisiklet\nappel\telma\nhuis\tev\n\n(Tab veya ; ile ayır)"}
        value={text}
        onChange={e => { setText(e.target.value); setResult('') }}
        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 14 }}
      />
      {result && (
        <p style={{ fontSize: 14, color: 'var(--green)', margin: '8px 0', padding: '10px 14px', background: '#e6f4ec', borderRadius: 8 }}>
          {result}
        </p>
      )}
      <button
        className="btn btn-ghost"
        style={{ marginTop: 8 }}
        onClick={handleImport}
        disabled={!text.trim() || loading}
      >
        {loading ? 'Ekleniyor...' : 'İçe aktar'}
      </button>
    </>
  )
}