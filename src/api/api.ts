import {PermissionGroup} from "../common/permissions";

const permissions = {
    SETUP: "setup",
    APPROVE: "approve"
};

const groups = {
    ADMIN: {
        id: "admin",
        name: "Admin",
        nodes: [
            permissions.SETUP,
            permissions.APPROVE
        ]
    },
    MODERATOR: {
        id: "moderator",
        name: "Moderator",
        nodes: [
            permissions.APPROVE,
        ]
    }
}

function getGroups(): PermissionGroup[] {
    return Object.values(groups);
}

export {permissions, groups, getGroups};