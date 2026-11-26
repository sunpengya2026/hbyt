import { expect, describe, it, vi } from 'vitest';
import { mount} from '@vue/test-utils';
import { nextTick } from 'vue'; // 确保正确导入 nextTick
import LifecycleComponent from './lifecycle-component.vue';

describe('生命周期函数', () => {
  it('正确调用生命周期挂钩', async () => {
    //模拟console.log以捕获生命周期钩子调用（可选）
    const logSpy = vi.spyOn(console, 'log').mockImplementation();
    const wrapper = mount(LifecycleComponent);
    await nextTick(); // 确保调用所有已挂载的生命周期挂钩
    expect(wrapper.vm.beforeMountCalled).toBe(true);
    expect(wrapper.vm.mountedCalled).toBe(true);

    // 触发状态更改以调用beforeUpdate和updated
    // 修改组件的状态以触发更新
    wrapper.vm.showMessage = false;
    await nextTick(); // 确保更新周期已完成

    // 检查是否调用了beforeUpdate和updated
    expect(wrapper.vm.beforeUpdateCalled).toBe(true);
    expect(wrapper.vm.updatedCalled).toBe(true);

    // 卸下组件并等待下一个
    await wrapper.unmount();
    await nextTick(); // 确保调用所有已挂载的生命周期挂钩

    // 检查是否调用了before Unmount和unmount
    expect(wrapper.vm.beforeUnmountCalled).toBe(true);
    expect(wrapper.vm.unmountedCalled).toBe(true);

    // 测试后恢复console.log
    logSpy.mockRestore();
  });
});