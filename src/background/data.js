export async function getData() {
	const wins = await chrome.windows.getAll({ populate: true })
	let activeSel = { w: 0, t: 0 }

	wins.forEach((win, wi) => {
		win.tabs.forEach((tab, ti) => {
			if (tab.active && win.focused) activeSel = { w: wi, t: ti }
		})
	})

	return { wins, activeSel }
}
