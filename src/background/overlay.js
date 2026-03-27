import { getWindowColor } from "../shared/window-colors.js"

const WINDOW_BORDER_ID = "vtm-window-border"

export async function injectOverlay(tabId) {
	await chrome.scripting.insertCSS({
		target: { tabId },
		files: ["overlay.css"],
	})
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ["overlay.js"],
	})
}

export async function openFallbackPage() {
	const fallback = await chrome.tabs.create({
		url: chrome.runtime.getURL("manager.html"),
		active: true,
	})

	try {
		await chrome.storage.local.set({ fallbackId: fallback.id })
	} catch {}

	return fallback
}

function mountWindowBorder(borderId, color, label) {
	const existing = document.getElementById(borderId)
	if (existing) existing.remove()

	const border = document.createElement("div")
	border.id = borderId
	border.style.cssText = [
		"position:fixed",
		"inset:0",
		"pointer-events:none",
		"z-index:2147482999",
		"box-sizing:border-box",
		`border:3px solid ${color}`,
		"border-radius:0",
		"background:transparent",
		"box-shadow:inset 0 0 0 1px rgba(255,255,255,0.18)",
	].join(";")

	const badge = document.createElement("div")
	badge.textContent = label
	badge.style.cssText = [
		"position:absolute",
		"top:14px",
		"left:14px",
		"padding:6px 10px",
		"font:600 11px/1.1 system-ui,sans-serif",
		"letter-spacing:0.08em",
		"text-transform:uppercase",
		`background:${color}`,
		"color:#111111",
		"box-shadow:0 1px 0 rgba(255,255,255,0.22)",
	].join(";")

	border.appendChild(badge)
	document.documentElement.appendChild(border)
}

function unmountWindowBorder(borderId) {
	document.getElementById(borderId)?.remove()
}

export async function showWindowBorders(wins) {
	await clearWindowBorders(wins)

	for (const [index, win] of wins.entries()) {
		const activeTab = win.tabs.find((tab) => tab.active)
		if (!activeTab?.id) continue

		try {
			const windowColor = getWindowColor(win, index)
			await chrome.scripting.executeScript({
				target: { tabId: activeTab.id },
				func: mountWindowBorder,
				args: [WINDOW_BORDER_ID, windowColor.accent, windowColor.label],
			})
		} catch {}
	}
}

export async function clearWindowBorders(wins) {
	for (const win of wins) {
		const activeTab = win.tabs.find((tab) => tab.active)
		if (!activeTab?.id) continue

		try {
			await chrome.scripting.executeScript({
				target: { tabId: activeTab.id },
				func: unmountWindowBorder,
				args: [WINDOW_BORDER_ID],
			})
		} catch {}
	}
}
