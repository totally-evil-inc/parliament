import { expect, test } from "bun:test"

test("apps/gate client files do not import from apps/command, apps/auth, @workspace/document-editor, @workspace/database, @workspace/logger, or hono", async () => {
  const glob = new Bun.Glob("src/**/*.{ts,tsx}")

  for await (const path of glob.scan({ cwd: `${import.meta.dir}/..` })) {
    if (path.endsWith("boundary.test.ts") || path.endsWith("client.test.ts")) {
      continue
    }
    const source = await Bun.file(`${import.meta.dir}/../${path}`).text()
    expect(source).not.toMatch(/from\s+['"]apps\/command['"]/)
    expect(source).not.toMatch(/from\s+['"]apps\/auth['"]/)
    expect(source).not.toMatch(/from\s+['"]@workspace\/document-editor['"]/)
    expect(source).not.toMatch(/from\s+['"]@workspace\/database['"]/)
    expect(source).not.toMatch(/from\s+['"]@workspace\/logger['"]/)
    expect(source).not.toMatch(/from\s+['"]hono['"]/)
  }
})
