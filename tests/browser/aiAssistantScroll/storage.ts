export default {
  getItem: async () => null,
  setItem: async () => {
    throw new Error("Storage writes excluded");
  },
  removeItem: async () => {
    throw new Error("Storage removal excluded");
  }
};
