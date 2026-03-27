export function createRenderer(state, columns, footer) {
	function buildCard(tab, wi, ti) {
		const card = document.createElement("div")
		card.className = "vtm-card"
		card.dataset.w = wi
		card.dataset.t = ti

		if (tab._removed) card.classList.add("vtm-removed")

		if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://")) {
			const img = document.createElement("img")
			img.className = "vtm-favicon"
			img.src = tab.favIconUrl
			card.appendChild(img)
		}

		const title = document.createElement("span")
		title.className = "vtm-title"
		title.textContent = tab.title || tab.url
		card.appendChild(title)

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

	function renderTabs() {
		columns.innerHTML = ""

		state.wins.forEach((win, wi) => {
			const col = document.createElement("div")
			col.className = "vtm-col"
			col.dataset.w = wi
			columns.appendChild(col)

			win.tabs.forEach((tab, ti) => {
				col.appendChild(buildCard(tab, wi, ti))
			})
		})

		highlight()
		footer.textContent = "press `?` to show keyboard shortcuts"
	}

	function renderHelp() {
		columns.innerHTML = ""

		const table = document.createElement("table")
		table.className = "vtm-help"
		table.innerHTML =
			"<thead><tr><th>Key</th><th>Action</th></tr></thead><tbody></tbody>"

		const add = (key, action) => {
			const row = document.createElement("tr")
			row.innerHTML = `<td><code>${key}</code></td><td>${action}</td>`
			table.tBodies[0].appendChild(row)
		}

		;[
			["j / k", "move down / up"],
			["h / l", "prev / next column"],
			["g / G", "top / bottom"],
			["d", "cut (delete later)"],
			["y", "yank copy"],
			["p / P", "paste below / above"],
			["u", "undo delete"],
			['"', "bookmark tab"],
			["Enter", "focus tab"],
			["Esc", "apply & close"],
			["?", "toggle help"],
		].forEach(([key, action]) => add(key, action))

		columns.appendChild(table)
		footer.textContent = "press `?` or ESC to go back to the tabs overview"
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
