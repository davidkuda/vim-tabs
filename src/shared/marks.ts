import type { MarkRecord, MarksData, TabDescriptor } from "./types.js"

const MARKS_KEY = "marksData"

function isValidMark(key: string | undefined | null) {
	return /^[a-zA-Z]$/.test(key || "")
}

export async function getMarksData(): Promise<MarksData> {
	const data = await chrome.storage.local.get(MARKS_KEY)
	const marks = (data[MARKS_KEY]?.marks || {}) as Record<string, MarkRecord>
	const nextMarks: Record<string, MarkRecord> = {}

	for (const [key, mark] of Object.entries(marks)) {
		if (!isValidMark(key)) continue

		let resolved: MarkRecord = { ...mark, key }

		if (mark.tabId) {
			try {
				const tab = await chrome.tabs.get(mark.tabId)
				resolved = {
					...resolved,
					tabId: tab.id,
					windowId: tab.windowId,
					title: tab.title || mark.title || tab.url || "Untitled tab",
					url: tab.url || mark.url || "",
					favIconUrl: tab.favIconUrl || mark.favIconUrl || "",
					live: true,
				}
			} catch {
				resolved.live = false
			}
		}

		if (!resolved.live && !resolved.persistent) continue
		nextMarks[key] = resolved
	}

	if (JSON.stringify(nextMarks) !== JSON.stringify(marks)) {
		await saveMarksData({ marks: nextMarks })
	}

	return { marks: nextMarks }
}

export async function saveMarksData(data: MarksData) {
	await chrome.storage.local.set({ [MARKS_KEY]: data })
}

export async function setMark(key: string, tab: TabDescriptor | null | undefined) {
	if (!isValidMark(key) || !tab?.id) return null

	const markKey = key
	const data = await getMarksData()
	data.marks[markKey] = {
		key: markKey,
		tabId: tab.id,
		windowId: tab.windowId,
		title: tab.title || tab.url || "Untitled tab",
		url: tab.url || "",
		favIconUrl: tab.favIconUrl || "",
		persistent: markKey === markKey.toUpperCase(),
		usageCount: data.marks[markKey]?.usageCount || 0,
		lastUsedAt: data.marks[markKey]?.lastUsedAt || 0,
		updatedAt: Date.now(),
	}
	await saveMarksData(data)
	return data.marks[markKey]
}

export async function deleteMark(key: string) {
	if (!isValidMark(key)) return false

	const data = await getMarksData()
	if (!data.marks[key]) return false

	delete data.marks[key]
	await saveMarksData(data)
	return true
}

async function focusTab(tab: chrome.tabs.Tab | null | undefined) {
	if (!tab?.id) return false
	try {
		await chrome.windows.update(tab.windowId, { focused: true })
		await chrome.tabs.update(tab.id, { active: true })
		return true
	} catch {
		return false
	}
}

async function findExistingTabByUrl(url: string | undefined) {
	if (!url) return null
	const [tab] = await chrome.tabs.query({ url })
	return tab || null
}

function touchMark(mark: MarkRecord, tab: chrome.tabs.Tab | null | undefined): MarkRecord {
	return {
		...mark,
		tabId: tab?.id ?? mark.tabId,
		windowId: tab?.windowId ?? mark.windowId,
		title: tab?.title || mark.title,
		url: tab?.url || mark.url,
		favIconUrl: tab?.favIconUrl || mark.favIconUrl || "",
		live: !!tab || mark.live,
		usageCount: (mark.usageCount || 0) + 1,
		lastUsedAt: Date.now(),
	}
}

export async function openMark(key: string, preferredWindowId?: number) {
	if (!isValidMark(key)) return false

	const data = await getMarksData()
	const mark = data.marks[key]
	if (!mark) return false

	if (mark.tabId) {
		try {
			const tab = await chrome.tabs.get(mark.tabId)
			if (await focusTab(tab)) {
				data.marks[key] = touchMark(mark, tab)
				await saveMarksData(data)
				return true
			}
		} catch {}
	}

	const existing = await findExistingTabByUrl(mark.url)
	if (existing && (await focusTab(existing))) {
		data.marks[key] = touchMark(mark, existing)
		await saveMarksData(data)
		return true
	}

	if (!mark.url) return false

	const tab = await chrome.tabs.create({
		windowId: preferredWindowId,
		url: mark.url,
		active: true,
	})

	data.marks[key] = touchMark(mark, tab)
	await saveMarksData(data)
	return true
}
