import { useState, useEffect } from 'react'
import { getAllCards, deleteCard } from '../modules/db.js'
import AddWordView from './AddWordView.jsx'

export default function WordListView() {
  const [cards, setCards]     = useState([])
  const [search, setSearch]   = useState('')
  const [editing, setEditing] = useState(null) // kart objesi

  const load = async () => {
    const all = await getAllCards()
    setCards(all)
  }

  useEffect(() => { load() }, [])

  const filtered = cards.filter(c =>
    c.front.toLowerCase().includes(search.toLowerCase()) ||
    c.back.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kelimeyi sil?')) return
    await deleteCard(id)
    load()
  }

  if (editing) return (
    <AddWordView
      editCard={editing}
      onSave={() => { setEditing(null); load() }}
    />
  )

  return (
    <div className="view">
      <h1 className="view-title">Kelimeler</h1>
      <p className="view-sub">{cards.length} kelime kayıtlı</p>

      <div className="field">
        <input
          className="input"
          type="search"
          placeholder="🔍  Ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>{search ? 'Sonuç bulunamadı.' : 'Henüz kelime eklenmedi.\n"+" sekmesinden başla!'}</p>
        </div>
      )}

      {filtered.map(card => (
        <div className="word-card" key={card.id}>
          <div className="word-pair">
            <span className="word-front">{card.front}</span>
            <span className="word-back">{card.back}</span>
            <span className="word-meta">
              {card.repetitions === 0
                ? 'Yeni'
                : `${card.repetitions}× tekrar · ${card.interval} gün aralık`}
            </span>
          </div>
          <div className="word-actions">
            <button className="icon-btn" onClick={() => setEditing(card)} title="Düzenle">
              ✏️
            </button>
            <button className="icon-btn del" onClick={() => handleDelete(card.id)} title="Sil">
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
