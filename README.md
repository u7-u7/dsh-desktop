# DeepSeek Harness Desktop

**DeepSeek Harness Desktop**（`dsh-desktop`）是一个将 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 封装为原生桌面应用的启动器。它把"启动服务 → 打开浏览器 → 管理进程"这整套繁琐操作压缩成**双击一次快捷方式**，并以**系统托盘常驻**的方式让智能体任务在后台持续运行。

> DeepSeek Harness 是 DeepSeek 开源的插件化 Agent 框架（一切皆插件，基于 Cordis）。本项目不修改 Harness 本身，只是提供一个更友好的桌面使用方式。

---

## ✨ 特性

| 特性 | 说明 |
|------|------|
|  **一键启动** | 双击快捷方式，自动拉起 `dsh web` 服务并打开界面，无需手动开终端 |
|  **托盘常驻** | 关闭窗口仅最小化到系统托盘，服务继续在后台运行，任务不中断 |
|  **智能复用** | 若 3080 端口已有服务在运行，直接复用，绝不重复拉起进程 |
|  **干净退出** | 仅从托盘菜单选择「退出」才停止服务，`taskkill /T` 彻底清理进程树 |
|  **日志追踪** | `dsh.log` 记录完整启动过程，出问题可快速定位 |
|  **国内友好** | 安装脚本默认使用 npmmirror 镜像，加速 npm 与 Electron 二进制下载 |
|  **品牌图标** | Windows 与 macOS 均使用 DeepSeek 品牌图标 |
|  **独立 Mac 应用** | macOS DMG 内置固定版本的 DSH 与运行时，最终用户无需安装 Node.js 或 dsh |

---

## 📋 环境要求

| 你的目的 | 系统与前提 | 需要安装什么 | 不需要什么 |
|----------|------------|--------------|------------|
| 使用 macOS DMG | macOS 11+、Apple Silicon（M1/M2/M3/M4） | 下载 DMG | Node.js、npm、全局 `dsh` |
| Windows 一键安装 | Windows 10/11、网络；需要源码目录 | Git，或下载并解压源码 ZIP；脚本会尝试安装 Node.js LTS 与全局 `dsh` | 手动安装 Electron |
| 本地开发 | macOS 或 Windows；推荐 Node.js 22.19+ 与 npm | Node.js、项目依赖 | 全局 `dsh`（项目依赖已包含） |
| 构建 macOS DMG | Apple Silicon Mac、macOS 11+、网络、建议至少 2GB 可用空间 | Node.js 22.19+、Xcode Command Line Tools | Apple 开发者账号（仅构建未签名包时） |

> 💡 Windows 脚本会通过 `winget` 尝试安装 Node.js LTS；没有 `winget` 或安装失败时，请手动安装 Node.js LTS 后重新运行。脚本只检查 `node.exe` 是否存在，不会升级已有的旧版本。

---

## 🚀 快速开始

| 你想做什么 | 应该走哪条路径 |
|------------|----------------|
| 只想在 Mac 上使用 | 下载 GitHub Release 中的 DMG，见下文 macOS 安装步骤 |
| 只想在 Windows 上使用 | 获取源码后双击 `install.cmd`，见下文 Windows 一键安装 |
| 改代码或本地调试 | 使用「本地开发」章节的 `npm ci` 与 `npm start` |
| 发布新的 Mac 安装包 | 使用「构建 macOS DMG」章节 |

### macOS：下载安装包（Apple 芯片）

> 仅支持 macOS 11+ 与 Apple Silicon（M1/M2/M3/M4）；暂不支持 Intel Mac。应用已内置 DSH，无需安装 Node.js 或 `dsh`。

