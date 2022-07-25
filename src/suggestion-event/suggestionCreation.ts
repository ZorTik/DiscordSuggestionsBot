import {SuggestionEventModule} from "../loader";
import {Suggestion} from "../data";
import {MessageActionRow, MessageButton} from "discord.js";
import {MessageButtonStyles} from "discord.js/typings/enums";

export = <SuggestionEventModule> {
    name: "suggestionCreate",
    async onSuggestionEvent(evt: any) {
        if(evt instanceof Suggestion) {
            const message = await evt.toMessage();
            if(message != null) {
                await message.edit({
                    components: [
                        new MessageActionRow()
                            .setComponents([
                                new MessageButton()
                                    .setCustomId("suggestion-state-accept")
                                    .setLabel("Accept")
                                    .setStyle(MessageButtonStyles.SUCCESS),
                                new MessageButton()
                                    .setCustomId("suggestion-state-reject")
                                    .setLabel("Decline")
                                    .setStyle(MessageButtonStyles.DANGER)
                            ])
                    ]
                });
                await message.react("👍");
                await message.react("👎");
            }
        }
    }
}