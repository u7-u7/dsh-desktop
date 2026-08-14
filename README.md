# DeepSeek Harness Desktop

**DeepSeek Harness Desktop**（`dsh-desktop`）是一个将 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 封装为原生桌面应用的启动器。它把"启动服务 → 打开浏览器 → 管理进程"这整套繁琐操作压缩成**双击一次快捷方式**，并以**系统托盘常驻**的方式让智能体任务在后台持续运行。

> DeepSeek Harness 是 DeepSeek 开源的插件化 Agent 框架（一切皆插件，基于 Cordis）。本项目不修改 Harness 本身，只是提供一个更友好的桌面使用方式。

---
## 参考图片
### 图标
<img width="145" height="147" alt="图标" src="https://github.com/user-attachments/assets/4fca8e3b-e5a3-4a5e-8dc8-9973c14f1dc3" />

### 客户端
<img width="2301" height="1555" alt="客户端" src="https://github.com/user-attachments/assets/d4c290a8-13f2-4f2a-a658-8bef6ea6a2e4" />

### 状态栏
<img width="409" height="203" alt="状态栏" src="https://github.com/user-attachments/assets/b5515b50-5e6c-4378-8fe4-6bee53474bf2" />





##  特性

| 特性 | 说明 |
|------|------|
|  **一键启动** | 双击快捷方式，自动拉起 `dsh web` 服务并打开界面，无需手动开终端 |
|  **托盘常驻** | 关闭窗口仅最小化到系统托盘，服务继续在后台运行，任务不中断 |
|  **智能复用** | 若 3080 端口已有服务在运行，直接复用，绝不重复拉起进程 |
|  **干净退出** | 仅从托盘菜单选择「退出」才停止服务，`taskkill /T` 彻底清理进程树 |
|  **日志追踪** | `dsh.log` 记录完整启动过程，出问题可快速定位 |
|  **国内友好** | 安装脚本默认使用 npmmirror 镜像，加速 npm 与 Electron 二进制下载 |
|  **品牌图标** | 窗口、任务栏、托盘均使用 DeepSeek 品牌图标 |

---

##  环境要求

- **操作系统**：Windows 10 / 11（x64；ARM64 会下载对应架构的 Electron）
- **Node.js**：≥ 22.19（建议 24.x LTS）
- **网络**：安装阶段需要联网（下载 dsh 与 Electron，约 150MB）

>  没有 Node.js 也没关系——安装脚本会尝试用 winget 自动安装。

---

##  快速开始

### 方式一：一键安装（推荐）

**只需 3 步，全程无需手动输入命令：**

1. **获取代码**
   ```sh
   git clone https://gitee.com/wjc18053186786/dsh-desktop
   cd dsh-desktop
   ```

2. **运行安装脚本**
   ```
   双击 install.cmd
   ```
   脚本会自动完成（约 3-5 分钟，取决于网速）：
   | 步骤 | 内容 |
   |------|------|
   | 1/5 | 检测 Node.js，缺失则用 winget 自动安装 |
   | 2/5 | 全局安装 `@deepseek-ai/dsh`（若未安装） |
   | 3/5 | 安装 Electron 运行时（含约 100MB 二进制） |
   | 4/5 | 校验 Electron 二进制完整性（失败自动重试/下载） |
   | 5/5 | 在桌面创建 **DeepSeek Harness** 快捷方式 |

3. **开始使用**
   双击桌面上的 **DeepSeek Harness** 快捷方式，等待窗口弹出即可。

### 方式二：手动安装

适合已经装好 Node.js 和 dsh 的用户：

```sh
npm i -g @deepseek-ai/dsh --registry=https://registry.npmmirror.com
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm i --registry=https://registry.npmmirror.com
powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1
```

---

##  使用指南

### 首次使用

1. 双击桌面快捷方式，等待窗口加载（首次启动服务约需 5-10 秒）
2. 打开 **设置 → 模型**，填入你的 DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com) 获取）
3. 选择工作目录并新建会话，开始使用

### 窗口与托盘

| 操作 | 效果 |
|------|------|
| 关闭窗口（点 X） | 最小化到系统托盘，服务**继续后台运行** |
| 单击托盘图标 | 重新打开窗口 |
| 右键托盘图标 → 显示窗口 | 重新打开窗口 |
| 右键托盘图标 → 退出 | **彻底退出**：停止服务、清理进程、关闭应用 |

> 💡 若托盘区看不到图标，点击任务栏右侧「^」展开隐藏图标即可。

---

##  排错指南

### 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 双击快捷方式没反应 | dsh 未全局安装 / 端口被占用 | 查看 `dsh.log`，确认 `where dsh` 有输出 |
| 提示"服务未就绪超时" | dsh 启动失败 / 端口被占用 | 查看 `dsh.log`；确认 3080 端口空闲 |
| 窗口一闪而过 | 全局 dsh 缺失 | `npm i -g @deepseek-ai/dsh` 后重试 |
| 托盘区没有图标 | 图标被折叠 | 点任务栏「^」展开，把鲸鱼图标拖出 |
| `electron.exe` 未生成 | 二进制下载失败 | 见下文「Electron 二进制下载失败」 |

### Electron 二进制下载失败

安装脚本内置了**三级自动修复**（重跑 install.js → 解压缓存 zip → 直连镜像下载）。若仍失败，手动处理：

1. 检查 `node_modules\electron\dist\electron.exe` 是否存在
2. 手动下载 `electron-v<版本>-win32-x64.zip` 并解压到 `node_modules\electron\dist\`
3. 在 `node_modules\electron\` 下创建 `path.txt`，内容为 `electron.exe`

---

##  项目结构

```
dsh-desktop/
├── main.js               # Electron 主进程：启动服务、托盘常驻、退出清理
├── install.cmd           # 安装入口（薄壳，调用 install.ps1）
├── install.ps1           # 一键安装脚本（全部逻辑）
├── create-shortcut.ps1   # 创建桌面快捷方式
├── package.json          # 依赖声明（electron）
├── assets/
│   ├── deepseek.ico      # 应用图标（多尺寸）
│   └── deepseek-color.svg # 图标源文件
└── scripts/
    └── convert-icon.mjs  # SVG → ICO 转换工具
```

---

## ⚙ 工作原理

```
双击快捷方式
   │
   ▼
Electron 主进程 (main.js)
   │
   ├─ 1. 解析 node.exe 与全局 dsh 路径（where node + npm root -g）
   ├─ 2. 探测 http://127.0.0.1:3080
   │     ├─ 已有服务 → 直接复用
   │     └─ 无服务 → spawn node <dsh bin.js> web（不经过 cmd 壳）
   ├─ 3. 轮询等待服务就绪（最多 120 秒）
   ├─ 4. 打开窗口加载 Web UI
   ├─ 5. 关窗 → 隐藏到托盘，服务继续
   └─ 6. 托盘「退出」→ taskkill /T 清理整个 dsh 进程树
```


---

## ️ 开发

### 本地开发

```sh
npm i                                 # 安装依赖
npm start                             # 启动 Electron 应用
```

### 自定义图标

把你的图标图片（png/jpg/svg）放到 `assets/` 目录，然后：

```sh
npm i -D sharp png-to-ico             # 安装转换依赖
node scripts/convert-icon.mjs         # 生成 deepseek.ico
powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1   # 更新快捷方式
```


---

##  License

[MIT](LICENSE)

---

##  致谢

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — 本项目封装的核心框架
- [Electron](https://www.electronjs.org/) — 跨平台桌面运行时
