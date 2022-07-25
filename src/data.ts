import {JsonFileMap} from "./common";
import {Guild, GuildMember, Message, MessageActionRow, MessageButton, TextChannel} from "discord.js";
import {GuildIdentity, MayUndefined, nonNull, Nullable} from "./util";
import {PermissionGroup, PermissionHolder} from "./common/permissions";
import {getGroups} from "./api/api";
import {bot, client} from "./app";
import {MessageButtonStyles} from "discord.js/typings/enums";

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
                logChannelId: g.logChannelId,
                suggestions: g.suggestions
                    .map((s: Suggestion) => <SuggestionData> {
                        guildId: s.guildId,
                        messageId: s.messageId,
                        title: s.title,
                        description: s.description,
                        authorId: s.authorId,
                        other: s.other
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
    guild(guild: GuildIdentity): MayUndefined<SuggestionsGuild> {
        let guildId = guild instanceof Guild ? guild.id : guild;
        return this.guilds.find(g => g.id === guildId)
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
    readonly logChannelId: string;
    readonly suggestions: Suggestion[];
    constructor(data: SuggestionsGuildData) {
        this.id = data.id;
        this.suggestionsChannelId = data.suggestionsChannelId;
        this.logChannelId = data.logChannelId;
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
    readonly guildId: string;
    readonly messageId: string;
    title: string;
    description: string;
    authorId: string;
    other: any;
    constructor(data: SuggestionData) {
        this.guildId = data.guildId;
        this.messageId = data.messageId;
        this.title = data.title;
        this.description = data.description;
        this.authorId = data.authorId;
        this.other = data.other;
    }

    setApproved(approved: boolean, approvedBy: Nullable<GuildMember> = null) {
        this.other.approved = approved;
        bot.emit("suggestionApproveState", <SuggestionApprovalEvent>{
            approvedBy: approvedBy,
            suggestion: this
        });
    }

    isApproved(): boolean {
        if(!this.isApprovedOrRejected()) return false;
        return this.other.approved;
    }

    isApprovedOrRejected(): boolean {
        return nonNull(this.other.approved);
    }

    async toMessage(): Promise<MayUndefined<Message>> {
        const guild = client.guilds.cache.get(this.guildId);
        if(guild != null && bot.isReady(guild)) {
            const channel = await guild.channels.fetch(bot.database.guild(guild)!!.suggestionsChannelId);
            if(channel != null && channel instanceof TextChannel) {
                return await channel.messages.fetch(this.messageId);
            }
        }
    }
}

type SuggestionApprovalEvent = {
    approvedBy: Nullable<GuildMember>;
    suggestion: Suggestion;
}

type SuggestionsGuildData = {
    id: string;
    suggestionsChannelId: string;
    logChannelId: string;
    suggestions: SuggestionData[];
}

type SuggestionsUserData = {
    id: string;
    group: string;
}

type SuggestionData = {
    guildId: string;
    messageId: string;
    title: string;
    description: string;
    authorId: string;
    other: any;
}

export {
    GuildDatabase,
    SuggestionsGuild,
    Suggestion,
    SuggestionApprovalEvent,
    SuggestionData
};