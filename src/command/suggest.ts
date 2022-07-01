import {SlashCommandModule} from "../loader";
import {SlashCommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";

const module: SlashCommandModule = {
    name: "suggest",
    builder: new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("Creates a new suggestion."),
    onCommand(evt: CommandInteraction) {
        // TODO
    }
}
export = module;