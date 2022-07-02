import {JsonFileMap} from "./common";
import {Guild} from "discord.js";
import {MayUndefined, nonNull, Nullable} from "./util";
import {PermissionHolder} from "./common/permissions";

class GuildDatabase extends JsonFileMap {
    readonly guilds: SuggestionsGuild[];
    readonly users: SuggestionsUser[];
    constructor(path: string) {
        super(path);
        this.guilds = [];
        this.users = [];
    }
    saveGuilds() {
        this.setByKey("guilds", this.guilds);
    }
    saveUsers() {
        this.setByKey("users", this.users.filter(u => u.groups.length > 0 || u.permissions.nodes.length > 0)
            .map(u => <SuggestionsUserData> {
                id: u.id
            }));
    }

    load(key: Nullable<string> = null) {
        if(key == null) {
            this.guilds.slice(0, this.guilds.length);
            this.users.slice(0, this.users.length);
            this.keys().forEach(key => this.load(key));
            return;
        }
        if(key === "guilds") {
            const data = <MayUndefined<SuggestionsGuildData[]>>this.getByKey(key);
            if(nonNull(data)) {
                this.guilds.push(...data!!.map(d => new SuggestionsGuild(d)));
            }
        } else if(key === "users") {
            const data = <MayUndefined<SuggestionsUserData[]>>this.getByKey(key);
            if(nonNull(data)) {
                this.users.push(...data!!.map(d => new SuggestionsUser(d)));
            }
        }
    }
    guild(guild: Guild | string): MayUndefined<SuggestionsGuild> {
        return this.guilds.find(g => g.id === (guild instanceof Guild ? guild.id : <string>guild))
    }
    user(id: string): SuggestionsUser {
        let user = this.users.find(u => u.id === id);
        if(user == null) {
            this.users.push(user = new SuggestionsUser({
                id: id
            }));
        }
        return user;
    }
}

class SuggestionsGuild {
    readonly id: string;
    readonly suggestionsChannelId: string;
    readonly suggestions: Suggestion[];
    constructor(data: SuggestionsGuildData) {
        this.id = data.id;
        this.suggestionsChannelId = data.suggestionsChannelId;
        this.suggestions = data.suggestions.map(d => new Suggestion(d));
    }
}

class SuggestionsUser extends PermissionHolder {
    readonly id: string;
    constructor(data: SuggestionsUserData) {
        super();
        this.id = data.id;
    }
}

class Suggestion {
    constructor(data: SuggestionData) {

    }
}

type SuggestionsGuildData = {
    id: string;
    suggestionsChannelId: string;
    suggestions: SuggestionData[];
}

type SuggestionsUserData = {
    id: string;
}

type SuggestionData = {
    messageId: string;
    title: string;
    description: string;
    authorId: string;
}

export {
    GuildDatabase,
    SuggestionsGuild,
    Suggestion,
    SuggestionData
};