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
		"color:#111111",
		"box-shadow:0 1px 0 rgba(255,255,255,0.22)",
	].join(";")
}
