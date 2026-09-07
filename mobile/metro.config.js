// Projeto isolado: sem monorepo, sem watchFolders extras. A única coisa que o
// Metro precisa aqui é o NativeWind traduzindo o CSS para estilos RN.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
