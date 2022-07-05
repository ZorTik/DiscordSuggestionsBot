import {SuggestionEventModule} from "../../loader";
import {Suggestion} from "../../data";
import {bot, messages} from "../../app";

export = <SuggestionEventModule> {
    name: "suggestionApproveState",
    async onSuggestionEvent(evt: any) {
        if(evt instanceof Suggestion) {
            const message = await evt.toMessage();
            if(message != null) {
                // We know that at this moment, the suggestion
                // is either approved or rejected.
                const approved = evt.isApproved();
                const embed = await bot.constructSuggestionEmbed(evt);
                embed.setFooter(stateStr(approved));
                await message.edit({
                    embeds: [
                        embed
                    ],
                    components: []
                })
            }
        }
    }
}

function stateStr(approved: boolean): string {
    return messages.getStr(`suggestion.state.${approved ? "approved" : "declined"}`)
        .orElse("");
}