export function formatUrl(url: string | undefined) {
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

export function escapeHtml(text: string | number | undefined | null) {
	return `${text ?? ""}`
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

export function matchesTextQuery(
	entry: { title?: string; url?: string },
	query: string | undefined,
) {
	if (!query) return false
	const haystack = `${entry.title || ""} ${entry.url || ""}`.toLowerCase()
	return haystack.includes(query.toLowerCase())
}

export function getStashCounts(
	sessions: Array<{ tabs: Array<{ url?: string }> }> | undefined,
) {
	const counts = new Map<string, number>()
	;(sessions || []).forEach((session) => {
		session.tabs.forEach((tab) => {
			if (!tab.url) return
			counts.set(tab.url, (counts.get(tab.url) || 0) + 1)
		})
	})
	return counts
}
