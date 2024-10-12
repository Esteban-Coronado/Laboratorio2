<template>
  <div id="app">
    <div class="container">
      <h1>Generar Marca de Agua</h1>
      <form @submit.prevent="uploadImage">
        <div class="input-group">
          <input type="file" @change="onFileChange" accept="image/*" required />
          <input
            type="text"
            v-model="watermark"
            placeholder="Texto de la Marca de Agua"
            required
          />
        </div>
        <button type="submit">Subir</button>
      </form>

      <div v-if="resultImage" class="result-container">
        <h2>Imagen con Marca de Agua</h2>
        <img :src="resultImage" alt="Imagen con Marca de Agua" class="result-image" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedFile: null,
      watermark: '',
      resultImage: null,
    };
  },
  methods: {
    onFileChange(event) {
      this.selectedFile = event.target.files[0];
    },
    async uploadImage() {
      const formData = new FormData();
      formData.append('image', this.selectedFile);
      formData.append('watermark', this.watermark);

      try {
        const response = await fetch('http://localhost:4000/enviar-marcar', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Error en la subida de la imagen');
        }

        const blob = await response.blob();
        this.resultImage = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error:', error);
      }
    },
  },
};
</script>

<style src="./assets/styles.css"></style>
