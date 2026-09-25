import { createController, type Controller } from '@emdash/wire/rpc';
import { appSettingsContract } from '@shared/app-settings';
import type { AppSettings } from './app-settings';

/** The windmill, as the village asks about it. */
export function createAppSettingsController(settings: AppSettings): Controller {
  return createController(appSettingsContract, {
    defaultHand: () => settings.defaultHand(),
    setDefaultHand: ({ id }) => settings.setDefaultHand(id),
    hands: () => settings.hands(),
  });
}
