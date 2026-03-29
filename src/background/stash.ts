import { getOverlaySession } from "./session-manager.js"
import { addStashSession, createSessionFromWindow } from "../shared/stash.js"
import { getSettings, isExcludedUrl } from "../shared/settings.js"

export async function openStashPage(windowId?: number) {
	return chrome.tabs.create({
		windowId,
		url: chrome.runtime.getURL("stash.html"),
		active: true,
	})
}

export async function openSettingsPage(windowId?: number) {
	return chrome.tabs.create({
		windowId,
		url: chrome.runtime.getURL("settings.html"),
		active: true,
	})
}

export async function stashWindow(
	windowId: number,
	senderTab?: chrome.tabs.Tab,
	sessionId?: string,
) {
	const overlaySession = await getOverlaySession(sessionId)
	const previewSession = overlaySession?.preview || { entries: [], borderTabIds: [] }
	const settings = await getSettings()
	const excludedTabIds = new Set([
		...previewSession.entries.map((entry) => entry.helperTabId),
		overlaySession?.fallback?.tabId,
	])
	const extensionBaseUrl = chrome.runtime.getURL("")
	const win = await chrome.windows.get(windowId, { populate: true })
	const stashableWindow = {
		...win,
		tabs: (win.tabs || []).filter((tab) => {
			if (!tab.id || excludedTabIds.has(tab.id)) return false
			if ((tab.url || "").startsWith(extensionBaseUrl)) return false
			if (isExcludedUrl(tab.url, settings.excludedDomains)) return false
			return true
		}),
	}

	if (!stashableWindow.tabs.length) {
		return openStashPage(senderTab?.windowId || windowId)
	}

	await addStashSession(createSessionFromWindow(stashableWindow as never))
	const stashPage = await openStashPage(senderTab?.windowId || windowId)

	const tabIds = stashableWindow.tabs.map((tab) => tab.id).filter(Boolean)
	if (tabIds.length) {
		await chrome.tabs.remove(tabIds as number[])
	}

	return stashPage
}
