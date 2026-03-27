import { createActions } from "./overlay/actions.js"
import { createOverlayDom } from "./overlay/dom.js"
import { createEventHandlers } from "./overlay/events.js"
import { createRenderer } from "./overlay/render.js"
import { createState, createUndoStack } from "./overlay/state.js"

if (!document.getElementById("vtm-backdrop")) {
	const state = createState()
	const undo = createUndoStack()
	const { backdrop, columns, footer } = createOverlayDom()
	const renderer = createRenderer(state, columns, footer)
	const actions = createActions(state, undo, renderer.renderTabs)
	const events = createEventHandlers({
		backdrop,
		render: renderer.render,
		renderTabs: renderer.renderTabs,
		state,
		actions,
	})

	chrome.runtime.sendMessage({ type: "getData" }, (resp) => {
		state.wins = resp.wins
		state.sel = resp.activeSel
		renderer.render()
		events.attachListeners()
	})
}
