import log4js from 'log4js'
import http from 'http'
import { WebSocketServer } from 'ws'
import { AddressInfo } from 'net'
import Cilent from '../cilent'
import * as action from '../bot/actions'

/**
 * HTTP 服务初始化类
 */
export default class Server {

    private logger = log4js.getLogger('server')
    private config

    private httpService
    private static wsService = null as WebSocketServer | null

    constructor(cilent: Cilent, config: { [key: string]: any }) {
        this.logger.level = config.mciq.log
        this.logger.info('正在初始化 http 服务 ……')
        this.config = config
        if(!config.mciq.use_ws && !config.mciq.use_http) {
            cilent.join()
            return
        }
        // 初始化 HTTP 服务
        this.httpService = http.createServer(this.createHttpService)
        this.httpService.listen(config.mciq.port, config.mciq.host, () => {
            if (this.httpService) {
                let addr = this.httpService.address() as AddressInfo
                this.logger.info(`开启http服务器成功 正在监听${addr.address}:${addr.port}`)
            }
        }).on("error", (e) => {
            this.logger.error(e.message)
            this.logger.error('开启http服务器失败 进程退出')
            process.exit(1)
        })
        // 初始化 Websocket 服务
        if (config.mciq.use_ws) {
            const server = this.httpService
            Server.wsService = new WebSocketServer({ server })
            Server.wsService.on('error', () => { })
            Server.wsService.on('connection', (ws, req) => {
                // 验证授权
                if (config.access_token) {
                    if (req.url) {
                        const url = new URL('http://www.example.com/' + req.url)
                        const accessToken = url.searchParams.get('access_token')
                        if (accessToken) {
                            req.headers['authorization'] = accessToken
                        }
                    }
                    if (
                        !req.headers["authorization"] ||
                        !req.headers["authorization"].includes(config.access_token)
                    )
                        return ws.close(1002)
                }
                // 加入服务器
                if(cilent.bot == null) {
                    cilent.join()
                }
                // 事件处理
                ws.on('error', () => { })
                ws.on('close', () => {
                    const nowCilentNum = Server.wsService?.clients.size
                    if(nowCilentNum == 0) {
                        cilent.leave()
                    }
                })
                ws.on('message', async (rawData) => {
                    this.logger.debug(`收到WS消息: ` + rawData)
                    let data = JSON.parse(rawData.toString())
                    // 如果 cilent 还未完成登录并加载地图，等待
                    await new Promise((resolve) => {
                        let timer = setInterval(() => {
                            if (cilent.spawn) {
                                clearInterval(timer)
                                resolve(true)
                            }
                        }, 100)
                    })
                    try {
                        let ret
                        ret = await action.apply(cilent, data)
                        ws.send(ret)
                    } catch (e) {
                        this.logger.error((e as unknown as Error).message)
                        let error: number
                        if((e as unknown as Error).message.startsWith('404')) error = 404
                        else {
                            console.log(e)
                            error = 500
                        }
                        ws.send(
                            JSON.stringify({
                                name: cilent.bot?.username,
                                error: error,
                                echo: data.echo,
                            })
                        )
                    }
                })
                // ws.send(
                //     JSON.stringify({
                //         post_type: "meta_event",
                //         meta_event_type: "lifecycle",
                //         sub_type: "connect",
                //     })
                // )
                // ws.send(
                //     JSON.stringify({
                //         post_type: "meta_event",
                //         meta_event_type: "lifecycle",
                //         sub_type: "enable",
                //     })
                // )
            })
        }
    }

    /**
     * 向所有 ws 客户端发送
     * @param str 字符串
     */
    public static sendWs(str: string) {
        Server.wsService?.clients.forEach((cilent) => {
            cilent.send(str)
        })
    }

    // ============================================

    /**
     * 创建 HTTP 服务
     * @param req req
     * @param res res
     * @returns Promise<void>
     */
    private createHttpService(req: http.IncomingMessage, res: http.ServerResponse) {
        res.setHeader("Content-Type", "application/json; charset=utf-8")

        if (this.config.mciq.enable_cors) res.setHeader('Access-Control-Allow-Origin', '*')
        if (!this.config.mciq.use_http) return res.writeHead(404).end()
        if (req.method === "OPTIONS" && this.config.mciq.enable_cors) {
            return res.writeHead(200, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, authorization",
            }).end()
        }
        if (this.config.mciq.access_token) {
            if (!req.headers["authorization"]) {
                let params = new URLSearchParams(req.url)
                let access_token = params.get("access_token")
                if (access_token) {
                    req.headers["authorization"] = access_token
                } else {
                    return res.writeHead(401).end()
                }
            }
            if (!req.headers["authorization"].includes(this.config.mciq.access_token))
                return res.writeHead(403).end()
        }
        return this.onHttpReq(req, res)
    }

    /**
     * HTTP 服务处理逻辑
     * @param req req
     * @param res res
     */
    private async onHttpReq(req: http.IncomingMessage, res: http.ServerResponse) {
        const url = new URL(req.url as string, `http://${req.headers.host}`)
        const action = url.pathname.replace(/\//g, "")
        if (req.method === "GET") {
            this.logger.debug(`收到GET请求: ` + req.url)
            const params = url.searchParams
            try {
                // const ret = await api.apply({ action, params });
                // res.end(ret)
            } catch (e) {
                res.writeHead(404).end()
            }
        } else if (req.method === "POST") {
            let rawData: Array<any>
            req.on("data", (chunk) => rawData.push(chunk))
            req.on("end", async () => {
                try {
                    let data = Buffer.concat(rawData).toString()
                    this.logger.debug(`收到POST请求: ` + data)
                    let params, ct = req.headers["content-type"]
                    if (!ct || ct.includes("json")) params = data ? JSON.parse(data) : {}
                    else if (ct && ct.includes("x-www-form-urlencoded"))
                        params = new URLSearchParams(data)
                    else return res.writeHead(406).end()
                    // const ret = await api.apply({ action, params });
                    // return res.end(ret);
                } catch (e) {
                    return res.writeHead(400).end()
                }
            })
        } else {
            res.writeHead(405).end()
        }
    }
}