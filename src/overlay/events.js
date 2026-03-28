import { curTab } from "./state.js"
import { getSettings, normalizeDomain, saveSettings } from "../shared/settings.js"

const settingsColumnCounts = [() => 0, () => 4, () => 5, () => 3]

export function createEventHandlers({
	backdrop,
	render,
	renderTabs,
	state,
	actions,
	applyUiSettings,
}) {
	function compareMarks(a, b) {
		const recentDiff = (b.lastUsedAt || 0) - (a.lastUsedAt || 0)
		const usageDiff = (b.usageCount || 0) - (a.usageCount || 0)
		if (state.settings.quickMarkSort === "recent") {
			if (recentDiff !== 0) return recentDiff
			if (usageDiff !== 0) return usageDiff
		} else {
			if (usageDiff !== 0) return usageDiff
			if (recentDiff !== 0) return recentDiff
		}
		return compareMarkKeys(a.key, b.key)
	}

	function compareMarkKeys(a, b) {
		const foldedDiff = a.toLowerCase().localeCompare(b.toLowerCase())
		if (foldedDiff !== 0) return foldedDiff
		if (a === b) return 0
		if (state.settings.markAlphaOrder === "capital-first") {
			return a === a.toUpperCase() ? -1 : 1
		}
		return a === a.toLowerCase() ? -1 : 1
	}

	function clearMarksState() {
		state.marks.pending = null
		state.marks.status = ""
	}

	function clearMarksStatus() {
		state.marks.status = ""
	}

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
		clearMarksState()
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
		state.settings.sel.col = Math.max(0, Math.min(state.settings.sel.col, 3))
		state.settings.sel.rows[0] = Math.max(
			0,
			Math.min(
				state.settings.sel.rows[0],
				state.settings.excludedDomains.length + (state.settings.editing ? 1 : 0) - 1,
			),
		)
		state.settings.sel.rows[1] = Math.max(
			0,
			Math.min(state.settings.sel.rows[1], settingsColumnCounts[1]() - 1),
		)
		state.settings.sel.rows[2] = Math.max(
			0,
			Math.min(state.settings.sel.rows[2], settingsColumnCounts[2]() - 1),
		)
		state.settings.sel.rows[3] = Math.max(
			0,
			Math.min(state.settings.sel.rows[3], settingsColumnCounts[3]() - 1),
		)
	}

	function getMarkColumns() {
		const marks = Object.values(state.marks.items || {})
		const sortMarks =
			state.marks.mode === "quick"
				? [...marks].sort(compareMarks)
				: [...marks].sort((a, b) => compareMarkKeys(a.key, b.key))
		if (state.marks.mode === "quick") return [sortMarks, []]
		const temporary = sortMarks.filter(
			(mark) => mark.key === mark.key.toLowerCase() && mark.live,
		)
		const persistent = sortMarks.filter((mark) => mark.key === mark.key.toUpperCase())
		return [temporary, persistent]
	}

	function currentSelectedMark() {
		const columns = getMarkColumns()
		return (
			columns[state.marks.sel.col]?.[state.marks.sel.rows[state.marks.sel.col]] || null
		)
	}

	function clampMarksSelection() {
		const columns = getMarkColumns()
		const maxCol = state.marks.mode === "quick" ? 0 : 1
		state.marks.sel.col = Math.max(0, Math.min(state.marks.sel.col, maxCol))
		state.marks.sel.rows[0] = Math.max(
			0,
			Math.min(state.marks.sel.rows[0], Math.max(columns[0].length - 1, 0)),
		)
		state.marks.sel.rows[1] = Math.max(
			0,
			Math.min(state.marks.sel.rows[1], Math.max(columns[1].length - 1, 0)),
		)
	}

	async function persistSettings() {
		await saveSettings({
			excludedDomains: state.settings.excludedDomains,
			quickMarkSort: state.settings.quickMarkSort,
			markAlphaOrder: state.settings.markAlphaOrder,
			density: state.settings.density,
			labelSize: state.settings.labelSize,
			theme: state.settings.theme,
		})
	}

	async function excludeCurrentTabHostname() {
		const tab = currentLiveTab()
		if (!tab?.url) return

		const domain = normalizeDomain(tab.url)
		if (!domain) {
			state.settings.status = "Could not extract a hostname from the selected tab."
			renderTabs()
			return
		}

		if (state.settings.excludedDomains.includes(domain)) {
			state.settings.status = `${domain} is already excluded.`
			renderTabs()
			return
		}

		state.settings.excludedDomains = [...state.settings.excludedDomains, domain]
		await persistSettings()
		state.settings.status = `Added ${domain} to excluded hostnames.`
		renderTabs()
	}

	function resetSettingsStatus() {
		state.settings.status = ""
	}

	function currentMarkTarget() {
		return state.marks.targetTab || currentLiveTab()
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

	function currentLiveTab() {
		return state.wins[state.sel.w]?.tabs[state.sel.t]
	}

	function isMarkKey(key) {
		return /^[a-zA-Z]$/.test(key || "")
	}

	function startMarkMode(mode) {
		state.marks.pending = mode
		clearMarksStatus()
		renderTabs()
	}

	function setMark(key) {
		const tab = currentLiveTab()
		if (!tab?.id || tab._temp) return

		chrome.runtime.sendMessage(
			{
				type: "setMark",
				key,
				tab: {
					id: tab.id,
					windowId: state.wins[state.sel.w].id,
					title: tab.title,
					url: tab.url,
					favIconUrl: tab.favIconUrl,
				},
			},
			() => {
				chrome.runtime.sendMessage({ type: "getMarksData" }, (marksData) => {
					state.marks.items = marksData.marks || {}
					state.marks.pending = null
					state.marks.status = `Marked this tab as <code>${key}</code>.`
					renderTabs()
				})
			},
		)
	}

	function jumpToMark(key) {
		closeAndSend({ type: "openMark", key })
	}

	function saveCurrentMark(persistent) {
		const tab = currentMarkTarget()
		const key = state.marks.draftKey
		if (!tab?.id || !key) return

		const markKey = persistent ? key.toUpperCase() : key.toLowerCase()
		chrome.runtime.sendMessage(
			{
				type: "setMark",
				key: markKey,
				tab: {
					id: tab.id,
					windowId: tab.windowId,
					title: tab.title,
					url: tab.url,
					favIconUrl: tab.favIconUrl,
				},
			},
			() => {
				commit(tab.id)
			},
		)
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
		if (state.view === "help") {
			state.view = state.helpReturnView || "tabs"
		} else {
			state.helpReturnView = state.view
			if (state.view === "stash") state.helpTab = "stash"
			else if (state.view === "marks") state.helpTab = "marks"
			else if (state.view === "tabs") state.helpTab = "tabs"
			else state.helpTab = "general"
			state.view = "help"
		}
		render()
	}

	function scrollHelp(amount) {
		const help = document.querySelector(".vtm-help")
		if (!help) return
		help.scrollBy({ top: amount, behavior: "smooth" })
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

	function toggleMarks() {
		if (state.view === "marks") {
			state.view = "tabs"
			state.marks.mode = "browse"
			state.marks.sel.col = 0
			clampMarksSelection()
			render()
			return
		}
		state.view = "marks"
		state.marks.mode = "browse"
		state.marks.sel.col = 0
		clampMarksSelection()
		render()
	}

	function openGlobalView(key) {
		if (key === "?") {
			toggleHelp()
			return true
		}
		if (key === ":") {
			if (state.view === "settings") leaveSettings()
			else openSettings(state.view)
			return true
		}
		if (key === '"') {
			toggleStash()
			return true
		}
		if (key === "M") {
			toggleMarks()
			return true
		}
		return false
	}

	function refreshMarks(callback) {
		chrome.runtime.sendMessage({ type: "getMarksData" }, (marksData) => {
			state.marks.items = marksData.marks || {}
			clampMarksSelection()
			if (callback) callback()
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
		state.settings.quickMarkSort = settings.quickMarkSort
		state.settings.markAlphaOrder = settings.markAlphaOrder
		state.settings.density = settings.density
		state.settings.labelSize = settings.labelSize
		state.settings.theme = settings.theme
		clampSettingsSelection()
		state.view = "settings"
		applyUiSettings()
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
		if (state.settings.sel.col !== 0) return
		resetSettingsStatus()
		const baseIndex = state.settings.excludedDomains.length
			? state.settings.sel.rows[0] + offset
			: 0
		state.settings.editing = true
		state.settings.draft = ""
		state.settings.insertIndex = Math.max(
			0,
			Math.min(baseIndex, state.settings.excludedDomains.length),
		)
		state.settings.sel.rows[0] = state.settings.insertIndex
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
		state.settings.sel.rows[0] = state.settings.excludedDomains.indexOf(domain)
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
		if (
			state.settings.editing ||
			state.settings.sel.col !== 0 ||
			!state.settings.excludedDomains.length
		) {
			return
		}
		const [removed] = state.settings.excludedDomains.splice(
			state.settings.sel.rows[0],
			1,
		)
		clampSettingsSelection()
		state.settings.status = removed ? `Removed ${removed} from the exclusion list.` : ""
		await persistSettings()
		render()
	}

	async function applyCurrentSettingsOption() {
		resetSettingsStatus()
		if (state.settings.sel.col === 1) {
			if (state.settings.sel.rows[1] < 2) {
				const sortMap = ["recent", "frequent"]
				state.settings.quickMarkSort = sortMap[state.settings.sel.rows[1]]
				state.settings.status = `Quick marks set to ${state.settings.quickMarkSort} first.`
			} else {
				const alphaMap = ["small-first", "capital-first"]
				state.settings.markAlphaOrder = alphaMap[state.settings.sel.rows[1] - 2]
				state.settings.status = `Alphabetical mark order set to ${state.settings.markAlphaOrder}.`
			}
		}

		if (state.settings.sel.col === 2) {
			if (state.settings.sel.rows[2] < 2) {
				state.settings.density =
					state.settings.sel.rows[2] === 0 ? "comfortable" : "compact"
				state.settings.status = `Density set to ${state.settings.density}.`
			} else {
				const sizeMap = ["small", "medium", "large"]
				state.settings.labelSize = sizeMap[state.settings.sel.rows[2] - 2]
				state.settings.status = `Window label size set to ${state.settings.labelSize}.`
			}
		}

		if (state.settings.sel.col === 3) {
			const themeMap = ["rose-pine", "rose-pine-moon", "rose-pine-dawn"]
			state.settings.theme = themeMap[state.settings.sel.rows[3]]
			state.settings.status = `Theme set to ${state.settings.theme.replaceAll("-", " ")}.`
		}

		await persistSettings()
		applyUiSettings()
		render()
	}

	function onKey(event) {
		if (state.marks.pending) {
			if (event.key === "Escape") {
				event.preventDefault()
				clearMarksState()
				renderTabs()
				return
			}
			if (isMarkKey(event.key)) {
				event.preventDefault()
				state.marks.pending === "set" ? setMark(event.key) : jumpToMark(event.key)
			}
			return
		}

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

		if (
			state.view !== "mark-create" &&
			!state.settings.editing &&
			!state.search.active &&
			!(state.view === "marks" && state.marks.mode === "quick") &&
			["?", ":", '"', "M"].includes(event.key)
		) {
			event.preventDefault()
			clearMarksStatus()
			if (openGlobalView(event.key)) return
		}

		if (state.view === "help") {
			clearMarksStatus()
			const helpTabs = ["general", "tabs", "stash", "marks"]
			const helpIndex = helpTabs.indexOf(state.helpTab)
			if (event.key === "h") {
				event.preventDefault()
				state.helpTab = helpTabs[Math.max(helpIndex - 1, 0)]
				render()
				return
			}
			if (event.key === "l") {
				event.preventDefault()
				state.helpTab = helpTabs[Math.min(helpIndex + 1, helpTabs.length - 1)]
				render()
				return
			}
			if (event.key === "j") {
				event.preventDefault()
				scrollHelp(120)
				return
			}
			if (event.key === "k") {
				event.preventDefault()
				scrollHelp(-120)
				return
			}
			if (event.key === "J") {
				event.preventDefault()
				scrollHelp(320)
				return
			}
			if (event.key === "K") {
				event.preventDefault()
				scrollHelp(-320)
				return
			}
			return
		}

		if (state.view === "stash") {
			clearMarksStatus()
			if (event.key === "'") {
				event.preventDefault()
				startMarkMode("jump")
				return
			}
			if (event.key === ";") {
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

		if (state.view === "marks") {
			const quickMode = state.marks.mode === "quick"
			if (event.key === "Escape") {
				event.preventDefault()
				if (state.marks.pending) {
					clearMarksState()
					render()
					return
				}
				toggleMarks()
				return
			}
			if (event.key === "'") {
				if (quickMode) return
				event.preventDefault()
				startMarkMode("jump")
				return
			}
			if (quickMode && isMarkKey(event.key) && state.marks.items[event.key]) {
				event.preventDefault()
				jumpToMark(event.key)
				return
			}
			if (quickMode && event.ctrlKey && event.key === "n") {
				event.preventDefault()
				const columns = getMarkColumns()
				state.marks.sel.rows[0] = Math.min(
					state.marks.sel.rows[0] + 1,
					Math.max(columns[0].length - 1, 0),
				)
				render()
				return
			}
			if (quickMode && event.ctrlKey && event.key === "p") {
				event.preventDefault()
				state.marks.sel.rows[0] = Math.max(state.marks.sel.rows[0] - 1, 0)
				render()
				return
			}
			if (event.key === "d") {
				if (quickMode) return
				event.preventDefault()
				const mark = currentSelectedMark()
				if (!mark) return
				chrome.runtime.sendMessage({ type: "deleteMark", key: mark.key }, () => {
					state.marks.status = `Removed mark <code>${mark.key}</code>.`
					refreshMarks()
				})
				return
			}
			if (event.key === "j") {
				event.preventDefault()
				const col = state.marks.sel.col
				const columns = getMarkColumns()
				state.marks.sel.rows[col] = Math.min(
					state.marks.sel.rows[col] + 1,
					Math.max(columns[col].length - 1, 0),
				)
				render()
				return
			}
			if (event.key === "k") {
				event.preventDefault()
				const col = state.marks.sel.col
				state.marks.sel.rows[col] = Math.max(state.marks.sel.rows[col] - 1, 0)
				render()
				return
			}
			if (event.key === "h") {
				if (quickMode) return
				event.preventDefault()
				state.marks.sel.col = Math.max(state.marks.sel.col - 1, 0)
				render()
				return
			}
			if (event.key === "l") {
				if (quickMode) return
				event.preventDefault()
				state.marks.sel.col = Math.min(state.marks.sel.col + 1, 1)
				render()
				return
			}
			if (event.key === "Enter") {
				event.preventDefault()
				const columns = getMarkColumns()
				const mark =
					columns[state.marks.sel.col][state.marks.sel.rows[state.marks.sel.col]]
				if (mark) jumpToMark(mark.key)
				return
			}
			return
		}

		if (state.view === "mark-create") {
			if (event.key === "Escape") {
				event.preventDefault()
				commit(state.marks.targetTab?.id)
				return
			}
			if (event.key === "Backspace") {
				event.preventDefault()
				state.marks.draftKey = ""
				render()
				return
			}
			if (event.key === "Enter") {
				event.preventDefault()
				if (!state.marks.draftKey) return
				saveCurrentMark(event.shiftKey)
				return
			}
			if (isMarkKey(event.key)) {
				event.preventDefault()
				state.marks.draftKey = event.key.toLowerCase()
				render()
			}
			return
		}

		if (state.view === "settings") {
			clearMarksStatus()
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
				const col = state.settings.sel.col
				const maxRow =
					col === 0
						? state.settings.excludedDomains.length - 1
						: settingsColumnCounts[col]() - 1
				state.settings.sel.rows[col] = Math.min(
					state.settings.sel.rows[col] + 1,
					maxRow,
				)
				resetSettingsStatus()
				render()
				return
			}
			if (event.key === "k") {
				event.preventDefault()
				const col = state.settings.sel.col
				state.settings.sel.rows[col] = Math.max(state.settings.sel.rows[col] - 1, 0)
				resetSettingsStatus()
				render()
				return
			}
			if (event.key === "h") {
				event.preventDefault()
				state.settings.sel.col = Math.max(state.settings.sel.col - 1, 0)
				resetSettingsStatus()
				render()
				return
			}
			if (event.key === "l") {
				event.preventDefault()
				state.settings.sel.col = Math.min(state.settings.sel.col + 1, 3)
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
				return
			}
			if (event.key === "Enter") {
				event.preventDefault()
				applyCurrentSettingsOption()
			}
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
			clearMarksStatus()
			bottom()
			renderTabs()
			return
		}
		if (event.key === "Escape") {
			event.preventDefault()
			clearMarksStatus()
			if (clearSearch()) return
			commit()
			return
		}
		if (nav[event.key]) {
			event.preventDefault()
			clearMarksStatus()
			nav[event.key]()
			renderTabs()
			return
		}
		if (event.key === "d") {
			event.preventDefault()
			clearMarksStatus()
			actions.markRemove()
			return
		}
		if (event.key === "X") {
			event.preventDefault()
			clearMarksStatus()
			closeAndSend({
				type: "stashWindow",
				windowId: state.wins[state.sel.w].id,
			})
			return
		}
		if (event.key === "u") {
			event.preventDefault()
			clearMarksStatus()
			actions.undoDel()
			return
		}
		if (event.key === "y") {
			event.preventDefault()
			clearMarksStatus()
			actions.yankCopy()
			return
		}
		if (event.key === "p") {
			event.preventDefault()
			clearMarksStatus()
			actions.paste(false)
			return
		}
		if (event.key === "P") {
			event.preventDefault()
			clearMarksStatus()
			actions.paste(true)
			return
		}
		if (event.key === '"') {
			event.preventDefault()
			clearMarksStatus()
			toggleStash()
			return
		}
		if (event.key === "M") {
			event.preventDefault()
			clearMarksStatus()
			toggleMarks()
			return
		}
		if (event.key === "'") {
			event.preventDefault()
			startMarkMode("jump")
			return
		}
		if (event.key === ";") {
			event.preventDefault()
			clearMarksStatus()
			closeAndSend({ type: "openStash" })
			return
		}
		if (event.key === "b") {
			event.preventDefault()
			clearMarksStatus()
			actions.bookmark()
			return
		}
		if (event.key === "e") {
			event.preventDefault()
			clearMarksStatus()
			excludeCurrentTabHostname()
			return
		}
		if (event.key === "m") {
			event.preventDefault()
			startMarkMode("set")
			return
		}
		if (event.key === "Enter") {
			event.preventDefault()
			clearMarksStatus()
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
