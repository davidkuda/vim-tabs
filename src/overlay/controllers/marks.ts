import { getCurrentSelectedMark, getMarkColumns } from "../selectors.js"
import type { ViewController } from "./types.js"

export const handleMarksKeys: ViewController = (event, ctx) => {
	const quickMode = ctx.state.marks.mode === "quick"
	if (event.key === "Escape") {
		event.preventDefault()
		if (ctx.state.marks.pending) {
			ctx.clearMarksState()
			ctx.render()
			return true
		}
		ctx.toggleMarks()
		return true
	}
	if (event.key === "'" || event.key === '"') {
		if (quickMode) return false
		event.preventDefault()
		ctx.startMarkMode("jump")
		return true
	}
	if (
		quickMode &&
		/^[a-zA-Z]$/.test(event.key || "") &&
		ctx.state.marks.items[event.key]
	) {
		event.preventDefault()
		ctx.jumpToMark(event.key)
		return true
	}
	if (quickMode && event.ctrlKey && event.key === "n") {
		event.preventDefault()
		const columns = getMarkColumns(ctx.state)
		ctx.state.marks.sel.rows[0] = Math.min(
			ctx.state.marks.sel.rows[0] + 1,
			Math.max(columns[0].length - 1, 0),
		)
		ctx.render()
		return true
	}
	if (quickMode && event.ctrlKey && event.key === "p") {
		event.preventDefault()
		ctx.state.marks.sel.rows[0] = Math.max(ctx.state.marks.sel.rows[0] - 1, 0)
		ctx.render()
		return true
	}
	if (event.key === "d") {
		if (quickMode) return false
		event.preventDefault()
		const mark = getCurrentSelectedMark(ctx.state)
		if (!mark) return true
		chrome.runtime.sendMessage({ type: "deleteMark", key: mark.key }, () => {
			ctx.state.marks.status = `Removed mark <code>${mark.key}</code>.`
			chrome.runtime.sendMessage({ type: "getMarksData" }, (marksData) => {
				ctx.state.marks.items = marksData.marks || {}
				ctx.render()
			})
		})
		return true
	}
	if (event.key === "j") {
		event.preventDefault()
		const col = ctx.state.marks.sel.col
		const columns = getMarkColumns(ctx.state)
		ctx.state.marks.sel.rows[col] = Math.min(
			ctx.state.marks.sel.rows[col] + 1,
			Math.max(columns[col].length - 1, 0),
		)
		ctx.render()
		return true
	}
	if (event.key === "k") {
		event.preventDefault()
		const col = ctx.state.marks.sel.col
		ctx.state.marks.sel.rows[col] = Math.max(ctx.state.marks.sel.rows[col] - 1, 0)
		ctx.render()
		return true
	}
	if (event.key === "h") {
		if (quickMode) return false
		event.preventDefault()
		ctx.state.marks.sel.col = Math.max(ctx.state.marks.sel.col - 1, 0)
		ctx.render()
		return true
	}
	if (event.key === "l") {
		if (quickMode) return false
		event.preventDefault()
		ctx.state.marks.sel.col = Math.min(ctx.state.marks.sel.col + 1, 1)
		ctx.render()
		return true
	}
	if (event.key === "Enter") {
		event.preventDefault()
		const mark = getCurrentSelectedMark(ctx.state)
		if (mark) ctx.jumpToMark(mark.key)
		return true
	}
	return false
}
