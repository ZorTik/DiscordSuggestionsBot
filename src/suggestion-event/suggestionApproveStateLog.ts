import {SuggestionEventModule} from "../loader";
import {Suggestion, SuggestionApprovalEvent} from "../data";
import {bot, client} from "../app";
import {buildAlertMessage} from "../util/approvalUtils";
import {nonNull} from "../util";
import {TextChannel} from "discord.js";

export = <SuggestionEventModule> {
    name: "suggestionApproveState",
    async onSuggestionEvent(evt: any) {
        if(<SuggestionApprovalEvent>evt != null) {
            const approvalEvent = <SuggestionApprovalEvent>evt;
            const suggestion = approvalEvent.suggestion;
            const guild = await client.guilds.fetch(suggestion.guildId);
            let logChannel = await bot.fetchLogChannel(guild);
            if(nonNull(logChannel) && (logChannel = <TextChannel>logChannel) != null) {
                await logChannel.send({
                    embeds: [buildAlertMessage(approvalEvent.suggestion, "Suggestion {} has been {} by {}", approvalEvent.approvedBy?.toString() || "Unknown user")]
                });
            }
        }
    }
}