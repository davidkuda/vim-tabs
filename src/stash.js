;(() => {
	const root = document.createElement("div")
	root.id = "vtm-stash"
	document.body.appendChild(root)

	const state = {
		sessions: [],
		sel: { s: 0, t: 0 },
		search: {
			active: false,
			query: "",
			lastQuery: "",
			originSel: null,
		},
	}

	function formatUrl(url) {
		if (!url) return ""
		try {
			const parsed = new URL(url)
			const host = parsed.host.replace(/^www\./, "")
			const path = `${parsed.pathname}${parsed.search}` || "/"
			const compactPath = path.length > 36 ? `${path.slice(0, 33)}...` : path
			return `${host}${compactPath === "/" ? "" : compactPath}`
		} catch {
			return url.length > 52 ? `${url.slice(0, 49)}...` : url
		}
	}

	function formatSessionDate(createdAt) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(createdAt)
	}

	function currentTab() {
		return state.sessions[state.sel.s]?.tabs[state.sel.t]
	}

	function matchesTab(tab, query) {
		if (!query) return false
		const haystack = `${tab.title || ""} ${tab.url || ""}`.toLowerCase()
		return haystack.includes(query.toLowerCase())
	}

	function countMatches(query) {
		if (!query) return 0
		let count = 0
		state.sessions.forEach((session) => {
			session.tabs.forEach((tab) => {
				if (matchesTab(tab, query)) count++
			})
		})
		return count
	}

	function collectMatches(query) {
		if (!query) return []
		const matches = []
		state.sessions.forEach((session, si) => {
			session.tabs.forEach((tab, ti) => {
				if (matchesTab(tab, query)) matches.push({ s: si, t: ti })
			})
		})
		return matches
	}

	function selectMatch(matches, index) {
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
			<div class="vtm-stash-copy">Use <code>h</code>/<code>l</code>, <code>j</code>/<code>k</code>, <code>/</code>, <code>n</code>, <code>N</code>, <code>Enter</code>.</div>
		`
		root.appendChild(topbar)

		if (!state.sessions.length) {
			const empty = document.createElement("div")
			empty.className = "vtm-stash-empty"
			empty.textContent = "No stashed tabs yet."
			root.appendChild(empty)
			return
		}

		const columns = document.createElement("div")
		columns.className = "vtm-stash-columns"

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
				const item = document.createElement("div")
				item.className = "vtm-stash-tab"
				item.dataset.s = si
				item.dataset.t = ti
				if (
					matchesTab(
						tab,
						state.search.active ? state.search.query : state.search.lastQuery,
					)
				) {
					item.classList.add("vtm-match")
				}

				if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://")) {
					const img = document.createElement("img")
					img.className = "vtm-stash-favicon"
					img.src = tab.favIconUrl
					item.appendChild(img)
				}

				const meta = document.createElement("div")
				meta.className = "vtm-stash-meta-block"
				meta.innerHTML = `
					<div class="vtm-stash-tab-title">${tab.title}</div>
					<div class="vtm-stash-tab-url">${formatUrl(tab.url)}</div>
				`
				item.appendChild(meta)
				column.appendChild(item)
			})

			columns.appendChild(column)
		})

		root.appendChild(columns)

		const footer = document.createElement("div")
		footer.className = "vtm-stash-footer"
		if (state.search.active) {
			const matches = countMatches(state.search.query)
			footer.innerHTML = `<code>/</code>${state.search.query || ""} <span>${matches} match${matches === 1 ? "" : "es"}</span>`
		} else if (state.search.lastQuery) {
			const matches = countMatches(state.search.lastQuery)
			footer.innerHTML = `Search <code>/${state.search.lastQuery}</code> active. Use <code>n</code> and <code>N</code> to jump through ${matches} match${matches === 1 ? "" : "es"}.`
		} else {
			footer.innerHTML = `Press <code>/</code> to search stashed tabs.`
		}
		root.appendChild(footer)

		clampSelection()
		highlight()
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

	function updateSearch(query) {
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

	function jumpSearch(direction) {
		if (!state.search.lastQuery) return
		const matches = collectMatches(state.search.lastQuery)
		if (!matches.length) return
		const currentIndex = matches.findIndex((match) => {
			return match.s === state.sel.s && match.t === state.sel.t
		})
		selectMatch(matches, currentIndex === -1 ? 0 : currentIndex + direction)
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
		if (event.key === "Enter") {
			event.preventDefault()
			const tab = currentTab()
			if (tab?.url) chrome.tabs.create({ url: tab.url, active: true })
		}
	}

	chrome.storage.local.get("stashData", (data) => {
		state.sessions = data.stashData?.sessions || []
		render()
		window.addEventListener("keydown", onKey, true)
	})
})()
