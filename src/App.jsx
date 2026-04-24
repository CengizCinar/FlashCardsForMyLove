import { useState, useEffect } from 'react'
import StudyView    from './components/StudyView.jsx'
import AddWordView  from './components/AddWordView.jsx'
import WordListView from './components/WordListView.jsx'
import SettingsView from './components/SettingsView.jsx'
import { getDueCount, getSettings } from './modules/db.js'

function IconStudy({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3"/>
      {active
        ? <path d="M8 12h8M12 8v8" strokeWidth="2.5"/>
        : <path d="M8 12h8M12 8v8"/>}
    </svg>
  )
}
function IconList({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}
function IconAdd({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  )
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}

export default function App() {
  const [tab, setTab]         = useState('study')
  const [dueCount, setDueCount] = useState(0)
  const [dailyGoal, setDailyGoal] = useState(20)

  useEffect(() => {
    const refresh = async () => {
      setDueCount(await getDueCount())
      const s = await getSettings()
      setDailyGoal(s.dailyGoal || 20)
    }
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [])

  const tabs = [
    { id: 'study',    label: 'Çalış',    Icon: IconStudy },
    { id: 'list',     label: 'Kelimeler',Icon: IconList },
    { id: 'add',      label: 'Ekle',     Icon: IconAdd },
    { id: 'settings', label: 'Ayarlar',  Icon: IconSettings }
  ]

  return (
    <div className="app">
      {tab === 'study'    && <StudyView    dailyGoal={dailyGoal} />}
      {tab === 'list'     && <WordListView />}
      {tab === 'add'      && <AddWordView  onSave={() => setTab('list')} />}
      {tab === 'settings' && <SettingsView />}

      <nav className="bottom-nav">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon active={tab === id} />
            <span>
              {label}
              {id === 'study' && dueCount > 0 ? ` (${dueCount})` : ''}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
