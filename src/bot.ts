import {Module, ModuleLoaderQueue, SlashCommandModuleLoader} from "./loader";
import {Client, Guild} from "discord.js";
import {nonNull} from "./util";

export class SuggestionsBot {
    readonly client: Client;
    readonly moduleRegistries: Map<string, ModuleRegistry>
    constructor(client: Client) {
        this.client = client;
        this.client.on('guildCreate', async g => {
            await this.loadGuild(g);
        });
    }
    async loadGuild(guild: Guild): Promise<string> {
        this.moduleRegistries.delete(guild.id);
        const moduleRegistry: ModuleRegistry = new ModuleRegistry(guild);
        let err: string;
        if((err = await moduleRegistry.load()) == null) {
            this.moduleRegistries.set(guild.id, moduleRegistry);
        }
        return err;
    }
}

class ModuleRegistry extends ModuleLoaderQueue {
    private readonly guild: Guild;

    constructor(guild: Guild) {
        super([
            new SlashCommandModuleLoader("src/command", guild)
        ]);
        this.guild = guild;
    }

    findModules<T extends Module>(): T[] {
        return this.allBy(m => nonNull(<T>m))
            .map(m => <T>m);
    }

}