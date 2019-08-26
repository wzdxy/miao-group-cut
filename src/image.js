const { info, convert } = require('easyimage')
export default {
  async tif2jpg (src, dest) {
    return await convert({
      src: src
    })
  }
}