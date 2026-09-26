import { assertLaunchConfig } from '../packages/config/src/env.ts';

assertLaunchConfig(process.env, 'api');
assertLaunchConfig(process.env, 'worker');
assertLaunchConfig(process.env, 'bootstrap');
process.stdout.write('preflight: config ok\n');
