let data = [
  {
    value: "testetestestestes",
    time: 5,
    color: "red",
    speed: 1,
    fontSize: 22,
  },
  {
    value: "1111111111111",
    time: 10,
    color: "#00a1f5",
    speed: 1,
    fontSize: 30,
  },
  { value: "6666666666666", time: 15 },
];

// 获取到所有需要的dom元素
let doc = document;
let canvas = doc.getElementById("canvas");
let video = doc.getElementById("video");
let $txt = doc.getElementById("text");
let $btn = doc.getElementById("btn");
let $color = doc.getElementById("color");
let $range = doc.getElementById("range");

// Barrage类，用于实例化每个弹幕元素
class Barrage {
  constructor(obj, ctx) {
    this.value = obj.value; //弹幕内容
    this.time = obj.time; //弹幕出现时间
    // 把obj和ctx都挂载到this上方便获取
    this.obj = obj;
    this.context = ctx;
  }
  // 初始化弹幕
  init() {
    // 如果初始化数据没有以下四种参数，直接取默认参数
    this.color = this.obj.color || this.context.color;
    this.speed = this.obj.speed || this.context.speed;
    this.opacity = this.obj.opacity || this.context.opacity;
    this.fontSize = this.obj.fontSize || this.context.fontSize;
    // 创建p元素 计算文字宽度
    let p = document.createElement("p");
    p.style.fontSize = this.fontSize + "px";
    p.innerHTML = this.value;
    document.body.appendChild(p);
    // 拿到p宽度，设置弹幕宽度
    this.width = p.clientWidth;
    // 移除p标签
    document.body.removeChild(p);
    // 弹幕出现位置
    this.x = this.context.canvas.width;
    this.y = this.context.canvas.height * Math.random();
    // 范围超出处理
    if (this.y < this.fontSize) {
      this.y = this.fontSize;
    } else if (this.y > this.context.canvas.height - this.fontSize) {
      this.y = this.context.canvas.height = this.fontSize;
    }
  }
  // 渲染每个弹幕
  render() {
    // 设置画布文字字号和字体
    this.context.ctx.font = `${this.fontSize}px Arial`;
    // 设置画布文字颜色
    this.context.ctx.fillStyle = this.color;
    // 绘制文字
    this.context.ctx.fillText(this.value, this.x, this.y);
  }
}

//canvasBarrage类
class CanvasBarrage {
  constructor(canvas, video, opts = {}) {
    // 如果canvas和video都没传，那就直接return掉
    if (!canvas || !video) return;
    // 挂载this
    this.video = video;
    this.canvas = canvas;
    // 设置canvas宽高等同video
    this.canvas.width = video.width;
    this.canvas.height = video.height;
    // 获取画布，操作画布
    this.ctx = canvas.getContext("2d");
    // 设置默认参数
    let defOpts = {
      color: "#e91e63", //弹幕文字的颜色
      speed: 1.5, //弹幕飘过的速度
      opacity: 0.5, //弹幕文字的透明度
      fontSize: 20, //弹幕文字的大小
      data: [],
    };
    // 合并对象到this
    Object.assign(this, defOpts, opts);
    // 判断播放状态
    this.isPaused = true;
    // 获取弹幕消息
    this.barrages = this.data.map((item) => new Barrage(item, this));
    // 渲染
    this.render();
    console.log(this);
  }
  render() {
    // 渲染第一步，清除原画布
    this.clear();
    // 渲染弹幕
    this.renderBarrage();
    // 播放状态一直渲染
    if (!this.isPaused) {
      // 通过raf渲染动画，递归进行渲染
      requestAnimationFrame(this.render.bind(this));
    }
  }
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  renderBarrage() {
    // 拿到当前视频播放时间
    // 比较视频时间和弹幕展示时间，判断是否展示
    let time = this.video.currentTime;
    // 遍历所有弹幕，每个barrage都是Barrage的实例
    this.barrages.forEach((barrage) => {
      // flag处理是否渲染，默认false
      // 视频播放时间大于等于弹幕出现时间才做处理
      if (!barrage.flag && time >= barrage.time) {
        // 判断当前弹幕是否初始化过了
        // 如果isInit还是false，需要对当前弹幕初始化
        if (!barrage.isInit) {
          barrage.init();
          barrage.isInit = true;
        }
        // 弹幕从右往左渲染，x坐标减等当前弹幕的speed即可
        barrage.x -= barrage.speed;
        barrage.render(); //渲染当前弹幕
        // 如果当前弹幕的x坐标比自身宽度还小，表示渲染结束
        if (barrage.x < -barrage.width) {
          barrage.flag = true; //下次不再渲染
        }
      }
    });
  }
  add(obj) {
    this.barrages.push(new Barrage(obj, this));
  }
  replay() {
    this.clear();
    // 当前视频播放时间
    let time = this.video.currentTime;
    this.barrages.forEach((barrage) => {
      barrage.flag = false;
      // 当前视频时间小于等于弹幕出现的时间则渲染弹幕
      if (time <= barrage.time) {
        barrage.isInit = false;
      } else {
        barrage.flag = true;
      }
    });
  }
}

let canvasBarrage = new CanvasBarrage(canvas, video, { data });

// 播放
video.addEventListener("play", () => {
  canvasBarrage.isPaused = false;
  // 开启弹幕
  canvasBarrage.render();
});
// 暂停
video.addEventListener("pause", () => {
  canvasBarrage.isPaused = true;
});
// 拖动进度条
video.addEventListener("seek", () => {
  // 重新渲染弹幕
  canvasBarrage.replay();
});

// 发送弹幕
function send() {
  let value = $txt.value; // 输入的内容
  let time = video.currentTime; // 当前视频时间
  let color = $color.value; // 选取的颜色值
  let fontSize = $range.value; // 选取的字号大小
  let obj = { value, time, color, fontSize };
  // 添加弹幕数据
  canvasBarrage.add(obj);
  $txt.value = ""; //清空输入框
}
// 点击发送
$btn.addEventListener("click", send);
// 回车发送
$txt.addEventListener("keyop", (e) => {
  let key = e.keyCode;
  key === 13 && send();
});
