import { ObjectDirective } from 'vue'
// function鉴权，待完善
export const ActionPermission: ObjectDirective = {
  mounted(el: HTMLElement, binding) {
    const arg = binding.arg
    switch (arg) {
      case 'show':
        if (!binding.value) {
          el.remove()
        }
        break
      case 'link':
        if (!binding.value) {
          el.remove()
        } else {
          el.setAttribute('href', binding.value)
        }
        break

      default:
        if (!binding.value) {
          el.disabled = true
          el.setAttribute('style', `${el.style.cssText};disabled: disabled`)
          el.classList.add('n-button--disabled')
        }
        break
    }
  }
}
