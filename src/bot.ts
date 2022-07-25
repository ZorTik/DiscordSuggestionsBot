import {
    EventModuleLoader,
    Module,
    ModuleLoaderQueue,
    SlashCommandModuleLoader,
    SuggestionEvent,
    SuggestionEventModuleLoader
} from "./loader";
import {Client, Guild, GuildMember, Message, MessageEmbed, TextChannel} from "discord.js";
import {BgFlux, guildId, GuildIdentity, GuildMessageReference, MayUndefined, nonNull, Nullable} from "./util";
import {GuildDatabase, Suggestion, SuggestionData, SuggestionsGuild} from "./data";
import * as fs from "fs";
import {EventEmitter} from "./common";
import {COLOR_INFO} from "./const";
import {client, messages} from "./app";

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

    /**
     * Performs initial setup or modifies existing setup data.
     * If null is set as guild setup consumer, an existing
     * setup is get and validated.
     *
     * @param guild The guild to setup.
     * @param cons The consumer to use for setup.
     *
     * @returns Current action success state.
     */
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
        if(setup.suggestionsChannelId != null
        && setup.logChannelId != null) {
            this.database.guilds.push(new SuggestionsGuild({
                id: guildId(guild),
                suggestionsChannelId: setup.suggestionsChannelId,
                logChannelId: setup.logChannelId,
                suggestions: []
            }));
            this.database.saveGuilds();
            return true;
        }
        return false;
    }

    /**
     * Loads all modules for the given guild and performs
     * some initial tasks.
     *
     * @param guild The guild to load modules for.
     *
     * @returns Promise of error or promise containing null if no error occurred.
     */
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

    /**
     * Constructs new task flux that tries to create new suggestion
     * based on provided requirements. Task queue contains task for
     * suggestion message creation.
     *
     * @param guild The guild to create suggestion for.
     * @param requirements The requirements to create suggestion.
     *
     * @returns Task flux that creates new suggestion.
     */
    suggest(guild: Guild, requirements: SuggestionRequirements): BgFlux<Suggestion> {
        if(!this.isReady(guild)) return new BgFlux<Suggestion>(() => null);
        const guildData = this.database.guild(guild)!!;
        const data: SuggestionData = {
            guildId: guild.id,
            messageId: "",
            title: requirements.title,
            description: requirements.description,
            authorId: requirements.author.id,
            other: {}
        };
        const flux = new BgFlux(() => {
            if(data.messageId.length == 0) return null;
            const suggestion = new Suggestion(data);
            this.database.guild(guild)?.suggestions.push(suggestion);
            this.database.saveGuilds();
            this.emit('suggestionCreate', suggestion);
            return suggestion;
        });
        flux.tasks.push(async () => {
            const channel = await guild.channels.fetch(guildData.suggestionsChannelId);
            if(channel != null && channel instanceof TextChannel) {
                const message = await channel.send({
                    embeds: [
                        await this.constructSuggestionEmbed(data)
                    ]
                });
                data.messageId = message.id;
            }
            return null;
        });
        return flux;
    }

    /**
     * Constructs embed for suggestion based on provided data.
     *
     * @param data The data to construct embed from.
     *
     * @returns Promise of embed.
     */
    async constructSuggestionEmbed(data: Suggestion | SuggestionData): Promise<MessageEmbed> {
        const author = await client.users.fetch(data.authorId);
        const authorUsername = nonNull(author) ? author.username : "Unknown";
        return new MessageEmbed()
            .setColor(COLOR_INFO)
            .setTitle(data.title)
            .setDescription(`\`\`\`${data.description}\`\`\`\n${messages.getStr("suggestion.footer").orElse("")
                .replace("{}", authorUsername)}`)
            .setFooter({
                text: "Waiting for Approval"
            });
    }

    /**
     * Tries to find module registry based on guild.
     *
     * @param guild The guild to find module registry for.
     *
     * @returns Module registry or undefined if not found.
     */
    modules(guild: GuildIdentity): MayUndefined<ModuleRegistry> {
        let guildId = (typeof guild === 'string') ? guild : guild.id;
        return this.moduleRegistries.find(r => r.guild.id === guildId);
    }

    /**
     * Check if given guild is ready for use. A.k.a. if given guild
     * has completed setup.
     *
     * @param guild The guild to check.
     *
     * @returns True if guild is ready, false otherwise.
     */
    isReady(guild: GuildIdentity): boolean {
        let data: MayUndefined<SuggestionsGuild>;
        return (data = this.database.guild(guild)) != null
            && data.suggestionsChannelId != null
            && data.logChannelId != null;
    }

    /**
     * Checks if given message/reference belongs to a suggestion.
     *
     * @param data The data to check.
     *
     * @returns True if belongs to a suggestion, false otherwise.
     */
    isSuggestion(data: Message | GuildMessageReference): boolean {
        return nonNull(this.getSuggestion(data));
    }

    /**
     * Gets suggestion based on message/reference.
     *
     * @param data The data to get suggestion for.
     *
     * @returns Suggestion or undefined if not found.
     */
    getSuggestion(data: Message | GuildMessageReference): MayUndefined<Suggestion> {
        const guild = this.database.guild(data.guildId || "");
        if(nonNull(guild)) {
            return guild!!.suggestions.find(s => s.messageId === (data instanceof Message
            ? data.id : data.messageId));
        }
        return undefined;
    }

    /**
     * Fetches configured log channel based on specific guild.
     *
     * @param g Guild to fetch log channel from.
     *
     * @returns Promise of text channel or promise of null/undefined type
     * if something went wrong.
     */
    async fetchLogChannel(g: Guild): Promise<Nullable<TextChannel>> {
        let guild = this.database.guild(g);
        if(nonNull(guild?.logChannelId)) {
            return <TextChannel>(await g.channels.fetch(guild!.logChannelId));
        }
        return null;
    }

}

type SuggestionsGuildSetup = {
    guildId: string;
    suggestionsChannelId?: string;
    logChannelId?: string;
}

class ModuleRegistry extends ModuleLoaderQueue {
    readonly guild: Guild;

    constructor(guild: Guild, bot: SuggestionsBot) {
        super([
            new SlashCommandModuleLoader("src/command", guild),
            new EventModuleLoader("src/event", guild.client),
            new SuggestionEventModuleLoader("src/suggestion-event", bot)
        ]);
        this.guild = guild;
    }

    /**
     * Performs search for modules based on given generic
     * type and optional predicate.
     *
     * @param pred The predicate to use for search.
     *
     * @returns List of modules that match.
     */
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