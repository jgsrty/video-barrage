let data = [
  { value: "test1", time: 2, color: "red", speed: 1, fontSize: 22 },
  { value: "22222222222222", time: 5, color: "blue", speed: 1, fontSize: 42 },
  { value: "test3333test3333test3333", time: 12, opacity: 1 },
];

// 获取dom元素
let doc = document;
let canvas = doc.getElementById("canvas");
let video = doc.getElementById("video");
let $text = doc.getElementById("text");
let $btn = doc.getElementById("btn");
let $color = doc.getElementById("color");
let $range = doc.getElementById("range");

// Barrage
class Barrage {
  constructor(obj, ctx) {
    this.value = obj.value;
    this.time = obj.time;
    this.obj = obj;
    this.context = ctx;
  }
  init() {
    // 如果数据里没有涉及到下面4种参数，就直接取默认参数
    this.color = this.obj.color || this.context.color;
    this.speed = this.obj.speed || this.context.speed;
    this.opacity = this.obj.opacity || this.context.opacity;
    this.fontSize = this.obj.fontSize || this.context.fontSize;
    // 为了计算每个弹幕的宽度，我们必须创建一个元素p，然后计算文字的宽度
    let p = document.createElement("p");
    p.style.fontSize = this.fontSize + "px";
    p.innerHTML = this.value;
    document.body.appendChild(p);
    // 把p元素添加到body里了，这样就可以拿到宽度了
    // 设置弹幕的宽度
    this.width = p.clientWidth;
    // 得到了弹幕的宽度后，就把p元素从body中删掉吧
    document.body.removeChild(p);
    // 设置弹幕出现的位置
    this.x = this.context.canvas.width;
    this.y = this.context.canvas.height * Math.random();
    // 做下超出范围处理
    if (this.y < this.fontSize) {
      this.y = this.fontSize;
    } else if (this.y > this.context.canvas.height - this.fontSize) {
      this.y = this.context.canvas.height - this.fontSize;
    }
  }
  // 渲染每个弹幕
  render() {
    // 设置画布文字的字号和字体
    this.context.ctx.font = `${this.fontSize}px Arial`;
    // 设置画布文字颜色
    this.context.ctx.fillStyle = this.color;
    // 绘制文字
    this.context.ctx.fillText(this.value, this.x, this.y);
  }
}

// CanvasBarrage
class CanvasBarrage {
  constructor(canvas, video, opts = {}) {
    // 没有canvas或video直接返回
    if (!canvas || !video) return;
    // 挂载到this上
    this.video = video;
    this.canvas = canvas;
    this.canvas.width = this.video.width;
    this.canvas.height = this.video.height;
    // 获取画布 操作画布
    this.ctx = canvas.getContext("2d");
    // 设置默认参数
    let defaultOpts = {
      color: "#e91e63",
      speed: 1.5,
      opacity: 0.1,
      fontSize: 20,
      data: [],
    };
    // 合并对象并全部挂载到this上
    Object.assign(this, defaultOpts, opts);
    // 播放状态 默认暂停
    this.isPaused = true;
    // 得到所有弹幕消息
    this.barrages = this.data.map((item) => new Barrage(item, this));
    // 渲染
    this.render();
    console.log(this);
  }
  render() {
    this.clear();
    // 渲染弹幕
    this.renderBarrage();
    if (this.isPaused === false) {
      requestAnimationFrame(this.render.bind(this));
    }
  }
  // 清除画布
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  renderBarrage() {
    // 首先拿到当前视频播放的时间
    // 要根据该时间来和弹幕要展示的时间做比较，来判断是否展示弹幕
    let time = this.video.currentTime;
    // 遍历所有的弹幕，每个barrage都是Barrage的实例
    this.barrages.forEach((barrage) => {
      // 用一个flag来处理是否渲染，默认是false
      // 并且只有在视频播放时间大于等于当前弹幕的展现时间时才做处理
      if (!barrage.flag && time >= barrage.time) {
        // 判断当前弹幕是否有过初始化了
        // 如果isInit还是false，那就需要先对当前弹幕进行初始化操作
        if (!barrage.isInit) {
          barrage.init();
          barrage.isInit = true;
        }
        // 弹幕要从右向左渲染，所以x坐标减去当前弹幕的speed即可
        barrage.x -= barrage.speed;
        barrage.render(); // 渲染当前弹幕

        // 如果当前弹幕的x坐标比自身的宽度还小了，就表示结束渲染了
        if (barrage.x < -barrage.width) {
          barrage.flag = true; // 把flag设为true下次就不再渲染
        }
      }
    });
  }
  add(obj) {
    // 实际上就是往barrages数组里再添加一项Barrage的实例而已
    this.barrages.push(new Barrage(obj, this));
  }
  replay() {
    this.clear(); //先清除画布
    // 获取当前视频播放时间
    let time = this.video.currentTime;
    // 遍历barrages弹幕数组
    this.barrages.forEach((barrage) => {
      // 当前弹幕的flag设为false
      barrage.flag = false;
      // 并且，当前视频时间小于等于当前弹幕所展现的时间
      if (time <= barrage.time) {
        // 就把isInit重设为false，这样才会重新初始化渲染
        barrage.isInit = false;
      } else {
        // 其他时间对比不匹配的，flag还是true不用重新渲染
        barrage.flag = true;
      }
    });
  }
}

// CanvasBarrage实例
let canvasBarrage = new CanvasBarrage(canvas, video, { data });
let ws = new WebSocket("ws://localhost:9999");
// 监听与ws服务端的连接
ws.onopen = function () {
  // 监听ws服务端发来的消息
  ws.onmessage = function (e) {
    let msg = JSON.parse(e.data); //e.data里是真正的数据

    // 判断如果type为init就初始化弹幕的数据
    if (msg.type === "init") {
      canvasBarrage = new CanvasBarrage(canvas, video, { data: msg.data });
    } else if (msg.type === "add") {
      // 添加弹幕数据
      canvasBarrage.add(msg.data);
    }
  };
};

// 设置video的play事件来调用CanvasBarrage实例的render方法
video.addEventListener("play", () => {
  canvasBarrage.isPaused = false;
  canvasBarrage.render(); // 触发弹幕
});
video.addEventListener("pause", () => {
  // isPaused设为true表示暂停播放
  canvasBarrage.isPaused = true;
});
// 拖动进度条时触发seeked事件
video.addEventListener("seeked", () => {
  // 调用CanvasBarrage类的replay方法进行回放，重新渲染弹幕
  canvasBarrage.replay();
});

// 发送弹幕的方法
function send() {
  let value = $text.value; // 输入的内容
  let time = video.currentTime; // 当前视频时间
  let color = $color.value; // 选取的颜色值
  let fontSize = $range.value; // 选取的字号大小
  let obj = { value, time, color, fontSize };
  // 添加弹幕数据
  // canvasBarrage.add(obj);
  // 把添加的弹幕数据发给ws服务端
  // 由ws服务端拿到后添加到redis数据库中
  ws.send(JSON.stringify(obj));
  $text.value = ""; // 清空输入框
}
// 点击按钮发送弹幕
$btn.addEventListener("click", send);
// 回车发送弹幕
$text.addEventListener("keyup", (e) => {
  let key = e.keyCode;
  key === 13 && send();
});
