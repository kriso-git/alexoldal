import { useState, useEffect } from 'react'
import { getLang, setLang, onLangChange, SUPPORTED_LANGS } from '../i18n.js'

export default function LanguagePicker() {
  const [lang, setLangState] = useState(getLang)

  useEffect(() => onLangChange(setLangState), [])

  return (
    <div className="lang-picker">
      {SUPPORTED_LANGS.map(l => (
        <button
          key={l.code}
          className={`lang-btn${lang === l.code ? ' active' : ''}`}
          onClick={() => setLang(l.code)}
        >{l.label}</button>
      ))}
    </div>
  )
}
