import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger.js';
import { fileURLToPath } from 'url';

/**
 * Validates if the provided directory path is valid.
 * 
 * @param inputPath - The user-provided directory path which can be relative or absolute.
 * @returns A boolean indicating whether the path is a valid directory.
 */
export const validateDirectoryPath = (inputPath: string): boolean => {
    try {
        // Normalize the path to an absolute path
        const absolutePath = path.resolve(inputPath);
        logger.debug(`Normalized absolute path : ${absolutePath}`);

        // Check if the path exists and is a directory
        const isDirectory = fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory();
        
        return isDirectory;
    } catch (error) {
        console.error(`Error validating directory path: ${error}`);
        return false;
    }
}

/**
 * Reads the content of a JSON file and parses it.
 * @param filePath - The relative path to the JSON file.
 * @returns Parsed content of the JSON file.
 */
export function readJsonFile(filePath: string): any {
    const absolutePath = path.resolve(filePath);
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(fileContent);
  }
  

  
