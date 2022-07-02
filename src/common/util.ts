export interface Optional<T> {
    value: T | null;
    isEmpty(): boolean;
    isPresent(): boolean;
    get(): T | null;
}
export type Nullable<T> = T | null;