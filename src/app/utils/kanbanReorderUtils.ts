export type KanbanDropPlacement = 'before' | 'after';

export function moveItemWithinList(
  itemIds: string[],
  draggedId: string,
  targetId: string,
  placement: KanbanDropPlacement
) {
  if (draggedId === targetId) {
    return itemIds;
  }

  const nextIds = itemIds.filter((id) => id !== draggedId);
  const targetIndex = nextIds.indexOf(targetId);

  if (targetIndex === -1) {
    nextIds.push(draggedId);
    return nextIds;
  }

  const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1;
  nextIds.splice(insertIndex, 0, draggedId);
  return nextIds;
}

export function moveItemBetweenLists(
  sourceIds: string[],
  destinationIds: string[],
  draggedId: string,
  targetId?: string,
  placement: KanbanDropPlacement = 'after'
) {
  const nextSourceIds = sourceIds.filter((id) => id !== draggedId);
  const nextDestinationIds = destinationIds.filter((id) => id !== draggedId);

  if (!targetId) {
    nextDestinationIds.push(draggedId);
    return {
      sourceIds: nextSourceIds,
      destinationIds: nextDestinationIds,
    };
  }

  const targetIndex = nextDestinationIds.indexOf(targetId);

  if (targetIndex === -1) {
    nextDestinationIds.push(draggedId);
  } else {
    const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1;
    nextDestinationIds.splice(insertIndex, 0, draggedId);
  }

  return {
    sourceIds: nextSourceIds,
    destinationIds: nextDestinationIds,
  };
}
