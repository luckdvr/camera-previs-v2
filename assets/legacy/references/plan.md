# 紧凑参数

模型只写这个小JSON，构建脚本展开为网页需要的完整项目。普通生成无需读 `assets/engine/`。

```json
{
  "title": "巷口对峙",
  "scene": "夜，狭窄巷口。",
  "cast": ["甲", "乙"],
  "dialogue": false,
  "shots": [
    {"name":"建立空间","view":"wide","dur":3,"action":"甲乙相对站立。"},
    {"name":"出拳与闪避","view":"wide","move":"right","travel":0.6,"dur":5,"action":"甲出拳，乙侧闪。"},
    {"name":"反应","view":"single","target":"乙","move":"push","travel":0.25,"dur":4,"action":"乙观察甲，准备反击。"}
  ]
}
```

这会生成12秒的运镜预演。人物保持固定站位，动作仅为文字说明。不要把这个示例当成所有输入的默认分镜或固定镜头数。

## 项目字段

| 字段 | 含义 / 默认 |
|---|---|
| `title` | 项目名，最多60字 |
| `scene` | 场景说明，可写地点、时间、表演要求；默认空，最多3000字 |
| `script` | 可选原文，最多20000字；用于保存溯源，不自动重复进每镜提示词 |
| `set` | `empty` 空场 / `table` 桌子 / `bed` 病床；默认 `empty` |
| `cast` | 1–4个人物名；也可用下方的对象写站位 |
| `shots` | 1–30镜，每镜 `dur` 1–60秒；原始总时长最多600秒 |
| `speed` | `.5 / 1 / 1.5 / 2 / 3 / 4`，默认1 |
| `dialogue` | 是否输出字幕及对白提示词；默认有对白字段时开启，原文不会删除 |
| `export` | `video` 纯16:9画面 / `sheet` 整张3:4示意图；默认 `video` |

输出时长为 `sum(dur)/speed`。新任务给了明确总时长时按实际输出时长核算；修改既有预演的倍速时保留原始 `duration`。所有视频无音轨。

人物简写默认沿X轴左右排开、面向场景中心。需要精确站位时：

```json
"cast": [
  {"name":"甲","x":-1,"z":0,"pose":"stand","facing":90},
  {"name":"乙","x":1,"z":0,"pose":"sit","facing":-90}
]
```

`x`为场景左右（-4～4米），`z`为前后（-2～4米）。正X朝右，正Z朝前。`pose`为 `stand/sit/bed`，即站立、坐椅子、坐床沿；朝向 `facing` 是-180～180度，0朝前、90朝右。整个项目站位不随镜头变化。

## 镜头字段

- `name`：镜头名；`dur`：原始秒数，默认5；`action`：本镜动作或画面要求，最多5000字。
- `dialogue`：每行一条 `人物名：台词`，最多4000字；保留原文，不添加原文没有的台词。
- `view`：`wide`看整组人物、`single`看某个人、`over`越过前景人物看目标。默认 `wide`。
- `target`：目标人物名，默认第一人；`over`：过肩前景人物名，默认目标之外的第一人。过肩必须两个人分开站位。
- `move`：`hold/push/pull/left/right/up/down`，固定/推进/拉远/左移/右移/升/降，默认固定。
- `travel`：移动米数，默认0.45，范围0～5。左右按开场机位的朝向计算；所有方向都是直线路径，不是弧线或演员跟随。
- `camera`：可选局部覆写 `from/to/look/fov`。如果显式写 `to`，不要再写非 `hold` 的 `move`。坐标单位米，Y向上；`fov`为22～60度的竖向视角，不是镜头毫米数。

```json
{"dur":4,"camera":{"from":[2,2,4],"to":[1.6,1.8,3.6],"look":[0,1.3,0],"fov":37}}
```

构建器会拒绝贴地或穿过注视点的相机路径。预设负责给出起始机位，不保证任何站位下都完美构图；仍需看关键帧。

## 已有项目与命令

网页导出的 `project.json` 为版本2，字段为 `project/options/shots`。它包含实际坐标，可以直接修改后传给构建器；不要把完整项目再强行改回紧凑格式。

```text
python3 scripts/build_previs.py plan.json --check
python3 scripts/build_previs.py plan.json --out new-preview-folder
python3 scripts/build_previs.py saved-preview.html --extract-json recovered-project.json
python3 scripts/build_previs.py recovered-project.json --out revised-preview-folder
```

脚本路径相对技能目录，实际调用时传绝对路径。输出目录或提取文件必须不存在，防止覆盖旧版本。旧版只有机位的版本1 JSON 不含完整剧本资料，先在通用网页中导入、补齐内容并导出版本2，或依据用户上下文新写完整计划。
