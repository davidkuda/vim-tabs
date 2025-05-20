/* -------- Inject overlay into normal pages -------- */
async function inject(tabId) {
	await chrome.scripting.insertCSS({
		target: { tabId },
		files: ["overlay.css"],
	});
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ["overlay.js"],
	});
}

chrome.action.onClicked.addListener(async (tab) => {
	try {
		await inject(tab.id);
	} catch (e) {
		// blocked page → open fallback internal page
		const fallback = await chrome.tabs.create({
			url: chrome.runtime.getURL("manager.html"),
			active: true,
		});
		try {
			await chrome.storage.local.set({ fallbackId: fallback.id });
		} catch {}
	}
});

/* -------- Message bus -------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.type === "getData") {
		getData().then(sendResponse);
		return true; // keep channel open
	}
	if (msg.type === "commit") {
		handleCommit(msg, sender && sender.tab);
	}
});

/* -------- Helpers -------- */
async function getData() {
	const wins = await chrome.windows.getAll({ populate: true });
	let activeSel = { w: 0, t: 0 };
	wins.forEach((w, wi) => {
		w.tabs.forEach((t, ti) => {
			if (t.active && w.focused) activeSel = { w: wi, t: ti };
		});
	});
	return { wins, activeSel };
}

async function handleCommit(msg, senderTab) {
	await applyActions(msg.actions || []);
	if (msg.postFocus) {
		typeof msg.postFocus === "number"
			? await focusById(msg.postFocus)
			: await focusByDescriptor(msg.postFocus);
	}
	// close fallback if needed
	try {
		const { fallbackId } = await chrome.storage.local.get("fallbackId");
		if (fallbackId && senderTab && senderTab.id === fallbackId) {
			await chrome.tabs.remove(fallbackId);
			await chrome.storage.local.remove("fallbackId");
		}
	} catch {}
}

async function focusById(id) {
	try {
		const t = await chrome.tabs.get(id);
		await chrome.windows.update(t.windowId, { focused: true });
		await chrome.tabs.update(t.id, { active: true });
	} catch (e) {
		console.error("focusById", e);
	}
}
async function focusByDescriptor(desc) {
	try {
		const { windowId, index, url } = desc;
		const tabs = await chrome.tabs.query({ windowId, url });
		let t = tabs.find((t) => t.index === index) || tabs[0];
		if (t) {
			await chrome.windows.update(t.windowId, { focused: true });
			await chrome.tabs.update(t.id, { active: true });
		}
	} catch (e) {
		console.error("focusByDesc", e);
	}
}

async function applyActions(list) {
	for (const a of list) {
		try {
			switch (a.type) {
				case "bookmark": {
					const t = await chrome.tabs.get(a.tabId);
					await chrome.bookmarks.create({ title: t.title, url: t.url });
					break;
				}
				case "create":
					await chrome.tabs.create({
						url: a.url,
						windowId: a.windowId,
						index: a.index,
						active: false,
					});
					break;
				case "remove":
					await chrome.tabs.remove(a.tabId);
					break;
				case "move":
					await chrome.tabs.move(a.tabId, {
						windowId: a.windowId,
						index: a.index,
					});
					break;
			}
		} catch (err) {
			console.error("apply", a, err);
		}
	}
}
