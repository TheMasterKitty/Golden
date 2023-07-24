const discord = require("discord.js");
const chalk = require("chalk");
const fs = require("fs");
const process = require("node:process");
const { count, countingMenu } = require("./modules/counting");
const { level, levelMenu } = require("./modules/levels");
const { ticket, ticketMenu } = require("./modules/tickets");
const { moderationMenu, warn, mute, unmute, kick, ban, unban, logs } = require("./modules/moderation");
const { automodMenu } = require("./modules/automod");
const { welcomeMenu } = require("./modules/welcomer");

process.on("unhandledRejection", async (reason, promise) => {
    console.log(chalk.red("Unhandled Rejection at: \n"), promise, "reason:", reason)
});
process.on("uncaughtException", async (error) => {
    console.log(chalk.red("Uncaught Exception: \n"), error);
});
process.on("uncaughtExceptionMonitor", async (error, origin) => {
    console.log(chalk.red("Uncaught Exception Monitor: \n"), error, origin);
});

const client = new discord.Client({ intents: [ discord.GatewayIntentBits.Guilds, discord.GatewayIntentBits.GuildMessages, discord.GatewayIntentBits.MessageContent, discord.GatewayIntentBits.GuildMessageReactions, discord.GatewayIntentBits.AutoModerationConfiguration, discord.GatewayIntentBits.GuildPresences, discord.GatewayIntentBits.GuildMembers, discord.GatewayIntentBits.GuildModeration ] });

if (!fs.existsSync("./guilds.json")) fs.writeFileSync("./guilds.json", "{}");
const guilds = JSON.parse(fs.readFileSync("./guilds.json").toString());

client.once(discord.Events.ClientReady, async () => {
    console.log(chalk.yellow("Successfully logged in as " + chalk.bold(client.user.username + "#" + client.user.discriminator)));
    client.user.setActivity( { name: `${client.guilds.cache.size} server${client.guilds.cache.size > 1 ? "s" : ""}`, type: 3 } );
    Object.keys(guilds).forEach(async guild => {
        if (guilds[guild]["tickets"]["enabled"] && guilds[guild]["tickets"]["openMsg"]) {
            try {
                (await client.guilds.cache.get(guild).channels.cache.get(guilds[guild]["tickets"]["openMsg"].split("/")[0]).messages.fetch(guilds[guild]["tickets"]["openMsg"].split("/")[1])).createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).on("collect", async i => { ticket(i, guilds); });
            }
            catch (ex) { guilds[guild]["tickets"]["openMsg"] = null; }
        }
    });
});

client.on(discord.Events.GuildCreate, (guild) => {
    guilds[guild.id] = { "counting": { "enabled": false, "channel": null, "lastNumber": 0, "noFail": false, "numbersOnly": true, "numbersOnlyFail": false, "lastCounter": null, "dupeCountingFail": false }, "leveling": { "enabled": false, "blacklistedChannels": [ ], "blacklistedRoles": [ ], "boostRoles": {}, "levelRoles": { }, "leaderboard": { }, "channel": null }, "tickets": { "enabled": false, "category": null, "openMsg": null, "accessRoles": [ ], "openingMsg": "Please describe your issue and wait patiently for a response." }, "moderation": { "enabled": true, "prefix": "!", "enableWarnings": true, "modlogs": { }, "moderationLogs": { } }, "automod": { "enabled": false, "allowChannels": [ ], "allowRoles": [ ], "blockedRolePings": [ ], "blockedRolePingsRule": null }, "welcome": { "enabled": true, "channel": null, "welcomeMsg": "Welcome <@> to the server!", "autoRoles": [ ] } };
    fs.writeFileSync("./guilds.json", JSON.stringify(guilds));
    client.user.setActivity( { name: `${client.guilds.cache.size} server${client.guilds.cache.size > 1 ? "s" : ""}`, type: 3 } );
});

client.on(discord.Events.GuildDelete, (guild) => {
    delete guilds[guild.id];
    fs.writeFileSync("./guilds.json", JSON.stringify(guilds));
});

client.on(discord.Events.GuildMemberUpdate, async (oldMember, newMember) => {
    let oldRole = false;
    let newRole = false;
    guilds[newMember.guild.id]["automod"]["blockedRolePings"].forEach(role => {
        if (newMember.roles.cache.has(role)) newRole = true;
        if (oldMember.roles.cache.has(role)) oldRole = true;
    })

    if (!guilds[newMember.guild.id]["automod"]["blockedRolePingsRule"] || !(await newMember.guild.autoModerationRules.fetch()).get(guilds[newMember.guild.id]["automod"]["blockedRolePingsRule"])) guilds[newMember.guild.id]["automod"]["blockedRolePingsRule"] = (await newMember.guild.autoModerationRules.create({ "name": "Golden Auto-Mod Block Role Member Pings", "exemptChannels": guilds[newMember.guild.id]["automod"]["allowChannels"], "exemptRoles": guilds[newMember.guild.id]["automod"]["allowRoles"], "enabled": true, "reason": "Automatic Golden Auto-Mod Rules", "eventType": 1, "triggerType": 1, "triggerMetadata": { "keywordFilter": [ "tOfYJiCD8OqBynub7SdTcHBBxn17zQ3" ] },"actions": [ { "type": 1, "metadata": { "durationSeconds": 5, "customMessage": "This message was prevented by Golden Bot's automoderation blocking you from pinging this member." } } ] })).id;
    const rule = (await newMember.guild.autoModerationRules.fetch()).get(guilds[newMember.guild.id]["automod"]["blockedRolePingsRule"]);
    
    if (guilds[newMember.guild.id]["automod"]["enabled"] && newRole && !oldRole) {
        let oldFilter = rule.triggerMetadata.keywordFilter;
        oldFilter.push("*<@" + newMember.id + ">*");
        rule.setKeywordFilter(oldFilter);
    }
    else if (guilds[newMember.guild.id]["automod"]["enabled"] && !newRole && oldRole) {
        let oldFilter = rule.triggerMetadata.keywordFilter;
        oldFilter.splice(oldFilter.indexOf("*<@" + newMember.id + ">*"), 1);
        rule.setKeywordFilter(oldFilter);
    }
});

client.on(discord.Events.GuildMemberAdd, (member) => {
    if (guilds[member.guild.id]["welcome"]["enabled"]) {
        if (guilds[member.guild.id]["welcome"]["channel"]) member.guild.channels.cache.get(guilds[member.guild.id]["welcome"]["channel"]).send(guilds[member.guild.id]["welcome"]["welcomeMsg"].replaceAll("<@>", member.toString()));
        member.roles.set(guilds[member.guild.id]["welcome"]["autoRoles"], "Golden Bot Auto-Roles");
    }
});

