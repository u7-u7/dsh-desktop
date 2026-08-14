# DeepSeek Harness Desktop

把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 封装成桌面应用：**双击桌面快捷方式，自动启动服务 + 打开界面；关闭窗口，自动停止服务**。不再需要手动开终端、跑命令、再开浏览器。

## 特性

- 一键启动：双击即同时拉起 `dsh web` 服务和 Electron 窗口
- 智能复用：如果 3080 端口已有服务在运行，直接复用，不重复启动
- 干净退出：关闭窗口自动杀掉整个 dsh 进程树（Windows 上使用 `taskkill /T`），无残留
- 日志记录：`dsh.log` 记录启动过程，出问题可排查
- 国内镜像：安装脚本默认使用 npmmirror 加速

## 环境要求

- Windows（主要支持平台）
- Node.js ≥ 22.19（建议 24.x，可从 [nodejs.org](https://nodejs.org) 下载）

## 快速开始

### 方式一：一键安装（推荐）

1. 克隆或下载本仓库
2. 双击运行 `install.cmd`
3. 桌面出现 **DeepSeek Harness** 快捷方式，双击即可使用

`install.cmd` 会自动完成：
- 全局安装 `@deepseek-ai/dsh`（若未安装）
- 安装 Electron（使用 npmmirror 镜像）
- 创建桌面快捷方式

### 方式二：手动安装

```sh
npm i -g @deepseek-ai/dsh --registry=https://registry.npmmirror.com
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm i --registry=https://registry.npmmirror.com
powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1
```

### 如果 Electron 二进制下载失败

某些网络环境下 Electron 的二进制（`electron.exe`）可能下载不完整。解决方法：

1. 检查 `node_modules\electron\dist\electron.exe` 是否存在
2. 若不存在，手动下载 `electron-vXX-win32-x64.zip` 并解压到 `node_modules\electron\dist\`
3. 在 `node_modules\electron\` 下创建 `path.txt`，内容为 `electron.exe`

## 使用

双击桌面快捷方式，等待窗口弹出。首次使用需在设置中填入 DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com) 获取）。

## 自定义图标

把你的图标图片（png/jpg/svg）放到 `assets/` 目录，然后重新运行 `create-shortcut.ps1` 即可（窗口图标在 `main.js` 中配置）。

## 项目结构

```
dsh-desktop/
├── main.js               # Electron 主进程：启动服务、等待就绪、开窗、退出清理
├── install.cmd           # 一键安装脚本
├── create-shortcut.ps1   # 创建桌面快捷方式
├── assets/               # 图标等资源
└── package.json
```

## 原理

Electron 主进程启动后：
1. 探测 `http://127.0.0.1:3080`，若已有服务则直接使用
2. 否则 `spawn` 启动 `dsh web` 服务
3. 轮询等待服务就绪（最多 120 秒）
4. 打开窗口加载 Web UI
5. 窗口关闭时 `taskkill /T` 杀掉整个 dsh 进程树

## 常见问题

**Q: 双击快捷方式没反应？**
A: 查看 `dsh.log`，确认 dsh 是否全局安装、端口是否被占用。

**Q: 提示"服务未就绪超时"？**
A: 确认已全局安装 `@deepseek-ai/dsh`（`npm i -g @deepseek-ai/dsh`），并检查日志。

**Q: 关闭窗口后 3080 端口仍被占用？**
A: 说明有手动启动的 dsh 实例，不影响使用；若想彻底清掉，`taskkill /F /PID <pid>`。

## License

MIT
