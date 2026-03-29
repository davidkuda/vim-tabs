import type { ViewController } from "./types.js"

export const handleStashKeys: ViewController = (event, ctx) => {
	ctx.clearMarksStatus()
	if (event.key === "'") {
		event.preventDefault()
		ctx.startMarkMode("jump")
		return true
	}
	if (event.key === ";") {
		event.preventDefault()
		ctx.openStandaloneStash()
		return true
	}
	if (event.key === "G") {
		event.preventDefault()
		const tabs = ctx.state.stash.sessions[ctx.state.stash.sel.s]?.tabs || []
		ctx.state.stash.sel.t = tabs.length - 1
		ctx.render()
		return true
	}
	if (event.key === "Escape") {
		event.preventDefault()
		if (ctx.clearSearch()) return true
		ctx.toggleStash()
		return true
	}
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
	if (event.key === "j") {
		event.preventDefault()
		const tabs = ctx.state.stash.sessions[ctx.state.stash.sel.s]?.tabs || []
		ctx.state.stash.sel.t = Math.min(ctx.state.stash.sel.t + 1, tabs.length - 1)
		ctx.render()
		return true
	}
	if (event.key === "k") {
		event.preventDefault()
		ctx.state.stash.sel.t = Math.max(ctx.state.stash.sel.t - 1, 0)
		ctx.render()
		return true
	}
	if (event.key === "J") {
		event.preventDefault()
		const tabs = ctx.state.stash.sessions[ctx.state.stash.sel.s]?.tabs || []
		ctx.state.stash.sel.t = Math.min(ctx.state.stash.sel.t + 5, tabs.length - 1)
		ctx.render()
		return true
	}
	if (event.key === "K") {
		event.preventDefault()
		ctx.state.stash.sel.t = Math.max(ctx.state.stash.sel.t - 5, 0)
		ctx.render()
		return true
	}
	if (event.key === "h") {
		event.preventDefault()
		ctx.state.stash.sel.s = Math.max(ctx.state.stash.sel.s - 1, 0)
		ctx.clampStashSelection()
		ctx.render()
		return true
	}
	if (event.key === "l") {
		event.preventDefault()
		ctx.state.stash.sel.s = Math.min(
			ctx.state.stash.sel.s + 1,
			ctx.state.stash.sessions.length - 1,
		)
		ctx.clampStashSelection()
		ctx.render()
		return true
	}
	if (event.key === "Enter") {
		event.preventDefault()
		if (event.shiftKey) {
			ctx.openStashTabInBackground()
			return true
		}
		ctx.openStashTab()
		return true
	}
	return false
}
