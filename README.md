# DeepSeek Harness Desktop

把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 封装成桌面应用：**双击桌面快捷方式，自动启动服务 + 打开界面；关闭窗口最小化到托盘，服务继续后台运行**。不再需要手动开终端、跑命令、再开浏览器。

## 特性

- 一键启动：双击即同时拉起 `dsh web` 服务和 Electron 窗口
- 托盘常驻：点窗口 X 只隐藏到系统托盘，服务继续后台运行，任务不中断
- 智能复用：如果 3080 端口已有服务在运行，直接复用，不重复启动
- 干净退出：托盘菜单「退出」才停止服务，`taskkill /T` 杀掉整个进程树（无残留）
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

## 在另一台电脑部署（完整流程）

整个项目的本质是 **4 个文件 + 1 个图标**，其余（node_modules 等）都能自动安装。换电脑只需三步：

### 第 1 步：拷贝项目文件

把**项目目录**拷到新电脑（不需要 node_modules，体积小很多）。最小文件清单：

```
dsh-desktop/
├── main.js               # Electron 主进程（核心逻辑）
├── install.cmd           # 一键安装脚本
├── create-shortcut.ps1   # 创建桌面快捷方式
├── package.json          # 依赖声明（electron）
└── assets/
    ├── deepseek.ico      # 应用图标
    └── deepseek-color.svg # 图标源文件
```

> 💡 已推送到 GitHub 的话，直接 `git clone` 最省事。

### 第 2 步：装好前置环境

新电脑需要先有 **Node.js ≥ 22.19**（[nodejs.org](https://nodejs.org) 下载 LTS/24.x 安装即可，一路默认）。

验证：打开 cmd 运行 `node -v`，显示 `v22.x` 或更高即可。

### 第 3 步：双击 `install.cmd`

脚本自动完成 4 件事：

| 步骤 | 做什么 | 需要网络 |
|------|--------|---------|
| 1 | 定位 node/npm | 否 |
| 2 | 全局安装 `@deepseek-ai/dsh` | 是（npmmirror 镜像） |
| 3 | 安装 Electron（含二进制 ~100MB） | 是（npmmirror 镜像） |
| 4 | 创建桌面快捷方式 | 否 |

完成提示 `Done! Double-click "DeepSeek Harness" on your desktop` 后，双击桌面快捷方式即可。

### 排错速查

| 现象 | 原因 | 解决 |
|------|------|------|
| `electron.exe` 没生成 | Electron 二进制下载失败 | 见上文「如果 Electron 二进制下载失败」 |
| 快捷方式双击没反应 | 全局 dsh 没装上 | 重跑 install.cmd，或手动 `npm i -g @deepseek-ai/dsh` |
| 提示服务未就绪超时 | dsh 启动失败 / 端口占用 | 看 `dsh.log` 定位原因 |
| 窗口秒退 | 全局 dsh 缺失 | 确认 `where dsh` 能输出路径 |

## 使用

双击桌面快捷方式，等待窗口弹出。首次使用需在设置中填入 DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com) 获取）。

- 关闭窗口 → 最小化到托盘，服务继续运行
- 单击托盘图标 → 重新打开窗口
- 右键托盘图标 → 「显示窗口」/「退出」（退出才真正停止服务）

## 自定义图标

把你的图标图片（png/jpg/svg）放到 `assets/` 目录，然后重新运行 `create-shortcut.ps1` 即可（窗口图标在 `main.js` 中配置）。

如需从 SVG 重新生成 `deepseek.ico`：

```sh
npm i -D sharp png-to-ico
node scripts/convert-icon.mjs
```

## 项目结构

```
dsh-desktop/
├── main.js               # Electron 主进程：启动服务、托盘常驻、退出清理
├── install.cmd           # 一键安装脚本
├── create-shortcut.ps1   # 创建桌面快捷方式
├── assets/               # 图标等资源
├── scripts/
│   └── convert-icon.mjs  # SVG → ICO 转换脚本
└── package.json
```

## 原理

Electron 主进程启动后：
1. 解析真实 node.exe 与全局 dsh 路径（`where node` + `npm root -g`）
2. 探测 `http://127.0.0.1:3080`，若已有服务则直接使用
3. 否则直接 spawn `node <dsh bin.js> web`（不经过 cmd 壳，进程树干净）
4. 轮询等待服务就绪（最多 120 秒）
5. 打开窗口加载 Web UI
6. 窗口关闭 → 隐藏到托盘，服务继续
7. 托盘菜单「退出」→ `taskkill /T` 杀掉整个 dsh 进程树

## 常见问题

**Q: 双击快捷方式没反应？**
A: 查看 `dsh.log`，确认 dsh 是否全局安装、端口是否被占用。

**Q: 提示"服务未就绪超时"？**
A: 确认已全局安装 `@deepseek-ai/dsh`（`npm i -g @deepseek-ai/dsh`），并检查日志。

**Q: 关闭窗口后 3080 端口仍被占用？**
A: 这是托盘模式的设计——服务常驻后台。托盘菜单「退出」才会真正停止。

**Q: 任务栏托盘看不到图标？**
A: 点击任务栏右侧的「^」展开隐藏图标，把鲸鱼图标拖出来即可。

## License

MIT
