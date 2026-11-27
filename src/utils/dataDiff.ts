export const GRANULAR_ENTITY_KEYS = [
  'incomes',
  'expenses',
  'investments',
  'trips',
  'wishes',
  'actionPlans',
  'deficitActions',
  'shoppingList',
] as const;

export type GranularEntityKey = (typeof GRANULAR_ENTITY_KEYS)[number];

export interface DetectedGranularMutation {
  entity: GranularEntityKey;
  action: 'upsert' | 'delete';
  item?: any;
  id?: string;
}

/**
 * Detects whether a partial UserData update represents a single-item add, update, or delete
 * on one of the 8 entity collections, allowing safe incremental API saves instead of rewriting all rows.
 */
export function detectSingleGranularMutation(
  baseData: Record<string, any> | null | undefined,
  newData: Record<string, any> | null | undefined
): DetectedGranularMutation | null {
  if (!baseData || !newData) return null;

  const keys = Object.keys(newData);
  if (keys.length !== 1) return null;

  const key = keys[0] as GranularEntityKey;
  if (!GRANULAR_ENTITY_KEYS.includes(key)) return null;

  const prevList = baseData[key];
  const nextList = newData[key];
  if (!Array.isArray(prevList) || !Array.isArray(nextList)) return null;

  const prevMap = new Map<string, any>();
  for (const item of prevList) {
    if (!item || !item.id) return null;
    prevMap.set(String(item.id), item);
  }

  const nextMap = new Map<string, any>();
  for (const item of nextList) {
    if (!item || !item.id) return null;
    nextMap.set(String(item.id), item);
  }

  // Duplicate ID safety check
  if (prevMap.size !== prevList.length || nextMap.size !== nextList.length) {
    return null;
  }

  // Case 1: Single deletion (no added/modified items)
  if (nextMap.size === prevMap.size - 1) {
    let deletedId: string | null = null;
    for (const [id, prevItem] of prevMap.entries()) {
      const nextItem = nextMap.get(id);
      if (!nextItem) {
        if (deletedId !== null) return null;
        deletedId = id;
      } else if (nextItem !== prevItem && JSON.stringify(nextItem) !== JSON.stringify(prevItem)) {
        return null;
      }
    }
    if (deletedId) {
      return { entity: key, action: 'delete', id: deletedId };
    }
    return null;
  }

  // Case 2: Single addition
  if (nextMap.size === prevMap.size + 1) {
    let addedItem: any = null;
    for (const [id, nextItem] of nextMap.entries()) {
      const prevItem = prevMap.get(id);
      if (!prevItem) {
        if (addedItem !== null) return null;
        addedItem = nextItem;
      } else if (nextItem !== prevItem && JSON.stringify(nextItem) !== JSON.stringify(prevItem)) {
        return null;
      }
    }
    if (addedItem) {
      return { entity: key, action: 'upsert', item: addedItem };
    }
    return null;
  }

  // Case 3: Single update
  if (nextMap.size === prevMap.size) {
    let updatedItem: any = null;
    for (const [id, nextItem] of nextMap.entries()) {
      const prevItem = prevMap.get(id);
      if (!prevItem) return null;
      if (nextItem !== prevItem && JSON.stringify(nextItem) !== JSON.stringify(prevItem)) {
        if (updatedItem !== null) return null;
        updatedItem = nextItem;
      }
    }
    if (updatedItem) {
      return { entity: key, action: 'upsert', item: updatedItem };
    }
    return null;
  }

  return null;
}

export interface DetectedGranularBatchMutation {
  entity: GranularEntityKey;
  action: 'upsert' | 'upsert_many' | 'delete' | 'delete_many';
  item?: any;
  items?: any[];
  id?: string;
  ids?: string[];
}

/**
 * Detects single or batch (e.g. parcelado / bulk delete) changes on one of the 8 entity collections
 * so the client only sends the changed records to /api/user/entity/:entity instead of the entire list.
 */
export function detectGranularMutation(
  baseData: Record<string, any> | null | undefined,
  newData: Record<string, any> | null | undefined
): DetectedGranularBatchMutation | null {
  const single = detectSingleGranularMutation(baseData, newData);
  if (single) return single;

  if (!baseData || !newData) return null;
  const keys = Object.keys(newData);
  if (keys.length !== 1) return null;

  const key = keys[0] as GranularEntityKey;
  if (!GRANULAR_ENTITY_KEYS.includes(key)) return null;

  const prevList = baseData[key];
  const nextList = newData[key];
  if (!Array.isArray(prevList) || !Array.isArray(nextList)) return null;

  const prevMap = new Map<string, any>();
  for (const item of prevList) {
    if (!item || !item.id) return null;
    prevMap.set(String(item.id), item);
  }

  const nextMap = new Map<string, any>();
  for (const item of nextList) {
    if (!item || !item.id) return null;
    nextMap.set(String(item.id), item);
  }

  if (prevMap.size !== prevList.length || nextMap.size !== nextList.length) {
    return null;
  }

  const upsertedItems: any[] = [];
  for (const [id, nextItem] of nextMap.entries()) {
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      upsertedItems.push(nextItem);
    } else if (nextItem !== prevItem && JSON.stringify(nextItem) !== JSON.stringify(prevItem)) {
      upsertedItems.push(nextItem);
    }
  }

  const deletedIds: string[] = [];
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) {
      deletedIds.push(id);
    }
  }

  if (upsertedItems.length > 0 && deletedIds.length === 0) {
    return upsertedItems.length === 1
      ? { entity: key, action: 'upsert', item: upsertedItems[0] }
      : { entity: key, action: 'upsert_many', items: upsertedItems };
  }

  if (deletedIds.length > 0 && upsertedItems.length === 0) {
    return deletedIds.length === 1
      ? { entity: key, action: 'delete', id: deletedIds[0] }
      : { entity: key, action: 'delete_many', ids: deletedIds };
  }

  return null;
}
