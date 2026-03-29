import { formatUrl } from "../shared/ui.js"

export function registerLinkCard() {
	if (customElements.get("vtm-link-card")) return

	class VimTabsLinkCard extends HTMLElement {
		declare data: {
			title?: string
			url?: string
			favIconUrl?: string
			badges?: string[]
			meta?: string
			countBadge?: string
		}

		connectedCallback() {
			this.render()
		}

		set selected(value: boolean) {
			this.toggleAttribute("data-selected", value)
			this.render()
		}

		set removed(value: boolean) {
			this.toggleAttribute("data-removed", value)
			this.render()
		}

		set matched(value: boolean) {
			this.toggleAttribute("data-matched", value)
			this.render()
		}

		render() {
			const data = this.data || {}
			this.classList.add("vtm-card")
			this.classList.toggle("vtm-selected", this.hasAttribute("data-selected"))
			this.classList.toggle("vtm-removed", this.hasAttribute("data-removed"))
			this.classList.toggle("vtm-match", this.hasAttribute("data-matched"))

			this.replaceChildren()

			if (data.favIconUrl && !data.favIconUrl.startsWith("chrome://")) {
				const img = document.createElement("img")
				img.className = this.classList.contains("vtm-stash-tab")
					? "vtm-stash-favicon"
					: "vtm-favicon"
				img.src = data.favIconUrl
				this.appendChild(img)
			}

			const meta = document.createElement("div")
			meta.className = this.classList.contains("vtm-stash-tab")
				? "vtm-stash-meta-block"
				: "vtm-meta"

			const head = document.createElement("div")
			head.className = "vtm-title-row"

			const title = document.createElement("span")
			title.className = this.classList.contains("vtm-stash-tab")
				? "vtm-stash-tab-title"
				: "vtm-title"
			title.textContent = data.title || data.url || ""
			head.appendChild(title)

			if (data.badges?.length) {
				const badges = document.createElement("div")
				badges.className = "vtm-mark-badges"
				data.badges.forEach((badgeValue) => {
					const badge = document.createElement("span")
					badge.className = "vtm-mark-badge"
					badge.textContent = badgeValue
					badges.appendChild(badge)
				})
				head.appendChild(badges)
			}

			if (data.countBadge) {
				const badge = document.createElement("span")
				badge.className = "vtm-stash-count"
				badge.textContent = data.countBadge
				head.appendChild(badge)
			}

			const subtitle = document.createElement("span")
			subtitle.className = this.classList.contains("vtm-stash-tab")
				? "vtm-stash-tab-url"
				: "vtm-url"
			subtitle.textContent = data.meta || formatUrl(data.url)

			meta.append(head, subtitle)
			this.appendChild(meta)
		}
	}

	customElements.define("vtm-link-card", VimTabsLinkCard)
}
