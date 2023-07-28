const discord = require("discord.js");
const fs = require("fs");
const process = require("node:process");
const { createTranscript } = require('discord-html-transcripts');
const request = require('request');
const randomAnimal = require("random-animals-api");
const { parse } = require("node-html-parser");

const { count, countingMenu } = require("./modules/counting");
const { level, levelMenu } = require("./modules/levels");
const { ticket, ticketMenu } = require("./modules/tickets");
const { moderationMenu, warn, mute, unmute, kick, ban, unban, logs } = require("./modules/moderation");
const { automodMenu } = require("./modules/automod");
const { welcomeMenu } = require("./modules/welcomer");

process.on("unhandledRejection", async (reason, promise) => {
    console.log("Unhandled Rejection at: \n", promise, "reason:", reason)
});
process.on("uncaughtException", async (error) => {
    console.log("Uncaught Exception: \n", error);
});
process.on("uncaughtExceptionMonitor", async (error, origin) => {
    console.log("Uncaught Exception Monitor: \n", error, origin);
});

const client = new discord.Client({ "partials": [ discord.Partials.Channel, discord.Partials.Message, discord.Partials.User ], "intents": [ discord.GatewayIntentBits.Guilds, discord.GatewayIntentBits.GuildMessages, discord.GatewayIntentBits.MessageContent, discord.GatewayIntentBits.GuildMessageReactions, discord.GatewayIntentBits.AutoModerationConfiguration, discord.GatewayIntentBits.GuildMembers, discord.GatewayIntentBits.DirectMessages ] });

const reportCooldown = [ ];

if (!fs.existsSync("./guilds.json")) fs.writeFileSync("./guilds.json", "{}");
const guilds = JSON.parse(fs.readFileSync("./guilds.json").toString());

const commandList = [
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
        options: [ { type: 3, name: "message", description: "The message to send with the buttons.", required: true } ]
    },
    {
        name: "countingreset",
        description: "Resets the counting streak back to zero.",
        default_member_permissions: 0x0000000000000020,
    },
    {
        name: "countingset",
        description: "Sets the count.",
        default_member_permissions: 0x0000000000000008,
        options: [ { type: 4, name: "count", description: "The count to start at.", min_value: 1, required: true } ]
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
        options: [ { type: 4, name: "amount", description: "The amount of messages to clear.", min_value: 1, required: true } ]
    },
    {
        name: "slowmode",
        description: "Set the slowmode of the channel",
        default_member_permissions: 0x0000010000000000,
        options: [ { type: 4, name: "time", description: "The slowmode in seconds", min_value: 0, required: true } ]
    },
    {
        name: "ghostping",
        description: "Pings someone and removes the mention message (requires mention @everyone perms)",
        default_member_permissions: 0x0000000000020000,
        options: [ { type: 9, name: "mention", description: "The role/person to ghost ping", required: true } ]
    },
    {
        name: "chatleaderboard",
        description: "The top XP chatters.",
    },
    {
        name: "toggle-command",
        description: "Disable/enable a command for anyone",
        default_member_permissions: 0x0000000000000008,
        options: [ { type: 3, name: "command", description: "The command to toggle.", required: true, choices: [ { "name": "/rps", "value": "/rps" }, { "name": "/flip", "value": "/flip" }, { "name": "/random", "value": "/random" }, { "name": "/word", "value": "/word" }, { "name": "/cat", "value": "/cat" }, { "name": "/dog", "value": "/dog" }, { "name": "/bunny", "value": "/bunny" }, { "name": "/duck", "value": "/duck" }, { "name": "/fox", "value": "/fox" }, { "name": "/lizard", "value": "/lizard" }, { "name": "/shiba", "value": "/shiba" }, { "name": "/koala", "value": "/koala" }, { "name": "/panda", "value": "/panda" }, { "name": "/countingoptions", "value": "/countingoptions" }, { "name": "/purge", "value": "/purge" }, { "name": "/slowmode", "value": "/slowmode" }, { "name": "/ghostping", "value": "/ghostping" }, { "name": "/8ball", "value": "/8ball" }, { "name": "/fortune", "value": "/fortune" }, { "name": "/meme", "value": "/meme" }, { "name": "/fact", "value": "/fact" }, { "name": "/fact-of-the-day", "value": "/fact-of-the-day" }, { "name": "/random-site", "value": "/random-site" }, { "name": "/dadjoke", "value": "/dadjoke" }, { "name": "/agify", "value": "/agify" }, { "name": "/giveaway", "value": "/giveaway" } ] } ]
    },
    {
        name: "rps",
        description: "Play rock, paper, scizzors with me!",
        options: [ { type: 3, name: "option", description: "Rock, Paper, or Scizzors.", required: true, choices: [ { "name": "rock", "value": "rock" }, { "name": "paper", "value": "paper" }, { "name": "scizzors", "value": "scizzors" } ] } ]
    },
    {
        name: "flip",
        description: "Flips a coin"
    },
    {
        name: "roll",
        description: "Roll a dice"
    },
    {
        name: "random",
        description: "Gets a random number",
        options: [ { type: 4, name: "max", description: "The maximum number to generate", required: true }, { type: 4, name: "min", description: "The minimum number to generate" } ]
    },
    {
        name: "word",
        description: "Gets a random word",
        options: [ { type: 4, name: "length", min_value: 1, description: "The length of the word" } ]
    },
    {
        name: "cat",
        description: "Get a random cat picture"
    },
    {
        name: "dog",
        description: "Get a random dog picture"
    },
    {
        name: "bunny",
        description: "Get a random bunny picture"
    },
    {
        name: "duck",
        description: "Get a random duck picture"
    },
    {
        name: "fox",
        description: "Get a random fox picture"
    },
    {
        name: "lizard",
        description: "Get a random lizard picture"
    },
    {
        name: "shiba",
        description: "Get a random shiba picture"
    },
    {
        name: "koala",
        description: "Get a random koala picture"
    },
    {
        name: "panda",
        description: "Get a random panda picture"
    },
    {
        name: "8ball",
        description: "Ask the 8 ball",
        options: [ { type: 3, name: "question", description: "The question to ask the 8 ball.", required: true } ],
    },
    {
        name: "fortune",
        description: "Show your fortune",
        options: [ { type: 3, name: "category", description: "The category of the fortune message.", choices: [ { "name": "bible", "value": "bible" }, { "name": "computers", "value": "computers" }, { "name": "cookie", "value": "cookie" }, { "name": "definitions", "value": "definitions" }, { "name": "miscellaneous", "value": "miscellaneous" }, { "name": "people", "value": "people" }, { "name": "platitudes", "value": "platitudes" }, { "name": "politics", "value": "politics" }, { "name": "science", "value": "science" }, { "name": "wisdom", "value": "wisdom" } ] } ]
    },
    {
        name: "meme",
        description: "Show a random meme"
    },
    {
        name: "fact",
        description: "Show a random fact"
    },
    {
        name: "fact-of-the-day",
        description: "Shows today's random fact"
    },
    {
        name: "random-site",
        description: "Shows a random website"
    },
    {
        name: "dadjoke",
        description: "Shows a random dade joke"
    },
    {
        name: "agify",
        description: "Guesses your age from your name",
        options: [ { type: 3, name: "name", description: "Your name to guess the age of.", required: true } ],
    },
    {
        name: "giveaway",
        description: "Creates a giveaway.",
        default_member_permissions: 0x0000000000000008,
        options: [ { type: 3, name: "prize", description: "The prize of the giveaway.", "required": true }, { type: 7, name: "channel", description: "The channel to send the giveaway.", "channel_types": [ 0, 5 ] }, { type: 4, name: "winners", description: "The count of winners for the giveaway.", min_value: 1 }, { type: 3, name: "duration", description: "The duration of the giveaway.", required: true } ]
    },
];

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

