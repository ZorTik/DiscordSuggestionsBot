import * as fs from "fs";
import {ErrorAwareQueue, Evt, nonNull, Nullable} from "./util";
import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {CommandInteraction, Guild} from "discord.js";
import {Registry} from "zortik-common-libs";
import {REST} from "@discordjs/rest";
import {client, rest} from "./app";
import {Routes} from "discord-api-types/v9";

class FileTreeModuleLoader<T extends Module> implements ModuleLoader<T> {
    private readonly path: string;
    private readonly childModules: T[];
    constructor(path: string) {
        this.path = path;
        this.childModules = [];
    }
    async load(): Promise<Nullable<string>> {
        this.childModules.splice(0, this.childModules.length);
        let modules: T[];
        try {
            modules = await this.loadAtPath(this.path);
        } catch(ex) {
            return ex;
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
            res.push(...(await Promise.all(fs.readdirSync(path)
                    .map(f => (this.loadAtPath(path + "/" + f)))))
                    .flatMap(m => m).map(m => <T>m).filter(nonNull)
                );
        } else {
            let module = <T>(await import(path));
            if(module != null) {
                res.push(module);
            }
        }
        return res;
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
                .filter(module => nonNull(<Pick<SlashCommandBuilder, "toJSON">>module.builder))
                .map(module => [module.name, module.builder]));
            validModules.filter(module => module.builder instanceof SlashCommandSubcommandBuilder)
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
            await rest.put(Routes.applicationGuildCommands(client.application.id, this.guild.id), {
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

class ModuleLoaderQueue extends ErrorAwareQueue<Module> implements ModuleLoader<Module>, Registry<Module> {
    readonly modules: Module[];
    constructor(loaders: ModuleLoader<any>[] = []) {
        super(loaders.map(loader => async () => {
            const err = await loader.load();
            if(err == null) {
                this.modules.push(...loader.getChildModules());
            }
            return err;
        }));
    }
    async load(): Promise<string> {
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

type SlashCommandModule = Evt<CommandInteraction> & {
    name: string;
    builder: SlashCommandBuilder | SlashCommandSubcommandBuilder | Pick<SlashCommandBuilder, "toJSON">;
}
type EventModule = {

}
export type Module = SlashCommandModule | EventModule;

export {ModuleLoaderQueue, ModuleLoader, SlashCommandModule, SlashCommandModuleLoader, EventModule};