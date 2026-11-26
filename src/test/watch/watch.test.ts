import { mount } from '@vue/test-utils';
import { nextTick, ref, watch } from 'vue';
import { expect, test } from 'vitest';
import MyComponent from './watcher.vue';

describe('MyComponent - Watch测试', () => {
    // 测试初始状态下inputValueLength是否正确
    it('初始状态下inputValueLength应该为0', () => {
        const wrapper = mount(MyComponent);
        const inputValueLength = wrapper.vm.inputValueLength;
        expect(inputValueLength).toBe(0);
    });

    // 测试输入值变化时inputValueLength是否正确更新
    it('输入值变化时inputValueLength应正确更新', async () => {
        const wrapper = mount(MyComponent);
        const input = wrapper.find('input');

        // 模拟输入值变化
        await input.setValue('abc');
        await nextTick();

        const inputValueLength = wrapper.vm.inputValueLength;
        expect(inputValueLength).toBe(3);

        // 再次模拟输入值变化
        await input.setValue('abcdef');
        await nextTick();

        const updatedInputValueLength = wrapper.vm.inputValueLength;
        expect(updatedInputValueLength).toBe(6);
    });

    // 测试watch回调函数的参数是否正确传递
    it('watch回调函数参数应正确传递', async () => {
        const inputValue = ref('');
        const inputValueLength = ref(0);

        const watchCallback = vi.fn((newVal, oldVal) => {
            inputValueLength.value = newVal.length;
        });

        watch(inputValue, watchCallback);

        // 模拟输入值变化
        inputValue.value = 'hello';
        await nextTick();

        expect(watchCallback).toHaveBeenCalled();
        expect(watchCallback.mock.calls[0][0]).toBe('hello');
        expect(watchCallback.mock.calls[0][1]).toBe('');
    });
});
