import { curTab, rmQueue } from "./state.js"

export function createActions(state, undo, renderTabs) {
	function setYank(tab, cut = false) {
		state.yank = {
			cut,
			tabId: tab.id,
			url: tab.url,
			title: tab.title,
			favIconUrl: tab.favIconUrl,
		}
	}

	function markRemove() {
		const tab = curTab(state)
		if (tab._removed) return

		if (tab._temp) {
			rmQueue(
				state,
				(action) => action.type === "create" && action.tempId === tab._tempId,
			)
			state.wins[state.sel.w].tabs.splice(state.sel.t, 1)
			state.sel.t = Math.max(0, state.sel.t - 1)
			renderTabs()
			return
		}

		tab._removed = true
		setYank(tab, true)
		state.queue.push({ type: "remove", tabId: tab.id })
		undo.push({ w: state.sel.w, t: state.sel.t, tab })
		renderTabs()
	}

	function paste(above = false) {
		if (!state.yank) return

		const dst = state.wins[state.sel.w]
		const index = above ? state.sel.t : state.sel.t + 1

		if (state.yank.cut) {
			rmQueue(
				state,
				(action) => action.type === "remove" && action.tabId === state.yank.tabId,
			)
			state.queue.push({
				type: "move",
				tabId: state.yank.tabId,
				windowId: dst.id,
				index,
			})

			state.wins.forEach((win) => {
				const existingIndex = win.tabs.findIndex((tab) => tab.id === state.yank.tabId)
				if (existingIndex !== -1) win.tabs.splice(existingIndex, 1)
			})

			dst.tabs.splice(index, 0, {
				id: state.yank.tabId,
				url: state.yank.url,
				title: state.yank.title,
				favIconUrl: state.yank.favIconUrl,
			})
		} else {
			const tempId = "tmp-" + Date.now() + "-" + Math.random()
			dst.tabs.splice(index, 0, {
				_temp: true,
				_tempId: tempId,
				url: state.yank.url,
				title: state.yank.title,
				favIconUrl: state.yank.favIconUrl,
			})
			state.queue.push({
				type: "create",
				url: state.yank.url,
				windowId: dst.id,
				index,
				tempId,
			})
		}

		state.sel.t = index
		renderTabs()
	}

	function yankCopy() {
		setYank(curTab(state), false)
	}

	function undoDel() {
		const removed = undo.pop()
		if (!removed) return

		const { w, t, tab } = removed
		tab._removed = false
		rmQueue(state, (action) => action.type === "remove" && action.tabId === tab.id)
		state.sel.w = w
		state.sel.t = t
		renderTabs()
	}

	function bookmark() {
		state.queue.push({ type: "bookmark", tabId: curTab(state).id })
	}

	return {
		bookmark,
		markRemove,
		paste,
		undoDel,
		yankCopy,
	}
}
