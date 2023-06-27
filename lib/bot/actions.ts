import Cilent from '../cilent'
import packageInfo from '../../package.json'
import Server from '../system/server'

export const actions = {
    get_version_info: async (cilent: Cilent, data: any): Promise<Object> => {
        return {
            app_name: 'mciq-http',
            version: packageInfo.version,
            server: {
                version: cilent.bot?._client.version
            }
        }
    },

    get_login_info: async (cilent: Cilent, data: any): Promise<Object> => {
        return {
            uin: cilent.bot?._client.uuid,
            bkn: cilent.bot?.entity.id,                 // 实体 ID
            username: cilent.bot?.username,             // 用户名
            game_mode: cilent.bot?.game.gameMode,       // 游戏模式
            health: cilent.bot?.health,                 // 血量
            food: cilent.bot?.food,                     // 饱食度
        }
    },

    get_friend_list:  async (cilent: Cilent, data: any): Promise<Object> => {
        const players = [] as {[key: string]: any}[]
        if(cilent.bot?.players) {
            Object.keys(cilent.bot?.players).forEach((name) => {
                const player = cilent.bot?.players[name]
                if(player?.uuid != cilent.bot?._client.uuid) {
                    players.push({
                        user_id: player?.uuid,
                        nickname: player?.username,
                        remark: player?.username,
                        enitity: player?.entity.id,          // 实体 ID
                        gamemode: player?.gamemode,
                        class_id: 0,
                        py_name: player?.username
                    })
                }
            })
        }
        return players
    },
    get_group_list: async (cilent: Cilent, data: any): Promise<Object> => {
        if (cilent.bot?.players) {
            const me = Object.keys(cilent.bot?.players).filter((name) => {
                const player = cilent.bot?.players[name]
                if (player?.uuid == cilent.bot?._client.uuid) {
                    return player?.uuid
                }
            })
            return [{
                group_id: '00000000-0000-0000-0000-000000000000',
                group_name: '世界消息',
                member_count: cilent.bot?.players.length,
                max_member_count: cilent.bot?.game.maxPlayers,
                owner_id: me.length == 1 ? me[0] : '',
                admin_flag: true,
                py_name: 'shijiexiaoxi'
            }] as { [key: string]: any }[]
        }
        return []
    },

    send_group_msg: async (cilent: Cilent, data: any): Promise<Object> => {
        const info = data.params
        let str = ''
        if(info.group_id == '00000000-0000-0000-0000-000000000000') {
            // 世界消息
            const body = info.message as {type: string, [key: string]: any}[]
            body.forEach((item) => {
                switch(item.type) {
                    case 'text': str += item.text
                }
            })
            cilent.bot?.chat(str)
        }
        return { time: (new Date()).valueOf(), message_id: -1, echo: data.echo }
    }
}

export async function apply(cilent: Cilent, data: any): Promise<string> {
    const fun = Reflect.get(actions, data.action as string)
    if(typeof fun == 'function') {
        if (data.echo) {
            return JSON.stringify({
                data: await fun(cilent, data),
                echo: data.echo,
            })
        } else {
            // SS: 没有 echo 的情况是给 HTTP 请求用的
            return JSON.stringify(await fun(cilent, data))
        }
    } else {
        throw new Error('404：API 不存在')
    }
}