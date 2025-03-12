import { pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: "<rootDir>/" }),
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"], // Optional setup file
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
};
