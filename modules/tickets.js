const discord = require("discord.js");

module.exports = { "ticket": async function(interaction, guilds) {
    if (guilds[interaction.guildId]["tickets"]["enabled"] && guilds[interaction.guildId]["tickets"]["category"]) {
        interaction.guild.channels.create({ "parent": interaction.guild.channels.cache.get(guilds[interaction.guildId]["tickets"]["category"]), "name": "ticket-" + interaction.user.username, "topic": "Support Ticket", "type": discord.ChannelType.GuildText, "permissionOverwrites": [ { "id": interaction.guildId, "deny": [ discord.PermissionsBitField.Flags.ViewChannel, discord.PermissionsBitField.Flags.SendMessages ] }, { "id": interaction.user.id, "allow": [ discord.PermissionsBitField.Flags.ViewChannel, discord.PermissionsBitField.Flags.SendMessages ] } ] }).then(async channel => {
            channel.send(guilds[interaction.guildId]["tickets"]["openingMsg"] + " (" + interaction.user.toString() + ")");
            guilds[interaction.guildId]["tickets"]["accessRoles"].forEach(role => channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true }));
            interaction.reply({ "ephemeral": true, "content": "Ticket created, use this channel: " + channel.toString() });
        });
    }
    else {
        interaction.reply({ "ephemeral": true, "content": "`Tickets are not enabled / set up. Please contact an Administrator if this is a bug.`" });
    }
}, "ticketMenu": function(guilds, interaction) {
    let accessRolesStr = "";
    guilds[interaction.guildId]["tickets"]["accessRoles"].forEach(role => {
        accessRolesStr += interaction.guild.roles.cache.get(role).name + ",";
    });
    if (accessRolesStr.length > 0) accessRolesStr = accessRolesStr.substring(0, accessRolesStr.length - 1);
    const menu = new discord.ActionRowBuilder()
    .addComponents(
        new discord.StringSelectMenuBuilder()
        .setCustomId("ticketsProperty")
        .setPlaceholder("No Property Selected")
        .addOptions(
            {
                "label": "Close Pop-Up",
                "description": "Close this menu",
                "value": "-1"
            },
            {
                "label": "Go Back",
                "description": "Go back to the Module Selection page",
                "value": "0"
            },
            {
                "label": "Module Enabled",
                "description": "Turn on or off the tickets module (" + (guilds[interaction.guildId]["tickets"]["enabled"] ? "on" : "off") + ")",
                "value": "1"
            },
            {
                "label": "Tickets Category",
                "description": "Sets the category for opened tickets (" + (guilds[interaction.guildId]["tickets"]["category"] && interaction.guild.channels.cache.get(guilds[interaction.guildId]["tickets"]["category"]) ? "#" + interaction.guild.channels.cache.get(guilds[interaction.guildId]["tickets"]["category"]).name.substring(35) : "[none]") + ")",
                "value": "2"
            },
            {
                "label": "Access Roles",
                "description": "Roles for users that can access the ticket (" + (accessRolesStr.length > 0 ? accessRolesStr.substring(0, 30) : "none") + ")",
                "value": "3"
            },
            {
                "label": "Opening Message",
                "description": "Message sent when a ticket is opened (" + guilds[interaction.guildId]["tickets"]["openingMsg"].substring(0, 36) + ")",
                "value": "4"
            }
        )
    );
    if (interaction.message && interaction.message.deletable) interaction.message.delete();
    interaction.channel.send({ "content": "`Select which property you would like to edit`", "components": [ menu ] });
} };