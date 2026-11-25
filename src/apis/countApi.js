/**
 * Dual-mode dispatcher.
 *
 * VITE_APP_MODE is read at build time. In Catalyst builds, the Bolt branch
 * (which imports the Supabase client) is dead code and Vite eliminates it
 * entirely — no Supabase code, no anon key, no @supabase/supabase-js in the
 * Catalyst bundle.
 */
import { isCatalystMode } from '../lib/appMode'

import * as bolt from './countApiBolt'
import * as catalyst from './countApiCatalyst'

const impl = isCatalystMode ? catalyst : bolt

export const saveImportedBases = (...a) => impl.saveImportedBases(...a)
export const listPlansInMonth = (...a) => impl.listPlansInMonth(...a)
export const listPlansOnDate = (...a) => impl.listPlansOnDate(...a)
export const rebuildSchedule = (...a) => impl.rebuildSchedule(...a)
export const completeItemCount = (...a) => impl.completeItemCount(...a)
export const loadHistoryRows = (...a) => impl.loadHistoryRows(...a)
export const saveHistoryRows = (...a) => impl.saveHistoryRows(...a)
export const loadLastHistoryCountDates = (...a) => impl.loadLastHistoryCountDates(...a)
export const loadItemCosts = (...a) => impl.loadItemCosts(...a)
export const loadCompletedResults = (...a) => impl.loadCompletedResults(...a)
export const updateHistoryRow = (...a) => impl.updateHistoryRow(...a)
export const savePositionCheck = (...a) => impl.savePositionCheck(...a)
export const updatePositionCheck = (...a) => impl.updatePositionCheck(...a)
export const listBaseItems = (...a) => impl.listBaseItems(...a)
export const changePendingPlanItem = (...a) => impl.changePendingPlanItem(...a)
export const listCountItems = (...a) => impl.listCountItems(...a)
export const listPositionChecks = (...a) => impl.listPositionChecks(...a)
