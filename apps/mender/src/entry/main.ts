import { app, dialog } from 'electron';
import { startLogging } from '@main/logging';

// Packaged Electron does not set NODE_ENV, so environment-keyed defaults (the
// wire validation policy among them) would resolve to development behavior.
// Set it before anything else loads so spawned workers inherit it.
if (app.isPackaged && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

process.on('uncaughtException', (error) => {
  process.stdout.write(`[fatal] ${error instanceof Error ? error.stack : String(error)}\n`);
});
process.on('unhandledRejection', (reason) => {
  process.stdout.write(
    `[fatal rejection] ${reason instanceof Error ? reason.stack : String(reason)}\n`
  );
});

async function start(): Promise<void> {
  // Before anything asks for a path: userData is derived from the app's name,
  // and the package is called @emdash/mender, which would put his village under
  // a scoped folder named after the thing we forked.
  app.setName('Mender');
  /* A second village with a data folder of its own, for driving a build
     beside the one in the Applications folder without the two writing into
     the same databases. */
  if (process.env.MENDER_DATA_DIR) app.setPath('userData', process.env.MENDER_DATA_DIR);
  startLogging();
  try {
    const { main } = await import('@main/index');
    await main();
  } catch (error) {
    process.stdout.write(`[fatal boot] ${error instanceof Error ? error.stack : String(error)}\n`);
    await app.whenReady();
    dialog.showErrorBox(
      'Mender could not start',
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
  }
}

void start();
