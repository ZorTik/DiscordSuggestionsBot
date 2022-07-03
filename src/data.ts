import {JsonFileMap} from "./common";
import {Guild} from "discord.js";
import {MayUndefined, nonNull, Nullable} from "./util";
import {PermissionGroup, PermissionHolder} from "./common/permissions";
import {getGroups} from "./api/api";

class GuildDatabase extends JsonFileMap {
    readonly guilds: SuggestionsGuild[];
    readonly users: SuggestionsUser[];
    constructor(path: string) {
        super(path);
        this.guilds = [];
        this.users = [];
    }
    saveGuilds() {
        this.setByKey("guilds", this.guilds
            .map(g => <SuggestionsGuildData> {
                id: g.id,
                suggestionsChannelId: g.suggestionsChannelId,
                suggestions: g.suggestions
                    .map((s: Suggestion) => <SuggestionData> {
                        messageId: s.messageId,
                        title: s.title,
                        description: s.description,
                        authorId: s.authorId,
                    })
            }));
    }
    saveUsers() {
        this.setByKey("users", this.users.filter(u => u.groups.length > 0 || u.permissions.nodes.length > 0)
            .map(u => <SuggestionsUserData> {
                id: u.id,
                group: nonNull((<PermissionGroup>u.permissions))
                ? (<PermissionGroup>u.permissions).name : ""
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
                id: id,
                group: ""
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
        const group = getGroups().find(g => g.name === data.group);
        this.permissions = group != null ? group : {
            nodes: []
        };
    }
}

class Suggestion {
    readonly messageId: string;
    title: string;
    description: string;
    authorId: string;
    constructor(data: SuggestionData) {
        this.messageId = data.messageId;
        this.title = data.title;
        this.description = data.description;
        this.authorId = data.authorId;
    }
}

type SuggestionsGuildData = {
    id: string;
    suggestionsChannelId: string;
    suggestions: SuggestionData[];
}

type SuggestionsUserData = {
    id: string;
    group: string;
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