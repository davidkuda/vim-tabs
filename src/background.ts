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
	listOverlaySessions,
	updateOverlayFallback,
	updateOverlayHostTab,
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

function isProtectedOverlayUrl(url: string | undefined) {
	if (!url) return true
	return /^(about:|brave:\/\/|chrome:\/\/|chrome-search:\/\/|edge:\/\/|vivaldi:\/\/|opera:\/\/)/.test(
		url,
	)
}

async function closeInjectedOverlay(tabId: number | undefined) {
	return closeOverlayUi(tabId, false)
}

async function closeOverlayUi(
	tabId: number | undefined,
	discard = false,
) {
	if (!tabId) return false

	try {
		const response = await chrome.tabs.sendMessage(tabId, {
			type: discard ? "discardOverlay" : "closeOverlay",
		})
		if (response?.closed) return true
	} catch {}

	try {
		const [result] = await chrome.scripting.executeScript({
			target: { tabId },
			func: (shouldDiscard) => {
				const closeFn = shouldDiscard
					? (window as Window & { __vtmDiscardOverlay?: () => void })
							.__vtmDiscardOverlay
					: (window as Window & { __vtmCloseOverlay?: () => void }).__vtmCloseOverlay
				if (typeof closeFn === "function") {
					closeFn()
					return true
				}
				const backdrop = document.getElementById("vtm-backdrop")
				if (backdrop) {
					backdrop.remove()
					return true
				}
				return false
			},
			args: [discard],
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

async function dismissOverlaySession(sessionId: string | undefined) {
	if (!sessionId) return
	const session = await getOverlaySession(sessionId)
	if (!session) return

	await closeOverlayUi(session.hostTabId || session.ownerTabId, true)

	if (session.fallback?.tabId) {
		try {
			await chrome.tabs.remove(session.fallback.tabId)
		} catch {}
	}

	try {
		await focusById(session.ownerTabId)
	} catch {}

	await teardownOverlaySession(sessionId)
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

	const settings = await getSettings()
	const overlayEnabled = settings.overlayMode
	const needsFallbackPage = !overlayEnabled || isProtectedOverlayUrl(tab.url)

	if (await closeInjectedOverlay(tab.id)) {
		return
	}

	const session = await createOverlaySession({
		initialView: options.initialView || "tabs",
		initialMarksMode: options.initialMarksMode || "browse",
		markTarget: options.markTarget || null,
		minimalPrompt: !!options.minimalPrompt,
	}, tab.id, tab.windowId)

	let overlayHostTabId = tab.id

	if (!needsFallbackPage) {
		try {
			await injectOverlay(tab.id, session.id)
			await updateOverlayHostTab(session.id, tab.id)
		} catch {
			await teardownOverlaySession(session.id)
			throw new Error(`Failed to inject VimTabs overlay into ${tab.url || "tab"}`)
		}

		if (!options.minimalPrompt) {
			const { wins } = await getData(session.id)
			await showWindowPreviews(session.id, wins as never, tab.windowId)
		}
	} else {
		const params = new URLSearchParams({ sessionId: session.id })
		const overlayTab = await chrome.tabs.create({
			windowId: tab.windowId,
			url: `${chrome.runtime.getURL("manager.html")}?${params.toString()}`,
			active: true,
		})
		overlayHostTabId = overlayTab.id
		await updateOverlayHostTab(session.id, overlayTab.id)
		await updateOverlayFallback(session.id, {
			tabId: overlayTab.id,
			originalTabId: tab.id,
			windowId: tab.windowId,
		})
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

	await clearOverlayArtifacts(sessionId)
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
		try {
			await focusById(session.ownerTabId)
		} catch {}
	}

	await clearOverlaySession(sessionId)
}

function isExtensionSender(sender) {
	return sender?.id === chrome.runtime.id
}

function isAllowedSessionSender(session, sender) {
	if (!session || !isExtensionSender(sender)) return false
	const senderTabId = sender?.tab?.id
	if (!senderTabId) return false
	return senderTabId === session.ownerTabId || senderTabId === session.fallback?.tabId
		|| senderTabId === session.hostTabId
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

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
	const sessions = await listOverlaySessions()
	await Promise.all(
		sessions
			.filter((session) => {
				if (session.ownerWindowId !== windowId) return false
				if (!session.hostTabId && !session.fallback?.tabId) return false
				const hostTabId = session.hostTabId || session.ownerTabId
				const previewHelperIds = session.preview.entries.map((entry) => entry.helperTabId)
				return (
					tabId !== hostTabId &&
					tabId !== session.fallback?.tabId &&
					!previewHelperIds.includes(tabId)
				)
			})
			.map((session) => dismissOverlaySession(session.id)),
	)
})

chrome.windows.onFocusChanged.addListener(async (windowId) => {
	if (windowId === chrome.windows.WINDOW_ID_NONE) return
	const sessions = await listOverlaySessions()
	await Promise.all(
		sessions
			.filter((session) => {
				if (!session.hostTabId && !session.fallback?.tabId) return false
				return session.ownerWindowId !== windowId
			})
			.map((session) => dismissOverlaySession(session.id)),
	)
})

chrome.tabs.onRemoved.addListener(async (tabId) => {
	const sessions = await listOverlaySessions()
	await Promise.all(
		sessions
			.filter((session) => {
				const hostTabId = session.hostTabId || session.ownerTabId
				return (
					tabId === session.ownerTabId ||
					tabId === hostTabId ||
					tabId === session.fallback?.tabId
				)
			})
			.map((session) => teardownOverlaySession(session.id)),
	)
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (!isExtensionSender(sender)) {
		return false
	}

	if (msg.type === "getBootstrap") {
		Promise.all([getOverlaySession(msg.sessionId), getMarksData(), getSettings()]).then(
			async ([session, marksData, settings]) => {
				if (!isAllowedSessionSender(session, sender)) {
					sendResponse(null)
					return
				}
				const data = await getData(msg.sessionId)
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
			},
		)
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
		getOverlaySession(msg.sessionId).then((session) => {
			if (!isAllowedSessionSender(session, sender)) return
			handleCommit(msg, sender?.tab)
		})
	}

	if (msg.type === "discardSession") {
		getOverlaySession(msg.sessionId).then((session) => {
			if (!isAllowedSessionSender(session, sender)) return
			dismissOverlaySession(msg.sessionId)
		})
	}

	if (msg.type === "openStash") {
		getOverlaySession(msg.sessionId).then((session) => {
			if (msg.sessionId && !isAllowedSessionSender(session, sender)) return
			teardownOverlaySession(msg.sessionId).then(() =>
				openStashPage(sender?.tab?.windowId),
			)
		})
	}

	if (msg.type === "openSettings") {
		getOverlaySession(msg.sessionId).then((session) => {
			if (msg.sessionId && !isAllowedSessionSender(session, sender)) return
			teardownOverlaySession(msg.sessionId).then(() =>
				openSettingsPage(sender?.tab?.windowId),
			)
		})
	}

	if (msg.type === "openStashedTab") {
		chrome.tabs.create({
			windowId: sender?.tab?.windowId,
			url: msg.url,
			active: !msg.background,
		})
	}

	if (msg.type === "stashWindow") {
		getOverlaySession(msg.sessionId).then((session) => {
			if (msg.sessionId && !isAllowedSessionSender(session, sender)) return
			stashWindow(msg.windowId, sender?.tab, msg.sessionId).then(() =>
				clearOverlaySession(msg.sessionId),
			)
		})
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
		getOverlaySession(msg.sessionId).then((session) => {
			if (msg.sessionId && !isAllowedSessionSender(session, sender)) {
				sendResponse({ opened: false })
				return
			}
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
		})
		return true
	}
})
