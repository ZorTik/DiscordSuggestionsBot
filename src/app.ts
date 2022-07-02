import {Client, Intents} from "discord.js";
import {SuggestionsBot} from "./bot";
import {REST} from "@discordjs/rest";
import {YamlConfiguration} from "./common";

const config = new YamlConfiguration("config.yml");
const messages = new YamlConfiguration("messages.yml");
const token = config.getStr("token").ifNotPresent(() => {
    console.error("Missing token in config.yml!");
    process.exit(1);
}).orElse("");
const client = new Client({intents: [Intents.FLAGS.GUILDS]});
const rest = new REST({version: "9"});
rest.setToken(token);
const bot = new SuggestionsBot(client);
client.login(token).then(() => {
    client.guilds.cache.forEach(async g => {
        const guild = await client.guilds.fetch(g.id);
        await bot.load(guild);
    });
});
export {client, bot, rest, config, messages};