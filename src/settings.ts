import { getSettings, normalizeDomain, saveSettings } from "./shared/settings.js"

const root = document.createElement("div")
root.id = "vtm-settings"
document.body.appendChild(root)

const state = {
	excludedDomains: [],
	density: "comfortable",
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
		density: state.density,
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
			<div class="vtm-settings-status">${state.status}</div>
		</section>
	`

	const form = document.getElementById("vtm-settings-form")
	const input = document.getElementById("vtm-domain-input") as HTMLInputElement | null
	const list = document.getElementById("vtm-settings-list")

	form?.addEventListener("submit", async (event) => {
		event.preventDefault()
		const value = input?.value || ""
		if (input) input.value = ""
		await addDomain(value)
		input?.focus()
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
			item.innerHTML = `
				<div class="vtm-settings-domain">${domain}</div>
				<button class="vtm-settings-remove" type="button">Remove</button>
			`
			item
				.querySelector(".vtm-settings-remove")
				?.addEventListener("click", () => removeDomain(domain))
			list?.appendChild(item)
		})
	}
}

getSettings().then((settings) => {
	state.excludedDomains = settings.excludedDomains || []
	state.density = settings.density
	state.labelSize = settings.labelSize
	state.theme = settings.theme
	state.quickMarkSort = settings.quickMarkSort
	state.markAlphaOrder = settings.markAlphaOrder
	state.helpTextMode = settings.helpTextMode
	render()
	document.getElementById("vtm-domain-input")?.focus()
})
