const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
require("dotenv").config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1372617878318219377";

const CANAL_ORIGEN_BARRIOS_ID = "1128463381704212507";
const CANAL_ORIGEN_SEDES_ID = "1128463381704212506";
const CANAL_LOGS_ID = "1000182522849800334";

const ROL_PERMITIDO_NOMBRE = "\ud83d\udea9 | Staff Organizaciones";
const COOLDOWN_TIEMPO = 30 * 1000;
const cooldowns = {};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("barrios")
    .setDescription("Pasar barrios a este canal"),

  new SlashCommandBuilder()
    .setName("sedes")
    .setDescription("Pasar sedes a este canal"),

  new SlashCommandBuilder()
    .setName("anuncios")
    .setDescription("Enviar un anuncio a un canal espec\u00edfico")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se enviar\u00e1 el anuncio")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("mensaje")
        .setDescription("Contenido del mensaje")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("bloquercanal")
    .setDescription("Bloquea el canal para que los usuarios no puedan enviar mensajes.")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal a bloquear")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("limpiar")
    .setDescription("Elimina una cantidad espec\u00edfica de mensajes de un canal.")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal del que se eliminar\u00e1n los mensajes")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("N\u00famero de mensajes a eliminar (m\u00e1ximo 100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    console.log("\ud83d\udce6 Registrando comandos slash...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("\u2705 Comandos registrados");
  } catch (error) {
    console.error("\u274c Error al registrar comandos:", error);
  }
})();

