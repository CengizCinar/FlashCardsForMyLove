import { useState } from 'react'
import { addCard, updateCard } from '../modules/db.js'

export default function AddWordView({ editCard = null, onSave }) {
  const [front, setFront] = useState(editCard?.front || '')
  const [back,  setBack]  = useState(editCard?.back  || '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

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
      } else {
        await addCard({ front: front.trim(), back: back.trim() })
        setFront('')
        setBack('')
      }
      onSave?.()
    } catch (e) {
      setError('Kaydedilemedi: ' + e.message)
    }
    setSaving(false)
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
        />
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 12 }}>{error}</p>
      )}

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Kaydediliyor...' : editCard ? 'Güncelle' : '+ Ekle'}
      </button>

      {!editCard && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Toplu içe aktar
          </h3>
          <BulkImport onImport={onSave} />
        </div>
      )}
    </div>
  )
}

function BulkImport({ onImport }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')

  const handleImport = async () => {
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
    setResult(`${count} kelime eklendi.`)
    setText('')
    onImport?.()
  }

  return (
    <>
      <textarea
        className="input"
        rows={5}
        placeholder={"Her satıra bir çift:\nfiets\tbisiklet\nappel\telma\n\n(Tab veya ; ile ayır)"}
        value={text}
        onChange={e => setText(e.target.value)}
        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 14 }}
      />
      {result && <p style={{ fontSize: 14, color: 'var(--green)', margin: '8px 0' }}>{result}</p>}
      <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={handleImport} disabled={!text.trim()}>
        İçe aktar
      </button>
    </>
  )
}
