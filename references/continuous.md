# 连续参数与导出

版本3的最小输入包含 `version:3`、`title`、`duration`、`fov`、`cameraSpace`、`environment`、`tracks`、`phases`。可从 [飞行示例](flight-example.json) 复制结构后只改参数。

- `duration`：0.1–600秒；`fov`：15–100度的竖向视角。
- `language`：`en`输出英文机位图与提示词；省略时使用中文。用户写入的阶段名称和说明也需使用相应语言。
- `environment`：`valley`简化山谷或`empty`空场。当前移动模型固定为飞翼三轮车、灰模乘客和圆头司机，不把换一张参考图说成换好了三维模型。
- `tracks.subject/camera/look`：各2–100个关键点，每点`{"t":秒,"p":[x,y,z]}`。时间严格递增，第一点为0，最后一点为总时长；坐标为有限数值。`subject`可加`bank`，单位为度。
- 采用按时间求导的三次Hermite插值，不会在每个阶段边界停住。车辆沿轨迹切线朝向前方，局部前方是负Z，Y向上。
- `cameraSpace:"subject"`：相机与注视点使用跟随车辆朝向的局部坐标；`world`：使用世界坐标。主体轨迹始终是世界坐标。
- `phases`：`{"t":开始秒,"name":"阶段名","note":"一句运镜说明"}`。从0开始递增且小于总时长。这些是同一个连续镜头里的阶段。
- 坐标仅作比例示意，不是从原片测量出来的米数。单眼成片不能唯一确定真实摄影机轨迹。

## 浏览器与视频

生成页的 `window.previs` 提供：`getConfig()`、`setConfig(c)`、`seek(seconds)`、`getPrompts()`、`getState()`、`inspect()`、`capture(kind)`。`capture`接受`view`（960×540灰模）、`study`（1080×1120机位图）和`diagram`（紧凑机位图）。截图返回PNG数据URL。使用已有浏览器工具即可，不依赖某一种插件。

网页“导出视频”使用浏览器原生录制，支持纯预演和示意图。制作严格同步的展示片时使用逐帧编码：

1. 调用`previs.startEncode(30, "showcase")`，通过`previs.encoding()`检查完成状态。导出时锁定编辑，帧时间为`i/30`；一共`ceil(duration*30)`帧。
2. 仅在状态为`done`时读取`previs.encodedBase64()`并以二进制保存为`render.h264`，不要把大段base64打印给用户。浏览器需支持WebCodecs H.264；不支持时如实说明，普通网页录制仍可用。
3. 用FFmpeg转封装：`ffmpeg -n -r 30 -i render.h264 -c:v copy -movflags +faststart render.mp4`。
4. 运行`python3 scripts/compose_showcase.py --source ORIGINAL --render render.mp4 --project project.json --out NEW_DIRECTORY`。脚本要求16:9原片、原片与项目时长相差不超过一帧。输出`camera-previs-showcase.mp4`和`previs-only.mp4`。需要FFmpeg；合成无需Pillow或字体安装。

逐帧中间素材为1080×1660：灰模位于`[0,0,960,540]`，机位图位于`[0,540,1080,1120]`。最终版式为：原片`[28,224,1024,576]`，灰模小窗`[812,658,224,126]`，机位图`[28,824,1024,1062]`。原声直接复制到成片；单独灰模没有音轨。

原片、灰模和机位图对应同一秒数。合成后检查1080×1920、30fps、约定时长、原音轨，以及起止与各阶段边界。修改参数只重新生成预演与展示片，不修改原片或原始提示词。

## 旧项目

同一构建器接受旧版紧凑参数和版本2 JSON，输出原来的交互页面；不强行把切镜项目转为连续航迹。版本3页面的参数导入仅接受版本3；旧项目通过构建器打开。
