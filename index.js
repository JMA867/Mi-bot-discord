const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1372617878318219377';

// IDs de servidores y canales
const guildIdOrigen = '1128463380554993774';
const canalIdBarrios = '1128463381704212507'; // Canal origen para /barrios
const canalIdSedes = '1128463381704212506';    // Canal origen para /sedes (reemplázalo por el correcto)

const guildIdPrueba = '737402963617775748';

const roleIDPermitido = '1046818716572188782'; // 👈 Reemplaza este ID

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Registrar los comandos /barrios y /sedes
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

  let canalFuenteId = null;
  if (interaction.commandName === 'barrios') {
    canalFuenteId = canalIdBarrios;
  } else if (interaction.commandName === 'sedes') {
    canalFuenteId = canalIdSedes;
  } else {
    return;
  }

  try {
    // Defiere la respuesta para tener más tiempo
    await interaction.deferReply();

    const guildOrigen = client.guilds.cache.get(guildIdOrigen);
    if (!guildOrigen) {
      return interaction.editReply('❌ No puedo encontrar el servidor origen.');
    }

    const canalOrigen = guildOrigen.channels.cache.get(canalFuenteId);
    if (!canalOrigen) {
      return interaction.editReply('❌ No puedo acceder al canal origen.');
    }

    const messages = await canalOrigen.messages.fetch({ limit: 50 });
    if (!messages || messages.size === 0) {
      return interaction.editReply('No hay mensajes para copiar.');
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

    await interaction.editReply('✅ Mensajes copiados con éxito.');
  } catch (error) {
    console.error('Error copiando mensajes:', error);
    // Si ya deferiste la respuesta, usa editReply, si no, reply
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ Hubo un error copiando los mensajes.');
    } else {
      await interaction.reply('❌ Hubo un error copiando los mensajes.');
    }
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