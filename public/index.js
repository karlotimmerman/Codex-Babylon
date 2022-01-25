const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

// BABYLON CODE
let sceneStack = [];
let sceneQueue = [];

const createScene = function () {

	const scene = new BABYLON.Scene(engine);
	const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new BABYLON.Vector3(0, 0, 0));
	camera.attachControl(canvas, true);
	camera.wheelPrecision = 5;

	const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0));
	const serializedScene = BABYLON.SceneSerializer.Serialize(scene);

	sceneStack.push({
		scene: JSON.stringify(serializedScene),
		state: {}
	});

	return scene;
};

let scene = createScene();
let state = {};

engine.runRenderLoop(function () {
	scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
	engine.resize();
});

// CODEX CODE (calls the Express Server)

const sendCommand = function () {
	const nlCommand = document.getElementById("commandInput").value;
	console.log("Sending natural language command: " + nlCommand);

	fetch(`http://localhost:1018/codegen`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
			},
			body: JSON.stringify({
				text: nlCommand
			})
		}).then(response => response.json())
		.then(data => {
			console.log(`Received the following code: ${data.code}`);
			document.getElementById("codeView").innerText = data.code;
			nlCommand.innterText = "";
			evalAsync(data.code);
		    const serializedScene = BABYLON.SceneSerializer.Serialize(scene);
			sceneStack.push({
				scene: JSON.stringify(serializedScene),
				state
			});
		})
		.catch(error => console.error(error));
};

const reset = function () {
	document.getElementById("codeView").innerText = "";
	console.log("resetting prompt");
	fetch("http://localhost:1018/reset")
		.then(response => response.json())
		.then(res => {
			console.log(`Reset prompt: ${res.prompt}`);
		})
		.catch(error => console.error(error));

	resetScene();
};

const undo = function () {
	console.log("Undoing...");
	if (sceneStack.length > 1) {
		sceneQueue.push(sceneStack.pop());
	}
	loadScene(sceneStack[sceneStack.length - 1].scene, state);
};

const redo = function () {
	console.log("Redoing...");
	if (sceneQueue.length > 1) {
		sceneStack.push(sceneQueue.shift());
	}
	loadScene(sceneStack[sceneStack.length - 1].scene, state);
}

// Get the asset URL for the given asset name
const getAssetUrls = async function (asset) {
	const response = await fetch(`http://localhost:1018/assetUrls?text=${asset}`);
	const data = await response.json();
	let urls = [];
	data.PartGroups.forEach(partGroup => {
		if (partGroup.TextParts[3]) {
			urls.push(partGroup.TextParts[3].Text);
		}
	});

	return urls;
};

const evalAsync = async function (code) {
	await eval("(async () => { " + code + "})()");
}

const resetScene = function () {
	sceneStack = [];
	scene.dispose();
	scene = createScene();
	state = {};
}

const loadScene = function (newScene, newState) {
	// Render serialized scene
	scene.dispose();
	scene = BABYLON.SceneLoader.Load(newScene, "newScene");
	state = newState;
}
