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

// Détecte si c'est une URL directe qui doit bypasser le proxy
function isDirectUrl(inputValue) {
	const trimmed = inputValue.trim();
	
	// Si ça commence par http:// ou https://, c'est une URL directe
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return true;
	}
	
	// Si c'est un domaine sans protocole (contient un point), c'est une URL directe
	if (trimmed.includes(".") && !trimmed.includes(" ")) {
		return true;
	}
	
	return false;
}

// Formate une URL directe avec le protocole
function formatDirectUrl(input) {
	const trimmed = input.trim();
	
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}
	
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
	
	// Vérifie si c'est une URL directe qui doit bypasser le proxy
	if (isDirectUrl(inputValue)) {
		window.location.href = formatDirectUrl(inputValue);
		return;
	}
	
	await launch(search(inputValue, searchEngine ? searchEngine.value : null));
});
window.addEventListener("DOMContentLoaded", () => {
	const target = new URLSearchParams(window.location.search).get("url");
	if (target) launch(target);
});

