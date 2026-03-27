export function createOverlayDom() {
	const backdrop = document.createElement("div")
	backdrop.id = "vtm-backdrop"

	const modal = document.createElement("div")
	modal.id = "vtm-modal"
	modal.tabIndex = 0

	const columns = document.createElement("div")
	columns.id = "vtm-columns"

	const footer = document.createElement("div")
	footer.id = "vtm-footer"

	const trap = document.createElement("input")
	trap.style.cssText = "position:absolute;opacity:0"
	trap.ariaHidden = "true"

	modal.append(columns, footer, trap)
	backdrop.appendChild(modal)
	document.documentElement.appendChild(backdrop)
	trap.focus({ preventScroll: true })

	return {
		backdrop,
		columns,
		footer,
	}
}

export function applyOverlayFrame(backdrop, color, label) {
	backdrop.style.boxSizing = "border-box"
	backdrop.style.border = `3px solid ${color}`
	backdrop.style.background = [
		`radial-gradient(circle at top left, ${color}96, transparent 34%)`,
		`radial-gradient(circle at bottom right, ${color}68, transparent 42%)`,
		`linear-gradient(135deg, ${color}34, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.05))`,
		"rgba(10,10,12,0.14)",
	].join(", ")
	backdrop.style.backdropFilter = "blur(22px) saturate(1.05)"
	backdrop.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.14)"

	let badge = backdrop.querySelector("#vtm-window-badge")
	if (!badge) {
		badge = document.createElement("div")
		badge.id = "vtm-window-badge"
		backdrop.appendChild(badge)
	}

	badge.textContent = label
	badge.style.cssText = [
		"position:absolute",
		"top:14px",
		"left:14px",
		"pointer-events:none",
		"padding:6px 10px",
		"font:600 11px/1.1 system-ui,sans-serif",
		"letter-spacing:0.08em",
		"text-transform:uppercase",
		`background:${color}`,
		"color:#f6f0ea",
		"box-shadow:0 1px 0 rgba(255,255,255,0.22)",
	].join(";")
}
