const discord = require("discord.js");

function durationConvert(duration) {
    let result = 0;
    let lastNum = "";
    duration.split("").forEach(char => {
        if (!isNaN(parseInt(char)))
            lastNum += char;
        else if (lastNum !== "") {
            const dur = parseInt(lastNum);
            lastNum = "";
            if (char === "s")
                result += dur * 1000;
            else if (char === "m")
                result += dur * 60 * 1000;
            else if (char === "h")
                result += dur * 60 * 60 * 1000;
            else if (char === "d")
                result += dur * 24 * 60 * 60 * 1000;
            else if (char === "w")
                result += dur * 7 * 24 * 60 * 60 * 1000;
            else if (char === "M")
                result += dur * 30 * 24 * 60 * 60 * 1000;
        }
    });

    return result;
}
function durationPrettier(duration) {
    let result = "";
    let lastChar = false;
    duration.split("").forEach(char => {
        if (!isNaN(parseInt(char))) {
            result += char;
            lastChar = false;
        }
        else if (!lastChar) {
            lastChar = true;
            if (char === "s")
                result += " seconds, ";
            else if (char === "m")
                result += " minutes, ";
            else if (char === "h")
                result += " hours, ";
            else if (char === "d")
                result += " days, ";
            else if (char === "w")
                result += " weeks, ";
            else if (char === "M")
                result += " months, ";
        }
    });

    return result.substring(0, result.length - 2);
}

