// DeepSeek Harness 桌面封装主进程
// 职责：启动 dsh web 服务 → 等待端口就绪 → 打开窗口加载界面。
// 托盘常驻模式：点窗口 X 只隐藏到系统托盘，服务继续后台运行；
// 只有从托盘菜单选择「退出」才停止 dsh 服务并退出应用。
// 相比网上教程的原始版本，本文件做了加固：
//  1. 用 taskkill /T 杀掉整个进程树，避免 Windows 上残留 node 子进程
//  2. 带日志文件 dsh.log，启动失败可排查
//  3. 等待服务就绪带超时，超时弹错误框
//  4. 服务进程意外退出时提示
//  5. 系统托盘常驻：关窗不退出，任务不中断

const { app, BrowserWindow, Tray, Menu, dialog, nativeImage } = require("electron");
const { spawn, exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 3080;
const URL = `http://127.0.0.1:${PORT}`;
const LOG_FILE = path.join(__dirname, "dsh.log");
const ICON_FILE = path.join(__dirname, "assets", "deepseek.ico");

let mainWindow = null;
let dshProcess = null;
let tray = null;
// 是否真正退出（托盘菜单选了「退出」），而不是仅仅关窗
let isQuitting = false;

function log(msg) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

// 找到 dsh 的 node 入口。优先用全局安装的 @deepseek-ai/dsh，找不到则退回 npx。
// 直接 spawn node + bin.js，绕过 cmd 壳：进程树更干净，taskkill /T 能可靠杀掉服务。
function resolveDshCommand() {
  const candidates = [];
  // 1) 解析真实 node.exe（Electron 主进程里 process.execPath 是 electron.exe，不能当 node 用）
  let nodeExe = null;
  try {
    const out = execSync("where node", { encoding: "utf8", windowsHide: true });
    const first = out.split(/\r?\n/).map((s) => s.trim()).find((s) => s.endsWith("node.exe"));
    if (first && fs.existsSync(first)) nodeExe = first;
  } catch {}
  if (!nodeExe) {
    // 兜底：让 shell 自己解析 PATH 里的 node
    candidates.push({ cmd: "node", args: [], shell: true, label: "node(PATH)" });
  }

  // 2) 通过 npm root -g 定位全局安装的 dsh
  let globalRoot = null;
  try {
    globalRoot = execSync("npm root -g", { encoding: "utf8", windowsHide: true }).trim();
  } catch {}
  if (globalRoot && nodeExe) {
    const bin = path.join(globalRoot, "@deepseek-ai", "dsh", "lib", "bin.js");
    if (fs.existsSync(bin)) {
      candidates.push({ cmd: nodeExe, args: [bin, "web"], label: `dsh(${bin})` });
    }
  }

  // 3) 退路：npx（需要 PATH 里有 node/npx）
  candidates.push({ cmd: "npx", args: ["-y", "@deepseek-ai/dsh", "web"], label: "npx" });
  return candidates;
}

function startDsh() {
  const candidates = resolveDshCommand();
  for (const c of candidates) {
    try {
      log(`尝试启动: ${c.label || c.cmd} web`);
      const child = spawn(c.cmd, c.args, {
        shell: !!c.shell,
        windowsHide: false,
        env: { ...process.env },
      });
      child.stdout?.on("data", (d) => log(`[dsh stdout] ${d}`));
      child.stderr?.on("data", (d) => log(`[dsh stderr] ${d}`));
      child.on("error", (err) => log(`spawn 错误: ${err.message}`));
      child.on("exit", (code, signal) => {
        log(`dsh 进程退出 code=${code} signal=${signal}`);
        // 服务异常退出时提示（真正退出时 dshProcess 已置空，不会误报）
        if (dshProcess && code !== 0 && code !== null) {
          dialog.showErrorBox(
            "DeepSeek Harness 服务已退出",
            `dsh web 服务进程异常退出（code=${code}）。\n请查看日志文件：${LOG_FILE}`
          );
        }
      });
      return child;
    } catch (err) {
      log(`启动失败 ${c.label || c.cmd}: ${err.message}`);
    }
  }
  return null;
}

// Windows 上要杀整个进程树，否则 node 子进程会残留
function killProcessTree(proc) {
  if (!proc || !proc.pid) return;
  log(`终止进程树 pid=${proc.pid}`);
  if (process.platform === "win32") {
    exec(`taskkill /pid ${proc.pid} /T /F`, (err) => {
      if (err) log(`taskkill 失败: ${err.message}`);
    });
  } else {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch (e) {
      try { proc.kill(); } catch {}
    }
  }
}

async function waitForServer(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL, { signal: AbortSignal.timeout(2000) });
      if (res.status >= 200 && res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "DeepSeek Harness",
    autoHideMenuBar: true,
    icon: ICON_FILE,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(URL);

  // 点 X 关闭窗口：隐藏到托盘，不退出、不杀服务
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      log("窗口关闭，最小化到托盘（服务继续运行）");
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon({
          title: "DeepSeek Harness 仍在运行",
          content: "服务继续在后台运行。点击托盘图标可重新打开窗口，托盘菜单可退出。",
        });
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  let icon = nativeImage.createFromPath(ICON_FILE);
  // 托盘需要小尺寸图标；若 ICO 加载失败退回空图标
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip("DeepSeek Harness");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示窗口",
      click: () => {
        if (!mainWindow) {
          createWindow();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "退出",
      click: () => {
        log("托盘菜单选择退出");
        isQuitting = true;
        if (mainWindow) {
          mainWindow.close();
        }
        killProcessTree(dshProcess);
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  // 单击托盘图标：显示/聚焦窗口
  tray.on("click", () => {
    if (!mainWindow) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  log("=== DeepSeek Harness 桌面版启动 ===");
  createTray();

  // 如果 3080 端口已有服务（例如用户手动启动了 dsh web），直接复用，不重复拉起。
  if (await waitForServer(3000)) {
    log("检测到已有服务在运行，直接使用");
    createWindow();
    return;
  }

  dshProcess = startDsh();
  if (!dshProcess) {
    dialog.showErrorBox("启动失败", "无法启动 dsh web 服务，请查看日志：" + LOG_FILE);
    app.quit();
    return;
  }

  const up = await waitForServer();
  if (!up) {
    dialog.showErrorBox(
      "服务未就绪",
      `等待 ${URL} 超时。请确认 dsh 已安装（npm i -g @deepseek-ai/dsh）并查看日志：${LOG_FILE}`
    );
    killProcessTree(dshProcess);
    app.quit();
    return;
  }

  log("服务就绪，打开窗口");
  createWindow();
});

// 所有窗口关闭时不退出：托盘常驻
app.on("window-all-closed", () => {
  log("所有窗口已关闭，应用保持后台运行（托盘）");
});

// 真正退出（托盘菜单）：清理后退出
app.on("before-quit", () => {
  if (!isQuitting) {
    // 系统关机/退出时也要清理
    isQuitting = true;
  }
  killProcessTree(dshProcess);
});
