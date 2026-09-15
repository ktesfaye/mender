import { createController, type Controller } from '@emdash/wire/rpc';
import { findingContract } from '@shared/finding';
import type { Finding } from './finding';

/** Looking for something in a checkout, as the village asks for it. */
export function createFindingController(finding: Finding): Controller {
  return createController(findingContract, {
    named: ({ checkout, like }) => finding.named(checkout, like),
    written: ({ checkout, like }) => finding.written(checkout, like),
  });
}
