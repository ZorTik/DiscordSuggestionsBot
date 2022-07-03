import {Guild, Interaction, MessageEmbed} from "discord.js";
import {COLOR_ERROR, COLOR_SUCCESS} from "./const";
import {messages} from "./app";
import {ValOpt} from "./common";

const nonNull: (arg: any | undefined | null) => boolean = (arg) => arg != null;

function guildId(identity: GuildIdentity): string {
    return identity instanceof Guild ? identity.id : <string>identity;
}

async function noPermission(interaction: Interaction) {
    await error(interaction, messages.getStr("no-permission").orElse(""));
}

async function success(interaction: Interaction, message: ValOpt<string> | string) {
    await embed(interaction, new MessageEmbed()
        .setColor(COLOR_SUCCESS)
        .setTitle(messages.getStr("success").orElse(""))
        .setDescription(message instanceof ValOpt ? message.orElse("") : message), true);
}

async function error(interaction: Interaction, message: ValOpt<string> | string) {
    await embed(interaction, new MessageEmbed()
        .setColor(COLOR_ERROR)
        .setTitle(messages.getStr("error").orElse(""))
        .setDescription(message instanceof ValOpt ? message.orElse("") : message), true);
}

async function embed(interaction: Interaction, embed: MessageEmbed, ephemeral: boolean = true) {
    if(interaction.isRepliable()) {
        await interaction.reply({
            embeds: [embed],
            ephemeral: ephemeral
        });
    }
}

function isExactCommand(interaction: Interaction, cmdUrl: string): boolean {
    if(!interaction.isCommand()) return false;
    let spl = cmdUrl.split(".");
    for(let i = 0; i < spl.length; i++) {
        let part = spl[i];
        if((i == 0 && interaction.commandName !== part)
            || (i > 0 && interaction.options.getSubcommand() !== part)) {
            return false;
        }
    }
    return true;
}

type Named<T = string> = {
    name: T;
}
type Evt<T> = {
    on(evt: T): any;
}
class ErrorAwareQueue {
    tasks: ErrorLoggingTask[];
    constructor(initialTasks: ErrorLoggingTask[] = []) {
        this.tasks = initialTasks;
    }
    async dispatchAll(): Promise<Nullable<string>> {
        for(let task of this.tasks) {
            try {
                let err = task();
                if(err instanceof Promise) {
                    err = await err;
                }
                if(err != null) {
                    return err;
                }
            } catch(err) {
                if(typeof err === "string") {
                    return err;
                }
            }
        }
        return null;
    }
}
class BgFlux<T> extends ErrorAwareQueue {
    private readonly value: (flux: BgFlux<T>) => Nullable<T>;
    constructor(value: (flux: BgFlux<T>) => Nullable<T>) {
        super();
        this.value = value;
    }
    async execute(): Promise<Nullable<T>> {
        const errNullable = await this.dispatchAll();
        return !nonNull(errNullable) ? this.value(this) : null;
    }
}
type Nullable<T> = T | null;
type MayUndefined<T> = T | undefined;
type ErrorLoggingTask = () => Nullable<string> | Promise<Nullable<string>>;
type GuildIdentity = Guild | string;
type GuildMessageReference = {
    guildId: string;
    messageId: string;
}

export {
    nonNull,
    guildId,
    Named,
    Evt,
    ErrorAwareQueue,
    BgFlux,
    Nullable,
    MayUndefined,
    GuildIdentity,
    GuildMessageReference,
    success,
    error,
    embed,
    isExactCommand,
    noPermission
}