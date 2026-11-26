import axios from 'axios';
import { getUserInfo } from './apiService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('axios');

describe('getUserInfo', () => {
  const mockUserData = { id: '123', name: 'John Doe' };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch user data successfully and return the response data', async () => {
    // Mock the axios.get method to resolve with a successful response.
    axios.get.mockResolvedValueOnce({ data: mockUserData });

    const result = await getUserInfo();

    expect(result).toEqual(mockUserData);
    expect(axios.get).toHaveBeenCalledWith('https://example.com/api/user');
  });

  it('should handle errors gracefully by throwing an error when the API call fails', async () => {
    // Mock the axios.get method to reject with an error.
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    await expect(getUserInfo()).rejects.toThrow('Network Error');
  });

  it('should log an error message when the API call fails', async () => {
    // We need to capture console.error output for this test.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock the axios.get method to reject with an error.
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    try {
      await getUserInfo();
    } catch (error) {
      // Ensure that the error was logged.
      expect(consoleSpy).toHaveBeenCalledWith('获取用户信息出错:', expect.any(Error));
    } finally {
      consoleSpy.mockRestore(); // Restore the original implementation of console.error
    }
  });
});