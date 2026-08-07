const appRoot = `${import.meta.dir}/..`

const api = Bun.spawn([process.execPath, "--env-file=.env", "src/index.ts"], {
  cwd: appRoot,
  env: { ...process.env, GATE_PORT: "4101" },
  stdout: "inherit",
  stderr: "inherit",
})

const client = Bun.spawn(
  [process.execPath, "--bun", "vite", "dev", "--port", "4100"],
  {
    cwd: appRoot,
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  }
)

await Promise.race([api.exited, client.exited])
api.kill()
client.kill()
