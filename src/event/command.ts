import {EventModule, SlashCommandModule} from "../loader";
import {CacheType, Interaction} from "discord.js";
import {bot} from "../app";
import {isExactCommand, nonNull} from "../util";

export = <EventModule<"interactionCreate">> {
    name: "interactionCreate",
    async on(evt: Interaction<CacheType>) {
        if(evt.isCommand()) {
            const guild = evt.guild;
            const moduleRegistry = bot.moduleRegistries.find(r => r.guild.id === guild?.id);
            if(nonNull(moduleRegistry)) {
                for(let m of moduleRegistry!!.findModules<SlashCommandModule>(m => isExactCommand(evt, m.name))) {
                    try {
                        const res = m.onCommand(evt);
                        if(res instanceof Promise) {
                            await res;
                        }
                    } catch(ex) {
                        console.error(ex);
                    }
                }
            }
        }
    }
};