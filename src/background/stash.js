import { getPreviewSession } from "./session.js"
import { addStashSession, createSessionFromWindow } from "../shared/stash.js"
import { getSettings, isExcludedUrl } from "../shared/settings.js"

export async function openStashPage(windowId) {
	return chrome.tabs.create({
		windowId,
		url: chrome.runtime.getURL("stash.html"),
		active: true,
	})
}

export async function openSettingsPage(windowId) {
	return chrome.tabs.create({
		windowId,
		url: chrome.runtime.getURL("settings.html"),
		active: true,
	})
}

export async function stashWindow(windowId, senderTab) {
	const previewSession = await getPreviewSession()
	const settings = await getSettings()
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
			if (isExcludedUrl(tab.url, settings.excludedDomains)) return false
			return true
		}),
	}

	if (!stashableWindow.tabs.length) {
		return openStashPage(senderTab?.windowId || windowId)
	}

	await addStashSession(createSessionFromWindow(stashableWindow))
	const stashPage = await openStashPage(senderTab?.windowId || windowId)

	const tabIds = stashableWindow.tabs.map((tab) => tab.id).filter(Boolean)
	if (tabIds.length) {
		await chrome.tabs.remove(tabIds)
	}

	return stashPage
}
