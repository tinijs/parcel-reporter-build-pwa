import {Reporter} from '@parcel/plugin';
import {resolve} from 'path';
import {readFile, readJSON, outputFile, remove} from 'fs-extra';
import {
  transpileModule,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind,
} from 'typescript';
import {getManifest, GetManifestOptions} from 'workbox-build';
import {rollup} from 'rollup';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {minify} from 'terser';

interface TiniConfig {
  out?: string;
  pwa?: ConfigPWA;
}

interface ConfigPWA {
  globPatterns?: string[];
}

export default new Reporter({
  async report({event}) {
    if (event.type === 'buildSuccess') {
      // load config
      const {out: outDir = 'www', pwa: pwaPrecaching} = await loadTiniConfig();
      // read sw.ts
      const tsCode = await readSWDotTS();
      // transpile
      let {outputText: code} = transpile(tsCode);
      // inject precaching entries
      if (pwaPrecaching?.globPatterns) {
        const {manifestEntries} = await buildPrecaching({
          globDirectory: outDir,
          ...(pwaPrecaching || {}),
        });
        code =
          `
import {precacheAndRoute} from 'workbox-precaching';
precacheAndRoute(${JSON.stringify(manifestEntries)});
        \n` + code;
      }
      // save file
      const rawPath = resolve(outDir, 'sw-raw.js');
      await saveRawSW(rawPath, code);
      // bundle
      try {
        await bundle(outDir);
        await remove(rawPath);
      } catch (error: any) {
        process.stdout.write(`${error.message}\n`);
      }
    }
  },
});

function loadTiniConfig() {
  return readJSON(resolve('tini.config.json')) as Promise<TiniConfig>;
}

async function readSWDotTS() {
  const file = await readFile(resolve('app', 'sw.ts'));
  return file.toString('utf8');
}

function transpile(code: string) {
  return transpileModule(code, {
    compilerOptions: {
      noEmit: false,
      sourceMap: false,
      skipLibCheck: true,
      moduleResolution: ModuleResolutionKind.NodeJs,
      module: ModuleKind.ESNext,
      target: ScriptTarget.ESNext,
    },
  });
}

function buildPrecaching(options: GetManifestOptions) {
  return getManifest(options);
}

function saveRawSW(rawPath: string, content: string) {
  return outputFile(rawPath, content);
}

async function bundle(outDir: string) {
  const bundle = await rollup({
    input: `${outDir}/sw-raw.js`,
    plugins: [nodeResolve()],
  });
  const {output} = await bundle.generate({
    format: 'iife',
    sourcemap: false,
  });
  const {code: minCode, map: minMap} = await minify(output[0]?.code, {
    sourceMap: true,
  });
  if (!minCode || !minMap) {
    throw new Error('Build sw.js failed, please try again!');
  }
  await outputFile(
    resolve(`${outDir}/sw.js`),
    minCode + '\n//# sourceMappingURL=sw.js.map'
  );
  await outputFile(resolve(`${outDir}/sw.js.map`), minMap.toString());
}
