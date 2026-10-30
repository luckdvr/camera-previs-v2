# Camera Previs v2

把剧本或运镜描述整理为少量参数，用固定 Three.js 引擎生成可交互的离线运镜预演。AI 负责理解内容和安排镜头，网页负责播放、调整和渲染。

这是 `camera-previs-v2` 的独立维护仓库。仓库根目录本身就是可安装的 Skill；原有 `camera-previs` 可以同时保留。

## 开始使用

需要 Python 3.8 或更新版本，无需安装 Python 第三方包。生成的 HTML 包含渲染引擎，可在支持 WebGL 的现代桌面浏览器中离线打开。

先获取仓库：

```sh
git clone https://github.com/luckdvr/camera-previs-v2.git
cd camera-previs-v2
```

在本仓库目录运行：

```sh
python3 scripts/build_previs.py references/flight-example.json --out output/flight-demo
python3 scripts/build_previs.py examples/two-person.json --out output/two-person-demo
```

打开对应目录内的 `preview.html`。每次输出请使用新目录，构建器会拒绝覆盖已有目录。

网页支持播放、时间拖动、机位调整、撤销与重做、同步运镜提示词、保存项目和视频导出。渲染与网页交互不调用模型；让 AI 规划镜头或修改项目仍会消耗模型 token。

## 作为 Skill 使用

将整个仓库文件夹复制为 Codex 的 `skills/camera-previs-v2` 目录，再在支持 Skills 的环境中调用：

```text
用 $camera-previs-v2，根据这段剧本做一个 15 秒的运镜预演。
先用简化模型确认构图和移动路线，输出可以交互修改的 HTML 和项目参数。
```

本机已有安装副本时，无需重新安装。仓库与安装副本相互独立，修改仓库不会自动覆盖已安装文件。

## 两种项目

| 模式 | 示例与说明 | 当前表达能力 |
| --- | --- | --- |
| 连续运动，版本 3 | [飞行参数](references/flight-example.json)、[参数说明](references/continuous.md) | 主体、摄影机和注视点在同一时间轴连续移动；当前使用预制飞翼三轮车及简化山谷／空场 |
| 人物站位，紧凑参数／版本 2 | [双人示例](examples/two-person.json)、[参数说明](assets/legacy/references/plan.md) | 1—4 个灰模人物、固定站位与简单场景、分镜和直线运镜；动作描述不会自动变成骨骼动画 |

图片资产用于理解角色和场景，不会自动重建任意三维模型。现有连续模式可复用路径和时间参数；更换模型种类需要扩展引擎。

## 继续修改

优先修改项目数据，复用引擎。保存的 HTML 也可以提取项目参数：

```sh
python3 scripts/build_previs.py output/flight-demo/preview.html --extract-json output/recovered.json
python3 scripts/build_previs.py output/recovered.json --out output/flight-revised
```

构建器只读取 HTML 中的配置数据，不执行输入页面的代码。

## 视频与对照展示

网页可以直接导出预演。需要严格逐帧的 1080×1920 展示视频时，按 [连续参数与导出](references/continuous.md) 编码，再运行 `scripts/compose_showcase.py`；这一步需要 FFmpeg 和 FFprobe。

展示模板为原片大画面、右下角小灰模、下方动态机位图。示例版式含 eidolon 字样；更换品牌设计可替换 `assets/showcase-background.png`。原片、配音、音乐及导出成片放在仓库以外。

## 仓库维护

- `SKILL.md`：AI 使用入口。
- `assets/`：离线网页、渲染引擎及兼容旧项目的资源。
- `scripts/`：构建和合成脚本。
- `references/`、`examples/`：参数说明及可运行示例。
- `output/`、`dist/`、临时文件和媒体素材已列入 `.gitignore`。

在仓库根目录可生成带顶层目录的分享包：

```sh
git archive --format=zip --prefix=camera-previs-v2/ --output=../camera-previs-v2-share.zip HEAD
```

第三方依赖与许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。远程仓库：[luckdvr/camera-previs-v2](https://github.com/luckdvr/camera-previs-v2)。
