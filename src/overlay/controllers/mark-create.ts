import type { ViewController } from "./types.js"

export const handleMarkCreateKeys: ViewController = (event, ctx) => {
	if (event.key === "Escape") {
		event.preventDefault()
		ctx.commit(ctx.state.marks.targetTab?.id)
		return true
	}
	if (event.key === "Backspace") {
		event.preventDefault()
		ctx.state.marks.draftKey = ""
		ctx.render()
		return true
	}
	if (event.key === "Enter") {
		event.preventDefault()
		if (!ctx.state.marks.draftKey) return true
		ctx.saveCurrentMark(event.shiftKey)
		return true
	}
	if (/^[a-zA-Z]$/.test(event.key || "")) {
		event.preventDefault()
		ctx.state.marks.draftKey = event.key.toLowerCase()
		ctx.render()
		return true
	}
	return false
}
