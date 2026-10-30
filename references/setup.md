# 自动准备环境

此流程由 Codex 执行。用户只需提供仓库链接并要求安装，随后给视频、剧本或提示词；无需自行配置 PATH、Python 包或 API 密钥。

## 入口与返回值

在技能目录运行：

```sh
bash scripts/setup.sh --install
```

Windows：

```powershell
powershell -NoProfile -File scripts/setup.ps1 -Install
```

入口先寻找 Python 3.8+，包括 Codex 自带运行时；缺少时通过现有包管理器安装，再执行 `setup_env.py`。已有可用 Python 时也可直接运行 `PYTHON scripts/setup_env.py --install`。这里及后续命令的 `PYTHON` 使用实际绝对路径，不是要求用户配置的环境变量。

不传安装开关则只检查依赖，不安装软件；检查会写本地缓存。默认 `video` 检查抽帧与导出所需环境；`--profile build` / `-Mode build` 只准备构建 HTML 所需 Python。正常使用无需 Node.js；Node 只用于开发者运行 JavaScript 单元测试。

JSON 字段：

| 字段 | Codex 的处理 |
| --- | --- |
| `ready` | 必须为 true 才可依赖本轮检查的能力 |
| `tools.*.path` | 使用实际路径；不要求重开终端或手改 PATH |
| `missing` / `issues` | 缺项或具体失败原因，继续诊断 |
| `actions` | 本轮安装记录及日志；空数组说明复用了已有软件 |
| `planned_commands` | 仅检查模式下，缺项对应的安装计划 |
| `mp4_mode` | `webcodecs`：逐帧 MP4；`webm_ffmpeg`：实时 WebM 后转 MP4；`unavailable`：视频环境不完整 |

退出码 0 表示通过，2 表示尚未就绪；Python 引导安装失败也可能返回包管理器的非零码。不能只看到命令启动成功就宣称就绪。环境检查不代替实际作品的构图、帧数及视觉验收。

## 安装来源与范围

| 系统 | 默认来源 | 缺失时安装 |
| --- | --- | --- |
| macOS | 已安装的 Homebrew | Python、FFmpeg（含 FFprobe）、Google Chrome |
| Windows | WinGet 官方社区源，当前用户范围 | Python.Python.3.12、Gyan.FFmpeg、Google.Chrome.EXE |
| Debian / Ubuntu | apt-get，必要时通过系统授权 | python3、ffmpeg、chromium；Ubuntu 使用 chromium-browser |

已有的 Chrome、Edge 或 Chromium 会先实际测试，通过就复用。安装命令不主动升级已有可用软件，不改 shell 配置，不卸载用户软件。包管理器仍可能为新增软件安装必要的依赖。安装源和签名／哈希检查保留，不使用不明下载站或关闭校验。

依据：[Homebrew FFmpeg](https://formulae.brew.sh/formula/ffmpeg)、[Chrome cask](https://formulae.brew.sh/cask/google-chrome)、[WinGet 安装参数](https://learn.microsoft.com/en-us/windows/package-manager/winget/install)、[Chrome 用户安装包](https://github.com/microsoft/winget-pkgs/tree/master/manifests/g/Google/Chrome/EXE)、[Debian Chromium](https://wiki.debian.org/Chromium)、[Ubuntu Chromium 包](https://packages.ubuntu.com/search?keywords=chromium-browser)。Ubuntu 的包会转到 Snap，需要可用的 Snap 服务；容器并不一定具备这些条件。

## 不需要用户手配的异常处理

1. **没找到包管理器**：先寻找 Codex 自带或其他已安装且可验证的运行时。仍缺软件时，由 Codex 查阅并使用 [Homebrew 官方安装](https://docs.brew.sh/Installation)、[Microsoft App Installer / WinGet](https://learn.microsoft.com/en-us/windows/package-manager/winget/) 或 [Python 官方下载](https://www.python.org/downloads/) 完成所需安装；按实际系统使用官方方式，不直接执行搜索结果里的未知脚本。其他 Linux 发行版用自身官方包管理器。完成后重跑检查。
2. **沙盒、管理员或联网权限不足**：针对日志中的具体命令，使用宿主提供的权限申请机制重试。系统密码由用户在系统窗口输入，不在聊天中收集。不要用关闭浏览器沙盒、绕过系统执行策略或关闭下载校验来规避限制。
3. **浏览器能找到但检测失败**：查看浏览器日志；确认进程启动、本地回环端口及 GPU/WebGL 是否被环境阻止。检查器不会把这类失败当成“没安装”再重复安装浏览器。可通过宿主已有浏览器工具打开 `assets/sequence/capability-probe.html` 查看真实结果；若该浏览器与检测浏览器不同，说明区别，不伪造自动检查成功。
4. **安装完成但当前 PATH 没刷新**：检查器会从常见安装位置、WinGet 包目录发现软件。特殊目录可由 Codex 在当前进程提供 `CAMERA_PREVIS_PYTHON`、`CAMERA_PREVIS_FFMPEG`、`CAMERA_PREVIS_FFPROBE` 或 `CAMERA_PREVIS_BROWSER` 的绝对路径后复查；无需用户编辑环境变量。
5. **只有 WebM 编码可用**：使用已检查的 FFmpeg 执行 `PYTHON scripts/convert_video.py exported.webm --out NEW.mp4`。保留原 WebM，拒绝覆盖现有输出；实录丢帧无法靠转码恢复，需要严格逐帧时改用支持 AVC 的浏览器。

失败时继续处理不依赖该项的工作，例如先整理项目参数；明确哪一步待完成。没有视频文件或验收结果时，不声称已经导出视频。

## 缓存与复查

工具路径、版本、能力和安装日志保存在用户缓存目录：macOS `~/Library/Caches/camera-previs`，Windows `%LOCALAPPDATA%/camera-previs`，Linux `$XDG_CACHE_HOME/camera-previs` 或 `~/.cache/camera-previs`。不写进仓库或分享包。

每次检查重新验证程序路径和版本。浏览器使用独立配置，只在本机回环地址加载探测页，实际读取 WebGL 像素并编码一帧 AVC；不使用已登录的个人浏览器配置。同版本成功结果最多缓存 7 天，浏览器版本或探测页变化会重新检查。出错或机器图形环境变化时，使用 `--recheck-browser` / `-RecheckBrowser` 强制复查。

测试可用 `--state-dir DIRECTORY` / `-StateDir DIRECTORY` 指定隔离缓存；后续媒体脚本需在同一进程环境中设置 `CAMERA_PREVIS_STATE_DIR` 指向它。日常默认路径无需此设置。检查器保留安装日志和隔离浏览器配置，不批量清理文件。

macOS 已实测环境检查、重复运行、抽帧与转码。Windows/Linux 的安装命令和失败分支有模拟测试，尚未真机验证，不保证所有系统版本或企业策略下无人值守成功。
