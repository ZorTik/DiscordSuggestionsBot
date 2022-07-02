import {Nullable} from "./util";

class EventEmitter<T> {
    readonly notifyHandlers: Map<T, NotifySubscriberFunc[]>;
    constructor() {
        this.notifyHandlers = new Map<T, NotifySubscriberFunc[]>();
    }
    on(evt: T, subscriber: NotifySubscriberFunc): EventEmitter<T> {
        if(!this.notifyHandlers.has(evt)) {
            this.notifyHandlers.set(evt, []);
        }
        this.notifyHandlers.get(evt)!!.push(subscriber);
        return this;
    }
    emit(evt: T, data: Nullable<any>) {
        if(this.notifyHandlers.has(evt)) {
            let subscribers = this.notifyHandlers.get(evt);
            if(subscribers != null) {
                subscribers.forEach(s => {
                    try {
                        s(data);
                    } catch(e) {
                        console.error(`Error in notify subscriber: ${e}`);
                    }
                })
            }
        }
    }
}
type NotifySubscriber = NotifySubscriberPresent & {
    evt: string;
};
type NotifySubscriberPresent = {
    on: NotifySubscriberFunc;
}
type NotifySubscriberFunc = (data: Nullable<any>) => void;

export {EventEmitter, NotifySubscriber, NotifySubscriberPresent, NotifySubscriberFunc};