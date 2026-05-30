export const addToQueue = (queue: number[], pitcherId: number): number[] =>
    [...queue, pitcherId];

// Removes and returns the pitcherId responsible for the next run scored (front of queue).
export const dequeueRun = (queue: number[]): { pitcherId: number | null; queue: number[] } => {
    if (queue.length === 0) return { pitcherId: null, queue };
    return { pitcherId: queue[0], queue: queue.slice(1) };
};
