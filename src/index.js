const { remote } = require('electron')
const fs = require('fs')
const path = require('path')
const shell = require('electron').shell
const { info, convert, crop } = require('easyimage')
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
      // {"density":{"x":300,"y":300},"depth":8,"frames":1,"height":241,"name":"1.jpg","orientation":"Undefined","path":"C:\\Users\\zchi\\AppData\\Roaming\\miao-group-cut\\temp\\view\\2.jpg","size":57554,"type":"jpeg","width":300}
    ],// 展示用的(jpg)
    outputPicList: [],// 处理后的图片
    dragging: false,
    resizing: false,
    resizingPosition: 1,
    resizeStart: {
      x: 0,
      y: 0
    },
    cutBox: {
      x: 0,
      y: 0,
      w: 200,
      h: 100,
    }
  },
  methods: {
    /**
     * 打开多个文件
     * @param {*} e 事件对象
     */
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
        // console.log(this.cutBox.x, this.cutBox.y)
      } else if (this.resizing) {
        e.preventDefault()
        const changeX = e.x - this.resizeStart.x
        const changeY = e.y - this.resizeStart.y
        switch(this.resizingPosition) {
          case 1: {
            this.cutBox.x += changeX
            this.cutBox.y += changeY
            this.cutBox.w -= changeX
            this.cutBox.h -= changeY
            break
          }
          case 2: {
            this.cutBox.y += changeY
            this.cutBox.w += changeX
            this.cutBox.h -= changeY
            break
          }
          case 3: {
            this.cutBox.w = this.cutBox.w + changeX
            this.cutBox.h = this.cutBox.h + changeY
            break
          }
          case 4: {
            this.cutBox.x += changeX
            this.cutBox.w -= changeX
            this.cutBox.h += changeY
          }
        }
        this.resizeStart.x = e.x
        this.resizeStart.y = e.y
      }
    },
    /**
     * 拖拽裁切框结束
     */
    stopDrag() {
      this.dragging = false
      window.removeEventListener('mouseup', this.stopDrag)
      console.log('结束拖拽')
    },
    /**
     * 调整锚点结束
     */
    stopResizing() {
      this.resizing = false
      window.removeEventListener('mouseup', this.stopResizing)
      console.log('结束调整位置')
    },
    /**
     * 开始拖拽裁切框位置
     */
    startDrag() {
      window.addEventListener('mouseup', this.stopDrag)
      this.dragging = true
      console.log('开始拖拽')
    },
    /**
     * 开始拖拽锚点时
     * @param {*} position 锚点的位置 1左上 2右上 3右下 4左下
     * @param {*} e 事件对象
     */
    startResize(position, e) {
      e.stopPropagation()
      window.addEventListener('mouseup', this.stopResizing)
      this.resizing = true
      this.resizingPosition = position
      this.resizeStart.x = e.x
      this.resizeStart.y = e.y
      console.log('开始调整', e.x, e.y)
    },
    /**
     * 根据框选的范围裁切
     */
    cutByBox() {
      if(!fs.existsSync(this.outputPath)) fs.mkdirSync(this.outputPath)
      this.rawPicList.forEach((item, idx) => {
        let imageOutPath = path.resolve(this.outputPath, item.name)
        let resizeRatio = this.$refs.picItem[idx].offsetWidth / item.width // 和真实显示的缩放比例
        crop({
          x: this.cutBox.x / resizeRatio,
          y: this.cutBox.y / resizeRatio,
          cropheight: this.cutBox.h / resizeRatio,
          cropwidth: this.cutBox.w / resizeRatio,
          src: item.path,
          dst: imageOutPath
        }).then(() => {
          if (idx === this.rawPicList.length - 1) {
            shell.showItemInFolder(imageOutPath)
          }
        })

      })
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