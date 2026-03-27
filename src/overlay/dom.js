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
	footer.style.cssText = "padding:4px 6px;font-size:12px;opacity:0.7"

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
