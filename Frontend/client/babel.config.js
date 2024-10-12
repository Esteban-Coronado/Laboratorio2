module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset'
  ],
  plugins: [
    ['transform-define', {
      __VUE_OPTIONS_API__: true, // O false si no lo necesitas
      __VUE_PROD_DEVTOOLS__: false, // Deshabilitar devtools en prod
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true // Activa el flag que menciona el warning
    }]
  ]
};
