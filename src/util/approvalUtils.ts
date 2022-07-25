import {Suggestion} from "../data";
import {MessageEmbed} from "discord.js";
import {COLOR_INFO} from "../const";
import {messages} from "../app";

function buildAlertMessage(evt: Suggestion, message: string = "Your suggestion **{}** has been {}!", ...params: string[]): MessageEmbed {
    const stateStr = `${evt.isApproved() ? "Approved" : "Declined"}`;
    let messageFormatted = message
        .replace("{}", evt.title)
        .replace("{}", stateStr);
    for(let param of params) {
        messageFormatted = messageFormatted
            .replace("{}", param);
    }
    return new MessageEmbed()
        .setTitle(`Suggestion ${stateStr}`)
        .setDescription(messageFormatted)
        .setColor(COLOR_INFO);
}

function stateStr(approved: boolean): string {
    return messages.getStr(`suggestion.state.${approved ? "approved" : "declined"}`)
        .orElse("");
}

export {
    buildAlertMessage,
    stateStr
}