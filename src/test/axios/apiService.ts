import axios from 'axios';

export const getUserInfo = async () => {
    try {
        const response = await axios.get('https://example.com/api/user');
        return response.data;
    } catch (error) {
        console.error('获取用户信息出错:', error);
        throw error;
    }
};
