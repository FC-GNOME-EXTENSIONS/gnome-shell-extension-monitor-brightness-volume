# 显示器亮度与音量控制

通过 ddcutil 和 DDC/CI，在 GNOME 快捷设置中控制外接显示器的亮度和硬件音量，支持多显示器及快捷键。

本仓库基于 Nei 的 [Control monitor brightness and volume with ddcutil 第 13 版](https://extensions.gnome.org/extension/6325/control-monitor-brightness-and-volume-with-ddcutil/)。首次提交完整保留官方发布包的 15 个原始文件，后续提交增加 GNOME Shell 50、51 适配。保留原作者信息、捐赠链接及 [GPL v2 许可证](LICENSE)。

## 适配内容

2026-11-15 的适配修改包括：

- 在版本声明中增加 GNOME Shell 50、51，保留上游原有的 45–49 声明。
- 修正亮度和音量快捷键的 OSD 调用，优先使用 `showAll()`，旧接口仍有兼容处理。
- 将本版本号调整为 14，项目主页指向本仓库。

UUID 保持为 `monitor-brightness-volume@ailin.nemui`，安装本版本会替换同 UUID 的已有用户级扩展。GNOME 官方扩展目录中的上游版本不会因本仓库更新而变化，本适配版需要从本仓库打包安装。

当前已完成 JavaScript 语法检查、GSettings XML 解析、打包内容检查和 12 项 OSD 回归测试。GNOME 50、51 的 OSD 接口已对照官方源码；尚未在这两个版本的桌面会话及实际显示器上完成运行验证。

## 运行条件

- GNOME Shell 桌面会话。
- 已安装 ddcutil，显示器开启并支持 DDC/CI。
- 当前普通用户能够访问对应 I2C 设备。
- 显示器支持 VCP `0x10` 才能控制亮度，支持 VCP `0x62` 才能控制显示器硬件音量。

Arch Linux 可执行：

```bash
sudo pacman -Syu --needed ddcutil
```

先以普通用户检查硬件访问和支持情况：

```bash
ddcutil detect
ddcutil getvcp 10
ddcutil getvcp 62
```

有多个显示器时，可加 `--display 1` 等参数指定显示器。不支持音量控制的显示器不会出现可用的硬件音量滑块。权限问题应先按 [ddcutil 的说明](https://www.ddcutil.com/i2c_permissions/)处理。

## 打包

在 GNOME 系统中使用自带的 `gnome-extensions` 命令。Arch 的该命令由 `gnome-shell` 包提供。

```bash
git clone https://github.com/iTanX/gnome-shell-extension-monitor-brightness-volume.git
cd gnome-shell-extension-monitor-brightness-volume

mkdir -p dist
gnome-extensions pack --force \
  --extra-source=js \
  --extra-source=LICENSE \
  --extra-source=README.md \
  --out-dir=dist \
  .
```

生成文件：

```text
dist/monitor-brightness-volume@ailin.nemui.shell-extension.zip
```

`--extra-source=js` 必须保留，否则辅助 JavaScript 文件不会被打包。GSettings schema 会由打包工具自动收集，并在安装时编译。无需执行 `npm install` 或构建二进制文件。

## 安装与启用

以当前桌面用户运行：

```bash
gnome-extensions install --force \
  dist/monitor-brightness-volume@ailin.nemui.shell-extension.zip
```

安装后注销并重新登录，使 GNOME 发现新扩展并加载最新代码，然后运行：

```bash
gnome-extensions enable monitor-brightness-volume@ailin.nemui
gnome-extensions info monitor-brightness-volume@ailin.nemui
```

默认安装目录为：

```text
~/.local/share/gnome-shell/extensions/monitor-brightness-volume@ailin.nemui/
```

设置了 `XDG_DATA_HOME` 时，安装目录随之变化。安装和启用扩展均不使用 sudo。

## 使用

启用后等待显示器检测完成，再打开右上角快捷设置。扩展在系统音量和亮度滑块附近添加显示器控制滑块，仅显示检测成功的项目。

默认快捷键：

| 操作 | 快捷键 |
|------|--------|
| 增加显示器亮度 | Ctrl + 亮度增加键 |
| 降低显示器亮度 | Ctrl + 亮度降低键 |
| 增加显示器硬件音量 | Ctrl + 音量增加键 |
| 降低显示器硬件音量 | Ctrl + 音量降低键 |

它调节的是显示器硬件音量，GNOME 系统输出音量仍由原有系统滑块控制。

上游没有提供 `prefs.js` 设置界面。需要查看或调整配置时，可以使用安装目录内的 schema：

```bash
SCHEMA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/monitor-brightness-volume@ailin.nemui/schemas"
gsettings --schemadir "$SCHEMA_DIR" list-recursively \
  org.gnome.shell.extensions.monitor-brightness-volume
```

## 更新与排查

更新仓库后，重新执行打包、安装步骤，并注销重新登录：

```bash
git pull --ff-only
```

检查扩展状态：

```bash
gnome-extensions info monitor-brightness-volume@ailin.nemui
```

查看当前用户的桌面日志，留意扩展 UUID 和 JavaScript 错误：

```bash
journalctl --user -b -f -o cat
```

若没有出现滑块，先确认 `ddcutil detect` 和 `getvcp` 在普通用户下工作正常，再检查 `show-volume` 设置和日志。首次启用及显示器变更后会等待约 5 秒，再执行带重试的检测。

## 开发验证

可使用 Node.js 24 运行不依赖 GNOME 桌面的 OSD 回归测试：

```bash
node --experimental-vm-modules --test tests/osd.test.mjs
```

测试加载真实扩展类，对 GNOME 依赖使用隔离替身，覆盖四个快捷键、新旧 OSD 接口和滑块数值边界。Node.js 仅用于开发测试，不是运行扩展的依赖。

实机还需验证滑块、快捷键及屏幕提示、显示器插拔、休眠恢复、扩展禁用与重新启用。
