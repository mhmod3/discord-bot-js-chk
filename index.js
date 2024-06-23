const { exec } = require("child_process");
const { Client, Intents, MessageEmbed } = require("discord.js");
const axios = require("axios");
require("dotenv").config();
const keepAlive = require("./keep_alive");

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
});

const commandChannelId = "1252277316948725792";
const cooldowns = new Map();

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const guild = client.guilds.cache.get("1252263218496405614");
  if (guild) {
    await guild.commands.set([
      {
        name: "chk",
        description: "تحقق من رابط معين",
        options: [
          {
            name: "url",
            type: "STRING",
            description: "الرابط",
            required: true,
          },
        ],
      },
    ]);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user, channel } = interaction;

  if (commandName === "chk" && channel.id === commandChannelId) {
    const url = interaction.options.getString("url");

    const cooldownAmount = 30 * 1000;
    const now = Date.now();
    const timestamps = cooldowns.get(user.id);

    if (timestamps) {
      const expirationTime = timestamps + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return interaction.reply(
          `الرجاء الانتظار ${timeLeft.toFixed(1)} ثانية قبل استخدام هذا الأمر مرة أخرى.`
        );
      }
    }

    cooldowns.set(user.id, now);
    setTimeout(() => cooldowns.delete(user.id), cooldownAmount);

    await interaction.deferReply();

    const checkUrl = async (url) => {
      try {
        const response = await axios.get(url, { timeout: 10000 });
        return response.status === 404
          ? `الرابط هذا لا يعمل: ${url}`
          : `الرابط هذا يعمل: ${url}`;
      } catch (error) {
        return `حدث خطأ أثناء محاولة الوصول إلى الرابط ${url}: ${error.message}`;
      }
    };

    try {
      const result = await checkUrl(url);
      await interaction.editReply(result);
    } catch (error) {
      console.error(error);
      await interaction.editReply(`حدث خطأ غير متوقع: ${error.message}`);
    }
  }
});

keepAlive();
client.login(process.env.TOKEN);
