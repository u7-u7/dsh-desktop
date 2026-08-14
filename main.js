// DeepSeek Harness desktop wrapper.
// The packaged app runs its bundled DSH copy with Electron's embedded Node.js,
// so macOS users do not need Node.js, npm, or a global dsh installation.

const { app, BrowserWindow, Tray, Menu, dialog, nativeImage } = require("electron");
const { spawn, exec, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 3080;
const URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let dshProcess = null;
let tray = null;
let isQuitting = false;
let dshServiceReady = false;

// macOS may send an activate event while the first launch is still waiting for
// DSH. Keeping one main process prevents a second app launch from adding more
// windows or another service process.
if (!app.requestSingleInstanceLock()) app.quit();

function appDataPath(...parts) {
  return path.join(app.getPath("userData"), ...parts);
}

function log(msg) {
  try {
    const logFile = appDataPath("dsh.log");
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

function logFilePath() {
  return appDataPath("dsh.log");
}

function iconPath() {
  const icon = process.platform === "darwin" ? "deepseek.icns" : "deepseek.ico";
  return path.join(__dirname, "assets", icon);
}

function bundledDshBin() {
  const nodeModulesPath = app.isPackaged
    // DSH discovers part of its plugin tree at runtime. Keep its entire npm
    // installation on disk so Node and DSH's profile symlinks can resolve
    // every peer dependency instead of relying on electron-builder pruning.
    ? path.join(process.resourcesPath, "node_modules")
    : path.join(__dirname, "node_modules");
  return path.join(nodeModulesPath, "@deepseek-ai", "dsh", "lib", "bin.js");
}

function resolveCommand(command) {
  const lookup = process.platform === "win32" ? "where" : "which";
  try {
    const output = execFileSync(lookup, [command], { encoding: "utf8", windowsHide: true });
    return output.split(/\r?\n/).map((item) => item.trim()).find(Boolean) || null;
  } catch {
    return null;
  }
}

// Packaged builds always use the version locked in package-lock.json. Development
// builds use that same local copy first, then retain global/npx fallbacks for the
// original contributor workflow.
function resolveDshCommands() {
  const candidates = [];
  const localBin = bundledDshBin();
  if (fs.existsSync(localBin)) {
    candidates.push({
      cmd: process.execPath,
      args: [localBin, "web"],
      label: app.isPackaged ? "bundled dsh" : "local dsh",
      env: { ELECTRON_RUN_AS_NODE: "1" },
    });
  }

  if (app.isPackaged) return candidates;

  const node = resolveCommand("node");
  const npm = resolveCommand("npm");
  if (node && npm) {
    try {
      const globalRoot = execFileSync(npm, ["root", "-g"], { encoding: "utf8", windowsHide: true }).trim();
      const globalBin = path.join(globalRoot, "@deepseek-ai", "dsh", "lib", "bin.js");
      if (fs.existsSync(globalBin)) {
        candidates.push({ cmd: node, args: [globalBin, "web"], label: `global dsh (${globalBin})` });
      }
    } catch {}
  }

  const npx = resolveCommand("npx");
  if (npx) {
    candidates.push({ cmd: npx, args: ["-y", "@deepseek-ai/dsh", "web"], label: "npx dsh" });
  }
  return candidates;
}

function startDsh() {
  const candidates = resolveDshCommands();
  if (!candidates.length) return null;

  dshServiceReady = false;
  const startCandidate = (index) => {
    const candidate = candidates[index];
    if (!candidate) return null;

    log(`尝试启动: ${candidate.label}`);
    const child = spawn(candidate.cmd, candidate.args, {
      detached: process.platform !== "win32",
      windowsHide: process.platform === "win32",
      env: {
        ...process.env,
        ...candidate.env,
        DSH_HOME: appDataPath("dsh"),
      },
    });
    dshProcess = child;

    child.stdout?.on("data", (data) => log(`[dsh stdout] ${data}`));
    child.stderr?.on("data", (data) => log(`[dsh stderr] ${data}`));
    child.on("error", (error) => {
      log(`启动失败 ${candidate.label}: ${error.message}`);
      if (dshProcess === child && !isQuitting) startCandidate(index + 1);
    });
    child.on("exit", (code, signal) => {
      log(`dsh 进程退出 code=${code} signal=${signal}`);
      if (dshProcess !== child) return;
      dshProcess = null;
      if (!isQuitting && !dshServiceReady && startCandidate(index + 1)) return;
      if (!isQuitting && code !== 0 && code !== null) {
        dialog.showErrorBox(
          "DeepSeek Harness 服务已退出",
          `dsh web 服务进程异常退出（code=${code}）。\n请查看日志文件：${logFilePath()}`
        );
      }
    });
    return child;
  };

  return startCandidate(0);
}

function killProcessTree(proc) {
  if (!proc?.pid) return;
  log(`终止进程树 pid=${proc.pid}`);
  if (process.platform === "win32") {
    exec(`taskkill /pid ${proc.pid} /T /F`, (error) => {
      if (error) log(`taskkill 失败: ${error.message}`);
    });
    return;
  }

  try {
    process.kill(-proc.pid, "SIGTERM");
    setTimeout(() => {
      try { process.kill(-proc.pid, "SIGKILL"); } catch {}
    }, 5000).unref();
  } catch {
    try { proc.kill("SIGTERM"); } catch {}
  }
}

async function waitForServer(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(URL, { signal: AbortSignal.timeout(2000) });
      if (response.status >= 200 && response.status < 500) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "DeepSeek Harness",
    autoHideMenuBar: true,
    icon: iconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(URL);

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      log("窗口关闭，最小化到托盘（服务继续运行）");
      mainWindow.hide();
      if (tray && process.platform === "win32") {
        tray.displayBalloon({
          title: "DeepSeek Harness 仍在运行",
          content: "服务继续在后台运行。点击托盘图标可重新打开窗口，托盘菜单可退出。",
        });
      }
    }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

function showWindow() {
  if (!mainWindow) createWindow();
  else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createTray() {
  let icon = nativeImage.createFromPath(iconPath());
  if (icon.isEmpty()) icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("DeepSeek Harness");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "显示窗口", click: showWindow },
    {
      label: "退出",
      click: () => {
        log("托盘菜单选择退出");
        isQuitting = true;
        if (mainWindow) mainWindow.close();
        killProcessTree(dshProcess);
        app.quit();
      },
    },
  ]));
  tray.on("click", showWindow);
}

