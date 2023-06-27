import { Bot } from "mineflayer"
import * as MessagereUtil from '../utils/msg'
import log4js from 'log4js'
import { config } from ".."
import Cilent from "../cilent"
import Server from "../system/server"

const logger = log4js.getLogger('event')

export default function regEvents(bot: Bot) {
    bot.addListener('message', (jsonMsg, position) => {
        logger.level = config.getConfig().mciq.log
        logger.debug('MC 消息：' + JSON.stringify(jsonMsg) + ' > ' + jsonMsg.toString())
        const message = jsonMsg.toString()
        // 特殊判定
        if(jsonMsg.translate == 'commands.op.failed') {
            Cilent.isOp = false
        }
        let backInfo = {} as any
        switch(jsonMsg.translate) {
            case 'chat.type.text':
            case '<%s> %s': 
            case '[%s] %s': backInfo = events.playerChat(jsonMsg); break
        }
        if(Object.keys(backInfo).length > 0) Server.sendWs(JSON.stringify(backInfo))
    })
}

const events = {
    playerChat: (msg: any) => {
        if (msg.with[0].hoverEvent != undefined) {
            let avatar = config.getConfig().avatar_api
            if(avatar != undefined) avatar = avatar.replace('{name}', msg.with[0].text)
            return {
                post_type: 'message',
                message_id: -1,         // TODO
                user_id: msg.with[0].hoverEvent.contents.id,
                time: (new Date()).valueOf(),
                seq: -1,                // TODO
                // "rand": 113994513,
                message: MessagereUtil.mMsg2oMsg(msg.with),
                raw_message: msg.toString(),
                message_type: 'group',
                sender: {
                    user_id: msg.with[0].hoverEvent.contents.id,
                    nickname: msg.with[0].text,
                    card: msg.with[0].text,
                    avatar: avatar
                },
                group_id: '00000000-0000-0000-0000-000000000000',
                group_name: '世界消息',
                sub_type: 'normal'
            }
        } else {
            return {
                post_type: 'message',
                message_id: -1,         // TODO
                user_id: '11111111-1111-1111-1111-111111111111',
                time: (new Date()).valueOf(),
                seq: -1,                // TODO
                // "rand": 113994513,
                message: MessagereUtil.mMsg2oMsg(msg.with), 
                raw_message: msg.toString(),
                message_type: 'group',
                sender: {
                    user_id: '11111111-1111-1111-1111-111111111111',
                    nickname: msg.with[0].text,
                    card: msg.with[0].text
                },
                group_id: '00000000-0000-0000-0000-000000000000',
                group_name: '世界消息',
                sub_type: 'normal'
            }
        }
    }
}