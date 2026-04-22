import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";
import { registerHooks } from "node:module";

const projectRoot = process.cwd();
const projectRootUrl = pathToFileURL(`${projectRoot}/`).href;
const nodeModulesSegment = "/node_modules/";
const extensionPattern = /\.[a-zA-Z0-9]+$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const resolved = pathToFileURL(resolvePath(projectRoot, `${specifier.slice(2)}.ts`)).href;
      return nextResolve(resolved, context);
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !extensionPattern.test(specifier) &&
      typeof context.parentURL === "string" &&
      context.parentURL.startsWith(projectRootUrl) &&
      !context.parentURL.includes(nodeModulesSegment)
    ) {
      return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context);
    }

    return nextResolve(specifier, context);
  },
});
