<template>
  <div>
    <input v-model="inputValue" />
    <p>输入值的长度: {{ inputValueLength }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const inputValue = ref('');
const inputValueLength = ref(0);

watch(inputValue, (newVal, oldVal) => {
  inputValueLength.value = newVal.length;
});
</script>
