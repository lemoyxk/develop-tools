const { app, BrowserWindow, screen, Menu, globalShortcut, nativeImage } = require("electron");
const path = require("path");
const child = require("child_process");
const manager = require("./manager");
const fs = require("fs");

const fixPath = require("fix-path");

fixPath();

var log = console.log;

console.log = (...args) => {
	fs.writeFileSync(path.join(__dirname, "./run.log"), JSON.stringify(args) + "\n", { flag: "a+" });
	log(...args);
};

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	app.quit();
}

if (require("electron-squirrel-startup")) {
	console.log("electron-squirrel-startup");
	return quit();
}

let server = null;
let dev = !!process.env.NODE_ENV;

let quiting = false;

function quit() {
	if (quiting) return;
	quiting = true;
	if (!server) return app.quit();
	if (process.platform === "win32") {
		child.exec(`taskkill /T /F /PID ${server.pid}`, () => app.quit());
	} else {
		child.exec(`kill -9 ${server.pid}`, () => app.quit());
	}
}

function restart() {
	app.relaunch();
	app.exit();
}

function startServer() {
	if (dev) return;

	if (process.platform === "win32") {
		server = child.spawn(path.join(__dirname, "/windows-server/server.exe"), {
			stdio: "pipe",
			env: process.env,
			cwd: path.join(__dirname, "/windows-server"),
		});
	} else {
		server = child.spawn(path.join(__dirname, "/mac-server/server"), {
			stdio: "pipe",
			env: process.env,
			cwd: path.join(__dirname, "/mac-server"),
		});
	}
	server.stdout.on("data", (data) => {
		console.log(data);
	});

	server.on("error", (err) => console.log(err));
}

startServer();

let mainWindow = null;

function createWindow() {
	console.log("create window");

	// Create the browser window.
	let size = screen.getPrimaryDisplay().size;
	let width = size.width * 0.8;
	let height = size.height * 0.8;

	if (width < 900) {
		width = size.width * 0.9;
		height = size.height * 0.9;
	}

	mainWindow = new BrowserWindow({
		width: dev ? size.width * 1 : width,
		height: height,
		icon: nativeImage.createFromPath(path.join(__dirname, "develop.icns")),
		webPreferences: {
			nodeIntegration: true,
		},
	});

	// and load the index.html of the app.
	if (dev) {
		mainWindow.loadURL("http://127.0.0.1:3000");
	} else {
		mainWindow.loadFile(path.join(__dirname, "/app.asar/index.html"));
	}

	// Open the DevTools.
	if (dev) mainWindow.webContents.openDevTools();

	mainWindow.on("close", () => {
		console.log("main close");
		manager.delete("main");
	});

	manager.set("main", mainWindow);
}

if (process.platform === "darwin") {
	const template = [
		{
			label: "Application",
			submenu: [
				{
					label: "Quit",
					accelerator: "Command+Q",
					click: () => {
						quit();
					},
				},
			],
		},
		{
			label: "Edit",
			submenu: [
				{ label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
				{ label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
				{ type: "separator" },
				{ label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
				{ label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
				{ label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
				{ label: "Copy", accelerator: "CmdOrCtrl+Home", selector: "copy:" },
				{ label: "Paste", accelerator: "CmdOrCtrl+End", selector: "paste:" },
				{ label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
			],
		},
		{
			label: "Dev",
			submenu: [{ label: "Open Dev Tools", role: "toggleDevTools" }],
		},
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
} else {
	Menu.setApplicationMenu(null);
}

app.allowRendererProcessReuse = true;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
	// 注册一个 'CommandOrControl+X' 的全局快捷键
	const ret = globalShortcut.register("CommandOrControl+P", () => {
		mainWindow.webContents.openDevTools();
		console.log("CommandOrControl+P is pressed");
	});

	console.log(ret);

	// 检查快捷键是否注册成功
	console.log(globalShortcut.isRegistered("CommandOrControl+X"));

	console.log("on ready");
	console.log("main pid", process.pid);
	if (server) console.log("child pid", server.pid);

	createWindow();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
	console.log("on window-all-closed");
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	// if (process.platform !== "darwin") {}
	return quit();
});

app.on("activate", () => {
	console.log("on activate");
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.on("quit", () => {
	console.log("quit");
	return quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

var Socket = require("./socket");
var Command = require("./command");

app.socket = new Socket();

var command = new Command();

app.socket.start(() => {});
