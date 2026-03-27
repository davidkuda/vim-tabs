import { getPreviewSession } from "./session.js"

export async function getData() {
	const session = await getPreviewSession()
	const fallbackData = await chrome.storage.local.get([
		"fallbackId",
		"fallbackOriginalTabId",
		"fallbackWindowId",
	])
	const helperTabIds = new Set(session.entries.map((entry) => entry.helperTabId))
	const originalActiveByWindow = new Map(
		session.entries.map((entry) => [entry.windowId, entry.originalTabId]),
	)

	if (fallbackData.fallbackId) helperTabIds.add(fallbackData.fallbackId)
	if (fallbackData.fallbackWindowId && fallbackData.fallbackOriginalTabId) {
		originalActiveByWindow.set(
			fallbackData.fallbackWindowId,
			fallbackData.fallbackOriginalTabId,
		)
	}

	const wins = await chrome.windows.getAll({ populate: true })
	let activeSel = { w: 0, t: 0 }

	wins.forEach((win, wi) => {
		win.tabs = win.tabs.filter((tab) => !helperTabIds.has(tab.id))

		win.tabs.forEach((tab, ti) => {
			const originalActiveTabId = originalActiveByWindow.get(win.id)
			const isSelected = originalActiveTabId
				? tab.id === originalActiveTabId
				: tab.active
			if (isSelected && win.focused) activeSel = { w: wi, t: ti }
		})
	})

	return { wins, activeSel }
}
