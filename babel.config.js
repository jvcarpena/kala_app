module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Inlines drizzle's generated .sql migration files into the JS bundle.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
