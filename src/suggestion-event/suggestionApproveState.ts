import {SuggestionEventModule} from "../loader";
import {SuggestionApprovalEvent} from "../data";
import {bot, client} from "../app";
import { buildAlertMessage, stateStr } from "../util/approvalUtils";

export = <SuggestionEventModule> {
    name: "suggestionApproveState",
    async onSuggestionEvent(evt: any) {
        if(<SuggestionApprovalEvent>evt != null) {
            const approvalEvent = <SuggestionApprovalEvent>evt;
            const suggestion = approvalEvent.suggestion;
            const message = await suggestion.toMessage();
            if(message != null) {
                // We know that at this moment, the suggestion
                // is either approved or rejected.
                const approved = suggestion.isApproved();
                const embed = await bot.constructSuggestionEmbed(suggestion);
                embed.setFooter(stateStr(approved));
                await message.edit({
                    embeds: [
                        embed
                    ],
                    components: []
                });
                const author = await client.users.fetch(suggestion.authorId);
                await author.send({
                    embeds: [buildAlertMessage(suggestion)]
                });
            }
        }
    }
}