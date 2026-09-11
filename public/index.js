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

// Wait for transport to be ready
async function ensureTransportReady() {
 const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
 if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
 await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
 }
}

// Allow NovaSurf (or any caller) to drive the proxy by loading /?url=<target>
async function bootFromQuery() {
 const params = new URLSearchParams(location.search);
 const q = params.get("url");
 if (!q) return;
 try { 
 await registerSW(); 
 await ensureTransportReady();
 } catch (e) { 
 console.error("Failed to initialize:", e);
 return; 
 }
 const frame = scramjet.createFrame();
 frame.frame.id = "sj-frame";
 document.body.appendChild(frame.frame);
 frame.go(q);
}

// Wait a bit for everything to load, then boot from query
setTimeout(bootFromQuery, 500);

form.addEventListener("submit", async (event) => {
 event.preventDefault();
 try { 
 await registerSW(); 
 await ensureTransportReady();
 } catch (err) {
 error.textContent = "Failed to register service worker.";
 errorCode.textContent = err.toString();
 throw err;
 }
 const url = search(address.value, searchEngine.value);
 const frame = scramjet.createFrame();
 frame.frame.id = "sj-frame";
 document.body.appendChild(frame.frame);
 frame.go(url);
});

