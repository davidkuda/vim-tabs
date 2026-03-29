const params = new URLSearchParams(window.location.search)
const color = params.get("color")
const label = params.get("label")
const theme = params.get("theme")
const labelSize = params.get("labelSize")

const previewThemes = {
	"rose-pine": {
		colorScheme: "dark",
		bg: "#191724",
		text: "#f2e9e1",
	},
	"rose-pine-moon": {
		colorScheme: "dark",
		bg: "#232136",
		text: "#f6f0ea",
	},
	"rose-pine-dawn": {
		colorScheme: "light",
		bg: "#faf4ed",
		text: "#575279",
	},
} as const

if (color) {
	document.documentElement.style.setProperty("--accent", color)
}

if (theme && theme in previewThemes) {
	document.documentElement.style.setProperty(
		"color-scheme",
		previewThemes[theme as keyof typeof previewThemes].colorScheme,
	)
	document.documentElement.style.setProperty(
		"--preview-bg",
		previewThemes[theme as keyof typeof previewThemes].bg,
	)
	document.documentElement.style.setProperty(
		"--preview-text",
		previewThemes[theme as keyof typeof previewThemes].text,
	)
}

if (labelSize === "small") {
	document.documentElement.style.setProperty("--preview-label-size", "2rem")
} else if (labelSize === "large") {
	document.documentElement.style.setProperty("--preview-label-size", "3.5rem")
}

document.getElementById("label")!.textContent = label || "Window Preview"
document.title = label || "VimTabs Preview"
