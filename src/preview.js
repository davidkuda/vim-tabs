const params = new URLSearchParams(window.location.search)
const color = params.get("color")
const label = params.get("label")

if (color) {
	document.documentElement.style.setProperty("--accent", color)
}

document.getElementById("label").textContent = label || "Window Preview"
document.title = label || "VimTabs Preview"
