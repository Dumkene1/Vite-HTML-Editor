import { app, BrowserWindow } from "electron";
import path from "path";
import { Menu } from "electron";



const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
  win.loadURL("http://localhost:5173");
  win.webContents.openDevTools({ mode: "detach" }); // dev only
} else {
   win.loadFile(path.join(app.getAppPath(), "dist", "index.html")); // ✅ robust
}
}

app.whenReady().then(() => {


Menu.setApplicationMenu(null);



  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
