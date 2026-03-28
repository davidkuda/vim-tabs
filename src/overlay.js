import { createActions } from "./overlay/actions.js"
import {
	applyOverlayFrame,
	applyOverlayTheme,
	clearOverlayFrame,
	createOverlayDom,
} from "./overlay/dom.js"
import { createEventHandlers } from "./overlay/events.js"
import { createRenderer } from "./overlay/render.js"
import { createState, createUndoStack } from "./overlay/state.js"
import { getSettings } from "./shared/settings.js"
import { getLabelFontSize, getUiTheme, getWindowColor } from "./shared/window-colors.js"

if (!document.getElementById("vtm-backdrop")) {
	const state = createState()
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
		state,
		actions,
		applyUiSettings,
	})
	let messageListener = null
	let closed = false

	const cleanupOverlay = () => {
		if (closed) return
		closed = true
		events.detachListeners()
		if (messageListener) chrome.runtime.onMessage.removeListener(messageListener)
		delete window.__vtmCloseOverlay
	}

	window.__vtmCloseOverlay = () => {
		if (closed) return
		cleanupOverlay()
		chrome.runtime.sendMessage({
			type: "commit",
			actions: state.queue,
		})
		backdrop.remove()
	}

	messageListener = (message, _sender, sendResponse) => {
		if (message.type !== "closeOverlay") return
		window.__vtmCloseOverlay()
		sendResponse({ closed: true })
		return true
	}
	chrome.runtime.onMessage.addListener(messageListener)

	const observer = new MutationObserver(() => {
		if (!document.getElementById("vtm-backdrop")) {
			observer.disconnect()
			cleanupOverlay()
		}
	})
	observer.observe(document.documentElement, { childList: true, subtree: true })

	Promise.all([
		new Promise((resolve) => {
			chrome.runtime.sendMessage({ type: "getData" }, resolve)
		}),
		new Promise((resolve) => {
			chrome.runtime.sendMessage({ type: "getOverlayContext" }, resolve)
		}),
		new Promise((resolve) => {
			chrome.runtime.sendMessage({ type: "getMarksData" }, resolve)
		}),
		getSettings(),
	]).then(([resp, overlayContext, marksData, settings]) => {
		state.marks.items = marksData.marks || {}
		state.marks.mode = overlayContext?.initialMarksMode || "browse"
		state.marks.targetTab = overlayContext?.markTarget || null
		state.marks.draftKey = ""
		state.marks.minimalPrompt = !!overlayContext?.minimalPrompt
		state.settings.excludedDomains = settings.excludedDomains || []
		state.settings.density = settings.density
		state.settings.labelSize = settings.labelSize
		state.settings.theme = settings.theme
		state.settings.quickMarkSort = settings.quickMarkSort
		state.settings.markAlphaOrder = settings.markAlphaOrder
		state.settings.helpTextMode = settings.helpTextMode

		state.wins = resp.wins
		state.sel = resp.activeSel
		state.view = overlayContext?.initialView || "tabs"
		applyUiSettings()
		renderer.render()
		events.attachListeners()
	})
}
