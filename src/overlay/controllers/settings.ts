import type { ViewController } from "./types.js"

const settingsColumnCounts = [() => 0, () => 4, () => 7, () => 3]

export const handleSettingsKeys: ViewController = (event, ctx) => {
	ctx.clearMarksStatus()
	if (ctx.state.settings.editing) {
		if (event.key === "Escape") {
			event.preventDefault()
			ctx.cancelSettingsInsert()
			return true
		}
		if (event.key === "Enter") {
			event.preventDefault()
			ctx.confirmSettingsInsert()
			return true
		}
		if (event.key === "Backspace") {
			event.preventDefault()
			ctx.state.settings.draft = ctx.state.settings.draft.slice(0, -1)
			ctx.state.settings.status = ""
			ctx.render()
			return true
		}
		if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault()
			ctx.state.settings.draft += event.key
			ctx.state.settings.status = ""
			ctx.render()
			return true
		}
		return false
	}

	if (event.key === "Escape" || event.key === ":") {
		event.preventDefault()
		ctx.leaveSettings()
		return true
	}
	if (event.key === "j") {
		event.preventDefault()
		const col = ctx.state.settings.sel.col
		const maxRow =
			col === 0
				? ctx.state.settings.excludedDomains.length - 1
				: settingsColumnCounts[col]() - 1
		ctx.state.settings.sel.rows[col] = Math.min(
			ctx.state.settings.sel.rows[col] + 1,
			maxRow,
		)
		ctx.state.settings.status = ""
		ctx.render()
		return true
	}
	if (event.key === "k") {
		event.preventDefault()
		const col = ctx.state.settings.sel.col
		ctx.state.settings.sel.rows[col] = Math.max(ctx.state.settings.sel.rows[col] - 1, 0)
		ctx.state.settings.status = ""
		ctx.render()
		return true
	}
	if (event.key === "h") {
		event.preventDefault()
		ctx.state.settings.sel.col = Math.max(ctx.state.settings.sel.col - 1, 0)
		ctx.state.settings.status = ""
		ctx.render()
		return true
	}
	if (event.key === "l") {
		event.preventDefault()
		ctx.state.settings.sel.col = Math.min(ctx.state.settings.sel.col + 1, 3)
		ctx.state.settings.status = ""
		ctx.render()
		return true
	}
	if (event.key === "o") {
		event.preventDefault()
		ctx.startSettingsInsert(1)
		return true
	}
	if (event.key === "O") {
		event.preventDefault()
		ctx.startSettingsInsert(0)
		return true
	}
	if (event.key === "d") {
		event.preventDefault()
		ctx.deleteSelectedSetting()
		return true
	}
	if (event.key === "Enter") {
		event.preventDefault()
		ctx.applyCurrentSettingsOption()
		return true
	}
	return false
}
