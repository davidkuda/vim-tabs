import type { FocusDescriptor } from "../shared/types.js"

export async function focusById(id: number) {
	try {
		const tab = await chrome.tabs.get(id)
		await chrome.windows.update(tab.windowId, { focused: true })
		await chrome.tabs.update(tab.id, { active: true })
	} catch (error) {
		console.error("focusById", error)
	}
}

export async function focusByDescriptor(desc: FocusDescriptor) {
	try {
		const { windowId, index, url } = desc
		const tabs = await chrome.tabs.query({ windowId, url })
		const tab = tabs.find((candidate) => candidate.index === index) || tabs[0]

		if (tab) {
			await chrome.windows.update(tab.windowId, { focused: true })
			await chrome.tabs.update(tab.id, { active: true })
		}
	} catch (error) {
		console.error("focusByDesc", error)
	}
}
