const { exec } = require("child_process");
const fs = require("fs");
const keepAlive = require("./keep_alive");

const { Client, Intents, MessageEmbed } = require("discord.js");
const axios = require("axios");
require("dotenv").config();

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
});

const commandChannelId = "1252277316948725792";

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const guild = client.guilds.cache.get("1252263218496405614");
  if (guild) {
    await guild.commands.set([
      {
        name: "chk",
        description: "تحقق من الروابط في ملف نصي",
      },
    ]);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user, channel } = interaction;

  if (commandName === "chk" && channel.id === commandChannelId) {
    await interaction.reply("من فضلك أرسل الملف النصي المطلوب.");

    const fileFilter = (response) =>
      response.author.id === user.id &&
      response.channel.id === channel.id &&
      response.attachments.size > 0;

    try {
      const fileCollected = await channel.awaitMessages({
        filter: fileFilter,
        max: 1,
        time: 60000,
        errors: ["time"],
      });
      const attachment = fileCollected.first().attachments.first();

      if (attachment.name.endsWith(".txt")) {
        const filePath = `./${attachment.name}`;
        const response = await axios.get(attachment.url, {
          responseType: "stream",
        });
        response.data.pipe(fs.createWriteStream(filePath));
        response.data.on("end", async () => {
          await interaction.followUp(
            "تم استلام الملف بنجاح جاري فحص الروابط الرجاء الانتظار (قد يستغرق الأمر وقتا)"
          );

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

          const checkUrlsFromFile = async (filePath) => {
            const results = [];
            try {
              const data = fs.readFileSync(filePath, "utf-8");
              const urls = data.split("\n");
              for (const url of urls) {
                if (url.trim()) {
                  results.push(await checkUrl(url.trim()));
                }
              }
            } catch (error) {
              results.push(`حدث خطأ أثناء قراءة الملف: ${error.message}`);
            }
            return results;
          };

          const results = await checkUrlsFromFile(filePath);
          fs.unlinkSync(filePath);

          try {
            await user.send(results.join("\n"));
          } catch (error) {
            await interaction.followUp("الرجاء فتح الخاص لاستلام النتائج.");
          }
        });
      } else {
        await interaction.followUp("الملف المرسل ليس ملف نصي.");
      }
    } catch (error) {
      console.error(error);
      await interaction.followUp(`حدث خطأ غير متوقع: ${error.message}`);
    }
  }
});

keepAlive();
client.login(process.env.TOKEN);