client.on(discord.Events.MessageCreate, async (interaction) => {
    if (interaction.author.bot) return;
    
    if (interaction.content.startsWith(guilds[interaction.guildId]["moderation"]["prefix"])) {
        const cmd = interaction.content.substring(guilds[interaction.guildId]["moderation"]["prefix"].length).trim().split(" ")[0];
        const args = interaction.content.substring(guilds[interaction.guildId]["moderation"]["prefix"].length + cmd.length + 1).trim().split(" ");
        if (cmd === "warn" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.ModerateMembers)) {
            if (args.length >= 2) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    warn(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args.splice(1, args.length - 1).join(" "), interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    warn(interaction.guild.members.cache.get(args[0]), args[1], interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `warn (userid/mention) (reason)`");
                }
            }
            else {
                interaction.reply("Command usage: `warn (userid/mention) (reason)`");
            }
        }
        else if (cmd === "mute" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.ModerateMembers)) {
            if (args.length >= 2) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].length - 1))) {
                    mute(interaction.guild.members.cache.get(args[0].substring(2, args[0].length - 1)), args[1], args.splice(2, args.length - 2).join(" "), interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    mute(interaction.guild.members.cache.get(args[0]), args[1], args.splice(2, args.length - 2).join(" "), interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `mute (userid/mention) (duration) [reason]`");
                }
            }
            else {
                interaction.reply("Command usage: `mute (userid/mention) (duration) [reason]`");
            }
        }
        else if (cmd === "unmute" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.ModerateMembers)) {
            if (args.length >= 1) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    unmute(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args.splice(1, args.length - 1).join(" "), interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    unmute(interaction.guild.members.cache.get(args[0]), args.splice(1, args.length - 1).join(" "), interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `unmute (userid/mention) [reason]`");
                }
            }
            else {
                interaction.reply("Command usage: `unmute (userid/mention) [reason]`");
            }
        }
        else if (cmd === "kick" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.KickMembers)) {
            if (args.length >= 1) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    kick(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args.splice(1, args.length - 1).join(" "), interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    kick(interaction.guild.members.cache.get(args[0]), args.splice(1, args.length - 1).join(" "), interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `kick (userid/mention) [reason]`");
                }
            }
            else {
                interaction.reply("Command usage: `kick (userid/mention) [reason]`");
            }
        }
        else if (cmd === "ban" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.BanMembers)) {
            if (args.length == 1) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    ban(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args[1], args[2], interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    ban(interaction.guild.members.cache.get(args[0]), args[1], args[2], interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `ban (userid/mention) [duration] [reason]`");
                }
            }
            else if (args.length == 2 && !isNaN(parseInt(args[2][0]))) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    ban(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args[1], args[2], interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    ban(interaction.guild.members.cache.get(args[0]), args[1], args[2], interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `ban (userid/mention) [duration] [reason]`");
                }
            }
            else if (args.length >= 2 && !isNaN(parseInt(args[2][0]))) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    ban(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args[1], args.splice(2, args.length - 2).join(" "), interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    ban(interaction.guild.members.cache.get(args[0]), args[1], args.splice(2, args.length - 2).join(" "), interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `ban (userid/mention) [duration] [reason]`");
                }
            }
            else if (args.length >= 2) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    ban(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), null, args.splice(1, args.length - 1).join(" "), interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    ban(interaction.guild.members.cache.get(args[0]), null, args.splice(1, args.length - 1).join(" "), interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `ban (userid/mention) [duration] [reason]`");
                }
            }
            else {
                interaction.reply("Command usage: `ban (userid/mention) [duration] [reason]`");
            }
        }
        else if (cmd === "unban" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.BanMembers)) {
            if (args.length === 1 || args.length === 2) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    unban(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args[1], interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    unban(interaction.guild.members.cache.get(args[0]), args[1], interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `unban (userid/mention) [reason]`");
                }
            }
            else {
                interaction.reply("Command usage: `unban (userid/mention) [reason]`");
            }
        }
        else if (cmd === "logs" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.ModerateMembers)) {
            if (args.length == 1) {
                if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                    logs(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)).user, interaction, guilds);
                }
                else if (interaction.guild.members.cache.get(args[0])) {
                    logs(interaction.guild.members.cache.get(args[0]).user, interaction, guilds);
                }
                else {
                    interaction.reply("Command usage: `logs (userid/mention)`");
                }
            }
            else {
                interaction.reply("Command usage: `logs (userid/mention)`");
            }
        }
    }
    else if (guilds[interaction.guildId]["leveling"]["enabled"] && !guilds[interaction.guildId]["leveling"]["blacklistedChannels"].includes(interaction.channelId))
        level(interaction, guilds);
    if (guilds[interaction.guildId]["counting"]["enabled"] && guilds[interaction.guildId]["counting"]["channel"] === interaction.channelId)
        count(interaction, guilds);
    fs.writeFileSync("./guilds.json", JSON.stringify(guilds));
});

function selectorPage(interaction) {
    const menu = new discord.ActionRowBuilder()
    .addComponents(
        new discord.StringSelectMenuBuilder()
        .setCustomId("module")
        .setPlaceholder("No Module Selected")
        .addOptions(
            {
                "label": "Close Pop-Up",
                "description": "Close this menu",
                "value": "-1"
            },
            {
                "label": "Counting",
                "description": "Manage the counting module",
                "value": "1"
            },
            {
                "label": "Leveling",
                "description": "Manage the leveling module",
                "value": "2"
            },
            {
                "label": "Tickets",
                "description": "Manage the tickets module",
                "value": "3"
            },
            {
                "label": "Moderation",
                "description": "Manage the moderation module",
                "value": "4"
            },
            {
                "label": "AutoMod",
                "description": "Manage the automod module",
                "value": "5"
            },
            {
                "label": "Welcomer",
                "description": "Manage the welcomer module",
                "value": "6"
            }
        )
    );

    if (interaction.message && interaction.message.deletable) interaction.message.delete();
    interaction.channel.send({ "content": "`Select a module to manage using the combo-box below.`", "components": [ menu ] });
}

