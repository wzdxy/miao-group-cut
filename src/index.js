const { remote } = require('electron')
const fs = require('fs')
const path = require('path')
const { info, convert } = require('easyimage')
const Vue = require('vue/dist/vue.common.dev')
// 临时文件目录
const appData = remote.app.getPath('userData')
const tempPath = path.resolve(appData, 'temp')
if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath)
}

window.vm = new Vue({
  el: '#app',
  data: {
    msg: 'aa',
    rawPath: path.resolve(tempPath, 'raw'),
    viewPath: path.resolve(tempPath, 'view'),
    outputPath: path.resolve(tempPath, 'output'),
    rawPicList: [],// 原始图片(tif格式)
    viewPicList:[
      {"density":{"x":300,"y":300},"depth":8,"frames":1,"height":241,"name":"1.jpg","orientation":"Undefined","path":"C:\\Users\\zchi\\AppData\\Roaming\\miao-group-cut\\temp\\view\\2.jpg","size":57554,"type":"jpeg","width":300}
    ],// 展示用的(jpg)
    outputPicList: [],// 处理后的图片
    dragging: false,
    resizing: false,
    cutBox: {
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    }
  },
  methods: {
    async inputChange(e) {
      console.log(e.target.files)
      if (!fs.existsSync(this.rawPath)) {
        fs.mkdirSync(this.rawPath)
      }
      this.$set(this, 'rawPicList', [])
      this.$set(this, 'viewPicList', [])
      Array.from(e.target.files).forEach(async file => {
        // 复制到用户目录下操作 安全第一
        copyFile(file.path, path.resolve(this.rawPath, file.name))
        const imageInfo = await info(path.resolve(this.rawPath, file.name))
        const imgViewPath = path.resolve(this.viewPath, file.name.split('.')[0] + '.jpg')
        // 转换成 jpg 图片
        await convert({src: imageInfo.path, dst: imgViewPath})
        this.rawPicList.push(imageInfo)
        this.viewPicList.push(await info(imgViewPath))
      })
      console.log(this.rawPicList, this.viewPicList)
    },
    dragCutBox(item, idx, e) {
      if (this.dragging) {
        e.preventDefault()
        const parent = this.$refs.picItem[idx]
        this.cutBox.x = e.pageX - parent.offsetLeft - this.cutBox.w/2
        this.cutBox.y = e.pageY - parent.offsetTop - this.cutBox.h/2
        console.log(this.cutBox.x, this.cutBox.y)
      } else if (this.resizing) {
        e.preventDefault()
        console.log(e)
      }
    },
    stopDrag() {
      this.dragging = false
      window.removeEventListener('mouseup', this.stopDrag)
      console.log('结束拖拽')
    },
    stopResizing() {
      this.resizing = false
      window.removeEventListener('mouseup', this.stopResizing)
      console.log('结束调整位置')
    },
    startDrag() {
      window.addEventListener('mouseup', this.stopDrag)
      this.dragging = true
      console.log('开始拖拽')
    },
    startResize(position, e) {
      e.stopPropagation()
      window.addEventListener('mouseup', this.stopResizing)
      this.resizing = true
      console.log('开始调整', position)
    }
  },
  mounted() {
    console.log(tempPath)
    console.log(this.rawPath)
    console.log(this.viewPath)
    console.log(this.outputPath)
  }
})

function copyFile(src, dist) {
  fs.writeFileSync(dist, fs.readFileSync(src));
}