import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';

/**
 * Generate random UUID.
 */
export const getRandomUUID = (): string => {
    const uniqueId: string = uuidv4();
    logger.debug(`Generated UUID: ${uniqueId}`);
    return uniqueId;
} 

/**
 * Generate random integer value in given range of min and max integer limit.
 * @param min minimum limit
 * @param max maximum limit
 */
export const getRandomInt = (min: number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    const randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
    logger.info(`Random integer between ${min} and ${max}: ${randomInt}`);
    return randomInt;
}

/**
 * Calculate median score.
 * @param scores list of scores
 * @returns 
 */
export function calculateMedian(scores: number[]): number {
    if (scores.length === 0) return 0;

    // Sort the array in ascending order
    scores.sort((a, b) => a - b);

    const mid = Math.floor(scores.length / 2);

    // If the array has an odd number of elements, return the middle element
    if (scores.length % 2 !== 0) {
        return scores[mid];
    } else {
        // If even, return the average of the two middle elements
        return (scores[mid - 1] + scores[mid]) / 2;
    }
}