import type {
	CommandPaletteItem,
	OverlaySearchSnapshot,
	OverlayState,
} from "./state.js"
import type { OverlayView } from "../shared/types.js"

export type OverlayAction =
	| { type: "marks/clear-pending" }
	| { type: "marks/set-pending"; pending: OverlayState["marks"]["pending"] }
	| { type: "marks/set-status"; status: string }
	| { type: "search/start"; snapshot: OverlaySearchSnapshot }
	| { type: "search/update"; query: string }
	| { type: "search/clear-last-query" }
	| { type: "search/finish" }
	| { type: "search/cancel"; snapshot: OverlaySearchSnapshot | null }
	| { type: "view/set"; view: OverlayView }
	| { type: "help/open"; returnView: OverlayView; helpTab: OverlayState["helpTab"] }
	| { type: "help/close" }
	| { type: "command/open"; items: CommandPaletteItem[] }
	| { type: "command/close" }
	| { type: "command/update-query"; query: string; items: CommandPaletteItem[] }
	| { type: "command/select"; index: number }

export function applyOverlayAction(state: OverlayState, action: OverlayAction) {
	switch (action.type) {
		case "marks/clear-pending":
			state.marks.pending = null
			state.marks.status = ""
			return
		case "marks/set-pending":
			state.marks.pending = action.pending
			state.marks.status = ""
			return
		case "marks/set-status":
			state.marks.status = action.status
			return
		case "search/start":
			state.marks.pending = null
			state.marks.status = ""
			state.search.active = true
			state.search.query = ""
			state.search.originSel = action.snapshot
			return
		case "search/update":
			state.search.query = action.query
			return
		case "search/clear-last-query":
			state.search.lastQuery = ""
			return
		case "search/finish":
			state.search.active = false
			state.search.query = ""
			state.search.originSel = null
			return
		case "search/cancel":
			if (action.snapshot) {
				state.sel = { ...action.snapshot.tabs }
				state.stash.sel = { ...action.snapshot.stash }
			}
			state.search.active = false
			state.search.query = ""
			state.search.originSel = null
			return
		case "view/set":
			state.view = action.view
			return
		case "help/open":
			state.helpReturnView = action.returnView
			state.helpTab = action.helpTab
			state.view = "help"
			return
		case "help/close":
			state.view = state.helpReturnView || "tabs"
			return
		case "command/open":
			state.command.active = true
			state.command.query = ""
			state.command.sel = 0
			state.command.items = action.items
			return
		case "command/close":
			state.command.active = false
			state.command.query = ""
			state.command.sel = 0
			state.command.items = []
			return
		case "command/update-query":
			state.command.query = action.query
			state.command.sel = 0
			state.command.items = action.items
			return
		case "command/select":
			state.command.sel = action.index
			return
	}
}
