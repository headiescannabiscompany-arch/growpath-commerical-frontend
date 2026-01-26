module.exports = {
  getItemAsync: jest.fn(async (key) => null),
  setItemAsync: jest.fn(async (key, value) => true),
  deleteItemAsync: jest.fn(async (key) => true)
};
