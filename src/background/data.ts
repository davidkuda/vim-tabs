import type { GetDataResponse } from "../shared/types.js"
import { createEmptyPreviewState, getOverlaySession } from "./session-manager.js"

export async function getData(sessionId?: string): Promise<GetDataResponse> {
	const session = (await getOverlaySession(sessionId)) || {
		preview: createEmptyPreviewState(),
		fallback: null,
	}
	const helperTabIds = new Set(
		session.preview.entries.map((entry) => entry.helperTabId),
	)
	const originalActiveByWindow = new Map(
		session.preview.entries.map((entry) => [entry.windowId, entry.originalTabId]),
	)

	if (session.fallback?.tabId) helperTabIds.add(session.fallback.tabId)
	if (session.fallback?.windowId && session.fallback?.originalTabId) {
		originalActiveByWindow.set(
			session.fallback.windowId,
			session.fallback.originalTabId,
		)
	}

	const wins = await chrome.windows.getAll({ populate: true })
	let activeSel = { w: 0, t: 0 }

	wins.forEach((win, wi) => {
		win.tabs = (win.tabs || []).filter((tab) => !helperTabIds.has(tab.id))

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
