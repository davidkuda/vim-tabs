import { curTab } from "./state.js"

export function createEventHandlers({ backdrop, render, renderTabs, state, actions }) {
	const nav = {
		j: () =>
			(state.sel.t = Math.min(
				state.sel.t + 1,
				state.wins[state.sel.w].tabs.length - 1,
			)),
		k: () => (state.sel.t = Math.max(state.sel.t - 1, 0)),
		h: () => (
			(state.sel.w = Math.max(state.sel.w - 1, 0)),
			(state.sel.t = Math.min(state.sel.t, state.wins[state.sel.w].tabs.length - 1))
		),
		l: () => (
			(state.sel.w = Math.min(state.sel.w + 1, state.wins.length - 1)),
			(state.sel.t = Math.min(state.sel.t, state.wins[state.sel.w].tabs.length - 1))
		),
		g: () => (state.sel.t = 0),
	}

	function bottom() {
		state.sel.t = state.wins[state.sel.w].tabs.length - 1
	}

	function detachListeners() {
		window.removeEventListener("keydown", onKey, true)
	}

	function commit(postFocus) {
		detachListeners()
		backdrop.remove()
		chrome.runtime.sendMessage({
			type: "commit",
			actions: state.queue,
			postFocus,
		})
	}

	function focusTab() {
		const tab = curTab(state)
		if (tab._temp) {
			commit({
				windowId: state.wins[state.sel.w].id,
				index: state.sel.t,
				url: tab.url,
			})
		} else {
			commit(tab.id)
		}
	}

	function toggleHelp() {
		state.view = state.view === "tabs" ? "help" : "tabs"
		render()
	}

	function onKey(event) {
		if (state.view === "help") {
			if (event.key === "?" || event.key === "Escape") {
				event.preventDefault()
				toggleHelp()
			}
			return
		}

		if (event.key === "?") {
			event.preventDefault()
			toggleHelp()
			return
		}
		if (event.key === "G") {
			event.preventDefault()
			bottom()
			renderTabs()
			return
		}
		if (event.key === "Escape") {
			event.preventDefault()
			commit()
			return
		}
		if (nav[event.key]) {
			event.preventDefault()
			nav[event.key]()
			renderTabs()
			return
		}
		if (event.key === "d") {
			event.preventDefault()
			actions.markRemove()
			return
		}
		if (event.key === "u") {
			event.preventDefault()
			actions.undoDel()
			return
		}
		if (event.key === "y") {
			event.preventDefault()
			actions.yankCopy()
			return
		}
		if (event.key === "p") {
			event.preventDefault()
			actions.paste(false)
			return
		}
		if (event.key === "P") {
			event.preventDefault()
			actions.paste(true)
			return
		}
		if (event.key === '"') {
			event.preventDefault()
			actions.bookmark()
			return
		}
		if (event.key === "Enter") {
			event.preventDefault()
			focusTab()
		}
	}

	function attachListeners() {
		window.addEventListener("keydown", onKey, true)
	}

	return {
		attachListeners,
	}
}
