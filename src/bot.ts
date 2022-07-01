import {EventModuleLoader, Module, ModuleLoaderQueue, SlashCommandModuleLoader, SuggestionEvent} from "./loader";
import {Client, Guild, TextChannel} from "discord.js";
import {BgFlux, Evt, guildId, GuildIdentity, MayUndefined, nonNull} from "./util";
import {GuildDatabase, Suggestion, SuggestionData, SuggestionsGuild} from "./data";
import * as fs from "fs";
import { EventEmitter } from "zortik-common-libs";

class SuggestionsBot extends EventEmitter<SuggestionEvent> {
    readonly client: Client;
    readonly moduleRegistries: ModuleRegistry[];
    readonly database: GuildDatabase;
    readonly setups: SuggestionsGuildSetup[] = [];
    constructor(client: Client, dataFile: string = 'data.json') {
        super();
        this.client = client;
        this.client.on('guildCreate', async g => {
            await this.load(g);
        });
        if(!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '{}');
        this.database = new GuildDatabase(dataFile);
    }
    async setup(guild: GuildIdentity, cons: ((SuggestionsGuildSetup) => void) | null = null): Promise<boolean> {
        if(this.isReady(guild)) return true;
        let setup = this.setups.find(s => s.guildId === guildId(guild));
        if(!nonNull(setup)) {
            this.setups.push(setup = {
                guildId: guildId(guild)
            });
        }
        if(cons != null) {
            cons(setup);
            return true;
        }
        if(!Object.getOwnPropertyNames(setup).some(key => setup[key] == null)) {
            this.database.guilds.push(new SuggestionsGuild({
                id: guildId(guild),
                suggestionsChannelId: setup.suggestionsChannelId,
                suggestions: []
            }));
            return this.database.save();
        }
        return false;
    }
    private async load(guild: Guild): Promise<string> {
        let prevIndex = this.moduleRegistries.findIndex(r => r.guild.id === guild.id);
        if(prevIndex > -1) {
            this.moduleRegistries.slice(prevIndex, 1);
        }
        this.database.load(guild.id);
        const moduleRegistry: ModuleRegistry = new ModuleRegistry(guild);
        let err: string;
        if((err = await moduleRegistry.load()) == null) {
            this.moduleRegistries.push(moduleRegistry);
            console.log(`Loaded modules for ${guild.name}!`);
            if(!this.isReady(guild)) {
                console.warn(`Guild ${guild.name} is not ready! Please setup it with /suggestionssetup.`);
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
            description: requirements.description
        };
        const flux = new BgFlux(() => {
            if(data.messageId.length == 0) return null;
            const suggestion = new Suggestion(data);
            this.database.guild(guild).suggestions.push(suggestion);
            if(this.database.save()) {
                this.emit('suggestionCreate', suggestion);
                return suggestion;
            }
            return null;
        });
        flux.tasks.push(async () => {
            const channel = await guild.channels.fetch(guildData.suggestionsChannelId);
            if(channel != null && channel instanceof TextChannel) {
                const message = await channel.send(""/* TODO: Form message. */);
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

    constructor(guild: Guild) {
        super([
            new SlashCommandModuleLoader("src/command", guild),
            new EventModuleLoader("src/event", guild.client)
        ]);
        this.guild = guild;
    }

    findModules<T extends Module>(): T[] {
        return this.allBy(m => nonNull(<T>m))
            .map(m => <T>m);
    }

}

type SuggestionRequirements = {
    title: string;
    description: string;
}

export {SuggestionsBot};