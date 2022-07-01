export const nonNull: (arg: any) => boolean = (arg) => arg != null;
export type Named<T = string> = {
    name: T;
}
export type Evt<T> = {
    on(evt: T);
}
export class ErrorAwareQueue<T> {
    tasks: ErrorLoggingTask[];
    constructor(initialTasks: ErrorLoggingTask[] = []) {
        this.tasks = initialTasks;
    }
    async dispatchAll(): Promise<Nullable<string>> {
        for(let task of this.tasks) {
            let err = task();
            if(err instanceof Promise) {
                err = await err;
            }
            if(err != null) {
                return err;
            }
        }
        return null;
    }
}
export type Nullable<T> = T | null;
export type MayUndefined<T> = T | undefined;
type ErrorLoggingTask = () => Nullable<string> | Promise<Nullable<string>>;