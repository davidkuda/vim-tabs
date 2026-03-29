import { registerLinkCard } from "./components/link-card.js"
import { escapeHtml, getStashCounts, matchesTextQuery } from "./shared/ui.js"

registerLinkCard()

;(() => {
	const root = document.createElement("div")
	root.id = "vtm-stash"
	document.body.appendChild(root)

	const state = {
		sessions: [],
		sel: { s: 0, t: 0 },
		view: "stash",
		search: {
			active: false,
			query: "",
			lastQuery: "",
			originSel: null,
		},
	}

	function formatSessionDate(createdAt: number) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(createdAt)
	}

	function currentTab() {
		return state.sessions[state.sel.s]?.tabs[state.sel.t]
	}

	function countMatches(query: string) {
		if (!query) return 0
		let count = 0
		state.sessions.forEach((session) => {
			session.tabs.forEach((tab) => {
				if (matchesTextQuery(tab, query)) count++
			})
		})
		return count
	}

	function collectMatches(query: string) {
		if (!query) return []
		const matches = []
		state.sessions.forEach((session, si) => {
			session.tabs.forEach((tab, ti) => {
				if (matchesTextQuery(tab, query)) matches.push({ s: si, t: ti })
			})
		})
		return matches
	}

	function selectMatch(matches, index: number) {
		if (!matches.length) return
		const next = matches[((index % matches.length) + matches.length) % matches.length]
		state.sel.s = next.s
		state.sel.t = next.t
	}

	function clampSelection() {
		state.sel.s = Math.max(0, Math.min(state.sel.s, state.sessions.length - 1))
		const tabs = state.sessions[state.sel.s]?.tabs || []
		state.sel.t = Math.max(0, Math.min(state.sel.t, tabs.length - 1))
	}

	function highlight() {
		document
			.querySelectorAll(".vtm-stash-tab.vtm-selected")
			.forEach((node) => node.classList.remove("vtm-selected"))
		const current = document.querySelector(
			`.vtm-stash-tab[data-s="${state.sel.s}"][data-t="${state.sel.t}"]`,
		)
		if (current) {
			current.classList.add("vtm-selected")
			current.scrollIntoView({ block: "nearest", inline: "nearest" })
		}
	}

	function render() {
		root.innerHTML = ""

		const topbar = document.createElement("div")
		topbar.className = "vtm-stash-topbar"
		topbar.innerHTML = `
			<div class="vtm-stash-title">VimTabs Stash</div>
		`
		root.appendChild(topbar)

		if (state.view === "help") {
			renderHelp()
			return
		}

		if (!state.sessions.length) {
			const empty = document.createElement("div")
			empty.className = "vtm-stash-empty"
			empty.textContent = "No stashed tabs yet."
			root.appendChild(empty)
			return
		}

		const columns = document.createElement("div")
		columns.className = "vtm-stash-columns"
		const stashCounts = getStashCounts(state.sessions)

		state.sessions.forEach((session, si) => {
			const column = document.createElement("section")
			column.className = "vtm-stash-session"

			const head = document.createElement("div")
			head.className = "vtm-stash-session-head"
			head.innerHTML = `
				<div class="vtm-stash-date">${formatSessionDate(session.createdAt)}</div>
				<div class="vtm-stash-meta">${session.tabs.length} tab${session.tabs.length === 1 ? "" : "s"}</div>
			`
			column.appendChild(head)

			session.tabs.forEach((tab, ti) => {
				const item = document.createElement("vtm-link-card")
				item.className = "vtm-stash-tab"
				item.dataset.s = si
				item.dataset.t = ti
				const duplicateCount = stashCounts.get(tab.url) || 0
				item.data = {
					title: tab.title,
					url: tab.url,
					favIconUrl: tab.favIconUrl,
					countBadge: duplicateCount > 1 ? `${duplicateCount}x` : "",
				}
				item.matched = matchesTextQuery(
					tab,
					state.search.active ? state.search.query : state.search.lastQuery,
				)
				column.appendChild(item)
			})

			columns.appendChild(column)
		})

		root.appendChild(columns)

		const footer = document.createElement("div")
		footer.className = "vtm-stash-footer"
		if (state.search.active) {
			const matches = countMatches(state.search.query)
			footer.innerHTML = `<code>/</code>${escapeHtml(state.search.query || "")} <span>${matches} match${matches === 1 ? "" : "es"}</span>`
		} else if (state.search.lastQuery) {
			const matches = countMatches(state.search.lastQuery)
			footer.innerHTML = `Search <code>/${escapeHtml(state.search.lastQuery)}</code> active. Use <code>n</code> and <code>N</code> to jump through ${matches} match${matches === 1 ? "" : "es"}.`
		} else {
			footer.innerHTML = `Press <code>?</code> for stash help. Press <code>/</code> to search stashed tabs. Press <code>:</code> for settings.`
		}
		root.appendChild(footer)

		clampSelection()
		highlight()
	}

	function renderHelp() {
		const help = document.createElement("section")
		help.className = "vtm-stash-help"
		help.innerHTML = `
			<div class="vtm-stash-help-hero">
				<h2 class="vtm-stash-help-title">Browse stashed sessions like tabs</h2>
				<p class="vtm-stash-help-copy">Each column is one stashed window session. Search, move, and reopen tabs without leaving the keyboard.</p>
			</div>
			<div class="vtm-stash-help-groups">
				<section class="vtm-stash-help-group">
					<h3 class="vtm-stash-help-group-title">Navigation</h3>
					<div class="vtm-stash-help-list">
						<div class="vtm-stash-help-row"><code>j / k</code><span>move down or up</span></div>
						<div class="vtm-stash-help-row"><code>J / K</code><span>jump 5 tabs down or up</span></div>
						<div class="vtm-stash-help-row"><code>h / l</code><span>jump between sessions</span></div>
						<div class="vtm-stash-help-row"><code>g / G</code><span>go to top or bottom</span></div>
					</div>
				</section>
				<section class="vtm-stash-help-group">
					<h3 class="vtm-stash-help-group-title">Search</h3>
					<div class="vtm-stash-help-list">
						<div class="vtm-stash-help-row"><code>/ query</code><span>search stashed tabs</span></div>
						<div class="vtm-stash-help-row"><code>n / N</code><span>next / previous match</span></div>
						<div class="vtm-stash-help-row"><code>Esc</code><span>clear search</span></div>
					</div>
				</section>
				<section class="vtm-stash-help-group">
					<h3 class="vtm-stash-help-group-title">Open</h3>
					<div class="vtm-stash-help-list">
						<div class="vtm-stash-help-row"><code>Enter</code><span>open selected tab</span></div>
						<div class="vtm-stash-help-row"><code>Shift+Enter</code><span>open in background</span></div>
						<div class="vtm-stash-help-row"><code>:</code><span>open settings</span></div>
						<div class="vtm-stash-help-row"><code>?</code><span>return to stash</span></div>
					</div>
				</section>
			</div>
		`
		root.appendChild(help)

		const footer = document.createElement("div")
		footer.className = "vtm-stash-footer"
		footer.innerHTML = `Press <code>?</code> to return to the stash.`
		root.appendChild(footer)
	}

	function startSearch() {
		state.search.active = true
		state.search.query = ""
		state.search.originSel = { ...state.sel }
		render()
	}

	function cancelSearch() {
		if (state.search.originSel) state.sel = { ...state.search.originSel }
		state.search.active = false
		state.search.query = ""
		state.search.originSel = null
		render()
	}

	function clearSearch() {
		if (state.search.active) {
			cancelSearch()
			return true
		}
		if (state.search.lastQuery) {
			state.search.lastQuery = ""
			render()
			return true
		}
		return false
	}

	function updateSearch(query: string) {
		state.search.query = query
		const matches = collectMatches(query)
		if (matches.length) selectMatch(matches, 0)
		else if (state.search.originSel) state.sel = { ...state.search.originSel }
		render()
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
		render()
	}

	function jumpSearch(direction: number) {
		if (!state.search.lastQuery) return
		const matches = collectMatches(state.search.lastQuery)
		if (!matches.length) return
		const currentIndex = matches.findIndex((match) => {
			return match.s === state.sel.s && match.t === state.sel.t
		})
		selectMatch(matches, currentIndex === -1 ? 0 : currentIndex + direction)
		render()
	}

	function bottom() {
		const tabs = state.sessions[state.sel.s]?.tabs || []
		state.sel.t = tabs.length - 1
	}

	function onKey(event: KeyboardEvent) {
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
				chrome.runtime.sendMessage({ type: "openSettings" })
				return
			}
			if (event.key === "?") {
				event.preventDefault()
				state.view = "stash"
				render()
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
		if (event.key === "?") {
			event.preventDefault()
			state.view = "help"
			render()
			return
		}
		if (event.key === ":") {
			event.preventDefault()
			chrome.runtime.sendMessage({ type: "openSettings" })
			return
		}
		if (event.key === "Escape") {
			event.preventDefault()
			clearSearch()
			return
		}
		if (event.key === "j") {
			event.preventDefault()
			const tabs = state.sessions[state.sel.s]?.tabs || []
			state.sel.t = Math.min(state.sel.t + 1, tabs.length - 1)
			render()
			return
		}
		if (event.key === "k") {
			event.preventDefault()
			state.sel.t = Math.max(state.sel.t - 1, 0)
			render()
			return
		}
		if (event.key === "J") {
			event.preventDefault()
			const tabs = state.sessions[state.sel.s]?.tabs || []
			state.sel.t = Math.min(state.sel.t + 5, tabs.length - 1)
			render()
			return
		}
		if (event.key === "K") {
			event.preventDefault()
			state.sel.t = Math.max(state.sel.t - 5, 0)
			render()
			return
		}
		if (event.key === "h") {
			event.preventDefault()
			state.sel.s = Math.max(state.sel.s - 1, 0)
			clampSelection()
			render()
			return
		}
		if (event.key === "l") {
			event.preventDefault()
			state.sel.s = Math.min(state.sel.s + 1, state.sessions.length - 1)
			clampSelection()
			render()
			return
		}
		if (event.key === "g") {
			event.preventDefault()
			state.sel.t = 0
			render()
			return
		}
		if (event.key === "G") {
			event.preventDefault()
			bottom()
			render()
			return
		}
		if (event.key === "Enter") {
			event.preventDefault()
			const tab = currentTab()
			if (tab?.url) {
				chrome.runtime.sendMessage({
					type: "openStashedTab",
					url: tab.url,
					background: event.shiftKey,
				})
			}
		}
	}

	chrome.runtime.sendMessage({ type: "getStashData" }, (data) => {
		state.sessions = data?.sessions || []
		render()
		window.addEventListener("keydown", onKey, true)
	})
})()