function toEmbed(msg) {
    return [ new discord.EmbedBuilder().setDescription("**" + msg + "**") ];
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function getRandomIntMin(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

client.once(discord.Events.ClientReady, async (c) => {
    console.log("Successfully logged in as " + c.user.tag);
    c.user.setActivity({ name: "Beta Development" });
    
    Object.keys(guilds).forEach(async guild => {
        try {
            if (guilds[guild]["tickets"]["enabled"] && guilds[guild]["tickets"]["openMsg"]) {
                try {
                    (await client.guilds.cache.get(guild).channels.cache.get(guilds[guild]["tickets"]["openMsg"].split("/")[0]).messages.fetch(guilds[guild]["tickets"]["openMsg"].split("/")[1])).createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).on("collect", async i => { ticket(i, guilds); });
                }
                catch (ex) { guilds[guild]["tickets"]["openMsg"] = null; }
            }
            Object.keys(guilds[guild]["misc"]["giveaways"]).forEach(async giveaway => {
                const msg = await (await client.guilds.cache.get(guild).channels.fetch(giveaway.split("/")[0])).messages.fetch(giveaway.split("/")[1]);
                msg.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (guilds[i.guildId]["misc"]["giveaways"][msg.channel.id + "/" + msg.id]["entries"].includes(i.user.id)) {
                        i.reply({ "embeds": toEmbed("You've already entered the giveaway."), "ephemeral": true });
                    }
                    else {
                        i.reply({ "embeds": toEmbed("You've been entered into the giveaway."), "ephemeral": true });
                        if (guilds[i.guildId]["misc"]["giveaways"][giveaway]["entries"].length % 5 == 0)
                            msg.edit({ "embeds": [ new discord.EmbedBuilder().setTitle("**Giveaway for " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["prize"] + "**").setDescription("**Winners: " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["winners"] + "\nEntries: " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["entries"].length + "\nEnding: <t:" + (guilds[i.guildId]["misc"]["giveaways"][giveaway]["endTime"] / 1000) + ":R>\nBy: " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["hoster"] + "**") ] });
                        guilds[i.guildId]["misc"]["giveaways"][msg.id]["entries"].push(i.user.id);
                    }
                });
            });
        } catch { }
    });
});

