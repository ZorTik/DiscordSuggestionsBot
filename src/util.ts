import {Guild} from "discord.js";

const nonNull: (arg: any) => boolean = (arg) => arg != null;

function guildId(identity: GuildIdentity): string {
    return identity instanceof Guild ? identity.id : <string>identity;
}

type Named<T = string> = {
    name: T;
}
type Evt<T> = {
    on(evt: T);
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
                return err;
            }
        }
        return null;
    }
}
class BgFlux<T> extends ErrorAwareQueue {
    private readonly value: (flux: BgFlux<T>) => T;
    constructor(value: (flux: BgFlux<T>) => T) {
        super();
        this.value = value;
    }
    async execute(): Promise<Nullable<T>> {
        const errNullable = await this.dispatchAll();
        return nonNull(errNullable) ? this.value(this) : null;
    }
}
type Nullable<T> = T | null;
type MayUndefined<T> = T | undefined;
type ErrorLoggingTask = () => Nullable<string> | Promise<Nullable<string>>;
type GuildIdentity = Guild | string;

export {
    nonNull,
    guildId,
    Named,
    Evt,
    ErrorAwareQueue,
    BgFlux,
    Nullable,
    MayUndefined,
    GuildIdentity
}