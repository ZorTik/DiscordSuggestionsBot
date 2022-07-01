import {EventModuleLoader, Module, ModuleLoaderQueue, SlashCommandModuleLoader, SuggestionEvent} from "./loader";
import {Client, Guild} from "discord.js";
import {Evt, MayUndefined, nonNull} from "./util";
import {GuildDatabase} from "./data";
import * as fs from "fs";
import { EventEmitter } from "zortik-common-libs";

class SuggestionsBot extends EventEmitter<SuggestionEvent> {
    readonly client: Client;
    readonly moduleRegistries: ModuleRegistry[];
    readonly database: GuildDatabase;
    constructor(client: Client, dataFile: string = 'data.json') {
        super();
        this.client = client;
        this.client.on('guildCreate', async g => {
            await this.load(g);
        });
        if(!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '{}');
        this.database = new GuildDatabase(dataFile);
    }
    async load(guild: Guild): Promise<string> {
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
        } else {
            const guilds = this.database.guilds;
            const guildIndex = guilds.findIndex(g => g.id === guild.id);
            if(guildIndex > -1) {
                guilds.splice(guildIndex, 1);
            }
        }
        return err;
    }
    modules(guild: Guild | string): MayUndefined<ModuleRegistry> {
        let guildId = (typeof guild === 'string') ? guild : guild.id;
        return this.moduleRegistries.find(r => r.guild.id === guildId);
    }
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

export {SuggestionsBot};