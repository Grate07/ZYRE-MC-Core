const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} = require('discord.js');

const ONYX = 0x0f0f0f;

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function container() {
  return new ContainerBuilder().setAccentColor(ONYX);
}

function textContainer(content) {
  return container().addTextDisplayComponents(text(content));
}

function imageGallery(attachmentName) {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`),
  );
}

function logoThumbnail(attachmentName) {
  return new ThumbnailBuilder().setURL(`attachment://${attachmentName}`);
}

function separator() {
  return new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);
}

function componentsV2Options(components, options = {}) {
  const result = {
    components,
    flags: MessageFlags.IsComponentsV2 | (options.ephemeral ? MessageFlags.Ephemeral : 0),
    allowedMentions: options.allowedMentions ?? { parse: [], users: [], roles: [] },
    ...(options.files ? { files: options.files } : {}),
  };
  if (options.replaceAttachments) result.attachments = [];
  return result;
}

function makeLeaderboardButtons(page, pageCount) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prev_lb:${page}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`next_lb:${page}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= pageCount - 1),
  );
  return row;
}

module.exports = {
  ONYX,
  text,
  container,
  textContainer,
  imageGallery,
  logoThumbnail,
  separator,
  componentsV2Options,
  makeLeaderboardButtons,
};
