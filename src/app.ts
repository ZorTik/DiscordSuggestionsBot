import {YamlConfiguration} from "zortik-common-libs/src/configuration";
import {Client, Intents} from "discord.js";
import {SuggestionsBot} from "./bot";
import {REST} from "@discordjs/rest";

const config = new YamlConfiguration("config.yml");
const token = config.getStr("token").ifNotPresent(() => {
    console.error("Missing token in config.yml!");
    process.exit(1);
}).orElse("");
const client = new Client({intents: [Intents.FLAGS.GUILDS]});
const rest = new REST({version: "9"});
rest.setToken(token);
const bot = new SuggestionsBot(client);
client.login(token).then(() => {
    client.guilds.cache.forEach(g => bot.loadGuild(g));
});
export {client, bot, rest};