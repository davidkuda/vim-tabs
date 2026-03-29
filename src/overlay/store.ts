import { createState } from "./state.js"

export function createOverlayStore() {
	const state = createState()

	function getSelectionSnapshot() {
		if (state.view === "stash") {
			return {
				view: "stash",
				tabs: { ...state.sel },
				stash: { ...state.stash.sel },
			}
		}
		return {
			view: state.view,
			tabs: { ...state.sel },
			stash: { ...state.stash.sel },
		}
	}

	function restoreSelectionSnapshot(snapshot) {
		if (!snapshot) return
		state.sel = { ...snapshot.tabs }
		state.stash.sel = { ...snapshot.stash }
	}

	function startSearch(renderTabs) {
		state.marks.pending = null
		state.marks.status = ""
		state.search.active = true
		state.search.query = ""
		state.search.originSel = getSelectionSnapshot()
		renderTabs()
	}

	function cancelSearch(renderTabs) {
		restoreSelectionSnapshot(state.search.originSel)
		state.search.active = false
		state.search.query = ""
		state.search.originSel = null
		renderTabs()
	}

	function finishSearch(renderTabs) {
		state.search.active = false
		state.search.query = ""
		state.search.originSel = null
		renderTabs()
	}

	return {
		state,
		cancelSearch,
		finishSearch,
		restoreSelectionSnapshot,
		startSearch,
	}
}
