const discord = require("discord.js");

module.exports = { "welcomeMenu": function(guilds, interaction) {
    let autoroleMsg = "";
    guilds[interaction.guildId]["welcome"]["autoRoles"].forEach(channel => {
        autoroleMsg += interaction.guild.roles.cache.get(channel).name + ",";
    });
    autoroleMsg = autoroleMsg.substring(0, autoroleMsg.length - 1);
    const menu = new discord.ActionRowBuilder()
        .addComponents(
            new discord.StringSelectMenuBuilder()
            .setCustomId("welcomeProperty")
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
                    "description": "Turn on or off the welcoming module (" + (guilds[interaction.guildId]["welcome"]["enabled"] ? "on" : "off") + ")",
                    "value": "1"
                },
                {
                    "label": "Welcome Channel",
                    "description": "Sets the channel for welcomes (" + (guilds[interaction.guildId]["welcome"]["channel"] && interaction.guild.channels.cache.get(guilds[interaction.guildId]["welcome"]["channel"]) ? "#" + interaction.guild.channels.cache.get(guilds[interaction.guildId]["welcome"]["channel"]).name.substring(0, 42) : "[none]") + ")",
                    "value": "2"
                },
                {
                    "label": "Welcome Message",
                    "description": "Sets the custom join message (" + guilds[interaction.guildId]["welcome"]["welcomeMsg"].substring(0, 30) + ")",
                    "value": "3"
                },
                {
                    "label": "Auto-Roles",
                    "description": "Automatic given roles for users (" + (guilds[interaction.guildId]["welcome"]["autoRoles"].length > 0 ? autoroleMsg.substring(0, 41) : "[none]") + ")",
                    "value": "4"
                }
            )
        );
        
        if (interaction.message && interaction.message.deletable) interaction.message.delete();
        interaction.channel.send({ "content": "`Select which property you would like to edit`", "components": [ menu ] });
} };