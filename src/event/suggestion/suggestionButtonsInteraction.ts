import {EventModule} from "../../loader";
import {GuildMember, Interaction, Message} from "discord.js";
import {bot} from "../../app";
import {permissions} from "../../api/api";
import {Nullable} from "../../common/util";

export = <EventModule<"interactionCreate">> {
    name: "interactionCreate",
    on(evt: Interaction): any {
        if((evt.isButton())) {
            const message = evt.message;
            if(message instanceof Message && bot.isSuggestion(message)) {
                const suggestion = bot.getSuggestion(message);
                if(suggestion != null && evt.customId.includes("state")) {
                    if(bot.database.user(evt.user.id).hasPermissionNode(permissions.APPROVE)) {
                        const approve = evt.customId.includes("accept");
                        let member: Nullable<GuildMember> = null;
                        if(evt.member instanceof GuildMember) {
                            member = evt.member;
                        }
                        suggestion.setApproved(approve, member);
                        bot.database.saveGuilds();
                    }
                }
            }
        }
    }
}