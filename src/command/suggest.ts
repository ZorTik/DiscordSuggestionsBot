import {SlashCommandModule} from "../loader";
import {SlashCommandBuilder, SlashCommandStringOption} from "@discordjs/builders";
import {CommandInteraction, GuildMember} from "discord.js";
import {bot, messages} from "../app";
import {error, success} from "../util";

export = <SlashCommandModule> {
    name: "suggest",
    builder: new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("Creates a new suggestion.")
        .addStringOption(new SlashCommandStringOption()
            .setName("title")
            .setDescription("The title of the suggestion.")
            .setRequired(true))
        .addStringOption(new SlashCommandStringOption()
            .setName("content")
            .setDescription("The content of the suggestion.")
            .setRequired(true)),
    async onCommand(evt: CommandInteraction) {
        if(evt.guild != null && evt.member instanceof GuildMember) {
            const guild = evt.guild;
            const title = evt.options.getString("title")!!;
            const content = evt.options.getString("content")!!;
            const suggestion = await bot.suggest(guild, {
                title: title,
                description: content,
                author: evt.member
            }).execute();
            if(suggestion != null) {
                await success(evt, messages.getStr("suggestion-created").orElse(""));
            } else {
                await error(evt, messages.getStr("unexpected-error"));
            }
        }
    }
};