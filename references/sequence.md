# 通用参数（版本4）

同一份引擎读取所有项目。AI 从视频、剧本或提示词生成 JSON；构建脚本不自行理解自然语言，也不自动从视频恢复精确三维模型。初次读本页及一个相关示例，普通续改只读项目里相关镜头。

## 最小结构

```json
{
  "version":4,"title":"推近人物","fps":25,"size":[960,540],
  "models":{"human":{"type":"person"}},
  "scenes":{"stage":{"environment":"ground","objects":[
    {"id":"a","model":"human","p":[0,0,0]}
  ]}},
  "shots":[{"name":"推进","duration":4,"scene":"stage",
    "camera":{"keys":[
      {"t":0,"p":[0,1.6,-5],"look":[0,1.2,0],"fov":42},
      {"t":4,"p":[0,1.5,-2],"look":[0,1.3,0],"fov":42}
    ]}
  }]
}
```

- `fps`：整数 12–60，默认 25。`size`：宽、高，均为 160–1920 内的偶数，默认 960×540；参考视频优先保留原画幅。
- `models`：可复用模型字典。`scenes`：可复用场景字典。`shots`：按播放顺序排列，每条 `duration` 必须对应整数帧。总时长自动求和，最多 600 秒、120 个镜头。
- 名称引用使用 1–64 位英文字母、数字、下划线或连字符；界面标题、镜头 `name` 和说明 `note` 可用中文。
- 坐标为示意尺度，Y 向上，模型默认面朝负 Z；旋转 `r:[x,y,z]` 单位为度。模型外观不等于实测资产。

## 模型与组合

`type` 支持 `person`、`car`、`chair`、`table`、`box`、`sphere`、`cylinder`、`cone`、`torus`、`plane`、`group`。

- `person`：约 1.8 单位高的灰模人物，`pose:"sit"` 可设为坐姿；其他静态默认姿态为 `idle`。
- `car`：约 1.8×1.6×4.5 的轿车代理，四轮与方向盘；`occupants:0/1/2`（默认1）；`cutaway:true` 隐去外壳，适合车内机位。
- `chair` 和 `table`：常见比例的座椅与桌子。
- 基础几何体以单位尺寸为基准，球半径0.5，柱/锥半径0.5、高1，圆环外径1，平面默认水平。通过 `s:[x,y,z]` 缩放。
- 任意模型可设置 `p`、`r`、`s`、`color:"#rrggbb"`、`opacity:0.05–1`。
- `group.parts` 是模型描述数组，可叠加已有类型，不接受代码、脚本或远程模型 URL。最多4层、每个模型256部分；避免为细节堆砌大量几何体。

例如，陌生道具可以直接组合，不改引擎：

```json
{"type":"group","parts":[
  {"type":"box","s":[2,0.2,1]},
  {"type":"cylinder","p":[0,0.7,0],"s":[0.2,1.2,0.2]},
  {"type":"sphere","p":[0,1.4,0],"s":[0.4,0.4,0.4]}
]}
```

场景对象是 `{ "id":"a", "model":"human", "p":[...], "r":[...], "s":[...] }`。这些是对象整体的变换，模型内部的变换另行保留。`group` 可以为空，作为没有可见形状的机位跟随基准。

场景 `environment` 可选 `empty`、`ground`、`room`、`studio`、`road`、`city`、`valley`、`gallery`、`bridge`。这些是简单空间参照，复杂布局用场景对象补充。预设道路为直路；需要弯道时用几何体布置道路并填写物体位置/朝向，不把直路运动声称成精确道路复原。

## 摄影机与物体轨迹

摄影机 `keys` 含 `{t,p,look,fov,roll}`：`t` 为镜头内秒数；`p` 机位，`look` 注视点；`fov` 为竖向视角10–100°（默认42）；`roll` 为画面翻转角（默认0）。一个关键点、`t:0` 表示固定机位；多点轨迹从0开始并覆盖镜头末尾，时间严格递增。

