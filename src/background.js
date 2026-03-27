import { applyActions } from "./background/actions.js"
import { getData } from "./background/data.js"
import { focusByDescriptor, focusById } from "./background/focus.js"
import { injectOverlay, openFallbackPage } from "./background/overlay.js"

async function handleCommit(msg, senderTab) {
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
			await chrome.storage.local.remove("fallbackId")
		}
	} catch {}
}

chrome.action.onClicked.addListener(async (tab) => {
	try {
		await injectOverlay(tab.id)
	} catch (error) {
		await openFallbackPage()
	}
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.type === "getData") {
		getData().then(sendResponse)
		return true
	}

	if (msg.type === "commit") {
		handleCommit(msg, sender && sender.tab)
	}
})
