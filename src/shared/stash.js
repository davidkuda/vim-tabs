const STASH_KEY = "stashData"
const MAX_STASHED_TABS = 10000

export async function getStashData() {
	const data = await chrome.storage.local.get(STASH_KEY)
	return data[STASH_KEY] || { sessions: [] }
}

export async function saveStashData(stashData) {
	await chrome.storage.local.set({ [STASH_KEY]: stashData })
}

export async function addStashSession(session) {
	const stashData = await getStashData()
	stashData.sessions.unshift(session)
	trimStashData(stashData)
	await saveStashData(stashData)
	return session
}

function trimStashData(stashData) {
	let totalTabs = stashData.sessions.reduce(
		(sum, session) => sum + session.tabs.length,
		0,
	)

	while (totalTabs > MAX_STASHED_TABS && stashData.sessions.length) {
		const oldestSession = stashData.sessions[stashData.sessions.length - 1]
		oldestSession.tabs.pop()
		totalTabs--

		if (!oldestSession.tabs.length) {
			stashData.sessions.pop()
		}
	}
}

export function createSessionFromWindows(wins) {
	const tabs = []

	wins.forEach((win, wi) => {
		win.tabs.forEach((tab, ti) => {
			tabs.push({
				id: `${win.id}-${tab.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				title: tab.title || tab.url || "Untitled tab",
				url: tab.url || "",
				favIconUrl: tab.favIconUrl || "",
				windowIndex: wi,
				tabIndex: ti,
			})
		})
	})

	return {
		id: `stash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		createdAt: Date.now(),
		tabs,
	}
}

export function createSessionFromWindow(win) {
	return {
		id: `stash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		createdAt: Date.now(),
		tabs: win.tabs.map((tab, ti) => ({
			id: `${win.id}-${tab.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			title: tab.title || tab.url || "Untitled tab",
			url: tab.url || "",
			favIconUrl: tab.favIconUrl || "",
			windowIndex: 0,
			tabIndex: ti,
		})),
	}
}