client.once("ready", () => {
  console.log(`\ud83e\udd16 Bot listo como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const userTag = interaction.user.tag;
  const command = interaction.commandName;

  const member = await interaction.guild.members.fetch(userId);
  const tieneRol = member.roles.cache.some(
    (r) => r.name === ROL_PERMITIDO_NOMBRE
  );

  if (!tieneRol) {
    return interaction.reply({
      content: `\u274c No tienes el rol "${ROL_PERMITIDO_NOMBRE}" para usar este comando.`,
      ephemeral: true,
    });
  }

  const claveCooldown = `${userId}_${command}`;
  const ahora = Date.now();

  if (
    cooldowns[claveCooldown] &&
    ahora - cooldowns[claveCooldown] < COOLDOWN_TIEMPO
  ) {
    const restante = Math.ceil(
      (COOLDOWN_TIEMPO - (ahora - cooldowns[claveCooldown])) / 1000
    );
    return interaction.reply({
      content: `\u23f3 Espera ${restante} segundos para volver a usar /${command}.`,
      ephemeral: true,
    });
  }
  cooldowns[claveCooldown] = ahora;

  const now = new Date();
  const tiempo = `${now.getDate().toString().padStart(2, "0")}/$${
    (now.getMonth() + 1).toString().padStart(2, "0")
  }/${now.getFullYear()} - ${now
    .getHours()
    .toString()
    .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  if (command === "barrios" || command === "sedes") {
    await interaction.deferReply({ ephemeral: true });

    const canalOrigenID =
      command === "barrios"
        ? CANAL_ORIGEN_BARRIOS_ID
        : CANAL_ORIGEN_SEDES_ID;
    try {
      const canalOrigen = await client.channels.fetch(canalOrigenID);
      const canalDestino = interaction.channel;

      if (!canalOrigen || !canalDestino) {
        return interaction.editReply("\u274c No se pudo acceder a los canales.");
      }

      const mensajes = await canalOrigen.messages.fetch({ limit: 30 });
      let enviados = 0;

      for (const [, msg] of mensajes.reverse()) {
        const contenido = msg.content;
        const imagenes = msg.attachments.filter((a) =>
          a.contentType?.startsWith("image/")
        );

        if (contenido || imagenes.size > 0) {
          await canalDestino.send({
            content: contenido || undefined,
            files: imagenes.map((a) => a.url),
          });
          enviados++;
        }
      }

      const embedLog = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("\ud83d\udcdd Comando usado")
        .addFields(
          { name: "Usuario", value: `${userTag} (<@${userId}>)`, inline: true },
          { name: "Comando", value: `/${command}`, inline: true },
          { name: "Fecha y hora", value: tiempo }
        )
        .setTimestamp();

      const canalLogs = await client.channels.fetch(CANAL_LOGS_ID);
      if (canalLogs) {
        canalLogs.send({ embeds: [embedLog] });
      }

      await interaction.editReply(
        `\u2705 Se pasaron ${enviados} mensajes desde /${command}.`
      );
    } catch (error) {
      console.error("\u274c Error copiando mensajes:", error);
      await interaction.editReply("\u274c Ocurri\u00f3 un error copiando los mensajes.");
    }
  }

  if (command === "anuncios") {
    const canalDestino = interaction.options.getChannel("canal");
    const mensaje = interaction.options.getString("mensaje");

    if (!canalDestino.isTextBased()) {
      return interaction.reply({
        content: "\u274c El canal seleccionado no es de texto.",
        ephemeral: true,
      });
    }

    try {
      await canalDestino.send(mensaje);

      const embedLog = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("\ud83d\udce2 Anuncio enviado")
        .addFields(
          { name: "Usuario", value: `${userTag} (<@${userId}>)`, inline: true },
          { name: "Canal", value: `<#${canalDestino.id}>`, inline: true },
          { name: "Mensaje", value: mensaje },
          { name: "Fecha y hora", value: tiempo }
        )
        .setTimestamp();

      const canalLogs = await client.channels.fetch(CANAL_LOGS_ID);
      if (canalLogs) {
        canalLogs.send({ embeds: [embedLog] });
      }

      return interaction.reply({
        content: `\u2705 Anuncio enviado correctamente a <#${canalDestino.id}>.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("\u274c Error al enviar el anuncio:", error);
      return interaction.reply({
        content: "\u274c Ocurri\u00f3 un error al enviar el anuncio.",
        ephemeral: true,
      });
    }
  }

  if (command === "bloquercanal") {
    const canal = interaction.options.getChannel("canal");
    try {
      await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      });

      await interaction.reply({
        content: `\u2705 Canal <#${canal.id}> bloqueado correctamente.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("\u274c Error al bloquear el canal:", error);
      await interaction.reply({
        content: "\u274c Ocurri\u00f3 un error al bloquear el canal.",
        ephemeral: true,
      });
    }
  }

  if (command === "limpiar") {
    const canal = interaction.options.getChannel("canal");
    const cantidad = interaction.options.getInteger("cantidad");

    if (!canal.isTextBased()) {
      return interaction.reply({
        content: "\u274c El canal seleccionado no es de texto.",
        ephemeral: true,
      });
    }

    try {
      const mensajesBorrados = await canal.bulkDelete(cantidad, true);

      const embedLog = new EmbedBuilder()
        .setColor("#0066CC")
        .setTitle("\ud83e\uddf9 Limpieza de canal")
        .addFields(
          { name: "Usuario", value: `${userTag} (<@${userId}>)`, inline: true },
          { name: "Canal", value: `<#${canal.id}>`, inline: true },
          { name: "Mensajes borrados", value: `${mensajesBorrados.size}`, inline: true },
          { name: "Fecha y hora", value: tiempo }
        )
        .setTimestamp();

      const canalLogs = await client.channels.fetch(CANAL_LOGS_ID);
      if (canalLogs) {
        canalLogs.send({ embeds: [embedLog] });
      }

      return interaction.reply({
        content: `\u2705 Se han borrado ${mensajesBorrados.size} mensajes de <#${canal.id}>.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("\u274c Error al limpiar mensajes:", error);
      return interaction.reply({
        content: "\u274c Ocurri\u00f3 un error al intentar borrar los mensajes. Aseg\u00farate de que los mensajes no tengan m\u00e1s de 14 d\u00edas.",
        ephemeral: true,
      });
    }
  }
});

require('./web');
client.login(TOKEN);
