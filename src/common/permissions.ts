import {HasIdentity, HasName} from "./types";
import {GuildMember} from "discord.js";

export class PermissionHolder {

    permissions: PermissionContext;
    groups: string[];

    constructor(permissions: PermissionNode[] = [], groups: string[] = []) {
        this.permissions = {
            nodes: permissions
        }
        this.groups = groups;
    }

    /**
     * Checks if this permission holder contains
     * node with given id. The id can be either:
     * - Node ID
     * - Permission string
     * @param id The id to check.
     */
    hasPermissionNode(id: string): boolean {
        return this.hasPermissionNodeInContext(id, this.permissions);
    }

    private hasPermissionNodeInContext(id: string, context: PermissionContext): boolean {
        return context.nodes
            .some(n => {
                let c = <HasIdentity & PermissionContext>n;
                let contextId = c.id;
                return (contextId != null && (contextId === id || this.hasPermissionNodeInContext(id, c)))
                    || (contextId == null && id === n);
            });
    }

}

export type PermissionHolderSnapshot = {
    permissions: PermissionContext,
    groups: string[]
}

export type PermissionContext = {
    nodes: PermissionNode[];
}
export type PermissionGroup = (HasIdentity & HasName & PermissionContext);
export type PermissionNode = PermissionGroup | string;