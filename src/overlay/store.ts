import { applyOverlayAction, type OverlayAction } from "./reducer.js"
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

	function dispatch(action: OverlayAction) {
		applyOverlayAction(state, action)
	}

	function startSearch(renderTabs) {
		dispatch({ type: "search/start", snapshot: getSelectionSnapshot() })
		renderTabs()
	}

	function cancelSearch(renderTabs) {
		dispatch({ type: "search/cancel", snapshot: state.search.originSel })
		renderTabs()
	}

	function finishSearch(renderTabs) {
		dispatch({ type: "search/finish" })
		renderTabs()
	}

	return {
		dispatch,
		state,
		cancelSearch,
		finishSearch,
		restoreSelectionSnapshot,
		startSearch,
	}
}
