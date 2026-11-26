import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import Counter from './Counter.vue'

describe('Counter组件测试', () => {
  // 测试组件是否能正确渲染
  it('组件初始渲染是否正确', () => {
    const wrapper = mount(Counter)
    expect(wrapper.find('p').text()).toContain('当前计数: 0')
  })

  // 测试点击按钮后计数是否正确增加
  it('点击按钮后计数应增加', async () => {
    const wrapper = mount(Counter)
    const button = wrapper.find('button')
    await button.trigger('click')
    expect(wrapper.find('p').text()).toContain('当前计数: 1')
  })

  // 测试多次点击按钮后计数是否持续正确增加
  it('多次点击按钮后计数应持续增加', async () => {
    const wrapper = mount(Counter)
    const button = wrapper.find('button')
    for (let i = 0; i < 3; i++) {
      await button.trigger('click')
    }
    expect(wrapper.find('p').text()).toContain('当前计数: 3')
  })
})
