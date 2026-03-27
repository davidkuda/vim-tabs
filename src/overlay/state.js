export function createState() {
	return {
		wins: [],
		sel: { w: 0, t: 0 },
		yank: null,
		queue: [],
		view: "tabs",
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
