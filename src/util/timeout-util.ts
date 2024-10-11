
/**
 * Inject wait in milliseconds and halts the processing.
 * @param ms time in milliseconds
 */
export const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}