client.on(discord.Events.InteractionCreate, async (interaction) => {
    if (interaction.isStringSelectMenu()) {
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
        const selection = interaction.customId;
        if (interaction.values[0] === "-1" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            (await interaction.reply("`Closing...`")).delete();
            interaction.message.delete();
        }
        else if (selection === "module" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "1") {
                countingMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "2") {
                levelMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "3") {
                ticketMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "4") {
                moderationMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "5") {
                automodMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "6") {
                welcomeMenu(guilds, interaction);
            }
        }
        else if (selection === "countingProperty" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                selectorPage(interaction);
            }
            else if (interaction.values[0] === "1") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["counting"]["enabled"] ? "Disable" : "Enable") + " Counting")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["counting"]["enabled"] = !guilds[interaction.guildId]["counting"]["enabled"];
                    }
                    
                    countingMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];
                const channels = interaction.guild.channels.cache.filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size; i += 24) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("countingChannel" + (i / 24))
                    .setPlaceholder("No Channel Selected")
                    .addOptions(
                        {
                            "label": "Go Back",
                            "description": "Go back to the Property Selection page",
                            "value": "0"
                        }
                    );

                    for (let i2 = i; i2 < Math.min(channels.size, i + 24); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildText) {
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                        }
                    }
                    
                    menu.addComponents(selectionBuilder);
                    menus.push(menu);
                }

                interaction.message.delete();
                interaction.channel.send({ "content": "`Select a channel for counting`", "components": menus });
            }
            else if (interaction.values[0] === "3") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["counting"]["noFail"] ? "Disable" : "Enable") + " No-Fail Mode")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["counting"]["noFail"] = !guilds[interaction.guildId]["counting"]["noFail"];
                    }
                    
                    countingMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "4") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["counting"]["numbersOnly"] ? "Disable" : "Enable") + " Numbers Only")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["counting"]["numbersOnly"] = !guilds[interaction.guildId]["counting"]["numbersOnly"];
                    }
                    countingMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "5") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["counting"]["numbersOnlyFail"] ? "Disable" : "Enable") + " Numbers Only Failure")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["counting"]["numbersOnlyFail"] = !guilds[interaction.guildId]["counting"]["numbersOnlyFail"];
                    }
                    countingMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "6") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["counting"]["dupeCountingFail"] ? "Disable" : "Enable") + " Duplicate Counting Failure")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["counting"]["dupeCountingFail"] = !guilds[interaction.guildId]["counting"]["dupeCountingFail"];
                    }
                    countingMenu(guilds, i);
                });
            }
        }
        else if (selection.startsWith("countingChannel") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] !== "0") {
                guilds[interaction.guildId]["counting"]["channel"] = interaction.values[0];
            }
            countingMenu(guilds, interaction);
        }
        else if (selection === "levelingProperty" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                selectorPage(interaction);
            }
            else if (interaction.values[0] === "1") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["leveling"]["enabled"] ? "Disable" : "Enable") + " Leveling")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["leveling"]["enabled"] = !guilds[interaction.guildId]["leveling"]["enabled"];
                    }
                    
                    levelMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];
                const channels = interaction.guild.channels.cache.filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size; i += 25) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("levelingChannel" + (i / 25))
                    .setPlaceholder("No Channel Selected")
                    .addOptions(
                        {
                            "label": "Go Back",
                            "description": "Go back to the Property Selection page",
                            "value": "0"
                        }
                    );

                    for (let i2 = i; i2 < Math.min(channels.size, i + 25); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildText) {
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                        }
                    }
                    
                    menu.addComponents(selectionBuilder);
                    menus.push(menu);
                }

                interaction.message.delete();
                interaction.channel.send({ "content": "`Select a channel for level-ups`", "components": menus });
            }
            else if (interaction.values[0] === "3") {
                const menu = new discord.ActionRowBuilder();
                const menu2 = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("blacklistChannels")
                .setPlaceholder("No Channel Selected");

                let on = 0;
                interaction.guild.channels.cache.forEach(channel => {
                    if (channel.type !== discord.ChannelType.GuildCategory)
                    if (guilds[interaction.guildId]["leveling"]["blacklistedChannels"].includes(channel.id))
                        selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                    else
                        selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id });
                    on++;
                });
                
                selectionBuilder.setMinValues(0);
                selectionBuilder.setMaxValues(on);
                
                menu.addComponents(selectionBuilder);
                interaction.message.delete();
                interaction.channel.send({ "content": "`Select channels to blacklist XP gains in`", "components": [ menu, menu2 ] });
            }
            else if (interaction.values[0] === "4") {
                const menu = new discord.ActionRowBuilder();
                const menu2 = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("blacklistRoles")
                .setPlaceholder("No Roles Selected");

                let on = 0;
                interaction.guild.roles.cache.forEach(channel => {
                    if (guilds[interaction.guildId]["leveling"]["blacklistedRoles"].includes(channel.id))
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                    else
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), value: channel.id });
                    on++;
                });
                
                selectionBuilder.setMinValues(0);
                selectionBuilder.setMaxValues(on);
                
                menu.addComponents(selectionBuilder);
                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select roles to blacklist XP gains`", "components": [ menu, menu2 ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                });
            }
            else if (interaction.values[0] === "5") {
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        i.message.delete();
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterCreate")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to use to create a booster`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterDelete")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
            else if (interaction.values[0] === "6") {
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelCreate")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to use to create a level role`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelDelete")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
        }
        else if (selection.startsWith("levelingChannel") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] !== "0")
                guilds[interaction.guildId]["leveling"]["channel"] = interaction.values[0];
            levelMenu(guilds, interaction);
        }
        else if (selection === "blacklistChannels" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            guilds[interaction.guildId]["leveling"]["blacklistedChannels"] = interaction.values;
            
            levelMenu(guilds, interaction);
        }
        else if (selection === "blacklistRoles" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            guilds[interaction.guildId]["leveling"]["blacklistedRoles"] = interaction.values;
            
            levelMenu(guilds, interaction);
        }
        else if (selection === "boosterCreate" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterCreate")
                        .setPlaceholder("No Role Selected");

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to use to create a booster`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterDelete")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
            else {
                const modal = new discord.ModalBuilder()
                .setCustomId('boostpercent')
                .setTitle('Set Boost %');

                const input = new discord.TextInputBuilder()
                .setCustomId("boost")
                .setMaxLength(3)
                .setMinLength(1)
                .setLabel('Boost percentage (integer)')
                .setStyle(1);

                modal.addComponents(new discord.ActionRowBuilder().addComponents(input));
                
                await interaction.showModal(modal);

                const submitted = await interaction.awaitModalSubmit({
                    time: 60000,
                    filter: i => i.user.id === interaction.user.id,
                  }).catch(error => {
                    console.error(error);
                    return null;
                });

                if (submitted) {
                    const input = submitted.fields.getTextInputValue("boost");
                    if (!isNaN(parseInt(input))) {
                        guilds[interaction.guildId]["leveling"]["boostRoles"][interaction.values[0]] = parseInt(input);
                    }
                
                    (await submitted.reply("`Closing...`")).delete();
                }
                
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterCreate")
                        .setPlaceholder("No Role Selected");

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to use to create a booster`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterDelete")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
        }
        else if (selection === "boosterDelete" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Booster")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, interaction);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterCreate")
                        .setPlaceholder("No Role Selected");

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).includes(role.id) && role.id !== interaction.guild.roles.everyone.id) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to use to create a booster`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("boosterDelete")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
            else {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("Yes")
                    .setStyle(discord.ButtonStyle.Danger),
                    new discord.ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                        
                const reply = await interaction.channel.send({ "ephemeral": true, "content": "`Are you sure you want to delete the boost of " + interaction.guild.roles.cache.get(interaction.values[0]).name + "?`", "components": [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "confirm") {
                        delete guilds[interaction.guildId]["leveling"]["boostRoles"][interaction.values[0]];
                    }
                    const menu = new discord.ActionRowBuilder()
                    .addComponents(
                        new discord.ButtonBuilder()
                        .setCustomId("create")
                        .setLabel("Create Booster")
                        .setStyle(discord.ButtonStyle.Primary),
                        new discord.ButtonBuilder()
                        .setCustomId("delete")
                        .setLabel("Delete Booster")
                        .setStyle(discord.ButtonStyle.Primary),
                        new discord.ButtonBuilder()
                        .setCustomId("back")
                        .setLabel("Go Back")
                        .setStyle(discord.ButtonStyle.Secondary)
                    );

                    interaction.message.delete();
                    const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                    reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                        if (i.customId === "back") {
                            levelMenu(guilds, i);
                        }
                        else if (i.customId === "create") {
                            const menu = new discord.ActionRowBuilder()
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("boosterCreate")
                            .setPlaceholder("No Role Selected");

                            interaction.guild.roles.cache.forEach(role => {
                                if (!Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                            });

                            menu.addComponents(selectionBuilder);
                            
                            i.message.delete();
                            interaction.channel.send({ "content": "`Select which role you'd like to use to create a booster`", "components": [ menu ] });
                        }
                        else if (i.customId === "delete") {
                            const menu = new discord.ActionRowBuilder()
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("boosterDelete")
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Module Selection page",
                                    "value": "0"
                                }
                            );

                            Object.keys(guilds[interaction.guildId]["leveling"]["boostRoles"]).forEach(roleID => {
                                selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                            });

                            menu.addComponents(selectionBuilder);
                            
                            i.message.delete();
                            interaction.channel.send({ "content": "`Select which role you'd like to delete`", "components": [ menu ] });
                        }
                    });
                    interaction.replied = true;
                });
            }
        }
        else if (selection === "levelCreate" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelCreate")
                        .setPlaceholder("No Role Selected");

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which role you'd like to use to create a level role`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelDelete")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which level role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
            else {
                const modal = new discord.ModalBuilder()
                .setCustomId('levelreq')
                .setTitle('Set Required Level');

                const input = new discord.TextInputBuilder()
                .setCustomId("level")
                .setMaxLength(3)
                .setMinLength(1)
                .setLabel('Level required (integer)')
                .setStyle(1);

                modal.addComponents(new discord.ActionRowBuilder().addComponents(input));
                
                await interaction.showModal(modal);
                
                const submitted = await interaction.awaitModalSubmit({
                    time: 60000,
                    filter: i => i.user.id === interaction.user.id,
                  }).catch(error => {
                    console.error(error);
                    return null;
                });
                if (submitted) {
                    const input = submitted.fields.getTextInputValue("level");
                    if (!isNaN(parseInt(input))) {
                        guilds[interaction.guildId]["leveling"]["levelRoles"][interaction.values[0]] = parseInt(input);
                    }
                
                    (await submitted.reply("`Closing...`")).delete();
                }
                
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelCreate")
                        .setPlaceholder("No Role Selected");

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which level role you'd like to use to create a level role`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelCreate")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which level role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
        }
        else if (selection === "levelDelete" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                const menu = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("create")
                    .setLabel("Create Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("delete")
                    .setLabel("Delete Level Role")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelCreate")
                        .setPlaceholder("No Role Selected");

                        interaction.guild.roles.cache.forEach(role => {
                            if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which level role you'd like to use to create a level role`", "components": [ menu ] });
                    }
                    else if (i.customId === "delete") {
                        const menu = new discord.ActionRowBuilder()
                        const selectionBuilder = new discord.StringSelectMenuBuilder()
                        .setCustomId("levelDelete")
                        .setPlaceholder("No Role Selected")
                        .addOptions(
                            {
                                "label": "Go Back",
                                "description": "Go back to the Module Selection page",
                                "value": "0"
                            }
                        );

                        Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(roleID => {
                            selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                        });

                        menu.addComponents(selectionBuilder);
                        
                        i.message.delete();
                        interaction.channel.send({ "content": "`Select which level role you'd like to delete`", "components": [ menu ] });
                    }
                });
            }
            else {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("Yes")
                    .setStyle(discord.ButtonStyle.Danger),
                    new discord.ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                        
                const reply = await interaction.channel.send({ "ephemeral": true, "content": "`Are you sure you want to delete the level role of " + interaction.guild.roles.cache.get(interaction.values[0]).name + "?`", "components": [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "confirm") {
                        delete guilds[interaction.guildId]["leveling"]["levelRoles"][interaction.values[0]];
                    }
                    const menu = new discord.ActionRowBuilder()
                    .addComponents(
                        new discord.ButtonBuilder()
                        .setCustomId("create")
                        .setLabel("Create Level Role")
                        .setStyle(discord.ButtonStyle.Primary),
                        new discord.ButtonBuilder()
                        .setCustomId("delete")
                        .setLabel("Delete Level Role")
                        .setStyle(discord.ButtonStyle.Primary),
                        new discord.ButtonBuilder()
                        .setCustomId("back")
                        .setLabel("Go Back")
                        .setStyle(discord.ButtonStyle.Secondary)
                    );

                    interaction.message.delete();
                    const reply = await interaction.channel.send({ "content": "`Click an option below`", "components": [ menu ] });
                    reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                        if (i.customId === "back") {
                            levelMenu(guilds, i);
                        }
                        else if (i.customId === "create") {
                            const menu = new discord.ActionRowBuilder()
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("levelCreate")
                            .setPlaceholder("No Role Selected");

                            interaction.guild.roles.cache.forEach(role => {
                                if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                            });

                            menu.addComponents(selectionBuilder);
                            
                            i.message.delete();
                            interaction.channel.send({ "content": "`Select which role you'd like to use to create a level role`", "components": [ menu ] });
                        }
                        else if (i.customId === "delete") {
                            const menu = new discord.ActionRowBuilder()
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("levelDelete")
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Module Selection page",
                                    "value": "0"
                                }
                            );

                            Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(roleID => {
                                selectionBuilder.addOptions({ "label": interaction.guild.roles.cache.get(roleID).name.substring(0, 50), "value": roleID });
                            });

                            menu.addComponents(selectionBuilder);
                            
                            i.message.delete();
                            interaction.channel.send({ "content": "`Select which level role you'd like to delete`", "components": [ menu ] });
                        }
                    });
                    interaction.replied = true;
                });
            }
        }
        else if (selection === "ticketsProperty" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                selectorPage(interaction);
            }
            else if (interaction.values[0] === "1") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["tickets"]["enabled"] ? "Disable" : "Enable") + " Tickets")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["tickets"]["enabled"] = !guilds[interaction.guildId]["tickets"]["enabled"];
                    }
                    
                    ticketMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menu = new discord.ActionRowBuilder();
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("ticketsCategory")
                .setPlaceholder("No Category Selected")
                .addOptions(
                    {
                        "label": "Go Back",
                        "description": "Go back to the Property Selection page",
                        "value": "0"
                    }
                );

                interaction.guild.channels.cache.forEach(channel => {
                    if (channel.type === discord.ChannelType.GuildCategory) {
                        selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                    }
                });
                
                menu.addComponents(selectionBuilder);
                interaction.message.delete();
                interaction.channel.send({ "content": "`Select a category for opened tickets`", "components": [ menu ] });
            }
            else if (interaction.values[0] === "3") {
                const menu = new discord.ActionRowBuilder();
                const menu2 = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("accessRoles")
                .setPlaceholder("No Roles Selected");

                let on = 0;
                interaction.guild.roles.cache.forEach(channel => {
                    if (guilds[interaction.guildId]["tickets"]["accessRoles"].includes(channel.id))
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                    else
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), value: channel.id });
                    on++;
                });
                
                selectionBuilder.setMinValues(0);
                selectionBuilder.setMaxValues(on);
                
                menu.addComponents(selectionBuilder);
                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select roles to allow in all tickets`", "components": [ menu, menu2 ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        ticketMenu(guilds, i);
                    }
                });
            }
            else if (interaction.values[0] === "4") {
                const modal = new discord.ModalBuilder()
                .setCustomId('openingmsg')
                .setTitle('Set Opening Message');

                const input = new discord.TextInputBuilder()
                .setCustomId("msg")
                .setMinLength(1)
                .setLabel('Opening Message')
                .setValue(guilds[interaction.guildId]["tickets"]["openingMsg"])
                .setStyle(2);

                modal.addComponents(new discord.ActionRowBuilder().addComponents(input));
                
                await interaction.showModal(modal);

                const submitted = await interaction.awaitModalSubmit({
                    time: 60000,
                    filter: i => i.user.id === interaction.user.id,
                  }).catch(error => {
                    console.error(error);
                    return null;
                });

                if (submitted) {
                    guilds[interaction.guildId]["tickets"]["openingMsg"] = submitted.fields.getTextInputValue("msg");

                    (await submitted.reply("`Closing...`")).delete();
                }
                
                ticketMenu(guilds, interaction);
            }
        }
        else if (selection === "moderationProperty" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                selectorPage(guilds, interaction);
            }
            else if (interaction.values[0] === "1") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["moderation"]["enabled"] ? "Disable" : "Enable") + " Moderation")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["moderation"]["enabled"] = !guilds[interaction.guildId]["moderation"]["enabled"];
                    }
                    
                    moderationMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const modal = new discord.ModalBuilder()
                .setCustomId('prefix')
                .setTitle('Set Prefix');

                const input = new discord.TextInputBuilder()
                .setCustomId("prefix")
                .setMinLength(1)
                .setMaxLength(1)
                .setLabel("Prefix (use '<' for a mention of the bot)")
                .setValue(guilds[interaction.guildId]["moderation"]["prefix"])
                .setStyle(1);
                modal.addComponents(new discord.ActionRowBuilder().addComponents(input));
                
                await interaction.showModal(modal);

                const submitted = await interaction.awaitModalSubmit({
                    time: 60000,
                    filter: i => i.user.id === interaction.user.id,
                  }).catch(error => {
                    console.error(error);
                    return null;
                });

                if (submitted) {
                    guilds[interaction.guildId]["moderation"]["prefix"] = submitted.fields.getTextInputValue("prefix") === "<" ? "<@" + client.user.id + ">" : submitted.fields.getTextInputValue("prefix");
                
                    (await submitted.reply("`Closing...`")).delete();
                }
                
                moderationMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "3") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["moderation"]["enableWarnings"] ? "Disable" : "Enable") + " Warnings")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["moderation"]["enableWarnings"] = !guilds[interaction.guildId]["moderation"]["enableWarnings"];
                    }
                    
                    moderationMenu(guilds, i);
                });
            }
        }
        else if (selection === "accessRoles" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            guilds[interaction.guildId]["tickets"]["accessRoles"] = interaction.values;
            
            ticketMenu(guilds, interaction);
        }
        else if (selection === "ticketsCategory" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] !== "0") {
                guilds[interaction.guildId]["tickets"]["category"] = interaction.values[0];
            }
            ticketMenu(guilds, interaction);
        }

        else if (selection === "automodProperty" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                selectorPage(interaction);
            }
            else if (interaction.values[0] === "1") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["automod"]["enabled"] ? "Disable" : "Enable") + " AutoMod")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["automod"]["enabled"] = !guilds[interaction.guildId]["automod"]["enabled"];
                    }
                    
                    automodMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menu = new discord.ActionRowBuilder();
                const menu2 = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("allowChannels")
                .setPlaceholder("No Channel Selected");

                let on = 0;
                interaction.guild.channels.cache.forEach(channel => {
                    if (channel.type !== discord.ChannelType.GuildCategory) {
                        if (guilds[interaction.guildId]["automod"]["allowChannels"].includes(channel.id))
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                        else
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id });
                    }
                    on++;
                });
                
                selectionBuilder.setMinValues(0);
                selectionBuilder.setMaxValues(on);
                
                menu.addComponents(selectionBuilder);
                interaction.message.delete();
                interaction.channel.send({ "content": "`Select channels to allow automod bypassing in`", "components": [ menu, menu2 ] });
            }
            else if (interaction.values[0] === "3") {
                const menu = new discord.ActionRowBuilder();
                const menu2 = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("allowRoles")
                .setPlaceholder("No Roles Selected");

                let on = 0;
                interaction.guild.roles.cache.forEach(channel => {
                    if (guilds[interaction.guildId]["automod"]["allowRoles"].includes(channel.id))
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                    else
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), value: channel.id });
                    on++;
                });
                
                selectionBuilder.setMinValues(0);
                selectionBuilder.setMaxValues(on);
                
                menu.addComponents(selectionBuilder);
                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select roles to allow automod bypassing with.`", "components": [ menu, menu2 ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        automodMenu(guilds, i);
                    }
                });
            }
            else if (interaction.values[0] === "4") {
                const menu = new discord.ActionRowBuilder();
                const menu2 = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("blockRolePings")
                .setPlaceholder("No Roles Selected");

                let on = 0;
                interaction.guild.roles.cache.forEach(channel => {
                    if (guilds[interaction.guildId]["automod"]["blockedRolePings"].includes(channel.id))
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                    else
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), value: channel.id });
                    on++;
                });
                
                selectionBuilder.setMinValues(0);
                selectionBuilder.setMaxValues(2);
                
                menu.addComponents(selectionBuilder);

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select roles to block pinging users of`", "components": [ menu, menu2 ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        automodMenu(guilds, i);
                    }
                });
            }
        }
        else if (selection === "allowChannels" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (!guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]) guilds[interaction.guildId]["automod"]["blockedRolePingsRule"] = (await interaction.guild.autoModerationRules.create({ "name": "Golden Auto-Mod Block Role Member Pings", "exemptChannels": guilds[interaction.guildId]["automod"]["allowChannels"], "exemptRoles": guilds[interaction.guildId]["automod"]["allowRoles"], "enabled": true, "reason": "Automatic Golden Auto-Mod Rules", "eventType": 1, "triggerType": 1, "triggerMetadata": { "keywordFilter": [ "tOfYJiCD8OqBynub7SdTcHBBxn17zQ3" ] },"actions": [ { "type": 1, "metadata": { "durationSeconds": 5, "customMessage": "This message was prevented by Golden Bot's automoderation blocking you from pinging this member." } } ] })).id;
            
            guilds[interaction.guildId]["automod"]["allowChannels"] = interaction.values;

            (await interaction.guild.autoModerationRules.fetch()).get(guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]).setExemptChannels(guilds[interaction.guildId]["automod"]["allowChannels"]);

            automodMenu(guilds, interaction);
        }
        else if (selection === "allowRoles" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (!guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]) guilds[interaction.guildId]["automod"]["blockedRolePingsRule"] = (await interaction.guild.autoModerationRules.create({ "name": "Golden Auto-Mod Block Role Member Pings", "exemptChannels": guilds[interaction.guildId]["automod"]["allowChannels"], "exemptRoles": guilds[interaction.guildId]["automod"]["allowRoles"], "enabled": true, "reason": "Automatic Golden Auto-Mod Rules", "eventType": 1, "triggerType": 1, "triggerMetadata": { "keywordFilter": [ "tOfYJiCD8OqBynub7SdTcHBBxn17zQ3" ] },"actions": [ { "type": 1, "metadata": { "durationSeconds": 5, "customMessage": "This message was prevented by Golden Bot's automoderation blocking you from pinging this member." } } ] })).id;
        
            guilds[interaction.guildId]["automod"]["allowRoles"] = interaction.values;

            (await interaction.guild.autoModerationRules.fetch()).get(guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]).setExemptRoles(guilds[interaction.guildId]["automod"]["allowRoles"]);
            
            automodMenu(guilds, interaction);
        }
        else if (selection === "blockRolePings" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (!guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]) guilds[interaction.guildId]["automod"]["blockedRolePingsRule"] = (await interaction.guild.autoModerationRules.create({ "name": "Golden Auto-Mod Block Role Member Pings", "exemptChannels": guilds[interaction.guildId]["automod"]["allowChannels"], "exemptRoles": guilds[interaction.guildId]["automod"]["allowRoles"], "enabled": true, "reason": "Automatic Golden Auto-Mod Rules", "eventType": 1, "triggerType": 1, "triggerMetadata": { "keywordFilter": [ "tOfYJiCD8OqBynub7SdTcHBBxn17zQ3" ] },"actions": [ { "type": 1, "metadata": { "durationSeconds": 5, "customMessage": "This message was prevented by Golden Bot's automoderation blocking you from pinging this member." } } ] })).id;
            
            const rule = (await interaction.guild.autoModerationRules.fetch()).get(guilds[interaction.guild.id]["automod"]["blockedRolePingsRule"]);

            interaction.values.forEach(async val => {
                if (!guilds[interaction.guildId]["automod"]["blockedRolePings"].includes(val)) {
                    interaction.guild.roles.cache.get(val).members.forEach(mem => {
                        let oldFilter = rule.triggerMetadata.keywordFilter;
                        oldFilter.push("*<@" + mem.id + ">*", 1);
                        rule.setKeywordFilter(oldFilter);
                    });
                }
                else {
                    interaction.guild.roles.cache.get(val).members.forEach(mem => {
                        let oldFilter = rule.triggerMetadata.keywordFilter;
                        oldFilter.splice(oldFilter.indexOf("*<@" + mem.id + ">*"), 1);
                        rule.setKeywordFilter(oldFilter);
                    });
                }
            });
            
            guilds[interaction.guildId]["automod"]["blockedRolePings"] = interaction.values;

            automodMenu(guilds, interaction);
        }
        else if (selection === "welcomeProperty" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] === "0") {
                selectorPage(interaction);
            }
            else if (interaction.values[0] === "1") {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("toggle")
                    .setLabel((guilds[interaction.guildId]["welcome"]["enabled"] ? "Disable" : "Enable") + " Welcomer")
                    .setStyle(discord.ButtonStyle.Primary),
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select an option:`", components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["welcome"]["enabled"] = !guilds[interaction.guildId]["welcome"]["enabled"];
                    }
                    
                    welcomeMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];
                const channels = interaction.guild.channels.cache.filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size; i += 25) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("welcomeChannel" + (i / 25))
                    .setPlaceholder("No Channel Selected")
                    .addOptions(
                        {
                            "label": "Go Back",
                            "description": "Go back to the Property Selection page",
                            "value": "0"
                        }
                    );

                    for (let i2 = i; i2 < Math.min(channels.size, i + 25); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildText) {
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                        }
                    }
                    
                    menu.addComponents(selectionBuilder);
                    menus.push(menu);
                }

                interaction.message.delete();
                interaction.channel.send({ "content": "`Select a channel for welcoming`", "components": menus });
            }
            else if (interaction.values[0] === "3") {
                const modal = new discord.ModalBuilder()
                .setCustomId('welcomemsg')
                .setTitle('Set Welcome Message');

                const input = new discord.TextInputBuilder()
                .setCustomId("msg")
                .setMinLength(1)
                .setLabel('Welcome Message (<@> = mention user)')
                .setValue(guilds[interaction.guildId]["welcome"]["welcomeMsg"])
                .setStyle(2);

                modal.addComponents(new discord.ActionRowBuilder().addComponents(input));
                
                await interaction.showModal(modal);

                const submitted = await interaction.awaitModalSubmit({
                    time: 60000,
                    filter: i => i.user.id === interaction.user.id,
                  }).catch(error => {
                    console.error(error);
                    return null;
                });

                if (submitted) {
                    guilds[interaction.guildId]["welcome"]["welcomeMsg"] = submitted.fields.getTextInputValue("msg");

                    (await submitted.reply("`Closing...`")).delete();
                }
                
                welcomeMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "4") {
                const menu = new discord.ActionRowBuilder();
                const menu2 = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                
                const selectionBuilder = new discord.StringSelectMenuBuilder()
                .setCustomId("welcomeAutoRoles")
                .setPlaceholder("No Roles Selected");

                let on = 0;
                interaction.guild.roles.cache.forEach(channel => {
                    if (guilds[interaction.guildId]["welcome"]["autoRoles"].includes(channel.id))
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                    else
                        selectionBuilder.addOptions({ "label": "@" + channel.name.substring(0, 49), value: channel.id });
                    on++;
                });
                
                selectionBuilder.setMinValues(0);
                selectionBuilder.setMaxValues(2);
                
                menu.addComponents(selectionBuilder);

                interaction.message.delete();
                const reply = await interaction.channel.send({ "content": "`Select roles to automatically give users`", "components": [ menu, menu2 ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        welcomeMenu(guilds, i);
                    }
                });
            }
        }
        else if (selection === "welcomeAutoRoles" && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            guilds[interaction.guildId]["welcome"]["autoRoles"] = interaction.values;

            welcomeMenu(guilds, interaction);
        }
        else if (selection.startsWith("welcomeChannel") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] !== "0") {
                guilds[interaction.guildId]["welcome"]["channel"] = interaction.values[0];
            }
            welcomeMenu(guilds, interaction);
        }
        else if (!interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            interaction.reply({ "ephemeral": true, content: "`You do not have permission to use this.`" })
        }
    }
    else if (interaction.isChatInputCommand()) {
        const command = interaction.commandName;
        if (command.startsWith("counting")) {
            if (guilds[interaction.guildId]["counting"]["enabled"] && guilds[interaction.guildId]["counting"]["channel"]) {
                if (command == "countingreset") {
                    guilds[interaction.guildId]["counting"]["lastNumber"] = 0;
                    interaction.reply({ ephemeral: true, content: "`Counting reset successfully.`" });
                    await interaction.guild.channels.cache.get(guilds[interaction.guildId]["counting"]["channel"]).send("`The count has been reset. The next number is 1.`");
                }
                else if (command == "countingoptions") {
                    interaction.reply({ ephemeral: true, content: "Counting channel: <#" + guilds[interaction.guildId]["counting"]["channel"].toString() + ">\nNo-Fail Mode: " + (guilds[interaction.guildId]["counting"]["noFail"] ? "on" : "off" ) + "\nNumbers Only: " + (guilds[interaction.guildId]["counting"]["numbersOnly"] ? "on" : "off") + "\nFail on non-number: " + (guilds[interaction.guildId]["counting"]["numbersOnlyFail"] ? "on" : "off") + "\nFail on duplicate count: " + (guilds[interaction.guildId]["counting"]["dupeCountingFail"] ? "on" : "off") });
                }
                else if (command == "countingnext") {
                    interaction.reply({ ephemeral: true, content: "`The next number is `" + (guilds[interaction.guildId]["counting"]["lastNumber"] + 1) });
                }
            }
            else {
                interaction.reply({ ephemeral: true, content: "`Counting is not enabled.`" });
            }
        }
        else if (command.startsWith("chat")) {
            if (guilds[interaction.guildId]["leveling"]["enabled"]) {
                if (command === "chatlevel") {
                    const user = interaction.options.getUser("user") ?? interaction.user;
                    if (guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.member.id])
                        interaction.reply({ ephemeral: true, content: user.toString() + "` is level " + guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.member.id]["level"].toString() + " with " + Math.round(guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.member.id]["xp"]).toString() + "XP.`" });
                    else interaction.reply({ ephemeral: true, content: user.toString() + "` is level 0 with 0XP.`" });
                }
                else if (command === "chatleaderboard") {
                    let sorted = [];
                    Object.keys(guilds[interaction.guildId]["leveling"]["leaderboard"]).forEach(user => {
                        sorted.push([user, guilds[interaction.guildId]["leveling"]["leaderboard"][user]["xp"]]);
                    });
                    sorted.sort(function(a, b) {
                        return a[1] - b[1];
                    });
                    let lb = "";
                    for (let i = 1; i < 11; i++) {
                        if (sorted.length - i >= 0) {
                            const el = sorted[sorted.length - i];
                            lb += i + ") " + interaction.guild.members.cache.get(el[0]).toString() + ": LVL " + guilds[interaction.guildId]["leveling"]["leaderboard"][el[0]]["level"].toString() + "\n";
                        }
                        else {
                            lb += i + ") [none]\n";
                        }
                    }
                    interaction.reply({ ephemeral: true, content: "### Leaderboard:\n" + lb.trim() });
                }
            }
            else {
                interaction.reply({ ephemeral: true, content: "`Leveling is not enabled.`" });
            }
        }
        else if (command === "ticket-message") {
            if (guilds[interaction.guildId]["tickets"]["enabled"] && guilds[interaction.guildId]["tickets"]["category"]) {
                const button = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("open")
                    .setLabel("Open a Support Ticket")
                    .setStyle(discord.ButtonStyle.Primary)
                );
                const message = await interaction.channel.send({ "content": interaction.options.getString("message"), components: [ button ] });
                guilds[interaction.guildId]["tickets"]["openMsg"] = interaction.channelId + "/" + message.id;
                message.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).on("collect", async i => { ticket(i, guilds); });
                interaction.reply({ "ephemeral": true, content: "`Message sent in current channel.`" });
            }
            else {
                interaction.reply({ "ephemeral": true, "content": "`Tickets are not enabled / have a specified category. Please set these up first.`" });
            }
        }
        else if (command === "close") {
            if (guilds[interaction.guildId]["tickets"]["enabled"] && guilds[interaction.guildId]["tickets"]["category"] && interaction.channel.parentId === guilds[interaction.guildId]["tickets"]["category"]) {
                await interaction.reply("Closing Ticket. . .");
                interaction.channel.delete();
            }
            else {
                interaction.reply({ "ephemeral": true, "content": "`This isn't a ticket channel.`" });
            }
        }
        else if (command === "manage-server") {
            const menu = new discord.ActionRowBuilder()
            .addComponents(
                new discord.StringSelectMenuBuilder()
                .setCustomId("module")
                .setPlaceholder("No Module Selected")
                .addOptions(
                    {
                        "label": "Close Pop-Up",
                        "description": "Close this menu",
                        "value": "-1"
                    },
                    {
                        "label": "Counting",
                        "description": "Manage the counting module",
                        "value": "1"
                    },
                    {
                        "label": "Leveling",
                        "description": "Manage the leveling module",
                        "value": "2"
                    },
                    {
                        "label": "Tickets",
                        "description": "Manage the tickets module",
                        "value": "3"
                    },
                    {
                        "label": "Moderation",
                        "description": "Manage the moderation module",
                        "value": "4"
                    },
                    {
                        "label": "AutoMod",
                        "description": "Manage the automod module",
                        "value": "5"
                    },
                    {
                        "label": "Welcomer",
                        "description": "Manage the welcomer module",
                        "value": "6"
                    }
                )
            );
            interaction.reply({ "content": "`Select a module to manage using the combo-box below.`", "components": [ menu ] });
        }
        else if (command === "reset-server") {
            if (interaction.guild.ownerId === interaction.member.id) {
                const buttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("Yes")
                    .setStyle(discord.ButtonStyle.Danger),
                    new discord.ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                const reply = await interaction.reply({ "ephemeral": true, "content": "`Are you sure you would like to reset all the server configuration?`", "components": [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "confirm") {
                        let oldLogs = null;
                        let oldLogs2 = null;
                        try {
                            oldLogs = guilds[interaction.guildId]["moderation"]["moderationLogs"];
                            oldLogs2 = guilds[interaction.guildId]["moderation"]["modlogs"];
                            Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(role => {
                                interaction.guild.roles.cache.get(role).members.forEach(member => member.roles.remove(interaction.guild.roles.cache.get(role)));
                            });
                        } catch { }
                        await client.emit(discord.Events.GuildCreate, interaction.guild);
                        if (oldLogs != null)
                            guilds[interaction.guildId]["moderation"]["moderationLogs"] = oldLogs;
                        if (oldLogs2 != null)
                            guilds[interaction.guildId]["moderation"]["modlogs"] = oldLogs2;
                        interaction.editReply({ "content": "`Reset complete.`", components: [ ] });
                    }
                    else {
                        interaction.editReply({ "content": "`Reset canceled.`", components: [ ] });
                    }
                    interaction.replied = true;
                });
            }
            else {
                interaction.reply({ "ephemeral": true, "content": "Hey, you'll have to ask <@" + interaction.guild.ownerId + "> to run this command as they are the owner." });
            }
        }
        else if (command === "reset-xp") {
            const buttons = new discord.ActionRowBuilder()
            .addComponents(
                new discord.ButtonBuilder()
                .setCustomId("confirm")
                .setLabel("Yes")
                .setStyle(discord.ButtonStyle.Danger),
                new discord.ButtonBuilder()
                .setCustomId("cancel")
                .setLabel("Cancel")
                .setStyle(discord.ButtonStyle.Secondary)
            );
            const reply = await interaction.reply({ "ephemeral": true, "content": "`Are you sure you would like to reset all the XP levels?`", "components": [ buttons ] });
            reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                if (i.customId === "confirm") {
                    guilds[interaction.guildId]["leveling"]["leaderboard"] = { };
                    Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(role => {
                        interaction.guild.roles.cache.get(role).members.forEach(member => member.roles.remove(interaction.guild.roles.cache.get(role)));
                    });
                    interaction.editReply({ "content": "`Reset complete.`", "components": [ ] });
                }
                else {
                    interaction.editReply({ "content": "`Reset canceled.`", "components": [ ] });
                }
                interaction.replied = true;
            });
        }
        else if (command === "reload-level-roles") {
            interaction.reply({ "ephemeral": true, "content": "`Reloading levels. . .`" });
            Object.keys(guilds[interaction.guildId]["leveling"]["leaderboard"]).forEach(user => {
                Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(role => {
                    if (guilds[interaction.guildId]["leveling"]["levelRoles"][role] <= guilds[interaction.guildId]["leveling"]["leaderboard"][user]["level"] && !interaction.guild.members.cache.get(user).roles.cache.has(role))
                        interaction.guild.members.cache.get(user).roles.add(interaction.guild.roles.cache.get(role));
                });
            });
        }
        else if (command === "warn") {
            warn(interaction.options.getUser("user"), interaction.options.getString("reason"), interaction, guilds);
        }
        else if (command === "mute") {
            mute(interaction.options.getUser("user"), interaction.options.getString("duration"), interaction.options.getString("reason"), interaction, guilds);
        }
        else if (command === "unmute") {
            unmute(interaction.options.getUser("user"), interaction.options.getString("reason"), interaction, guilds);
        }
        else if (command === "kick") {
            kick(interaction.options.getUser("user"), interaction.options.getString("reason"), interaction, guilds);
        }
        else if (command === "ban") {
            ban(interaction.options.getUser("user"), interaction.options.getString("duration"), interaction.options.getString("reason"), interaction, guilds);
        }
        else if (command === "unban") {
            unban(interaction.options.getUser("user"), interaction.options.getString("reason"), interaction, guilds);
        }
        else if (command === "logs") {
            logs(interaction.options.getUser("user"), interaction, guilds);
        }
        else if (command === "clear-logs") {
            guilds[interaction.guildId]["moderation"]["modlogs"][interaction.options.getUser("user").id] = [];
            guilds[interaction.guildId]["moderation"]["moderationLogs"][interaction.options.getUser("user").id] = [];
            interaction.reply({ "ephemeral": true, "content": "`User's logs cleared.`" });
        }
        else if (command === "purge") {
            await interaction.channel.bulkDelete(interaction.options.getInteger("amount"));
            interaction.reply({ "ephemeral": true, "`content": "Purged " + interaction.options.getInteger("amount") + " messages.`" });
        }
        else if (command === "slowmode") {
            try {
                interaction.channel.setRateLimitPerUser(interaction.options.getInteger("time"));
                interaction.reply({ "ephemeral": true, "content": "`Set the slowmode to " + interaction.options.getInteger("time") + " seconds.`" });
            }
            catch {
                interaction.reply({ "ephemeral": true, "content": "Error while setting the slowmode, try a number between 0 & 6 hours (in seconds)." });
            }
        }
        else if (command === "ghostping") {
            (await interaction.channel.send(interaction.options.getMentionable("mention").toString())).delete();
            interaction.reply({ "ephemeral": true, "content": "Ghost ping sent." });
        }
    }
    fs.writeFileSync("./guilds.json", JSON.stringify(guilds));
});

