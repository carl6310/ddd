import { spawn, spawnSync, type ChildProcess } from "node:child_process";

const children: ChildProcess[] = [];
const host = process.env.HOST ?? "127.0.0.1";
const port = process.env.PORT ?? "3000";
const launchctlWorkerLabel = process.env.DDD_WORKER_LAUNCHCTL_LABEL ?? "ddd-worker";

ensureNoLaunchctlWorker();

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

start("next-dev", "npm", ["run", "dev", "--", "--hostname", host, "--port", port]);
start("worker", "npm", ["run", "worker"]);

function ensureNoLaunchctlWorker() {
  if (process.platform !== "darwin" || process.env.DDD_ALLOW_EXTERNAL_WORKER === "1") {
    return;
  }

  const uid = process.getuid?.();
  if (typeof uid !== "number") {
    return;
  }

  const result = spawnSync("launchctl", ["print", `gui/${uid}/${launchctlWorkerLabel}`], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return;
  }

  console.error(
    [
      `[dev:all] 检测到 macOS 常驻 worker：${launchctlWorkerLabel}。`,
      "为避免两个 worker 同时消费同一个 SQLite 队列，先停止常驻 worker 后再启动 dev:all：",
      `launchctl bootout gui/${uid}/${launchctlWorkerLabel}`,
      "",
      "如果你明确要复用外部 worker，可临时设置 DDD_ALLOW_EXTERNAL_WORKER=1。",
    ].join("\n"),
  );
  process.exit(1);
}
