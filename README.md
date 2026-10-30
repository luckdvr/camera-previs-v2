# Camera Previs v2

输入视频、剧本或提示词，让 Codex 等支持 Skills 的 AI 整理镜头，用固定的三维引擎生成简化预演。后续改镜头、走位和节奏只改项目参数，不为每段素材重新写引擎。

仓库根目录就是可安装的 `camera-previs-v2` Skill。新版通用项目使用**参数版本4**，Skill 名称与仓库地址保持不变；原来的版本2、3项目仍可打开。

## 使用

把整个仓库目录安装为 `skills/camera-previs-v2`，向 AI 提供视频、剧本或提示词，例如：

> 用 $camera-previs-v2，根据这个视频做简化运镜预演。保留画幅和镜头节奏，输出可修改的 HTML、项目参数和 MP4。

> 用 $camera-previs-v2，做一段8秒预演：两个人隔桌交谈，先双人中景，再推近甲，最后反打乙。

> 用 $camera-previs-v2，做双方进退、出拳和闪避的简化预演。后面只改参数复用。

AI 负责看视频、读剧本、选择模型与机位并生成 JSON；构建器不直接理解自然语言。网页操作、曲线插值和渲染不调用模型 API，不需要另配服务密钥。

## 可直接运行的示例

需要 Python 3.8+，无 Python 第三方包依赖。HTML 内含 Three.js，支持 WebGL 的现代浏览器可离线打开。

```sh
git clone https://github.com/luckdvr/camera-previs-v2.git
cd camera-previs-v2
python3 scripts/build_previs.py examples/dialogue-v4.json --out output/dialogue
python3 scripts/build_previs.py examples/vehicle-v4.json --out output/vehicle
python3 scripts/build_previs.py examples/fight-v4.json --out output/fight
```

打开对应输出目录中的 `preview.html`。每次生成使用新目录；脚本拒绝覆盖已有结果。

| 共享能力 | 用途 |
| --- | --- |
| 人物、轿车、桌椅 | 对话、站位、车外及车内机位 |
| 基础几何体与组合 | 用参数表示陌生道具、场景和简化资产 |
| 多场景、多对象、多镜头 | 同一时间轴上的分镜、走位与跟拍 |
| 连续轨迹、注视点、视角、翻转 | 推拉、绕行、俯仰及画面翻转 |
| 预设人物动作 | 行走、跑步、出拳、踢腿、下蹲和挥手示意 |
| 网页编辑 | 时间拖动、慢放、拖机位、改关键点与主体位置、撤销/重做 |
| 保存与输出 | HTML、JSON、同步提示词、逐帧 MP4、实时 WebM |

MP4 导出需要浏览器支持 WebCodecs AVC；不支持时可使用 WebM。参考视频抽帧脚本另需 FFmpeg/FFprobe。无需特定浏览器插件。

## 参数复用

通用项目按 `models → scenes → shots` 组织：模型与场景复用，镜头只写有关的机位和运动。未提供的资产可以用几何体组合，不需要增加 JavaScript 模式。

完整结构、边界和浏览器导出接口见 [通用参数说明](references/sequence.md)。保存过的页面也可恢复为参数：

```sh
python3 scripts/build_previs.py saved-preview.html --extract-json recovered.json
python3 scripts/build_previs.py recovered.json --out output/revised
```

HTML 中只提取配置数据，不执行输入页面脚本。每份版本4结果附 `build-info.json`，记录共享引擎与项目哈希，便于核对不同题材确实使用同一套引擎。

## 视频参考与能力范围

```sh
python3 scripts/inspect_video.py reference.mp4 --out output/reference-frames
```

脚本在本地输出带时间的帧图及元数据，供 AI 查看后安排镜头。原片和用户资产不随 Skill 上传或分享。

这是景别、摄影机运动和空间关系的灰模预演。视频不能唯一确定真实机位与焦距，结果是近似安排；几何体组合不会自动变成写实模型，动作预设不会自动解决精确碰撞、抓握、脚底锁定或武术接触。复杂特效可以用占位形状表达。

## 旧项目

```sh
python3 scripts/build_previs.py references/flight-example.json --out output/flight-v3
python3 scripts/build_previs.py examples/two-person.json --out output/dialogue-v2
```

旧项目继续使用原来的页面和渲染方式。版本3的固定飞翼车辆参数见 [旧连续参数](references/continuous.md)；版本2/紧凑参数见 [旧分镜参数](assets/legacy/references/plan.md)。原有 `camera-previs` 可与本 Skill 并存。

旧 `compose_showcase.py` 保留用于版本3的16:9展示流程。新版默认只生成预演，不自动增加原片对照或展示版式。

## 检查与分享

```sh
python3 -m unittest discover -s tests -v
node tests/model.test.cjs
```

检查覆盖输出保护、HTML配置提取、非法参数、插值、切镜边界、提示词同步、新旧版本，以及不同题材使用相同引擎。还应在浏览器检查实际构图、编辑与视频导出；单元检查不等于视觉验收。

从已提交版本生成分享包：

```sh
git archive --format=zip --prefix=camera-previs-v2/ --output=../camera-previs-v2-share.zip HEAD
```

更新已安装副本前保留旧副本；仓库与安装目录相互独立。第三方依赖与许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
