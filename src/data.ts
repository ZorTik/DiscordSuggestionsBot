import {JsonFileMap} from "zortik-common-libs";
import {Guild} from "discord.js";
import {MayUndefined, nonNull, Nullable} from "./util";

class GuildDatabase extends JsonFileMap {
    readonly guilds: SuggestionsGuild[]
    constructor(path: string) {
        super(path);
        this.guilds = [];
    }
    load(key: Nullable<string> = null) {
        if(key == null) {
            this.guilds.slice(0, this.guilds.length);
            this.keys().forEach(this.load);
            return;
        }
        const data = <SuggestionsGuildData>this.getByKey(key);
        if(nonNull(data)) {
            this.guilds.push(data);
        }
    }
    guild(guild: Guild | string): MayUndefined<SuggestionsGuild> {
        return this.guilds.find(g => g.id === (guild instanceof Guild ? guild.id : <string>guild))
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

class Suggestion {
    constructor(data: SuggestionData) {

    }
}

type SuggestionsGuildData = {
    id: string;
    suggestionsChannelId: string;
    suggestions: SuggestionData[];
}

type SuggestionData = {
    messageId: string;
    title: string;
    description: string;
}

export {
    GuildDatabase,
    SuggestionsGuild,
    Suggestion,
    SuggestionData
};