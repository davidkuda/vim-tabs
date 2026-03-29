export function registerColumnPanel() {
	if (customElements.get("vtm-column-panel")) return

	class VimTabsColumnPanel extends HTMLElement {
		body: HTMLDivElement | null = null

		connectedCallback() {
			if (this.body) return
			const body = document.createElement("div")
			const existing = [...this.childNodes]

			this.classList.add("vtm-col")

			const header = document.createElement("div")
			header.className = "vtm-col-header"
			header.textContent = this.getAttribute("data-title") || ""
			header.style.background = this.getAttribute("data-accent") || ""

			if (this.getAttribute("data-border")) {
				this.style.borderColor = this.getAttribute("data-border") || ""
			}
			if (this.getAttribute("data-surface")) {
				this.style.background = this.getAttribute("data-surface") || ""
			}

			this.replaceChildren(header, body)
			body.append(...existing)
			this.body = body
		}
	}

	customElements.define("vtm-column-panel", VimTabsColumnPanel)
}
