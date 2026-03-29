import { getSettings, normalizeDomain, saveSettings } from "./shared/settings.js"

const root = document.createElement("div")
root.id = "vtm-settings"
document.body.appendChild(root)

const state = {
	excludedDomains: [],
	overlayMode: true,
	density: "comfortable",
	columnWidth: "360",
	maxTitleLength: "64",
	labelSize: "medium",
	theme: "rose-pine-moon",
	quickMarkSort: "frequent",
	markAlphaOrder: "small-first",
	helpTextMode: "normal",
	status: "",
}

function setStatus(message: string) {
	state.status = message
	render()
}

async function persist() {
	await saveSettings({
		excludedDomains: state.excludedDomains,
		overlayMode: state.overlayMode,
		density: state.density,
		columnWidth: state.columnWidth,
		maxTitleLength: state.maxTitleLength,
		labelSize: state.labelSize,
		theme: state.theme,
		quickMarkSort: state.quickMarkSort,
		markAlphaOrder: state.markAlphaOrder,
		helpTextMode: state.helpTextMode,
	})
}

async function addDomain(rawValue: string) {
	const domain = normalizeDomain(rawValue)
	if (!domain) {
		setStatus("Enter a hostname like gmail.com or chat.openai.com.")
		return
	}

	if (state.excludedDomains.includes(domain)) {
		setStatus(`${domain} is already excluded.`)
		return
	}

	state.excludedDomains = [...state.excludedDomains, domain]
	await persist()
	setStatus(`Excluded ${domain} from future stashes.`)
}

async function removeDomain(domain: string) {
	state.excludedDomains = state.excludedDomains.filter((entry) => entry !== domain)
	await persist()
	setStatus(`Removed ${domain} from the exclusion list.`)
}

