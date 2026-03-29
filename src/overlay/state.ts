import type {
	MarkRecord,
	OverlayView,
	QueuedAction,
	SettingsData,
	StashSession,
	TabDescriptor,
	WindowDescriptor,
} from "../shared/types.js"

export interface OverlaySearchSnapshot {
	view: OverlayView
	tabs: { w: number; t: number }
	stash: { s: number; t: number }
}

export interface OverlayState {
	wins: WindowDescriptor[]
	sel: { w: number; t: number }
	stash: {
		sessions: StashSession[]
		sel: { s: number; t: number }
	}
	marks: {
		items: Record<string, MarkRecord>
		mode: "browse" | "quick"
		sel: { col: number; rows: number[] }
		pending: "set" | "jump" | null
		status: string
		targetTab: TabDescriptor | null
		draftKey: string
		minimalPrompt: boolean
	}
	settings: SettingsData & {
		sel: { col: number; rows: number[] }
		draft: string
		editing: boolean
		insertIndex: number
		returnView: OverlayView
		status: string
	}
	yank: {
		cut: boolean
		tabId?: number
		url?: string
		title?: string
		favIconUrl?: string
	} | null
	queue: QueuedAction[]
	helpReturnView: OverlayView
	helpTab: "general" | "tabs" | "stash" | "marks"
	view: OverlayView
	search: {
		active: boolean
		query: string
		lastQuery: string
		originSel: OverlaySearchSnapshot | null
	}
}

export interface UndoEntry {
	w: number
	t: number
	tab: TabDescriptor
}

export function createState(): OverlayState {
	return {
		wins: [],
		sel: { w: 0, t: 0 },
		stash: {
			sessions: [],
			sel: { s: 0, t: 0 },
		},
		marks: {
			items: {},
			mode: "browse",
			sel: { col: 0, rows: [0, 0] },
			pending: null,
			status: "",
			targetTab: null,
			draftKey: "",
			minimalPrompt: false,
		},
		settings: {
			excludedDomains: [],
			sel: { col: 0, rows: [0, 0, 0, 0] },
			draft: "",
			editing: false,
			insertIndex: 0,
			returnView: "tabs",
			status: "",
			density: "comfortable",
			labelSize: "medium",
			theme: "rose-pine-moon",
			quickMarkSort: "frequent",
			markAlphaOrder: "small-first",
			helpTextMode: "normal",
		},
		yank: null,
		queue: [],
		helpReturnView: "tabs",
		helpTab: "general",
		view: "tabs",
		search: {
			active: false,
			query: "",
			lastQuery: "",
			originSel: null,
		},
	}
}

export function createUndoStack(): UndoEntry[] {
	return []
}

export function curTab(state: OverlayState) {
	return state.wins[state.sel.w].tabs[state.sel.t]
}

export function rmQueue(
	state: OverlayState,
	predicate: (action: QueuedAction) => boolean,
) {
	const index = state.queue.findIndex(predicate)
	if (index !== -1) state.queue.splice(index, 1)
}
