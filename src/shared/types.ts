export type OverlayView =
	| "tabs"
	| "stash"
	| "marks"
	| "mark-create"
	| "settings"
	| "help"

export type MarksMode = "browse" | "quick"

export interface TabDescriptor {
	id?: number
	windowId?: number
	index?: number
	title?: string
	url?: string
	favIconUrl?: string
	active?: boolean
	_removed?: boolean
	_temp?: boolean
	_tempId?: string
}

export interface WindowDescriptor {
	id: number
	focused?: boolean
	tabs: TabDescriptor[]
}

export interface TabSelection {
	w: number
	t: number
}

export interface StashSelection {
	s: number
	t: number
}

export interface MarkRecord {
	key: string
	tabId?: number
	windowId?: number
	title?: string
	url?: string
	favIconUrl?: string
	live?: boolean
	persistent?: boolean
	usageCount?: number
	lastUsedAt?: number
	updatedAt?: number
}

export interface MarksData {
	marks: Record<string, MarkRecord>
}

export interface SettingsData {
	excludedDomains: string[]
	density: "comfortable" | "compact"
	labelSize: "small" | "medium" | "large"
	theme: "rose-pine" | "rose-pine-moon" | "rose-pine-dawn"
	quickMarkSort: "recent" | "frequent"
	markAlphaOrder: "small-first" | "capital-first"
	helpTextMode: "normal" | "minimal"
}

export interface StashedTab {
	id: string
	title: string
	url: string
	favIconUrl: string
	windowIndex: number
	tabIndex: number
}

export interface StashSession {
	id: string
	createdAt: number
	tabs: StashedTab[]
}

export interface StashData {
	sessions: StashSession[]
}

export interface OverlayContext {
	initialView: OverlayView
	initialMarksMode: MarksMode
	markTarget: TabDescriptor | null
	minimalPrompt: boolean
}

export interface PreviewEntry {
	windowId: number
	originalTabId: number
	helperTabId: number
}

export interface PreviewState {
	entries: PreviewEntry[]
	borderTabIds: number[]
}

export interface FallbackState {
	tabId: number
	originalTabId: number
	windowId: number
}

export interface OverlaySession {
	id: string
	createdAt: number
	ownerTabId: number
	ownerWindowId: number
	context: OverlayContext
	preview: PreviewState
	fallback: FallbackState | null
}

export interface GetDataResponse {
	wins: WindowDescriptor[]
	activeSel: TabSelection
}

export interface FocusDescriptor {
	windowId: number
	index?: number
	url?: string
}

export type QueuedAction =
	| {
			type: "bookmark"
			tabId: number
	  }
	| {
			type: "create"
			url: string
			windowId: number
			index: number
			tempId?: string
	  }
	| {
			type: "remove"
			tabId: number
	  }
	| {
			type: "move"
			tabId: number
			windowId: number
			index: number
	  }

export interface OverlayBootstrap {
	sessionId: string
	context: OverlayContext
	data: GetDataResponse
	marks: Record<string, MarkRecord>
	settings: SettingsData
}
