export const ACCENTS = [
  { key: "acid",    label: "Acid",    hex: "#9dff00", rgb: "157, 255, 0" },
  { key: "magenta", label: "Magenta", hex: "#ff00aa", rgb: "255, 0, 170" },
  { key: "cyan",    label: "Cyan",    hex: "#00e5ff", rgb: "0, 229, 255" },
  { key: "orange",  label: "Orange",  hex: "#ff7a00", rgb: "255, 122, 0" },
  { key: "red",     label: "Red",     hex: "#ff2e5a", rgb: "255, 46, 90" },
  { key: "amber",   label: "Amber",   hex: "#ffb300", rgb: "255, 179, 0" },
]

export default function TweaksPanel({ open, onClose, tweaks, setTweaks }) {
  if (!open) return null
  const setKey = (k, v) => {
    setTweaks(prev => ({ ...prev, [k]: v }))
    try {
      window.parent?.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*")
    } catch (e) {}
  }
  return (
    <div className="tweaks-panel open">
      <div className="tweaks-head">
        <div className="tweaks-title">TWEAKS</div>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>

      <div className="tweak-group">
        <div className="tweak-label">Accent color</div>
        <div className="tweak-swatches">
          {ACCENTS.map(a => (
            <button
              key={a.key}
              className={"tweak-swatch" + (tweaks.accent === a.key ? " active" : "")}
              style={{ background: a.hex, boxShadow: `0 0 12px ${a.hex}55` }}
              onClick={() => setKey("accent", a.key)}
              title={a.label}
            />
          ))}
        </div>
      </div>

      <div className="tweak-group">
        <div className="tweak-label">Font</div>
        <div className="tweak-options">
          {["mono", "sans", "serif"].map(f => (
            <button key={f} className={"tweak-opt" + (tweaks.font === f ? " active" : "")} onClick={() => setKey("font", f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="tweak-group">
        <div className="tweak-label">Background FX</div>
        <div className="tweak-options">
          {["scanlines", "grain", "particles", "none"].map(f => (
            <button key={f} className={"tweak-opt" + (tweaks.bg === f ? " active" : "")} onClick={() => setKey("bg", f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="tweak-group">
        <div className="tweak-label">Cursor</div>
        <div className="tweak-options">
          {[["default","default"],["custom","custom"],["trail","trail"]].map(([k, v]) => (
            <button key={k} className={"tweak-opt" + (tweaks.cursor === v ? " active" : "")} onClick={() => setKey("cursor", v)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="tweak-group">
        <div className="tweak-label">Layout</div>
        <div className="tweak-options">
          {[["feed","feed"],["grid","grid"],["timeline","timeline"]].map(([k, v]) => (
            <button key={k} className={"tweak-opt" + (tweaks.layout === v ? " active" : "")} onClick={() => setKey("layout", v)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="tweak-group">
        <div className="tweak-label">CRT boot intro</div>
        <div className="tweak-options">
          {[["on", true],["off", false]].map(([k, v]) => (
            <button key={k} className={"tweak-opt" + (tweaks.crtBoot === v ? " active" : "")} onClick={() => setKey("crtBoot", v)}>{k}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
