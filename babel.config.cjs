module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { web: { unstable_transformImportMeta: true } }]
    ],
    plugins: [
      "@babel/plugin-transform-class-static-block"
    ]
  };
};