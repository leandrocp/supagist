#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { ArgError, helpText, parseArgs, type ParsedArgs, type PublishOptions } from "./args.js";
import { ApiError, publishSnippet, resolveAccessToken } from "./api.js";
import { clearCredentials, readCredentials } from "./credentials.js";
import { cliAuthorizePath, parseCliSessionPayload } from "./protocol.js";
import { generateState, openBrowser, persistLogin, waitForCallback } from "./login.js";

export const VERSION = "0.1.0";

type Io = {
  out: (line: string) => void;
  err: (line: string) => void;
  readStdin: () => Promise<string>;
  env: Record<string, string | undefined>;
};

const defaultIo: Io = {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
  readStdin: async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf-8");
  },
  env: process.env,
};

async function readSource(
  options: PublishOptions,
  io: Io,
): Promise<{ code: string; filename: string }> {
  if (options.source === "-") {
    const code = await io.readStdin();
    // Stdin has no name of its own, and the filename drives both the card
    // header and the URL slug, so require one rather than inventing it.
    if (!options.filename) {
      throw new ArgError("Reading from stdin requires --filename.");
    }
    return { code, filename: options.filename };
  }

  const path = resolve(options.source);
  let code: string;
  try {
    code = await readFile(path, "utf-8");
  } catch {
    throw new ArgError(`Could not read ${options.source}.`);
  }
  return { code, filename: options.filename ?? basename(path) };
}

async function runPublish(options: PublishOptions, io: Io): Promise<number> {
  const { code, filename } = await readSource(options, io);

  if (code.trim().length === 0) {
    io.err("Nothing to publish — the snippet is empty.");
    return 1;
  }

  const { accessToken } = await resolveAccessToken(options.host, io.env);
  const result = await publishSnippet(options.host, accessToken, {
    code,
    filename,
    language: options.language,
    appearance: options.appearance,
  });

  if (options.json) {
    io.out(JSON.stringify(result));
  } else {
    io.out(result.url);
  }

  if (options.open) openBrowser(result.url);
  return 0;
}

async function runAuthLogin(host: string, json: boolean, io: Io): Promise<number> {
  const state = generateState();

  const callback = await waitForCallback({
    allowedOrigin: host,
    state,
    parsePayload: parseCliSessionPayload,
    onListening: (port) => {
      const url = `${host}${cliAuthorizePath(port, state)}`;
      if (!json) {
        io.err("Opening your browser to authorize the Supagist CLI…");
        io.err(`If it doesn't open, visit:\n  ${url}`);
      }
      openBrowser(url);
    },
  });

  const credentials = await persistLogin(host, callback, io.env);

  if (json) {
    io.out(JSON.stringify({ host, username: credentials.username }));
  } else {
    io.out(`Signed in to ${host}${credentials.username ? ` as ${credentials.username}` : ""}.`);
  }
  return 0;
}

async function runAuthStatus(host: string, json: boolean, io: Io): Promise<number> {
  const credentials = await readCredentials(host, io.env);

  if (json) {
    io.out(
      JSON.stringify({
        host,
        signedIn: credentials !== null,
        username: credentials?.username ?? null,
      }),
    );
    return credentials ? 0 : 1;
  }

  if (!credentials) {
    io.err(`Not signed in to ${host}. Run \`npx supagist auth login\`.`);
    return 1;
  }
  io.out(`Signed in to ${host}${credentials.username ? ` as ${credentials.username}` : ""}.`);
  return 0;
}

async function runAuthLogout(host: string, json: boolean, io: Io): Promise<number> {
  const removed = await clearCredentials(host, io.env);
  if (json) {
    io.out(JSON.stringify({ host, removed }));
  } else {
    io.out(removed ? `Signed out of ${host}.` : `Was not signed in to ${host}.`);
  }
  return 0;
}

export async function run(argv: string[], io: Io = defaultIo): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv, io.env);
  } catch (error) {
    io.err((error as Error).message);
    return 2;
  }

  try {
    switch (parsed.command) {
      case "help":
        io.out(helpText());
        return 0;
      case "version":
        io.out(VERSION);
        return 0;
      case "auth":
        if (parsed.action === "login") return await runAuthLogin(parsed.host, parsed.json, io);
        if (parsed.action === "logout") return await runAuthLogout(parsed.host, parsed.json, io);
        return await runAuthStatus(parsed.host, parsed.json, io);
      case "publish":
        return await runPublish(parsed.options, io);
    }
  } catch (error) {
    if (error instanceof ArgError) {
      io.err((error as Error).message);
      return 2;
    }
    if (error instanceof ApiError) {
      io.err(error.message);
      return 1;
    }
    io.err(`Unexpected error: ${(error as Error).message}`);
    return 1;
  }
}

// `import.meta.url` only matches argv[1] when this file was executed directly,
// so importing the module for tests does not run the CLI.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href;

if (invokedDirectly) {
  run(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: Error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