1. 发布完成后，打开 [GitHub Releases](https://github.com/wangjicheng2004/dsh-desktop/releases)，在最新版本的 **Assets** 中下载 `DeepSeek Harness-*-mac-arm64.dmg`（约 290 MB；首个版本为 `1.0.2`）。**不要下载** `Source code (zip)`，那只是源码，不能直接安装。
2. 双击下载的 DMG，在弹出窗口中把 **DeepSeek Harness** 拖入「应用程序（Applications）」。复制完成后弹出该磁盘镜像。
3. 从「应用程序」启动 **DeepSeek Harness**；首次启动约需 5–10 秒。

> 当前 GitHub Release 正在发布准备中；在 Release 页面出现上述 DMG 前，说明还没有公开可下载的安装包，请勿下载源码 ZIP 代替。

#### 首次打开提示“无法验证开发者”

当前版本尚未签名、公证。请在「应用程序」中按住 Control 点击 **DeepSeek Harness**，选择「打开」，再点击一次「打开」。若仍被阻止，到「系统设置 → 隐私与安全性」选择“仍要打开”。

#### 从旧版本升级

先从菜单栏鲸鱼图标的菜单选择「退出」，再用新 DMG 将「应用程序」中的同名应用替换为新版。不要直接从 DMG 窗口运行应用；这样会保留旧副本，并造成多个同名应用难以区分。

### Windows：一键安装（推荐）

**拿到源码后，只需 3 步，无需手动输入安装命令：**

1. **获取代码**

   有 Git：

   ```sh
   git clone https://gitee.com/wjc18053186786/dsh-desktop
   cd dsh-desktop
   ```

   没有 Git：从 Gitee 下载源码 ZIP，解压后进入 `dsh-desktop` 文件夹。

2. **运行安装脚本**
   ```
   双击 install.cmd
   ```
   脚本会自动执行 5 个安装步骤（约 3–5 分钟，取决于网速）。

3. **开始使用**
   双击桌面上的 **DeepSeek Harness** 快捷方式，等待窗口弹出即可。

#### 一键安装实际做了什么？

`install.cmd` 只是启动 `install.ps1`；整个过程需要联网，通常约 3–5 分钟，请勿中途关闭窗口。

| 步骤 | 脚本操作 | 结果 |
|------|----------|------|
| 1/5 | 检测 `node.exe`；缺失时用 `winget` 安装 Node.js LTS | 当前终端可使用 Node.js 和 npm |
| 2/5 | 检查并安装全局 `@deepseek-ai/dsh` | 保留原有 Windows 使用方式 |
| 3/5 | 通过 npmmirror 执行项目 `npm install` | 安装 Electron 与项目依赖 |
| 4/5 | 校验 `electron.exe`；失败时重试下载、解压缓存、再直连镜像下载 | 生成可运行的 Electron 二进制 |
| 5/5 | 调用 `create-shortcut.ps1` | 在桌面创建 **DeepSeek Harness** 快捷方式 |

> ⚠️ Windows 的“一键安装”是**源码目录安装**，不是 `.exe` / `.msi` 安装包。桌面快捷方式仍指向该目录下的 `node_modules\electron\dist\electron.exe`；移动或删除源码目录后，需要在新目录重新运行 `install.cmd`。

### 方式二：Windows 手动安装

适合不使用 `install.cmd`、但已安装 Node.js 的用户。以下命令使用项目内的 DSH，不必全局安装 `dsh`；请在 **CMD** 中执行：

```sh
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm ci --registry=https://registry.npmmirror.com
powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1
```

---

##  使用指南

### 首次使用

1. 从 Windows 桌面快捷方式或 macOS「应用程序」打开应用，等待窗口加载（首次启动服务约需 5-10 秒）
2. 打开 **设置 → 模型**，填入你的 DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com) 获取）
3. 选择工作目录并新建会话，开始使用

### 窗口与托盘

| 操作 | 效果 |
|------|------|
| 关闭窗口（点 X） | 最小化到系统托盘，服务**继续后台运行** |
| 单击托盘图标 | 重新打开窗口 |
| 右键托盘图标 → 显示窗口 | 重新打开窗口 |
| 右键托盘图标 → 退出 | **彻底退出**：停止服务、清理进程、关闭应用 |

> 💡 Windows 的托盘图标可能被收在任务栏右侧「^」中；macOS 的图标位于屏幕顶部菜单栏。

---

## 🔧 排错指南

### 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| Windows 双击快捷方式没反应 | 项目依赖缺失 / 端口被占用 | 查看 `%APPDATA%\dsh-desktop\dsh.log`，确认项目目录中的 `node_modules` 仍存在 |
| 提示"服务未就绪超时" | dsh 启动失败 / 端口被占用 | 查看 `dsh.log`；确认 3080 端口空闲 |
| Windows 窗口一闪而过 | 全局 dsh 缺失 | `npm i -g @deepseek-ai/dsh` 后重试 |
| 托盘区没有图标 | 图标被折叠 | 点任务栏「^」展开，把鲸鱼图标拖出 |
| `electron.exe` 未生成 | 二进制下载失败 | 见下文「Electron 二进制下载失败」 |

### macOS 常见问题