client.on(discord.Events.GuildCreate, (guild) => {
    guilds[guild.id] = { "counting": { "enabled": false, "channel": null, "lastNumber": 0, "noFail": false, "numbersOnly": true, "numbersOnlyFail": false, "lastCounter": null, "dupeCountingFail": false }, "leveling": { "enabled": false, "blacklistedChannels": [ ], "blacklistedRoles": [ ], "boostRoles": {}, "levelRoles": { }, "leaderboard": { }, "channel": null }, "tickets": { "enabled": false, "category": null, "openMsg": null, "accessRoles": [ ], "openingMsg": "Please describe your issue and wait patiently for a response." }, "moderation": { "enabled": true, "prefix": "!", "enableWarnings": true, "modlogs": { }, "moderationLogs": { } }, "automod": { "enabled": false, "allowChannels": [ ], "allowRoles": [ ], "blockedRolePings": [ ], "blockedRolePingsRule": null }, "welcome": { "enabled": true, "channel": null, "welcomeMsg": "Welcome <@> to the server!", "autoRoles": [ ] }, "misc": { "giveaways": [ ] } };
    fs.writeFileSync("./guilds.json", JSON.stringify(guilds));
    
    guild.commands.set(commandList);
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
    });

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

    if (!interaction.guildId) {
        if (interaction.content.startsWith("del")) {
            if (interaction.reference) {
                if (interaction.channel.messages.cache.get(interaction.reference.messageID).author.id != client.user.id) {
                    const tempMsg = await interaction.reply({ "embeds": toEmbed("I can't delete this message [deleting in 5 seconds]") });
                    setTimeout(() => {
                        tempMsg.delete();
                    }, 5000);
                }
                else interaction.channel.messages.cache.get(interaction.reference.messageID).delete();
            }
            else {
                const tempMsg = await interaction.reply({ "embeds": toEmbed("You have to reply to a message [deleting in 5 seconds]") });
                setTimeout(() => {
                    tempMsg.delete();
                }, 5000);
            }
        }
        else if (interaction.content === "clear confirm" || interaction.content === "clean confirm") {
            (await interaction.channel.messages.fetch()).forEach(msg => { if (msg.author.id == client.user.id) msg.delete() });
        }
        else if (interaction.content === "clear" || interaction.content === "clean") {
            const tempMsg = await interaction.reply({ "embeds": toEmbed("Type `clear confirm` to confirm this action [deleting in 5 seconds]") });
            setTimeout(() => {
                tempMsg.delete();
            }, 5000);
        }
        else if (interaction.content === "help") {
            await interaction.reply({ "embeds": toEmbed("Commands:\n`bug-report <bug>`, `rps <rock,paper,scizzors>`, `flip`, `roll`, `random <max> (min)`, `word (length)`, `cat`, `dog`, `bunny`, `duck`, `fox`, `lizard`, `shiba`, `koala`, `panda`, `8ball <question>`, `fortune <bible,computers,cookie,definitions,miscellaneous,people,platitudes,politics,science,wisdom>`, `meme`, `fact`, `fact-of-the-day`, `random-site`, `dadjoke`, `agify <name>`") });
        }
        else if (interaction.content.startsWith("rps")) {
            const otherChoice = interaction.content.split(" ")[1];
            if ([ "rock", "paper", "scizzors" ].includes(otherChoice)) {
                const choice = [ "rock", "paper", "scizzors" ][getRandomInt(3)];
                let add = "";

                if (choice == otherChoice) add = "It's a tie!";
                else if (choice == "paper" && otherChoice == "rock") add = "I win!";
                else if (choice == "rock" && otherChoice == "paper") add = "You win!";
                else if (choice == "scizzors" && otherChoice == "paper") add = "I win!";
                else if (choice == "paper" && otherChoice == "scizzors") add = "You win!";
                else if (choice == "rock" && otherChoice == "scizzors") add = "I win!";
                else if (choice == "scizzors" && otherChoice == "rock") add = "You win!";

                interaction.reply({ "embeds": toEmbed("I chose " + choice + ". " + add) });
            }
            else interaction.reply({ "embeds": toEmbed("That's not a valid option!") });
        }
        else if (interaction.content === "flip") {
            interaction.reply({ "embeds": toEmbed("It landed on " + [ "heads", "tails" ][getRandomInt(2)] + ".") });
        }
        else if (interaction.content === "roll") {
            interaction.reply({ "embeds": toEmbed("It rolled a " + getRandomIntMin(1, 6) + ".") });
        }
        else if (interaction.content === "random-site") {
            request.get({ "url": "https://useless-sites--glique.repl.co/api/random" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": [ new discord.EmbedBuilder().setTitle(JSON.parse(body)["title"]).setDescription("**Here's your random site!**").setImage(JSON.parse(body)["image"]).setURL(JSON.parse(body)["url"]) ] });
            });
        }
        else if (interaction.content.startsWith("random")) {
            const max = interaction.content.split(" ")[1];
            const min = interaction.content.split(" ")[2] ? Number(interaction.content.split(" ")[2]) : null;
            if (isNaN(max)) {
                interaction.reply({ "embeds": toEmbed("Max is not a valid number!") });
            }
            else if (min && isNaN(min)) {
                interaction.reply({ "embeds": toEmbed("Min is not a valid number!") });
            }
            else {
                if (min)
                    interaction.reply({ "embeds": toEmbed("The number is " + getRandomIntMin(min, max + 1) + ".") });
                else
                    interaction.reply({ "embeds": toEmbed("The number is " + getRandomInt(max + 1) + ".") });
            }
        }
        else if (interaction.content.startsWith("word")) {
            const length = Number(interaction.content.split(" ")[1]);
            if (length && isNaN(length)) {
                interaction.reply({ "embeds": toEmbed("That's not a valid number!") });
            }
            else {
                let word = "";
                let replied = false;
                if (!length) request.get({ "url": "https://random-word-api.vercel.app/api?words=1" }, (err, _res, body) => {
                    if (err) word = "The request failed, please try again.";
                    else word = "The word is " + JSON.parse(body)[0] + ".";
                    interaction.reply({ "embeds": toEmbed(word) });
                    replied = true;
                });
                else if (length < 1) {
                    interaction.reply({ "embeds": toEmbed("You can't have a word with the length of " + length + "!") });
                    replied = true;
                }
                else request.get({ "url": "https://random-word-api.vercel.app/api?words=1&length=" + length }, (err, _res, body) => {
                    if (err) word = "The request failed, please try again.";
                    else word = "The word is " + JSON.parse(body)[0] + ".";
                    interaction.reply({ "embeds": toEmbed(word) });
                    replied = true;
                });
                setTimeout(() => {
                    if (!replied)
                        interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                }, 5000);
            }
        }
        else if (interaction.content === "cat") {
            request.get({ "url": "http://random.cat/view/" + getRandomInt(1678) }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": [ new discord.EmbedBuilder().setDescription("**Here's your cat!**").setImage(parse(body).getElementById("cat").rawAttrs.split("\"")[1].split("\"")[0]) ] });
            });
        }
        else if (Object.keys(randomAnimal).includes(interaction.content)) {
            const url = await eval("randomAnimal." + interaction.content + "()");
            interaction.reply({ "embeds": [ new discord.EmbedBuilder().setDescription("**Here's your " + interaction.content + "!**").setImage(url) ] });
        }
        else if (interaction.content.startsWith("8ball")) {
            interaction.reply({ "embeds": toEmbed([ "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful." ][getRandomInt(20)]) });
        }
        else if (interaction.content.startsWith("fortune")) {
            const add = interaction.content.split(" ")[1] ?? "";
            if (["bible", "computers", "cookie", "definitions", "miscellaneous", "people", "platitudes", "politics", "science", "wisdom", ""].includes(add)) {
                request.get({ "url": "http://yerkee.com/api/fortune/" + add }, (err, _res, body) => {
                    if (err)
                        interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                    else
                        interaction.reply({ "embeds": toEmbed("Your fortune:\n" + JSON.parse(body)["fortune"]) });
                });
            }
            else {
                interaction.reply({ "embeds": toEmbed("That's not a valid option.") });
            }
        }
        else if (interaction.content === "meme") {
            request.get({ "url": "https://meme-api.com/gimme" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": [ new discord.EmbedBuilder().setDescription("**Here's your meme!**").setImage(JSON.parse(body)["url"]) ] });
            });
        }
        else if (interaction.content === "fact") {
            request.get({ "url": "https://uselessfacts.jsph.pl/api/v2/facts/random" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("Random Fact:\n" + JSON.parse(body)["text"]) });
            });
        }
        else if (interaction.content === "fact-of-the-day") {
            request.get({ "url": "https://uselessfacts.jsph.pl/api/v2/facts/today" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("Random Fact:\n" + JSON.parse(body)["text"]) });
            });
        }
        else if (interaction.content === "dadjoke") {
            request.get({ "url": "https://icanhazdadjoke.com/", "headers": { "Accept": "text/plain" } }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("Your dad joke:\n" + body) });
            });
        }
        else if (interaction.content.startsWith("agify")) {
            const name = interaction.content.split(" ")[1];
            if (name)
                request.get({ "url": "https://api.agify.io/?name=" + name }, (err, _res, body) => {
                    if (err)
                        interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                    else
                        interaction.reply({ "embeds": toEmbed("I think you are " + JSON.parse(body)["age"] + " years old.") });
                });
            else 
                interaction.reply({ "embeds": toEmbed("Please input a name to guess.") });
        }
        else if (interaction.content.startsWith("bug-report")) {
            if (reportCooldown.includes(interaction.author.id)) 
                interaction.reply({ "embeds": toEmbed("You're on bug report cooldown. Please report this again later.") });
            else {
                const bug = interaction.content.substring(11);
                if (!bug)
                    interaction.reply({ "embeds": toEmbed("Please input a bug to report in the format `bug-report <bug>`.") });
                else {
                    await client.guilds.cache.get("1130321235222462486").channels.fetch();
                    client.guilds.cache.get("1130321235222462486").channels.cache.get("1134274229555179561").send({ "embeds": [ new discord.EmbedBuilder().setTitle("Bug Report").setAuthor({ "name": interaction.author.tag, "iconURL": interaction.author.avatarURL(), "url": "https://discordapp.com/users/" + interaction.author.id }).setDescription(bug) ] });
                    interaction.reply({ "embeds": toEmbed("Bug report sent in. You can submit another one in 3 hours.") });
                    const index = reportCooldown.push(interaction.author.id) - 1;
                    setTimeout(() => {
                        reportCooldown.splice(index, 1);
                    }, 10800000);
                }
            }
        }
        else {
            interaction.reply({ "embeds": toEmbed("That's not a valid command! Say `help` for help.") });
        }
    }
    else {
        if (interaction.content.startsWith(guilds[interaction.guildId]["moderation"]["prefix"])) {
            const cmd = interaction.content.substring(guilds[interaction.guildId]["moderation"]["prefix"].length).trim().split(" ")[0];
            const args = interaction.content.substring(guilds[interaction.guildId]["moderation"]["prefix"].length + cmd.length + 1).trim().split(" ");
            if (cmd === "warn" && interaction.member.permissions.has(discord.PermissionsBitField.Flags.ModerateMembers)) {
                if (args.length >= 2) {
                    if (args[0].startsWith("<@") && interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1))) {
                        warn(interaction.guild.members.cache.get(args[0].substring(2, args[0].lengh - 1)), args.splice(1, args.length - 1).join(" "), interaction, guilds);
                    }
                    else if (interaction.guild.members.cache.get(args[0])) {
                        warn(interaction.guild.members.cache.get(args[0]), args.splice(1, args.length - 1).join(" "), interaction, guilds);
                    }
                    else {
                        interaction.reply({ "embeds": toEmbed("Command usage: warn (userid/mention) (reason)") });
                    }
                }
                else {
                    interaction.reply({ "embeds": toEmbed("Command usage: warn (userid/mention) (reason)") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: mute (userid/mention) (duration) [reason]") });
                    }
                }
                else {
                    interaction.reply({ "embeds": toEmbed("Command usage: mute (userid/mention) (duration) [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: unmute (userid/mention) [reason]") });
                    }
                }
                else {
                    interaction.reply({ "embeds": toEmbed("Command usage: unmute (userid/mention) [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: kick (userid/mention) [reason]") });
                    }
                }
                else {
                    interaction.reply({ "embeds": toEmbed("Command usage: kick (userid/mention) [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: ban (userid/mention) [duration] [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: ban (userid/mention) [duration] [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: ban (userid/mention) [duration] [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: ban (userid/mention) [duration] [reason]") });
                    }
                }
                else {
                    interaction.reply({ "embeds": toEmbed("Command usage: ban (userid/mention) [duration] [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: unban (userid/mention) [reason]") });
                    }
                }
                else {
                    interaction.reply({ "embeds": toEmbed("Command usage: unban (userid/mention) [reason]") });
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
                        interaction.reply({ "embeds": toEmbed("Command usage: logs (userid/mention)") });
                    }
                }
                else {
                    interaction.reply({ "embeds": toEmbed("Command usage: logs (userid/mention)") });
                }
            }
        }
        else if (guilds[interaction.guildId]["leveling"]["enabled"] && !guilds[interaction.guildId]["leveling"]["blacklistedChannels"].includes(interaction.channelId))
            level(interaction, guilds);
        if (guilds[interaction.guildId]["counting"]["enabled"] && guilds[interaction.guildId]["counting"]["channel"] === interaction.channelId)
            count(interaction, guilds);
        fs.writeFileSync("./guilds.json", JSON.stringify(guilds));
    }
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
    interaction.channel.send({ "embeds": toEmbed("Select a module to manage using the combo-box below."), "components": [ menu ] });
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
            (await interaction.reply({ "embeds": toEmbed("Closing...") })).delete();
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["counting"]["enabled"] = !guilds[interaction.guildId]["counting"]["enabled"];
                    }
                    
                    countingMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];
                const channels = (await interaction.guild.channels.fetch()).filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size - 1; i += 24) {
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

                    for (let i2 = i; i2 < Math.min(channels.size - i, i + 24); i2++) {
                        const channel = channels.at(i2);    
                        if (channel.type == discord.ChannelType.GuildText) {
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                        }
                    }
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }

                interaction.message.delete();
                interaction.channel.send({ "embeds": toEmbed("Select a channel for counting"), "components": menus });
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["leveling"]["enabled"] = !guilds[interaction.guildId]["leveling"]["enabled"];
                    }
                    
                    levelMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];
                const channels = (await interaction.guild.channels.fetch()).filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size - 1; i += 24) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("levelingChannel" + (i / 24))
                    .setPlaceholder("No Channel Selected")
                    .addOptions(
                        {
                            "label": "Go Back",
                            "description": "Go back to the Property Selection page",
                            "value": "0"
                        }
                    );

                    for (let i2 = i; i2 < Math.min(channels.size - i, i + 24); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildText) {
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                        }
                    }
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }

                interaction.message.delete();
                interaction.channel.send({ "embeds": toEmbed("Select a channel for level-ups"), "components": menus });
            }
            else if (interaction.values[0] === "3") {
                const menus = [ ];

                menus.push(new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                ));

                const channels = (await interaction.guild.channels.fetch()).filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size - 1; i += 25) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("blacklistChannels" + (i / 25))
                    .setPlaceholder("No Channel Selected");

                    for (let i2 = i; i2 < Math.in(channels.size - i, i + 25); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildText) {
                            if (guilds[interaction.guildId]["leveling"]["blacklistedChannels"].includes(channel.id))
                                selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                            else
                                selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id });
                        }
                    }
                
                    selectionBuilder.setMinValues(0);
                    selectionBuilder.setMaxValues(Math.min(channels.size - i, i + 25));
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }
            
                interaction.message.delete();
                interaction.channel.send({ "embeds": toEmbed("Select channels to blacklist XP gains in"), "components": menus });
            }
            else if (interaction.values[0] === "4") {
                const menus = [ ];

                menus.push(new discord.ActionRowBuilder()
                    .addComponents(
                        new discord.ButtonBuilder()
                        .setCustomId("back")
                        .setLabel("Go Back")
                        .setStyle(discord.ButtonStyle.Secondary)
                    ))

                const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                for (let i = 0; i < roles.size - 1; i += 25) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("blacklistRoles" + (i / 25))
                    .setPlaceholder("No Role Selected");

                    for (let i2 = i; i2 < Math.min(roles.size - i, i + 25); i2++) {
                        const role = roles.at(i2);
                        if (guilds[interaction.guildId]["leveling"]["blacklistedRoles"].includes(role.id))
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), "value": role.id, "default": true });
                        else
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                    }

                    selectionBuilder.setMinValues(0);
                    selectionBuilder.setMaxValues(Math.min(roles.size - i, i + 25));
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }
                
                interaction.message.delete();
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select roles to blacklist XP gains"), "components": menus });
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

                if (interaction.message && interaction.message.deletable) interaction.message.delete();
                const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        i.message.delete();
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("boosterCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }
                        
                        i.message.delete();
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to use to create a booster"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to delete"), "components": [ menu ] });
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("levelCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) selectionBuilder.addOptions({ "label": role.name.substring(0, 50), "value": role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }

                        i.message.delete();
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to use to create a level role"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to delete"), "components": [ menu ] });
                    }
                });
            }
        }
        else if (selection.startsWith("levelingChannel") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] !== "0")
                guilds[interaction.guildId]["leveling"]["channel"] = interaction.values[0];
            levelMenu(guilds, interaction);
        }
        else if (selection.startsWith("blacklistChannels") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            guilds[interaction.guildId]["leveling"]["blacklistedChannels"] = interaction.values;
            
            levelMenu(guilds, interaction);
        }
        else if (selection.startsWith("blacklistRoles") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            guilds[interaction.guildId]["leveling"]["blacklistedRoles"] = interaction.values;
            
            levelMenu(guilds, interaction);
        }
        else if (selection.startsWith("boosterCreate") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("boosterCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }
                        
                        i.message.delete();
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to use to create a booster"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to delete"), "components": [ menu ] });
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
                
                    (await submitted.reply({ "embeds": toEmbed("Closing...") })).delete();
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("boosterCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }
                        
                        i.message.delete();
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to use to create a booster"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to delete"), "components": [ menu ] });
                    }
                });
            }
        }
        else if (selection.startsWith("boosterDelete") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, interaction);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("boosterCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }

                        i.message.delete();
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to use to create a booster"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to delete"), "components": [ menu ] });
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
                        
                const reply = await interaction.channel.send({ "ephemeral": true, "embeds": toEmbed("Are you sure you want to delete the boost of " + interaction.guild.roles.cache.get(interaction.values[0]).name + "?"), "components": [ buttons ] });
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
                    const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                    reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                        if (i.customId === "back") {
                            levelMenu(guilds, i);
                        }
                        else if (i.customId === "create") {
                            const menus = [ ];
    
                            const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));
    
                            for (let i = 0; i < roles.size - 1; i += 24) {
                                const menu = new discord.ActionRowBuilder();
                                
                                const selectionBuilder = new discord.StringSelectMenuBuilder()
                                .setCustomId("boosterCreate" + (i / 24))
                                .setPlaceholder("No Role Selected")
                                .addOptions(
                                    {
                                        "label": "Go Back",
                                        "description": "Go back to the Property Selection page",
                                        "value": "0"
                                    }
                                );
            
                                for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                    const role = roles.at(i2);
                                    selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                                }
                                
                                menu.addComponents(selectionBuilder);
                                if (selectionBuilder.options.length > 0) menus.push(menu);
                            }

                            i.message.delete();
                            interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to use to create a booster"), "components": menus });
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
                            interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to delete"), "components": [ menu ] });
                        }
                    });
                    interaction.replied = true;
                });
            }
        }
        else if (selection.startsWith("levelCreate") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("levelCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) 
                                    selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }
                        
                        i.message.delete();
                        interaction.channel.send({ "embeds": toEmbed("Select which role you'd like to use to create a level role"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which level role you'd like to delete"), "components": [ menu ] });
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
                
                    (await submitted.reply({ "embeds": toEmbed("Closing...") })).delete();
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("levelCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) 
                                    selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }
                        
                        i.message.delete();
                        interaction.channel.send({ "embed": toEmbed("Select which level role you'd like to use to create a level role"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which level role you'd like to delete"), "components": [ menu ] });
                    }
                });
            }
        }
        else if (selection.startsWith("levelDelete") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
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
                const reply = await interaction.channel.send({ "embed": toEmbed("Click an option below"), "components": [ menu ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        levelMenu(guilds, i);
                    }
                    else if (i.customId === "create") {
                        const menus = [ ];

                        const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                        for (let i = 0; i < roles.size - 1; i += 24) {
                            const menu = new discord.ActionRowBuilder();
                            
                            const selectionBuilder = new discord.StringSelectMenuBuilder()
                            .setCustomId("levelCreate" + (i / 24))
                            .setPlaceholder("No Role Selected")
                            .addOptions(
                                {
                                    "label": "Go Back",
                                    "description": "Go back to the Property Selection page",
                                    "value": "0"
                                }
                            );
        
                            for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                const role = roles.at(i2);
                                if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) 
                                    selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                            }
                            
                            menu.addComponents(selectionBuilder);
                            if (selectionBuilder.options.length > 0) menus.push(menu);
                        }
                        
                        i.message.delete();
                        interaction.channel.send({ "embeds": toEmbed("Select which level role you'd like to use to create a level role"), "components": menus });
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
                        interaction.channel.send({ "embeds": toEmbed("Select which level role you'd like to delete"), "components": [ menu ] });
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
                        
                const reply = await interaction.channel.send({ "ephemeral": true, "embeds": toEmbed("Are you sure you want to delete the level role of " + interaction.guild.roles.cache.get(interaction.values[0]).name + "?"), "components": [ buttons ] });
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
                    const reply = await interaction.channel.send({ "embeds": toEmbed("Click an option below"), "components": [ menu ] });
                    reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                        if (i.customId === "back") {
                            levelMenu(guilds, i);
                        }
                        else if (i.customId === "create") {
                            const menus = [ ];
    
                            const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));
    
                            for (let i = 0; i < roles.size - 1; i += 24) {
                                const menu = new discord.ActionRowBuilder();
                                
                                const selectionBuilder = new discord.StringSelectMenuBuilder()
                                .setCustomId("levelCreate" + (i / 24))
                                .setPlaceholder("No Role Selected")
                                .addOptions(
                                    {
                                        "label": "Go Back",
                                        "description": "Go back to the Property Selection page",
                                        "value": "0"
                                    }
                                );
            
                                for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                                    const role = roles.at(i2);
                                    if (!Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).includes(role.id)) 
                                        selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                                }
                                
                                menu.addComponents(selectionBuilder);
                                if (selectionBuilder.options.length > 0) menus.push(menu);
                            }
                            
                            i.message.delete();
                            interaction.channel.send({ "embeds": toEmbed("Select which level role you'd like to use to create a level role"), "components": menus });
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
                            interaction.channel.send({ "embeds": toEmbed("Select which level role you'd like to delete"), "components": [ menu ] });
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["tickets"]["enabled"] = !guilds[interaction.guildId]["tickets"]["enabled"];
                    }
                    
                    ticketMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];
                const channels = (await interaction.guild.channels.fetch()).filter(channel => channel.type == discord.ChannelType.GuildCategory);
                for (let i = 0; i < channels.size - 1; i += 24) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("ticketsCategory" + (i / 24))
                    .setPlaceholder("No Channel Selected")
                    .addOptions(
                        {
                            "label": "Go Back",
                            "description": "Go back to the Property Selection page",
                            "value": "0"
                        }
                    );

                    for (let i2 = i; i2 < Math.min(channels.size - i, i + 24); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildCategory) {
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                        }
                    }
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }
                
                interaction.message.delete();
                interaction.channel.send({ "embeds": toEmbed("Select a category for opened tickets"), "components": menus });
            }
            else if (interaction.values[0] === "3") {
                const menus = [ ];

                menus.push(new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                ));

                const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                for (let i = 0; i < roles.size - 1; i += 24) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("accessRoles" + (i / 24))
                    .setPlaceholder("No Role Selected");

                    for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                        const role = roles.at(i2);
                        if (guilds[interaction.guildId]["tickets"]["accessRoles"].includes(role.id))
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                        else
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                    }
                    selectionBuilder.setMinValues(0);
                    selectionBuilder.setMaxValues(Math.min(roles.size - i, i + 24));

                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }
                
                interaction.message.delete();
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select roles to allow in all tickets"), "components": menus });
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

                    (await submitted.reply({ "embeds": toEmbed("Closing...") })).delete();
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
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
                
                    (await submitted.reply({ "embeds": toEmbed("Closing...") })).delete();
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["moderation"]["enableWarnings"] = !guilds[interaction.guildId]["moderation"]["enableWarnings"];
                    }
                    
                    moderationMenu(guilds, i);
                });
            }
        }
        else if (selection.startsWith("accessRoles") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            guilds[interaction.guildId]["tickets"]["accessRoles"] = interaction.values;
            
            ticketMenu(guilds, interaction);
        }
        else if (selection.startsWith("ticketsCategory") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (interaction.values[0] !== "0") {
                guilds[interaction.guildId]["tickets"]["category"] = interaction.values[0];
            }
            ticketMenu(guilds, interaction);
        }

        else if (selection.startsWith("automodProperty") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["automod"]["enabled"] = !guilds[interaction.guildId]["automod"]["enabled"];
                    }
                    
                    automodMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];

                menus.push(new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                ));

                const channels = (await interaction.guild.channels.fetch()).filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size - 1; i += 25) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("allowChannels" + (i / 25))
                    .setPlaceholder("No Channel Selected");

                    for (let i2 = i; i2 < Math.min(channels.size - i, i + 25); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildText) {
                            if (guilds[interaction.guildId]["automod"]["allowChannels"].includes(channel.id))
                                selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id, "default": true });
                            else
                                selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), "value": channel.id });
                        }
                    }

                    selectionBuilder.setMinValues(0);
                    selectionBuilder.setMaxValues(Math.min(channels.size - i, i + 25));
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }
                
                interaction.message.delete();
                interaction.channel.send({ "embeds": toEmbed("Select channels to allow automod bypassing in"), "components": menus });
            }
            else if (interaction.values[0] === "3") {
                const menus = [ ];

                menus.push(new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                ));
                
                const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                for (let i = 0; i < roles.size - 1; i += 25) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("allowRoles" + (i / 25))
                    .setPlaceholder("No Role Selected");

                    for (let i2 = i; i2 < Math.min(roles.size - i, i + 25); i2++) {
                        const role = roles.at(i2);
                        selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                    }

                    selectionBuilder.setMinValues(0);
                    selectionBuilder.setMaxValues(Math.min(roles.size - i, i + 25));
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }
                
                interaction.message.delete();
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select roles to allow automod bypassing with."), "components": menus });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        automodMenu(guilds, i);
                    }
                });
            }
            else if (interaction.values[0] === "4") {
                const menus = [ ];

                menus.push(new discord.ActionRowBuilder()
                    .addComponents(
                        new discord.ButtonBuilder()
                        .setCustomId("back")
                        .setLabel("Go Back")
                        .setStyle(discord.ButtonStyle.Secondary)
                    ));

                const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                for (let i = 0; i < roles.size - 1; i += 25) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("blockRolePings" + (i / 25))
                    .setPlaceholder("No Role Selected");

                    for (let i2 = i; i2 < Math.min(roles.size - i, i + 25); i2++) {
                        const role = roles.at(i2);
                        if (guilds[interaction.guildId]["automod"]["blockedRolePings"].includes(role.id))
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), "value": role.id, "default": true });
                        else
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                    }
                    
                    selectionBuilder.setMinValues(0);
                    selectionBuilder.setMaxValues(Math.min(roles.size - i, i + 25));
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }

                interaction.message.delete();
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select roles to block pinging users of"), "components": menus });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        automodMenu(guilds, i);
                    }
                });
            }
        }
        else if (selection.startsWith("allowChannels") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (!guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]) guilds[interaction.guildId]["automod"]["blockedRolePingsRule"] = (await interaction.guild.autoModerationRules.create({ "name": "Golden Auto-Mod Block Role Member Pings", "exemptChannels": guilds[interaction.guildId]["automod"]["allowChannels"], "exemptRoles": guilds[interaction.guildId]["automod"]["allowRoles"], "enabled": true, "reason": "Automatic Golden Auto-Mod Rules", "eventType": 1, "triggerType": 1, "triggerMetadata": { "keywordFilter": [ "tOfYJiCD8OqBynub7SdTcHBBxn17zQ3" ] },"actions": [ { "type": 1, "metadata": { "durationSeconds": 5, "customMessage": "This message was prevented by Golden Bot's automoderation blocking you from pinging this member." } } ] })).id;
            
            guilds[interaction.guildId]["automod"]["allowChannels"] = interaction.values;

            (await interaction.guild.autoModerationRules.fetch()).get(guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]).setExemptChannels(guilds[interaction.guildId]["automod"]["allowChannels"]);

            automodMenu(guilds, interaction);
        }
        else if (selection.startsWith("allowRoles") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
            if (!guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]) guilds[interaction.guildId]["automod"]["blockedRolePingsRule"] = (await interaction.guild.autoModerationRules.create({ "name": "Golden Auto-Mod Block Role Member Pings", "exemptChannels": guilds[interaction.guildId]["automod"]["allowChannels"], "exemptRoles": guilds[interaction.guildId]["automod"]["allowRoles"], "enabled": true, "reason": "Automatic Golden Auto-Mod Rules", "eventType": 1, "triggerType": 1, "triggerMetadata": { "keywordFilter": [ "tOfYJiCD8OqBynub7SdTcHBBxn17zQ3" ] },"actions": [ { "type": 1, "metadata": { "durationSeconds": 5, "customMessage": "This message was prevented by Golden Bot's automoderation blocking you from pinging this member." } } ] })).id;
        
            guilds[interaction.guildId]["automod"]["allowRoles"] = interaction.values;

            (await interaction.guild.autoModerationRules.fetch()).get(guilds[interaction.guildId]["automod"]["blockedRolePingsRule"]).setExemptRoles(guilds[interaction.guildId]["automod"]["allowRoles"]);
            
            automodMenu(guilds, interaction);
        }
        else if (selection.startsWith("blockRolePings") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
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
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select an option:"), components: [ buttons ] });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "toggle") {
                        guilds[interaction.guildId]["welcome"]["enabled"] = !guilds[interaction.guildId]["welcome"]["enabled"];
                    }
                    
                    welcomeMenu(guilds, i);
                });
            }
            else if (interaction.values[0] === "2") {
                const menus = [ ];
                const channels = (await interaction.guild.channels.fetch()).filter(channel => channel.type == discord.ChannelType.GuildText);
                for (let i = 0; i < channels.size - 1; i += 24) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("welcomeChannel" + (i / 24))
                    .setPlaceholder("No Channel Selected")
                    .addOptions(
                        {
                            "label": "Go Back",
                            "description": "Go back to the Property Selection page",
                            "value": "0"
                        }
                    );

                    for (let i2 = i; i2 < Math.min(channels.size - i, i + 24); i2++) {
                        const channel = channels.at(i2);
                        if (channel.type == discord.ChannelType.GuildText) {
                            selectionBuilder.addOptions({ "label": "#" + channel.name.substring(0, 49), value: channel.id });
                        }
                    }
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 0) menus.push(menu);
                }

                interaction.message.delete();
                interaction.channel.send({ "embeds": toEmbed("Select a channel for welcoming"), "components": menus });
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

                    (await submitted.reply({ "embeds": toEmbed("Closing...") })).delete();
                }
                
                welcomeMenu(guilds, interaction);
            }
            else if (interaction.values[0] === "4") {
                const menus = [ ];

                menus.push(new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("back")
                    .setLabel("Go Back")
                    .setStyle(discord.ButtonStyle.Secondary)
                ));

                const roles = (await interaction.guild.roles.fetch()).filter(role => role !== interaction.guild.roles.everyone && !(role.members.size == 1 && role.members.at(0).user.bot));

                for (let i = 0; i < roles.size - 1; i += 24) {
                    const menu = new discord.ActionRowBuilder();
                    
                    const selectionBuilder = new discord.StringSelectMenuBuilder()
                    .setCustomId("welcomeAutoRoles" + (i / 24))
                    .setPlaceholder("No Role Selected")
                    .addOptions(
                        {
                            "label": "Go Back",
                            "description": "Go back to the Property Selection page",
                            "value": "0"
                        }
                    );

                    for (let i2 = i; i2 < Math.min(roles.size - i, i + 24); i2++) {
                        const role = roles.at(i2);
                        if (guilds[interaction.guildId]["welcome"]["autoRoles"].includes(role.id))
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), "value": role.id, "default": true });
                        else
                            selectionBuilder.addOptions({ "label": "@" + role.name.substring(0, 49), value: role.id });
                    }

                    selectionBuilder.setMinValues(0);
                    selectionBuilder.setMaxValues(Math.min(roles.size - i, i + 24));
                    
                    menu.addComponents(selectionBuilder);
                    if (selectionBuilder.options.length > 1) menus.push(menu);
                }

                interaction.message.delete();
                const reply = await interaction.channel.send({ "embeds": toEmbed("Select roles to automatically give users"), "components": menus });
                reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "back") {
                        welcomeMenu(guilds, i);
                    }
                });
            }
        }
        else if (selection.startsWith("welcomeAutoRoles") && interaction.memberPermissions.has(discord.PermissionsBitField.Flags.Administrator)) {
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
            interaction.reply({ "ephemeral": true, "embeds": toEmbed("You do not have permission to use this.") })
        }
    }
    else if (interaction.isChatInputCommand()) {
        const command = interaction.commandName;
        if (command.startsWith("counting")) {
            if (guilds[interaction.guildId]["counting"]["enabled"] && guilds[interaction.guildId]["counting"]["channel"]) {
                if (command == "countingreset") {
                    guilds[interaction.guildId]["counting"]["lastNumber"] = 0;
                    guilds[interaction.guildId]["counting"]["lastCounter"] = null;
                    interaction.reply({ "embeds": toEmbed("Counting reset successfully.") });
                    await interaction.guild.channels.cache.get(guilds[interaction.guildId]["counting"]["channel"]).send({ "embeds": toEmbed("The count has been reset. The next number is 1.") });
                }
                else if (command == "countingoptions") {
                    interaction.reply({ "embeds": toEmbed("Counting channel: <#" + guilds[interaction.guildId]["counting"]["channel"].toString() + "\nNo-Fail Mode: " + (guilds[interaction.guildId]["counting"]["noFail"] ? "on" : "off" ) + "\nNumbers Only: " + (guilds[interaction.guildId]["counting"]["numbersOnly"] ? "on" : "off") + "\nFail on non-number: " + (guilds[interaction.guildId]["counting"]["numbersOnlyFail"] ? "on" : "off") + "\nFail on duplicate count: " + (guilds[interaction.guildId]["counting"]["dupeCountingFail"] ? "on" : "off")) });
                }
                else if (command == "countingnext") {
                    interaction.reply({ "embeds": toEmbed("The next number is " + (guilds[interaction.guildId]["counting"]["lastNumber"] + 1)) });
                }
                else if (command == "countingset") {
                    guilds[interaction.guildId]["counting"]["lastNumber"] = interaction.options.getInteger("count") - 1;
                    guilds[interaction.guildId]["counting"]["lastCounter"] = null;
                    interaction.reply({ "embeds": toEmbed("Count was set to " + interaction.options.getInteger("count") + " successfully.") });
                    await interaction.guild.channels.cache.get(guilds[interaction.guildId]["counting"]["channel"]).send({ "embeds": toEmbed("The count has been set. The next number is " + interaction.options.getInteger("count") + ".") });
                }
            }
            else {
                interaction.reply({ "ephemeral": true, "embeds": toEmbed("Counting is not enabled.") });
            }
        }
        else if (command.startsWith("chat")) {
            if (guilds[interaction.guildId]["leveling"]["enabled"]) {
                if (command === "chatlevel") {
                    const user = interaction.options.getUser("user") ?? interaction.user;
                    if (guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.member.id])
                        interaction.reply({ "ephemeral": true, "content": user.toString() + " is level " + guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.member.id]["level"].toString() + " with " + Math.round(guilds[interaction.guildId]["leveling"]["leaderboard"][interaction.member.id]["xp"]).toString() + "XP." });
                    else interaction.reply({ "embeds": toEmbed(user.toString() + " is level 0 with 0XP.") });
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
                    interaction.reply({ "embeds": toEmbed("Leaderboard:\n" + lb.trim()) });
                }
            }
            else {
                interaction.reply({ "ephemeral": true, "embeds": toEmbed("Leveling is not enabled.") });
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
                const message = await interaction.channel.send({ "embeds": toEmbed(interaction.options.getString("message")), components: [ button ] });
                guilds[interaction.guildId]["tickets"]["openMsg"] = interaction.channelId + "/" + message.id;
                message.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).on("collect", async i => { ticket(i, guilds); });
                interaction.reply({ "ephemeral": true, "embeds": toEmbed("Message sent in current channel.") });
            }
            else {
                interaction.reply({ "ephemeral": true, "embeds": toEmbed("Tickets are not enabled / have a specified category. Please set these up first.") });
            }
        }
        else if (command === "close") {
            if (guilds[interaction.guildId]["tickets"]["enabled"] && guilds[interaction.guildId]["tickets"]["category"] && interaction.channel.parentId === guilds[interaction.guildId]["tickets"]["category"]) {
                const confirmbuttons = new discord.ActionRowBuilder()
                .addComponents(
                    new discord.ButtonBuilder()
                    .setCustomId("close")
                    .setLabel("Close")
                    .setStyle(discord.ButtonStyle.Danger),
                    new discord.ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(discord.ButtonStyle.Secondary)
                );
                const closemsg = await interaction.channel.send({ "embeds": toEmbed("Are you sure you want to close this ticket?"), components: [ confirmbuttons ] });
                closemsg.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                    if (i.customId === "close") {
                        await i.reply({ "embeds": toEmbed("Closing Ticket..."), "ephemeral": true });
                        i.channel.messages.fetchPinned().then(pins => {
                            interaction.channel.permissionOverwrites.delete(pins.first().content.substring(65, pins.first().content.length - 2));
                        })
                        
                        const buttons = new discord.ActionRowBuilder()
                        .addComponents(
                            new discord.ButtonBuilder()
                            .setCustomId("close")
                            .setLabel("Close Ticket")
                            .setStyle(discord.ButtonStyle.Danger),
                            new discord.ButtonBuilder()
                            .setCustomId("save")
                            .setLabel("Save Transcript")
                            .setStyle(discord.ButtonStyle.Secondary)
                        );
                        const message = await i.channel.send({ "embeds": toEmbed("Ticket Closed. Click an action below."), components: [ buttons ] });
                        message.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i2 => {
                            if (i2.customId === "close") {
                                i2.reply({ "embeds": toEmbed("Closing Ticket...") });
                                i2.channel.delete();
                            }
                            else {
                                i2.reply({ "embeds": toEmbed("Ticket Transcript:"), files: [ await createTranscript(i2.channel, { "saveImages": true, "poweredBy": false }) ] });
                            }
                        });
                    }
                    else {
                        i.reply({ "embeds": toEmbed("Close Cancelled") });
                    }
                });
            }
            else {
                interaction.reply({ "ephemeral": true, "embeds": toEmbed("This isn't a ticket channel.") });
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
            interaction.reply({ "embeds": toEmbed("Select a module to manage using the combo-box below."), "components": [ menu ] });
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
                const reply = await interaction.reply({ "ephemeral": true, "embeds": toEmbed("Are you sure you would like to reset all the server configuration?"), "components": [ buttons ] });
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
                        interaction.editReply({ "embeds": toEmbed("Reset complete."), components: [ ] });
                    }
                    else {
                        interaction.editReply({ "embeds": toEmbed("Reset canceled."), components: [ ] });
                    }
                    interaction.replied = true;
                });
            }
            else {
                interaction.reply({ "embeds": toEmbed("Hey, you'll have to ask <@" + interaction.guild.ownerId + "> to run this command as they are the owner.") });
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
            const reply = await interaction.reply({ "ephemeral": true, "embeds": toEmbed("Are you sure you would like to reset all the XP levels?"), "components": [ buttons ] });
            reply.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                if (i.customId === "confirm") {
                    guilds[interaction.guildId]["leveling"]["leaderboard"] = { };
                    Object.keys(guilds[interaction.guildId]["leveling"]["levelRoles"]).forEach(role => {
                        interaction.guild.roles.cache.get(role).members.forEach(member => member.roles.remove(interaction.guild.roles.cache.get(role)));
                    });
                    interaction.editReply({ "embeds": toEmbed("Reset complete."), "components": [ ] });
                }
                else {
                    interaction.editReply({ "embeds": toEmbed("Reset canceled."), "components": [ ] });
                }
                interaction.replied = true;
            });
        }
        else if (command === "reload-level-roles") {
            interaction.reply({ "embeds": toEmbed("Reloading levels. . .") });
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
            interaction.reply({ "ephemeral": true, "embeds": toEmbed("User's logs cleared.") });
        }
        else if (command === "purge") {
            interaction.channel.bulkDelete(interaction.options.getInteger("amount")).then(() => interaction.reply({ "ephemeral": true, "embeds": toEmbed("Purged " + interaction.options.getInteger("amount") + " messages.") }));
        }
        else if (command === "slowmode") {
            try {
                interaction.channel.setRateLimitPerUser(interaction.options.getInteger("time"));
                interaction.reply({ "ephemeral": true, "embeds": toEmbed("Set the slowmode to " + interaction.options.getInteger("time") + " seconds.") });
            }
            catch {
                interaction.reply({ "ephemeral": true, "embeds": toEmbed("Error while setting the slowmode, try a number between 0 & 6 hours (in seconds).") });
            }
        }
        else if (command === "ghostping") {
            (await interaction.channel.send(interaction.options.getMentionable("mention").toString())).delete();
            interaction.reply({ "ephemeral": true, "embeds": toEmbed("Ghost ping sent.") });
        }
        else if (command === "rps") {
            const choice = [ "rock", "paper", "scizzors" ][getRandomInt(3)];
            const otherChoice = interaction.options.getString("option");
            let add = "";

            if (choice == otherChoice) add = "It's a tie!";
            else if (choice == "paper" && otherChoice == "rock") add = "I win!";
            else if (choice == "rock" && otherChoice == "paper") add = "You win!";
            else if (choice == "scizzors" && otherChoice == "paper") add = "I win!";
            else if (choice == "paper" && otherChoice == "scizzors") add = "You win!";
            else if (choice == "rock" && otherChoice == "scizzors") add = "I win!";
            else if (choice == "scizzors" && otherChoice == "rock") add = "You win!";

            interaction.reply({ "embeds": toEmbed("I chose " + choice + ". " + add) });
        }
        else if (command == "flip") {
            interaction.reply({ "embeds": toEmbed("It landed on " + [ "heads", "tails" ][getRandomInt(2)] + ".") });
        }
        else if (command == "roll") {
            interaction.reply({ "embeds": toEmbed("It rolled a " + getRandomIntMin(1, 6) + ".") });
        }
        else if (command == "random") {
            if (interaction.options.getInteger("min"))
                interaction.reply({ "embeds": toEmbed("The number is " + getRandomIntMin(interaction.options.getInteger("min"), interaction.options.getInteger("max") + 1) + ".") });
            else
                interaction.reply({ "embeds": toEmbed("The number is " + getRandomInt(interaction.options.getInteger("max") + 1) + ".") });
        }
        else if (command == "word") {
            const length = interaction.options.getString("length");
            let word = "";
            if (!length) request.get({ "url": "https://random-word-api.vercel.app/api?words=1" }, (err, _res, body) => {
                if (err) word = "The request failed, please try again.";
                else word = "The word is " + JSON.parse(body)[0] + ".";
                interaction.reply({ "embeds": toEmbed(word) });
            });
            else if (length < 1) word = "You can't have a word with the length of " + length + "!";
            else request.get({ "url": "https://random-word-api.vercel.app/api?words=1&length=" + length }, (err, _res, body) => {
                if (err) word = "The request failed, please try again.";
                else word = "The word is " + JSON.parse(body)[0] + ".";
                interaction.reply({ "embeds": toEmbed(word) });
            });
            setTimeout(() => {
                if (!interaction.replied)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
            }, 5000);
        }
        else if (command == "cat") {
            request.get({ "url": "http://random.cat/view/" + getRandomInt(1678) }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": [ new discord.EmbedBuilder().setDescription("**Here's your cat!**").setImage(parse(body).getElementById("cat").rawAttrs.split("\"")[1].split("\"")[0]) ] });
            });
        }
        else if (Object.keys(randomAnimal).includes(command)) {
            const url = await eval("randomAnimal." + command + "()");
            interaction.reply({ "embeds": [ new discord.EmbedBuilder().setDescription("**Here's your " + command + "!**").setImage(url) ] });
        }
        else if (command == "8ball") {
            interaction.reply({ "embeds": toEmbed([ "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful." ][getRandomInt(20)]) });
        }
        else if (command == "fortune") {
            const add = interaction.options.getString("category") ?? "";
            request.get({ "url": "http://yerkee.com/api/fortune/" + add }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("Your fortune:\n" + JSON.parse(body)["fortune"]) });
            });
        }
        else if (command == "meme") {
            request.get({ "url": "https://meme-api.com/gimme" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": [ new discord.EmbedBuilder().setDescription("**Here's your meme!**").setImage(JSON.parse(body)["url"]) ] });
            });
        }
        else if (command == "fact") {
            request.get({ "url": "https://uselessfacts.jsph.pl/api/v2/facts/random" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("Random Fact:\n" + JSON.parse(body)["text"]) });
            });
        }
        else if (command == "fact-of-the-day") {
            request.get({ "url": "https://uselessfacts.jsph.pl/api/v2/facts/today" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("Random Fact:\n" + JSON.parse(body)["text"]) });
            });
        }
        else if (command == "random-site") {
            request.get({ "url": "https://useless-sites--glique.repl.co/api/random" }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": [ new discord.EmbedBuilder().setTitle(JSON.parse(body)["title"]).setDescription("**Here's your random site!**").setImage(JSON.parse(body)["image"]).setURL(JSON.parse(body)["url"]) ] });
            });
        }
        else if (command == "dadjoke") {
            request.get({ "url": "https://icanhazdadjoke.com/", "headers": { "Accept": "text/plain" } }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("Your dad joke:\n" + body) });
            });
        }
        else if (command == "agify") {
            request.get({ "url": "https://api.agify.io/?name=" + interaction.options.getString("name") }, (err, _res, body) => {
                if (err)
                    interaction.reply({ "embeds": toEmbed("An error occured, please try again.") });
                else
                    interaction.reply({ "embeds": toEmbed("I think you are " + JSON.parse(body)["age"] + " years old.") });
            });
        }
        else if (command == "toggle-command") {
            await interaction.guild.commands.fetch();
            let commandSelected = null;
            interaction.guild.commands.cache.forEach(cmd => { if (cmd.name == interaction.options.getString("command").substring(1)) commandSelected = cmd; });
            
            if (commandSelected) {
                commandSelected.delete();
                interaction.reply({ "embeds": toEmbed("The command " + interaction.options.getString("command") + " was disabled.") });
            }
            else {
                commandList.forEach(cmd => {
                    if (cmd["name"] == interaction.options.getString("command").substring(1))
                        interaction.guild.commands.create(cmd);
                })
                interaction.reply({ "embeds": toEmbed("The command " + interaction.options.getString("command") + " was enabled.") });
            }
        }
        else if (command == "reset-commands") {
            if (interaction.guild) {
                interaction.guild.commands.set(commandList);
                interaction.reply({ "embeds": toEmbed("All commands were reset.") });
            }
            else {
                interaction.reply({ "embeds": toEmbed("You can't use that here.") });
            }
        }
        else if (command == "giveaway") {
            const channel = interaction.options.getChannel("channel") ?? interaction.channel;
            interaction.reply({ "embeds": toEmbed("Giveaway created in " + channel.toString() + "."), "ephemeral": true });
            const buttons = new discord.ActionRowBuilder()
            .addComponents(
                new discord.ButtonBuilder()
                .setCustomId("enter")
                .setLabel("Enter Giveaway")
                .setStyle(discord.ButtonStyle.Primary)
            );

            const msg = await channel.send({ "embeds": [ new discord.EmbedBuilder().setTitle("**Giveaway for " + interaction.options.getString("prize") + "**").setDescription("**Winners: " + (interaction.options.getInteger("winners") ?? 1) + "\nEntries: 0\nEnding: <t:" + Math.floor((new Date().getTime() + durationConvert(interaction.options.getInteger("duration"))) / 1000) + ":R>\nBy: " + interaction.member.toString() + "**") ], "components": [ buttons ] });
            
            guilds[i.guildId]["misc"]["giveaways"][msg.channel.id + "/" + msg.id] = { "entries": [ ], "endTime": new Date().getTime() + durationConvert(interaction.options.getInteger("duration")), "winners": (interaction.options.getInteger("winners") ?? 1), "hoster": interaction.member.toString(), "prize": interaction.options.getString("prize") };

            msg.createMessageComponentCollector({ "componentType": discord.ComponentType.Button }).once("collect", async i => {
                if (guilds[i.guildId]["misc"]["giveaways"][msg.channel.id + "/" + msg.id]["entries"].includes(i.user.id)) {
                    i.reply({ "embeds": toEmbed("You've already entered the giveaway."), "ephemeral": true });
                }
                else {
                    i.reply({ "embeds": toEmbed("You've been entered into the giveaway."), "ephemeral": true });
                    if (guilds[i.guildId]["misc"]["giveaways"][msg.channel.id + "/" + msg.id]["entries"].length % 5 == 0)
                        msg.edit({ "embeds": [ new discord.EmbedBuilder().setTitle("**Giveaway for " + interaction.options.getString("prize") + "**").setDescription("**Winners: " + (interaction.options.getInteger("winners") ?? 1) + "\nEntries: " + guilds[i.guildId]["misc"]["giveaways"][msg.channel.id + "/" + msg.id]["entries"].length + "\nEnding: <t:" + Math.floor((new Date().getTime() + durationConvert(interaction.options.getInteger("duration"))) / 1000) + ":R>\nBy: " + interaction.member.toString() + "**") ] });
                    guilds[i.guildId]["misc"]["giveaways"][msg.id]["entries"].push(i.user.id);
                }
            });
        }
        else {
            interaction.reply({ "embeds": toEmbed("This command is outdated. Please ask an administrator to run `/reset-commands` to fix this.") });
        }
    }
    fs.writeFileSync("./guilds.json", JSON.stringify(guilds));
});

