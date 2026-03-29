import { escapeHtml, formatUrl, getStashCounts, matchesTextQuery } from "../shared/ui.js"
import { createColumnPanel, prepareColumnPanel } from "../components/column-panel.js"
import { createLinkCard } from "../components/link-card.js"
import { getWindowColor } from "../shared/window-colors.js"
import {
	compareMarkKeys as compareMarkKeysByPreference,
	getMarkColumns as getMarkColumnsFromState,
} from "./selectors.js"

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
	helpTextMode: [
		{
			value: "normal",
			title: "Help text normal",
			subtitle: "Show the full inline guidance",
		},
		{
			value: "minimal",
			title: "Help text minimal",
			subtitle: "Show shorter inline hints",
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

const quickMarkSortOptions = [
	{
		value: "recent",
		title: "Most recent first",
		subtitle: "Prioritize marks used most recently",
	},
	{
		value: "frequent",
		title: "Most frequent first",
		subtitle: "Prioritize marks used most often",
	},
]

const markAlphaOrderOptions = [
	{
		value: "small-first",
		title: "Lowercase first",
		subtitle: "Sort a-z before A-Z",
	},
	{
		value: "capital-first",
		title: "Uppercase first",
		subtitle: "Sort A-Z before a-z",
	},
]

export function createRenderer(state, columns, footer) {
	function applyShellMode() {
		const backdrop = document.getElementById("vtm-backdrop")
		const modal = document.getElementById("vtm-modal")
		const topbar = document.getElementById("vtm-topbar")
		const minimal =
			state.view === "mark-create" ||
			(state.view === "marks" && state.marks.mode === "quick")
		const compactPrompt = state.view === "mark-create" && state.marks.minimalPrompt

		backdrop?.classList.toggle("vtm-minimal-mode", minimal)
		modal?.classList.toggle("vtm-minimal-mode", minimal)
		backdrop?.classList.toggle("vtm-compact-prompt", compactPrompt)
		modal?.classList.toggle("vtm-compact-prompt", compactPrompt)
		topbar?.classList.toggle("vtm-hidden", minimal)
	}

	function renderFooterNav(activeView = "", extra = "") {
		const extraHtml = extra ? `<div class="vtm-footer-copy">${extra}</div>` : ""
		const item = (key, label, view) => `
			<div class="vtm-footer-nav-item${activeView === view ? " vtm-active" : ""}">
				<code>${key}</code><span>${label}</span>
			</div>
		`
		return `
			${extraHtml}
			<div class="vtm-footer-nav" aria-label="Overlay navigation">
				${item("?", "Help", "help")}
				${item(":", "Settings", "settings")}
				${item('"', "Stash", "stash")}
				${item("M", "Marks", "marks")}
				${item(">", "Commands", "commands")}
				${item("ESC", "Exit", "exit")}
			</div>
		`
	}

	function helpText(normalText, minimalText) {
		return state.settings.helpTextMode === "minimal" ? minimalText : normalText
	}

	function compareMarkKeys(a, b) {
		return compareMarkKeysByPreference(a, b, state.settings.markAlphaOrder)
	}

	function escapeHtml(text) {
		return `${text || ""}`
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
	}

	function formatSessionDate(createdAt) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(createdAt)
	}

	function formatRelativeTime(timestamp) {
		if (!timestamp) return "Not used yet"
		const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
		const units = [
			["year", 31536000],
			["month", 2592000],
			["week", 604800],
			["day", 86400],
			["hour", 3600],
			["minute", 60],
		]
		for (const [unit, size] of units) {
			if (seconds >= size) {
				const value = Math.floor(seconds / size)
				return `${value} ${unit}${value === 1 ? "" : "s"} ago`
			}
		}
		return "Just now"
	}

	function getTabMarks(tab) {
		if (!tab?.id) return []
		return Object.values(state.marks.items || {})
			.filter((mark) => mark.tabId === tab.id)
			.sort((a, b) => compareMarkKeys(a.key, b.key))
	}

	function buildCard(tab, wi, ti) {
		const card = createLinkCard()
		card.dataset.w = wi
		card.dataset.t = ti

		const marks = getTabMarks(tab)
		card.data = {
			title: tab.title || tab.url,
			url: tab.url,
			favIconUrl: tab.favIconUrl,
			badges: marks.map((mark) => mark.key),
		}
		card.removed = !!tab._removed
		card.matched = matchesTextQuery(
			tab,
			state.search.active ? state.search.query : state.search.lastQuery,
		)

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

	function highlightMarks() {
		document
			.querySelectorAll(".vtm-mark-card.vtm-selected")
			.forEach((node) => node.classList.remove("vtm-selected"))

		const current = document.querySelector(
			`.vtm-mark-card[data-col="${state.marks.sel.col}"][data-row="${state.marks.sel.rows[state.marks.sel.col]}"]`,
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
			const col = createColumnPanel()
			col.dataset.w = wi
			col.setAttribute("data-title", windowColor.label)
			col.setAttribute("data-accent", windowColor.accent)
			col.setAttribute("data-border", windowColor.accent)
			col.setAttribute("data-surface", windowColor.surface)
			prepareColumnPanel(col)
			columns.appendChild(col)
			const body = col.body || col

			win.tabs.forEach((tab, ti) => {
				body.appendChild(buildCard(tab, wi, ti))
			})
		})

		highlight()
		if (state.marks.pending === "set") {
			footer.innerHTML = `
				<div class="vtm-footer-copy">Mark the selected tab with <code>a-z</code> or <code>A-Z</code>. Uppercase marks persist. Press <code>Esc</code> to cancel.</div>
			`
			return
		}

		if (state.marks.pending === "jump") {
			footer.innerHTML = `
				<div class="vtm-footer-copy">Jump to a mark with <code>a-z</code> or <code>A-Z</code>. Press <code>Esc</code> to cancel.</div>
			`
			return
		}

		if (state.marks.status) {
			footer.innerHTML = `
				<div class="vtm-footer-copy">${state.marks.status}</div>
			`
			return
		}

		if (state.search.active) {
			const matches = countMatches(state.search.query)
			footer.innerHTML = `
					<div class="vtm-footer-copy"><code>/</code>${escapeHtml(state.search.query || "")}<span class="vtm-footer-meta">${matches} match${matches === 1 ? "" : "es"}</span></div>
			`
			return
		}

		if (state.search.lastQuery) {
			const matches = countMatches(state.search.lastQuery)
			footer.innerHTML = `
					<div class="vtm-footer-copy">Search <code>/${escapeHtml(state.search.lastQuery)}</code> active. Use <code>n</code> and <code>N</code> to jump through ${matches} match${matches === 1 ? "" : "es"}.</div>
			`
			return
		}

		footer.innerHTML = `
			${renderFooterNav("", "Press <code>Ctrl+Shift+P</code> or <code>&gt;</code> for commands.")}
		`
	}

	function countMatches(query) {
		if (!query) return 0
		let count = 0
		state.wins.forEach((win) => {
			win.tabs.forEach((tab) => {
				if (matchesTextQuery(tab, query)) count++
			})
		})
		return count
	}

	function renderHelp() {
		columns.innerHTML = ""

		const helpTabs = [
			{ id: "general", label: "General" },
			{ id: "tabs", label: "Tabs" },
			{ id: "stash", label: "Stash" },
			{ id: "marks", label: "Marks" },
		]

		const addGroup = (container, title, items) => {
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
			container.appendChild(section)
		}

		const help = document.createElement("section")
		help.className = "vtm-help"

		const tabbar = document.createElement("div")
		tabbar.className = "vtm-help-tabs"
		helpTabs.forEach((tab) => {
			const item = document.createElement("div")
			item.className = `vtm-help-tab${state.helpTab === tab.id ? " vtm-active" : ""}`
			item.textContent = tab.label
			tabbar.appendChild(item)
		})
		help.appendChild(tabbar)

		const hero = document.createElement("div")
		hero.className = "vtm-help-hero"
		const explainer = document.createElement("div")
		explainer.className = "vtm-help-explainer"

		const groups = document.createElement("div")
		groups.className = "vtm-help-groups"

		if (state.helpTab === "general") {
			hero.innerHTML = `
				<h2 class="vtm-help-title">General</h2>
				<p class="vtm-help-copy">VimTabs is a keyboard-first tab manager. The overlay has four views: tabs, stash, marks, and settings. Use the footer navigation from any overlay view.</p>
			`
			explainer.innerHTML = `
				<p><strong>Apply model:</strong> most structural changes in the tabs overview are staged first. This lets you inspect the result before committing it. Focusing a tab with <code>Enter</code> or leaving with <code>Esc</code> applies the queued changes.</p>
				<p><strong>Queued deletes:</strong> pressing <code>d</code> does not close the tab immediately. It marks that tab for deletion inside the overlay. Use <code>u</code> if you want to undo the most recent queued delete before applying.</p>
				<p><strong>Yank and paste:</strong> pressing <code>y</code> stores the selected tab as a temporary entry. Use <code>p</code> or <code>P</code> to insert a copy of that tab below or above the current position, including into another window column.</p>
				<p><strong>Global navigation:</strong> press <code>?</code> for help, <code>:</code> for settings, <code>"</code> for stash, <code>M</code> for marks, and <code>Esc</code> to leave the current overlay view.</p>
				<p><strong>Command palette:</strong> press <code>Ctrl+Shift+P</code> or <code>&gt;</code> to search available actions for the current context.</p>
			`
		}

		if (state.helpTab === "tabs") {
			hero.innerHTML = `
				<h2 class="vtm-help-title">Tabs</h2>
				<p class="vtm-help-copy">The tabs view shows each browser window as a column. This is where you move tabs, queue deletions, copy tabs, bookmark them, and create marks.</p>
			`
			addGroup(groups, "Navigation", [
				["j / k", "move through tabs"],
				["J / K", "jump 5 tabs"],
				["h / l", "move between windows"],
				["g / G", "jump to top or bottom"],
				["Enter", "focus the selected tab"],
			])
			addGroup(groups, "Search And Edit", [
				["/ query", "search titles and URLs"],
				["n / N", "jump between matches"],
				["d", "queue the selected tab for deletion"],
				["u", "undo the most recent queued delete"],
				["y", "yank the selected tab"],
				["p / P", "paste below or above"],
				["b", "bookmark tab"],
				["e", "exclude the selected tab hostname"],
			])
			addGroup(groups, "Marks", [
				["m letter", "mark the selected tab"],
				["' letter", "jump to a mark"],
			])
			explainer.innerHTML = `
				<p><strong>Marks:</strong> pressing <code>m</code> followed by a letter assigns that letter to the selected tab. Press <code>'</code> followed by the same letter to jump back to it. Uppercase marks persist and can reopen a tab by URL if the original tab no longer exists.</p>
			`
		}

		if (state.helpTab === "stash") {
			hero.innerHTML = `
				<h2 class="vtm-help-title">Stash</h2>
				<p class="vtm-help-copy">A stash session is a saved window. Stashing stores the tabs from one window together so that window can be cleared without losing those tabs.</p>
			`
			addGroup(groups, "Open And Navigate", [
				['"', "open stash inside the overlay"],
				["X", "stash the current window"],
				[";", "open the standalone stash page"],
				["j / k", "move through stashed tabs"],
				["h / l", "move between stashed sessions"],
				["Enter", "open the selected stashed tab"],
				["Shift+Enter", "open in background"],
			])
			addGroup(groups, "Search", [
				["/ query", "search stashed tabs"],
				["n / N", "jump between matches"],
			])
			explainer.innerHTML = `
				<p><strong>Stashing:</strong> pressing <code>X</code> stores all tabs from the current window as one stashed session and closes them from that window. The stash is for sessions you want to get out of the way without losing.</p>
			`
		}

		if (state.helpTab === "marks") {
			hero.innerHTML = `
				<h2 class="vtm-help-title">Marks</h2>
				<p class="vtm-help-copy">Marks give tabs short names so you can jump back to them quickly. Lowercase marks are for live tabs. Uppercase marks persist.</p>
			`
			addGroup(groups, "Using Marks", [
				["M", "open marks inside the overlay"],
				["browser marks shortcut", "open quick marks ranked by use and recency"],
				["browser add-mark shortcut", "add the current page as a mark"],
				["j / k", "move within the current marks column"],
				["h / l", "move between temporary and persistent marks"],
				["' letter", "jump directly to a mark"],
				["d", "remove the selected mark"],
			])
			explainer.innerHTML = `
				<p><strong>Temporary marks:</strong> lowercase marks point to currently open tabs.</p>
				<p><strong>Persistent marks:</strong> uppercase marks stay available and can reopen a tab by URL if the original tab no longer exists.</p>
				<p><strong>Quick marks:</strong> opening marks from the browser shortcut shows a minimal ranked list. In that mode, typing the mark letter opens it immediately.</p>
				<p><strong>Add mark:</strong> the browser add-mark shortcut opens a small prompt for the current page. Press <code>Enter</code> to save a temporary mark or <code>Shift+Enter</code> to save a persistent mark.</p>
			`
		}

		help.append(hero, groups, explainer)

		columns.appendChild(help)
		footer.innerHTML = `
			${renderFooterNav("help", "Press <code>h</code> and <code>l</code> to switch help tabs. Press <code>j</code> and <code>k</code> to scroll. Press <code>?</code> to return to the previous view.")}
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
				${renderFooterNav("stash", "No stashed tabs yet.")}
			`
			return
		}

		const sessions = document.createElement("div")
		sessions.className = "vtm-stash-columns"
		const stashCounts = getStashCounts(state.stash.sessions)

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
				const item = createLinkCard()
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

			sessions.appendChild(column)
		})

		stash.appendChild(sessions)
		columns.appendChild(stash)
		highlightStash()

		if (state.search.active) {
			const matches = countMatches(state.search.query)
			footer.innerHTML = `
				<div class="vtm-footer-copy"><code>/</code>${escapeHtml(state.search.query || "")}<span class="vtm-footer-meta">${matches} match${matches === 1 ? "" : "es"}</span></div>
			`
			return
		}

		if (state.search.lastQuery) {
			const matches = countMatches(state.search.lastQuery)
			footer.innerHTML = `
				<div class="vtm-footer-copy">Search <code>/${escapeHtml(state.search.lastQuery)}</code> active. Use <code>n</code> and <code>N</code> to jump through ${matches} match${matches === 1 ? "" : "es"}.</div>
			`
			return
		}

		footer.innerHTML = `
			${renderFooterNav("stash", "Press <code>;</code> to open the full stash page.")}
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

		const quickMarksColumn = createColumn("Quick Marks", "#286983", 1)
		quickMarkSortOptions.forEach((item, index) => {
			const card = document.createElement("div")
			card.className = "vtm-card vtm-settings-card"
			card.dataset.col = "1"
			card.dataset.row = `${index}`
			if (state.settings.quickMarkSort === item.value) {
				card.classList.add("vtm-settings-active")
			}
			card.innerHTML = `
				<div class="vtm-meta">
					<span class="vtm-title">${escapeHtml(item.title)}</span>
					<span class="vtm-url">${escapeHtml(item.subtitle)}</span>
				</div>
			`
			quickMarksColumn.appendChild(card)
		})
		markAlphaOrderOptions.forEach((item, index) => {
			const card = document.createElement("div")
			card.className = "vtm-card vtm-settings-card"
			card.dataset.col = "1"
			card.dataset.row = `${index + quickMarkSortOptions.length}`
			if (state.settings.markAlphaOrder === item.value) {
				card.classList.add("vtm-settings-active")
			}
			card.innerHTML = `
				<div class="vtm-meta">
					<span class="vtm-title">${escapeHtml(item.title)}</span>
					<span class="vtm-url">${escapeHtml(item.subtitle)}</span>
				</div>
			`
			quickMarksColumn.appendChild(card)
		})

		const layoutColumn = createColumn("Layout", "#56949f", 2)
		const layoutCards = [
			...layoutOptions.density.map((option) => ({
				...option,
				active: state.settings.density === option.value,
			})),
			...layoutOptions.labelSize.map((option) => ({
				...option,
				active: state.settings.labelSize === option.value,
			})),
			...layoutOptions.helpTextMode.map((option) => ({
				...option,
				active: state.settings.helpTextMode === option.value,
			})),
		]

		layoutCards.forEach((item, index) => {
			const card = document.createElement("div")
			card.className = "vtm-card vtm-settings-card"
			card.dataset.col = "2"
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

		const themeColumn = createColumn("Theme", "#907aa9", 3)
		themeOptions.forEach((item, index) => {
			const card = document.createElement("div")
			card.className = "vtm-card vtm-settings-card"
			card.dataset.col = "3"
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
				${renderFooterNav("settings", escapeHtml(state.settings.status))}
			`
			return
		}

		if (state.settings.editing) {
			footer.innerHTML = `
				${renderFooterNav("settings", "Editing hostname. Press <code>Enter</code> to save or <code>Esc</code> to cancel.")}
			`
			return
		}

		footer.innerHTML = `
			${renderFooterNav("settings", "Press <code>h</code> and <code>l</code> to move between columns. Press <code>j</code> and <code>k</code> to move within a column. Press <code>Enter</code> to apply an option.")}
		`
	}

	function renderMarks() {
		columns.innerHTML = ""
		const quickMode = state.marks.mode === "quick"
		const markColumns = getMarkColumnsFromState(state)
		const quickMarks = [...markColumns[0], ...markColumns[1]]

		if (quickMode) {
			const quickView = document.createElement("section")
			quickView.className = "vtm-quick-marks"

			const hero = document.createElement("div")
			hero.className = "vtm-quick-marks-hero"
			hero.innerHTML = `
				<h2 class="vtm-help-title vtm-settings-title">Quick Marks</h2>
				<p class="vtm-help-copy">Press a letter to open the tab.</p>
			`
			quickView.appendChild(hero)

			const list = document.createElement("div")
			list.className = "vtm-quick-marks-list"

			if (!quickMarks.length) {
				const empty = document.createElement("div")
				empty.className = "vtm-card vtm-settings-card vtm-settings-empty vtm-mark-card"
				empty.dataset.col = "0"
				empty.dataset.row = "0"
				empty.innerHTML = `
					<div class="vtm-settings-empty-title">No marks yet.</div>
					<div class="vtm-settings-empty-copy">Use <code>m</code> plus a letter from the tabs overview to create one.</div>
				`
				list.appendChild(empty)
			} else {
				quickMarks.forEach((mark, rowIndex) => {
					const card = document.createElement("div")
					card.className =
						"vtm-card vtm-settings-card vtm-mark-card vtm-quick-mark-card"
					card.dataset.col = "0"
					card.dataset.row = `${rowIndex}`

					const key = document.createElement("span")
					key.className = "vtm-mark-badge"
					key.textContent = mark.key

					const meta = document.createElement("div")
					meta.className = "vtm-meta"

					const head = document.createElement("div")
					head.className = "vtm-title-row"
					const title = document.createElement("span")
					title.className = "vtm-title"
					title.textContent = mark.title || mark.url
					head.append(title, key)

					const url = document.createElement("span")
					url.className = "vtm-url"
					const usageCount = mark.usageCount || 0
					const usageLabel =
						usageCount > 0
							? `${usageCount} use${usageCount === 1 ? "" : "s"}`
							: "Unused"
					url.textContent = `${formatUrl(mark.url)} · ${usageLabel} · ${formatRelativeTime(mark.lastUsedAt)}`

					meta.append(head, url)
					card.appendChild(meta)
					list.appendChild(card)
				})
			}

			quickView.appendChild(list)
			columns.appendChild(quickView)
			highlightMarks()

			if (state.marks.status) {
				footer.innerHTML = `
					<div class="vtm-footer-copy">${state.marks.status}</div>
				`
				return
			}

			footer.innerHTML = `
				<div class="vtm-footer-copy">${helpText(
					"Use <code>Ctrl+N</code> and <code>Ctrl+P</code> or <code>j</code> and <code>k</code> to move. Press <code>Enter</code> to open the selected mark. Press <code>Esc</code> to exit.",
					"<code>Ctrl+N</code> <code>Ctrl+P</code> or <code>j</code> <code>k</code> to move. <code>Enter</code> opens. <code>Esc</code> exits.",
				)}</div>
			`
			return
		}

		const marksView = document.createElement("section")
		marksView.className = "vtm-settings-view"
		marksView.innerHTML = `
			<div class="vtm-help-hero">
				<h2 class="vtm-help-title vtm-settings-title">${quickMode ? "Quick Marks" : "Marks"}</h2>
			</div>
		`

		const lane = document.createElement("div")
		lane.className = "vtm-settings-lane"
		const titles = ["Temporary Marks", "Persistent Marks"]
		const accents = ["#286983", "#907aa9"]
		const emptyCopy = [
			"No lowercase marks for currently open tabs.",
			"No uppercase marks yet.",
		]

		markColumns.forEach((items, colIndex) => {
			const col = document.createElement("div")
			col.className = "vtm-col vtm-settings-col"

			const header = document.createElement("div")
			header.className = "vtm-col-header"
			header.style.background = accents[colIndex]
			header.textContent = titles[colIndex]
			col.appendChild(header)

			if (!items.length) {
				const empty = document.createElement("div")
				empty.className = "vtm-card vtm-settings-card vtm-settings-empty vtm-mark-card"
				empty.dataset.col = `${colIndex}`
				empty.dataset.row = "0"
				empty.innerHTML = `
					<div class="vtm-settings-empty-title">${emptyCopy[colIndex]}</div>
					<div class="vtm-settings-empty-copy">${colIndex === 0 ? "Use <code>m</code> plus a lowercase letter from the tabs overview." : "Use <code>m</code> plus an uppercase letter from the tabs overview."}</div>
				`
				col.appendChild(empty)
			} else {
				items.forEach((mark, rowIndex) => {
					const card = document.createElement("div")
					card.className = "vtm-card vtm-settings-card vtm-mark-card"
					card.dataset.col = `${colIndex}`
					card.dataset.row = `${rowIndex}`

					const key = document.createElement("span")
					key.className = "vtm-mark-badge"
					key.textContent = mark.key

					const meta = document.createElement("div")
					meta.className = "vtm-meta"

					const head = document.createElement("div")
					head.className = "vtm-title-row"
					const title = document.createElement("span")
					title.className = "vtm-title"
					title.textContent = mark.title || mark.url
					head.append(title, key)

					const url = document.createElement("span")
					url.className = "vtm-url"
					const usageCount = mark.usageCount || 0
					const usageLabel =
						usageCount > 0
							? `${usageCount} use${usageCount === 1 ? "" : "s"}`
							: "Unused"
					url.textContent = `${formatUrl(mark.url)} · ${usageLabel} · ${formatRelativeTime(mark.lastUsedAt)}`

					meta.append(head, url)
					card.appendChild(meta)
					col.appendChild(card)
				})
			}

			lane.appendChild(col)
		})

		marksView.appendChild(lane)
		columns.appendChild(marksView)
		highlightMarks()

		if (state.marks.pending === "jump") {
			footer.innerHTML = `
				${renderFooterNav("marks", "Jump to a mark with <code>a-z</code> or <code>A-Z</code>. Press <code>Esc</code> to cancel.")}
			`
			return
		}

		if (state.marks.status) {
			footer.innerHTML = `
				${renderFooterNav("marks", state.marks.status)}
			`
			return
		}

		footer.innerHTML = `
			${renderFooterNav("marks", quickMode ? "Directly type a mark letter to jump. Press <code>h</code> and <code>l</code> to move between columns. Press <code>j</code> and <code>k</code> to move within a column. Press <code>d</code> to remove the selected mark." : "Press <code>h</code> and <code>l</code> to move between columns. Press <code>j</code> and <code>k</code> to move within a column. Press <code>d</code> to remove the selected mark. Press <code>'</code> plus a letter to jump.")}
		`
	}

	function renderMarkCreate() {
		columns.innerHTML = ""

		const targetTab =
			state.marks.targetTab || state.wins[state.sel.w]?.tabs[state.sel.t] || null

		const wrap = document.createElement("section")
		wrap.className = "vtm-quick-marks"

		const hero = document.createElement("div")
		hero.className = "vtm-quick-marks-hero"
		hero.innerHTML = `
			<h2 class="vtm-help-title vtm-settings-title">Add Mark</h2>
			<p class="vtm-help-copy">${helpText(
				"Type a letter, then press <code>Enter</code> for a temporary mark or <code>Shift+Enter</code> for a persistent mark.",
				"Type a letter. <code>Enter</code> saves temporary. <code>Shift+Enter</code> saves persistent.",
			)}</p>
		`
		wrap.appendChild(hero)

		const prompt = document.createElement("div")
		prompt.className = "vtm-mark-create-prompt"
		prompt.innerHTML = `
			<div class="vtm-mark-create-label">Mark</div>
			<div class="vtm-mark-create-key">${escapeHtml(state.marks.draftKey || "_")}</div>
		`
		wrap.appendChild(prompt)

		if (targetTab) {
			const card = createLinkCard()
			card.className = "vtm-card vtm-settings-card vtm-quick-mark-card"
			card.data = {
				title: targetTab.title || targetTab.url || "Current tab",
				url: targetTab.url,
				favIconUrl: targetTab.favIconUrl,
			}
			wrap.appendChild(card)
		}

		columns.appendChild(wrap)

		if (state.marks.status) {
			footer.innerHTML = `<div class="vtm-footer-copy">${state.marks.status}</div>`
			return
		}

		footer.innerHTML = `
			<div class="vtm-footer-copy">${helpText(
				"Press <code>Backspace</code> to clear the letter. Press <code>Esc</code> to cancel.",
				"<code>Backspace</code> clears. <code>Esc</code> cancels.",
			)}</div>
		`
	}

	function countMatches(query) {
		if (!query) return 0
		let count = 0
		if (state.view === "stash") {
			state.stash.sessions.forEach((session) => {
				session.tabs.forEach((tab) => {
					if (matchesTextQuery(tab, query)) count++
				})
			})
			return count
		}
		state.wins.forEach((win) => {
			win.tabs.forEach((tab) => {
				if (matchesTextQuery(tab, query)) count++
			})
		})
		return count
	}

	function render() {
		applyShellMode()
		if (state.view === "tabs") {
			renderTabs()
		} else if (state.view === "help") {
			renderHelp()
		} else if (state.view === "settings") {
			renderSettings()
		} else if (state.view === "marks") {
			renderMarks()
		} else if (state.view === "mark-create") {
			renderMarkCreate()
		} else {
			renderStash()
		}
		renderCommandPalette()
	}

	function renderCommandPalette() {
		document.querySelector(".vtm-command-palette")?.remove()
		if (!state.command.active) return

		const palette = document.createElement("section")
		palette.className = "vtm-command-palette"

		const input = document.createElement("div")
		input.className = "vtm-command-input"
		input.innerHTML = `
			<div class="vtm-command-label">Command Palette</div>
			<div class="vtm-command-query">${escapeHtml(state.command.query || "Type to filter commands")}</div>
		`
		palette.appendChild(input)

		const list = document.createElement("div")
		list.className = "vtm-command-list"

		if (!state.command.items.length) {
			const empty = document.createElement("div")
			empty.className = "vtm-card vtm-command-item"
			empty.innerHTML = `
				<div class="vtm-meta">
					<span class="vtm-title">No commands found</span>
					<span class="vtm-url">Try a different search.</span>
				</div>
			`
			list.appendChild(empty)
		} else {
			state.command.items.forEach((item, index) => {
				const row = document.createElement("div")
				row.className = `vtm-card vtm-command-item${index === state.command.sel ? " vtm-selected" : ""}`
				row.innerHTML = `
					<div class="vtm-meta">
						<div class="vtm-title-row">
							<span class="vtm-title">${escapeHtml(item.title)}</span>
							<span class="vtm-mark-badge">${escapeHtml(item.keys)}</span>
						</div>
						<span class="vtm-url">${escapeHtml(item.subtitle)}</span>
					</div>
				`
				list.appendChild(row)
			})
		}

		palette.appendChild(list)
		columns.appendChild(palette)
	}

	return {
		highlight,
		render,
		renderTabs,
	}
}
