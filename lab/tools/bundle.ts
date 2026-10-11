export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function bundleMission(engineJs: string, uiJs: string, data: unknown): string {
  if (/^\s*import\s/m.test(engineJs)) {
    throw new Error("El motor compilado todavía importa módulos.");
  }
  const engine = engineJs
    .replaceAll("\r\n", "\n")
    .replaceAll(/^\/\/# sourceMappingURL=.*$/gm, "")
    .replaceAll(/^export /gm, "")
    .trim();
  const ui = uiJs.replaceAll("\r\n", "\n").trim();
  return `"use strict";\n(() => {\nconst STUBX_LAB = ${jsonForScript(data)};\n${engine}\n${ui}\nbootLab();\n})();\n`;
}

export function bundleVerify(lookupJs: string, signalsJs: string, summaryJs: string, uiJs: string, data: unknown): string {
  if (/^\s*import\s/m.test(lookupJs) || /^\s*export\s/m.test(stripExports(lookupJs))) {
    throw new Error("La lectura compilada todavía importa módulos.");
  }
  if (/^\s*import\s/m.test(signalsJs) || /^\s*export\s/m.test(signalsJs)) {
    throw new Error("La lectura en vivo compilada todavía importa módulos.");
  }
  if (/^\s*import\s/m.test(summaryJs) || /^\s*export\s/m.test(summaryJs)) {
    throw new Error("El resumen compilado todavía importa módulos.");
  }
  const lookup = stripExports(lookupJs);
  const signals = signalsJs.replaceAll("\r\n", "\n").replaceAll(/^\/\/# sourceMappingURL=.*$/gm, "").trim();
  const summary = summaryJs.replaceAll("\r\n", "\n").replaceAll(/^\/\/# sourceMappingURL=.*$/gm, "").trim();
  const ui = uiJs.replaceAll("\r\n", "\n").trim();
  return `"use strict";\n(() => {\nconst STUBX_VERIFY = ${jsonForScript(data)};\n${lookup}\n${signals}\n${summary}\n${ui}\nbootVerify();\n})();\n`;
}

function stripExports(source: string): string {
  return source
    .replaceAll("\r\n", "\n")
    .replaceAll(/^\/\/# sourceMappingURL=.*$/gm, "")
    .replaceAll(/^export /gm, "")
    .trim();
}
