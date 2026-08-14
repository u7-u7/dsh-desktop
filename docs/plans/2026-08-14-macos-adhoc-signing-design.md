# macOS 过渡签名设计

## 目标

让未公证的 macOS 发布包通过基础代码签名校验，使 Gatekeeper 向用户展示“无法验证开发者”的确认流程，而不是“应用已损坏”。

## 方案

- 使用 electron-builder 的 `mac.identity: "-"` 显式为整个 App 写入 ad-hoc 签名。
- 关闭 `hardenedRuntime`；该能力需要 Developer ID 签名或额外的库验证豁免，不适用于本过渡包。
- 每次构建后执行 `codesign --verify --deep --strict`。只有校验通过的 DMG 才能发布。
- README 只说明 Control 点击确认打开，不要求用户关闭系统安全能力或执行隔离属性清理命令。

## 边界

ad-hoc 签名不提供发布者身份，也不能替代 Apple 公证。最终方案仍是 Developer ID Application 签名、Hardened Runtime、公证与 staple。
