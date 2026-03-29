import type { CommandPaletteItem, OverlayState } from "./state.js"

export interface OverlayCommand {
	id: string
	title: string
	subtitle: string
	keys: string
	when?: (state: OverlayState) => boolean
}

const COMMANDS: OverlayCommand[] = [
	{
		id: "focus-selected-tab",
		title: "Focus selected tab",
		subtitle: "Apply queued actions and focus the current tab",
		keys: "Enter",
		when: (state) => state.view === "tabs",
	},
	{
		id: "open-help",
		title: "Open help",
		subtitle: "Show keyboard help for the current mode",
		keys: "?",
	},
	{
		id: "open-settings",
		title: "Open settings",
		subtitle: "Adjust exclusions, layout, and marks behavior",
		keys: ":",
	},
	{
		id: "open-stash",
		title: "Open stash",
		subtitle: "Browse stashed sessions inside the overlay",
		keys: "\"",
	},
	{
		id: "open-full-stash",
		title: "Open full stash page",
		subtitle: "Leave the overlay and open the standalone stash page",
		keys: ";",
	},
	{
		id: "open-marks",
		title: "Open marks",
		subtitle: "Browse and jump to saved marks",
		keys: "M",
	},
	{
		id: "stash-current-window",
		title: "Stash current window",
		subtitle: "Save the current window and close its stashable tabs",
		keys: "X",
		when: (state) => state.view === "tabs",
	},
	{
		id: "bookmark-selected-tab",
		title: "Bookmark selected tab",
		subtitle: "Queue a bookmark action for the current tab",
		keys: "b",
		when: (state) => state.view === "tabs",
	},
	{
		id: "exclude-current-domain",
		title: "Exclude current domain",
		subtitle: "Skip the current tab hostname when stashing",
		keys: "e",
		when: (state) => state.view === "tabs",
	},
	{
		id: "set-mark",
		title: "Set mark",
		subtitle: "Start mark mode for the selected tab",
		keys: "m",
		when: (state) => state.view === "tabs",
	},
	{
		id: "jump-to-mark",
		title: "Jump to mark",
		subtitle: "Prompt for a mark key and jump to it",
		keys: "'",
		when: (state) => state.view === "tabs" || state.view === "stash" || state.view === "marks",
	},
	{
		id: "close-overlay",
		title: "Close overlay",
		subtitle: "Apply queued actions and exit",
		keys: "Esc",
	},
]

export function getCommandPaletteItems(state: OverlayState, query = ""): CommandPaletteItem[] {
	const lowered = query.trim().toLowerCase()
	return COMMANDS.filter((command) => (command.when ? command.when(state) : true))
		.filter((command) => {
			if (!lowered) return true
			return `${command.title} ${command.subtitle} ${command.keys}`
				.toLowerCase()
				.includes(lowered)
		})
		.map((command) => ({
			id: command.id,
			title: command.title,
			subtitle: command.subtitle,
			keys: command.keys,
		}))
}
