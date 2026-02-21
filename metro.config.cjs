const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// In locked-down Windows environments, fewer workers often avoids EPERM spawn failures
config.maxWorkers = 1;

module.exports = config;
