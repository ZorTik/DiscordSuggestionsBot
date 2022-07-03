import {SuggestionEventModule} from "../../loader";
import {Suggestion} from "../../data";
import {bot} from "../../app";

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
                embed.setFooter(approved ? "✔ Approved" : "❌ Declined");
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