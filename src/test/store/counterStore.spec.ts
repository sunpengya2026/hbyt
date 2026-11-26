import { setActivePinia, createPinia } from 'pinia';
import { useCounterStore } from './counterStore';
import { expect, test } from 'vitest';

// 测试state
test('测试counterStore的state', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const counterStore = useCounterStore();
    expect(counterStore.count).toBe(0);
});

// 测试getters
test('测试counterStore的getters - doubleCount', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const counterStore = useCounterStore();
    counterStore.count = 3;
    expect(counterStore.doubleCount).toBe(6);
});

// 测试actions
test('测试counterStore的actions - increment', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const counterStore = useCounterStore();
    counterStore.increment();
    expect(counterStore.count).toBe(1);
});