`camera.follow:"对象ID"` 表示机位和注视点相对该对象；跟随其平移与旋转，不随其缩放。省略时为世界坐标。朝向变化需要物体轨迹显式填写 `r`，不从路径自动猜朝向。

镜头的 `motion` 用对象 ID 引用轨迹，避免重写模型：

```json
"motion":{"car":[
  {"t":0,"p":[0,0,0],"r":[0,0,0]},
  {"t":3,"p":[-2,0,-15],"r":[0,20,0]},
  {"t":6,"p":[-8,0,-28],"r":[0,35,0]}
]}
```

位置采用按时间插值的 Hermite 曲线，可能在转折处越过关键点；过急的路径应增加过渡点或调整间距，并看图检查。视角、翻转与缩放限制在相邻关键点值之间，避免保持段过冲。角度按填写数值连续变化：从350°继续转到370°，不要写10°。

各 `shots` 的边界按切镜处理。一个连续运镜尽量放在同一条镜头中；不要靠拆成大量短镜头模拟连续轨迹。主体可以与摄影机各自使用不同的关键点时间。

## 简化动作

`actions` 按对象 ID 指定动作片段：

```json
"actions":{"a":[
  {"t":0,"duration":2,"name":"walk"},
  {"t":2,"duration":1,"name":"punch"},
  {"t":3,"duration":1,"name":"duck"}
]}
```

支持 `idle`、`walk`、`run`、`punch`、`kick`、`duck`、`wave`、`sit`。同一对象片段不能重叠或超出镜头。动作只改变简化姿态；进退、转身和绕行还需写 `motion`。不会自动解算碰撞、脚底锁定、对手接触或复杂骨骼动作。

## 构建、续改和导出

```sh
python3 scripts/build_previs.py project.json --check
python3 scripts/build_previs.py project.json --out NEW_DIRECTORY
python3 scripts/build_previs.py saved-preview.html --extract-json recovered.json
```

输出目录与提取文件均拒绝覆盖。`build-info.json` 记录项目哈希与共享引擎文件哈希；不同题材应使用相同的引擎哈希。HTML 全部离线，不依赖项目素材的绝对路径。

网页中可改镜头关键点、主体位置和旋转；在时间轴停好后可增加机位关键点。平面图拖动红色摄影机点，只改当前关键点。JSON 可进一步改时长、模型、动作和场景；导入后重用整套引擎。

`window.previs` 接口：

- `getConfig()` / `setConfig(project)`：读取/校验导入版本4项目。
- `seek(seconds)` / `getState()`：跳转及读取当前镜头、物体世界坐标、摄影机位置与注视点。
- `getPrompts()`：当前机位、物体运动与动作参数生成的提示词。原有 `note` 是创作意图，修改后如不再符合意图需一起改，不把旧意图当新数据。
- `capture()`：当前纯预演 PNG 数据 URL；`frame(seconds)`：按指定时间绘制。
- `startEncode()`：按项目帧率逐帧编码 MP4，锁定编辑。`encoding()` 返回 `state`（encoding/done/error/cancelled）、`progress`，完成时还含 `frames/bytes`。
- 仅在 `state:"done"` 时读取 `encodedBase64()` 并保存为 `.mp4`，不要打印大段 base64。编码或编辑不调用模型 API。`cancelEncode()` 取消。

网页“导出 MP4”调用相同的逐帧编码器和内置封装器，不要求 FFmpeg。需要支持 WebCodecs AVC 的现代浏览器；不支持时使用“导出 WebM”实时录制。实时录制受浏览器后台暂停影响，不作为严格逐帧验收依据。验证 MP4 可用 FFprobe 检查帧数=`sum(duration)×fps`，并抽查镜头边界。

版本2、3继续通过统一 Python 构建入口读取，保留旧页面；版本4页面的参数导入只接受版本4。
