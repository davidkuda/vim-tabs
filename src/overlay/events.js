import { curTab } from "./state.js"

export function createEventHandlers({ backdrop, render, renderTabs, state, actions }) {
	function collectMatches(query) {
		if (!query) return []

		const needle = query.toLowerCase()
		const matches = []

		state.wins.forEach((win, wi) => {
			win.tabs.forEach((tab, ti) => {
				const haystack = `${tab.title || ""} ${tab.url || ""}`.toLowerCase()
				if (haystack.includes(needle)) matches.push({ w: wi, t: ti })
			})
		})

		return matches
	}

	function selectMatch(matches, index) {
		if (!matches.length) return
		const next = matches[((index % matches.length) + matches.length) % matches.length]
		state.sel.w = next.w
		state.sel.t = next.t
	}

	function startSearch() {
		state.search.active = true
		state.search.query = ""
		state.search.originSel = { ...state.sel }
		renderTabs()
	}

	function cancelSearch() {
		if (state.search.originSel) {
			state.sel = { ...state.search.originSel }
		}
		state.search.active = false
		state.search.query = ""
		state.search.originSel = null
		renderTabs()
	}

	function clearSearch() {
		if (state.search.active) {
			cancelSearch()
			return true
		}
		if (state.search.lastQuery) {
			state.search.lastQuery = ""
			renderTabs()
			return true
		}
		return false
	}

	function updateSearch(query) {
		state.search.query = query
		const matches = collectMatches(query)
		if (matches.length) selectMatch(matches, 0)
		else if (state.search.originSel) state.sel = { ...state.search.originSel }
		renderTabs()
	}

	function confirmSearch() {
		if (state.search.query) {
			const matches = collectMatches(state.search.query)
			if (matches.length) {
				state.search.lastQuery = state.search.query
				selectMatch(matches, 0)
			}
		}
		state.search.active = false
		state.search.query = ""
		state.search.originSel = null
		renderTabs()
	}

	function jumpSearch(direction) {
		if (!state.search.lastQuery) return

		const matches = collectMatches(state.search.lastQuery)
		if (!matches.length) return

		const currentIndex = matches.findIndex((match) => {
			return match.w === state.sel.w && match.t === state.sel.t
		})

		const nextIndex = currentIndex === -1 ? 0 : currentIndex + direction
		selectMatch(matches, nextIndex)
		renderTabs()
	}

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
		if (state.search.active) {
			if (event.key === "Escape") {
				event.preventDefault()
				cancelSearch()
				return
			}
			if (event.key === "Enter") {
				event.preventDefault()
				confirmSearch()
				return
			}
			if (event.key === "Backspace") {
				event.preventDefault()
				updateSearch(state.search.query.slice(0, -1))
				return
			}
			if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
				event.preventDefault()
				updateSearch(state.search.query + event.key)
			}
			return
		}

		if (state.view === "help") {
			if (event.key === "?") {
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
		if (event.key === "/") {
			event.preventDefault()
			startSearch()
			return
		}
		if (event.key === "n") {
			event.preventDefault()
			jumpSearch(1)
			return
		}
		if (event.key === "N") {
			event.preventDefault()
			jumpSearch(-1)
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
			if (clearSearch()) return
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
