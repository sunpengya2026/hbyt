<template>
  <div>
    <p v-if="showMessage">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted } from "vue";

const beforeMountCalled = ref(false);
const mountedCalled = ref(false);
const beforeUpdateCalled = ref(false);
const updatedCalled = ref(false);
const beforeUnmountCalled = ref(false);
const unmountedCalled = ref(false);

// 新增响应式变量
const showMessage = ref(true);
const message = ref("Hello, World!");

onBeforeMount(() => {
  beforeMountCalled.value = true;
});

onMounted(() => {
  mountedCalled.value = true;
});

onBeforeUpdate(() => {
  beforeUpdateCalled.value = true;
});

onUpdated(() => {
  updatedCalled.value = true;
});

onBeforeUnmount(() => {
  beforeUnmountCalled.value = true;
});

onUnmounted(() => {
  unmountedCalled.value = true;
});
</script>
