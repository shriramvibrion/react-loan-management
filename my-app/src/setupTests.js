// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from "util";

const originalConsoleWarn = console.warn;

beforeAll(() => {
	console.warn = (...args) => {
		const firstArg = args[0];
		if (
			typeof firstArg === "string" &&
			firstArg.includes("React Router Future Flag Warning")
		) {
			return;
		}
		originalConsoleWarn(...args);
	};
});

afterAll(() => {
	console.warn = originalConsoleWarn;
});

if (!global.TextEncoder) {
	global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
	global.TextDecoder = TextDecoder;
}
