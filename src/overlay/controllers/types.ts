import type { OverlayState } from "../state.js"

export interface OverlayControllerContext {
	state: OverlayState
	render: () => void
	renderTabs: () => void
	clearMarksState: () => void
	clearMarksStatus: () => void
	clearSearch: () => boolean
	startSearch: () => void
	cancelSearch: () => void
	confirmSearch: () => void
	updateSearch: (query: string) => void
	jumpSearch: (direction: number) => void
	startMarkMode: (mode: "set" | "jump") => void
	jumpToMark: (key: string) => void
	openStashTab: () => void
	openStashTabInBackground: () => void
	openStandaloneStash: () => void
	toggleStash: () => void
	toggleMarks: () => void
	toggleHelp: () => void
	scrollHelp: (amount: number) => void
	clampStashSelection: () => void
	commit: (postFocus?: number | { windowId: number; index: number; url?: string }) => void
	saveCurrentMark: (persistent: boolean) => void
	startSettingsInsert: (offset: number) => void
	cancelSettingsInsert: () => void
	confirmSettingsInsert: () => void
	deleteSelectedSetting: () => void
	applyCurrentSettingsOption: () => void
	leaveSettings: () => void
	actions: {
		markRemove: () => void
		undoDel: () => void
		yankCopy: () => void
		paste: (above?: boolean) => void
		bookmark: () => void
	}
	focusTab: () => void
	excludeCurrentTabHostname: () => void
	stashCurrentWindow: () => void
	openCommandPalette: () => void
	closeCommandPalette: () => void
	updateCommandPaletteQuery: (query: string) => void
	moveCommandPaletteSelection: (delta: number) => void
	executeSelectedCommand: () => void
}

export type ViewController = (
	event: KeyboardEvent,
	ctx: OverlayControllerContext,
) => boolean
