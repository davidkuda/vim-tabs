import { getPreviewSession } from "./session.js"
import { addStashSession, createSessionFromWindow } from "../shared/stash.js"

export async function openStashPage(windowId) {
	return chrome.tabs.create({
		windowId,
		url: chrome.runtime.getURL("stash.html"),
		active: true,
	})
}

export async function stashWindow(windowId, senderTab) {
	const previewSession = await getPreviewSession()
	const fallbackData = await chrome.storage.local.get([
		"fallbackId",
		"fallbackOriginalTabId",
		"fallbackWindowId",
	])
	const excludedTabIds = new Set([
		...previewSession.entries.map((entry) => entry.helperTabId),
		fallbackData.fallbackId,
	])
	const extensionBaseUrl = chrome.runtime.getURL("")
	const win = await chrome.windows.get(windowId, { populate: true })
	const stashableWindow = {
		...win,
		tabs: win.tabs.filter((tab) => {
			if (!tab.id || excludedTabIds.has(tab.id)) return false
			if ((tab.url || "").startsWith(extensionBaseUrl)) return false
			return true
		}),
	}

	if (!stashableWindow.tabs.length) {
		return openStashPage(senderTab?.windowId)
	}

	await addStashSession(createSessionFromWindow(stashableWindow))
	const stashPage = await openStashPage(senderTab?.windowId)

	const tabIds = stashableWindow.tabs.map((tab) => tab.id).filter(Boolean)
	if (tabIds.length) {
		await chrome.tabs.remove(tabIds)
	}

	return stashPage
}
