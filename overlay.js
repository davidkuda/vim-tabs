(() => {
	if (document.getElementById("vtm-backdrop")) return;

	const backdrop = document.createElement("div");
	backdrop.id = "vtm-backdrop";
	const modal = document.createElement("div");
	modal.id = "vtm-modal";
	modal.tabIndex = 0;
	const columns = document.createElement("div");
	columns.id = "vtm-columns";
	const footer = document.createElement("div");
	footer.id = "vtm-footer";
	footer.style.cssText = "padding:4px 6px;font-size:12px;opacity:0.7";
	const trap = document.createElement("input");
	trap.style.cssText = "position:absolute;opacity:0";
	trap.ariaHidden = "true";
	modal.append(columns, footer, trap);
	backdrop.appendChild(modal);
	document.documentElement.appendChild(backdrop);
	trap.focus({ preventScroll: true });

	const state = {
		wins: [],
		sel: { w: 0, t: 0 },
		yank: null,
		queue: [],
		view: "tabs",
	};
	const undo = [];
	let hoverActive = false;

	/* ---------------- UI builders ---------------- */
	function buildCard(tab, wi, ti) {
		const d = document.createElement("div");
		d.className = "vtm-card";
		d.dataset.w = wi;
		d.dataset.t = ti;
		d.draggable = true;
		if (tab._removed) d.classList.add("vtm-removed");
		if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://")) {
			const img = document.createElement("img");
			img.className = "vtm-favicon";
			img.src = tab.favIconUrl;
			d.appendChild(img);
		}
		const span = document.createElement("span");
		span.className = "vtm-title";
		span.textContent = tab.title || tab.url;
		d.appendChild(span);
		return d;
	}

	function highlight() {
		document
			.querySelectorAll(".vtm-card.vtm-selected")
			.forEach((e) => e.classList.remove("vtm-selected"));
		const el = document.querySelector(
			`.vtm-card[data-w="${state.sel.w}"][data-t="${state.sel.t}"]`,
		);
		if (el) {
			el.classList.add("vtm-selected");
			el.scrollIntoView({ block: "nearest", inline: "nearest" });
		}
	}

	/* ---------------- Rendering ---------------- */
	function renderTabs() {
		columns.innerHTML = "";
		state.wins.forEach((win, wi) => {
			const col = document.createElement("div");
			col.className = "vtm-col";
			col.dataset.w = wi;
			columns.appendChild(col);
			win.tabs.forEach((tab, ti) => col.appendChild(buildCard(tab, wi, ti)));
		});
		highlight();
		footer.textContent =
			"press `?` to show keyboard shortcuts – drag & drop with mouse";
	}

	function renderHelp() {
		columns.innerHTML = "";
		const table = document.createElement("table");
		table.className = "vtm-help";
		table.innerHTML = `<thead><tr><th>Key</th><th>Action</th></tr></thead><tbody></tbody>`;
		const add = (k, act) => {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td><code>${k}</code></td><td>${act}</td>`;
			table.tBodies[0].appendChild(tr);
		};
		[
			["j / k", "move down / up"],
			["h / l", "prev / next column"],
			["g / G", "top / bottom"],
			["d", "cut (delete later)"],
			["y", "yank copy"],
			["p / P", "paste below / above"],
			["u", "undo delete"],
			['"', "bookmark tab"],
			["Enter / click", "focus tab"],
			["Drag", "move tab with mouse"],
			["Esc", "apply & close"],
			["?", "toggle help"],
		].forEach(([k, a]) => add(k, a));
		columns.appendChild(table);
		footer.textContent = "press `?` or ESC to go back to the tabs overview";
	}

	function render() {
		state.view === "tabs" ? renderTabs() : renderHelp();
	}

	/* ---------------- Data utils ---------------- */
	function curTab() {
		return state.wins[state.sel.w].tabs[state.sel.t];
	}
	function rmQueue(pred) {
		const i = state.queue.findIndex(pred);
		if (i !== -1) state.queue.splice(i, 1);
	}

	/* ---------------- Clipboard/actions ---------------- */
	function setYank(tab, cut = false) {
		state.yank = {
			cut,
			tabId: tab.id,
			url: tab.url,
			title: tab.title,
			favIconUrl: tab.favIconUrl,
		};
	}
	function markRemove() {
		const t = curTab();
		if (t._removed) return;
		if (t._temp) {
			rmQueue((a) => a.type === "create" && a.tempId === t._tempId);
			state.wins[state.sel.w].tabs.splice(state.sel.t, 1);
			state.sel.t = Math.max(0, state.sel.t - 1);
			renderTabs();
			return;
		}
		t._removed = true;
		setYank(t, true);
		state.queue.push({ type: "remove", tabId: t.id });
		undo.push({ w: state.sel.w, t: state.sel.t, tab: t });
		renderTabs();
	}

	function paste(above = false) {
		if (!state.yank) return;
		const dst = state.wins[state.sel.w];
		const idx = above ? state.sel.t : state.sel.t + 1;
		if (state.yank.cut) {
			rmQueue((a) => a.type === "remove" && a.tabId === state.yank.tabId);
			state.queue.push({
				type: "move",
				tabId: state.yank.tabId,
				windowId: dst.id,
				index: idx,
			});
			state.wins.forEach((w) => {
				const p = w.tabs.findIndex((tb) => tb.id === state.yank.tabId);
				if (p !== -1) w.tabs.splice(p, 1);
			});
			dst.tabs.splice(idx, 0, {
				id: state.yank.tabId,
				url: state.yank.url,
				title: state.yank.title,
				favIconUrl: state.yank.favIconUrl,
			});
		} else {
			const tempId = "tmp-" + Date.now() + "-" + Math.random();
			dst.tabs.splice(idx, 0, {
				_temp: true,
				_tempId: tempId,
				url: state.yank.url,
				title: state.yank.title,
				favIconUrl: state.yank.favIconUrl,
			});
			state.queue.push({
				type: "create",
				url: state.yank.url,
				windowId: dst.id,
				index: idx,
				tempId,
			});
		}
		state.sel.t = idx;
		renderTabs();
	}

	function yankCopy() {
		setYank(curTab(), false);
	}
	function undoDel() {
		const u = undo.pop();
		if (!u) return;
		const { w, t, tab } = u;
		tab._removed = false;
		rmQueue((a) => a.type === "remove" && a.tabId === tab.id);
		state.sel.w = w;
		state.sel.t = t;
		renderTabs();
	}
	function bookmark() {
		state.queue.push({ type: "bookmark", tabId: curTab().id });
	}

	/* ---------------- Navigation ---------------- */
	const nav = {
		j: () =>
			(state.sel.t = Math.min(
				state.sel.t + 1,
				state.wins[state.sel.w].tabs.length - 1,
			)),
		k: () => (state.sel.t = Math.max(state.sel.t - 1, 0)),
		h: () => (
			(state.sel.w = Math.max(state.sel.w - 1, 0)),
			(state.sel.t = Math.min(
				state.sel.t,
				state.wins[state.sel.w].tabs.length - 1,
			))
		),
		l: () => (
			(state.sel.w = Math.min(state.sel.w + 1, state.wins.length - 1)),
			(state.sel.t = Math.min(
				state.sel.t,
				state.wins[state.sel.w].tabs.length - 1,
			))
		),
		g: () => (state.sel.t = 0),
	};
	function bottom() {
		state.sel.t = state.wins[state.sel.w].tabs.length - 1;
	}

	/* ---------------- Commit & focus ---------------- */
	function commit(postFocus) {
		detachListeners();
		backdrop.remove();
		chrome.runtime.sendMessage({
			type: "commit",
			actions: state.queue,
			postFocus,
		});
	}
	function focusTab() {
		const t = curTab();
		if (t._temp) {
			commit({
				windowId: state.wins[state.sel.w].id,
				index: state.sel.t,
				url: t.url,
			});
		} else {
			commit(t.id);
		}
	}

	/* ---------------- Event handlers ---------------- */
	function toggleHelp() {
		state.view = state.view === "tabs" ? "help" : "tabs";
		render();
	}
	function onKey(e) {
		if (state.view === "help") {
			if (e.key === "?" || e.key === "Escape") {
				e.preventDefault();
				toggleHelp();
				return;
			}
			return;
		}
		if (e.key === "?") {
			e.preventDefault();
			toggleHelp();
			return;
		}
		if (e.key === "G") {
			e.preventDefault();
			bottom();
			renderTabs();
			return;
		}
		if (e.key === "Escape") {
			e.preventDefault();
			commit();
			return;
		}

		if (nav[e.key]) {
			e.preventDefault();
			nav[e.key]();
			renderTabs();
			return;
		}
		if (e.key === "d") {
			e.preventDefault();
			markRemove();
			return;
		}
		if (e.key === "u") {
			e.preventDefault();
			undoDel();
			return;
		}
		if (e.key === "y") {
			e.preventDefault();
			yankCopy();
			return;
		}
		if (e.key === "p") {
			e.preventDefault();
			paste(false);
			return;
		}
		if (e.key === "P") {
			e.preventDefault();
			paste(true);
			return;
		}
		if (e.key === '"') {
			e.preventDefault();
			bookmark();
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			focusTab();
			return;
		}
	}

	function hover(ev) {
		if (!hoverActive || state.view !== "tabs") return;
		const card = ev.target.closest(".vtm-card");
		if (!card) return;
		state.sel.w = +card.dataset.w;
		state.sel.t = +card.dataset.t;
		highlight();
	}
	columns.addEventListener(
		"mousemove",
		() => {
			hoverActive = true;
		},
		{ once: true },
	);

	function click(ev) {
		if (state.view !== "tabs") return;
		const card = ev.target.closest(".vtm-card");
		if (!card) return;
		state.sel.w = +card.dataset.w;
		state.sel.t = +card.dataset.t;
		focusTab();
	}

	/* Drag & drop */
	let dragSrc = null,
		placeholder = null;
	function createPlaceholder() {
		placeholder = document.createElement("div");
		placeholder.className = "vtm-placeholder";
	}
	function onDragStart(ev) {
		if (state.view !== "tabs") return;
		const card = ev.target.closest(".vtm-card");
		if (!card) return;
		dragSrc = { w: +card.dataset.w, t: +card.dataset.t };
		ev.dataTransfer.setData("text/plain", ""); // for Firefox
		createPlaceholder();
		card.classList.add("dragging");
	}
	function onDragOver(ev) {
		if (state.view !== "tabs" || !dragSrc) return;
		ev.preventDefault();
		const targetCard = ev.target.closest(".vtm-card");
		const targetCol = ev.target.closest(".vtm-col");
		if (!targetCol) return;
		if (!placeholder.parentNode) targetCol.appendChild(placeholder);
		if (targetCard && targetCard !== placeholder) {
			targetCard.parentNode.insertBefore(placeholder, targetCard);
		}
	}
	function onDragEnd(ev) {
		const dragging = document.querySelector(".vtm-card.dragging");
		if (dragging) dragging.classList.remove("dragging");
		if (placeholder && placeholder.parentNode) placeholder.remove();
		dragSrc = null;
		placeholder = null;
	}
	function onDrop(ev) {
		if (state.view !== "tabs" || !dragSrc) return;
		ev.preventDefault();
		const destCol = ev.target.closest(".vtm-col");
		if (!destCol) return;
		const destW = +destCol.dataset.w;
		let destIndex;
		const cards = [...destCol.querySelectorAll(".vtm-card")];
		destIndex = cards.indexOf(placeholder); // if placeholder inside list
		if (destIndex === -1) destIndex = cards.length;

		const tab = state.wins[dragSrc.w].tabs.splice(dragSrc.t, 1)[0];
		if (dragSrc.w === destW && dragSrc.t < destIndex) destIndex--; // adjust index after removal
		state.wins[destW].tabs.splice(destIndex, 0, tab);

		rmQueue((a) => a.type === "move" && a.tabId === tab.id);
		state.queue.push({
			type: "move",
			tabId: tab.id,
			windowId: state.wins[destW].id,
			index: destIndex,
		});

		state.sel.w = destW;
		state.sel.t = destIndex;
		renderTabs();
		onDragEnd();
	}

	function detachListeners() {
		window.removeEventListener("keydown", onKey, true);
		columns.removeEventListener("mouseover", hover);
		columns.removeEventListener("click", click);
		columns.removeEventListener("dragstart", onDragStart);
		columns.removeEventListener("dragover", onDragOver);
		columns.removeEventListener("drop", onDrop);
		columns.removeEventListener("dragend", onDragEnd);
	}

	/* ---------------- init ---------------- */
	chrome.runtime.sendMessage({ type: "getData" }, (resp) => {
		state.wins = resp.wins;
		state.sel = resp.activeSel;
		render();
		window.addEventListener("keydown", onKey, true);
		columns.addEventListener("mouseover", hover);
		columns.addEventListener("click", click);
		columns.addEventListener("dragstart", onDragStart);
		columns.addEventListener("dragover", onDragOver);
		columns.addEventListener("drop", onDrop);
		columns.addEventListener("dragend", onDragEnd);
	});
})();
