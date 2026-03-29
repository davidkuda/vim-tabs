import { getSettings, normalizeDomain, saveSettings } from "../shared/settings.js"
import { getHelpTabForView, getCurrentLiveTab, collectMatches } from "./selectors.js"
import { handleCommandPaletteKeys } from "./controllers/command.js"
import { handleHelpKeys } from "./controllers/help.js"
import { handleMarkCreateKeys } from "./controllers/mark-create.js"
import { handleMarksKeys } from "./controllers/marks.js"
import { handleSettingsKeys } from "./controllers/settings.js"
import { handleStashKeys } from "./controllers/stash.js"
import { handleTabsKeys } from "./controllers/tabs.js"
import { getCommandPaletteItems } from "./commands.js"
import type { OverlayControllerContext } from "./controllers/types.js"
import { curTab } from "./state.js"

const settingsColumnCounts = [() => 0, () => 4, () => 7, () => 3]

export function createEventHandlers({
	backdrop,
	render,
	renderTabs,
	store,
	sessionId,
	state,
	actions,
	applyUiSettings,
}) {
	function clearMarksState() {
		store.dispatch({ type: "marks/clear-pending" })
	}

	function clearMarksStatus() {
		store.dispatch({ type: "marks/set-status", status: "" })
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
		store.startSearch(render)
	}

	function cancelSearch() {
		store.cancelSearch(render)
	}

	function clearSearch() {
		if (state.search.active) {
			cancelSearch()
			return true
		}
		if (state.search.lastQuery) {
			store.dispatch({ type: "search/clear-last-query" })
			render()
			return true
		}
		return false
	}

	function updateSearch(query) {
		store.dispatch({ type: "search/update", query })
		const matches = collectMatches(state, query)
		if (matches.length) selectMatch(matches, 0)
		else if (state.search.originSel) store.restoreSelectionSnapshot(state.search.originSel)
		render()
	}

	function confirmSearch() {
		if (state.search.query) {
			const matches = collectMatches(state, state.search.query)
			if (matches.length) {
				state.search.lastQuery = state.search.query
				selectMatch(matches, 0)
			}
		}
		store.finishSearch(render)
	}

	function jumpSearch(direction) {
		if (!state.search.lastQuery) return
		const matches = collectMatches(state, state.search.lastQuery)
		if (!matches.length) return

		const currentIndex = matches.findIndex((match) => {
			if (state.view === "stash") {
				return match.s === state.stash.sel.s && match.t === state.stash.sel.t
			}
			return match.w === state.sel.w && match.t === state.sel.t
		})

		selectMatch(matches, currentIndex === -1 ? 0 : currentIndex + direction)
		render()
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

	async function persistSettings() {
		await saveSettings({
			excludedDomains: state.settings.excludedDomains,
			quickMarkSort: state.settings.quickMarkSort,
			markAlphaOrder: state.settings.markAlphaOrder,
			helpTextMode: state.settings.helpTextMode,
			density: state.settings.density,
			labelSize: state.settings.labelSize,
			theme: state.settings.theme,
		})
	}

	async function excludeCurrentTabHostname() {
		const tab = getCurrentLiveTab(state)
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

	function currentMarkTarget() {
		return state.marks.targetTab || getCurrentLiveTab(state)
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
			sessionId,
		})
	}

	function closeAndSend(message) {
		detachListeners()
		backdrop.remove()
		chrome.runtime.sendMessage({
			...message,
			sessionId,
		})
	}

	function isMarkKey(key) {
		return /^[a-zA-Z]$/.test(key || "")
	}

	function startMarkMode(mode) {
		store.dispatch({ type: "marks/set-pending", pending: mode })
		renderTabs()
	}

	function setMark(key) {
		const tab = getCurrentLiveTab(state)
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
			() => commit(tab.id),
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
			sessionId,
		})
	}

	function openStandaloneStash() {
		closeAndSend({ type: "openStash" })
	}

	function stashCurrentWindow() {
		closeAndSend({
			type: "stashWindow",
			windowId: state.wins[state.sel.w].id,
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
			return
		}
		commit(tab.id)
	}

	function toggleHelp() {
		if (state.view === "help") {
			store.dispatch({ type: "help/close" })
		} else {
			store.dispatch({
				type: "help/open",
				returnView: state.view,
				helpTab: getHelpTabForView(state),
			})
		}
		render()
	}

	function scrollHelp(amount) {
		document.querySelector(".vtm-help")?.scrollBy({ top: amount, behavior: "smooth" })
	}

	function toggleStash() {
		if (state.view === "stash") {
			store.dispatch({ type: "view/set", view: "tabs" })
			render()
			return
		}
		chrome.runtime.sendMessage({ type: "getStashData" }, (stashData) => {
			state.stash.sessions = stashData.sessions || []
			clampStashSelection()
			store.dispatch({ type: "view/set", view: "stash" })
			render()
		})
	}

	function toggleMarks() {
		if (state.view === "marks") {
			state.marks.mode = "browse"
			state.marks.sel.col = 0
			store.dispatch({ type: "view/set", view: "tabs" })
			render()
			return
		}
		state.marks.mode = "browse"
		state.marks.sel.col = 0
		store.dispatch({ type: "view/set", view: "marks" })
		render()
	}

	async function openSettings(view = state.view) {
		state.settings.status = ""
		state.settings.editing = false
		state.settings.draft = ""
		state.settings.insertIndex = 0
		state.settings.returnView = view === "settings" ? "tabs" : view
		const settings = await getSettings()
		state.settings.excludedDomains = settings.excludedDomains || []
		state.settings.quickMarkSort = settings.quickMarkSort
		state.settings.markAlphaOrder = settings.markAlphaOrder
		state.settings.helpTextMode = settings.helpTextMode
		state.settings.density = settings.density
		state.settings.labelSize = settings.labelSize
		state.settings.theme = settings.theme
		clampSettingsSelection()
		store.dispatch({ type: "view/set", view: "settings" })
		applyUiSettings()
		render()
	}

	function leaveSettings() {
		state.settings.status = ""
		state.settings.editing = false
		state.settings.draft = ""
		state.settings.insertIndex = 0
		store.dispatch({ type: "view/set", view: state.settings.returnView || "tabs" })
		render()
	}

	function startSettingsInsert(offset) {
		if (state.settings.sel.col !== 0) return
		state.settings.status = ""
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
		state.settings.status = ""
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
		const [removed] = state.settings.excludedDomains.splice(state.settings.sel.rows[0], 1)
		clampSettingsSelection()
		state.settings.status = removed ? `Removed ${removed} from the exclusion list.` : ""
		await persistSettings()
		render()
	}

	async function applyCurrentSettingsOption() {
		state.settings.status = ""
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
			} else if (state.settings.sel.rows[2] < 5) {
				const sizeMap = ["small", "medium", "large"]
				state.settings.labelSize = sizeMap[state.settings.sel.rows[2] - 2]
				state.settings.status = `Window label size set to ${state.settings.labelSize}.`
			} else {
				const helpTextMap = ["normal", "minimal"]
				state.settings.helpTextMode = helpTextMap[state.settings.sel.rows[2] - 5]
				state.settings.status = `Inline help text set to ${state.settings.helpTextMode}.`
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

	function openCommandPalette() {
		store.dispatch({
			type: "command/open",
			items: getCommandPaletteItems(state),
		})
		render()
	}

	function closeCommandPalette() {
		store.dispatch({ type: "command/close" })
		render()
	}

	function updateCommandPaletteQuery(query) {
		store.dispatch({
			type: "command/update-query",
			query,
			items: getCommandPaletteItems(state, query),
		})
		render()
	}

	function moveCommandPaletteSelection(delta) {
		const items = state.command.items
		if (!items.length) return
		const next = ((state.command.sel + delta) % items.length + items.length) % items.length
		store.dispatch({ type: "command/select", index: next })
		render()
	}

	function executeCommandById(id) {
		const handlers = {
			"focus-selected-tab": () => focusTab(),
			"open-help": () => toggleHelp(),
			"open-settings": () => openSettings(state.view),
			"open-stash": () => toggleStash(),
			"open-full-stash": () => openStandaloneStash(),
			"open-marks": () => toggleMarks(),
			"stash-current-window": () => stashCurrentWindow(),
			"bookmark-selected-tab": () => actions.bookmark(),
			"exclude-current-domain": () => excludeCurrentTabHostname(),
			"set-mark": () => startMarkMode("set"),
			"jump-to-mark": () => startMarkMode("jump"),
			"close-overlay": () => commit(),
		}
		const handler = handlers[id]
		if (handler) {
			closeCommandPalette()
			handler()
		}
	}

	function executeSelectedCommand() {
		const command = state.command.items[state.command.sel]
		if (!command) return
		executeCommandById(command.id)
	}

	const controllerContext: OverlayControllerContext = {
		state,
		render,
		renderTabs,
		clearMarksState,
		clearMarksStatus,
		clearSearch,
		startSearch,
		cancelSearch,
		confirmSearch,
		updateSearch,
		jumpSearch,
		startMarkMode,
		jumpToMark,
		openStashTab,
		openStashTabInBackground,
		openStandaloneStash,
		toggleStash,
		toggleMarks,
		toggleHelp,
		scrollHelp,
		clampStashSelection,
		commit,
		saveCurrentMark,
		startSettingsInsert,
		cancelSettingsInsert,
		confirmSettingsInsert,
		deleteSelectedSetting,
		applyCurrentSettingsOption,
		leaveSettings,
		actions,
		focusTab,
		excludeCurrentTabHostname,
		stashCurrentWindow,
		openCommandPalette,
		closeCommandPalette,
		updateCommandPaletteQuery,
		moveCommandPaletteSelection,
		executeSelectedCommand,
	}

	function onKey(event) {
		if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
			event.preventDefault()
			if (state.command.active) closeCommandPalette()
			else openCommandPalette()
			return
		}
		if (event.key === ">" && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault()
			if (!state.command.active) openCommandPalette()
			return
		}

		if (state.command.active) {
			if (handleCommandPaletteKeys(event, controllerContext)) return
		}

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
			if (event.key === "?") return toggleHelp()
			if (event.key === ":") return void openSettings(state.view)
			if (event.key === '"') return toggleStash()
			if (event.key === "M") return toggleMarks()
		}

		if (state.view === "help" && handleHelpKeys(event, controllerContext)) return
		if (state.view === "stash" && handleStashKeys(event, controllerContext)) return
		if (state.view === "marks" && handleMarksKeys(event, controllerContext)) return
		if (state.view === "mark-create" && handleMarkCreateKeys(event, controllerContext)) {
			return
		}
		if (state.view === "settings" && handleSettingsKeys(event, controllerContext)) return
		if (state.view === "tabs" && handleTabsKeys(event, controllerContext)) return
	}

	function attachListeners() {
		window.addEventListener("keydown", onKey, true)
	}

	return {
		attachListeners,
		closeOverlay: () => commit(),
		detachListeners,
	}
}
