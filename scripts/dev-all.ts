import { spawn, type ChildProcess } from "node:child_process";

const children: ChildProcess[] = [];

function start(name: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  children.push(child);

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[dev:all] ${name} exited with code ${code}`);
      shutdown(code);
    }
  });
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("next-dev", "npm", ["run", "dev"]);
start("worker", "npm", ["run", "worker"]);
