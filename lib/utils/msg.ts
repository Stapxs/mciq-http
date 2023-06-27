/**
 * 将 MC 消息体转换为 OneBot（oicq2）消息体
 * @param msg MC 消息体
 */
export function mMsg2oMsg(msgBody: {[key: string]: any}[]) {
    // PS：消息体的第一个是发送者信息，跳过
    const back = [] as {[key: string]: any}[]
    for(let i=1; i<msgBody.length; i++) {
        const item = msgBody[i]
        if(item.text != undefined) {
            back.push({
                type: 'text',
                text: item.text
            })
        }
    }
    return back
}