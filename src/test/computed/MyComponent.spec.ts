import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';
import { expect, test } from 'vitest';
import MyComponent from './MyComponent.vue';

describe('MyComponent - Computed测试', () => {
    // 测试初始状态下computed属性的值是否正确
    it('初始状态下sum的值应为0', () => {
        const wrapper = mount(MyComponent);
        const sum = wrapper.vm.sum;
        expect(sum).toBe(0);
    });

    // 测试当依赖的响应式数据变化时，computed属性是否正确更新
    it('当num1和num2变化时，sum应正确更新', async () => {
        const wrapper = mount(MyComponent);
        const num1Input = wrapper.find('input:first-child');
        const num2Input = wrapper.find('input:last-child');

        // 模拟修改num1的值
        await num1Input.setValue('5');
        await num2Input.setValue('3');
        const sum = wrapper.vm.sum;
        expect(sum).toBe(8);

        // 再次模拟修改num2的值
        await num2Input.setValue('7');
        const updatedSum = wrapper.vm.sum;
        expect(updatedSum).toBe(12);
    });

    // 单独测试computed函数的逻辑（不依赖组件实例）
    it('单独测试computed函数逻辑', () => {
        const num1 = ref(10);
        const num2 = ref(20);
        const sumComputed = computed(() => num1.value + num2.value);
        expect(sumComputed.value).toBe(30);

        num1.value = 15;
        expect(sumComputed.value).toBe(35);
    });
});
