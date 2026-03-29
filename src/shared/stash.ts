import type {
	StashData,
	StashSession,
	StashedTab,
	WindowDescriptor,
} from "./types.js"

const STASH_KEY = "stashData"
const MAX_STASHED_TABS = 10000

function createId(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createStashedTab(
	win: WindowDescriptor,
	tab: WindowDescriptor["tabs"][number],
	windowIndex: number,
	tabIndex: number,
): StashedTab {
	return {
		id: `${win.id}-${tab.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		title: tab.title || tab.url || "Untitled tab",
		url: tab.url || "",
		favIconUrl: tab.favIconUrl || "",
		windowIndex,
		tabIndex,
	}
}

export async function getStashData(): Promise<StashData> {
	const data = await chrome.storage.local.get(STASH_KEY)
	return data[STASH_KEY] || { sessions: [] }
}

export async function saveStashData(stashData: StashData) {
	await chrome.storage.local.set({ [STASH_KEY]: stashData })
}

export async function addStashSession(session: StashSession) {
	const stashData = await getStashData()
	stashData.sessions.unshift(session)
	trimStashData(stashData)
	await saveStashData(stashData)
	return session
}

function trimStashData(stashData: StashData) {
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

export function createSessionFromWindows(wins: WindowDescriptor[]): StashSession {
	const tabs: StashedTab[] = []

	wins.forEach((win, wi) => {
		win.tabs.forEach((tab, ti) => {
			tabs.push(createStashedTab(win, tab, wi, ti))
		})
	})

	return {
		id: createId("stash"),
		createdAt: Date.now(),
		tabs,
	}
}

export function createSessionFromWindow(win: WindowDescriptor): StashSession {
	return {
		id: createId("stash"),
		createdAt: Date.now(),
		tabs: win.tabs.map((tab, ti) => createStashedTab(win, tab, 0, ti)),
	}
}
