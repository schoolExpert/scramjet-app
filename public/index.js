"use strict";
const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});
scramjet.init();
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
let libcurlLoaded = false;
async function initializeLibcurl() {
	if (libcurlLoaded) return;
	try {
		const libcurlModule = await import("/libcurl/index.mjs");
		if (libcurlModule.default && typeof libcurlModule.default.load_wasm === "function") {
			await libcurlModule.default.load_wasm();
			libcurlLoaded = true;
		}
	} catch (err) {
		console.warn("Failed to pre-load libcurl WASM:", err);
	}
}
function isDirectUrl(inputValue) {
	const trimmed = inputValue.trim();
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
	if (trimmed.includes(".") && !trimmed.includes(" ")) return true;
	return false;
}
function formatDirectUrl(input) {
	const trimmed = input.trim();
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
	return "https://" + trimmed;
}
async function launch(url) {
	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}
	try {
		await initializeLibcurl();
	} catch (err) {
		console.warn("Error during libcurl initialization:", err);
	}
	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [
			{ websocket: wispUrl },
		]);
	}
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	frame.go(url);
}
form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const inputValue = address.value;
	const url = isDirectUrl(inputValue)
		? formatDirectUrl(inputValue)
		: search(inputValue, searchEngine ? searchEngine.value : null);
	await launch(url);
});
window.addEventListener("DOMContentLoaded", () => {
	const target = new URLSearchParams(window.location.search).get("url");
	if (target) launch(formatDirectUrl(target));
});

