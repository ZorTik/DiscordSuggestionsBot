import {SlashCommandModule} from "../../loader";
import {SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import {bot, messages} from "../../app";
import {error, nonNull, noPermission, success} from "../../util";
import {permissions} from "../../api/api";

export = <SlashCommandModule> {
    name: "suggestionssetup.finish",
    builder: new SlashCommandSubcommandBuilder()
        .setName("finish")
        .setDescription("Finishes the setup of the suggestions bot."),
    async onCommand(interaction: CommandInteraction) {
        const user = bot.database.user(interaction.user.id);
        if(!user.hasPermissionNode(permissions.SETUP)) {
            await noPermission(interaction);
            return;
        }
        if(nonNull(interaction.guild) && await bot.setup(interaction.guild!!)) {
            await success(interaction, messages.getStr("setup.finish"));
        } else {
            await error(interaction, messages.getStr("unexpected-error"));
        }
    }
};