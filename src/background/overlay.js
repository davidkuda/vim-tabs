import {
	getLabelFontSize,
	getUiTheme,
	getWindowColor,
} from "../shared/window-colors.js"
import { getSettings } from "../shared/settings.js"
import { clearPreviewSession, getPreviewSession, setPreviewSession } from "./session.js"

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

export async function openFallbackPage(tab) {
	const fallback = await chrome.tabs.create({
		windowId: tab.windowId,
		url: chrome.runtime.getURL("manager.html"),
		active: true,
	})

	await chrome.storage.local.set({
		fallbackId: fallback.id,
		fallbackOriginalTabId: tab.id,
		fallbackWindowId: tab.windowId,
	})

	return fallback
}

function mountWindowBorder(borderId, color, label, labelFontSize, frameVeil) {
	const existing = document.getElementById(borderId)
	if (existing) existing.remove()

	const border = document.createElement("div")
	border.id = borderId
	border.style.cssText = [
		"position:fixed",
		"inset:0",
		"pointer-events:none",
		"z-index:2147482999",
		"overflow:hidden",
		"box-sizing:border-box",
		`border:3px solid ${color}`,
		`background:${frameVeil}`,
		"backdrop-filter:blur(4px) saturate(1.05)",
		"box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14)",
	].join(";")

	const wash = document.createElement("div")
	wash.style.cssText = [
		"position:absolute",
		"inset:0",
		`background:
			radial-gradient(circle at top left, ${color}96, transparent 34%),
			radial-gradient(circle at bottom right, ${color}68, transparent 42%),
			linear-gradient(135deg, ${color}34, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.05))`,
	].join(";")

	const veil = document.createElement("div")
	veil.style.cssText = [
		"position:absolute",
		"inset:0",
		"background:linear-gradient(135deg, rgba(14,14,16,0.03), rgba(14,14,16,0.12))",
	].join(";")

	const badge = document.createElement("div")
	badge.textContent = label
	badge.style.cssText = [
		"position:absolute",
		"top:20px",
		"left:20px",
		"padding:14px 22px",
		`font:600 ${labelFontSize}/0.95 system-ui,sans-serif`,
		"letter-spacing:-0.04em",
		"text-transform:uppercase",
		`background:${color}`,
		"color:#f6f0ea",
		"box-shadow:0 1px 0 rgba(255,255,255,0.22)",
	].join(";")

	border.append(wash, veil, badge)
	document.documentElement.appendChild(border)
}

function unmountWindowBorder(borderId) {
	document.getElementById(borderId)?.remove()
}

export async function clearWindowBorders(tabs) {
	for (const tab of tabs) {
		if (!tab?.id) continue

		try {
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: unmountWindowBorder,
				args: [WINDOW_BORDER_ID],
			})
		} catch {}
	}
}

async function openPreviewPage(win, index, settings) {
	const activeTab = win.tabs.find((tab) => tab.active)
	if (!activeTab?.id) return null

	const windowColor = getWindowColor(win, index, settings.theme)
	const params = new URLSearchParams({
		color: windowColor.accent,
		label: windowColor.label,
		theme: settings.theme,
		labelSize: settings.labelSize,
	})

	const helperTab = await chrome.tabs.create({
		windowId: win.id,
		url: `${chrome.runtime.getURL("preview.html")}?${params.toString()}`,
		active: true,
	})

	return {
		windowId: win.id,
		originalTabId: activeTab.id,
		helperTabId: helperTab.id,
	}
}

export async function showWindowPreviews(wins, currentWindowId) {
	await clearPreviewArtifacts()
	const settings = await getSettings()
	const uiTheme = getUiTheme(settings.theme)
	const labelFontSize = getLabelFontSize(settings.labelSize)

	const entries = []
	const borderTabIds = []

	for (const [index, win] of wins.entries()) {
		if (win.id === currentWindowId) continue

		const activeTab = win.tabs.find((tab) => tab.active)
		if (!activeTab?.id) continue

		try {
			const windowColor = getWindowColor(win, index, settings.theme)
			await chrome.scripting.executeScript({
				target: { tabId: activeTab.id },
				func: mountWindowBorder,
				args: [
					WINDOW_BORDER_ID,
					windowColor.accent,
					windowColor.label,
					labelFontSize,
					uiTheme.backdrop.frameVeil,
				],
			})
			borderTabIds.push(activeTab.id)
		} catch {
			const entry = await openPreviewPage(win, index, settings)
			if (entry) entries.push(entry)
		}
	}

	await setPreviewSession({ entries, borderTabIds })
}

export async function clearPreviewArtifacts() {
	const session = await getPreviewSession()

	await clearWindowBorders(session.borderTabIds.map((id) => ({ id })))

	for (const entry of session.entries) {
		try {
			await chrome.tabs.remove(entry.helperTabId)
		} catch {}

		try {
			await chrome.tabs.update(entry.originalTabId, { active: true })
		} catch {}
	}

	await clearPreviewSession()
}
