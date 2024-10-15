<template>
  <div id="app">
    <div class="container">
      <h1>Generar Marca de Agua</h1>
      <form @submit.prevent="uploadImage">
        <div class="input-group">
          <input
            type="file"
            @change="onFileChange"
            accept="image/*"
            required
          />
          <input
            type="text"
            v-model="watermark"
            placeholder="Texto de la Marca de Agua"
            required
          />
        </div>
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Subiendo...' : 'Subir' }}
        </button>
      </form>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

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
      isSubmitting: false,
      errorMessage: '',
    };
  },
  methods: {
    onFileChange(event) {
      const file = event.target.files[0];
      if (file && !file.type.startsWith('image/')) {
        this.errorMessage = 'Por favor, selecciona un archivo de imagen.';
        this.selectedFile = null;
      } else {
        this.errorMessage = ''; 
        this.selectedFile = file;
      }
    },
    async uploadImage() {
      this.errorMessage = '';
      this.resultImage = null;

      if (!this.selectedFile || !this.watermark) {
        this.errorMessage = 'Por favor, completa todos los campos.';
        return;
      }

      const formData = new FormData();
      formData.append('image', this.selectedFile);
      formData.append('watermark', this.watermark);

      this.isSubmitting = true;

      try {
        const response = await fetch('http://192.168.137.243:4000/enviar-marcar', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error en la subida de la imagen: ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        this.resultImage = URL.createObjectURL(new Blob([arrayBuffer])); 
      } catch (error) {
        this.errorMessage = 'El servidor no está disponible. Intenta más tarde.';
        console.error('Error:', error);
      } finally {
        this.isSubmitting = false;
      }
    },
  },
};
</script>

<style src="./assets/styles.css"></style>
