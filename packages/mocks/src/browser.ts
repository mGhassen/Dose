import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth';
import { allHandlers } from './handlers/dose';

export const worker = setupWorker(...authHandlers, ...allHandlers);