function render() {
	root.innerHTML = `
		<header class="vtm-settings-header">
			<h1 class="vtm-settings-title">VimTabs Settings</h1>
			<p class="vtm-settings-copy">Excluded domains are skipped when you stash a window. Matching works on hostnames, so excluding <code>openai.com</code> also excludes <code>chat.openai.com</code>.</p>
		</header>
		<section class="vtm-settings-surface">
			<h2 class="vtm-settings-section-title">Excluded Domains</h2>
			<form class="vtm-settings-form" id="vtm-settings-form">
				<input class="vtm-settings-input" id="vtm-domain-input" type="text" autocomplete="off" spellcheck="false" placeholder="gmail.com" />
				<button class="vtm-settings-button" type="submit">Add domain</button>
			</form>
			<p class="vtm-settings-note">Use bare hostnames only. Paths are ignored automatically if you paste a full URL.</p>
			<div class="vtm-settings-list" id="vtm-settings-list"></div>
			<div class="vtm-settings-note" id="vtm-overlay-settings">
				<div class="vtm-settings-note-title">Overlay Mode</div>
				<div class="vtm-settings-note-copy" id="vtm-overlay-copy"></div>
				<button class="vtm-settings-button" id="vtm-overlay-button" type="button"></button>
			</div>
			<div class="vtm-settings-note">
				<div class="vtm-settings-note-title">Layout</div>
				<div class="vtm-settings-grid">
					<label class="vtm-settings-field">
						<span>Density</span>
						<select class="vtm-settings-select" id="vtm-density-select">
							<option value="comfortable">Comfortable</option>
							<option value="compact">Compact</option>
						</select>
					</label>
					<label class="vtm-settings-field">
						<span>Column width</span>
						<select class="vtm-settings-select" id="vtm-column-width-select">
							<option value="320">320px</option>
							<option value="360">360px</option>
							<option value="420">420px</option>
						</select>
					</label>
					<label class="vtm-settings-field">
						<span>Max title length</span>
						<select class="vtm-settings-select" id="vtm-title-length-select">
							<option value="48">48 chars</option>
							<option value="64">64 chars</option>
							<option value="80">80 chars</option>
						</select>
					</label>
					<label class="vtm-settings-field">
						<span>Window label size</span>
						<select class="vtm-settings-select" id="vtm-label-size-select">
							<option value="small">Small</option>
							<option value="medium">Medium</option>
							<option value="large">Large</option>
						</select>
					</label>
				</div>
			</div>
			<div class="vtm-settings-status" id="vtm-settings-status"></div>
		</section>
	`

	const form = document.getElementById("vtm-settings-form")
	const input = document.getElementById("vtm-domain-input") as HTMLInputElement | null
	const list = document.getElementById("vtm-settings-list")
	const status = document.getElementById("vtm-settings-status")
	const overlayCopy = document.getElementById("vtm-overlay-copy")
	const overlayButton = document.getElementById("vtm-overlay-button") as HTMLButtonElement | null
	const densitySelect = document.getElementById("vtm-density-select") as HTMLSelectElement | null
	const columnWidthSelect = document.getElementById("vtm-column-width-select") as HTMLSelectElement | null
	const titleLengthSelect = document.getElementById("vtm-title-length-select") as HTMLSelectElement | null
	const labelSizeSelect = document.getElementById("vtm-label-size-select") as HTMLSelectElement | null
	if (status) status.textContent = state.status
	if (overlayCopy) {
		overlayCopy.textContent = state.overlayMode
			? "Overlay mode is enabled. VimTabs opens as an in-page overlay when possible."
			: "Overlay mode is disabled. VimTabs opens in its own extension page."
	}
	if (overlayButton) {
		overlayButton.textContent = state.overlayMode
			? "Use standalone page instead"
			: "Use overlay by default"
	}
	if (densitySelect) densitySelect.value = state.density
	if (columnWidthSelect) columnWidthSelect.value = state.columnWidth
	if (titleLengthSelect) titleLengthSelect.value = state.maxTitleLength
	if (labelSizeSelect) labelSizeSelect.value = state.labelSize

	form?.addEventListener("submit", async (event) => {
		event.preventDefault()
		const value = input?.value || ""
		if (input) input.value = ""
		await addDomain(value)
		input?.focus()
	})
	overlayButton?.addEventListener("click", async () => {
		state.overlayMode = !state.overlayMode
		await persist()
		setStatus(
			state.overlayMode
				? "Overlay mode enabled."
				: "Standalone page mode enabled.",
		)
	})
	densitySelect?.addEventListener("change", async () => {
		state.density = densitySelect.value as typeof state.density
		await persist()
		setStatus(`Density set to ${state.density}.`)
	})
	columnWidthSelect?.addEventListener("change", async () => {
		state.columnWidth = columnWidthSelect.value as typeof state.columnWidth
		await persist()
		setStatus(`Column width set to ${state.columnWidth}px.`)
	})
	titleLengthSelect?.addEventListener("change", async () => {
		state.maxTitleLength = titleLengthSelect.value as typeof state.maxTitleLength
		await persist()
		setStatus(`Max title length set to ${state.maxTitleLength} characters.`)
	})
	labelSizeSelect?.addEventListener("change", async () => {
		state.labelSize = labelSizeSelect.value as typeof state.labelSize
		await persist()
		setStatus(`Window label size set to ${state.labelSize}.`)
	})

	if (!state.excludedDomains.length) {
		const empty = document.createElement("div")
		empty.className = "vtm-settings-empty"
		empty.textContent = "No excluded domains yet."
		list?.appendChild(empty)
	} else {
		state.excludedDomains.forEach((domain) => {
			const item = document.createElement("div")
			item.className = "vtm-settings-item"
			const label = document.createElement("div")
			label.className = "vtm-settings-domain"
			label.textContent = domain
			const button = document.createElement("button")
			button.className = "vtm-settings-remove"
			button.type = "button"
			button.textContent = "Remove"
			button.addEventListener("click", () => removeDomain(domain))
			item.append(label, button)
			list?.appendChild(item)
		})
	}
}

getSettings().then((settings) => {
	state.excludedDomains = settings.excludedDomains || []
	state.overlayMode = settings.overlayMode
	state.density = settings.density
	state.columnWidth = settings.columnWidth
	state.maxTitleLength = settings.maxTitleLength
	state.labelSize = settings.labelSize
	state.theme = settings.theme
	state.quickMarkSort = settings.quickMarkSort
	state.markAlphaOrder = settings.markAlphaOrder
	state.helpTextMode = settings.helpTextMode
	render()
	document.getElementById("vtm-domain-input")?.focus()
})
