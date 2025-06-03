require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, Routes, InteractionType } = require('discord.js');
const { REST } = require('@discordjs/rest');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

// Variáveis de ambiente
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Registro do comando /enviarpainelregistro
const commands = [
  new SlashCommandBuilder()
    .setName('enviarpainelregistro')
    .setDescription('Envia o painel de registro para novos membros')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Comando registrado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar comando:', error);
  }
})();

client.once('ready', () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'enviarpainelregistro') {
      const embed = new EmbedBuilder()
        .setTitle('Sistema de Registro - COE')
        .setDescription(
          '👮‍♂️ Bem-vindo ao sistema de registro da **COE**!\n\n' +
          '📝 Clique no botão abaixo para iniciar seu processo de registro.\n\n' +
          '📌 Certifique-se de preencher corretamente:\n' +
          '> 🔹 Nome In-Game\n> 🔹 ID In-Game\n\n' +
          '⏳ Sua solicitação será analisada por um membro autorizado.\n\n' +
          '**Boa sorte, recruta!** 🚓'
        )
        .setColor(0x2f3136);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('solicitar_registro')
          .setLabel('SOLICITAR REGISTRO')
          .setStyle(ButtonStyle.Primary)
      );

      const canal = await client.channels.fetch('1379503563805425704');
      if (canal) await canal.send({ embeds: [embed], components: [row] });

      await interaction.reply({ content: '✅ Painel de registro enviado com sucesso!', ephemeral: true });
    }
  }

  if (interaction.isButton() && interaction.customId === 'solicitar_registro') {
    const modal = new ModalBuilder()
      .setCustomId('modal_registro')
      .setTitle('Registro Policial');

    const nomeInput = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Nome In-Game')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Carlos Santos')
      .setRequired(true);

    const idInput = new TextInputBuilder()
      .setCustomId('id')
      .setLabel('ID In-Game')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 215')
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(nomeInput);
    const row2 = new ActionRowBuilder().addComponents(idInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
    const nome = interaction.fields.getTextInputValue('nome');
    const id = interaction.fields.getTextInputValue('id');

    const embed = new EmbedBuilder()
      .setTitle('Nova Solicitação de Registro')
      .setDescription(`**Usuário:** <@${interaction.user.id}>`)
      .addFields(
        { name: 'Nome In-Game', value: nome, inline: true },
        { name: 'ID In-Game', value: id, inline: true }
      )
      .setColor(0x00b0f4)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aceitar_registro_${interaction.user.id}`)
        .setLabel('Aceitar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`negar_registro_${interaction.user.id}`)
        .setLabel('Negar')
        .setStyle(ButtonStyle.Danger)
    );

    const canal = await client.channels.fetch('1379514289387212862');
    if (canal) await canal.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: '📨 Sua solicitação foi enviada com sucesso!', ephemeral: true });
  }

  if (interaction.isButton()) {
    const [action, , userId] = interaction.customId.split('_');
    if (!['aceitar', 'negar'].includes(action)) return;

    if (!interaction.member.roles.cache.has('1379499840043487262')) {
      return interaction.reply({ content: '🚫 Você não tem permissão para isso.', ephemeral: true });
    }

    const embed = interaction.message.embeds[0];
    const nome = embed.fields[0].value;
    const id = embed.fields[1].value;
    const membro = await interaction.guild.members.fetch(userId).catch(() => null);
    const canalLogs = await client.channels.fetch('1379499881130885240');

    if (action === 'aceitar' && membro) {
      const nick = `「COE」REC ${nome}「${id}」`.slice(0, 32);
      await membro.setNickname(nick).catch(() => null);

      const cargos = ['1379499600808771674', '1379499590419611767', '1379499611026362441', 'tag', 'tag'];
      for (const c of cargos) await membro.roles.add(c).catch(() => null);

      await interaction.update({ content: `✅ Registro aceito por ${interaction.user}`, embeds: [], components: [] });

      const log = new EmbedBuilder()
        .setTitle('Registro Aceito')
        .setDescription(`**Solicitante:** <@${userId}>\n**Nome:** ${nome}\n**ID:** ${id}\n**Responsável:** ${interaction.user}`)
        .setColor(0x00ff00)
        .setTimestamp();
      if (canalLogs) canalLogs.send({ embeds: [log] });

      setTimeout(() => interaction.message.delete().catch(() => null), 60000);
    }

    if (action === 'negar') {
      await interaction.update({ content: `❌ Registro negado por ${interaction.user}`, embeds: [], components: [] });

      const log = new EmbedBuilder()
        .setTitle('Registro Negado')
        .setDescription(`**Solicitante:** <@${userId}>\n**Nome:** ${nome}\n**ID:** ${id}\n**Responsável:** ${interaction.user}`)
        .setColor(0xff0000)
        .setTimestamp();
      if (canalLogs) canalLogs.send({ embeds: [log] });

      setTimeout(() => interaction.message.delete().catch(() => null), 60000);
    }
  }
});

client.login(TOKEN);

const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot está online!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
