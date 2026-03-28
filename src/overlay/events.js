import { curTab } from "./state.js"
import { getSettings, normalizeDomain, saveSettings } from "../shared/settings.js"

export function createEventHandlers({ backdrop, render, renderTabs, state, actions }) {
	function collectMatches(query) {
		if (!query) return []

		const needle = query.toLowerCase()
		const matches = []

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

	function selectMatch(matches, index) {
		if (!matches.length) return
		const next = matches[((index % matches.length) + matches.length) % matches.length]
		if (state.view === "stash") {
			state.stash.sel.s = next.s
			state.stash.sel.t = next.t
			return
		}
		state.sel.w = next.w
		state.sel.t = next.t
	}

	function startSearch() {
		state.search.active = true
		state.search.query = ""
		state.search.originSel = { ...state.sel }
		renderTabs()
	}

	function cancelSearch() {
		if (state.search.originSel) {
			state.sel = { ...state.search.originSel }
		}
		state.search.active = false
		state.search.query = ""
		state.search.originSel = null
		renderTabs()
	}

	function clearSearch() {
		if (state.search.active) {
			cancelSearch()
			return true
		}
		if (state.search.lastQuery) {
			state.search.lastQuery = ""
			renderTabs()
			return true
		}
		return false
	}

	function updateSearch(query) {
		state.search.query = query
		const matches = collectMatches(query)
		if (matches.length) selectMatch(matches, 0)
		else if (state.search.originSel) state.sel = { ...state.search.originSel }
		renderTabs()
	}

	function confirmSearch() {
		if (state.search.query) {
			const matches = collectMatches(state.search.query)
			if (matches.length) {
				state.search.lastQuery = state.search.query
				selectMatch(matches, 0)
			}
		}
		state.search.active = false
		state.search.query = ""
		state.search.originSel = null
		renderTabs()
	}

	function jumpSearch(direction) {
		if (!state.search.lastQuery) return

		const matches = collectMatches(state.search.lastQuery)
		if (!matches.length) return

		const currentIndex = matches.findIndex((match) => {
			if (state.view === "stash") {
				return match.s === state.stash.sel.s && match.t === state.stash.sel.t
			}
			return match.w === state.sel.w && match.t === state.sel.t
		})

		const nextIndex = currentIndex === -1 ? 0 : currentIndex + direction
		selectMatch(matches, nextIndex)
		renderTabs()
	}

	const nav = {
		j: () =>
			(state.sel.t = Math.min(
				state.sel.t + 1,
				state.wins[state.sel.w].tabs.length - 1,
			)),
		k: () => (state.sel.t = Math.max(state.sel.t - 1, 0)),
		J: () =>
			(state.sel.t = Math.min(
				state.sel.t + 5,
				state.wins[state.sel.w].tabs.length - 1,
			)),
		K: () => (state.sel.t = Math.max(state.sel.t - 5, 0)),
		h: () => (
			(state.sel.w = Math.max(state.sel.w - 1, 0)),
			(state.sel.t = Math.min(state.sel.t, state.wins[state.sel.w].tabs.length - 1))
		),
		l: () => (
			(state.sel.w = Math.min(state.sel.w + 1, state.wins.length - 1)),
			(state.sel.t = Math.min(state.sel.t, state.wins[state.sel.w].tabs.length - 1))
		),
		g: () => (state.sel.t = 0),
	}

	function bottom() {
		if (state.view === "stash") {
			const tabs = state.stash.sessions[state.stash.sel.s]?.tabs || []
			state.stash.sel.t = tabs.length - 1
			return
		}
		state.sel.t = state.wins[state.sel.w].tabs.length - 1
	}

	function clampStashSelection() {
		state.stash.sel.s = Math.max(
			0,
			Math.min(state.stash.sel.s, state.stash.sessions.length - 1),
		)
		const tabs = state.stash.sessions[state.stash.sel.s]?.tabs || []
		state.stash.sel.t = Math.max(0, Math.min(state.stash.sel.t, tabs.length - 1))
	}

	function clampSettingsSelection() {
		const count =
			state.settings.excludedDomains.length + (state.settings.editing ? 1 : 0)
		state.settings.sel = Math.max(0, Math.min(state.settings.sel, count - 1))
	}

	async function persistSettings() {
		await saveSettings({ excludedDomains: state.settings.excludedDomains })
	}

	function resetSettingsStatus() {
		state.settings.status = ""
	}

	function detachListeners() {
		window.removeEventListener("keydown", onKey, true)
	}

	function commit(postFocus) {
		detachListeners()
		backdrop.remove()
		chrome.runtime.sendMessage({
			type: "commit",
			actions: state.queue,
			postFocus,
		})
	}

	function closeAndSend(message) {
		detachListeners()
		backdrop.remove()
		chrome.runtime.sendMessage(message)
	}

	function openStashTab() {
		const tab = state.stash.sessions[state.stash.sel.s]?.tabs[state.stash.sel.t]
		if (!tab?.url) return
		closeAndSend({ type: "openStashedTab", url: tab.url })
	}

	function openStashTabInBackground() {
		const tab = state.stash.sessions[state.stash.sel.s]?.tabs[state.stash.sel.t]
		if (!tab?.url) return
		chrome.runtime.sendMessage({
			type: "openStashedTab",
			url: tab.url,
			background: true,
		})
	}

	function focusTab() {
		const tab = curTab(state)
		if (tab._temp) {
			commit({
				windowId: state.wins[state.sel.w].id,
				index: state.sel.t,
				url: tab.url,
			})
		} else {
			commit(tab.id)
		}
	}

	function toggleHelp() {
		state.view = state.view === "tabs" ? "help" : "tabs"
		render()
	}

	function toggleStash() {
		if (state.view === "stash") {
			state.view = "tabs"
			render()
			return
		}
		chrome.runtime.sendMessage({ type: "getStashData" }, (stashData) => {
			state.stash.sessions = stashData.sessions || []
			clampStashSelection()
			state.view = "stash"
			render()
		})
	}

	async function openSettings(view = state.view) {
		resetSettingsStatus()
		state.settings.editing = false
		state.settings.draft = ""
		state.settings.insertIndex = 0
		state.settings.returnView = view === "settings" ? "tabs" : view
		const settings = await getSettings()
		state.settings.excludedDomains = settings.excludedDomains || []
		clampSettingsSelection()
		state.view = "settings"
		render()
	}

	function leaveSettings() {
		resetSettingsStatus()
		state.settings.editing = false
		state.settings.draft = ""
		state.settings.insertIndex = 0
		state.view = state.settings.returnView || "tabs"
		render()
	}

	function startSettingsInsert(offset) {
		resetSettingsStatus()
		const baseIndex = state.settings.excludedDomains.length
			? state.settings.sel + offset
			: 0
		state.settings.editing = true
		state.settings.draft = ""
		state.settings.insertIndex = Math.max(
			0,
			Math.min(baseIndex, state.settings.excludedDomains.length),
		)
		state.settings.sel = state.settings.insertIndex
		render()
	}

	async function confirmSettingsInsert() {
		const domain = normalizeDomain(state.settings.draft)
		if (!domain) {
			state.settings.status = "Enter a hostname like gmail.com."
			render()
			return
		}

		if (state.settings.excludedDomains.includes(domain)) {
			state.settings.status = `${domain} is already excluded.`
			render()
			return
		}

		state.settings.excludedDomains.splice(state.settings.insertIndex, 0, domain)
		state.settings.sel = state.settings.excludedDomains.indexOf(domain)
		state.settings.editing = false
		state.settings.draft = ""
		state.settings.insertIndex = 0
		state.settings.status = `Excluded ${domain} from future stashes.`
		await persistSettings()
		render()
	}

	function cancelSettingsInsert() {
		resetSettingsStatus()
		state.settings.editing = false
		state.settings.draft = ""
		state.settings.insertIndex = 0
		clampSettingsSelection()
		render()
	}

	async function deleteSelectedSetting() {
		if (state.settings.editing || !state.settings.excludedDomains.length) return
		const [removed] = state.settings.excludedDomains.splice(state.settings.sel, 1)
		clampSettingsSelection()
		state.settings.status = removed ? `Removed ${removed} from the exclusion list.` : ""
		await persistSettings()
		render()
	}

	function onKey(event) {
		if (state.search.active) {
			if (event.key === "Escape") {
				event.preventDefault()
				cancelSearch()
				return
			}
			if (event.key === "Enter") {
				event.preventDefault()
				confirmSearch()
				return
			}
			if (event.key === "Backspace") {
				event.preventDefault()
				updateSearch(state.search.query.slice(0, -1))
				return
			}
			if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
				event.preventDefault()
				updateSearch(state.search.query + event.key)
			}
			return
		}

		if (state.view === "help") {
			if (event.key === ":") {
				event.preventDefault()
				openSettings("help")
				return
			}
			if (event.key === "?") {
				event.preventDefault()
				toggleHelp()
			}
			return
		}

		if (state.view === "stashHelp") {
			if (event.key === ":") {
				event.preventDefault()
				openSettings("stashHelp")
				return
			}
			if (event.key === "?") {
				event.preventDefault()
				state.view = "stash"
				render()
			}
			return
		}

		if (state.view === "stash") {
			if (event.key === ":") {
				event.preventDefault()
				openSettings("stash")
				return
			}
			if (event.key === "?") {
				event.preventDefault()
				state.view = "stashHelp"
				render()
				return
			}
			if (event.key === '"') {
				event.preventDefault()
				toggleStash()
				return
			}
			if (event.key === "'") {
				event.preventDefault()
				closeAndSend({ type: "openStash" })
				return
			}
			if (event.key === "G") {
				event.preventDefault()
				bottom()
				render()
				return
			}
			if (event.key === "Escape") {
				event.preventDefault()
				if (clearSearch()) return
				toggleStash()
				return
			}
			if (event.key === "/") {
				event.preventDefault()
				startSearch()
				return
			}
			if (event.key === "n") {
				event.preventDefault()
				jumpSearch(1)
				return
			}
			if (event.key === "N") {
				event.preventDefault()
				jumpSearch(-1)
				return
			}
			if (event.key === "j") {
				event.preventDefault()
				const tabs = state.stash.sessions[state.stash.sel.s]?.tabs || []
				state.stash.sel.t = Math.min(state.stash.sel.t + 1, tabs.length - 1)
				render()
				return
			}
			if (event.key === "k") {
				event.preventDefault()
				state.stash.sel.t = Math.max(state.stash.sel.t - 1, 0)
				render()
				return
			}
			if (event.key === "J") {
				event.preventDefault()
				const tabs = state.stash.sessions[state.stash.sel.s]?.tabs || []
				state.stash.sel.t = Math.min(state.stash.sel.t + 5, tabs.length - 1)
				render()
				return
			}
			if (event.key === "K") {
				event.preventDefault()
				state.stash.sel.t = Math.max(state.stash.sel.t - 5, 0)
				render()
				return
			}
			if (event.key === "h") {
				event.preventDefault()
				state.stash.sel.s = Math.max(state.stash.sel.s - 1, 0)
				clampStashSelection()
				render()
				return
			}
			if (event.key === "l") {
				event.preventDefault()
				state.stash.sel.s = Math.min(
					state.stash.sel.s + 1,
					state.stash.sessions.length - 1,
				)
				clampStashSelection()
				render()
				return
			}
			if (event.key === "Enter") {
				event.preventDefault()
				if (event.shiftKey) {
					openStashTabInBackground()
					return
				}
				openStashTab()
			}
			return
		}

		if (state.view === "settings") {
			if (state.settings.editing) {
				if (event.key === "Escape") {
					event.preventDefault()
					cancelSettingsInsert()
					return
				}
				if (event.key === "Enter") {
					event.preventDefault()
					confirmSettingsInsert()
					return
				}
				if (event.key === "Backspace") {
					event.preventDefault()
					state.settings.draft = state.settings.draft.slice(0, -1)
					resetSettingsStatus()
					render()
					return
				}
				if (
					event.key.length === 1 &&
					!event.ctrlKey &&
					!event.metaKey &&
					!event.altKey
				) {
					event.preventDefault()
					state.settings.draft += event.key
					resetSettingsStatus()
					render()
				}
				return
			}

			if (event.key === "Escape" || event.key === ":") {
				event.preventDefault()
				leaveSettings()
				return
			}
			if (event.key === "j") {
				event.preventDefault()
				state.settings.sel = Math.min(
					state.settings.sel + 1,
					state.settings.excludedDomains.length - 1,
				)
				resetSettingsStatus()
				render()
				return
			}
			if (event.key === "k") {
				event.preventDefault()
				state.settings.sel = Math.max(state.settings.sel - 1, 0)
				resetSettingsStatus()
				render()
				return
			}
			if (event.key === "o") {
				event.preventDefault()
				startSettingsInsert(1)
				return
			}
			if (event.key === "O") {
				event.preventDefault()
				startSettingsInsert(0)
				return
			}
			if (event.key === "d") {
				event.preventDefault()
				deleteSelectedSetting()
			}
			return
		}

		if (event.key === "?") {
			event.preventDefault()
			toggleHelp()
			return
		}
		if (event.key === ":") {
			event.preventDefault()
			openSettings("tabs")
			return
		}
		if (event.key === "/") {
			event.preventDefault()
			startSearch()
			return
		}
		if (event.key === "n") {
			event.preventDefault()
			jumpSearch(1)
			return
		}
		if (event.key === "N") {
			event.preventDefault()
			jumpSearch(-1)
			return
		}
		if (event.key === "G") {
			event.preventDefault()
			bottom()
			renderTabs()
			return
		}
		if (event.key === "Escape") {
			event.preventDefault()
			if (clearSearch()) return
			commit()
			return
		}
		if (nav[event.key]) {
			event.preventDefault()
			nav[event.key]()
			renderTabs()
			return
		}
		if (event.key === "d") {
			event.preventDefault()
			actions.markRemove()
			return
		}
		if (event.key === "X") {
			event.preventDefault()
			closeAndSend({
				type: "stashWindow",
				windowId: state.wins[state.sel.w].id,
			})
			return
		}
		if (event.key === "u") {
			event.preventDefault()
			actions.undoDel()
			return
		}
		if (event.key === "y") {
			event.preventDefault()
			actions.yankCopy()
			return
		}
		if (event.key === "p") {
			event.preventDefault()
			actions.paste(false)
			return
		}
		if (event.key === "P") {
			event.preventDefault()
			actions.paste(true)
			return
		}
		if (event.key === '"') {
			event.preventDefault()
			toggleStash()
			return
		}
		if (event.key === "'") {
			event.preventDefault()
			closeAndSend({ type: "openStash" })
			return
		}
		if (event.key === "b") {
			event.preventDefault()
			actions.bookmark()
			return
		}
		if (event.key === "Enter") {
			event.preventDefault()
			focusTab()
		}
	}

	function attachListeners() {
		window.addEventListener("keydown", onKey, true)
	}

	return {
		attachListeners,
	}
}
