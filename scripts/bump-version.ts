type BunRuntime = {
  file(path: URL): { json(): Promise<unknown> };
  write(path: URL, data: string): Promise<number>;
};

const bun = (globalThis as typeof globalThis & { Bun: BunRuntime }).Bun;
const packagePath = new URL('../package.json', import.meta.url);
const packageJson = (await bun.file(packagePath).json()) as {
  version?: string;
  [key: string]: unknown;
};
const current = packageJson.version;
const match = current?.match(/^(\d{4})\.(0[1-9]|1[0-2])\.(\d+)$/);

if (!match) {
  throw new Error(
    `Expected root package version in YYYY.MM.PATCH form; found ${current ?? 'none'}`
  );
}

const currentPeriod = `${match[1]}.${match[2]}`;
const releasePeriod = new Date().toISOString().slice(0, 7).replace('-', '.');

if (releasePeriod < currentPeriod) {
  throw new Error(
    `Current version ${current} is newer than the UTC release month ${releasePeriod}`
  );
}

const patch = releasePeriod === currentPeriod ? Number(match[3]) + 1 : 0;
packageJson.version = `${releasePeriod}.${patch}`;
await bun.write(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log(`${current} -> ${packageJson.version}`);
