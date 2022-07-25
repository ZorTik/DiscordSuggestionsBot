import {SlashCommandModule} from "../../loader";
import {CommandInteraction} from "discord.js";
import {SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {bot, messages} from "../../app";
import {error, nonNull, noPermission, success} from "../../util";
import {permissions} from "../../api/api";

export = <SlashCommandModule> {
    name: "suggestionssetup.setlogschannel",
    builder: new SlashCommandSubcommandBuilder()
        .setName("setlogschannel")
        .setDescription("Sets the channel for logs."),
    async onCommand(interaction: CommandInteraction) {
        const user = bot.database.user(interaction.user.id);
        if(!user.hasPermissionNode(permissions.SETUP)) {
            await noPermission(interaction);
            return;
        }
        if(!nonNull(interaction.channel) || !interaction.channel!!.isText()) {
            await error(interaction, messages.getStr("not-text-channel"));
            return;
        }
        if(nonNull(interaction.guild) && await bot.setup(interaction.guild!!, s => s.logChannelId = interaction.channel!!.id)) {
            await success(interaction, messages.getStr("setup.logs-channel-set"));
        } else {
            await error(interaction, messages.getStr("unexpected-error"));
        }
    }
};