import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import MyComponent from './MyComponent.vue'

test('测试组件prop是否正确渲染', () => {
  const message = 'Hello, World!'
  const wrapper = mount(MyComponent, {
    props: {
      message
    }
  })
  expect(wrapper.text()).toBe(message)
})