| 现象 | 解决方式 |
|------|----------|
| Release 页面没有 DMG | 说明安装包尚未发布；不要下载 Source code ZIP，等待 `DeepSeek Harness-1.0.2-mac-arm64.dmg` 出现在 Assets。 |
| 提示“服务已退出”或启动白屏 | 退出应用后重新打开；仍有问题时查看日志 `~/Library/Application Support/dsh-desktop/dsh.log`。 |
| 出现多个 DeepSeek Harness | 退出全部实例，删除「应用程序」中旧副本和已挂载的旧 DMG，再只保留并启动 1.0.2。 |
| 无法打开应用 | 此包只支持 Apple 芯片。确认「 → 关于本机」中的“芯片”显示 Apple；并按上文的 Control 点击方式首次打开。 |

### Electron 二进制下载失败

安装脚本内置了**三级自动修复**（重跑 install.js → 解压缓存 zip → 直连镜像下载）。若仍失败，手动处理：

1. 检查 `node_modules\electron\dist\electron.exe` 是否存在
2. 手动下载 `electron-v<版本>-win32-x64.zip` 并解压到 `node_modules\electron\dist\`
3. 在 `node_modules\electron\` 下创建 `path.txt`，内容为 `electron.exe`

---

## 📂 项目结构

```
dsh-desktop/
├── main.js               # Electron 主进程：启动服务、托盘常驻、退出清理
├── install.cmd           # 安装入口（薄壳，调用 install.ps1）
├── install.ps1           # 一键安装脚本（全部逻辑）
├── create-shortcut.ps1   # 创建桌面快捷方式
├── scripts/
│   ├── convert-icon.mjs   # SVG → Windows ICO 转换工具
│   └── convert-mac-icon.mjs # SVG → macOS ICNS 转换工具
├── package.json          # 依赖声明（electron）
├── assets/
│   ├── deepseek.ico      # Windows 应用图标（多尺寸）
│   ├── deepseek.icns     # macOS 应用图标
│   └── deepseek-color.svg # 图标源文件
└── package-lock.json     # 精确锁定 Electron 与随包 DSH 版本
```

---

## ⚙️ 工作原理

```
双击快捷方式
   │
   ▼
Electron 主进程 (main.js)
   │
   ├─ 1. 生产应用直接读取包内固定版本的 dsh
   ├─ 2. 探测 http://127.0.0.1:3080
   │     ├─ 已有服务 → 直接复用
   │     └─ 无服务 → spawn node <dsh bin.js> web（不经过 cmd 壳）
   ├─ 3. 轮询等待服务就绪（最多 120 秒）
   ├─ 4. 打开窗口加载 Web UI
   ├─ 5. 关窗 → 隐藏到托盘，服务继续
   └─ 6. 托盘「退出」→ Windows 使用 taskkill /T，macOS 使用进程组 SIGTERM 清理 dsh
```


---

## 🛠️ 开发

### 本地开发（macOS / Windows）

适合修改代码、调试启动器或验证改动。需要 Node.js 22.19+ 与网络；`npm ci` 会按 `package-lock.json` 安装锁定版本的 Electron 和 DSH，无需先全局安装 `dsh`。

```sh
npm ci                                # 严格按 lockfile 安装依赖
npm start                             # 启动 Electron 应用
```

Windows 网络较慢时，可先在 CMD 中执行 `set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`，再运行 `npm ci`。

### 构建 macOS DMG

仅在 Apple Silicon Mac 上构建。先安装 Node.js 22.19+ 与 Xcode Command Line Tools：

```sh
xcode-select --install
```

然后在项目根目录执行：

```sh
npm ci
npm run dist:mac
```

构建完成后：

- `dist/DeepSeek Harness-<version>-mac-arm64.dmg`：可供用户下载的 Apple Silicon 安装包。
- `dist/mac-arm64/DeepSeek Harness.app`：未封装成 DMG 的应用目录，便于本机调试。

`npm run package:mac` 只生成上述 `.app` 目录；`npm run dist:mac` 生成 DMG。构建会把锁定版本的 DSH 及完整运行时打入应用，请勿删除 `package-lock.json`。当前包未签名、公证，发布给外部用户前请按 macOS 安装章节测试首次打开流程。

### 自定义图标

把你的图标图片（png/jpg/svg）放到 `assets/` 目录，然后：

```sh
npm i -D sharp png-to-ico             # 安装转换依赖
node scripts/convert-icon.mjs         # 生成 deepseek.ico
powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1   # 更新 Windows 快捷方式
```

macOS 图标源文件变更后，执行 `npm run icon:mac` 生成 `assets/deepseek.icns`，再重新运行 `npm run dist:mac`。


---

## 📄 License

[MIT](LICENSE)

---

## 🙏 致谢

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — 本项目封装的核心框架
- [Electron](https://www.electronjs.org/) — 跨平台桌面运行时
