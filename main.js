// DeepSeek Harness 桌面封装主进程
// 职责：启动 dsh web 服务 → 等待端口就绪 → 打开窗口加载界面；关闭窗口时杀掉服务进程。
// 相比网上教程的原始版本，本文件做了加固：
//  1. 用 taskkill /T 杀掉整个进程树，避免 Windows 上残留 node 子进程
//  2. 带日志文件 dsh.log，启动失败可排查
//  3. 等待服务就绪带超时，超时弹错误框
//  4. 服务进程意外退出时提示

const { app, BrowserWindow, dialog } = require("electron");
const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 3080;
const URL = `http://127.0.0.1:${PORT}`;
const LOG_FILE = path.join(__dirname, "dsh.log");

let mainWindow = null;
let dshProcess = null;

function log(msg) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

// 找到 dsh 命令。优先用全局安装的 dsh，找不到则退回 npx 方式。
function resolveDshCommand() {
  const candidates = [
    { cmd: "dsh", args: ["web"] },
    { cmd: "npx", args: ["-y", "@deepseek-ai/dsh", "web"] },
  ];
  return candidates;
}

function startDsh() {
  const candidates = resolveDshCommand();
  for (const c of candidates) {
    try {
      log(`尝试启动: ${c.cmd} ${c.args.join(" ")}`);
      const child = spawn(c.cmd, c.args, {
        shell: true,
        windowsHide: false,
        env: { ...process.env },
      });
      child.stdout?.on("data", (d) => log(`[dsh stdout] ${d}`));
      child.stderr?.on("data", (d) => log(`[dsh stderr] ${d}`));
      child.on("error", (err) => log(`spawn 错误: ${err.message}`));
      child.on("exit", (code, signal) => {
        log(`dsh 进程退出 code=${code} signal=${signal}`);
        if (mainWindow && code !== 0 && code !== null) {
          dialog.showErrorBox(
            "DeepSeek Harness 服务已退出",
            `dsh web 服务进程异常退出（code=${code}）。\n请查看日志文件：${LOG_FILE}`
          );
        }
      });
      return child;
    } catch (err) {
      log(`启动失败 ${c.cmd}: ${err.message}`);
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
    killProcessTree(dshProcess);
    app.quit();
  });
}

app.whenReady().then(async () => {
  log("=== DeepSeek Harness 桌面版启动 ===");

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

app.on("window-all-closed", () => {
  killProcessTree(dshProcess);
  app.quit();
});
