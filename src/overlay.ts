import { registerColumnPanel } from "./components/column-panel.js"
import { registerLinkCard } from "./components/link-card.js"
import { createActions } from "./overlay/actions.js"
import {
	applyOverlayFrame,
	applyOverlayTheme,
	clearOverlayFrame,
	createOverlayDom,
} from "./overlay/dom.js"
import { createEventHandlers } from "./overlay/events.js"
import { createRenderer } from "./overlay/render.js"
import { createUndoStack } from "./overlay/state.js"
import { createOverlayStore } from "./overlay/store.js"
import { getLabelFontSize, getUiTheme, getWindowColor } from "./shared/window-colors.js"

declare global {
	interface Window {
		__vtmCloseOverlay?: () => void
		__vtmDiscardOverlay?: () => void
		__VTM_SESSION_ID?: string
	}
}

registerLinkCard()
registerColumnPanel()

if (!document.getElementById("vtm-backdrop")) {
	const sessionId =
		window.__VTM_SESSION_ID ||
		new URLSearchParams(window.location.search).get("sessionId") ||
		undefined
	if (!sessionId) {
		console.error("Missing VimTabs overlay session id")
	} else {
		const store = createOverlayStore()
		const { state } = store
		const undo = createUndoStack()
		const { backdrop, modal, columns, footer } = createOverlayDom()
		const renderer = createRenderer(state, columns, footer)
		const actions = createActions(state, undo, renderer.renderTabs)

		const applyUiSettings = () => {
			const uiTheme = getUiTheme(state.settings.theme)
			applyOverlayTheme(backdrop, modal, state.settings, uiTheme)
			if (state.view === "mark-create" && state.marks.minimalPrompt) {
				clearOverlayFrame(backdrop)
				return
			}
			const currentWindow = state.wins[state.sel.w]
			if (currentWindow) {
				const windowColor = getWindowColor(
					currentWindow,
					state.sel.w,
					state.settings.theme,
				)
				applyOverlayFrame(
					backdrop,
					windowColor.accent,
					windowColor.label,
					getLabelFontSize(state.settings.labelSize),
				)
			}
		}

		const events = createEventHandlers({
			backdrop,
			render: renderer.render,
			renderTabs: renderer.renderTabs,
			store,
			sessionId,
			state,
			actions,
			applyUiSettings,
		})
		let messageListener = null
		let closed = false
		let passiveDiscardStarted = false

		const cleanupOverlay = () => {
			if (closed) return
			closed = true
			events.detachListeners()
			if (messageListener) chrome.runtime.onMessage.removeListener(messageListener)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			delete window.__vtmCloseOverlay
			delete window.__vtmDiscardOverlay
			delete window.__VTM_SESSION_ID
		}

		window.__vtmCloseOverlay = () => {
			if (closed) return
			cleanupOverlay()
			chrome.runtime.sendMessage({
				type: "commit",
				sessionId,
				actions: state.queue,
			})
			backdrop.remove()
		}

		window.__vtmDiscardOverlay = () => {
			if (closed) return
			cleanupOverlay()
			backdrop.remove()
		}

		const requestPassiveDiscard = () => {
			if (closed || passiveDiscardStarted) return
			passiveDiscardStarted = true
			chrome.runtime.sendMessage({ type: "discardSession", sessionId })
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				requestPassiveDiscard()
			}
		}

		messageListener = (message, _sender, sendResponse) => {
			if (message.type === "closeOverlay") {
				window.__vtmCloseOverlay?.()
				sendResponse({ closed: true })
				return true
			}
			if (message.type === "discardOverlay") {
				window.__vtmDiscardOverlay?.()
				sendResponse({ closed: true })
				return true
			}
			return
		}
		chrome.runtime.onMessage.addListener(messageListener)
		document.addEventListener("visibilitychange", handleVisibilityChange)

		const observer = new MutationObserver(() => {
			if (!document.getElementById("vtm-backdrop")) {
				observer.disconnect()
				cleanupOverlay()
			}
		})
		observer.observe(document.documentElement, { childList: true, subtree: true })

		chrome.runtime.sendMessage({ type: "getBootstrap", sessionId }, (bootstrap) => {
			if (!bootstrap) return
			state.marks.items = bootstrap.marks || {}
			state.marks.mode = bootstrap.context?.initialMarksMode || "browse"
			state.marks.targetTab = bootstrap.context?.markTarget || null
			state.marks.draftKey = ""
			state.marks.minimalPrompt = !!bootstrap.context?.minimalPrompt

			state.settings.excludedDomains = bootstrap.settings.excludedDomains || []
			state.settings.density = bootstrap.settings.density
			state.settings.columnWidth = bootstrap.settings.columnWidth
			state.settings.maxTitleLength = bootstrap.settings.maxTitleLength
			state.settings.labelSize = bootstrap.settings.labelSize
			state.settings.theme = bootstrap.settings.theme
			state.settings.quickMarkSort = bootstrap.settings.quickMarkSort
			state.settings.markAlphaOrder = bootstrap.settings.markAlphaOrder
			state.settings.helpTextMode = bootstrap.settings.helpTextMode

			state.wins = bootstrap.data.wins
			state.sel = bootstrap.data.activeSel
			state.view = bootstrap.context?.initialView || "tabs"

			applyUiSettings()
			renderer.render()
			events.attachListeners()
		})
	}
}
