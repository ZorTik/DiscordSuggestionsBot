import * as fs from "fs";
import {ErrorAwareQueue, Evt, nonNull, Nullable} from "./util";
import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";

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
    constructor(path: string) {
        super(path);
    }

    async load(): Promise<Nullable<string>> {
        const loadErr = await super.load();
        if(loadErr != null) {
            return loadErr;
        }
        let validModules = this.getChildModules().filter(SlashCommandModuleLoader.isValid);
        if(validModules.length > 0) {
            // Push commands to the API.
            let mainCommandBuilders = new Map(validModules
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
        }
        return loadErr;
    }
    private static isValid(module: SlashCommandModule): boolean {
        return (module.builder instanceof SlashCommandSubcommandBuilder && module.name.includes("."))
        || (module.builder instanceof SlashCommandBuilder && module.name.length > 0);
    }
}

class ModuleLoaderQueue extends ErrorAwareQueue<Module> implements ModuleLoader<Module> {
    private readonly modules: Module[];
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
const loader = new ModuleLoaderQueue([
    // TODO: Module loaders
])
export {loader};