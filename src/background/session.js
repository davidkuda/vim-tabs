const PREVIEW_SESSION_KEY = "previewSession"

export async function getPreviewSession() {
	const data = await chrome.storage.local.get(PREVIEW_SESSION_KEY)
	return data[PREVIEW_SESSION_KEY] || { entries: [], borderTabIds: [] }
}

export async function setPreviewSession(session) {
	await chrome.storage.local.set({ [PREVIEW_SESSION_KEY]: session })
}

export async function clearPreviewSession() {
	await chrome.storage.local.remove(PREVIEW_SESSION_KEY)
}
