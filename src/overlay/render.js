import { getWindowColor } from "../shared/window-colors.js"

export function createRenderer(state, columns, footer) {
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

	function renderTabs() {
		columns.innerHTML = ""

		state.wins.forEach((win, wi) => {
			const windowColor = getWindowColor(win, wi)
			const col = document.createElement("div")
			col.className = "vtm-col"
			col.dataset.w = wi
			col.style.borderColor = windowColor.accent
			col.style.background = windowColor.surface
			columns.appendChild(col)

			const header = document.createElement("div")
			header.className = "vtm-col-header"
			header.style.color = windowColor.accent
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
			<div class="vtm-footer-copy">Press <code>?</code> for shortcuts. Press <code>/</code> to search tabs. Press <code>Esc</code> to apply.</div>
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
			["h / l", "jump between windows"],
			["g / G", "go to top or bottom"],
			["/ query", "search tabs"],
			["n / N", "next / previous match"],
			["Enter", "focus selected tab"],
		])

		addGroup("Tab Actions", [
			["d", "cut tab"],
			["y", "copy tab"],
			["p / P", "paste below or above"],
			['"', "bookmark tab"],
		])

		addGroup("Session", [
			["u", "undo delete"],
			["?", "toggle this help"],
			["Esc", "apply changes and close"],
		])

		help.appendChild(groups)
		columns.appendChild(help)
		footer.innerHTML = `
			<div class="vtm-footer-copy">Press <code>?</code> to return to the tabs overview.</div>
		`
	}

	function render() {
		state.view === "tabs" ? renderTabs() : renderHelp()
	}

	return {
		highlight,
		render,
		renderTabs,
	}
}
