import { expect, test } from "bun:test"

test("the editor package never imports application modules", async () => {
  const glob = new Bun.Glob("src/**/*.{ts,tsx}")

  for await (const path of glob.scan({ cwd: `${import.meta.dir}/..` })) {
    if (path.endsWith("boundary.test.ts")) continue
    const source = await Bun.file(`${import.meta.dir}/../${path}`).text()
    expect(source).not.toContain('from "@/')
    expect(source).not.toContain("apps/command")
  }
})

test("the command app does not own TipTap runtime imports", async () => {
  const appRoot = `${import.meta.dir}/../../../apps/command/src`
  const glob = new Bun.Glob("**/*.{ts,tsx}")

  for await (const path of glob.scan({ cwd: appRoot })) {
    const source = await Bun.file(`${appRoot}/${path}`).text()
    expect(source).not.toContain('from "@tiptap/')
  }
})
