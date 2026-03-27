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
