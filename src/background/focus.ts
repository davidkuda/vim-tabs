import type { FocusDescriptor } from "../shared/types.js"

async function settleWindowFocus(windowId: number) {
	await chrome.windows.update(windowId, { focused: true })
	await new Promise((resolve) => setTimeout(resolve, 30))
	await chrome.windows.update(windowId, { focused: true })
}

export async function focusById(id: number) {
	try {
		const tab = await chrome.tabs.get(id)
		await chrome.tabs.update(tab.id, { active: true })
		await settleWindowFocus(tab.windowId)
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
			await chrome.tabs.update(tab.id, { active: true })
			await settleWindowFocus(tab.windowId)
		}
	} catch (error) {
		console.error("focusByDesc", error)
	}
}
