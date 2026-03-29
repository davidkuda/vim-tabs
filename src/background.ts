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
import {
	clearOverlaySession,
	createOverlaySession,
	getOverlaySession,
} from "./background/session-manager.js"
import { openSettingsPage, openStashPage, stashWindow } from "./background/stash.js"
import { deleteMark, getMarksData, openMark, setMark } from "./shared/marks.js"
import { getSettings } from "./shared/settings.js"
import { getStashData } from "./shared/stash.js"

async function getFocusedTab() {
	const [tab] = await chrome.tabs.query({
		active: true,
		lastFocusedWindow: true,
	})
	return tab
}

async function closeInjectedOverlay(tabId: number | undefined) {
	if (!tabId) return false

	try {
		const response = await chrome.tabs.sendMessage(tabId, { type: "closeOverlay" })
		if (response?.closed) return true
	} catch {}

	try {
		const [result] = await chrome.scripting.executeScript({
			target: { tabId },
			func: () => {
				if (typeof window.__vtmCloseOverlay === "function") {
					window.__vtmCloseOverlay()
					return true
				}
				const backdrop = document.getElementById("vtm-backdrop")
				if (backdrop) {
					backdrop.remove()
					return true
				}
				return false
			},
		})
		return !!result?.result
	} catch {
		return false
	}
}

async function clearOverlayArtifacts(sessionId: string | undefined) {
	if (!sessionId) return
	const session = await getOverlaySession(sessionId)
	if (!session) return
	await clearWindowBorders(session.preview.borderTabIds.map((id) => ({ id })))
	await clearPreviewArtifacts(sessionId)
}

async function teardownOverlaySession(sessionId: string | undefined) {
	if (!sessionId) return
	await clearOverlayArtifacts(sessionId)
	await clearOverlaySession(sessionId)
}

async function launchOverlay(tab, options = {}) {
	if (!tab?.id || !tab.windowId) return

	const managerUrl = chrome.runtime.getURL("manager.html")
	if (tab.url?.startsWith(managerUrl)) {
		const existingSessionId = new URL(tab.url).searchParams.get("sessionId") || undefined
		await teardownOverlaySession(existingSessionId)
		try {
			await chrome.tabs.remove(tab.id)
		} catch {}
		return
	}

	if (await closeInjectedOverlay(tab.id)) {
		return
	}

	const session = await createOverlaySession({
		initialView: options.initialView || "tabs",
		initialMarksMode: options.initialMarksMode || "browse",
		markTarget: options.markTarget || null,
		minimalPrompt: !!options.minimalPrompt,
	})

	const { wins } = await getData(session.id)
	let overlayHostTabId = tab.id

	try {
		await injectOverlay(tab.id, session.id)
	} catch {
		const fallback = await openFallbackPage(tab, session.id)
		overlayHostTabId = fallback.id
	}

	if (!options.minimalPrompt) {
		await showWindowPreviews(session.id, wins, tab.windowId)
	}

	try {
		await chrome.windows.update(tab.windowId, { focused: true })
		await chrome.tabs.update(overlayHostTabId, { active: true })
	} catch {}
}

async function handleCommit(msg, senderTab) {
	const sessionId = msg.sessionId
	const session = await getOverlaySession(sessionId)
	if (!session) return

	await clearWindowBorders(session.preview.borderTabIds.map((id) => ({ id })))
	await clearPreviewArtifacts(sessionId)
	await applyActions(msg.actions || [])

	if (msg.postFocus) {
		typeof msg.postFocus === "number"
			? await focusById(msg.postFocus)
			: await focusByDescriptor(msg.postFocus)
	}

	if (session.fallback?.tabId && senderTab?.id === session.fallback.tabId) {
		try {
			await chrome.tabs.remove(session.fallback.tabId)
		} catch {}
	}

	await clearOverlaySession(sessionId)
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
		const tab = await getFocusedTab()
		if (!tab?.windowId) return
		await stashWindow(tab.windowId, tab)
		return
	}

	if (command === "open-marks") {
		await launchOverlay(await getFocusedTab(), {
			initialView: "marks",
			initialMarksMode: "quick",
		})
		return
	}

	if (command === "add-current-mark") {
		const tab = await getFocusedTab()
		if (!tab) return
		await launchOverlay(tab, {
			initialView: "mark-create",
			minimalPrompt: true,
			markTarget: {
				id: tab.id,
				windowId: tab.windowId,
				title: tab.title,
				url: tab.url,
				favIconUrl: tab.favIconUrl,
			},
		})
	}
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.type === "getBootstrap") {
		Promise.all([
			getData(msg.sessionId),
			getOverlaySession(msg.sessionId),
			getMarksData(),
			getSettings(),
		]).then(([data, session, marksData, settings]) => {
			sendResponse({
				sessionId: msg.sessionId,
				context: session?.context || {
					initialView: "tabs",
					initialMarksMode: "browse",
					markTarget: null,
					minimalPrompt: false,
				},
				data,
				marks: marksData.marks || {},
				settings,
			})
		})
		return true
	}

	if (msg.type === "getStashData") {
		getStashData().then(sendResponse)
		return true
	}

	if (msg.type === "getMarksData") {
		getMarksData().then(sendResponse)
		return true
	}

	if (msg.type === "commit") {
		handleCommit(msg, sender?.tab)
	}

	if (msg.type === "openStash") {
		teardownOverlaySession(msg.sessionId).then(() => openStashPage(sender?.tab?.windowId))
	}

	if (msg.type === "openSettings") {
		teardownOverlaySession(msg.sessionId).then(() =>
			openSettingsPage(sender?.tab?.windowId),
		)
	}

	if (msg.type === "openStashedTab") {
		chrome.tabs.create({
			windowId: sender?.tab?.windowId,
			url: msg.url,
			active: !msg.background,
		})
	}

	if (msg.type === "stashWindow") {
		clearOverlayArtifacts(msg.sessionId).then(() =>
			stashWindow(msg.windowId, sender?.tab, msg.sessionId).then(() =>
				clearOverlaySession(msg.sessionId),
			),
		)
	}

	if (msg.type === "setMark") {
		setMark(msg.key, msg.tab).then(sendResponse)
		return true
	}

	if (msg.type === "deleteMark") {
		deleteMark(msg.key).then(sendResponse)
		return true
	}

	if (msg.type === "openMark") {
		teardownOverlaySession(msg.sessionId).then(() =>
			openMark(msg.key, sender?.tab?.windowId).then(async (opened) => {
				if (opened && msg.closeTabId) {
					try {
						await chrome.tabs.remove(msg.closeTabId)
					} catch {}
				}
				sendResponse({ opened })
			}),
		)
		return true
	}
})
