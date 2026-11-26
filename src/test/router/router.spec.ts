import { createRouter, createMemoryHistory } from 'vue-router';
import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import Home from './views/Home.vue';
import About from './views/About.vue';
import router from './router';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/about',
        name: 'About',
        component: About
    }
];

test('测试路由导航到Home页面', async () => {
    const history = createMemoryHistory();
    const testRouter = createRouter({
        history,
        routes
    });

    const wrapper = mount(Home, {
        global: {
            plugins: [testRouter]
        }
    });

    expect(wrapper.find('h1').text()).toBe('Home Page');
});

test('测试路由导航到About页面', async () => {
    const history = createMemoryHistory();
    const testRouter = createRouter({
        history,
        routes
    });

    await testRouter.push('/about');
    const wrapper = mount(About, {
        global: {
            plugins: [testRouter]
        }
    });

    expect(wrapper.find('h1').text()).toBe('About Page');
});
