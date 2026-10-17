const { PermissionFlagsBits } = require('discord.js');
const { config } = require('./config');

// The configured admin role is the primary gate; Discord administrators are also allowed.
function isAuthorized(member) {
  if (!member) return false;

  const roles = member.roles;
  const hasConfiguredRole =
    roles?.cache?.has(config.adminRoleId) ||
    (Array.isArray(roles) && roles.includes(config.adminRoleId));
  const isAdministrator =
    typeof member.permissions?.has === 'function' &&
    member.permissions.has(PermissionFlagsBits.Administrator);

  return Boolean(hasConfiguredRole || isAdministrator);
}

module.exports = { isAuthorized };
