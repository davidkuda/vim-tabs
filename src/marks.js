;(() => {
	const root = document.createElement("div")
	root.id = "vtm-marks"
	document.body.appendChild(root)

	const state = {
		marks: [],
		sel: 0,
	}

	function formatUrl(url) {
		if (!url) return ""
		try {
			const parsed = new URL(url)
			const host = parsed.host.replace(/^www\./, "")
			const path = `${parsed.pathname}${parsed.search}` || "/"
			const compactPath = path.length > 42 ? `${path.slice(0, 39)}...` : path
			return `${host}${compactPath === "/" ? "" : compactPath}`
		} catch {
			return url
		}
	}

	function highlight() {
		document
			.querySelectorAll(".vtm-mark.vtm-selected")
			.forEach((node) => node.classList.remove("vtm-selected"))
		const current = document.querySelector(`.vtm-mark[data-index="${state.sel}"]`)
		if (current) current.classList.add("vtm-selected")
	}

	function render() {
		root.innerHTML = `
			<header class="vtm-marks-header">
				<h1 class="vtm-marks-title">Marks</h1>
				<p class="vtm-marks-copy">Press a letter to jump directly. Uppercase marks persist even if the original tab is gone.</p>
			</header>
		`

		if (!state.marks.length) {
			const empty = document.createElement("div")
			empty.className = "vtm-marks-empty"
			empty.textContent = "No marks yet. Open VimTabs and use m followed by a letter."
			root.appendChild(empty)
			return
		}

		const list = document.createElement("div")
		list.className = "vtm-marks-list"
		state.marks.forEach((mark, index) => {
			const item = document.createElement("div")
			item.className = "vtm-mark"
			item.dataset.index = index
			const key = document.createElement("div")
			key.className = "vtm-mark-key"
			key.textContent = mark.key
			const meta = document.createElement("div")
			meta.className = "vtm-mark-meta"
			const title = document.createElement("div")
			title.className = "vtm-mark-title"
			title.textContent = mark.title || mark.url
			const url = document.createElement("div")
			url.className = "vtm-mark-url"
			url.textContent = formatUrl(mark.url)
			meta.append(title, url)
			const status = document.createElement("div")
			status.className = "vtm-mark-status"
			status.textContent = mark.persistent ? "persistent" : "live"
			item.append(key, meta, status)
			list.appendChild(item)
		})
		root.appendChild(list)

		const footer = document.createElement("div")
		footer.className = "vtm-marks-footer"
		footer.innerHTML = `Press <code>j</code> and <code>k</code> to move, <code>Enter</code> to open, or the mark letter directly.`
		root.appendChild(footer)
		highlight()
	}

	function openMark(key) {
		chrome.runtime.sendMessage({ type: "openMark", key, closeTabId: getCurrentTabId() })
	}

	let currentTabId = null
	function getCurrentTabId() {
		return currentTabId
	}

	function onKey(event) {
		if (/^[a-zA-Z]$/.test(event.key)) {
			event.preventDefault()
			openMark(event.key)
			return
		}
		if (event.key === "j") {
			event.preventDefault()
			state.sel = Math.min(state.sel + 1, state.marks.length - 1)
			highlight()
			return
		}
		if (event.key === "k") {
			event.preventDefault()
			state.sel = Math.max(state.sel - 1, 0)
			highlight()
			return
		}
		if (event.key === "Enter") {
			event.preventDefault()
			const mark = state.marks[state.sel]
			if (mark) openMark(mark.key)
		}
	}

	chrome.tabs.getCurrent((tab) => {
		currentTabId = tab?.id || null
		chrome.runtime.sendMessage({ type: "getMarksData" }, (data) => {
			state.marks = Object.values(data.marks || {}).sort((a, b) =>
				a.key.localeCompare(b.key),
			)
			render()
			window.addEventListener("keydown", onKey, true)
		})
	})
})()
