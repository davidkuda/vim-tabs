import { getWindowColor } from "../shared/window-colors.js"

const layoutOptions = {
	density: [
		{
			value: "comfortable",
			title: "Comfortable density",
			subtitle: "More spacing and larger columns",
		},
		{
			value: "compact",
			title: "Compact density",
			subtitle: "Denser layout with more tabs on screen",
		},
	],
	labelSize: [
		{
			value: "small",
			title: "Window label small",
			subtitle: "Quieter badge size",
		},
		{
			value: "medium",
			title: "Window label medium",
			subtitle: "Balanced badge size",
		},
		{
			value: "large",
			title: "Window label large",
			subtitle: "Bold badge size",
		},
	],
}

const themeOptions = [
	{
		value: "rose-pine",
		title: "Rose Pine",
		subtitle: "Warm dark background",
	},
	{
		value: "rose-pine-moon",
		title: "Rose Pine Moon",
		subtitle: "Cooler dark background",
	},
	{
		value: "rose-pine-dawn",
		title: "Rose Pine Dawn",
		subtitle: "Light mode palette",
	},
]

export function createRenderer(state, columns, footer) {
	function escapeHtml(text) {
		return `${text || ""}`
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
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

	function matchesTab(tab, query) {
		if (!query) return false
		const haystack = `${tab.title || ""} ${tab.url || ""}`.toLowerCase()
		return haystack.includes(query.toLowerCase())
	}

	function buildCard(tab, wi, ti) {
		const card = document.createElement("div")
		card.className = "vtm-card"
		card.dataset.w = wi
		card.dataset.t = ti

		if (tab._removed) card.classList.add("vtm-removed")
		if (
			matchesTab(tab, state.search.active ? state.search.query : state.search.lastQuery)
		) {
			card.classList.add("vtm-match")
		}

		if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://")) {
			const img = document.createElement("img")
			img.className = "vtm-favicon"
			img.src = tab.favIconUrl
			card.appendChild(img)
		}

		const meta = document.createElement("div")
		meta.className = "vtm-meta"

		const title = document.createElement("span")
		title.className = "vtm-title"
		title.textContent = tab.title || tab.url

		const url = document.createElement("span")
		url.className = "vtm-url"
		url.textContent = formatUrl(tab.url)

		meta.append(title, url)
		card.appendChild(meta)

		return card
	}

	function highlight() {
		document
			.querySelectorAll(".vtm-card.vtm-selected")
			.forEach((element) => element.classList.remove("vtm-selected"))

		const current = document.querySelector(
			`.vtm-card[data-w="${state.sel.w}"][data-t="${state.sel.t}"]`,
		)

		if (current) {
			current.classList.add("vtm-selected")
			current.scrollIntoView({ block: "nearest", inline: "nearest" })
		}
	}

	function highlightStash() {
		document
			.querySelectorAll(".vtm-stash-tab.vtm-selected")
			.forEach((node) => node.classList.remove("vtm-selected"))

		const current = document.querySelector(
			`.vtm-stash-tab[data-s="${state.stash.sel.s}"][data-t="${state.stash.sel.t}"]`,
		)

		if (current) {
			current.classList.add("vtm-selected")
			current.scrollIntoView({ block: "nearest", inline: "nearest" })
		}
	}

	function highlightSettings() {
		document
			.querySelectorAll(".vtm-settings-card.vtm-selected")
			.forEach((node) => node.classList.remove("vtm-selected"))

		const current = document.querySelector(
			`.vtm-settings-card[data-col="${state.settings.sel.col}"][data-row="${state.settings.sel.rows[state.settings.sel.col]}"]`,
		)

		if (current) {
			current.classList.add("vtm-selected")
			current.scrollIntoView({ block: "nearest", inline: "nearest" })
		}
	}

	function renderTabs() {
		columns.innerHTML = ""

		state.wins.forEach((win, wi) => {
			const windowColor = getWindowColor(win, wi, state.settings.theme)
			const col = document.createElement("div")
			col.className = "vtm-col"
			col.dataset.w = wi
			col.style.borderColor = windowColor.accent
			col.style.background = windowColor.surface
			columns.appendChild(col)

			const header = document.createElement("div")
			header.className = "vtm-col-header"
			header.style.background = windowColor.accent
			header.textContent = windowColor.label
			col.appendChild(header)

			win.tabs.forEach((tab, ti) => {
				col.appendChild(buildCard(tab, wi, ti))
			})
		})

		highlight()
		if (state.search.active) {
			const matches = countMatches(state.search.query)
			footer.innerHTML = `
				<div class="vtm-footer-copy"><code>/</code>${state.search.query || ""}<span class="vtm-footer-meta">${matches} match${matches === 1 ? "" : "es"}</span></div>
			`
			return
		}

		if (state.search.lastQuery) {
			const matches = countMatches(state.search.lastQuery)
			footer.innerHTML = `
				<div class="vtm-footer-copy">Search <code>/${state.search.lastQuery}</code> active. Use <code>n</code> and <code>N</code> to jump through ${matches} match${matches === 1 ? "" : "es"}.</div>
			`
			return
		}

		footer.innerHTML = `
			<div class="vtm-footer-copy">Press <code>?</code> for shortcuts. Press <code>/</code> to search tabs. Press <code>:</code> for settings. Press <code>Esc</code> to apply.</div>
		`
	}

	function countMatches(query) {
		if (!query) return 0
		let count = 0
		state.wins.forEach((win) => {
			win.tabs.forEach((tab) => {
				if (matchesTab(tab, query)) count++
			})
		})
		return count
	}

	function renderHelp() {
		columns.innerHTML = ""

		const help = document.createElement("section")
		help.className = "vtm-help"

		const hero = document.createElement("div")
		hero.className = "vtm-help-hero"
		hero.innerHTML = `
			<h2 class="vtm-help-title">Move fast across windows and tabs</h2>
			<p class="vtm-help-copy">Everything here stays keyboard-first. Cut, move, duplicate, bookmark, and focus tabs without leaving the overlay.</p>
		`
		help.appendChild(hero)

		const groups = document.createElement("div")
		groups.className = "vtm-help-groups"

		const addGroup = (title, items) => {
			const section = document.createElement("section")
			section.className = "vtm-help-group"

			const heading = document.createElement("h3")
			heading.className = "vtm-help-group-title"
			heading.textContent = title
			section.appendChild(heading)

			const list = document.createElement("div")
			list.className = "vtm-help-list"

			items.forEach(([key, action]) => {
				const row = document.createElement("div")
				row.className = "vtm-help-row"
				row.innerHTML = `<code>${key}</code><span>${action}</span>`
				list.appendChild(row)
			})

			section.appendChild(list)
			groups.appendChild(section)
		}

		addGroup("Navigation", [
			["j / k", "move down or up"],
			["J / K", "jump 5 tabs down or up"],
			["h / l", "jump between windows"],
			["g / G", "go to top or bottom"],
			["/ query", "search tabs"],
			["n / N", "next / previous match"],
			["Enter", "focus selected tab"],
		])

		addGroup("Tab Actions", [
			["d", "cut tab"],
			["X", "stash window"],
			["y", "copy tab"],
			["p / P", "paste below or above"],
			['"', "stash in overlay"],
			["'", "open stash page"],
			["b", "bookmark tab"],
		])

		addGroup("Session", [
			["u", "undo delete"],
			[":", "open settings"],
			["?", "toggle this help"],
			["Esc", "apply changes and close"],
		])

		addGroup("Stash", [
			["X", "stash selected window"],
			['"', "open stash inside overlay"],
			["'", "open full stash page"],
			[":", "open settings"],
		])

		help.appendChild(groups)
		columns.appendChild(help)
		footer.innerHTML = `
			<div class="vtm-footer-copy">Press <code>?</code> to return to the tabs overview.</div>
		`
	}

	function renderStashHelp() {
		columns.innerHTML = ""

		const help = document.createElement("section")
		help.className = "vtm-help"

		const hero = document.createElement("div")
		hero.className = "vtm-help-hero"
		hero.innerHTML = `
			<h2 class="vtm-help-title">Browse stashed sessions like tabs</h2>
			<p class="vtm-help-copy">Each column is one stashed window session. Search, move, and reopen tabs without leaving the keyboard.</p>
		`
		help.appendChild(hero)

		const groups = document.createElement("div")
		groups.className = "vtm-help-groups"

		const addGroup = (title, items) => {
			const section = document.createElement("section")
			section.className = "vtm-help-group"

			const heading = document.createElement("h3")
			heading.className = "vtm-help-group-title"
			heading.textContent = title
			section.appendChild(heading)

			const list = document.createElement("div")
			list.className = "vtm-help-list"

			items.forEach(([key, action]) => {
				const row = document.createElement("div")
				row.className = "vtm-help-row"
				row.innerHTML = `<code>${key}</code><span>${action}</span>`
				list.appendChild(row)
			})

			section.appendChild(list)
			groups.appendChild(section)
		}

		addGroup("Navigation", [
			["j / k", "move down or up"],
			["J / K", "jump 5 tabs down or up"],
			["h / l", "jump between sessions"],
			["g / G", "go to top or bottom"],
		])

		addGroup("Search", [
			["/ query", "search stashed tabs"],
			["n / N", "next / previous match"],
			["Esc", "clear search or leave stash"],
		])

		addGroup("Open", [
			["Enter", "open selected tab"],
			["Shift+Enter", "open in background"],
			['"', "return to stash"],
			["'", "open full stash page"],
			[":", "open settings"],
		])

		help.appendChild(groups)
		columns.appendChild(help)
		footer.innerHTML = `
			<div class="vtm-footer-copy">Press <code>?</code> to return to the stash.</div>
		`
	}

	function renderStash() {
		columns.innerHTML = ""

		const stash = document.createElement("section")
		stash.className = "vtm-stash"

		const topbar = document.createElement("div")
		topbar.className = "vtm-stash-topbar"
		topbar.innerHTML = `
			<div class="vtm-stash-title">VimTabs Stash</div>
		`
		stash.appendChild(topbar)

		if (!state.stash.sessions.length) {
			const empty = document.createElement("div")
			empty.className = "vtm-stash-empty"
			empty.textContent = "No stashed tabs yet."
			stash.appendChild(empty)
			columns.appendChild(stash)
			footer.innerHTML = `
				<div class="vtm-footer-copy">Press <code>"</code> to return to the tabs overview. Press <code>:</code> for settings.</div>
			`
			return
		}

		const sessions = document.createElement("div")
		sessions.className = "vtm-stash-columns"

		state.stash.sessions.forEach((session, si) => {
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

			sessions.appendChild(column)
		})

		stash.appendChild(sessions)
		columns.appendChild(stash)
		highlightStash()

		if (state.search.active) {
			const matches = countMatches(state.search.query)
			footer.innerHTML = `
				<div class="vtm-footer-copy"><code>/</code>${state.search.query || ""}<span class="vtm-footer-meta">${matches} match${matches === 1 ? "" : "es"}</span></div>
			`
			return
		}

		if (state.search.lastQuery) {
			const matches = countMatches(state.search.lastQuery)
			footer.innerHTML = `
				<div class="vtm-footer-copy">Search <code>/${state.search.lastQuery}</code> active. Use <code>n</code> and <code>N</code> to jump through ${matches} match${matches === 1 ? "" : "es"}.</div>
			`
			return
		}

		footer.innerHTML = `
			<div class="vtm-footer-copy">Press <code>?</code> for stash help. Press <code>"</code> to return to tabs. Press <code>'</code> to open the full stash page. Press <code>:</code> for settings.</div>
		`
	}

	function renderSettings() {
		columns.innerHTML = ""

		const wrap = document.createElement("section")
		wrap.className = "vtm-settings-view"

		const hero = document.createElement("div")
		hero.className = "vtm-help-hero"
		hero.innerHTML = `
			<h2 class="vtm-help-title vtm-settings-title">Settings</h2>
		`
		wrap.appendChild(hero)

		const lane = document.createElement("div")
		lane.className = "vtm-settings-lane"

		const domains = [...state.settings.excludedDomains]
		const items = domains.map((domain) => ({
			type: "domain",
			title: domain,
			subtitle: "Skipped during stashing",
		}))

		if (state.settings.editing) {
			items.splice(state.settings.insertIndex, 0, {
				type: "draft",
				title: state.settings.draft || "Type a hostname",
				subtitle: "Press Enter to save, Esc to cancel",
			})
		}

		const createColumn = (title, accent, colIndex) => {
			const col = document.createElement("div")
			col.className = "vtm-col vtm-settings-col"
			const header = document.createElement("div")
			header.className = "vtm-col-header"
			header.style.background = accent
			header.textContent = title
			col.appendChild(header)
			lane.appendChild(col)
			return col
		}

		const hostnamesColumn = createColumn("Excluded Hostnames", "#d7827e", 0)
		const hostnamesIntro = document.createElement("div")
		hostnamesIntro.className = "vtm-settings-note"
		hostnamesIntro.innerHTML = `
			<div class="vtm-settings-note-title">Skip tabs while stashing</div>
			<div class="vtm-settings-note-copy">You can paste a full URL like <code>https://chat.openai.com/c/123</code>, but VimTabs stores only the hostname <code>chat.openai.com</code>. Paths such as <code>/c/123</code> are ignored.</div>
		`
		hostnamesColumn.appendChild(hostnamesIntro)

		if (!items.length) {
			const empty = document.createElement("div")
			empty.className = "vtm-card vtm-settings-card vtm-settings-empty"
			empty.dataset.col = "0"
			empty.dataset.row = "0"
			empty.innerHTML = `
				<div class="vtm-settings-empty-title">No exclusions yet</div>
				<div class="vtm-settings-empty-copy">Press <code>o</code> or <code>O</code> to add a hostname like <span>gmail.com</span>.</div>
				<div class="vtm-settings-empty-copy">Press <code>Enter</code> to save it and <code>:</code> to return to tabs.</div>
			`
			hostnamesColumn.appendChild(empty)
		} else {
			items.forEach((item, index) => {
				const card = document.createElement("div")
				card.className = "vtm-card vtm-settings-card"
				card.dataset.col = "0"
				card.dataset.row = `${index}`

				if (item.type === "draft") {
					card.classList.add("vtm-settings-draft")
				}

				const meta = document.createElement("div")
				meta.className = "vtm-meta"
				meta.innerHTML = `
					<span class="vtm-title">${escapeHtml(item.title)}</span>
					<span class="vtm-url">${escapeHtml(item.subtitle)}</span>
				`
				card.appendChild(meta)
				hostnamesColumn.appendChild(card)
			})
		}

		const layoutColumn = createColumn("Layout", "#286983", 1)
		const layoutCards = [
			...layoutOptions.density.map((option) => ({
				...option,
				active: state.settings.density === option.value,
			})),
			...layoutOptions.labelSize.map((option) => ({
				...option,
				active: state.settings.labelSize === option.value,
			})),
		]

		layoutCards.forEach((item, index) => {
			const card = document.createElement("div")
			card.className = "vtm-card vtm-settings-card"
			card.dataset.col = "1"
			card.dataset.row = `${index}`
			if (item.active) card.classList.add("vtm-settings-active")
			card.innerHTML = `
				<div class="vtm-meta">
					<span class="vtm-title">${escapeHtml(item.title)}</span>
					<span class="vtm-url">${escapeHtml(item.subtitle)}</span>
				</div>
			`
			layoutColumn.appendChild(card)
		})

		const themeColumn = createColumn("Theme", "#907aa9", 2)
		themeOptions.forEach((item, index) => {
			const card = document.createElement("div")
			card.className = "vtm-card vtm-settings-card"
			card.dataset.col = "2"
			card.dataset.row = `${index}`
			if (state.settings.theme === item.value) {
				card.classList.add("vtm-settings-active")
			}
			card.innerHTML = `
				<div class="vtm-meta">
					<span class="vtm-title">${escapeHtml(item.title)}</span>
					<span class="vtm-url">${escapeHtml(item.subtitle)}</span>
				</div>
			`
			themeColumn.appendChild(card)
		})

		wrap.appendChild(lane)
		columns.appendChild(wrap)
		highlightSettings()

		if (state.settings.status) {
			footer.innerHTML = `
				<div class="vtm-footer-copy">${escapeHtml(state.settings.status)}</div>
			`
			return
		}

		if (state.settings.editing) {
			footer.innerHTML = `
				<div class="vtm-footer-copy">Editing hostname. Press <code>Enter</code> to save or <code>Esc</code> to cancel.</div>
			`
			return
		}

		footer.innerHTML = `
			<div class="vtm-footer-copy">Press <code>h</code> and <code>l</code> to move between columns, <code>j</code> and <code>k</code> to move within a column, <code>Enter</code> to apply an option, and <code>:</code> to return to the tabs overview.</div>
		`
	}

	function countMatches(query) {
		if (!query) return 0
		let count = 0
		if (state.view === "stash") {
			state.stash.sessions.forEach((session) => {
				session.tabs.forEach((tab) => {
					if (matchesTab(tab, query)) count++
				})
			})
			return count
		}
		state.wins.forEach((win) => {
			win.tabs.forEach((tab) => {
				if (matchesTab(tab, query)) count++
			})
		})
		return count
	}

	function render() {
		if (state.view === "tabs") {
			renderTabs()
			return
		}
		if (state.view === "help") {
			renderHelp()
			return
		}
		if (state.view === "stashHelp") {
			renderStashHelp()
			return
		}
		if (state.view === "settings") {
			renderSettings()
			return
		}
		renderStash()
	}

	return {
		highlight,
		render,
		renderTabs,
	}
}
