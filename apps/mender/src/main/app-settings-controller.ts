import { createController, type Controller } from '@emdash/wire/rpc';
import { appSettingsContract } from '@shared/app-settings';
import type { AppSettings } from './app-settings';
import type { FiveHoursReader } from './five-hours';
import type { SessionUsageReader } from './session-usage';

/** The windmill, as the village asks about it. */
export function createAppSettingsController(
  settings: AppSettings,
  usage: SessionUsageReader,
  fiveHours: FiveHoursReader
): Controller {
  return createController(appSettingsContract, {
    defaultHand: () => settings.defaultHand(),
    setDefaultHand: ({ id }) => settings.setDefaultHand(id),
    hands: () => settings.hands(),
    missingCoreDeps: () => settings.missingCoreDeps(),
    providerConfig: ({ agent }) => settings.providerConfig(agent),
    setExtraArgs: ({ agent, extraArgs }) => settings.setExtraArgs(agent, extraArgs),
    setEnvVar: ({ agent, key, value }) => settings.setEnvVar(agent, key, value),
    removeEnvVar: ({ agent, key }) => settings.removeEnvVar(agent, key),
    sessionUsage: () => usage.sample(),
    fiveHours: () => fiveHours.read(),
    checkoutSettings: () => settings.checkoutSettings(),
    setBranchPrefix: ({ prefix }) => settings.setBranchPrefix(prefix),
    setRandomSuffix: ({ on }) => settings.setRandomSuffix(on),
    setProjectsDir: ({ dir }) => settings.setProjectsDir(dir),
    setWorktreeDir: ({ dir }) => settings.setWorktreeDir(dir),
    terminalSettings: () => settings.terminalSettings(),
    setTerminalFontSize: ({ fontSize }) => settings.setTerminalFontSize(fontSize),
    setDefaultShell: ({ shell }) => settings.setDefaultShell(shell),
    notificationSettings: () => settings.notificationSettings(),
    setNotificationsEnabled: ({ on }) => settings.setNotificationsEnabled(on),
    keybindings: () => settings.keybindings(),
    setKeybinding: ({ pick, chord }) => settings.setKeybinding(pick, chord),
    clearKeybinding: ({ pick }) => settings.clearKeybinding(pick),
  });
}
