const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1372617878318219377';

const guildIdOrigen = '1128463380554993774';
const canalIdBarrios = '1128463381704212507';
const canalIdSedes = '1128463381704212506';

const guildIdPrueba = '737402963617775748';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const commands = [
  new SlashCommandBuilder().setName('barrios').setDescription('Copia mensajes e imágenes del canal de barrios'),
  new SlashCommandBuilder().setName('sedes').setDescription('Copia mensajes e imágenes del canal de sedes')
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registrando comandos...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, guildIdPrueba),
      { body: commands },
    );
    console.log('Comandos registrados');
  } catch (error) {
    console.error(error);
  }
}

client.once('ready', () => {
  console.log(`Bot listo como ${client.user.tag}`);
  registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const rolPermitido = '🚩 | Staff Organizaciones'; 


  if (!interaction.member.roles.cache.some(role => role.name === rolPermitido)) {
    return interaction.reply({
      content: '❌ No tienes permisos para usar este comando.',
      ephemeral: true
    });
  }

  let canalFuenteId = null;
  if (interaction.commandName === 'barrios') {
    canalFuenteId = canalIdBarrios;
  } else if (interaction.commandName === 'sedes') {
    canalFuenteId = canalIdSedes;
  } else {
    return;
  }

  try {
    const guildOrigen = client.guilds.cache.get(guildIdOrigen);
    if (!guildOrigen) {
      console.error('No pude encontrar el servidor origen.');
      return interaction.reply('❌ No puedo encontrar el servidor origen.');
    }

    const canalOrigen = guildOrigen.channels.cache.get(canalFuenteId);
    if (!canalOrigen) {
      console.error('No puedo acceder al canal origen.');
      return interaction.reply('❌ No puedo acceder al canal origen.');
    }

    const messages = await canalOrigen.messages.fetch({ limit: 50 });
    if (!messages || messages.size === 0) {
      return interaction.reply('No hay mensajes para copiar.');
    }

    const canalDestino = interaction.channel;

    for (const message of messages.values()) {
      let texto = message.content || '';
      let archivos = [];

      if (message.attachments.size > 0) {
        message.attachments.forEach(att => {
          archivos.push(new AttachmentBuilder(att.url));
        });
      }

      await canalDestino.send({ content: texto, files: archivos });
    }

    await interaction.reply('✅ Mensajes copiados con éxito.');
  } catch (error) {
    console.error('Error copiando mensajes:', error);
    await interaction.reply('❌ Hubo un error copiando los mensajes.');
  }
});

client.login(TOKEN);

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot activo y funcionando 👍");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor web escuchando en el puerto ${PORT}`);
});