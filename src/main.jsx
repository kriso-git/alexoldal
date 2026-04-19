import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { installCursor, installParticles, playBoot } from './effects.js'

installCursor()
installParticles()

const TWEAK_DEFAULTS = { accent: "acid", font: "mono", bg: "grain", cursor: "trail", layout: "feed", crtBoot: true }

function boot() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

const tweaksRaw = localStorage.getItem("f3xykee_tweaks_v1")
const initial = tweaksRaw ? { ...TWEAK_DEFAULTS, ...JSON.parse(tweaksRaw) } : TWEAK_DEFAULTS
const alreadyBooted = sessionStorage.getItem("f3xykee_booted")

if (initial.crtBoot !== false && !alreadyBooted) {
  playBoot(() => {
    sessionStorage.setItem("f3xykee_booted", "1")
    boot()
  })
} else {
  boot()
}
