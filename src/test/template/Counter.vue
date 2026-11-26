<template>
  <div>
    <p>当前计数: {{ count }}</p>
    <button @click="increment">加一</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const count = ref(0);

const increment = () => {
  count.value++;
};
</script>

<style scoped>
</style>
