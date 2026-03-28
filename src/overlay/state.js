export function createState() {
	return {
		wins: [],
		sel: { w: 0, t: 0 },
		stash: {
			sessions: [],
			sel: { s: 0, t: 0 },
		},
		settings: {
			excludedDomains: [],
			sel: 0,
			draft: "",
			editing: false,
			insertIndex: 0,
			returnView: "tabs",
			status: "",
		},
		yank: null,
		queue: [],
		view: "tabs",
		search: {
			active: false,
			query: "",
			lastQuery: "",
			originSel: null,
		},
	}
}

export function createUndoStack() {
	return []
}

export function curTab(state) {
	return state.wins[state.sel.w].tabs[state.sel.t]
}

export function rmQueue(state, predicate) {
	const index = state.queue.findIndex(predicate)
	if (index !== -1) state.queue.splice(index, 1)
}
