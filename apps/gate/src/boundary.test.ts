import { expect, test } from "bun:test"

test("apps/gate source files do not import from apps/command, apps/auth, or @workspace/document-editor", async () => {
  const glob = new Bun.Glob("src/**/*.{ts,tsx}")

  for await (const path of glob.scan({ cwd: `${import.meta.dir}/..` })) {
    if (path.endsWith("boundary.test.ts")) continue
    const source = await Bun.file(`${import.meta.dir}/../${path}`).text()
    expect(source).not.toContain("apps/command")
    expect(source).not.toContain("apps/auth")
    expect(source).not.toContain("@workspace/document-editor")
  }
})
