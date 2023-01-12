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
import {getManifest} from 'workbox-build';

interface TiniConfig {
  out?: string;
  pwa?: PWAConfig;
}

interface PWAConfig {
  globPatterns?: string[];
}

const CONFIG_PATH = 'tini.config.json';
const DEFAULT_OUR_DIR = 'www';
const APP_DIR = 'app';
const SW_TS = 'sw.ts';
const SW_JS = 'sw.js';

export default new Reporter({
  async report({event}) {
    if (event.type === 'buildSuccess') {
      const startTime = new Date().getTime();
      // load config
      const {out, pwa: pwaPrecaching} = (await readJSON(
        resolve(CONFIG_PATH)
      )) as TiniConfig;
      const outDir = out || DEFAULT_OUR_DIR;
      // read sw.ts
      const tsCode = (await readFile(resolve(APP_DIR, SW_TS))).toString('utf8');
      // transpile
      let {outputText: code} = transpileModule(tsCode, {
        compilerOptions: {
          noEmit: false,
          sourceMap: false,
          skipLibCheck: true,
          moduleResolution: ModuleResolutionKind.NodeJs,
          module: ModuleKind.ESNext,
          target: ScriptTarget.ESNext,
        },
      });
      // inject precaching entries
      if (pwaPrecaching?.globPatterns) {
        const {manifestEntries} = await getManifest({
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
      const swPath = resolve(outDir, SW_JS);
      await outputFile(swPath, code);
      // bundle
      try {
        execSync(
          `parcel build ${outDir}/sw.js --dist-dir ${outDir} --config "@parcel/config-default" --log-level error`,
          {cwd: '.', stdio: 'inherit'}
        );
        if (process.env.NODE_ENV !== 'development') {
          const endTime = new Date().getTime();
          const timeSecs = ((endTime - startTime) / 1000).toFixed(2);
          const fileStat = await stat(swPath);
          process.stdout.write(
            `${gray(outDir + '/')}${bold(cyan(SW_JS))}          ${bold(
              magenta((fileStat.size / 1024).toFixed(2) + ' KB')
            )}    ${bold(green(timeSecs + 's'))}\n`
          );
        }
      } catch (error: unknown) {
        process.stdout.write(
          red(`Failed to build ${outDir}/${SW_JS}, please try again!`) + '\n'
        );
      }
    }
  },
});
