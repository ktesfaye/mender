/**
 * When each session's current unbroken stretch of work began: from the moment
 * it started working until it stopped, however many things were said to it on
 * the way. Kept from the mood map, so it holds while you stand in another yard.
 */
export const stretches = new Map<string, number>();
