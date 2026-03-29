import type { QueuedAction } from "../shared/types.js"

export async function applyActions(list: QueuedAction[]) {
	for (const action of list) {
		try {
			switch (action.type) {
				case "bookmark": {
					const tab = await chrome.tabs.get(action.tabId)
					await chrome.bookmarks.create({ title: tab.title, url: tab.url })
					break
				}
				case "create":
					await chrome.tabs.create({
						url: action.url,
						windowId: action.windowId,
						index: action.index,
						active: false,
					})
					break
				case "remove":
					await chrome.tabs.remove(action.tabId)
					break
				case "move":
					await chrome.tabs.move(action.tabId, {
						windowId: action.windowId,
						index: action.index,
					})
					break
			}
		} catch (error) {
			console.error("apply", action, error)
		}
	}
}
