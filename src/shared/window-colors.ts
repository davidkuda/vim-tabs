import type { SettingsData, WindowDescriptor } from "./types.js"

type ThemeName = SettingsData["theme"]

interface UiTheme {
	name: string
	colorScheme: "dark" | "light"
	backdrop: {
		base: string
		washTop: string
		washBottom: string
		frameVeil: string
	}
	modal: {
		base: string
		glow: string
		ring: string
	}
	text: {
		primary: string
		muted: string
		subtle: string
	}
	palette: Array<{ name: string; accent: string; surface: string }>
}

const THEMES: Record<ThemeName, UiTheme> = {
	"rose-pine": {
		name: "Rose Pine",
		colorScheme: "dark",
		backdrop: {
			base: "rgba(25, 23, 36, 0.44)",
			washTop: "rgba(235, 111, 146, 0.14)",
			washBottom: "rgba(49, 116, 143, 0.16)",
			frameVeil: "rgba(10,10,12,0.14)",
		},
		modal: {
			base: "rgba(38, 35, 58, 0.96)",
			glow: "rgba(255, 255, 255, 0.05)",
			ring: "rgba(255, 255, 255, 0.08)",
		},
		text: {
			primary: "#f2e9e1",
			muted: "rgba(242, 233, 225, 0.68)",
			subtle: "rgba(242, 233, 225, 0.46)",
		},
		palette: [
			{ name: "Rose", accent: "#eb6f92", surface: "rgba(235, 111, 146, 0.12)" },
			{ name: "Pine", accent: "#31748f", surface: "rgba(49, 116, 143, 0.12)" },
			{ name: "Gold", accent: "#f6c177", surface: "rgba(246, 193, 119, 0.12)" },
			{ name: "Iris", accent: "#c4a7e7", surface: "rgba(196, 167, 231, 0.12)" },
			{ name: "Foam", accent: "#9ccfd8", surface: "rgba(156, 207, 216, 0.12)" },
			{ name: "Love", accent: "#ebbcba", surface: "rgba(235, 188, 186, 0.12)" },
		],
	},
	"rose-pine-moon": {
		name: "Rose Pine Moon",
		colorScheme: "dark",
		backdrop: {
			base: "rgba(35, 33, 54, 0.44)",
			washTop: "rgba(215, 130, 126, 0.14)",
			washBottom: "rgba(40, 105, 131, 0.16)",
			frameVeil: "rgba(10,10,12,0.14)",
		},
		modal: {
			base: "rgba(42, 39, 63, 0.96)",
			glow: "rgba(255, 255, 255, 0.05)",
			ring: "rgba(255, 255, 255, 0.08)",
		},
		text: {
			primary: "#f6f0ea",
			muted: "rgba(246, 240, 234, 0.68)",
			subtle: "rgba(246, 240, 234, 0.46)",
		},
		palette: [
			{ name: "Rose", accent: "#d7827e", surface: "rgba(215, 130, 126, 0.12)" },
			{ name: "Pine", accent: "#286983", surface: "rgba(40, 105, 131, 0.12)" },
			{ name: "Gold", accent: "#ea9d34", surface: "rgba(234, 157, 52, 0.12)" },
			{ name: "Iris", accent: "#907aa9", surface: "rgba(144, 122, 169, 0.12)" },
			{ name: "Foam", accent: "#56949f", surface: "rgba(86, 148, 159, 0.12)" },
			{ name: "Love", accent: "#b4637a", surface: "rgba(180, 99, 122, 0.12)" },
		],
	},
	"rose-pine-dawn": {
		name: "Rose Pine Dawn",
		colorScheme: "light",
		backdrop: {
			base: "rgba(250, 244, 237, 0.78)",
			washTop: "rgba(181, 131, 124, 0.18)",
			washBottom: "rgba(86, 148, 159, 0.16)",
			frameVeil: "rgba(255,255,255,0.28)",
		},
		modal: {
			base: "rgba(255, 250, 243, 0.94)",
			glow: "rgba(255, 255, 255, 0.66)",
			ring: "rgba(121, 95, 77, 0.14)",
		},
		text: {
			primary: "#575279",
			muted: "rgba(87, 82, 121, 0.72)",
			subtle: "rgba(87, 82, 121, 0.52)",
		},
		palette: [
			{ name: "Rose", accent: "#b4637a", surface: "rgba(180, 99, 122, 0.12)" },
			{ name: "Pine", accent: "#286983", surface: "rgba(40, 105, 131, 0.12)" },
			{ name: "Gold", accent: "#ea9d34", surface: "rgba(234, 157, 52, 0.12)" },
			{ name: "Iris", accent: "#907aa9", surface: "rgba(144, 122, 169, 0.12)" },
			{ name: "Foam", accent: "#56949f", surface: "rgba(86, 148, 159, 0.12)" },
			{ name: "Love", accent: "#d7827e", surface: "rgba(215, 130, 126, 0.12)" },
		],
	},
}

export function getUiTheme(themeName: ThemeName = "rose-pine-moon") {
	return THEMES[themeName] || THEMES["rose-pine-moon"]
}

export function getWindowColor(
	win: WindowDescriptor,
	index: number,
	themeName: ThemeName = "rose-pine-moon",
) {
	const theme = getUiTheme(themeName)
	const paletteEntry = theme.palette[index % theme.palette.length]
	const tabCount = win.tabs.length
	const label = `Window ${index + 1} · ${tabCount} tab${tabCount === 1 ? "" : "s"}`

	return {
		...paletteEntry,
		label,
	}
}

export function getLabelFontSize(labelSize: SettingsData["labelSize"] = "medium") {
	if (labelSize === "small") return "2rem"
	if (labelSize === "large") return "3.5rem"
	return "3rem"
}
