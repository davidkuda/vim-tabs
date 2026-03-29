import test from "node:test"
import assert from "node:assert/strict"

import { getCommandPaletteItems } from "../src/overlay/commands.js"
import { createState } from "../src/overlay/state.js"
import { applyOverlayAction } from "../src/overlay/reducer.js"
import {
	collectMatches,
	compareMarkKeys,
	getHelpTabForView,
	getMarkColumns,
} from "../src/overlay/selectors.js"
import {
	isExcludedUrl,
	normalizeDomain,
	normalizeDomains,
} from "../src/shared/settings.js"
import { createSessionFromWindow } from "../src/shared/stash.js"

test("normalizeDomain strips protocol, www, paths, and ports", () => {
	assert.equal(
		normalizeDomain("https://www.chat.openai.com:443/c/123?x=1"),
		"chat.openai.com",
	)
})

test("normalizeDomains deduplicates normalized values", () => {
	assert.deepEqual(normalizeDomains(["OpenAI.com", "www.openai.com", ""]), ["openai.com"])
})

test("isExcludedUrl matches exact domains and subdomains", () => {
	assert.equal(isExcludedUrl("https://chat.openai.com", ["openai.com"]), true)
	assert.equal(isExcludedUrl("https://example.com", ["openai.com"]), false)
})

test("createSessionFromWindow preserves tab ordering", () => {
	const session = createSessionFromWindow({
		id: 1,
		tabs: [
			{ id: 10, title: "A", url: "https://a.test", favIconUrl: "" },
			{ id: 11, title: "B", url: "https://b.test", favIconUrl: "" },
		],
	})
	assert.equal(session.tabs.length, 2)
	assert.equal(session.tabs[0].windowIndex, 0)
	assert.equal(session.tabs[0].tabIndex, 0)
	assert.equal(session.tabs[1].tabIndex, 1)
})

test("reducer search lifecycle toggles active state and query", () => {
	const state = createState()
	applyOverlayAction(state, {
		type: "search/start",
		snapshot: { view: "tabs", tabs: { w: 1, t: 2 }, stash: { s: 0, t: 0 } },
	})
	assert.equal(state.search.active, true)
	applyOverlayAction(state, { type: "search/update", query: "docs" })
	assert.equal(state.search.query, "docs")
	applyOverlayAction(state, { type: "search/finish" })
	assert.equal(state.search.active, false)
	assert.equal(state.search.query, "")
})

test("reducer command palette open and close", () => {
	const state = createState()
	applyOverlayAction(state, {
		type: "command/open",
		items: [{ id: "x", title: "X", subtitle: "Y", keys: "Z" }],
	})
	assert.equal(state.command.active, true)
	assert.equal(state.command.items.length, 1)
	applyOverlayAction(state, { type: "command/close" })
	assert.equal(state.command.active, false)
	assert.equal(state.command.items.length, 0)
})

test("compareMarkKeys honors capital-first ordering", () => {
	assert.equal(compareMarkKeys("A", "a", "capital-first"), -1)
	assert.equal(compareMarkKeys("a", "A", "small-first"), -1)
})

test("getMarkColumns separates temporary and persistent marks", () => {
	const state = createState()
	state.marks.items = {
		a: { key: "a", live: true, title: "temp", url: "https://a.test" },
		A: { key: "A", persistent: true, title: "perm", url: "https://b.test" },
	}
	const [temporary, persistent] = getMarkColumns(state)
	assert.equal(temporary.length, 1)
	assert.equal(persistent.length, 1)
	assert.equal(temporary[0].key, "a")
	assert.equal(persistent[0].key, "A")
})

test("collectMatches searches tabs or stash depending on current view", () => {
	const state = createState()
	state.wins = [
		{ id: 1, tabs: [{ id: 10, title: "Docs", url: "https://docs.test" }] },
	]
	assert.deepEqual(collectMatches(state, "docs"), [{ w: 0, t: 0 }])
	state.view = "stash"
	state.stash.sessions = [
		{ id: "s1", createdAt: 1, tabs: [{ id: "t1", title: "Notes", url: "https://notes.test", favIconUrl: "", windowIndex: 0, tabIndex: 0 }] },
	]
	assert.deepEqual(collectMatches(state, "notes"), [{ s: 0, t: 0 }])
})

test("getHelpTabForView returns a context-aware help tab", () => {
	const state = createState()
	state.view = "marks"
	assert.equal(getHelpTabForView(state), "marks")
	state.view = "settings"
	assert.equal(getHelpTabForView(state), "general")
})

test("command palette items are filtered by context and query", () => {
	const state = createState()
	state.view = "tabs"
	const tabsCommands = getCommandPaletteItems(state, "bookmark")
	assert.equal(tabsCommands.some((item) => item.id === "bookmark-selected-tab"), true)
	state.view = "help"
	const helpCommands = getCommandPaletteItems(state, "bookmark")
	assert.equal(helpCommands.some((item) => item.id === "bookmark-selected-tab"), false)
})
