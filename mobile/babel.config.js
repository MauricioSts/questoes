module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Precisa ser o último plugin da lista (exigência do Reanimated).
    plugins: ["react-native-worklets/plugin"],
  };
};
