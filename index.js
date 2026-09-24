require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// 1. Servidor Express (Web e API Backend)
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Importa e ativa as rotas de Autenticação
const authRoutes = require('./routes/authRoutes');
app.use('/api/v1/auth', authRoutes);

app.get('/ping', (req, res) => {
  res.status(200).send('OK - Bot Alive');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor Web e Backend rodando na porta ${PORT}`);
});

// 2. Inicialização do Bot do Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.lstatSync(folderPath).isDirectory()) {
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
        }
      }
    }
  }
}

require('./interacoes')(client);

client.once(Events.ClientReady, c => {
  console.log(`🤖 Bot RP Manager online como ${c.user.tag}`);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ ERRO: A variável DISCORD_TOKEN não foi encontrada!');
  process.exit(1);
}

client.login(token);
