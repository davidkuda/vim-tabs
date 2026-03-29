import type { ViewController } from "./types.js"

export const handleTabsKeys: ViewController = (event, ctx) => {
	if (event.key === "/") {
		event.preventDefault()
		ctx.startSearch()
		return true
	}
	if (event.key === "n") {
		event.preventDefault()
		ctx.jumpSearch(1)
		return true
	}
	if (event.key === "N") {
		event.preventDefault()
		ctx.jumpSearch(-1)
		return true
	}
	if (event.key === "G") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.state.sel.t = ctx.state.wins[ctx.state.sel.w].tabs.length - 1
		ctx.renderTabs()
		return true
	}
	if (event.key === "Escape") {
		event.preventDefault()
		ctx.clearMarksStatus()
		if (ctx.clearSearch()) return true
		ctx.commit()
		return true
	}
	const nav = {
		j: () =>
			(ctx.state.sel.t = Math.min(
				ctx.state.sel.t + 1,
				ctx.state.wins[ctx.state.sel.w].tabs.length - 1,
			)),
		k: () => (ctx.state.sel.t = Math.max(ctx.state.sel.t - 1, 0)),
		J: () =>
			(ctx.state.sel.t = Math.min(
				ctx.state.sel.t + 5,
				ctx.state.wins[ctx.state.sel.w].tabs.length - 1,
			)),
		K: () => (ctx.state.sel.t = Math.max(ctx.state.sel.t - 5, 0)),
		h: () => (
			(ctx.state.sel.w = Math.max(ctx.state.sel.w - 1, 0)),
			(ctx.state.sel.t = Math.min(
				ctx.state.sel.t,
				ctx.state.wins[ctx.state.sel.w].tabs.length - 1,
			))
		),
		l: () => (
			(ctx.state.sel.w = Math.min(
				ctx.state.sel.w + 1,
				ctx.state.wins.length - 1,
			)),
			(ctx.state.sel.t = Math.min(
				ctx.state.sel.t,
				ctx.state.wins[ctx.state.sel.w].tabs.length - 1,
			))
		),
		g: () => (ctx.state.sel.t = 0),
	} as const
	if (event.key in nav) {
		event.preventDefault()
		ctx.clearMarksStatus()
		nav[event.key as keyof typeof nav]()
		ctx.renderTabs()
		return true
	}
	if (event.key === "d") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.actions.markRemove()
		return true
	}
	if (event.key === "X") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.stashCurrentWindow()
		return true
	}
	if (event.key === "u") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.actions.undoDel()
		return true
	}
	if (event.key === "y") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.actions.yankCopy()
		return true
	}
	if (event.key === "p") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.actions.paste(false)
		return true
	}
	if (event.key === "P") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.actions.paste(true)
		return true
	}
	if (event.key === '"') {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.toggleStash()
		return true
	}
	if (event.key === "M") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.toggleMarks()
		return true
	}
	if (event.key === "'") {
		event.preventDefault()
		ctx.startMarkMode("jump")
		return true
	}
	if (event.key === ";") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.openStandaloneStash()
		return true
	}
	if (event.key === "b") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.actions.bookmark()
		return true
	}
	if (event.key === "e") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.excludeCurrentTabHostname()
		return true
	}
	if (event.key === "m") {
		event.preventDefault()
		ctx.startMarkMode("set")
		return true
	}
	if (event.key === "Enter") {
		event.preventDefault()
		ctx.clearMarksStatus()
		ctx.focusTab()
		return true
	}
	return false
}
