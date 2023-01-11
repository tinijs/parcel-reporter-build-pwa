import {Reporter} from '@parcel/plugin';
import {resolve} from 'path';
import {execSync} from 'child_process';
import {gray, cyan, red, bold, magenta, green} from 'chalk';
import {readFile, readJSON, outputFile, stat} from 'fs-extra';
import {
  transpileModule,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind,
} from 'typescript';
import {getManifest, GetManifestOptions} from 'workbox-build';

interface TiniConfig {
  out?: string;
  pwa?: PWAConfig;
}

interface PWAConfig {
  globPatterns?: string[];
}

export default new Reporter({
  async report({event}) {
    if (event.type === 'buildSuccess') {
      const startTime = new Date().getTime();
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
      const swPath = resolve(outDir, 'sw.js');
      await saveSWDotJS(swPath, code);
      // bundle
      try {
        execSync(
          'parcel build www/sw.js --dist-dir www --config "@parcel/config-default" --log-level error',
          {cwd: '.', stdio: 'inherit'}
        );
        if (process.env.NODE_ENV !== 'development') {
          const fileStat = await stat(swPath);
          const endTime = new Date().getTime();
          const timeSecs = ((endTime - startTime) / 1000).toFixed(2);
          process.stdout.write(
            `${gray(outDir + '/')}${bold(
              cyan('sw.js')
            )}                               ${bold(
              magenta((fileStat.size / 1024).toFixed(2) + ' KB')
            )}    ${bold(green(timeSecs + 's'))}\n`
          );
        }
      } catch (error: any) {
        process.stdout.write(
          `${red('Failed to build sw.js, please try again!')}\n`
        );
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

function saveSWDotJS(rawPath: string, content: string) {
  return outputFile(rawPath, content);
}
