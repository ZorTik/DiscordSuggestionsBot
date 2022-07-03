import * as fs from "fs";
import {ErrorAwareQueue, Evt, Named, nonNull, Nullable} from "./util";
import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {Client, ClientEvents, CommandInteraction, Guild} from "discord.js";
import {REST} from "@discordjs/rest";
import {client, rest} from "./app";
import {Routes} from "discord-api-types/v9";
import {SuggestionsBot} from "./bot";
import {Registry} from "./common";

class FileTreeModuleLoader<T extends Module> implements ModuleLoader<T> {
    private readonly path: string;
    private readonly childModules: T[];
    constructor(path: string) {
        this.path = path;
        this.childModules = [];
    }
    async load(): Promise<Nullable<string>> {
        this.childModules.splice(0, this.childModules.length);
        let modules: T[] = [];
        try {
            modules = await this.loadAtPath(this.path);
        } catch(ex) {
            if(typeof ex === "string") {
                return ex;
            }
        }
        this.childModules.push(...modules);
        return null;
    }
    getChildModules(): T[] {
        return this.childModules;
    }
    private async loadAtPath(path: string): Promise<T[]> {
        const stat = fs.statSync(path);
        const res: T[] = [];
        if(stat.isDirectory()) {
            for(let fileName of fs.readdirSync(path)) {
                const modules = await this.loadAtPath(path + "/" + fileName);
                modules.forEach(m => res.push(m));
            }
        } else {
            try {
                let module = <T>(await import(FileTreeModuleLoader.removeExtension(path)
                    .replace("src/", "./")));
                if(module != null) {
                    res.push(module);
                }
            } catch(err) {
                console.error(err);
                console.log("Path of error: " + path);
            }
        }
        return res;
    }
    private static removeExtension(path: string): string {
        return path.includes(".") ? path.substring(0, path.lastIndexOf(".")) : path;
    }
}

class SlashCommandModuleLoader extends FileTreeModuleLoader<SlashCommandModule> {
    private readonly guild: Guild;
    private readonly rest: REST;
    constructor(path: string, client: Guild, rest_: REST = rest) {
        super(path);
        this.guild = client;
        this.rest = rest_;
    }

    async load(): Promise<Nullable<string>> {
        const loadErr = await super.load();
        if(loadErr != null) {
            return loadErr;
        }
        let validModules = this.getChildModules().filter(SlashCommandModuleLoader.isValid);
        if(validModules.length > 0) {
            // Load command builders.
            const mainCommandBuilders = new Map(validModules
                .filter(module => nonNull(<SlashCommandBuilder>module.builder))
                .map(module => [module.name, module.builder]));
            validModules.filter(module => module.builder instanceof SlashCommandSubcommandBuilder && module.name.includes("."))
                .forEach(module => {
                    const mainCommandName = module.name.split(".")[0];
                    let mainCommandBuilder = mainCommandBuilders.get(mainCommandName) || new SlashCommandBuilder()
                        .setName(mainCommandName)
                        .setDescription("A suggestions bot command.");
                    if(mainCommandBuilder instanceof SlashCommandBuilder) {
                        mainCommandBuilders.set(mainCommandName, mainCommandBuilder
                            .addSubcommand(<SlashCommandSubcommandBuilder>module.builder));
                    }
                });
            // Push commands to the API.
            await rest.put(Routes.applicationGuildCommands(client.application!!.id, this.guild.id), {
                body: Array.from(mainCommandBuilders.values()).map(builder => builder.toJSON())
            }).catch(ex => console.error(ex));
        }
        return loadErr;
    }
    private static isValid(module: SlashCommandModule): boolean {
        return (module.builder instanceof SlashCommandSubcommandBuilder && module.name.includes("."))
        || (module.builder instanceof SlashCommandBuilder && module.name.length > 0);
    }
}

class EventModuleLoader extends FileTreeModuleLoader<EventModule> {
    private client: Client;
    constructor(path: string, client: Client) {
        super(path);
        this.client = client;
    }
    async load(): Promise<Nullable<string>> {
        const loadErr = await super.load();
        if(loadErr != null) {
            return loadErr;
        }
        const eventModules = this.getChildModules();
        for(let module of eventModules) {
            try {
                const res = client.on(module.name, module.on);
                if(res instanceof Promise) {
                    await res;
                }
            } catch(ex) {
                console.error(ex);
            }
        }
        return null;
    }
}

class SuggestionEventModuleLoader extends FileTreeModuleLoader<SuggestionEventModule> {
    private bot: SuggestionsBot;
    constructor(path: string, bot: SuggestionsBot) {
        super(path);
        this.bot = bot;
    }
    async load(): Promise<Nullable<string>> {
        const loadErr = await super.load();
        if(loadErr != null) {
            return loadErr;
        }
        const eventModules = this.getChildModules();
        eventModules.forEach(module => {
            this.bot.on(module.name, module.onSuggestionEvent);
        });
        return null;
    }
}

class ModuleLoaderQueue extends ErrorAwareQueue implements ModuleLoader<Module>, Registry<Module> {
    readonly modules: Module[] = [];
    constructor(loaders: ModuleLoader<any>[] = []) {
        super(loaders.map(loader => async () => {
            try {
                const err = await loader.load();
                if(err == null) {
                    this.modules.push(...loader.getChildModules());
                }
                return err;
            } catch(err) {
                console.error(err);
                return "Error loading module: " + err;
            }
        }));
    }
    async load(): Promise<Nullable<string>> {
        return await this.dispatchAll();
    }
    getChildModules(): Module[] {
        return this.modules;
    }
    first(pred: (arg0: Module) => boolean): Module | null {
        return this.all().find(pred) || null;
    }

    allBy(pred: (arg0: Module) => boolean): Module[] {
        return this.all().filter(pred);
    }
    all(): Module[] {
        return this.getChildModules();
    }
}

interface ModuleLoader<T extends Module> {
    load(): Promise<Nullable<string>>;
    getChildModules(): T[];
}

type SlashCommandModule = {
    name: string;
    builder: SlashCommandBuilder | SlashCommandSubcommandBuilder | Pick<SlashCommandBuilder, "toJSON">;
    onCommand(interaction: CommandInteraction): Promise<void> | void;
}
type EventModule<K extends keyof ClientEvents = any> = Named<K> & Evt<ClientEvents[K][0]>;
type SuggestionEventModule = Named<SuggestionEvent> & {
    onSuggestionEvent(evt: any): any;
}
type SuggestionEvent = 'suggestionCreate' | 'guildLoad';
type Module = SlashCommandModule | EventModule | SuggestionEventModule;

export {
    Module,
    ModuleLoaderQueue,
    ModuleLoader,
    SlashCommandModule,
    SlashCommandModuleLoader,
    EventModule,
    EventModuleLoader,
    SuggestionEvent,
    SuggestionEventModuleLoader
};