import { Status } from "../src/server/deps.ts";
import {
  assert,
  assertEquals,
  assertStringIncludes,
  delay,
  puppeteer,
  retry,
  TextLineStream,
} from "./deps.ts";

type FileTree = {
  type: "file";
  name: string;
} | {
  type: "directory";
  name: string;
  contents: FileTree[];
};

const assertFileExistence = async (tree: FileTree[], dirname?: string) => {
  for (const t of tree) {
    const stat = await Deno.stat(
      dirname ? [dirname, t.name].join("/") : t.name,
    );
    assertEquals(t.type === "file", stat.isFile);

    if (t.type === "directory") {
      assert(stat.isDirectory);
      await assertFileExistence(
        t.contents,
        dirname ? [dirname, t.name].join("/") : t.name,
      );
    }
  }
};

Deno.test({
  name: "fresh-init",
  async fn(t) {
    // Preparation
    const tmpDirName = await Deno.makeTempDir();

    await t.step("execute init command", async () => {
      const cliProcess = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "-A",
          "init.ts",
          tmpDirName,
        ],
        stdin: "null",
        stdout: "null",
      });
      const { code } = await cliProcess.output();
      assertEquals(code, 0);
    });

    // NOTE: generated by `tree -J <dir>`
    const targetFileTree: FileTree[] = [
      {
        "type": "directory",
        "name": tmpDirName,
        "contents": [
          { "type": "file", "name": "README.md" },
          { "type": "file", "name": "import_map.json" },
          { "type": "file", "name": "fresh.gen.ts" },
          {
            "type": "directory",
            "name": "components",
            "contents": [
              { "type": "file", "name": "Button.tsx" },
            ],
          },
          {
            "type": "directory",
            "name": "islands",
            "contents": [
              { "type": "file", "name": "Counter.tsx" },
            ],
          },
          { "type": "file", "name": "main.ts" },
          {
            "type": "directory",
            "name": "routes",
            "contents": [
              { "type": "file", "name": "[name].tsx" },
              {
                "type": "directory",
                "name": "api",
                "contents": [
                  { "type": "file", "name": "joke.ts" },
                ],
              },
              { "type": "file", "name": "index.tsx" },
            ],
          },
          {
            "type": "directory",
            "name": "static",
            "contents": [
              { "type": "file", "name": "logo.svg" },
            ],
          },
        ],
      },
    ];

    await t.step("check generated files", async () => {
      await assertFileExistence(targetFileTree);
    });

    await t.step({
      name: "start up the server and access the root page",
      ignore: true,
      async fn() {
      const serverProcess = new Deno.Command(Deno.execPath(), {
        args: ["run", "-A", "--check", "main.ts"],
        stdout: "piped",
        cwd: tmpDirName,
      }).spawn();

      const lines = serverProcess.stdout
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream());

      let started = false;
      for await (const line of lines) {
        console.log(line);
        if (line.includes("Listening on http://")) {
          started = true;
          break;
        }
      }
      if (!started) {
        throw new Error("Server didn't start up");
      }

      await delay(100);

      // Access the root page
      const res = await fetch("http://localhost:8000");
      await res.body?.cancel();
      assertEquals(res.status, Status.OK);

      // verify the island is revived.
      const browser = await puppeteer.launch({
        args: ["--no-sandbox"],
      });
      const page = await browser.newPage();
      await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });
      const counter = await page.$("body > div > div > p");
      let counterValue = await counter?.evaluate((el) => el.textContent);
      assert(counterValue === "3");

      const buttonPlus = await page.$("body > div > div > button:nth-child(3)");
      await buttonPlus?.click();

      await delay(100);

      counterValue = await counter?.evaluate((el) => el.textContent);
      assert(counterValue === "4");
      await page.close();
      await browser.close();

      await lines.cancel();
      serverProcess.kill("SIGTERM");
    }});

    await retry(() => Deno.remove(tmpDirName, { recursive: true }));
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "fresh-init --twind --vscode",
  async fn(t) {
    // Preparation
    const tmpDirName = await Deno.makeTempDir();

    await t.step("execute init command", async () => {
      const cliProcess = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "-A",
          "init.ts",
          tmpDirName,
          "--twind",
          "--vscode",
        ],
        stdin: "null",
        stdout: "null",
      });
      const { code } = await cliProcess.output();
      assertEquals(code, 0);
    });

    // NOTE: generated by `tree -J <dir>`
    const targetFileTree: FileTree[] = [
      {
        "type": "directory",
        "name": tmpDirName,
        "contents": [
          { "type": "file", "name": "README.md" },
          { "type": "file", "name": "import_map.json" },
          { "type": "file", "name": "fresh.gen.ts" },
          { "type": "file", "name": "twind.config.ts" },
          {
            "type": "directory",
            "name": "components",
            "contents": [
              { "type": "file", "name": "Button.tsx" },
            ],
          },
          {
            "type": "directory",
            "name": "islands",
            "contents": [
              { "type": "file", "name": "Counter.tsx" },
            ],
          },
          { "type": "file", "name": "main.ts" },
          {
            "type": "directory",
            "name": "routes",
            "contents": [
              { "type": "file", "name": "[name].tsx" },
              {
                "type": "directory",
                "name": "api",
                "contents": [
                  { "type": "file", "name": "joke.ts" },
                ],
              },
              { "type": "file", "name": "index.tsx" },
            ],
          },
          {
            "type": "directory",
            "name": "static",
            "contents": [
              { "type": "file", "name": "logo.svg" },
            ],
          },
          {
            "type": "directory",
            "name": ".vscode",
            "contents": [
              { "type": "file", "name": "settings.json" },
              { "type": "file", "name": "extensions.json" },
            ],
          },
        ],
      },
    ];

    await t.step("check generated files", async () => {
      await assertFileExistence(targetFileTree);
    });

    await t.step({
      name: "start up the server and access the root page",
    ignore: true,
    async fn() {
      const serverProcess = new Deno.Command(Deno.execPath(), {
        args: ["run", "-A", "--check", "main.ts"],
        stdout: "piped",
        cwd: tmpDirName,
      }).spawn();

      const lines = serverProcess.stdout
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream());

      let started = false;
      for await (const line of lines) {
        console.log(line);
        if (line.includes("Listening on http://")) {
          started = true;
          break;
        }
      }
      if (!started) {
        throw new Error("Server didn't start up");
      }

      await delay(100);

      // Access the root page
      const res = await fetch("http://localhost:8000");
      await res.body?.cancel();
      assertEquals(res.status, Status.OK);

      // verify the island is revived.
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

      const counter = await page.$("body > div > div > p");
      let counterValue = await counter?.evaluate((el) => el.textContent);
      assert(counterValue === "3");

      const fontWeight = await counter?.evaluate((el) =>
        getComputedStyle(el).fontWeight
      );
      assertEquals(fontWeight, "700");

      const buttonPlus = await page.$("body > div > div > button:nth-child(3)");
      await buttonPlus?.click();

      await delay(100);

      counterValue = await counter?.evaluate((el) => el.textContent);
      assert(counterValue === "4");
      await page.close();
      await browser.close();

      await lines.cancel();
      serverProcess.kill("SIGTERM");
    }});

    await retry(() => Deno.remove(tmpDirName, { recursive: true }));
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test("fresh-init error(help)", async function (t) {
  const includeText = "fresh-init";

  await t.step(
    "execute invalid init command (deno run -A init.ts)",
    async () => {
      const cliProcess = new Deno.Command(Deno.execPath(), {
        args: ["run", "-A", "init.ts"],
      });
      const { code, stderr } = await cliProcess.output();
      assertEquals(code, 1);

      const errorString = new TextDecoder().decode(stderr);
      assertStringIncludes(errorString, includeText);
    },
  );

  await t.step(
    "execute invalid init command (deno run -A init.ts -f)",
    async () => {
      const cliProcess = new Deno.Command(Deno.execPath(), {
        args: ["run", "-A", "init.ts", "-f"],
      });
      const { code, stderr } = await cliProcess.output();
      assertEquals(code, 1);

      const errorString = new TextDecoder().decode(stderr);
      assertStringIncludes(errorString, includeText);
    },
  );

  await t.step(
    "execute invalid init command (deno run -A init.ts --foo)",
    async () => {
      const cliProcess = new Deno.Command(Deno.execPath(), {
        args: ["run", "-A", "init.ts", "--foo"],
      });
      const { code, stderr } = await cliProcess.output();
      assertEquals(code, 1);

      const errorString = new TextDecoder().decode(stderr);
      assertStringIncludes(errorString, includeText);
    },
  );
});
