import {
    EventModuleLoader,
    Module,
    ModuleLoaderQueue,
    SlashCommandModuleLoader,
    SuggestionEvent,
    SuggestionEventModuleLoader
} from "./loader";
import {Client, Guild, GuildMember, MessageEmbed, TextChannel} from "discord.js";
import {BgFlux, Evt, guildId, GuildIdentity, MayUndefined, nonNull, Nullable} from "./util";
import {GuildDatabase, Suggestion, SuggestionData, SuggestionsGuild} from "./data";
import * as fs from "fs";
import {EventEmitter} from "./common";
import {COLOR_INFO} from "./const";
import {messages} from "./app";

class SuggestionsBot extends EventEmitter<SuggestionEvent> {
    readonly client: Client;
    readonly moduleRegistries: ModuleRegistry[];
    readonly database: GuildDatabase;
    readonly setups: SuggestionsGuildSetup[] = [];
    constructor(client: Client, dataFile: string = 'data.json') {
        super();
        this.client = client;
        this.moduleRegistries = [];
        this.client.on('guildCreate', async g => {
            const cached = client.guilds.cache.find(g => g.id === guildId(g));
            await this.load(nonNull(cached) ? cached!! : g);
        });
        if(!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '{}');
        this.database = new GuildDatabase(dataFile);
        this.database.load();
    }
    async setup(guild: GuildIdentity, cons: ((setup: SuggestionsGuildSetup) => void) | null = null): Promise<boolean> {
        if(this.isReady(guild)) return true;
        let setup = this.setups.find(s => s.guildId === guildId(guild));
        if(setup == null) {
            this.setups.push(setup = {
                guildId: guildId(guild)
            });
        }
        if(cons != null) {
            cons(setup);
            return true;
        }
        if(setup.suggestionsChannelId != null) {
            this.database.guilds.push(new SuggestionsGuild({
                id: guildId(guild),
                suggestionsChannelId: setup.suggestionsChannelId,
                suggestions: []
            }));
            this.database.saveGuilds();
            return true;
        }
        return false;
    }
    async load(guild: Guild): Promise<Nullable<string>> {
        const preview = await guild.fetchPreview();
        let prevIndex = this.moduleRegistries.findIndex(r => r.guild.id === guild.id);
        if(prevIndex > -1) {
            this.moduleRegistries.slice(prevIndex, 1);
        }
        const moduleRegistry: ModuleRegistry = new ModuleRegistry(guild, this);
        let err: Nullable<string>;
        if((err = await moduleRegistry.load()) == null) {
            this.moduleRegistries.push(moduleRegistry);
            console.log(`Loaded modules for ${preview.name}!`);
            if(this.isReady(guild)) {
                this.emit('guildLoad', guild);
            } else {
                console.warn(`Guild ${preview.name} is not ready! Please setup it with /suggestionssetup.`);
            }
        } else {
            const guilds = this.database.guilds;
            const guildIndex = guilds.findIndex(g => g.id === guild.id);
            if(guildIndex > -1) {
                guilds.splice(guildIndex, 1);
            }
        }
        return err;
    }
    suggest(guild: Guild, requirements: SuggestionRequirements): BgFlux<Suggestion> {
        if(!this.isReady(guild)) return new BgFlux<Suggestion>(() => null);
        const guildData = this.database.guild(guild)!!;
        const data: SuggestionData = {
            messageId: "",
            title: requirements.title,
            description: requirements.description,
            authorId: requirements.author.id,
        };
        const flux = new BgFlux(() => {
            if(data.messageId.length == 0) return null;
            const suggestion = new Suggestion(data);
            this.database.guild(guild)?.suggestions.push(suggestion);
            this.database.saveGuilds()
            this.emit('suggestionCreate', suggestion);
            return suggestion;
        });
        flux.tasks.push(async () => {
            const channel = await guild.channels.fetch(guildData.suggestionsChannelId);
            if(channel != null && channel instanceof TextChannel) {
                const message = await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setColor(COLOR_INFO)
                            .setTitle(data.title)
                            .setDescription(messages.getStr("suggestion.description").orElse("")
                                .replace("{}", requirements.author.user.username))
                            .setFields([
                                {
                                    name: messages.getStr('suggestion.content').orElse("New Suggestion"),
                                    value: "```" + data.description + "```",
                                    inline: true
                                }
                            ])
                    ]
                });
                data.messageId = message.id;
            }
            return null;
        });
        return flux;
    }
    modules(guild: GuildIdentity): MayUndefined<ModuleRegistry> {
        let guildId = (typeof guild === 'string') ? guild : guild.id;
        return this.moduleRegistries.find(r => r.guild.id === guildId);
    }
    isReady(guild: GuildIdentity) {
        return this.database.guild(guild) != null;
    }
}

type SuggestionsGuildSetup = {
    guildId: string;
    suggestionsChannelId?: string;
}

class ModuleRegistry extends ModuleLoaderQueue {
    readonly guild: Guild;

    constructor(guild: Guild, bot: SuggestionsBot) {
        super([
            new SlashCommandModuleLoader("src/command", guild),
            new EventModuleLoader("src/event", guild.client),
            new SuggestionEventModuleLoader("src/event", bot)
        ]);
        this.guild = guild;
    }

    findModules<T extends Module>(pred: (m: T) => boolean = () => true): T[] {
        return this.allBy(m => nonNull(<T>m) && pred(<T>m))
            .map(m => <T>m);
    }

}

type SuggestionRequirements = {
    title: string;
    description: string;
    author: GuildMember;
}

export {SuggestionsBot, SuggestionsGuildSetup};