import { formatAbsolute, parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { wire } from './wire';

/**
 * Wave 0: the seam, made visible. Pixi owns the window, and the first thing it
 * draws is a real answer from the git runtime running in its own subprocess.
 * When the village replaces this, the connection underneath is the same one.
 */
async function boot(): Promise<void> {
  const pixi = new Application();
  await pixi.init({
    resizeTo: window,
    background: '#2d5d6b',
    antialias: false,
    roundPixels: true,
  });
  document.body.appendChild(pixi.canvas);

  const stage = new Container();
  pixi.stage.addChild(stage);

  const plaque = new Graphics();
  stage.addChild(plaque);

  const label = new Text({
    text: 'reaching the back end…',
    style: { fill: '#f2e4c9', fontFamily: 'monospace', fontSize: 16, lineHeight: 24 },
  });
  label.x = 40;
  label.y = 40;
  stage.addChild(label);

  const draw = (lines: string[]) => {
    label.text = lines.join('\n');
    plaque
      .clear()
      .roundRect(24, 24, label.width + 32, label.height + 32, 6)
      .fill({ color: 0x3d2b1c, alpha: 0.85 });
  };

  try {
    const path = parseNativeAbsolute(window.mender.launchedFrom);
    if (!path.success) {
      draw(['could not read the repo path:', '', JSON.stringify(path.error, null, 2)]);
      return;
    }
    const git = (await wire()).git;
    const inspection = await git.inspectPath({ path: path.data });
    draw(
      inspection.success
        ? [
            'wire is up, git runtime answered.',
            '',
            `kind      ${inspection.data.kind}`,
            ...(inspection.data.kind === 'repository'
              ? [
                  `root      ${formatAbsolute(inspection.data.rootPath)}`,
                  `base ref  ${inspection.data.baseRef}`,
                ]
              : []),
          ]
        : ['git answered with an error:', '', JSON.stringify(inspection.error, null, 2)]
    );
  } catch (error) {
    draw(['the wire never came up:', '', error instanceof Error ? error.message : String(error)]);
  }
}

void boot();
