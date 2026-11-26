<template>
  <div>
    <input v-model="num1" type="number" />
    <input v-model="num2" type="number" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const num1 = ref(0);
const num2 = ref(0);

const sum = computed(() => num1.value + num2.value);
</script>
