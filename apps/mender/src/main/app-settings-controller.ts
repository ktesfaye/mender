import { createController, type Controller } from '@emdash/wire/rpc';
import { appSettingsContract } from '@shared/app-settings';
import type { AppSettings } from './app-settings';
import type { SessionUsageReader } from './session-usage';

/** The windmill, as the village asks about it. */
export function createAppSettingsController(
  settings: AppSettings,
  usage: SessionUsageReader
): Controller {
  return createController(appSettingsContract, {
    defaultHand: () => settings.defaultHand(),
    setDefaultHand: ({ id }) => settings.setDefaultHand(id),
    hands: () => settings.hands(),
    providerConfig: ({ agent }) => settings.providerConfig(agent),
    setExtraArgs: ({ agent, extraArgs }) => settings.setExtraArgs(agent, extraArgs),
    setEnvVar: ({ agent, key, value }) => settings.setEnvVar(agent, key, value),
    removeEnvVar: ({ agent, key }) => settings.removeEnvVar(agent, key),
    sessionUsage: () => usage.sample(),
  });
}
