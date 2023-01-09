import {Reporter} from '@parcel/plugin';
import {execSync} from 'child_process';

export default new Reporter({
  report({event}) {
    if (event.type === 'buildSuccess') {
      execSync(
        'tsc app/sw.ts --outDir www --moduleResolution node --target esnext --module esnext --skipLibCheck && node build-sw.js && parcel build www/sw.js --dist-dir www --config "@parcel/config-default" --log-level none',
        {cwd: '.', stdio: 'ignore'}
      );
    }
  },
});
