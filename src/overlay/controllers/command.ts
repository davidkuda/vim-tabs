import type { ViewController } from "./types.js"

export const handleCommandPaletteKeys: ViewController = (event, ctx) => {
	if (event.key === "Escape") {
		event.preventDefault()
		ctx.closeCommandPalette()
		return true
	}
	if (event.key === "Enter") {
		event.preventDefault()
		ctx.executeSelectedCommand()
		return true
	}
	if (event.key === "ArrowDown" || event.key === "Tab" || (event.ctrlKey && event.key === "n")) {
		event.preventDefault()
		ctx.moveCommandPaletteSelection(1)
		return true
	}
	if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
		event.preventDefault()
		ctx.moveCommandPaletteSelection(-1)
		return true
	}
	if (event.key === "Backspace") {
		event.preventDefault()
		ctx.updateCommandPaletteQuery(ctx.state.command.query.slice(0, -1))
		return true
	}
	if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
		event.preventDefault()
		ctx.updateCommandPaletteQuery(ctx.state.command.query + event.key)
		return true
	}
	return false
}
