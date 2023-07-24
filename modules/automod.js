const discord = require("discord.js");

module.exports = { "automodMenu": function(guilds, interaction) {
    let allowChannelsMsg = "";
    guilds[interaction.guildId]["automod"]["allowChannels"].forEach(channel => {
        allowChannelsMsg += interaction.guild.channels.cache.get(channel).name + ",";
    });
    allowChannelsMsg = allowChannelsMsg.substring(0, allowChannelsMsg.length - 1);
    let allowRoleMsg = "";
    guilds[interaction.guildId]["automod"]["allowRoles"].forEach(channel => {
        allowRoleMsg += interaction.guild.roles.cache.get(channel).name + ",";
    });
    allowRoleMsg = allowRoleMsg.substring(0, allowRoleMsg.length - 1);
    let blockPingMsg = "";
    guilds[interaction.guildId]["automod"]["blockedRolePings"].forEach(channel => {
        blockPingMsg += interaction.guild.roles.cache.get(channel).name + ",";
    });
    blockPingMsg = blockPingMsg.substring(0, blockPingMsg.length - 1);
    const menu = new discord.ActionRowBuilder()
        .addComponents(
            new discord.StringSelectMenuBuilder()
            .setCustomId("automodProperty")
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
                    "description": "Turn on or off the automod module (" + (guilds[interaction.guildId]["automod"]["enabled"] ? "on" : "off") + ")",
                    "value": "1"
                },
                {
                    "label": "Allowed Channels",
                    "description": "Sets the allowed channels to break rules (" + (guilds[interaction.guildId]["automod"]["allowChannels"].length > 0 ? allowChannelsMsg.substring(0, 32) : "[none]") + ")",
                    "value": "2"
                },
                {
                    "label": "Allowed Roles",
                    "description": "Sets the allowed roles to break rules (" + (guilds[interaction.guildId]["automod"]["allowRoles"].length > 0 ? allowRoleMsg.substring(0, 35) : "[none]") + ")",
                    "value": "3"
                },
                {
                    "label": "Blocked Role Pings",
                    "description": "Stops members from pinging users with a role (" + (guilds[interaction.guildId]["automod"]["blockedRolePings"].length > 0 ? blockPingMsg.substring(0, 28) : "[none]") + ")",
                    "value": "4"
                }
            )
        );
        
        if (interaction.message && interaction.message.deletable) interaction.message.delete();
        interaction.channel.send({ "content": "`Select which property you would like to edit`", "components": [ menu ] });
} };