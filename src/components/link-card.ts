import { formatUrl } from "../shared/ui.js"

type LinkCardData = {
	title?: string
	url?: string
	favIconUrl?: string
	badges?: string[]
	meta?: string
	countBadge?: string
}

export type LinkCardElement = HTMLElement & {
	data?: LinkCardData
	selected?: boolean
	removed?: boolean
	matched?: boolean
}

const fallbackData = new WeakMap<LinkCardElement, LinkCardData>()

function renderLinkCard(element: LinkCardElement) {
	const data = element.data || fallbackData.get(element) || {}
	element.classList.add("vtm-card")
	element.classList.toggle("vtm-selected", element.hasAttribute("data-selected"))
	element.classList.toggle("vtm-removed", element.hasAttribute("data-removed"))
	element.classList.toggle("vtm-match", element.hasAttribute("data-matched"))

	element.replaceChildren()

	if (data.favIconUrl && !data.favIconUrl.startsWith("chrome://")) {
		const img = document.createElement("img")
		img.className = element.classList.contains("vtm-stash-tab")
			? "vtm-stash-favicon"
			: "vtm-favicon"
		img.src = data.favIconUrl
		element.appendChild(img)
	}

	const meta = document.createElement("div")
	meta.className = element.classList.contains("vtm-stash-tab")
		? "vtm-stash-meta-block"
		: "vtm-meta"

	const head = document.createElement("div")
	head.className = "vtm-title-row"

	const title = document.createElement("span")
	title.className = element.classList.contains("vtm-stash-tab")
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
	subtitle.className = element.classList.contains("vtm-stash-tab")
		? "vtm-stash-tab-url"
		: "vtm-url"
	subtitle.textContent = data.meta || formatUrl(data.url)

	meta.append(head, subtitle)
	element.appendChild(meta)
}

export function registerLinkCard() {
	const registry = globalThis.customElements
	if (!registry) return
	if (registry.get("vtm-link-card")) return

	class VimTabsLinkCard extends HTMLElement {
		declare data: LinkCardData

		connectedCallback() {
			renderLinkCard(this)
		}

		set selected(value: boolean) {
			this.toggleAttribute("data-selected", value)
			renderLinkCard(this)
		}

		set removed(value: boolean) {
			this.toggleAttribute("data-removed", value)
			renderLinkCard(this)
		}

		set matched(value: boolean) {
			this.toggleAttribute("data-matched", value)
			renderLinkCard(this)
		}
	}

	registry.define("vtm-link-card", VimTabsLinkCard)
}

export function createLinkCard() {
	if (globalThis.customElements?.get("vtm-link-card")) {
		return document.createElement("vtm-link-card") as LinkCardElement
	}

	const element = document.createElement("div") as LinkCardElement
	Object.defineProperty(element, "data", {
		get() {
			return fallbackData.get(element)
		},
		set(value: LinkCardData) {
			fallbackData.set(element, value)
			renderLinkCard(element)
		},
	})
	Object.defineProperty(element, "selected", {
		set(value: boolean) {
			element.toggleAttribute("data-selected", value)
			renderLinkCard(element)
		},
	})
	Object.defineProperty(element, "removed", {
		set(value: boolean) {
			element.toggleAttribute("data-removed", value)
			renderLinkCard(element)
		},
	})
	Object.defineProperty(element, "matched", {
		set(value: boolean) {
			element.toggleAttribute("data-matched", value)
			renderLinkCard(element)
		},
	})
	return element
}
