module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['services/**/*.js', 'controllers/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true
};
