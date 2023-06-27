import Cilent from "./cilent"
import Config from "./system/config"
import Server from "./system/server"

// 获取设置参数
let configFile = process.argv[0].substring(0, process.argv[0].indexOf('node_modules')) + 'config.json'
process.argv.forEach((str) => {
    if(str.startsWith('--config=')) {
        configFile = str.split('=')[1]
    }
})
export const config = new Config(configFile)
// // 验证必要设置项
// const list = ['address', 'username']
// list.forEach((name) => {
//     if(!config.get(name)) {
//         console.log('缺失以下某个或某些设置项，请检查设置文件：\n\t')
//         console.log(list)
//         return
//     }
// })

// 构建 Mineflayer Bot
const cilent = new Cilent(config)

// 初始化 HTTP 服务
const server = new Server(cilent, config.getConfig())
