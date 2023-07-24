const discord = require("discord.js");

module.exports = { "level": function(interaction, guilds) {
    let containsRole = false;
    interaction.member.roles.cache.forEach((role) => {
        if (guilds[interaction.guildId]["leveling"]["blacklistedRoles"].includes(role.id)) {
            containsRole = true;
            return;
        }
    });
    if (!containsRole) {
        let mult = 1;
        interaction.member.roles.cache.forEach((role) => {
            if (Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).includes(role.id)) {
                mult += guilds[interaction.guildId]["leveling"]["boostRoles"][role.id] / 100;
            }
        });
        if (!guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]) guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id] = { "xp": 0.0, "level": 0 };
        guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["xp"] += mult * Math.min(13, Math.ceil(interaction.content.length / 15));
        if (guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["xp"] >= Math.round(25 * Math.pow(1.65, guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["level"]))) {
            guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["level"]++;
            const upRoles = [ ];
            const upRoleIDs = [ ];
            Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(role => {
                if (guilds[interaction.guildId]["leveling"]["levelRoles"][role] === guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["level"]) {
                    upRoles.push(interaction.guild.roles.cache.get(role).name);
                    upRoleIDs.push(role);
                }
            });
            if (guilds[interaction.guildId]["leveling"]["channel"]) {
                if (upRoles.length > 0) {
                    upRoleIDs.forEach(role => interaction.member.roles.add(role));
                    interaction.guild.channels.cache.get(guilds[interaction.guildId]["leveling"]["channel"]).send(interaction.member.toString() + "` has achieved level " + guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["level"] + " and got the role" + (upRoles.length > 1 ? "s " : " ") + upRoles.join(", ") + "!!!`");
                }
                else {
                    interaction.guild.channels.cache.get(guilds[interaction.guildId]["leveling"]["channel"]).send(interaction.member.toString() + "` has achieved level " + guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["level"] + "!`");
                }
            }
            else {
                if (upRoles.length > 0) {
                    upRoleIDs.forEach(role => interaction.member.roles.add(role));
                    interaction.channel.send(interaction.member.toString() + "` has achieved level " + guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["level"] + " and got the role" + (upRoles.length > 1 ? "s " : " ") + upRoles.join(", ") + "!!!`");
                }
                else {
                    interaction.channel.send(interaction.member.toString() + "` has achieved level " + guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.author.id]["level"] + "!`");
                }
            }
        }
    }
}, "levelMenu": function(guilds, interaction) {
    let boostRolesSTR = "";
    Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).forEach(key => {
        boostRolesSTR += interaction.guild.roles.cache.get(key).name + "-" + guilds[interaction.guildId]["leveling"]["boostRoles"][key].toString() + ",";
    });
    boostRolesSTR = boostRolesSTR.substring(0, boostRolesSTR.length - 1);
    let levelRolesSTR = "";
    Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(key => {
        levelRolesSTR += interaction.guild.roles.cache.get(key).name + "-" + guilds[interaction.guildId]["leveling"]["levelRoles"][key].toString() + ",";
    });
    levelRolesSTR = levelRolesSTR.substring(0, levelRolesSTR.length - 1);
    const menu = new discord.ActionRowBuilder()
    .addComponents(
        new discord.StringSelectMenuBuilder()
        .setCustomId("levelingProperty")
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
                "description": "Turn on or off the leveling module (" + (guilds[interaction.guildId]["leveling"]["enabled"] ? "on" : "off") + ")",
                "value": "1"
            },
            {
                "label": "Level-up Channel",
                "description": "Sets the channel for level-ups (" + (guilds[interaction.guildId]["leveling"]["channel"] && raction.guild.channels.cache.get(guilds[interaction.guildId]["leveling"]["channel"]) ? "#" + interaction.guild.channels.cache.get(guilds[interaction.guildId]["leveling"]["channel"]).name.substring(0, 41) : "[none]") + ")",
                "value": "2"
            },
            {
                "label": "Blacklist Channels",
                "description": "Stop XP being earned by channels (" + (guilds[interaction.guildId]["leveling"]["blacklistedChannels"].length > 0 ? guilds[interaction.guildId]["leveling"]["blacklistedChannels"].join(",").substring(0, 41) : "none") + ")",
                "value": "3"
            },
            {
                "label": "Blacklist Roles",
                "description": "Stop XP being earned by roles (" + (guilds[interaction.guildId]["leveling"]["blacklistedRoles"].length > 0 ? guilds[interaction.guildId]["leveling"]["blacklistedRoles"].join(",").substring(0, 43) : "none") + ")",
                "value": "4"
            },
            {
                "label": "Booster Roles",
                "description": "Adds an XP multiplier to a role (" + boostRolesSTR.substring(0, 41) + ")",
                "value": "5"
            },
            {
                "label": "Level Roles",
                "description": "Roles earned for levels (" + levelRolesSTR.substring(0, 49) + ")",
                "value": "6"
            },
        )
    );
    if (interaction.message && interaction.message.deletable) interaction.message.delete();
    interaction.channel.send({ "content": "`Select which property you would like to edit`", "components": [ menu ] });
} };