setInterval(() => {
    Object.keys(guilds).forEach(guild => {
        try {
            Object.keys(guilds[guild]["moderation"]["modlogs"]).forEach(user => {
                guilds[guild]["moderation"]["modlogs"][user].forEach(punishment => {
                    if (client.guilds.cache.get(guild).bans.cache.has(user) && punishment["type"] === "ban" && punishment["duration"] !== -1 && new Date().getTime() >= punishment["time"] + punishment["duration"])
                        client.guilds.cache.get(guild).members.unban(user, "Automatic unban (ban expired)");
                });
            });
            Object.keys(guilds[guild]["misc"]["giveaways"]).forEach(async giveaway => {
                if (guilds[guild]["misc"]["giveaways"][giveaway]["endTime"] >= new Date().getTime() - 300000) {
                    const channel = await client.guilds.cache.get(guild).channels.fetch(giveaway.split("/")[0]);
                    const msg = await channel.messages.fetch(giveaway.split("/")[1]);
                        
                    const buttons = new discord.ActionRowBuilder()
                    .addComponents(
                        new discord.ButtonBuilder()
                        .setCustomId("enter")
                        .setLabel("Enter Giveaway")
                        .setStyle(discord.ButtonStyle.Primary)
                        .setDisabled(true)
                    );

                    const winners = [ ];

                    for (let i = 0; i < guilds[guild]["misc"]["giveaways"][giveaway]["winners"]; i++) {
                        winners.push(guilds[i.guildId]["misc"]["giveaways"][giveaway]["entries"][getRandomInt(guilds[i.guildId]["misc"]["giveaways"][giveaway]["entries"].length)]);
                    }

                    msg.edit({ "embeds": [ new discord.EmbedBuilder().setTitle("**Giveaway for " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["prize"] + "**").setDescription("**Winners: <@" + winners.join(">, <@") + ">\nEntries: " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["entries"].length + "\nEnded: <t:" + (guilds[i.guildId]["misc"]["giveaways"][giveaway]["endTime"] / 1000) + ":R>\nBy: " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["hoster"] + "**") ], "components": [ buttons ] });

                    channel.send({ "embeds": toEmbed("<@" + winners.join(">, <@") + "> won the " + guilds[guild]["misc"]["giveaways"][giveaway]["prize"] + "!!!\nPlease be patient as " + guilds[i.guildId]["misc"]["giveaways"][giveaway]["hoster"] + " gives you your prize.") });

                    delete guilds[guild]["misc"]["giveaways"][giveaway];
                }
            });
        } catch { }
    });
}, 300000);

setInterval(() => {
    Object.keys(guilds).forEach(guild => {
        try {
            Object.keys(guilds[guild]["moderation"]["modlogs"]).forEach(user => {
                guilds[guild]["moderation"]["modlogs"][user].forEach(punishment => {
                    if (punishment["type"] === "mute" && new Date().getTime() <= punishment["time"] + punishment["duration"])
                        client.guilds.cache.get(guild).members.cache.get(user).timeout(Math.min(punishment["time"] + punishment["duration"], 604800000), "Automatic Re-timeout (continuing punishment)");
                });
            });
        } catch { }
    });
}, 86400000);

client.login("MTEyNTU2ODcxMTkyMzg2MzY3NA.GZ8EWf.n-Bb9A2-VlRW5tiK9f9kLe38q52Jcl0H2-RkC8");