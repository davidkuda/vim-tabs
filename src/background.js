import { applyActions } from "./background/actions.js"
import { getData } from "./background/data.js"
import { focusByDescriptor, focusById } from "./background/focus.js"
import {
	clearPreviewArtifacts,
	clearWindowBorders,
	injectOverlay,
	openFallbackPage,
	showWindowPreviews,
} from "./background/overlay.js"
import { getPreviewSession } from "./background/session.js"
import { openSettingsPage, openStashPage, stashWindow } from "./background/stash.js"
import { getStashData } from "./shared/stash.js"

async function getFocusedTab() {
	const [tab] = await chrome.tabs.query({
		active: true,
		lastFocusedWindow: true,
	})
	return tab
}

async function launchOverlay(tab) {
	if (!tab?.id || !tab.windowId) return

	await clearOverlayArtifacts()

	const { wins } = await getData()
	let overlayHostTabId = tab.id

	try {
		await injectOverlay(tab.id)
	} catch (error) {
		const fallback = await openFallbackPage(tab)
		overlayHostTabId = fallback.id
	}

	await showWindowPreviews(wins, tab.windowId)

	try {
		await chrome.windows.update(tab.windowId, { focused: true })
		await chrome.tabs.update(overlayHostTabId, { active: true })
	} catch {}
}

async function handleCommit(msg, senderTab) {
	const session = await getPreviewSession()
	await clearWindowBorders(session.borderTabIds.map((id) => ({ id })))
	await clearPreviewArtifacts()
	await applyActions(msg.actions || [])

	if (msg.postFocus) {
		typeof msg.postFocus === "number"
			? await focusById(msg.postFocus)
			: await focusByDescriptor(msg.postFocus)
	}

	try {
		const { fallbackId } = await chrome.storage.local.get("fallbackId")
		if (fallbackId && senderTab && senderTab.id === fallbackId) {
			await chrome.tabs.remove(fallbackId)
			await chrome.storage.local.remove([
				"fallbackId",
				"fallbackOriginalTabId",
				"fallbackWindowId",
			])
		}
	} catch {}
}

async function clearOverlayArtifacts() {
	const session = await getPreviewSession()
	await clearWindowBorders(session.borderTabIds.map((id) => ({ id })))
	await clearPreviewArtifacts()
}

chrome.action.onClicked.addListener(async (tab) => {
	await launchOverlay(tab)
})

chrome.commands.onCommand.addListener(async (command) => {
	if (command === "open-manager") {
		await launchOverlay(await getFocusedTab())
		return
	}

	if (command === "stash-window") {
		await clearOverlayArtifacts()
		const tab = await getFocusedTab()
		if (!tab?.windowId) return
		await stashWindow(tab.windowId, tab)
	}
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.type === "getData") {
		getData().then(sendResponse)
		return true
	}

	if (msg.type === "getStashData") {
		getStashData().then(sendResponse)
		return true
	}

	if (msg.type === "commit") {
		handleCommit(msg, sender && sender.tab)
	}

	if (msg.type === "openStash") {
		clearOverlayArtifacts().then(() => openStashPage(sender?.tab?.windowId))
	}

	if (msg.type === "openSettings") {
		clearOverlayArtifacts().then(() => openSettingsPage(sender?.tab?.windowId))
	}

	if (msg.type === "openStashedTab") {
		chrome.tabs.create({
			windowId: sender?.tab?.windowId,
			url: msg.url,
			active: !msg.background,
		})
	}

	if (msg.type === "stashWindow") {
		clearOverlayArtifacts().then(() => stashWindow(msg.windowId, sender?.tab))
	}
})
