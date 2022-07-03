import {EventModule} from "../../loader";
import {Interaction, Message} from "discord.js";
import {bot} from "../../app";
import {permissions} from "../../api/api";

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
                        suggestion.setApproved(approve);
                        bot.database.saveGuilds();
                    }
                }
            }
        }
    }
}