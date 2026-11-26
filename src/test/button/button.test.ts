// 测试组件
import { mount } from '@vue/test-utils';
import { expect, describe, it } from 'vitest'
import Button from './Button.vue';

describe('Button.vue', () => {
  it('renders props.label when passed', () => {
    const wrapper = mount(Button, {
      props: {
        label: 'Click me',
      },
    });
    expect(wrapper.text()).toContain('Click me');
  });

  it('emits a click event when clicked', () => {
    const wrapper = mount(Button, {
      props: {
        label: '测试 Button',
      },
      attachToDocument: true,
    });
    wrapper.trigger('click');
    // 验证是否发射了 click 事件
    expect(wrapper.emitted().click).toBeTruthy();
  });
});
