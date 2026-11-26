<template>
  <n-select
    v-bind="$attrs"
    style="min-width: 50px"
    :value="selected"
    label-field="name"
    value-field="code"
    :options="options"
    :loading="loading"
    @update:value="handleUpdateValue"
  />
</template>

<script lang="ts">
  import { defineComponent, ref, reactive, toRefs } from 'vue'
  import { udpLangStore } from 'udp/lang/langStore'
  export default defineComponent({
    name: 'LanguageSelect',
    emits: ['change'],
    setup(props, { emit }) {
      const langStore = udpLangStore()
      const selected = ref(langStore.selectedLang)
      const selectOp = reactive({
        loading: true,
        options: []
      })
      langStore
        .getLanguageSelectOption()
        .then((res: any) => {
          selectOp.options = res
        })
        .finally(() => {
          selectOp.loading = false
        })
      const handleUpdateValue = (value: string) => {
        selected.value = value
        langStore.setLanguageMessage(value)
        emit('change', value)
      }

      return {
        selected,
        ...toRefs(selectOp),
        handleUpdateValue
      }
    }
  })
</script>

<style lang="less" scoped></style>
