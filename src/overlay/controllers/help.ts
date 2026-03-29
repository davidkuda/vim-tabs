import type { ViewController } from "./types.js"

export const handleHelpKeys: ViewController = (event, ctx) => {
	ctx.clearMarksStatus()
	const helpTabs = ["general", "tabs", "stash", "marks"] as const
	const helpIndex = helpTabs.indexOf(ctx.state.helpTab)

	if (event.key === "h") {
		event.preventDefault()
		ctx.state.helpTab = helpTabs[Math.max(helpIndex - 1, 0)]
		ctx.render()
		return true
	}
	if (event.key === "l") {
		event.preventDefault()
		ctx.state.helpTab = helpTabs[Math.min(helpIndex + 1, helpTabs.length - 1)]
		ctx.render()
		return true
	}
	if (event.key === "j") {
		event.preventDefault()
		ctx.scrollHelp(120)
		return true
	}
	if (event.key === "k") {
		event.preventDefault()
		ctx.scrollHelp(-120)
		return true
	}
	if (event.key === "J") {
		event.preventDefault()
		ctx.scrollHelp(320)
		return true
	}
	if (event.key === "K") {
		event.preventDefault()
		ctx.scrollHelp(-320)
		return true
	}

	return false
}