app.whenReady().then(async () => {
  log("=== DeepSeek Harness 桌面版启动 ===");
  createTray();

  if (await waitForServer(3000)) {
    log("检测到已有服务在运行，直接使用");
    dshServiceReady = true;
    showWindow();
    return;
  }

  if (!startDsh()) {
    dialog.showErrorBox("启动失败", `未找到随应用打包的 dsh 服务，请重新安装应用。\n日志：${logFilePath()}`);
    app.quit();
    return;
  }

  if (!(await waitForServer())) {
    dialog.showErrorBox("服务未就绪", `等待 ${URL} 超时。请查看日志：${logFilePath()}`);
    killProcessTree(dshProcess);
    app.quit();
    return;
  }

  dshServiceReady = true;
  log("服务就绪，打开窗口");
  showWindow();
});

app.on("window-all-closed", () => {
  log("所有窗口已关闭，应用保持后台运行（托盘）");
});

app.on("activate", () => {
  // The first macOS activate may arrive before dsh web is ready. Opening at
  // that point creates a blank window; startup will show the real one later.
  if (app.isReady() && dshServiceReady) showWindow();
});

app.on("second-instance", () => {
  if (dshServiceReady) showWindow();
});

app.on("before-quit", () => {
  isQuitting = true;
  killProcessTree(dshProcess);
});
