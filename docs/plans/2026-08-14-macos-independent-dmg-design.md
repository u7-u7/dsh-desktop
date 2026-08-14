# macOS 独立 DMG 设计

## 目标

提供未签名的 macOS DMG，支持 Apple Silicon 和 Intel Mac。用户将应用拖入“应用程序”后即可运行，无需预先安装 Node.js 或全局 `@deepseek-ai/dsh`。

## 范围

- 使用 `electron-builder` 生成 macOS DMG。
- 将锁定版本的 DSH 及其生产依赖复制到应用资源目录。
- 由 Electron 内置 Node 启动随包 DSH，而非读取用户的 PATH 或全局 npm 目录。
- 保留 Windows 当前安装与运行路径；将服务管理改为可跨平台运行。
- 生成 universal DMG；若本机无法做 universal 构建，允许分别生成 arm64 与 x64 构件并在 macOS CI 合并验证。

## 设计

### 资源与启动

构建阶段使用专用脚本将 `@deepseek-ai/dsh` 安装到可分发目录，并以 `extraResources` 打入 `Contents/Resources/dsh`。生产环境中的 `main.js` 通过 `process.resourcesPath` 定位 `dsh/lib/bin.js`，使用 `process.execPath` 的 Electron Node 运行时配合 `ELECTRON_RUN_AS_NODE=1` 启动 `dsh web`。开发环境保留全局 DSH / npx 解析作为后备。

DSH 服务资源不置于 ASAR 中，因为服务需在真实文件系统路径运行，且运行期日志写入 Electron `userData` 目录。

### 生命周期

Windows 保留 `taskkill /T`。macOS/Linux 以独立进程组启动服务，退出时向进程组发送 `SIGTERM`，必要时升级到 `SIGKILL`。Dock 激活时恢复或创建窗口；关窗继续托盘常驻。

### 打包

使用 `electron-builder` 的 macOS DMG 目标，产物名为 DeepSeek Harness，应用 ID 为 `com.deepseek.harness.desktop`。本阶段关闭自动签名与公证；README 明确首次打开可能需要用户在 Gatekeeper 中手动确认。

### 验证

- 静态检查主进程与打包脚本。
- 验证 DSH 资源目录和入口文件在打包前存在。
- 在 macOS 上执行 arm64、x64 或 universal 打包，并检查 `.dmg` 与 `.app` 包结构。
- 未签名构件通过 `codesign --verify` 的预期限制仅记录，不作为失败条件。

## 非目标

- 本次不引入 Apple Developer ID、签名、公证或自动更新。
- 不将项目发布到 Mac App Store。
