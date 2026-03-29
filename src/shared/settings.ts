import type { SettingsData } from "./types.js"

const SETTINGS_KEY = "settingsData"

export const SETTING_DENSITIES = ["comfortable", "compact"] as const
export const SETTING_LABEL_SIZES = ["small", "medium", "large"] as const
export const SETTING_THEMES = [
	"rose-pine",
	"rose-pine-moon",
	"rose-pine-dawn",
] as const
export const SETTING_QUICK_MARK_SORTS = ["recent", "frequent"] as const
export const SETTING_MARK_ALPHA_ORDERS = [
	"small-first",
	"capital-first",
] as const
export const SETTING_HELP_TEXT_MODES = ["normal", "minimal"] as const

export const DEFAULT_SETTINGS: SettingsData = {
	excludedDomains: [],
	density: "comfortable",
	labelSize: "medium",
	theme: "rose-pine-moon",
	quickMarkSort: "frequent",
	markAlphaOrder: "small-first",
	helpTextMode: "normal",
}

export async function getSettings(): Promise<SettingsData> {
	const data = await chrome.storage.local.get(SETTINGS_KEY)
	return {
		...DEFAULT_SETTINGS,
		...(data[SETTINGS_KEY] || {}),
	}
}

export async function saveSettings(settings: Partial<SettingsData>) {
	await chrome.storage.local.set({
		[SETTINGS_KEY]: {
			excludedDomains: normalizeDomains(settings.excludedDomains || []),
			density: SETTING_DENSITIES.includes(settings.density as never)
				? settings.density
				: DEFAULT_SETTINGS.density,
			labelSize: SETTING_LABEL_SIZES.includes(settings.labelSize as never)
				? settings.labelSize
				: DEFAULT_SETTINGS.labelSize,
			theme: SETTING_THEMES.includes(settings.theme as never)
				? settings.theme
				: DEFAULT_SETTINGS.theme,
			quickMarkSort: SETTING_QUICK_MARK_SORTS.includes(
				settings.quickMarkSort as never,
			)
				? settings.quickMarkSort
				: DEFAULT_SETTINGS.quickMarkSort,
			markAlphaOrder: SETTING_MARK_ALPHA_ORDERS.includes(
				settings.markAlphaOrder as never,
			)
				? settings.markAlphaOrder
				: DEFAULT_SETTINGS.markAlphaOrder,
			helpTextMode: SETTING_HELP_TEXT_MODES.includes(
				settings.helpTextMode as never,
			)
				? settings.helpTextMode
				: DEFAULT_SETTINGS.helpTextMode,
		},
	})
}

export function normalizeDomain(input: string | undefined | null) {
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

export function normalizeDomains(domains: Array<string | undefined | null>) {
	const seen = new Set<string>()
	return domains.map(normalizeDomain).filter((domain) => {
		if (!domain || seen.has(domain)) return false
		seen.add(domain)
		return true
	})
}

export function isExcludedUrl(url: string | undefined, excludedDomains: string[]) {
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
