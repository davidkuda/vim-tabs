import type {
	FallbackState,
	OverlayContext,
	OverlaySession,
	PreviewState,
} from "../shared/types.js"

const OVERLAY_SESSIONS_KEY = "overlaySessions"

function createSessionId() {
	return `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function readSessions(): Promise<Record<string, OverlaySession>> {
	const data = await chrome.storage.local.get(OVERLAY_SESSIONS_KEY)
	return data[OVERLAY_SESSIONS_KEY] || {}
}

async function writeSessions(sessions: Record<string, OverlaySession>) {
	await chrome.storage.local.set({ [OVERLAY_SESSIONS_KEY]: sessions })
}

export function createEmptyPreviewState(): PreviewState {
	return { entries: [], borderTabIds: [] }
}

export async function createOverlaySession(
	context: OverlayContext,
	ownerTabId: number,
	ownerWindowId: number,
) {
	const sessions = await readSessions()
	const sessionId = createSessionId()
	sessions[sessionId] = {
		id: sessionId,
		createdAt: Date.now(),
		ownerTabId,
		ownerWindowId,
		context,
		preview: createEmptyPreviewState(),
		fallback: null,
	}
	await writeSessions(sessions)
	return sessions[sessionId]
}

export async function getOverlaySession(sessionId: string | undefined) {
	if (!sessionId) return null
	const sessions = await readSessions()
	return sessions[sessionId] || null
}

export async function updateOverlayPreview(
	sessionId: string,
	preview: PreviewState,
) {
	const sessions = await readSessions()
	const session = sessions[sessionId]
	if (!session) return null
	session.preview = preview
	await writeSessions(sessions)
	return session
}

export async function updateOverlayFallback(
	sessionId: string,
	fallback: FallbackState | null,
) {
	const sessions = await readSessions()
	const session = sessions[sessionId]
	if (!session) return null
	session.fallback = fallback
	await writeSessions(sessions)
	return session
}

export async function updateOverlayHostTab(
	sessionId: string,
	hostTabId: number | undefined,
) {
	const sessions = await readSessions()
	const session = sessions[sessionId]
	if (!session) return null
	session.hostTabId = hostTabId
	await writeSessions(sessions)
	return session
}

export async function clearOverlaySession(sessionId: string | undefined) {
	if (!sessionId) return
	const sessions = await readSessions()
	if (!sessions[sessionId]) return
	delete sessions[sessionId]
	await writeSessions(sessions)
}
