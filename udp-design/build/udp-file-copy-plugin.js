import fs from 'fs'
import path from 'path'
const dir = process.cwd()
export default function mxFileCopyPlugin(fileArr) {
  return {
    name: 'mx-file-copy-plugin',
    writeBundle() {
      fileArr.forEach(file => {
        const fromFlie = path.join(dir, file.from)
        const toFlie = path.join(dir, file.to)
        if (file.isDelete) {
          fs.access(fromFlie, fs.constants.F_OK, err => {
            if (!err) {
              fs.rename(fromFlie, toFlie, function (err) {
                if (err) throw err
              })
            }
          })
        } else {
          var readStream = fs.createReadStream(fromFlie)
          var writeStream = fs.createWriteStream(toFlie)
          readStream.pipe(writeStream)
        }
      })
    }
  }
}
