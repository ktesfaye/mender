import { app, dialog } from 'electron';

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
