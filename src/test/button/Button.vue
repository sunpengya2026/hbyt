<template>
  <button>{{ label }}</button>
</template>

<script lang="ts" setup>
const props = defineProps({
  label: {
    type: String,
    default: "false",
  },
});

onMounted(() => {});
onActivated(() => {});
</script>

<style lang="less" scoped></style>
