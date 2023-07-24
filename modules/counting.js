const discord = require("discord.js");

module.exports = { "count": function(interaction, guilds) {
    if (!isNaN(parseInt(interaction.content.trim()))) {
        if (interaction.author.id !== guilds[interaction.guildId]["counting"]["lastCounter"]) {
            if (guilds[interaction.guildId]["counting"]["lastNumber"] + 1 == parseInt(interaction.content.trim())) {
                guilds[interaction.guildId]["counting"]["lastNumber"]++;
                interaction.react("✅");
                guilds[interaction.guildId]["counting"]["lastCounter"] = interaction.author.id;
            }
            else if (!guilds[interaction.guildId]["counting"]["noFail"]) {
                interaction.channel.send(interaction.author.toString() + " messed up the count at " + guilds[interaction.guildId]["counting"]["lastNumber"] + " 😭. You'll need to start back at 1.");
                interaction.react("❌");
                guilds[interaction.guildId]["counting"]["lastNumber"] = 0;
                guilds[interaction.guildId]["counting"]["lastCounter"] = null;
            }
            else {
                interaction.channel.send(interaction.author.toString() + " messed up the count, but you can continue the count at " + (guilds[interaction.guildId]["counting"]["lastNumber"] + 1) + ".");
                interaction.react("❌");
                guilds[interaction.guildId]["counting"]["lastCounter"] = interaction.author.id;
            }
        }
        else {
            if (guilds[interaction.guildId]["counting"]["dupeCountingFail"] && !guilds[interaction.guildId]["counting"]["noFail"]) {
                interaction.channel.send(interaction.author.toString() + " messed up the count at " + guilds[interaction.guildId]["counting"]["lastNumber"] + " by counting twice in a row 😭. You'll need to start back at 1.");
                interaction.react("❌");
                guilds[interaction.guildId]["counting"]["lastNumber"] = 0;
                guilds[interaction.guildId]["counting"]["lastCounter"] = null;
            }
            else {
                interaction.channel.send(interaction.author.toString() + " messed up the count by counting twice in a row, but you can continue the count at " + (guilds[interaction.guildId]["counting"]["lastNumber"] + 1) + ".");
                interaction.react("❌");
                guilds[interaction.guildId]["counting"]["lastCounter"] = interaction.author.id;
            }
        }
    }
    else if (guilds[interaction.guildId]["counting"]["numbersOnly"]) {
        if (guilds[interaction.guildId]["counting"]["numbersOnlyFail"] && !guilds[interaction.guildId]["counting"]["noFail"]) {
            interaction.channel.send(interaction.author.toString() + " messed up the count at " + guilds[interaction.guildId]["counting"]["lastNumber"] + " by talking 😭. You'll need to start back at 1.");
            interaction.react("❌");
            guilds[interaction.guildId]["counting"]["lastNumber"] = 0;
            guilds[interaction.guildId]["counting"]["lastCounter"] = null;
        }
        else {
            interaction.delete();
        }
    }
}, "countingMenu": function(guilds, interaction) {
    const menu = new discord.ActionRowBuilder()
        .addComponents(
            new discord.StringSelectMenuBuilder()
            .setCustomId("countingProperty")
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
                    "description": "Turn on or off the counting module (" + (guilds[interaction.guildId]["counting"]["enabled"] ? "on" : "off") + ")",
                    "value": "1"
                },
                {
                    "label": "Counting Channel",
                    "description": "Sets the channel for counting (" + (guilds[interaction.guildId]["counting"]["channel"] ? "#" + interaction.guild.channels.cache.get(guilds[interaction.guildId]["counting"]["channel"]).name.substring(0, 42) : "[none]") + ")",
                    "value": "2"
                },
                {
                    "label": "No-Fail Mode",
                    "description": "Stop the ability to mess up and reset the count (" + (guilds[interaction.guildId]["counting"]["noFail"] ? "on" : "off") + ")",
                    "value": "3"
                },
                {
                    "label": "Numbers Only",
                    "description": "Deny members to talk in the channel (" + (guilds[interaction.guildId]["counting"]["numbersOnly"] ? "on" : "off") + ")",
                    "value": "4"
                },
                {
                    "label": "Numbers Only Failure",
                    "description": "End the count if someone talks and no-fail is off (" + (guilds[interaction.guildId]["counting"]["numbersOnlyFail"] ? "on" : "off") + ")",
                    "value": "5"
                },
                {
                    "label": "Duplicate Counting Failure",
                    "description": "Fail the count if a member counts twice in a row (" + (guilds[interaction.guildId]["counting"]["dupeCountingFail"] ? "on" : "off") + ")",
                    "value": "6"
                },
            )
        );
        
        if (interaction.message && interaction.message.deletable) interaction.message.delete();
        interaction.channel.send({ "content": "`Select which property you would like to edit`", "components": [ menu ] });
} };