setInterval(() => {
    Object.keys(guilds).forEach(guild => {
        Object.keys(guilds[guild]["moderation"]["modlogs"]).forEach(user => {
            guilds[guild]["moderation"]["modlogs"][user.id].forEach(punishment => {
                if (client.guilds.cache.get(guild).bans.cache.has(user) && punishment["type"] === "ban" && punishment["duration"] !== -1 && new Date().getTime() >= punishment["time"] + punishment["duration"])
                    client.guilds.cache.get(guild).members.unban(user, "Automatic unban (ban expired)");
            });
        });
    });
}, 1200000);

setInterval(() => {
    Object.keys(guilds).forEach(guild => {
        Object.keys(guilds[guild]["moderation"]["modlogs"]).forEach(user => {
            guilds[guild]["moderation"]["modlogs"][user.id].forEach(punishment => {
                if (punishment["type"] === "mute" && new Date().getTime() <= punishment["time"] + punishment["duration"])
                    client.guilds.cache.get(guild).members.cache.get(user).timeout(Math.min(punishment["time"] + punishment["duration"], 604800000), "Automatic Re-timeout (continuing punishment)");
            });
        });
    });
}, 86400000);

client.login("MTEyNTU2ODcxMTkyMzg2MzY3NA.GYDzfc.NTnj1mofnuawzlA5iNmDtS_3O60pwZW85sKvN4");