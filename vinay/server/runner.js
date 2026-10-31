import vm from 'node:vm';

// Runs student JavaScript against test cases in an isolated VM context.
// The student must define `function solve(...args)`. Each test input is a JSON
// array of arguments; the output is compared to the expected JSON value.
export function runTests(code, testCases) {
  const results = testCases.map((tc, i) => {
    const base = { index: i, hidden: tc.hidden, input: tc.input, expected: tc.expected };
    try {
      const args = JSON.parse(tc.input);
      const logs = [];
      const sandbox = {
        console: { log: (...a) => logs.push(a.map(String).join(' ')) },
        __args: Array.isArray(args) ? args : [args],
      };
      vm.createContext(sandbox);
      const output = vm.runInContext(
        `${code}\n;JSON.stringify(typeof solve === 'function' ? solve(...__args) : (() => { throw new Error('solve() is not defined'); })())`,
        sandbox,
        { timeout: 1000 }
      );
      const passed = normalize(output) === normalize(tc.expected);
      return { ...base, passed, output: output ?? 'undefined', logs };
    } catch (err) {
      return { ...base, passed: false, error: err.message };
    }
  });
  const passed = results.filter((r) => r.passed).length;
  return { results, passed, total: results.length };
}

function normalize(json) {
  try {
    return JSON.stringify(JSON.parse(json));
  } catch {
    return String(json).trim();
  }
}

// Hidden tests reveal only pass/fail to students.
export const redactHidden = (results) =>
  results.map((r) => (r.hidden ? { index: r.index, hidden: true, passed: r.passed } : r));
