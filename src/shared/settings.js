const SETTINGS_KEY = "settingsData"

export async function getSettings() {
	const data = await chrome.storage.local.get(SETTINGS_KEY)
	return {
		excludedDomains: [],
		...(data[SETTINGS_KEY] || {}),
	}
}

export async function saveSettings(settings) {
	await chrome.storage.local.set({
		[SETTINGS_KEY]: {
			excludedDomains: normalizeDomains(settings.excludedDomains || []),
		},
	})
}

export function normalizeDomain(input) {
	const value = `${input || ""}`.trim().toLowerCase()
	if (!value) return ""

	const stripped = value
		.replace(/^[a-z]+:\/\//, "")
		.replace(/^www\./, "")
		.split("/")[0]
		.split("?")[0]
		.split("#")[0]
		.replace(/:\d+$/, "")
		.replace(/\.$/, "")

	return stripped
}

export function normalizeDomains(domains) {
	const seen = new Set()
	return domains.map(normalizeDomain).filter((domain) => {
		if (!domain || seen.has(domain)) return false
		seen.add(domain)
		return true
	})
}

export function isExcludedUrl(url, excludedDomains) {
	if (!url) return false

	try {
		const { hostname } = new URL(url)
		const normalizedHost = normalizeDomain(hostname)
		return excludedDomains.some((domain) => {
			return normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
		})
	} catch {
		return false
	}
}
