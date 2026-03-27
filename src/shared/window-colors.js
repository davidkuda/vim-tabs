export const windowPalette = [
	{ name: "Rose", accent: "#d7827e", surface: "rgba(215, 130, 126, 0.12)" },
	{ name: "Pine", accent: "#286983", surface: "rgba(40, 105, 131, 0.12)" },
	{ name: "Gold", accent: "#ea9d34", surface: "rgba(234, 157, 52, 0.12)" },
	{ name: "Iris", accent: "#907aa9", surface: "rgba(144, 122, 169, 0.12)" },
	{ name: "Foam", accent: "#56949f", surface: "rgba(86, 148, 159, 0.12)" },
	{ name: "Love", accent: "#b4637a", surface: "rgba(180, 99, 122, 0.12)" },
]

export function getWindowColor(win, index) {
	const paletteEntry = windowPalette[index % windowPalette.length]
	const tabCount = win.tabs.length
	const label = `Window ${index + 1} · ${tabCount} tab${tabCount === 1 ? "" : "s"}`

	return {
		...paletteEntry,
		label,
	}
}
