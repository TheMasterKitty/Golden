const { REST, Routes } = require('discord.js');
const clientId = "1125568711923863674";
const token = "MTEyNTU2ODcxMTkyMzg2MzY3NA.GYDzfc.NTnj1mofnuawzlA5iNmDtS_3O60pwZW85sKvN4";

const commands = [
    {
        name: "manage-server",
        description: "Manage server modules and settings",
        default_member_permissions: 0x0000000000000008,
    },
    {
        name: "reset-server",
        description: "Resets the entire server configuration.",
        default_member_permissions: 0x0000000000000008,
    },
    {
        name: "reset-xp",
        description: "Resets the entire server's XP levels'.",
        default_member_permissions: 0x0000000000000008,
    },
    {
        name: "ticket-message",
        description: "Sends the message for ticket opening.",
        default_member_permissions: 0x0000000000000008,
        options: [ { type: 3, name: "message", description: "The message to send with the buttons.", "required": true } ]
    },
    {
        name: "countingreset",
        description: "Resets the counting streak back to zero.",
        default_member_permissions: 0x0000000000000020,
    },
    {
        name: "reload-level-roles",
        description: "Gives out all level roles needed.",
        default_member_permissions: 0x0000000010000000,
    },
    {
        name: "countingoptions",
        description: "Gets the options for counting.",
    },
    {
        name: "close",
        description: "Closes the current ticket.",
    },
    {
        name: "countingnext",
        description: "Gets the next number for counting.",
    },
    {
        name: "chatlevel",
        description: "Gets someone's XP level for chatting.",
        options: [ { type: 6, name: "user", description: "The user you want to get the XP Level of." } ]
    },
    {
        name: "warn",
        description: "Warn a user for breaking the rules.",
        default_member_permissions: 0x0000010000000000,
        options: [ { type: 6, name: "user", description: "The user to warn.", required: true }, { type: 3, name: "reason", description: "The reason of the warning.", required: true } ]
    },
    {
        name: "mute",
        description: "Mute/durationout a user for breaking the rules.",
        default_member_permissions: 0x0000010000000000,
        options: [ { type: 6, name: "user", description: "The user to mute.", required: true }, { type: 3, name: "duration", description: "The duration of the mute.", required: true }, { type: 3, name: "reason", description: "The reason of the mute." } ]
    },
    {
        name: "unmute",
        description: "Unmute/undurationout a user.",
        default_member_permissions: 0x0000010000000000,
        options: [ { type: 6, name: "user", description: "The user to unmute.", required: true }, { type: 3, name: "reason", description: "The reason of the unmute." } ]
    },
    {
        name: "kick",
        description: "Kick a user for breaking the rules.",
        default_member_permissions: 0x0000000000000002,
        options: [ { type: 6, name: "user", description: "The user to kick.", required: true }, { type: 3, name: "reason", description: "The reason of the kick." } ]
    },
    {
        name: "ban",
        description: "Ban a user for breaking the rules.",
        default_member_permissions: 0x0000000000000004,
        options: [ { type: 6, name: "user", description: "The user to ban.", required: true }, { type: 3, name: "duration", description: "The duration of the ban." }, { type: 3, name: "reason", description: "The reason of the ban." } ]
    },
    {
        name: "unban",
        description: "Unban a user.",
        default_member_permissions: 0x0000000000000004,
        options: [ { type: 3, name: "user", description: "The user (ID) to unban.", required: true }, { type: 3, name: "reason", description: "The reason of the unban." } ]
    },
    {
        name: "logs",
        description: "Get moderation logs of a user.",
        default_member_permissions: 0x0000000000000010,
        options: [ { type: 6, name: "user", description: "The user to check the logs of.", required: true } ]
    },
    {
        name: "clear-logs",
        description: "Clears a user's logs.",
        default_member_permissions: 0x0000000000000008,
        options: [ { type: 6, name: "user", description: "The user to clear the logs of.", required: true } ]
    },
    {
        name: "purge",
        description: "Clears a channel's messages.",
        default_member_permissions: 0x0000000000002000,
        options: [ { type: 4, name: "amount", description: "The ammount of messages to clear.", required: true } ]
    },
    {
        name: "slowmode",
        description: "Set the slowmode of the channel",
        default_member_permissions: 0x0000010000000000,
        options: [ { type: 4, name: "time", description: "The slowmode in seconds", required: true } ]
    },
    {
        name: "ghostping",
        description: "Ghost pings someone and instantly removes the mention message.",
        default_member_permissions: 0x0000000000020000,
        options: [ { type: 9, name: "mention", description: "The role/person to ghost ping", required: true } ]
    },
    {
        name: "chatleaderboard",
        description: "The top XP chatters.",
    }
];

const rest = new REST().setToken(token);

(async () => {
	try {
		console.log(`Started registering ${commands.length} application (/) commands.`);
		await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands },
		);
		console.log(`Registered all ${commands.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
