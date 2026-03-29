import type { SettingsData } from "../shared/types.js"

export function createOverlayDom() {
	const backdrop = document.createElement("div")
	backdrop.id = "vtm-backdrop"

	const modal = document.createElement("div")
	modal.id = "vtm-modal"
	modal.tabIndex = 0

	const chromeShell = document.createElement("div")
	chromeShell.id = "vtm-shell"

	const topbar = document.createElement("div")
	topbar.id = "vtm-topbar"
	topbar.innerHTML = `
		<div class="vtm-topbar-title">VimTabs <span>Keyboard Tab Manager</span></div>
	`

	const columns = document.createElement("div")
	columns.id = "vtm-columns"

	const footer = document.createElement("div")
	footer.id = "vtm-footer"

	const trap = document.createElement("input")
	trap.style.cssText = "position:absolute;opacity:0"
	trap.ariaHidden = "true"

	chromeShell.append(topbar, columns, footer)
	modal.append(chromeShell, trap)
	backdrop.appendChild(modal)
	document.documentElement.appendChild(backdrop)
	trap.focus({ preventScroll: true })

	return {
		backdrop,
		modal,
		columns,
		footer,
	}
}

export function applyOverlayFrame(
	backdrop: HTMLDivElement,
	color: string,
	label: string,
	labelFontSize = "3rem",
) {
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

	let badge = backdrop.querySelector<HTMLDivElement>("#vtm-window-badge")
	if (!badge) {
		badge = document.createElement("div")
		badge.id = "vtm-window-badge"
		backdrop.appendChild(badge)
	}

	badge.textContent = label
	badge.style.cssText = [
		"position:absolute",
		"top:20px",
		"left:20px",
		"pointer-events:none",
		"padding:14px 22px",
		`font:600 ${labelFontSize}/0.95 system-ui,sans-serif`,
		"letter-spacing:-0.04em",
		"text-transform:uppercase",
		`background:${color}`,
		"color:#f6f0ea",
		"box-shadow:0 1px 0 rgba(255,255,255,0.22)",
	].join(";")
}

export function clearOverlayFrame(backdrop: HTMLDivElement) {
	backdrop.style.boxSizing = ""
	backdrop.style.border = "none"
	backdrop.style.background = "transparent"
	backdrop.style.backdropFilter = "none"
	backdrop.style.boxShadow = "none"
	backdrop.querySelector("#vtm-window-badge")?.remove()
}

export function applyOverlayTheme(
	backdrop: HTMLDivElement,
	modal: HTMLDivElement,
	settings: Pick<SettingsData, "density" | "columnWidth" | "maxTitleLength">,
	uiTheme: {
		colorScheme: "dark" | "light"
		text: { primary: string; muted: string; subtle: string }
		backdrop: { base: string; washTop: string; washBottom: string }
		modal: { base: string; glow: string; ring: string }
	},
) {
	const density = settings.density || "comfortable"

	backdrop.style.colorScheme = uiTheme.colorScheme
	backdrop.style.setProperty("--vtm-text-primary", uiTheme.text.primary)
	backdrop.style.setProperty("--vtm-text-muted", uiTheme.text.muted)
	backdrop.style.setProperty("--vtm-text-subtle", uiTheme.text.subtle)
	backdrop.style.setProperty("--vtm-backdrop-base", uiTheme.backdrop.base)
	backdrop.style.setProperty("--vtm-backdrop-wash-top", uiTheme.backdrop.washTop)
	backdrop.style.setProperty("--vtm-backdrop-wash-bottom", uiTheme.backdrop.washBottom)
	backdrop.style.setProperty("--vtm-modal-base", uiTheme.modal.base)
	backdrop.style.setProperty("--vtm-modal-glow", uiTheme.modal.glow)
	backdrop.style.setProperty("--vtm-modal-ring", uiTheme.modal.ring)
	backdrop.style.setProperty(
		"--vtm-card-padding-y",
		density === "compact" ? "8px" : "10px",
	)
	backdrop.style.setProperty(
		"--vtm-card-padding-x",
		density === "compact" ? "10px" : "12px",
	)
	backdrop.style.setProperty(
		"--vtm-col-min-width",
		`${settings.columnWidth || "360"}px`,
	)
	backdrop.style.setProperty(
		"--vtm-title-max-ch",
		settings.maxTitleLength || "64",
	)
	backdrop.style.setProperty("--vtm-col-gap", density === "compact" ? "10px" : "14px")
	backdrop.style.setProperty(
		"--vtm-col-padding",
		density === "compact" ? "10px" : "12px",
	)

	modal.style.color = uiTheme.text.primary
}
