module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};