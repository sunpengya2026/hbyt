<template>
  <div>
    <div>{{ message }}</div>
    <!-- <button @click="$emit('custom - event')">点击我</button> -->
  </div>
</template>
<script setup>
  defineProps({
    message: String
  })
</script>