module.exports = { "moderationMenu": function(guilds, interaction) {
    const menu = new discord.ActionRowBuilder()
    .addComponents(
        new discord.StringSelectMenuBuilder()
        .setCustomId("moderationProperty")
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
                "description": "Turn on or off the moderation module (" + (guilds[interaction.guildId]["moderation"]["enabled"] ? "on" : "off") + ")",
                "value": "1"
            },
            {
                "label": "Prefix",
                "description": "Sets the prefix for message-moderation (" + guilds[interaction.guildId]["moderation"]["prefix"] + ")",
                "value": "2"
            },
            {
                "label": "Warnings Enabled",
                "description": "Allow warnings or just mutes, kicks, and bans (" + guilds[interaction.guildId]["moderation"]["enableWarnings"] + ")",
                "value": "3"
            }
        )
    );
    if (interaction.message && interaction.message.deletable) interaction.message.delete();
    interaction.channel.send({ "content": "`Select which property you would like to edit`", "components": [ menu ] });
}, "warn": function(user, reason, interaction, guilds) {
    user.send("`You've been warned on " + interaction.guild.name + " for " + reason + "`");
    if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
    if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
    guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].push("Warning " + new Date().toUTCString() + " for " + reason);
    interaction.reply({ "ephemeral": true, content: user.toString() + " was warned for " + reason });
    guilds[interaction.guildId]["moderation"]["modlogs"][user.id].push({ "type": "warn", "time": new Date().getTime(), "reason": reason });
}, "mute": function(user, duration, reason, interaction, guilds) {
    if (user.bannable && interaction.member.roles.highest.position > user.roles.highest.position) {
        const durConverted = durationConvert(duration);
        if (durConverted !== 0) {
            if (reason != null)
                user.send("`You've been muted on " + interaction.guild.name + " for " + reason + " lasting " + durationPrettier(duration) + "`");
            else
                user.send("`You've been muted on " + interaction.guild.name + " lasting " + durationPrettier(duration) + "`");
            if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
            if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
            guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].push("Mute " + new Date().toUTCString() + " for " + (reason ?? "unspecified") + " lasting " + durationPrettier(duration));
            guilds[interaction.guildId]["moderation"]["modlogs"][user.id].push({ "type": "mute", "time": new Date().getTime(), "duration": durConverted, "reason": reason });
            interaction.reply({ "ephemeral": true, content: user.toString() + " was muted for " + (reason ?? "unspecified") + " lasting " + durationPrettier(duration) });
            user.timeout(Math.min(durConverted, 604800000), reason);
        }
        else {
            interaction.reply("`Your duration was not >0. Please use the letters [ s=Seconds, m=Minutes, h=Hours, d=Days, w=Weeks, M=Months ] following an amount.`");
        }
    }
    else if (interaction.member.roles.highest.position > interaction.guild.members.cache.get(user).roles.highest.position) {
        interaction.reply("`You don't have permission to do that.`");
    }
    else {
        interaction.reply("`I don't have permission to do that.`");
    }
}, "unmute": function(user, reason, interaction, guilds) {
    if (reason != null)
        user.send("`You've been unmuted on " + interaction.guild.name + " for " + reason + ".`");
    else
        user.send("`You've been unmuted on " + interaction.guild.name + ".`");
        if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
        if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
    guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].push("Unmute " + new Date().toUTCString() + " for " + (reason ?? "unspecified"));
    interaction.reply({ "ephemeral": true, content: user.toString() + " was unmuted for " + (reason ?? "unspecified") });
    guilds[interaction.guildId]["moderation"]["modlogs"][user.id].push({ "type": "unmute", "time": new Date().getTime(), "reason": reason });
    user.timeout(null, reason);
}, "kick": function(user, reason, interaction, guilds) {
    if (user.bannable && interaction.member.roles.highest.position > user.roles.highest.position) {
        if (reason != null)
            user.send("`You've been kicked from " + interaction.guild.name + " for " + reason + ".`");
        else
            user.send("`You've been kicked from " + interaction.guild.name + ".`");
        if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
        if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
        guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].push("Kick " + new Date().toUTCString() + " for " + (reason ?? "unspecified"));
        guilds[interaction.guildId]["moderation"]["modlogs"][user.id].push({ "type": "kick", "time": new Date().getTime(), "reason": reason });
        interaction.reply({ "ephemeral": true, content: user.toString() + " was kicked for " + (reason ?? "unspecified") });
        user.kick(reason);
    }
    else if (interaction.member.roles.highest.position > interaction.guild.members.cache.get(user).roles.highest.position) {
        interaction.reply("`You don't have permission to do that.`");
    }
    else {
        interaction.reply("`I don't have permission to do that.`");
    }
}, "ban": function(user, duration, reason, interaction, guilds) {
    if (user.bannable && interaction.member.roles.highest.position > user.roles.highest.position) {
        if (duration === null) {
            if (reason != null)
                user.send("`You've been banned from " + interaction.guild.name + " for " + reason + " lasting forever.`");
            else
                user.send("`You've been banned from " + interaction.guild.name + " lasting forever.`");
                if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
                if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
            guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].push("Ban " + new Date().toUTCString() + " for " + (reason ?? "unspecified") + " lasting forever");
            guilds[interaction.guildId]["moderation"]["modlogs"][user.id].push({ "type": "ban", "time": new Date().getTime(), 
            "duration": -1, "reason": reason });
            interaction.reply({ "ephemeral": true, content: user.toString() + " was banned for " + (reason ?? "unspecified") + " lasting " + durationPrettier(duration) });
            interaction.guild.members.cache.get(user).ban();
        }
        else {
            const durConverted = durationConvert(duration);
            if (durConverted !== 0) {
                if (reason != null)
                    user.send("`You've been banned from " + interaction.guild.name + " for " + reason + " lasting " + durationPrettier(duration) + "`");
                else
                    user.send("`You've been banned from " + interaction.guild.name + " lasting " + durationPrettier(duration) + "`");
                    if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
                    if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
                guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].push("Mute " + new Date().toUTCString() + " for " + (reason ?? "unspecified") + " lasting " + durationPrettier(duration));
                guilds[interaction.guildId]["moderation"]["modlogs"][user.id].push({ "type": "ban", "time": new Date().getTime(), 
                "duration": durConverted, "reason": reason });
                interaction.reply({ "ephemeral": true, content: user.toString() + " was banned for " + (reason ?? "unspecified") });
                interaction.guild.members.cache.get(user).ban();
            }
            else {
                interaction.reply("`Your duration was not >0. Please use the letters [ s=Seconds, m=Minutes, h=Hours, d=Days, w=Weeks, M=Months ] following an amount.`");
            }
        }
    }
    else if (interaction.member.roles.highest.position > interaction.guild.members.cache.get(user).roles.highest.position) {
        interaction.reply("`You don't have permission to do that.`");
    }
    else {
        interaction.reply("`I don't have permission to do that.`");
    }
}, "unban": function(user, reason, interaction, guilds) {
    if (reason != null)
        user.send("`You've been unbanned on " + interaction.guild.name + " for " + reason + ".`");
    else
        user.send("`You've been unbanned on " + interaction.guild.name + "`");
        if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
        if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
    guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].push("Unban " + new Date().toUTCString() + " for " + (reason ?? "unspecified"));
    guilds[interaction.guildId]["moderation"]["modlogs"][user.id].push({ "type": "unban", "time": new Date().getTime(), "reason": reason });
    interaction.reply({ "ephemeral": true, content: user.toString() + " was unbanned for " + (reason ?? "unspecified") });
    interaction.guild.members.unban(user, reason);
}, "logs": function(user, interaction, guilds) {
    let total = user.username + "'s logs:\n";
    if (!guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id]) guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id] = [ ];
    if (!guilds[interaction.guildId]["moderation"]["modlogs"][user.id]) guilds[interaction.guildId]["moderation"]["modlogs"][user.id] = [ ];
    guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].forEach(log => total += log + "\n");
    if (guilds[interaction.guildId]["moderation"]["moderationLogs"][user.id].length === 0) total += "No Logs...";
    interaction.reply({ "ephemeral": true, "content": total.trim() });
} };