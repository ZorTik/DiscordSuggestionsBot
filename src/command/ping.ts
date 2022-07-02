import {SlashCommandModule} from "../loader";
import {SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";

export = <SlashCommandModule> {
    name: "suggestionsbot.ping",
    builder: new SlashCommandSubcommandBuilder()
        .setName("ping")
        .setDescription("Responses with pong message if running!"),
    async onCommand(interaction: CommandInteraction) {
        await interaction.reply({
            content: "Pong!",
            ephemeral: true
        });
    }
}