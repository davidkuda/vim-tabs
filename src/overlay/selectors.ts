import type { MarkRecord } from "../shared/types.js"
import type { OverlayState } from "./state.js"

export function compareMarkKeys(
	a: string,
	b: string,
	markAlphaOrder: OverlayState["settings"]["markAlphaOrder"],
) {
	const foldedDiff = a.toLowerCase().localeCompare(b.toLowerCase())
	if (foldedDiff !== 0) return foldedDiff
	if (a === b) return 0
	if (markAlphaOrder === "capital-first") {
		return a === a.toUpperCase() ? -1 : 1
	}
	return a === a.toLowerCase() ? -1 : 1
}

export function compareMarks(
	a: MarkRecord,
	b: MarkRecord,
	state: OverlayState,
) {
	const recentDiff = (b.lastUsedAt || 0) - (a.lastUsedAt || 0)
	const usageDiff = (b.usageCount || 0) - (a.usageCount || 0)
	if (state.settings.quickMarkSort === "recent") {
		if (recentDiff !== 0) return recentDiff
		if (usageDiff !== 0) return usageDiff
	} else {
		if (usageDiff !== 0) return usageDiff
		if (recentDiff !== 0) return recentDiff
	}
	return compareMarkKeys(a.key, b.key, state.settings.markAlphaOrder)
}

export function getMarkColumns(state: OverlayState): [MarkRecord[], MarkRecord[]] {
	const marks = Object.values(state.marks.items || {})
	const sorted =
		state.marks.mode === "quick"
			? [...marks].sort((a, b) => compareMarks(a, b, state))
			: [...marks].sort((a, b) =>
					compareMarkKeys(a.key, b.key, state.settings.markAlphaOrder),
			  )
	if (state.marks.mode === "quick") return [sorted, []]
	return [
		sorted.filter((mark) => mark.key === mark.key.toLowerCase() && mark.live),
		sorted.filter((mark) => mark.key === mark.key.toUpperCase()),
	]
}

export function getCurrentSelectedMark(state: OverlayState) {
	const columns = getMarkColumns(state)
	return columns[state.marks.sel.col]?.[state.marks.sel.rows[state.marks.sel.col]] || null
}

export function getCurrentLiveTab(state: OverlayState) {
	return state.wins[state.sel.w]?.tabs[state.sel.t] || null
}

export function getCurrentStashTab(state: OverlayState) {
	return state.stash.sessions[state.stash.sel.s]?.tabs[state.stash.sel.t] || null
}

export function collectMatches(state: OverlayState, query: string) {
	if (!query) return []

	const needle = query.toLowerCase()
	const matches: Array<{ w?: number; t: number; s?: number }> = []

	if (state.view === "stash") {
		state.stash.sessions.forEach((session, si) => {
			session.tabs.forEach((tab, ti) => {
				const haystack = `${tab.title || ""} ${tab.url || ""}`.toLowerCase()
				if (haystack.includes(needle)) matches.push({ s: si, t: ti })
			})
		})
		return matches
	}

	state.wins.forEach((win, wi) => {
		win.tabs.forEach((tab, ti) => {
			const haystack = `${tab.title || ""} ${tab.url || ""}`.toLowerCase()
			if (haystack.includes(needle)) matches.push({ w: wi, t: ti })
		})
	})

	return matches
}

export function getHelpTabForView(state: OverlayState): OverlayState["helpTab"] {
	if (state.view === "stash") return "stash"
	if (state.view === "marks") return "marks"
	if (state.view === "tabs") return "tabs"
	return "general"
}
