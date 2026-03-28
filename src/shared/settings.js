const SETTINGS_KEY = "settingsData"

export const SETTING_DENSITIES = ["comfortable", "compact"]
export const SETTING_LABEL_SIZES = ["small", "medium", "large"]
export const SETTING_THEMES = ["rose-pine", "rose-pine-moon", "rose-pine-dawn"]

export const DEFAULT_SETTINGS = {
	excludedDomains: [],
	density: "comfortable",
	labelSize: "medium",
	theme: "rose-pine-moon",
}

export async function getSettings() {
	const data = await chrome.storage.local.get(SETTINGS_KEY)
	return {
		...DEFAULT_SETTINGS,
		...(data[SETTINGS_KEY] || {}),
	}
}

export async function saveSettings(settings) {
	await chrome.storage.local.set({
		[SETTINGS_KEY]: {
			excludedDomains: normalizeDomains(settings.excludedDomains || []),
			density: SETTING_DENSITIES.includes(settings.density)
				? settings.density
				: DEFAULT_SETTINGS.density,
			labelSize: SETTING_LABEL_SIZES.includes(settings.labelSize)
				? settings.labelSize
				: DEFAULT_SETTINGS.labelSize,
			theme: SETTING_THEMES.includes(settings.theme)
				? settings.theme
				: DEFAULT_SETTINGS.theme,
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
