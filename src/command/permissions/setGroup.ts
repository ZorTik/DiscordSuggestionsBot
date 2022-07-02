import {SlashCommandModule} from "../../loader";
import {SlashCommandStringOption, SlashCommandSubcommandBuilder, SlashCommandUserOption} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import {PermissionGroup} from "../../common/permissions";
import {bot, messages} from "../../app";
import {error, success} from "../../util";
import {getGroups} from "../../api/api";

export = <SlashCommandModule> {
    name: "suggestionsbot.setgroup",
    builder: new SlashCommandSubcommandBuilder()
        .setName("setgroup")
        .setDescription("Sets a user's group.")
        .addUserOption(new SlashCommandUserOption()
            .setName("user")
            .setRequired(true))
        .addStringOption(new SlashCommandStringOption()
            .setName("group")
            .addChoices(...getGroups()
                .map((g: PermissionGroup) => {
                    return {
                        name: g.name,
                        value: g.id
                    }
                }))
            .setRequired(false)),
    async onCommand(evt: CommandInteraction) {
        const user = evt.options.getUser("user")!!;
        const suggestionsUser = bot.database.user(user.id);
        const groupId = evt.options.getString("group");
        if(groupId == null) {
            suggestionsUser.permissions = {
                nodes: []
            };
            bot.database.saveUsers();
            await success(evt, messages.getStr("permissions-removed").orElse("")
                .replace("{}", user.username));
        } else {
            const group = getGroups().find(g => g.id === groupId);
            if(group == null) {
                await error(evt, messages.getStr("group-not-found").orElse(""));
                return;
            }
            suggestionsUser.permissions = group;
            bot.database.saveUsers();
            await success(evt, messages.getStr("permissions-set").orElse("")
                .replace("{}", user.toString())
                .replace("{}", group.name));
        }
    }
}