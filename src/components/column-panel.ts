export type ColumnPanelElement = HTMLElement & {
	body?: HTMLDivElement | null
}

function mountColumnPanel(element: ColumnPanelElement) {
	if (element.body) {
		const header = element.querySelector<HTMLDivElement>(".vtm-col-header")
		if (header) {
			header.textContent = element.getAttribute("data-title") || ""
			header.style.background = element.getAttribute("data-accent") || ""
		}
		if (element.getAttribute("data-border")) {
			element.style.borderColor = element.getAttribute("data-border") || ""
		}
		if (element.getAttribute("data-surface")) {
			element.style.background = element.getAttribute("data-surface") || ""
		}
		return
	}
	const body = document.createElement("div")
	const existing = [...element.childNodes]

	element.classList.add("vtm-col")

	const header = document.createElement("div")
	header.className = "vtm-col-header"
	header.textContent = element.getAttribute("data-title") || ""
	header.style.background = element.getAttribute("data-accent") || ""

	if (element.getAttribute("data-border")) {
		element.style.borderColor = element.getAttribute("data-border") || ""
	}
	if (element.getAttribute("data-surface")) {
		element.style.background = element.getAttribute("data-surface") || ""
	}

	element.replaceChildren(header, body)
	body.append(...existing)
	element.body = body
}

export function registerColumnPanel() {
	const registry = globalThis.customElements
	if (!registry) return
	if (registry.get("vtm-column-panel")) return

	class VimTabsColumnPanel extends HTMLElement {
		body: HTMLDivElement | null = null

		connectedCallback() {
			mountColumnPanel(this)
		}
	}

	registry.define("vtm-column-panel", VimTabsColumnPanel)
}

export function createColumnPanel() {
	if (globalThis.customElements?.get("vtm-column-panel")) {
		return document.createElement("vtm-column-panel") as ColumnPanelElement
	}

	const element = document.createElement("section") as ColumnPanelElement
	return element
}

export function prepareColumnPanel(element: ColumnPanelElement) {
	mountColumnPanel(element)
	return element
}
